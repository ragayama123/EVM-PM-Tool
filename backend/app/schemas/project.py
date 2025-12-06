from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.project import ProjectStatus


class ProjectBase(BaseModel):
    """プロジェクト基本スキーマ"""
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    budget: float = 0
    status: ProjectStatus = ProjectStatus.PLANNING


class ProjectCreate(ProjectBase):
    """プロジェクト作成スキーマ"""
    manager_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    """プロジェクト更新スキーマ"""
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    status: Optional[ProjectStatus] = None
    manager_id: Optional[int] = None


class ProjectResponse(ProjectBase):
    """プロジェクトレスポンススキーマ"""
    id: int
    manager_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
