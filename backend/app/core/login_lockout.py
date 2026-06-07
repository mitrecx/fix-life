"""Login attempt tracking and temporary account lockout."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 60


class LoginError(Exception):
    """Base login failure."""


class InvalidCredentialsError(LoginError):
    """Email/username or password is incorrect."""


class AccountLockedError(LoginError):
    """Account is temporarily locked after too many failed attempts."""

    def __init__(self, minutes_remaining: int):
        self.minutes_remaining = minutes_remaining
        super().__init__(f"locked for {minutes_remaining} minutes")


def get_user_by_login_identifier(db: Session, login_identifier: str) -> Optional[User]:
    if "@" in login_identifier:
        return db.query(User).filter(User.email == login_identifier).first()
    return db.query(User).filter(User.username == login_identifier).first()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_lock_state(user: User, db: Session, now: Optional[datetime] = None) -> None:
    now = now or utcnow()
    if user.locked_until is not None and user.locked_until <= now:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()


def is_login_locked(user: User, now: Optional[datetime] = None) -> bool:
    now = now or utcnow()
    return user.locked_until is not None and user.locked_until > now


def lock_remaining_minutes(user: User, now: Optional[datetime] = None) -> int:
    now = now or utcnow()
    if user.locked_until is None or user.locked_until <= now:
        return 0
    delta = user.locked_until - now
    return max(1, int((delta.total_seconds() + 59) // 60))


def record_failed_login(user: User, db: Session, now: Optional[datetime] = None) -> bool:
    """Increment failed attempts. Returns True if the account was just locked."""
    now = now or utcnow()
    user.failed_login_attempts += 1
    locked = False
    if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
        user.locked_until = now + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
        locked = True
    db.commit()
    return locked


def reset_login_attempts(user: User, db: Session) -> None:
    if user.failed_login_attempts == 0 and user.locked_until is None:
        return
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()


def attempt_login(db: Session, login_identifier: str, password: str) -> User:
    user = get_user_by_login_identifier(db, login_identifier)
    if not user:
        raise InvalidCredentialsError()

    normalize_lock_state(user, db)

    if is_login_locked(user):
        raise AccountLockedError(lock_remaining_minutes(user))

    if not user.hashed_password or not verify_password(password, user.hashed_password):
        just_locked = record_failed_login(user, db)
        if just_locked:
            raise AccountLockedError(LOGIN_LOCKOUT_MINUTES)
        raise InvalidCredentialsError()

    if not user.is_active:
        raise InvalidCredentialsError()

    reset_login_attempts(user, db)
    return user
