from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.allowlist import AllowedEmail
from app.schemas.auth import (
    AllowedEmailCreate,
    AllowedEmailResponse,
    UserResponse,
    VerifyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/verify", response_model=VerifyResponse)
def verify_token(current_user: User = Depends(get_current_user)):
    """トークンを検証し、ユーザー情報を返す"""
    return VerifyResponse(
        message="認証成功",
        user=UserResponse.model_validate(current_user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """現在のユーザー情報を取得"""
    return current_user


# --- 許可リスト管理 ---


@router.get("/allowlist", response_model=List[AllowedEmailResponse])
def get_allowlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """許可リストを取得"""
    return db.query(AllowedEmail).order_by(AllowedEmail.created_at.desc()).all()


@router.post("/allowlist", response_model=AllowedEmailResponse)
def add_to_allowlist(
    data: AllowedEmailCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """許可リストにメールアドレスを追加"""
    email_lower = data.email.lower()

    existing = (
        db.query(AllowedEmail).filter(AllowedEmail.email == email_lower).first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="既に登録されています")

    allowed = AllowedEmail(
        email=email_lower,
        created_by=current_user.email,
    )
    db.add(allowed)
    db.commit()
    db.refresh(allowed)
    return allowed


@router.delete("/allowlist/{email_id}")
def remove_from_allowlist(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """許可リストからメールアドレスを削除"""
    allowed = db.query(AllowedEmail).filter(AllowedEmail.id == email_id).first()
    if not allowed:
        raise HTTPException(status_code=404, detail="見つかりません")

    db.delete(allowed)
    db.commit()
    return {"message": "削除しました"}
