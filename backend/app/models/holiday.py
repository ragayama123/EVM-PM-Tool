from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class HolidayType(str, enum.Enum):
    """休日タイプ"""
    WEEKEND = "weekend"           # 土日
    NATIONAL = "national"         # 国民の祝日
    COMPANY = "company"           # 会社休日
    CUSTOM = "custom"             # カスタム休日


class Holiday(Base):
    """休日カレンダーモデル"""

    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    name = Column(String, nullable=False)
    holiday_type = Column(Enum(HolidayType), default=HolidayType.CUSTOM)

    # リレーション
    project = relationship("Project", back_populates="holidays")

    # 同じプロジェクト内で同じ日付の休日は1つだけ
    __table_args__ = (
        UniqueConstraint('project_id', 'date', name='uq_project_holiday_date'),
    )
