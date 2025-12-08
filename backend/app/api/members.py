from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from app.core.database import get_db
from app.models.member import Member
from app.models.task import Task
from app.schemas.member import MemberCreate, MemberUpdate, MemberResponse, MemberWithUtilization

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
