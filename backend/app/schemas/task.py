from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    """タスク基本スキーマ"""
    name: str
    description: Optional[str] = None
    planned_hours: float = 0
    actual_hours: float = 0
    hourly_rate: float = 0
    is_milestone: bool = False  # 固定日付タスク（リスケジュール対象外）
    task_type: Optional[str] = None  # タスク種別（フェーズ）
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
    is_milestone: Optional[bool] = None  # 固定日付タスク
    task_type: Optional[str] = None  # タスク種別（フェーズ）
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


# リスケジュール関連スキーマ
class RescheduleRequest(BaseModel):
    """リスケジュールリクエストスキーマ"""
    base_task_id: int  # 基準タスクID
    shift_days: int = Field(..., ge=-365, le=365)  # ずらす稼働日数


class ReschedulePreviewTask(BaseModel):
    """プレビュー用タスク情報"""
    id: int
    name: str
    current_start: Optional[datetime] = None
    current_end: Optional[datetime] = None
    new_start: Optional[datetime] = None
    new_end: Optional[datetime] = None
    is_child: bool = False
    parent_id: Optional[int] = None


class ReschedulePreviewResponse(BaseModel):
    """リスケジュールプレビューレスポンス"""
    base_task_name: str
    shift_days: int
    affected_tasks: List[ReschedulePreviewTask]
    total_count: int


class RescheduleUpdatedTask(BaseModel):
    """更新されたタスク情報"""
    id: int
    name: str
    new_start: Optional[str] = None
    new_end: Optional[str] = None
    parent_id: Optional[int] = None


class RescheduleResponse(BaseModel):
    """リスケジュール実行結果"""
    message: str
    updated_count: int
    updated_tasks: List[RescheduleUpdatedTask]


# 自動スケジュール関連スキーマ
class AutoScheduleRequest(BaseModel):
    """自動スケジュールリクエストスキーマ"""
    task_ids: List[int]  # 対象タスクID（空の場合は全タスク）
    start_date: date     # 基準開始日


class AutoSchedulePreviewTask(BaseModel):
    """自動スケジュールプレビュー用タスク情報"""
    id: int
    name: str
    task_type: Optional[str] = None
    planned_hours: float
    calculated_days: int
    current_member_id: Optional[int] = None
    current_member_name: Optional[str] = None
    new_member_id: Optional[int] = None
    new_member_name: Optional[str] = None
    new_start: Optional[date] = None
    new_end: Optional[date] = None


class AutoSchedulePreviewResponse(BaseModel):
    """自動スケジュールプレビューレスポンス"""
    start_date: date
    tasks: List[AutoSchedulePreviewTask]
    total_count: int
    warnings: List[str]


class AutoScheduleResponse(BaseModel):
    """自動スケジュール実行結果"""
    message: str
    updated_count: int
    updated_tasks: List[AutoSchedulePreviewTask]
