from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# タスク種別定義
TASK_TYPES = [
    "requirements",      # 要件定義
    "external_design",   # 外部設計
    "detailed_design",   # 詳細設計
    "pg",                # PG（プログラミング）
    "ut",                # UT（単体テスト）
    "ci",                # CI（結合テスト）
    "it",                # IT（統合テスト）
    "st",                # ST（システムテスト）
    "release",           # 本番化
]

TASK_TYPE_LABELS = {
    "requirements": "要件定義",
    "external_design": "外部設計",
    "detailed_design": "詳細設計",
    "pg": "PG",
    "ut": "UT",
    "ci": "CI",
    "it": "IT",
    "st": "ST",
    "release": "本番化",
}


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
    total_available_hours: float = 0  # プロジェクト全期間の稼働可能時間
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


class MemberSkillUpdate(BaseModel):
    """メンバースキル更新スキーマ"""
    task_types: List[str]  # 担当可能タスク種別リスト


class MemberWithSkills(MemberResponse):
    """スキル付きメンバーレスポンススキーマ"""
    skills: List[str] = []  # 担当可能タスク種別

    class Config:
        from_attributes = True


class DailyUtilization(BaseModel):
    """日毎稼働率スキーマ"""
    date: str  # YYYY-MM-DD
    hours: float = 0  # その日のアサイン時間
    utilization_rate: float = 0  # 稼働率（%）


class WeeklyUtilization(BaseModel):
    """週毎稼働率スキーマ"""
    week_start: str  # 週の開始日（月曜日）YYYY-MM-DD
    week_end: str  # 週の終了日（日曜日）YYYY-MM-DD
    hours: float = 0  # その週のアサイン時間
    available_hours: float = 0  # 週あたり稼働可能時間
    utilization_rate: float = 0  # 稼働率（%）


class MemberUtilizationDetail(BaseModel):
    """メンバー稼働率詳細レスポンススキーマ"""
    member_id: int
    member_name: str
    available_hours_per_week: float
    available_hours_per_day: float  # 1日あたりの稼働可能時間（週/5）
    daily: List[DailyUtilization] = []
    weekly: List[WeeklyUtilization] = []


class ProjectUtilizationRequest(BaseModel):
    """プロジェクト稼働率リクエストスキーマ"""
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
