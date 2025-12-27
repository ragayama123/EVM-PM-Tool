from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""

    APP_NAME: str = "EVM Project Manager"
    DEBUG: bool = True

    # データベース
    DATABASE_URL: str = "sqlite:///./evm.db"

    # JWT認証（レガシー、Supabase移行後は不要）
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Supabase設定
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # CORS設定（カンマ区切りで複数指定可能）
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://wbs-evm-frontend.fly.dev"

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> list[str]:
        """CORS許可オリジンのリストを取得"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
