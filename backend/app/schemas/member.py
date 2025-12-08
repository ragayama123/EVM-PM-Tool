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
