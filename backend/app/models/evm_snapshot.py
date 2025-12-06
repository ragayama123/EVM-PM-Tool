from sqlalchemy import Column, Integer, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class EVMSnapshot(Base):
    """EVM指標スナップショットモデル"""

    __tablename__ = "evm_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)

    # EVM基本指標
    pv = Column(Float, nullable=False, default=0)  # Planned Value（計画価値）
    ev = Column(Float, nullable=False, default=0)  # Earned Value（出来高）
    ac = Column(Float, nullable=False, default=0)  # Actual Cost（実コスト）

    # EVM差異指標
    sv = Column(Float, nullable=False, default=0)  # Schedule Variance（SV = EV - PV）
    cv = Column(Float, nullable=False, default=0)  # Cost Variance（CV = EV - AC）

    # EVM効率指標
    spi = Column(Float, nullable=False, default=0)  # Schedule Performance Index（SPI = EV / PV）
    cpi = Column(Float, nullable=False, default=0)  # Cost Performance Index（CPI = EV / AC）

    # 予測指標
    eac = Column(Float, nullable=True)  # Estimate at Completion
    etc = Column(Float, nullable=True)  # Estimate to Complete

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    project = relationship("Project", back_populates="evm_snapshots")
