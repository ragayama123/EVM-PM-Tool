from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class EVMMetrics(BaseModel):
    """EVM指標スキーマ"""
    date: datetime
    pv: float  # Planned Value
    ev: float  # Earned Value
    ac: float  # Actual Cost
    sv: float  # Schedule Variance
    cv: float  # Cost Variance
    spi: float  # Schedule Performance Index
    cpi: float  # Cost Performance Index
    bac: float  # Budget at Completion
    etc: float  # Estimate to Complete
    eac: float  # Estimate at Completion


class EVMSnapshotResponse(BaseModel):
    """EVMスナップショットレスポンススキーマ"""
    id: int
    project_id: int
    date: datetime
    pv: float
    ev: float
    ac: float
    sv: float
    cv: float
    spi: float
    cpi: float
    eac: Optional[float] = None
    etc: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
