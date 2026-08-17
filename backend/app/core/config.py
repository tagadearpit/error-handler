"""
Application configuration loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Central configuration — reads from .env or environment."""

    # ── Database ──
    DATABASE_URL: str = "postgresql+asyncpg://helpdesk:helpdesk_pass@localhost:5432/helpdesk_db"

    # ── Google Gemini ──
    GEMINI_API_KEY: str = ""
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    GEMINI_CHAT_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_DIMENSION: int = 768

    # ── Retrieval ──
    RETRIEVAL_SIMILARITY_THRESHOLD: float = 0.35

    # ── JWT ──
    JWT_SECRET: str = "change-me-to-a-strong-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    # ── Server ──
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ── File Upload ──
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
