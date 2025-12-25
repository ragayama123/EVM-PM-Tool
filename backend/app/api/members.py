from typing import List, Dict, Set
from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from collections import defaultdict

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.member import Member
from app.models.member_skill import MemberSkill
from app.models.task import Task
from app.models.holiday import Holiday
from app.models.project import Project
from app.models.user import User
from app.schemas.member import (
    MemberCreate, MemberUpdate, MemberResponse, MemberWithUtilization, MemberEVM,
    MemberSkillUpdate, MemberWithSkills, TASK_TYPES,
    DailyUtilization, WeeklyUtilization, MemberUtilizationDetail
)

router = APIRouter(prefix="/members", tags=["members"])


@router.get("/project/{project_id}", response_model=List[MemberWithUtilization])
def get_members_by_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトのメンバー一覧を取得（稼働率付き）"""
    # プロジェクト情報を取得
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    # プロジェクトの休日を取得
    holidays = db.query(Holiday.date).filter(
        Holiday.project_id == project_id
    ).all()
    holiday_dates: set = {h.date.date() if isinstance(h.date, datetime) else h.date for h in holidays}

    # プロジェクト期間内の稼働日数を計算
    project_start = project.start_date.date() if isinstance(project.start_date, datetime) else project.start_date
    project_end = project.end_date.date() if isinstance(project.end_date, datetime) else project.end_date

    working_days = 0
    current = project_start
    while current <= project_end:
        if current.weekday() < 5 and current not in holiday_dates:  # 平日かつ休日でない
            working_days += 1
        current += timedelta(days=1)

    members = db.query(Member).filter(Member.project_id == project_id).all()

    result = []
    for member in members:
        # アサインされた工数を集計
        assigned_hours = db.query(sql_func.sum(Task.planned_hours)).filter(
            Task.assigned_member_id == member.id
        ).scalar() or 0

        # プロジェクト全期間の稼働可能時間を計算
        # 1日あたりの稼働可能時間 = 週あたり稼働可能時間 / 5
        hours_per_day = member.available_hours_per_week / 5
        total_available_hours = working_days * hours_per_day

        # 稼働率計算（プロジェクト全期間の稼働可能時間に対する割合）
        utilization_rate = 0
        if total_available_hours > 0:
            utilization_rate = (assigned_hours / total_available_hours) * 100

        result.append(MemberWithUtilization(
            id=member.id,
            project_id=member.project_id,
            name=member.name,
            available_hours_per_week=member.available_hours_per_week,
            created_at=member.created_at,
            updated_at=member.updated_at,
            assigned_hours=assigned_hours,
            total_available_hours=round(total_available_hours, 1),
            utilization_rate=round(utilization_rate, 1)
        ))

    return result


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """メンバー詳細を取得"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    return member


@router.post("/", response_model=MemberResponse)
def create_member(
    member: MemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """メンバーを作成"""
    db_member = Member(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


@router.put("/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: int,
    member: MemberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
def delete_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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


@router.get("/{member_id}/skills", response_model=List[str])
def get_member_skills(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """メンバーのスキル（担当可能タスク種別）を取得"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    skills = db.query(MemberSkill.task_type).filter(
        MemberSkill.member_id == member_id
    ).all()

    return [s[0] for s in skills]


@router.put("/{member_id}/skills", response_model=List[str])
def update_member_skills(
    member_id: int,
    request: MemberSkillUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """メンバーのスキル（担当可能タスク種別）を更新"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    # 無効なタスク種別をチェック
    invalid_types = [t for t in request.task_types if t not in TASK_TYPES]
    if invalid_types:
        raise HTTPException(
            status_code=400,
            detail=f"無効なタスク種別: {', '.join(invalid_types)}"
        )

    # 既存のスキルを削除
    db.query(MemberSkill).filter(MemberSkill.member_id == member_id).delete()

    # 新しいスキルを追加
    for task_type in request.task_types:
        skill = MemberSkill(member_id=member_id, task_type=task_type)
        db.add(skill)

    db.commit()

    return request.task_types


@router.get("/project/{project_id}/with-skills", response_model=List[MemberWithSkills])
def get_members_with_skills(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトのメンバー一覧を取得（スキル付き）"""
    members = db.query(Member).filter(Member.project_id == project_id).all()

    result = []
    for member in members:
        skills = db.query(MemberSkill.task_type).filter(
            MemberSkill.member_id == member.id
        ).all()

        result.append(MemberWithSkills(
            id=member.id,
            project_id=member.project_id,
            name=member.name,
            available_hours_per_week=member.available_hours_per_week,
            created_at=member.created_at,
            updated_at=member.updated_at,
            skills=[s[0] for s in skills]
        ))

    return result


@router.get("/project/{project_id}/utilization", response_model=List[MemberUtilizationDetail])
def get_members_utilization(
    project_id: int,
    start_date: str = Query(..., description="開始日 (YYYY-MM-DD)"),
    end_date: str = Query(..., description="終了日 (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトのメンバー稼働率詳細を取得（日毎・週毎）"""
    # 日付をパース
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="日付形式が不正です（YYYY-MM-DD）")

    if start > end:
        raise HTTPException(status_code=400, detail="開始日は終了日以前である必要があります")

    # プロジェクトの休日を取得
    holidays = db.query(Holiday.date).filter(
        Holiday.project_id == project_id
    ).all()
    holiday_dates: Set[date] = {h.date.date() if isinstance(h.date, datetime) else h.date for h in holidays}

    # メンバー一覧を取得
    members = db.query(Member).filter(Member.project_id == project_id).all()

    result = []
    for member in members:
        hours_per_day = member.available_hours_per_week / 5  # 週5日稼働として計算

        # メンバーのタスクを取得
        tasks = db.query(Task).filter(
            Task.assigned_member_id == member.id,
            Task.planned_start_date != None,
            Task.planned_end_date != None
        ).all()

        # 日毎の稼働時間を計算
        daily_hours: Dict[date, float] = defaultdict(float)

        for task in tasks:
            task_start = task.planned_start_date.date() if isinstance(task.planned_start_date, datetime) else task.planned_start_date
            task_end = task.planned_end_date.date() if isinstance(task.planned_end_date, datetime) else task.planned_end_date

            if task_start is None or task_end is None:
                continue

            # タスク期間内の稼働日数を計算
            working_days = 0
            current = task_start
            while current <= task_end:
                if current.weekday() < 5 and current not in holiday_dates:  # 平日かつ休日でない
                    working_days += 1
                current += timedelta(days=1)

            if working_days == 0:
                continue

            # 1日あたりの工数
            hours_per_working_day = task.planned_hours / working_days

            # 各日に工数を割り当て
            current = task_start
            while current <= task_end:
                if current.weekday() < 5 and current not in holiday_dates:
                    if start <= current <= end:
                        daily_hours[current] += hours_per_working_day
                current += timedelta(days=1)

        # 日毎の稼働率リストを作成
        daily_list = []
        current = start
        while current <= end:
            if current.weekday() < 5 and current not in holiday_dates:  # 稼働日のみ
                hours = daily_hours.get(current, 0)
                utilization = (hours / hours_per_day * 100) if hours_per_day > 0 else 0
                daily_list.append(DailyUtilization(
                    date=current.strftime("%Y-%m-%d"),
                    hours=round(hours, 2),
                    utilization_rate=round(utilization, 1)
                ))
            current += timedelta(days=1)

        # 週毎の稼働率を計算
        weekly_list = []
        # 開始日を含む週の月曜日を取得
        week_start = start - timedelta(days=start.weekday())
        while week_start <= end:
            week_end = week_start + timedelta(days=6)  # 日曜日

            # その週の稼働時間を集計
            week_hours = 0
            current = week_start
            while current <= week_end:
                if start <= current <= end:
                    week_hours += daily_hours.get(current, 0)
                current += timedelta(days=1)

            # その週の稼働可能時間（期間内のみ）
            week_working_days = 0
            current = week_start
            while current <= week_end:
                if start <= current <= end and current.weekday() < 5 and current not in holiday_dates:
                    week_working_days += 1
                current += timedelta(days=1)

            available_hours = week_working_days * hours_per_day
            utilization = (week_hours / available_hours * 100) if available_hours > 0 else 0

            weekly_list.append(WeeklyUtilization(
                week_start=week_start.strftime("%Y-%m-%d"),
                week_end=week_end.strftime("%Y-%m-%d"),
                hours=round(week_hours, 2),
                available_hours=round(available_hours, 2),
                utilization_rate=round(utilization, 1)
            ))

            week_start += timedelta(days=7)

        result.append(MemberUtilizationDetail(
            member_id=member.id,
            member_name=member.name,
            available_hours_per_week=member.available_hours_per_week,
            available_hours_per_day=round(hours_per_day, 2),
            daily=daily_list,
            weekly=weekly_list
        ))

    return result


@router.get("/project/{project_id}/evm", response_model=List[MemberEVM])
def get_members_evm(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
