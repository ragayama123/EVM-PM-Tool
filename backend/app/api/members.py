from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from app.core.database import get_db
from app.models.member import Member
from app.models.task import Task
from app.schemas.member import MemberCreate, MemberUpdate, MemberResponse, MemberWithUtilization, MemberEVM

router = APIRouter(prefix="/members", tags=["members"])


@router.get("/project/{project_id}", response_model=List[MemberWithUtilization])
def get_members_by_project(project_id: int, db: Session = Depends(get_db)):
    """プロジェクトのメンバー一覧を取得（稼働率付き）"""
    members = db.query(Member).filter(Member.project_id == project_id).all()

    result = []
    for member in members:
        # アサインされた工数を集計
        assigned_hours = db.query(sql_func.sum(Task.planned_hours)).filter(
            Task.assigned_member_id == member.id
        ).scalar() or 0

        # 稼働率計算（週あたり稼働可能時間に対する割合）
        utilization_rate = 0
        if member.available_hours_per_week > 0:
            utilization_rate = (assigned_hours / member.available_hours_per_week) * 100

        result.append(MemberWithUtilization(
            id=member.id,
            project_id=member.project_id,
            name=member.name,
            available_hours_per_week=member.available_hours_per_week,
            created_at=member.created_at,
            updated_at=member.updated_at,
            assigned_hours=assigned_hours,
            utilization_rate=round(utilization_rate, 1)
        ))

    return result


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: int, db: Session = Depends(get_db)):
    """メンバー詳細を取得"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    return member


@router.post("/", response_model=MemberResponse)
def create_member(member: MemberCreate, db: Session = Depends(get_db)):
    """メンバーを作成"""
    db_member = Member(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


@router.put("/{member_id}", response_model=MemberResponse)
def update_member(member_id: int, member: MemberUpdate, db: Session = Depends(get_db)):
    """メンバーを更新"""
    db_member = db.query(Member).filter(Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    update_data = member.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_member, key, value)

    db.commit()
    db.refresh(db_member)
    return db_member


@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    """メンバーを削除"""
    db_member = db.query(Member).filter(Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    # 担当タスクの割り当てを解除
    db.query(Task).filter(Task.assigned_member_id == member_id).update(
        {"assigned_member_id": None}
    )

    db.delete(db_member)
    db.commit()
    return {"message": "メンバーを削除しました"}


@router.get("/project/{project_id}/evm", response_model=List[MemberEVM])
def get_members_evm(project_id: int, db: Session = Depends(get_db)):
    """プロジェクトのメンバー別EVM指標を取得（工数ベース）"""
    members = db.query(Member).filter(Member.project_id == project_id).all()
    as_of_date = datetime.now(timezone.utc).replace(tzinfo=None)

    result = []
    for member in members:
        # メンバーに割り当てられたタスクを取得
        tasks = db.query(Task).filter(
            Task.assigned_member_id == member.id
        ).all()

        # BAC: 計画工数合計
        bac = sum(t.planned_hours for t in tasks)

        # PV: 計画工数（日割り計算）
        pv = 0.0
        for task in tasks:
            if not task.planned_start_date:
                pv += task.planned_hours
                continue

            start = task.planned_start_date.replace(tzinfo=None) if task.planned_start_date.tzinfo else task.planned_start_date
            end = task.planned_end_date.replace(tzinfo=None) if task.planned_end_date and task.planned_end_date.tzinfo else task.planned_end_date

            if start > as_of_date:
                continue

            if end and end <= as_of_date:
                pv += task.planned_hours
            elif start and end:
                total_days = (end - start).days + 1
                elapsed_days = (as_of_date - start).days + 1
                if total_days > 0:
                    ratio = min(elapsed_days / total_days, 1.0)
                    pv += task.planned_hours * ratio
            else:
                pv += task.planned_hours

        # EV: 出来高（進捗率加味）
        ev = sum(t.planned_hours * (t.progress / 100.0) for t in tasks)

        # AC: 実績工数
        ac = sum(t.actual_hours for t in tasks)

        # 派生指標
        sv = ev - pv
        cv = ev - ac
        spi = ev / pv if pv > 0 else 0.0
        cpi = ev / ac if ac > 0 else 0.0
        etc = (bac - ev) / cpi if cpi > 0 else 0.0
        eac = ac + etc

        result.append(MemberEVM(
            id=member.id,
            name=member.name,
            task_count=len(tasks),
            bac=round(bac, 1),
            pv=round(pv, 1),
            ev=round(ev, 1),
            ac=round(ac, 1),
            sv=round(sv, 1),
            cv=round(cv, 1),
            spi=round(spi, 2),
            cpi=round(cpi, 2),
            etc=round(etc, 1),
            eac=round(eac, 1),
        ))

    return result
