from pydantic_settings import BaseSettings
from typing import List
import json


def parse_cors_origins(v: str | List[str]) -> List[str]:
    """Parse CORS origins from string or list."""
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        try:
            return json.loads(v)
        except json.JSONDecodeError:
            # If JSON parsing fails, split by comma
            return [origin.strip() for origin in v.split(",")]
    return ["http://localhost:5173"]


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://josie:bills_password_2024@localhost:5432/fix_life_db"

    # JWT
    SECRET_KEY: str = "fix-life-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174"]

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse CORS_ORIGINS if it's a string
        if isinstance(self.CORS_ORIGINS, str):
            self.CORS_ORIGINS = parse_cors_origins(self.CORS_ORIGINS)


settings = Settings()
