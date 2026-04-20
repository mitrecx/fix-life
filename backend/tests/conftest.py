"""Pytest fixtures for Fix Life API tests."""
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def client_authenticated() -> TestClient:
    uid = uuid4()

    async def fake_current_user():
        user = MagicMock()
        user.id = uid
        user.is_active = True
        return user

    app.dependency_overrides[get_current_user] = fake_current_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
