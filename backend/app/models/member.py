from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Member(Base):
    """メンバーモデル"""

    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    available_hours_per_week = Column(Float, nullable=False, default=40)  # 週あたり稼働可能時間
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    project = relationship("Project", back_populates="members")
    assigned_tasks = relationship("Task", back_populates="assigned_member")
    skills = relationship("MemberSkill", back_populates="member", cascade="all, delete-orphan")
