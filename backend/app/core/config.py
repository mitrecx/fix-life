from pydantic_settings import BaseSettings, SettingsConfigDict
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
    return ["http://localhost:5277"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # Database
    DATABASE_URL: str = "postgresql://josie:bills_password_2024@localhost:6432/fix_life_db"

    # JWT
    SECRET_KEY: str = "fix-life-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5277", "http://localhost:5174"]

    # Email / SMTP
    # 163 邮箱配置: smtp.163.com:465 (SSL) 或 smtp.163.com:994 (SSL)
    SMTP_HOST: str = "smtp.163.com"
    SMTP_PORT: int = 465  # 163 使用 SSL 端口 465
    SMTP_USER: str = ""  # 从 .env 文件读取
    SMTP_PASSWORD: str = ""  # 从 .env 文件读取
    SMTP_FROM: str = ""  # 从 .env 文件读取
    SMTP_USE_TLS: bool = False  # STARTTLS (如 Gmail 端口 587)
    SMTP_USE_SSL: bool = True  # SSL (如 163 端口 465)

    # Verification Code
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 10  # 10 minutes

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_RESULT_DB: int = 1

    # IP rate limit (middleware; decoupled from auth business logic)
    IP_RATE_LIMIT_ENABLED: bool = True
    IP_RATE_LIMIT_USE_REDIS: bool = True
    IP_RATE_LIMIT_MAX_REQUESTS: int = 60
    IP_RATE_LIMIT_WINDOW_SECONDS: int = 3600
    IP_RATE_LIMIT_BAN_SECONDS: int = 3600
    IP_RATE_LIMIT_REDIS_URL: str = ""
    IP_RATE_LIMIT_REDIS_KEY_PREFIX: str = "fixlife:ip_rl"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # GitHub (optional, for MCP GitHub issue todo skill)
    GITHUB_TOKEN: str = ""
    GITHUB_DEFAULT_OWNER: str = ""

    # Frontend
    FRONTEND_URL: str = "http://localhost:5277"

    # Aliyun OSS (optional; required for quick-note image uploads)
    OSS_ENABLED: bool = False
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_BUCKET: str = ""
    OSS_ENDPOINT: str = ""  # e.g. oss-cn-shanghai.aliyuncs.com
    OSS_REGION: str = "cn-shanghai"
    OSS_PREFIX: str = "fix-life"
    OSS_PUBLIC_BASE_URL: str = ""  # optional CDN/custom domain, e.g. https://cdn.example.com

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse CORS_ORIGINS if it's a string
        if isinstance(self.CORS_ORIGINS, str):
            self.CORS_ORIGINS = parse_cors_origins(self.CORS_ORIGINS)
        if not self.IP_RATE_LIMIT_REDIS_URL:
            self.IP_RATE_LIMIT_REDIS_URL = (
                f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
            )


settings = Settings()
