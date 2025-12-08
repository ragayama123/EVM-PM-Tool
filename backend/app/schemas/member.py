from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MemberBase(BaseModel):
    """メンバー基本スキーマ"""
    name: str
    available_hours_per_week: float = 40


class MemberCreate(MemberBase):
    """メンバー作成スキーマ"""
    project_id: int


class MemberUpdate(BaseModel):
    """メンバー更新スキーマ"""
    name: Optional[str] = None
    available_hours_per_week: Optional[float] = None


class MemberResponse(MemberBase):
    """メンバーレスポンススキーマ"""
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MemberWithUtilization(MemberResponse):
    """稼働率付きメンバーレスポンススキーマ"""
    assigned_hours: float = 0  # アサインされた工数合計
    utilization_rate: float = 0  # 稼働率（%）

    class Config:
        from_attributes = True


class MemberEVM(BaseModel):
    """メンバー別EVMレスポンススキーマ"""
    id: int
    name: str
    task_count: int = 0  # 担当タスク数
    bac: float = 0  # Budget at Completion
    pv: float = 0   # Planned Value
    ev: float = 0   # Earned Value
    ac: float = 0   # Actual Cost
    sv: float = 0   # Schedule Variance
    cv: float = 0   # Cost Variance
    spi: float = 0  # Schedule Performance Index
    cpi: float = 0  # Cost Performance Index
    etc: float = 0  # Estimate to Complete
    eac: float = 0  # Estimate at Completion
