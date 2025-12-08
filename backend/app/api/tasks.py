from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.task import Task
from app.models.project import Project, ProjectStatus
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])


def update_project_status(db: Session, project_id: int):
    """タスクの状態に基づいてプロジェクトステータスを自動更新"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    if not tasks:
        # タスクがない場合は計画中のまま
        return

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.progress >= 100])
    in_progress_tasks = len([t for t in tasks if 0 < t.progress < 100])
    started_tasks = len([t for t in tasks if t.actual_start_date is not None or t.progress > 0])

    # ステータス判定ロジック
    if completed_tasks == total_tasks:
        # 全タスク完了 → 完了
        new_status = ProjectStatus.COMPLETED
    elif started_tasks > 0 or in_progress_tasks > 0:
        # 1つでも開始済み or 進行中 → 進行中
        new_status = ProjectStatus.IN_PROGRESS
    else:
        # それ以外 → 計画中
        new_status = ProjectStatus.PLANNING

    # ステータスが変わった場合のみ更新
    if project.status != new_status:
        project.status = new_status
        db.commit()


def update_project_dates(db: Session, project_id: int):
    """タスクの予定日に基づいてプロジェクト期間を自動更新"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    if not tasks:
        return

    # タスクの予定開始日・終了日を収集
    start_dates = [t.planned_start_date for t in tasks if t.planned_start_date]
    end_dates = [t.planned_end_date for t in tasks if t.planned_end_date]

    if not start_dates or not end_dates:
        return

    # 最も早い開始日と最も遅い終了日を算出
    earliest_start = min(start_dates)
    latest_end = max(end_dates)

    # プロジェクト期間を更新
    updated = False
    if project.start_date != earliest_start:
        project.start_date = earliest_start
        updated = True
    if project.end_date != latest_end:
        project.end_date = latest_end
        updated = True

    if updated:
        db.commit()


@router.get("/project/{project_id}", response_model=List[TaskResponse])
def get_tasks_by_project(project_id: int, db: Session = Depends(get_db)):
    """プロジェクトのタスク一覧を取得"""
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """タスク詳細を取得"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    return task


@router.post("/", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """タスクを作成"""
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # プロジェクトステータスと期間を自動更新
    update_project_status(db, db_task.project_id)
    update_project_dates(db, db_task.project_id)

    return db_task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    """タスクを更新"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    update_data = task.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)

    # プロジェクトステータスと期間を自動更新
    update_project_status(db, db_task.project_id)
    update_project_dates(db, db_task.project_id)

    return db_task


@router.patch("/{task_id}/progress")
def update_task_progress(task_id: int, progress: float, db: Session = Depends(get_db)):
    """タスクの進捗率を更新"""
    if not 0 <= progress <= 100:
        raise HTTPException(status_code=400, detail="進捗率は0〜100の範囲で指定してください")

    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    db_task.progress = progress
    db.commit()
    db.refresh(db_task)

    # プロジェクトステータスを自動更新
    update_project_status(db, db_task.project_id)

    return {"message": f"進捗率を{progress}%に更新しました", "task": db_task}


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """タスクを削除"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    project_id = db_task.project_id
    db.delete(db_task)
    db.commit()

    # プロジェクトステータスと期間を自動更新
    update_project_status(db, project_id)
    update_project_dates(db, project_id)

    return {"message": "タスクを削除しました"}
