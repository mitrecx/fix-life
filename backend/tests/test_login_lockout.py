"""Tests for login lockout helpers."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.core.login_lockout import (
    MAX_FAILED_LOGIN_ATTEMPTS,
    AccountLockedError,
    InvalidCredentialsError,
    is_login_locked,
    lock_remaining_minutes,
    normalize_lock_state,
    record_failed_login,
    reset_login_attempts,
)


def _user(*, attempts: int = 0, locked_until=None):
    user = MagicMock()
    user.failed_login_attempts = attempts
    user.locked_until = locked_until
    user.is_active = True
    user.hashed_password = "hashed"
    return user


def test_is_login_locked_when_future_lock():
    now = datetime(2026, 5, 24, 12, 0, tzinfo=timezone.utc)
    user = _user(locked_until=now + timedelta(minutes=30))
    assert is_login_locked(user, now) is True


def test_normalize_lock_state_clears_expired_lock():
    now = datetime(2026, 5, 24, 12, 0, tzinfo=timezone.utc)
    user = _user(attempts=5, locked_until=now - timedelta(minutes=1))
    db = MagicMock()
    normalize_lock_state(user, db, now)
    assert user.failed_login_attempts == 0
    assert user.locked_until is None
    db.commit.assert_called_once()


def test_record_failed_login_locks_after_max_attempts():
    user = _user(attempts=MAX_FAILED_LOGIN_ATTEMPTS - 1)
    db = MagicMock()
    now = datetime(2026, 5, 24, 12, 0, tzinfo=timezone.utc)
    locked = record_failed_login(user, db, now)
    assert locked is True
    assert user.failed_login_attempts == MAX_FAILED_LOGIN_ATTEMPTS
    assert user.locked_until == now + timedelta(minutes=60)


def test_lock_remaining_minutes_rounds_up():
    now = datetime(2026, 5, 24, 12, 0, tzinfo=timezone.utc)
    user = _user(locked_until=now + timedelta(seconds=61))
    assert lock_remaining_minutes(user, now) == 2


def test_reset_login_attempts_clears_fields():
    user = _user(attempts=3, locked_until=datetime.now(timezone.utc))
    db = MagicMock()
    reset_login_attempts(user, db)
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_account_locked_error_carries_minutes():
    err = AccountLockedError(42)
    assert err.minutes_remaining == 42


def test_invalid_credentials_error_is_login_error():
    assert isinstance(InvalidCredentialsError(), Exception)
