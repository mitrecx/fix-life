"""Tests for RBAC permission loading."""
from unittest.mock import MagicMock
from uuid import uuid4

from app.services.rbac_service import get_permission_codes_for_user


def test_get_permission_codes_for_user_sorts_and_dedupes():
    db = MagicMock()
    uid = uuid4()
    # scalars().all() chain as used by SQLAlchemy 2 execute().scalars().all()
    db.execute.return_value.scalars.return_value.all.return_value = [
        "b_perm",
        "a_perm",
        "a_perm",
    ]

    codes = get_permission_codes_for_user(db, uid)

    assert codes == ["a_perm", "b_perm"]
    db.execute.assert_called_once()
