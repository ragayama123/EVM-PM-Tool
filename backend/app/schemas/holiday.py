from datetime import date
from typing import Optional, List
from pydantic import BaseModel

from app.models.holiday import HolidayType


class HolidayBase(BaseModel):
    """休日ベーススキーマ"""
    date: date
    name: str
    holiday_type: HolidayType = HolidayType.CUSTOM


class HolidayCreate(HolidayBase):
    """休日作成スキーマ"""
    project_id: int


class HolidayUpdate(BaseModel):
    """休日更新スキーマ"""
    name: Optional[str] = None
    holiday_type: Optional[HolidayType] = None


class HolidayResponse(HolidayBase):
    """休日レスポンススキーマ"""
    id: int
    project_id: int

    class Config:
        from_attributes = True


class HolidayImportItem(BaseModel):
    """インポート用の休日アイテム"""
    date: date
    name: str
    holiday_type: HolidayType = HolidayType.CUSTOM


class HolidayImportRequest(BaseModel):
    """休日一括インポートリクエスト"""
    holidays: List[HolidayImportItem]
    overwrite: bool = False  # 既存の休日を上書きするか


class HolidayGenerateRequest(BaseModel):
    """週末・祝日自動生成リクエスト"""
    start_date: date
    end_date: date
    include_weekends: bool = True
    include_national_holidays: bool = True
