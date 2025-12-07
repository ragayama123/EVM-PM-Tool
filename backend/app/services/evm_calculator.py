from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.evm_snapshot import EVMSnapshot


class EVMCalculator:
    """EVM（アーンドバリューマネジメント）計算エンジン"""

    def __init__(self, db: Session, project_id: int):
        self.db = db
        self.project_id = project_id

    def calculate_pv(self, as_of_date: Optional[datetime] = None) -> float:
        """
        PV（Planned Value / 計画価値）を計算
        計画工数 × 単価の合計
        """
        if as_of_date is None:
            as_of_date = datetime.now(timezone.utc)

        # タイムゾーンを取り除いてnaive datetimeにする（比較用）
        if as_of_date.tzinfo is not None:
            as_of_date = as_of_date.replace(tzinfo=None)

        # 予定開始日が設定されているタスクを取得
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

        pv = 0.0
        for task in tasks:
            # 予定日が設定されていない場合は計画価値全体を含める
            if not task.planned_start_date:
                pv += task.planned_hours * task.hourly_rate
                continue

            start = to_naive(task.planned_start_date)
            end = to_naive(task.planned_end_date)

            # 予定開始日がまだ来ていない場合はスキップ
            if start > as_of_date:
                continue

            if end and end <= as_of_date:
                # タスク完了予定日を過ぎている場合は100%
                pv += task.planned_hours * task.hourly_rate
            elif start and end:
                # 期間中の場合は日割り計算
                # +1 to include both start and end days in total
                total_days = (end - start).days + 1
                # +1 to include the current day as worked
                elapsed_days = (as_of_date - start).days + 1
                if total_days > 0:
                    ratio = min(elapsed_days / total_days, 1.0)
                    pv += task.planned_hours * task.hourly_rate * ratio
            else:
                # 終了日が設定されていない場合は全体を含める
                pv += task.planned_hours * task.hourly_rate

        return pv

    def calculate_ev(self) -> float:
        """
        EV（Earned Value / 出来高）を計算
        完了タスクの計画価値合計（進捗率加味）
        """
        tasks = self.db.query(Task).filter(
            Task.project_id == self.project_id
        ).all()

        ev = 0.0
        for task in tasks:
            # 計画価値 × 進捗率
            planned_value = task.planned_hours * task.hourly_rate
            ev += planned_value * (task.progress / 100.0)

        return ev

    def calculate_ac(self) -> float:
        """
        AC（Actual Cost / 実コスト）を計算
        実績工数 × 単価の合計
        """
        tasks = self.db.query(Task).filter(
            Task.project_id == self.project_id
        ).all()

        ac = 0.0
        for task in tasks:
            ac += task.actual_hours * task.hourly_rate

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
        """BAC（Budget at Completion / 完了時総予算）を取得"""
        tasks = self.db.query(Task).filter(
            Task.project_id == self.project_id
        ).all()

        bac = 0.0
        for task in tasks:
            bac += task.planned_hours * task.hourly_rate

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
