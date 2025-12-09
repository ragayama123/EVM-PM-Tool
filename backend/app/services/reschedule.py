from datetime import datetime, date, timedelta
from typing import List, Set, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.holiday import Holiday


class RescheduleService:
    """タスクリスケジュール処理サービス"""

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

    def add_working_days(self, start_date: date, days: int) -> date:
        """
        稼働日を加算/減算した日付を計算

        Args:
            start_date: 基準日
            days: ずらす稼働日数（正=後ろ倒し、負=前倒し）

        Returns:
            計算後の日付
        """
        if days == 0:
            return start_date

        holidays = self._get_holiday_dates()
        current = start_date
        remaining = abs(days)
        direction = 1 if days > 0 else -1

        while remaining > 0:
            current += timedelta(days=direction)
            if current not in holidays:
                remaining -= 1

        return current

    def get_target_tasks(self, base_task_id: int) -> List[Task]:
        """
        リスケ対象タスクを取得

        - base_taskのplanned_start_date以降の親タスクを対象
        - parent_id is None（親タスク）のみ
        - 予定開始日順でソート
        - base_task自身は除外
        """
        base_task = self.db.query(Task).filter(Task.id == base_task_id).first()
        if not base_task or not base_task.planned_start_date:
            return []

        base_start = self._to_date(base_task.planned_start_date)
        if base_start is None:
            return []

        # 親タスクのみを対象（parent_id is None）
        # base_taskの予定開始日以降のタスク
        # base_task自身は除外
        return self.db.query(Task).filter(
            Task.project_id == self.project_id,
            Task.parent_id == None,  # noqa: E711
            Task.planned_start_date != None,  # noqa: E711
            Task.planned_start_date >= base_task.planned_start_date,
            Task.id != base_task_id
        ).order_by(Task.planned_start_date).all()

    def get_children(self, parent_id: int) -> List[Task]:
        """子タスクを取得"""
        return self.db.query(Task).filter(
            Task.parent_id == parent_id
        ).all()

    def get_base_task(self, task_id: int) -> Optional[Task]:
        """基準タスクを取得"""
        return self.db.query(Task).filter(Task.id == task_id).first()

    def preview(self, base_task_id: int, shift_days: int) -> Dict[str, Any]:
        """
        リスケジュールのプレビュー

        実際の更新は行わず、影響を受けるタスクの変更前後の日付を返す
        """
        base_task = self.get_base_task(base_task_id)
        if not base_task:
            return {
                "base_task_name": "",
                "shift_days": shift_days,
                "affected_tasks": [],
                "total_count": 0
            }

        target_tasks = self.get_target_tasks(base_task_id)
        affected_tasks = []

        for parent in target_tasks:
            parent_start = self._to_date(parent.planned_start_date)
            parent_end = self._to_date(parent.planned_end_date)

            # 親タスク
            affected_tasks.append({
                "id": parent.id,
                "name": parent.name,
                "current_start": parent.planned_start_date,
                "current_end": parent.planned_end_date,
                "new_start": datetime.combine(
                    self.add_working_days(parent_start, shift_days),
                    datetime.min.time()
                ) if parent_start else None,
                "new_end": datetime.combine(
                    self.add_working_days(parent_end, shift_days),
                    datetime.min.time()
                ) if parent_end else None,
                "is_child": False,
                "parent_id": None
            })

            # 子タスク
            children = self.get_children(parent.id)
            for child in children:
                child_start = self._to_date(child.planned_start_date)
                child_end = self._to_date(child.planned_end_date)

                affected_tasks.append({
                    "id": child.id,
                    "name": child.name,
                    "current_start": child.planned_start_date,
                    "current_end": child.planned_end_date,
                    "new_start": datetime.combine(
                        self.add_working_days(child_start, shift_days),
                        datetime.min.time()
                    ) if child_start else None,
                    "new_end": datetime.combine(
                        self.add_working_days(child_end, shift_days),
                        datetime.min.time()
                    ) if child_end else None,
                    "is_child": True,
                    "parent_id": parent.id
                })

        return {
            "base_task_name": base_task.name,
            "shift_days": shift_days,
            "affected_tasks": affected_tasks,
            "total_count": len(affected_tasks)
        }

    def reschedule(self, base_task_id: int, shift_days: int) -> Dict[str, Any]:
        """
        リスケジュール実行

        Args:
            base_task_id: 基準タスクID（日付変更したタスク）
            shift_days: ずらす稼働日数（正=後ろ倒し、負=前倒し）

        Returns:
            {
                "updated_count": 更新タスク数,
                "updated_tasks": [更新されたタスク情報]
            }
        """
        if shift_days == 0:
            return {"updated_count": 0, "updated_tasks": []}

        target_tasks = self.get_target_tasks(base_task_id)
        updated_tasks = []

        for parent_task in target_tasks:
            # 親タスクの日付を更新
            self._shift_task_dates(parent_task, shift_days)
            updated_tasks.append({
                "id": parent_task.id,
                "name": parent_task.name,
                "new_start": parent_task.planned_start_date.isoformat() if parent_task.planned_start_date else None,
                "new_end": parent_task.planned_end_date.isoformat() if parent_task.planned_end_date else None,
                "parent_id": None
            })

            # 子タスクも同様にずらす
            children = self.get_children(parent_task.id)
            for child in children:
                self._shift_task_dates(child, shift_days)
                updated_tasks.append({
                    "id": child.id,
                    "name": child.name,
                    "new_start": child.planned_start_date.isoformat() if child.planned_start_date else None,
                    "new_end": child.planned_end_date.isoformat() if child.planned_end_date else None,
                    "parent_id": parent_task.id
                })

        self.db.commit()

        return {
            "updated_count": len(updated_tasks),
            "updated_tasks": updated_tasks
        }

    def _shift_task_dates(self, task: Task, shift_days: int) -> None:
        """タスクの予定開始日・終了日をずらす"""
        if task.planned_start_date:
            start_date = self._to_date(task.planned_start_date)
            if start_date:
                new_start = self.add_working_days(start_date, shift_days)
                task.planned_start_date = datetime.combine(new_start, datetime.min.time())

        if task.planned_end_date:
            end_date = self._to_date(task.planned_end_date)
            if end_date:
                new_end = self.add_working_days(end_date, shift_days)
                task.planned_end_date = datetime.combine(new_end, datetime.min.time())
