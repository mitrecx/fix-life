from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,           # 检查连接是否有效
    pool_size=10,                  # 连接池大小
    max_overflow=20,               # 最大溢出连接数
    pool_recycle=3600,             # 1小时后回收连接（防止服务器关闭连接）
    pool_timeout=30,               # 获取连接的超时时间（秒）
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
