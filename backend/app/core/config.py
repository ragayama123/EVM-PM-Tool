from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""

    APP_NAME: str = "EVM Project Manager"
    DEBUG: bool = True

    # データベース
    DATABASE_URL: str = "sqlite:///./evm.db"

    # JWT認証
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
