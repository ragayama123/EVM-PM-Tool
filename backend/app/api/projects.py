from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.project import Project, ProjectStatus
from app.models.task import Task
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


def calculate_project_metrics(db: Session, project: Project) -> dict:
    """タスクからプロジェクトの開始日・終了日・予算を計算"""
    tasks = db.query(Task).filter(Task.project_id == project.id).all()

    start_date = None
    end_date = None
    budget = 0.0

    if tasks:
        start_dates = [t.planned_start_date for t in tasks if t.planned_start_date]
        end_dates = [t.planned_end_date for t in tasks if t.planned_end_date]
        budget = sum(t.planned_hours for t in tasks)

        if start_dates:
            start_date = min(start_dates)
        if end_dates:
            end_date = max(end_dates)

    return {
        "start_date": start_date,
        "end_date": end_date,
        "budget": budget,
    }


def project_to_response(db: Session, project: Project) -> ProjectResponse:
    """プロジェクトをレスポンス形式に変換（タスクから計算した値を含む）"""
    metrics = calculate_project_metrics(db, project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        start_date=metrics["start_date"],
        end_date=metrics["end_date"],
        budget=metrics["budget"],
        status=project.status,
        manager_id=project.manager_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクト一覧を取得"""
    projects = db.query(Project).offset(skip).limit(limit).all()
    return [project_to_response(db, p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクト詳細を取得"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return project_to_response(db, project)


@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトを作成"""
    db_project = Project(
        name=project.name,
        description=project.description,
        status=project.status,
        manager_id=project.manager_id,
        # start_date, end_date, budgetはタスクから計算されるため不要
        # 暫定的にNoneを設定（DBカラムを変更するまでの対応）
        start_date=datetime.now(),
        end_date=datetime.now(),
        budget=0,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return project_to_response(db, db_project)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトを更新"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    update_data = project.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)

    db.commit()
    db.refresh(db_project)
    return project_to_response(db, db_project)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """プロジェクトを削除"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    db.delete(db_project)
    db.commit()
    return {"message": "プロジェクトを削除しました"}


@router.post("/{project_id}/refresh-status", response_model=ProjectResponse)
def refresh_project_status(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """タスクの状態に基づいてプロジェクトステータスを再計算"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    if not tasks:
        # タスクがない場合は計画中
        project.status = ProjectStatus.PLANNING
    else:
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.progress >= 100])
        started_tasks = len([t for t in tasks if t.actual_start_date is not None or t.progress > 0])

        if completed_tasks == total_tasks:
            project.status = ProjectStatus.COMPLETED
        elif started_tasks > 0:
            project.status = ProjectStatus.IN_PROGRESS
        else:
            project.status = ProjectStatus.PLANNING

    db.commit()
    db.refresh(project)
    return project_to_response(db, project)


@router.post("/refresh-all-status")
def refresh_all_project_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全プロジェクトのステータスを再計算"""
    projects = db.query(Project).all()
    updated = []

    for project in projects:
        tasks = db.query(Task).filter(Task.project_id == project.id).all()
        old_status = project.status

        if not tasks:
            new_status = ProjectStatus.PLANNING
        else:
            total_tasks = len(tasks)
            completed_tasks = len([t for t in tasks if t.progress >= 100])
            started_tasks = len([t for t in tasks if t.actual_start_date is not None or t.progress > 0])

            if completed_tasks == total_tasks:
                new_status = ProjectStatus.COMPLETED
            elif started_tasks > 0:
                new_status = ProjectStatus.IN_PROGRESS
            else:
                new_status = ProjectStatus.PLANNING

        if project.status != new_status:
            project.status = new_status
            updated.append({
                "id": project.id,
                "name": project.name,
                "old_status": old_status.value,
                "new_status": new_status.value
            })

    db.commit()
    return {"message": f"{len(updated)}件のプロジェクトを更新しました", "updated": updated}
