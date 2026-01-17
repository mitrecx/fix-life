from app.db.session import engine
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
