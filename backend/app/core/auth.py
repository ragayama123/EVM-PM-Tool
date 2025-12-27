from typing import Optional
import logging
import urllib.request
import json

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.allowlist import AllowedEmail

logger = logging.getLogger(__name__)

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

# JWKSクライアントをキャッシュ
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> PyJWKClient:
    """SupabaseのJWKSクライアントを取得（キャッシュ付き）"""
    global _jwks_client
    if _jwks_client is None:
        if not settings.SUPABASE_URL:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_URL が設定されていません",
            )
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def verify_supabase_token(token: str) -> dict:
    """SupabaseのJWTトークンを検証（JWKS使用）"""
    try:
        # JWKSから公開鍵を取得してES256で検証
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        logger.info(f"Token verified for email: {payload.get('email')}")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンの有効期限が切れています",
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"無効なトークンです: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"トークン検証エラー: {str(e)}",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """現在のユーザーを取得（許可リストチェック含む）"""
    token = credentials.credentials
    payload = verify_supabase_token(token)

    email = payload.get("email")
    supabase_uid = payload.get("sub")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンにメールアドレスが含まれていません",
        )

    # 許可リストチェック
    allowed = (
        db.query(AllowedEmail)
        .filter(
            AllowedEmail.email == email.lower(),
            AllowedEmail.is_active == True,
        )
        .first()
    )

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このメールアドレスは許可されていません",
        )

    # ユーザーの取得または作成
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            supabase_uid=supabase_uid,
            name=email.split("@")[0],  # メールアドレスの@前をデフォルト名に
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.supabase_uid:
        # 既存ユーザーにSupabase UIDを紐付け
        user.supabase_uid = supabase_uid
        db.commit()
        db.refresh(user)

    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """認証が必須でないエンドポイント用"""
    if not credentials:
        return None
    return get_current_user(credentials, db)
