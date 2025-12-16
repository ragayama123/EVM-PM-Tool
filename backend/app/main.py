from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api import projects, tasks, evm, members, holidays

# データベーステーブルを作成
Base.metadata.create_all(bind=engine)

# FastAPIアプリケーション
app = FastAPI(
    title=settings.APP_NAME,
    description="EVM（アーンドバリューマネジメント）プロジェクト管理ツール API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(projects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(evm.router, prefix="/api")
app.include_router(members.router, prefix="/api")
app.include_router(holidays.router, prefix="/api")


@app.get("/")
def root():
    """ヘルスチェック"""
    return {"message": "EVM Project Manager API", "status": "running"}


@app.get("/health")
def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "healthy"}
