from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project, ProjectStatus
from app.models.task import Task
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=List[ProjectResponse])
def get_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """プロジェクト一覧を取得"""
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """プロジェクト詳細を取得"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return project


@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """プロジェクトを作成"""
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)):
    """プロジェクトを更新"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    update_data = project.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)

    db.commit()
    db.refresh(db_project)
    return db_project


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """プロジェクトを削除"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    db.delete(db_project)
    db.commit()
    return {"message": "プロジェクトを削除しました"}


@router.post("/{project_id}/refresh-status", response_model=ProjectResponse)
def refresh_project_status(project_id: int, db: Session = Depends(get_db)):
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
    return project


@router.post("/refresh-all-status")
def refresh_all_project_status(db: Session = Depends(get_db)):
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


@router.post("/{project_id}/refresh-dates", response_model=ProjectResponse)
def refresh_project_dates(project_id: int, db: Session = Depends(get_db)):
    """タスクの予定日に基づいてプロジェクト期間を再計算"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    if tasks:
        start_dates = [t.planned_start_date for t in tasks if t.planned_start_date]
        end_dates = [t.planned_end_date for t in tasks if t.planned_end_date]

        if start_dates:
            project.start_date = min(start_dates)
        if end_dates:
            project.end_date = max(end_dates)

        db.commit()
        db.refresh(project)

    return project


@router.post("/refresh-all-dates")
def refresh_all_project_dates(db: Session = Depends(get_db)):
    """全プロジェクトの期間をタスクの予定日に基づいて再計算"""
    projects = db.query(Project).all()
    updated = []

    for project in projects:
        tasks = db.query(Task).filter(Task.project_id == project.id).all()
        old_start = project.start_date
        old_end = project.end_date

        if tasks:
            start_dates = [t.planned_start_date for t in tasks if t.planned_start_date]
            end_dates = [t.planned_end_date for t in tasks if t.planned_end_date]

            new_start = min(start_dates) if start_dates else old_start
            new_end = max(end_dates) if end_dates else old_end

            if project.start_date != new_start or project.end_date != new_end:
                project.start_date = new_start
                project.end_date = new_end
                updated.append({
                    "id": project.id,
                    "name": project.name,
                    "old_period": f"{old_start} ~ {old_end}",
                    "new_period": f"{new_start} ~ {new_end}"
                })

    db.commit()
    return {"message": f"{len(updated)}件のプロジェクトの期間を更新しました", "updated": updated}
