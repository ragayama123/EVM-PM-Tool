from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    """プロジェクトステータス"""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Project(Base):
    """プロジェクトモデル"""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    budget = Column(Float, nullable=False, default=0)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PLANNING)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    manager = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    members = relationship("Member", back_populates="project", cascade="all, delete-orphan")
    costs = relationship("Cost", back_populates="project", cascade="all, delete-orphan")
    evm_snapshots = relationship("EVMSnapshot", back_populates="project", cascade="all, delete-orphan")
    holidays = relationship("Holiday", back_populates="project", cascade="all, delete-orphan")
