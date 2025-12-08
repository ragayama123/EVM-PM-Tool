from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    """タスク基本スキーマ"""
    name: str
    description: Optional[str] = None
    planned_hours: float = 0
    actual_hours: float = 0
    hourly_rate: float = 0
    # 予定スケジュール
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    # 実績スケジュール
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    """タスク作成スキーマ"""
    project_id: int
    parent_id: Optional[int] = None
    assigned_member_id: Optional[int] = None


class TaskUpdate(BaseModel):
    """タスク更新スキーマ"""
    name: Optional[str] = None
    description: Optional[str] = None
    planned_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    progress: Optional[float] = Field(None, ge=0, le=100)
    hourly_rate: Optional[float] = None
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    parent_id: Optional[int] = None
    assigned_member_id: Optional[int] = None


class TaskResponse(TaskBase):
    """タスクレスポンススキーマ"""
    id: int
    project_id: int
    parent_id: Optional[int] = None
    assigned_member_id: Optional[int] = None
    progress: float = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskTreeResponse(TaskResponse):
    """タスクツリーレスポンススキーマ（子タスク含む）"""
    children: List["TaskTreeResponse"] = []

    class Config:
        from_attributes = True
