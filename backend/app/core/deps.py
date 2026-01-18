from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import SessionLocal

security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class MockUser:
    """Mock user for MVP development."""
    def __init__(self):
        self.id = "00000000-0000-0000-0000-000000000001"
        self.username = "josie"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> MockUser:
    """
    Get current user from JWT token.
    For MVP, return a mock user. Implement proper JWT validation later.
    """
    # TODO: Implement proper JWT validation
    # For now, return a mock user with a valid UUID
    return MockUser()
