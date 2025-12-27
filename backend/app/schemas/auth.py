from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AllowedEmailCreate(BaseModel):
    """許可リスト追加リクエスト"""

    email: EmailStr


class AllowedEmailResponse(BaseModel):
    """許可リストレスポンス"""

    id: int
    email: str
    is_active: bool
    created_at: datetime
    created_by: Optional[str]

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """ユーザーレスポンス"""

    id: int
    email: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VerifyResponse(BaseModel):
    """トークン検証レスポンス"""

    message: str
    user: UserResponse
