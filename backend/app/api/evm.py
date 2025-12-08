from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.member import Member
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


@router.get("/projects/{project_id}/export", response_class=PlainTextResponse)
def export_evm_for_llm(
    project_id: int,
    format: str = Query("markdown", description="出力形式: markdown, json, yaml"),
    db: Session = Depends(get_db)
):
    """
    LLM分析用にEVMデータをエクスポート

    フォーマット:
    - markdown: 構造化されたMarkdown（人間も読みやすい）
    - json: 構造化JSON（機械処理向け）
    - yaml: YAML形式（可読性と構造のバランス）
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    # タスク一覧を取得
    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    # メンバー一覧を取得
    members = db.query(Member).filter(Member.project_id == project_id).all()
    member_map = {m.id: m.name for m in members}

    # EVM指標を計算
    calculator = EVMCalculator(db, project_id)
    metrics = calculator.calculate_all()

    # スナップショット履歴を取得
    snapshots = db.query(EVMSnapshot).filter(
        EVMSnapshot.project_id == project_id
    ).order_by(EVMSnapshot.date).all()

    # データ構造を構築
    data = _build_export_data(project, tasks, member_map, metrics, snapshots)

    if format == "json":
        return PlainTextResponse(
            content=json.dumps(data, ensure_ascii=False, indent=2, default=str),
            media_type="application/json"
        )
    elif format == "yaml":
        return PlainTextResponse(
            content=_to_yaml(data),
            media_type="text/yaml"
        )
    else:  # markdown
        return PlainTextResponse(
            content=_to_markdown(data),
            media_type="text/markdown"
        )


def _build_export_data(project, tasks, member_map, metrics, snapshots) -> dict:
    """エクスポート用データ構造を構築"""
    now = datetime.now()

    # プロジェクト期間の計算
    start = project.start_date.replace(tzinfo=None) if project.start_date.tzinfo else project.start_date
    end = project.end_date.replace(tzinfo=None) if project.end_date.tzinfo else project.end_date
    total_days = (end - start).days
    elapsed_days = (now - start).days
    remaining_days = (end - now).days

    return {
        "export_date": now.strftime("%Y-%m-%d %H:%M"),
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description or "",
            "status": project.status.value if hasattr(project.status, 'value') else str(project.status),
            "start_date": project.start_date.strftime("%Y-%m-%d"),
            "end_date": project.end_date.strftime("%Y-%m-%d"),
            "total_days": total_days,
            "elapsed_days": elapsed_days,
            "remaining_days": remaining_days,
            "schedule_progress_pct": round(elapsed_days / total_days * 100, 1) if total_days > 0 else 0,
        },
        "evm_metrics": {
            "pv": round(metrics["pv"], 2),
            "ev": round(metrics["ev"], 2),
            "ac": round(metrics["ac"], 2),
            "sv": round(metrics["sv"], 2),
            "cv": round(metrics["cv"], 2),
            "spi": round(metrics["spi"], 3),
            "cpi": round(metrics["cpi"], 3),
            "bac": round(metrics["bac"], 2),
            "eac": round(metrics["eac"], 2),
            "etc": round(metrics["etc"], 2),
            "interpretation": {
                "schedule": "ahead" if metrics["spi"] >= 1.0 else "behind",
                "cost": "under_budget" if metrics["cpi"] >= 1.0 else "over_budget",
                "schedule_variance_pct": round((metrics["spi"] - 1) * 100, 1),
                "cost_variance_pct": round((metrics["cpi"] - 1) * 100, 1),
            }
        },
        "tasks": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description or "",
                "assigned_to": member_map.get(t.assigned_member_id, "未割当"),
                "planned_hours": t.planned_hours,
                "actual_hours": t.actual_hours,
                "progress_pct": t.progress,
                "ev_contribution": round(t.planned_hours * t.progress / 100, 2),
                "efficiency": round(t.planned_hours * t.progress / 100 / t.actual_hours, 2) if t.actual_hours > 0 else None,
                "planned_start": t.planned_start_date.strftime("%Y-%m-%d") if t.planned_start_date else None,
                "planned_end": t.planned_end_date.strftime("%Y-%m-%d") if t.planned_end_date else None,
                "actual_start": t.actual_start_date.strftime("%Y-%m-%d") if t.actual_start_date else None,
                "actual_end": t.actual_end_date.strftime("%Y-%m-%d") if t.actual_end_date else None,
                "status": _get_task_status(t),
            }
            for t in tasks
        ],
        "history": [
            {
                "date": s.date.strftime("%Y-%m-%d"),
                "pv": round(s.pv, 2),
                "ev": round(s.ev, 2),
                "ac": round(s.ac, 2),
                "spi": round(s.spi, 3),
                "cpi": round(s.cpi, 3),
            }
            for s in snapshots
        ],
        "summary": {
            "total_tasks": len(tasks),
            "completed_tasks": len([t for t in tasks if t.progress >= 100]),
            "in_progress_tasks": len([t for t in tasks if 0 < t.progress < 100]),
            "not_started_tasks": len([t for t in tasks if t.progress == 0]),
            "total_planned_hours": sum(t.planned_hours for t in tasks),
            "total_actual_hours": sum(t.actual_hours for t in tasks),
            "overall_progress_pct": round(metrics["ev"] / metrics["bac"] * 100, 1) if metrics["bac"] > 0 else 0,
        }
    }


def _get_task_status(task) -> str:
    """タスクの状態を判定"""
    if task.progress >= 100:
        return "completed"
    elif task.progress > 0:
        return "in_progress"
    elif task.actual_start_date:
        return "started"
    else:
        return "not_started"


def _to_yaml(data: dict) -> str:
    """YAML形式に変換（PyYAML不要の簡易実装）"""
    def format_value(v, indent=0):
        prefix = "  " * indent
        if v is None:
            return "null"
        elif isinstance(v, bool):
            return "true" if v else "false"
        elif isinstance(v, (int, float)):
            return str(v)
        elif isinstance(v, str):
            if "\n" in v or ":" in v or '"' in v:
                return f'"{v}"'
            return v
        elif isinstance(v, list):
            if not v:
                return "[]"
            lines = []
            for item in v:
                if isinstance(item, dict):
                    dict_lines = format_dict(item, indent + 1).split("\n")
                    lines.append(f"\n{prefix}- {dict_lines[0].strip()}")
                    for dl in dict_lines[1:]:
                        if dl.strip():
                            lines.append(f"{prefix}  {dl.strip()}")
                else:
                    lines.append(f"\n{prefix}- {format_value(item)}")
            return "".join(lines)
        elif isinstance(v, dict):
            return "\n" + format_dict(v, indent + 1)
        return str(v)

    def format_dict(d, indent=0):
        prefix = "  " * indent
        lines = []
        for k, v in d.items():
            if isinstance(v, dict):
                lines.append(f"{prefix}{k}:")
                lines.append(format_dict(v, indent + 1))
            elif isinstance(v, list):
                lines.append(f"{prefix}{k}:{format_value(v, indent)}")
            else:
                lines.append(f"{prefix}{k}: {format_value(v)}")
        return "\n".join(lines)

    return format_dict(data)


def _to_markdown(data: dict) -> str:
    """Markdown形式に変換"""
    lines = []
    p = data["project"]
    m = data["evm_metrics"]
    s = data["summary"]

    # ヘッダー
    lines.append(f"# プロジェクトEVMレポート: {p['name']}")
    lines.append(f"\n> エクスポート日時: {data['export_date']}")
    lines.append("")

    # プロジェクト概要
    lines.append("## プロジェクト概要")
    lines.append("")
    lines.append(f"| 項目 | 値 |")
    lines.append(f"|------|-----|")
    lines.append(f"| ステータス | {p['status']} |")
    lines.append(f"| 期間 | {p['start_date']} 〜 {p['end_date']} ({p['total_days']}日間) |")
    lines.append(f"| 経過日数 | {p['elapsed_days']}日 / 残り{p['remaining_days']}日 |")
    lines.append(f"| スケジュール進捗 | {p['schedule_progress_pct']}% |")
    if p['description']:
        lines.append(f"| 説明 | {p['description']} |")
    lines.append("")

    # EVM指標
    lines.append("## EVM指標（工数ベース）")
    lines.append("")
    lines.append("### 基本指標")
    lines.append("")
    lines.append("```")
    lines.append(f"PV (計画工数):     {m['pv']:>10.2f}h  ← 現時点で完了予定の計画工数")
    lines.append(f"EV (出来高):       {m['ev']:>10.2f}h  ← 実際に完了した作業の計画工数")
    lines.append(f"AC (実績工数):     {m['ac']:>10.2f}h  ← 実際に投入した工数")
    lines.append("```")
    lines.append("")

    lines.append("### パフォーマンス指標")
    lines.append("")
    spi_status = "✅ 順調" if m['spi'] >= 1.0 else "⚠️ 遅延" if m['spi'] >= 0.9 else "🚨 大幅遅延"
    cpi_status = "✅ 効率的" if m['cpi'] >= 1.0 else "⚠️ やや非効率" if m['cpi'] >= 0.9 else "🚨 非効率"

    lines.append(f"| 指標 | 値 | 状態 | 意味 |")
    lines.append(f"|------|-----|------|------|")
    lines.append(f"| SPI | {m['spi']:.3f} | {spi_status} | スケジュール効率（1.0以上で予定通り） |")
    lines.append(f"| CPI | {m['cpi']:.3f} | {cpi_status} | 工数効率（1.0以上で予定工数内） |")
    lines.append(f"| SV | {m['sv']:+.2f}h | - | スケジュール差異（正=先行、負=遅延） |")
    lines.append(f"| CV | {m['cv']:+.2f}h | - | 工数差異（正=節約、負=超過） |")
    lines.append("")

    lines.append("### 完了時予測")
    lines.append("")
    lines.append(f"| 指標 | 値 | 説明 |")
    lines.append(f"|------|-----|------|")
    lines.append(f"| BAC (計画総工数) | {m['bac']:.2f}h | プロジェクト全体の計画工数 |")
    lines.append(f"| EAC (完了時総工数見積) | {m['eac']:.2f}h | 現ペースで完了時の総工数予測 |")
    lines.append(f"| ETC (残作業工数見積) | {m['etc']:.2f}h | 残り作業に必要な工数予測 |")
    lines.append("")

    # サマリー
    lines.append("## タスクサマリー")
    lines.append("")
    lines.append(f"| 項目 | 値 |")
    lines.append(f"|------|-----|")
    lines.append(f"| 総タスク数 | {s['total_tasks']} |")
    lines.append(f"| 完了 | {s['completed_tasks']} |")
    lines.append(f"| 進行中 | {s['in_progress_tasks']} |")
    lines.append(f"| 未着手 | {s['not_started_tasks']} |")
    lines.append(f"| 計画総工数 | {s['total_planned_hours']:.2f}h |")
    lines.append(f"| 実績総工数 | {s['total_actual_hours']:.2f}h |")
    lines.append(f"| 全体進捗率 | {s['overall_progress_pct']:.1f}% |")
    lines.append("")

    # タスク一覧
    lines.append("## タスク一覧")
    lines.append("")
    lines.append("| タスク名 | 担当 | 予定工数 | 実績工数 | 進捗 | 効率 | 状態 |")
    lines.append("|----------|------|----------|----------|------|------|------|")
    for t in data["tasks"]:
        eff = f"{t['efficiency']:.2f}" if t['efficiency'] is not None else "-"
        lines.append(f"| {t['name']} | {t['assigned_to']} | {t['planned_hours']}h | {t['actual_hours']}h | {t['progress_pct']}% | {eff} | {t['status']} |")
    lines.append("")

    # 履歴
    if data["history"]:
        lines.append("## EVM履歴")
        lines.append("")
        lines.append("| 日付 | PV | EV | AC | SPI | CPI |")
        lines.append("|------|-----|-----|-----|------|------|")
        for h in data["history"]:
            lines.append(f"| {h['date']} | {h['pv']}h | {h['ev']}h | {h['ac']}h | {h['spi']:.3f} | {h['cpi']:.3f} |")
        lines.append("")

    # 分析用コンテキスト
    lines.append("## 分析用コンテキスト")
    lines.append("")
    lines.append("```json")
    lines.append(json.dumps({
        "interpretation": m["interpretation"],
        "summary": s,
        "project_timeline": {
            "total_days": p["total_days"],
            "elapsed_days": p["elapsed_days"],
            "remaining_days": p["remaining_days"],
            "schedule_progress_pct": p["schedule_progress_pct"],
        }
    }, ensure_ascii=False, indent=2))
    lines.append("```")

    return "\n".join(lines)
