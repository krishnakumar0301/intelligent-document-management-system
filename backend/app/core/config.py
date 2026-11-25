"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "FileOracle"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "fileoracle-dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    DATABASE_URL: str = "sqlite+aiosqlite:///./data/fileoracle.db"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    DEFAULT_SCAN_PATH: str = ""
    MAX_UPLOAD_SIZE_MB: int = 100
    WATCHER_ENABLED: bool = True

    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/fileoracle.log"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
