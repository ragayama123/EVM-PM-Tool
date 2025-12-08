from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.project import ProjectStatus


class ProjectBase(BaseModel):
    """プロジェクト基本スキーマ"""
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING


class ProjectCreate(ProjectBase):
    """プロジェクト作成スキーマ"""
    manager_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    """プロジェクト更新スキーマ"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    manager_id: Optional[int] = None


class ProjectResponse(BaseModel):
    """プロジェクトレスポンススキーマ（タスクから計算した値を含む）"""
    id: int
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None  # タスクの最早開始日
    end_date: Optional[datetime] = None    # タスクの最遅終了日
    budget: float = 0                       # タスクの計画工数合計
    status: ProjectStatus
    manager_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
