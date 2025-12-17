from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Task(Base):
    """タスクモデル（WBS階層構造対応）"""

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    predecessor_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)  # 先行タスク
    assigned_member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # 工数・進捗
    planned_hours = Column(Float, nullable=False, default=0)
    actual_hours = Column(Float, nullable=False, default=0)
    progress = Column(Float, nullable=False, default=0)  # 0-100%

    # 単価（時間あたりコスト）
    hourly_rate = Column(Float, nullable=False, default=0)

    # マイルストーン（固定日付タスク - リスケジュール対象外）
    is_milestone = Column(Boolean, nullable=False, default=False)

    # タスク種別（フェーズ）
    task_type = Column(String, nullable=True)

    # 予定スケジュール
    planned_start_date = Column(DateTime(timezone=True), nullable=True)
    planned_end_date = Column(DateTime(timezone=True), nullable=True)

    # 実績スケジュール
    actual_start_date = Column(DateTime(timezone=True), nullable=True)
    actual_end_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    project = relationship("Project", back_populates="tasks")
    parent = relationship("Task", remote_side=[id], foreign_keys=[parent_id], backref="children")
    predecessor = relationship("Task", remote_side=[id], foreign_keys=[predecessor_id], backref="successors")
    assigned_member = relationship("Member", back_populates="assigned_tasks")
