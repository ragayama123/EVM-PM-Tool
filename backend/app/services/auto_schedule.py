from datetime import datetime, date, timedelta
from typing import List, Set, Optional, Dict, Any
from math import ceil
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.member import Member
from app.models.member_skill import MemberSkill
from app.models.holiday import Holiday


class AutoScheduleService:
    """タスク自動スケジュール処理サービス"""

    def __init__(self, db: Session, project_id: int):
        self.db = db
        self.project_id = project_id
        self._holiday_dates: Optional[Set[date]] = None

    def _get_holiday_dates(self) -> Set[date]:
        """休日セットを取得（キャッシュ）"""
        if self._holiday_dates is None:
            holidays = self.db.query(Holiday.date).filter(
                Holiday.project_id == self.project_id
            ).all()
            self._holiday_dates = {h[0] for h in holidays}
        return self._holiday_dates

    def _to_date(self, dt: Any) -> Optional[date]:
        """datetimeまたはdateをdateに変換"""
        if dt is None:
            return None
        if isinstance(dt, datetime):
            return dt.date()
        if isinstance(dt, date):
            return dt
        return None

    def _get_hours_per_day(self, member: Member) -> float:
        """メンバーの1日あたりの稼働時間を取得（週5日稼働として計算）"""
        return member.available_hours_per_week / 5

    def calculate_task_days(self, hours: float, hours_per_day: float) -> int:
        """タスクの所要稼働日数を計算"""
        if hours_per_day <= 0:
            return 1
        return max(1, ceil(hours / hours_per_day))

    def add_working_days(self, start_date: date, days: int) -> date:
        """
        稼働日を加算した日付を計算（終了日）
        days=1の場合は同日、days=2の場合は翌稼働日
        """
        if days <= 0:
            return start_date

        holidays = self._get_holiday_dates()
        current = start_date
        remaining = days - 1  # 開始日を含むので-1

        # 開始日が休日の場合は次の稼働日を探す
        while current in holidays:
            current += timedelta(days=1)

        # 残りの稼働日を加算
        while remaining > 0:
            current += timedelta(days=1)
            if current not in holidays:
                remaining -= 1

        return current

    def get_next_working_day(self, current_date: date) -> date:
        """次の稼働日を取得"""
        holidays = self._get_holiday_dates()
        next_day = current_date + timedelta(days=1)
        while next_day in holidays:
            next_day += timedelta(days=1)
        return next_day

    def _get_members_for_task_type(self, task_type: str) -> List[Member]:
        """指定タスク種別を担当可能なメンバーを取得"""
        member_ids = self.db.query(MemberSkill.member_id).filter(
            MemberSkill.task_type == task_type
        ).all()
        member_ids = [m[0] for m in member_ids]

        if not member_ids:
            return []

        return self.db.query(Member).filter(
            Member.id.in_(member_ids),
            Member.project_id == self.project_id
        ).all()

    def _find_best_member(
        self,
        task_type: Optional[str],
        member_next_dates: Dict[int, date],
        start_date: date
    ) -> Optional[Member]:
        """
        タスク種別に基づいて最適なメンバーを選択
        - 担当可能なメンバーの中から、最も早く空くメンバーを選択
        """
        if not task_type:
            return None

        members = self._get_members_for_task_type(task_type)
        if not members:
            return None

        best_member = None
        earliest_date = None

        for member in members:
            # メンバーの次の空き日を取得（未登録の場合は開始日）
            next_date = member_next_dates.get(member.id, start_date)

            if earliest_date is None or next_date < earliest_date:
                earliest_date = next_date
                best_member = member

        return best_member

    def _get_member_name(self, member_id: Optional[int]) -> Optional[str]:
        """メンバーIDから名前を取得"""
        if not member_id:
            return None
        member = self.db.query(Member).filter(Member.id == member_id).first()
        return member.name if member else None

    def preview(self, task_ids: List[int], start_date: date) -> Dict[str, Any]:
        """
        自動スケジュールのプレビュー
        実際の更新は行わず、計算結果を返す
        """
        # 対象タスクを取得（親タスクのみ、リスト順）
        if task_ids:
            tasks = self.db.query(Task).filter(
                Task.id.in_(task_ids),
                Task.project_id == self.project_id,
                Task.parent_id == None  # noqa: E711
            ).all()
            # task_ids順にソート
            task_dict = {t.id: t for t in tasks}
            tasks = [task_dict[tid] for tid in task_ids if tid in task_dict]
        else:
            # 全親タスクを取得
            tasks = self.db.query(Task).filter(
                Task.project_id == self.project_id,
                Task.parent_id == None  # noqa: E711
            ).order_by(Task.id).all()

        # 警告メッセージ
        warnings = []

        # メンバーごとの次の空き日を管理
        member_next_dates: Dict[int, date] = {}

        # 結果リスト
        result_tasks = []

        for task in tasks:
            # タスク種別がない場合
            if not task.task_type:
                warnings.append(f"タスク「{task.name}」にタスク種別が設定されていません")

            # 担当者を選択
            best_member = self._find_best_member(
                task.task_type,
                member_next_dates,
                start_date
            )

            if task.task_type and not best_member:
                warnings.append(
                    f"タスク「{task.name}」の種別「{task.task_type}」を担当できるメンバーがいません"
                )

            # 開始日を決定
            if best_member:
                task_start = member_next_dates.get(best_member.id, start_date)
                hours_per_day = self._get_hours_per_day(best_member)
            else:
                task_start = start_date
                hours_per_day = 8.0  # デフォルト

            # 休日を考慮して開始日を調整
            holidays = self._get_holiday_dates()
            while task_start in holidays:
                task_start += timedelta(days=1)

            # 所要日数を計算
            task_days = self.calculate_task_days(task.planned_hours, hours_per_day)

            # 終了日を計算
            task_end = self.add_working_days(task_start, task_days)

            # メンバーの次の空き日を更新
            if best_member:
                member_next_dates[best_member.id] = self.get_next_working_day(task_end)

            result_tasks.append({
                "id": task.id,
                "name": task.name,
                "task_type": task.task_type,
                "planned_hours": task.planned_hours,
                "calculated_days": task_days,
                "current_member_id": task.assigned_member_id,
                "current_member_name": self._get_member_name(task.assigned_member_id),
                "new_member_id": best_member.id if best_member else None,
                "new_member_name": best_member.name if best_member else None,
                "new_start": task_start,
                "new_end": task_end,
            })

        return {
            "start_date": start_date,
            "tasks": result_tasks,
            "total_count": len(result_tasks),
            "warnings": warnings,
        }

    def execute(self, task_ids: List[int], start_date: date) -> Dict[str, Any]:
        """
        自動スケジュール実行
        タスクの担当者と日付を更新
        """
        preview_result = self.preview(task_ids, start_date)

        for task_data in preview_result["tasks"]:
            task = self.db.query(Task).filter(Task.id == task_data["id"]).first()
            if task:
                # 担当者を更新
                task.assigned_member_id = task_data["new_member_id"]

                # 日付を更新（datetime形式で保存）
                if task_data["new_start"]:
                    task.planned_start_date = datetime.combine(
                        task_data["new_start"],
                        datetime.min.time()
                    )
                if task_data["new_end"]:
                    task.planned_end_date = datetime.combine(
                        task_data["new_end"],
                        datetime.min.time()
                    )

                # 子タスクも同様に更新
                children = self.db.query(Task).filter(Task.parent_id == task.id).all()
                for child in children:
                    child.assigned_member_id = task_data["new_member_id"]
                    if task_data["new_start"]:
                        child.planned_start_date = datetime.combine(
                            task_data["new_start"],
                            datetime.min.time()
                        )
                    if task_data["new_end"]:
                        child.planned_end_date = datetime.combine(
                            task_data["new_end"],
                            datetime.min.time()
                        )

        self.db.commit()

        return {
            "message": f"{preview_result['total_count']}件のタスクを自動スケジュールしました",
            "updated_count": preview_result["total_count"],
            "updated_tasks": preview_result["tasks"],
        }
