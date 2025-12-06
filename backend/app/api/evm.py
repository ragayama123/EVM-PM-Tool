from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.models.evm_snapshot import EVMSnapshot
from app.schemas.evm import EVMMetrics, EVMSnapshotResponse
from app.services.evm_calculator import EVMCalculator

router = APIRouter(prefix="/evm", tags=["evm"])


@router.get("/projects/{project_id}/metrics", response_model=EVMMetrics)
def get_evm_metrics(
    project_id: int,
    as_of_date: Optional[datetime] = Query(None, description="計算基準日"),
    db: Session = Depends(get_db)
):
    """プロジェクトのEVM指標を計算して取得"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    calculator = EVMCalculator(db, project_id)
    metrics = calculator.calculate_all(as_of_date)
    return metrics


@router.post("/projects/{project_id}/snapshots", response_model=EVMSnapshotResponse)
def create_evm_snapshot(
    project_id: int,
    as_of_date: Optional[datetime] = Query(None, description="スナップショット日"),
    db: Session = Depends(get_db)
):
    """EVM指標のスナップショットを作成"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    calculator = EVMCalculator(db, project_id)
    snapshot = calculator.create_snapshot(as_of_date)
    return snapshot


@router.get("/projects/{project_id}/snapshots", response_model=List[EVMSnapshotResponse])
def get_evm_snapshots(
    project_id: int,
    start_date: Optional[datetime] = Query(None, description="開始日"),
    end_date: Optional[datetime] = Query(None, description="終了日"),
    db: Session = Depends(get_db)
):
    """プロジェクトのEVMスナップショット履歴を取得"""
    query = db.query(EVMSnapshot).filter(EVMSnapshot.project_id == project_id)

    if start_date:
        query = query.filter(EVMSnapshot.date >= start_date)
    if end_date:
        query = query.filter(EVMSnapshot.date <= end_date)

    snapshots = query.order_by(EVMSnapshot.date).all()
    return snapshots


@router.get("/projects/{project_id}/analysis")
def get_evm_analysis(project_id: int, db: Session = Depends(get_db)):
    """プロジェクトのEVM分析結果を取得"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    calculator = EVMCalculator(db, project_id)
    metrics = calculator.calculate_all()

    # 分析コメント生成
    analysis = {
        "metrics": metrics,
        "schedule_status": _analyze_schedule(metrics["spi"]),
        "cost_status": _analyze_cost(metrics["cpi"]),
        "recommendations": _generate_recommendations(metrics),
    }

    return analysis


def _analyze_schedule(spi: float) -> dict:
    """スケジュール状況を分析"""
    if spi >= 1.0:
        return {"status": "on_track", "message": "スケジュール通り進行中"}
    elif spi >= 0.9:
        return {"status": "warning", "message": "やや遅延気味（SPI: {:.2f}）".format(spi)}
    else:
        return {"status": "critical", "message": "大幅な遅延発生（SPI: {:.2f}）".format(spi)}


def _analyze_cost(cpi: float) -> dict:
    """コスト状況を分析"""
    if cpi >= 1.0:
        return {"status": "on_track", "message": "予算内で進行中"}
    elif cpi >= 0.9:
        return {"status": "warning", "message": "やや予算超過気味（CPI: {:.2f}）".format(cpi)}
    else:
        return {"status": "critical", "message": "大幅な予算超過（CPI: {:.2f}）".format(cpi)}


def _generate_recommendations(metrics: dict) -> List[str]:
    """改善提案を生成"""
    recommendations = []

    if metrics["spi"] < 0.9:
        recommendations.append("リソースの追加またはスコープの見直しを検討してください")
    if metrics["cpi"] < 0.9:
        recommendations.append("コスト効率の改善策を検討してください")
    if metrics["spi"] < 1.0 and metrics["cpi"] < 1.0:
        recommendations.append("プロジェクト計画の全体的な見直しを推奨します")
    if not recommendations:
        recommendations.append("現状維持で問題ありません")

    return recommendations
