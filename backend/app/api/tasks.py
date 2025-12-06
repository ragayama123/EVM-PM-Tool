from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])


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
    return {"message": f"進捗率を{progress}%に更新しました", "task": db_task}


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """タスクを削除"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    db.delete(db_task)
    db.commit()
    return {"message": "タスクを削除しました"}
