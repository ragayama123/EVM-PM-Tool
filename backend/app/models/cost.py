from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class CostType(str, enum.Enum):
    """コスト種別"""
    LABOR = "labor"          # 人件費
    MATERIAL = "material"    # 資材費
    EQUIPMENT = "equipment"  # 設備費
    OTHER = "other"          # その他


class Cost(Base):
    """コストモデル"""

    __tablename__ = "costs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    cost_type = Column(Enum(CostType), default=CostType.LABOR)
    description = Column(String, nullable=True)

    planned_amount = Column(Float, nullable=False, default=0)
    actual_amount = Column(Float, nullable=False, default=0)
    date = Column(DateTime(timezone=True), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    project = relationship("Project", back_populates="costs")
