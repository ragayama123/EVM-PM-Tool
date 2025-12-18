from datetime import datetime, timezone, date, timedelta
from typing import Optional, Set
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.evm_snapshot import EVMSnapshot
from app.models.holiday import Holiday


class EVMCalculator:
    """EVM（アーンドバリューマネジメント）計算エンジン"""

    def __init__(self, db: Session, project_id: int):
        self.db = db
        self.project_id = project_id
        self._holiday_dates: Optional[Set[date]] = None

    def _get_holiday_dates(self) -> Set[date]:
        """プロジェクトの休日日付セットを取得（キャッシュ）"""
        if self._holiday_dates is None:
            holidays = self.db.query(Holiday.date).filter(
                Holiday.project_id == self.project_id
            ).all()
            self._holiday_dates = {h[0] for h in holidays}
        return self._holiday_dates

    def _is_non_working_day(self, target_date: date) -> bool:
        """指定日が非稼働日（土日または休日）かどうかを判定"""
        # 土曜日(5)または日曜日(6)
        if target_date.weekday() >= 5:
            return True
        # 休日カレンダーに登録されている日
        if target_date in self._get_holiday_dates():
            return True
        return False

    def _count_working_days(self, start_date: date, end_date: date) -> int:
        """期間内の稼働日数を計算（土日祝日を除外）"""
        working_days = 0
        current = start_date
        while current <= end_date:
            if not self._is_non_working_day(current):
                working_days += 1
            current += timedelta(days=1)
        return working_days

    def _count_elapsed_working_days(self, start_date: date, as_of_date: date) -> int:
        """開始日から基準日までの経過稼働日数を計算（土日祝日を除外）"""
        working_days = 0
        current = start_date
        while current <= as_of_date:
            if not self._is_non_working_day(current):
                working_days += 1
            current += timedelta(days=1)
        return working_days

    def calculate_pv(self, as_of_date: Optional[datetime] = None) -> float:
        """
        PV（Planned Value / 計画価値）を計算
        計画工数の合計（工数ベース）
        休日を除いた稼働日で日割り計算
        """
        if as_of_date is None:
            as_of_date = datetime.now(timezone.utc)

        # タイムゾーンを取り除いてnaive datetimeにする（比較用）
        if as_of_date.tzinfo is not None:
            as_of_date = as_of_date.replace(tzinfo=None)

        as_of_date_only = as_of_date.date()

        # 全タスクを取得
        tasks = self.db.query(Task).filter(
            Task.project_id == self.project_id
        ).all()

        def to_naive(dt):
            """タイムゾーン情報を取り除く"""
            if dt is None:
                return None
            if dt.tzinfo is not None:
                return dt.replace(tzinfo=None)
            return dt

        def to_date(dt) -> Optional[date]:
            """datetimeをdateに変換"""
            if dt is None:
                return None
            if isinstance(dt, date) and not isinstance(dt, datetime):
                return dt
            return dt.date()

        pv = 0.0
        for task in tasks:
            # 予定日が設定されていない場合は計画工数全体を含める
            if not task.planned_start_date:
                pv += task.planned_hours
                continue

            start = to_date(to_naive(task.planned_start_date))
            end = to_date(to_naive(task.planned_end_date))

            # 予定開始日がまだ来ていない場合はスキップ
            if start > as_of_date_only:
                continue

            if end and end <= as_of_date_only:
                # タスク完了予定日を過ぎている場合は100%
                pv += task.planned_hours
            elif start and end:
                # 期間中の場合は稼働日ベースで日割り計算
                total_working_days = self._count_working_days(start, end)
                elapsed_working_days = self._count_elapsed_working_days(start, as_of_date_only)
                # end日を超えないようにする
                elapsed_working_days = min(elapsed_working_days, total_working_days)

                if total_working_days > 0:
                    ratio = elapsed_working_days / total_working_days
                    pv += task.planned_hours * ratio
            else:
                # 終了日が設定されていない場合は全体を含める
                pv += task.planned_hours

        return pv

    def calculate_ev(self) -> float:
        """
        EV（Earned Value / 出来高）を計算
        計画工数 × 進捗率の合計（工数ベース）
        """
        tasks = self.db.query(Task).filter(
            Task.project_id == self.project_id
        ).all()

        ev = 0.0
        for task in tasks:
            # 計画工数 × 進捗率
            ev += task.planned_hours * (task.progress / 100.0)

        return ev

    def calculate_ac(self) -> float:
        """
        AC（Actual Cost / 実績工数）を計算
        実績工数の合計（工数ベース）
        """
        tasks = self.db.query(Task).filter(
            Task.project_id == self.project_id
        ).all()

        ac = 0.0
        for task in tasks:
            ac += task.actual_hours

        return ac

    def calculate_sv(self, ev: float, pv: float) -> float:
        """SV（Schedule Variance / スケジュール差異）= EV - PV"""
        return ev - pv

    def calculate_cv(self, ev: float, ac: float) -> float:
        """CV（Cost Variance / コスト差異）= EV - AC"""
        return ev - ac

    def calculate_spi(self, ev: float, pv: float) -> float:
        """SPI（Schedule Performance Index）= EV / PV"""
        if pv == 0:
            return 0.0
        return ev / pv

    def calculate_cpi(self, ev: float, ac: float) -> float:
        """CPI（Cost Performance Index）= EV / AC"""
        if ac == 0:
            return 0.0
        return ev / ac

    def calculate_eac(self, ac: float, etc: float) -> float:
        """EAC（Estimate at Completion / 完了時総コスト見積）= AC + ETC"""
        return ac + etc

    def calculate_etc(self, bac: float, ev: float, cpi: float) -> float:
        """ETC（Estimate to Complete / 残作業コスト見積）= (BAC - EV) / CPI"""
        if cpi == 0:
            return 0.0
        return (bac - ev) / cpi

    def get_bac(self) -> float:
        """BAC（Budget at Completion / 計画総工数）を取得"""
        tasks = self.db.query(Task).filter(
            Task.project_id == self.project_id
        ).all()

        bac = 0.0
        for task in tasks:
            bac += task.planned_hours

        return bac

    def calculate_all(self, as_of_date: Optional[datetime] = None) -> dict:
        """全EVM指標を計算"""
        if as_of_date is None:
            as_of_date = datetime.now(timezone.utc)

        pv = self.calculate_pv(as_of_date)
        ev = self.calculate_ev()
        ac = self.calculate_ac()
        sv = self.calculate_sv(ev, pv)
        cv = self.calculate_cv(ev, ac)
        spi = self.calculate_spi(ev, pv)
        cpi = self.calculate_cpi(ev, ac)
        bac = self.get_bac()
        etc = self.calculate_etc(bac, ev, cpi)
        eac = self.calculate_eac(ac, etc)

        return {
            "date": as_of_date,
            "pv": round(pv, 2),
            "ev": round(ev, 2),
            "ac": round(ac, 2),
            "sv": round(sv, 2),
            "cv": round(cv, 2),
            "spi": round(spi, 3),
            "cpi": round(cpi, 3),
            "bac": round(bac, 2),
            "etc": round(etc, 2),
            "eac": round(eac, 2),
        }

    def create_snapshot(self, as_of_date: Optional[datetime] = None) -> EVMSnapshot:
        """EVM指標のスナップショットを作成して保存"""
        metrics = self.calculate_all(as_of_date)

        snapshot = EVMSnapshot(
            project_id=self.project_id,
            date=metrics["date"],
            pv=metrics["pv"],
            ev=metrics["ev"],
            ac=metrics["ac"],
            sv=metrics["sv"],
            cv=metrics["cv"],
            spi=metrics["spi"],
            cpi=metrics["cpi"],
            eac=metrics["eac"],
            etc=metrics["etc"],
        )

        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)

        return snapshot
