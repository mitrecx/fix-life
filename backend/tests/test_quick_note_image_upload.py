"""Tests for quick note image upload."""
from io import BytesIO
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services.oss_storage import OssStorageService


@pytest.fixture
def grant_quick_note_upload(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: ["quick_notes:upload_image"],
    )


def test_upload_quick_note_image_requires_auth(client: TestClient):
    response = client.post(
        "/api/v1/quick-notes/upload-image",
        files={"file": ("test.png", b"fake", "image/png")},
    )
    assert response.status_code == 401


def test_upload_quick_note_image_when_oss_disabled(
    client_authenticated: TestClient, monkeypatch, grant_quick_note_upload
):
    monkeypatch.setattr(settings, "OSS_ENABLED", False)
    response = client_authenticated.post(
        "/api/v1/quick-notes/upload-image",
        files={"file": ("test.png", b"fake", "image/png")},
    )
    assert response.status_code == 503


def test_upload_quick_note_image_rejects_invalid_type(
    client_authenticated: TestClient,
    monkeypatch,
    grant_quick_note_upload,
):
    monkeypatch.setattr(settings, "OSS_ENABLED", True)
    response = client_authenticated.post(
        "/api/v1/quick-notes/upload-image",
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400


def test_upload_quick_note_image_success(
    client_authenticated: TestClient, monkeypatch, grant_quick_note_upload
):
    monkeypatch.setattr(settings, "OSS_ENABLED", True)

    fake_storage = MagicMock()
    fake_storage.upload_quick_note_image.return_value = (
        "https://fixlife.mitrecx.top/api/v1/quick-notes/media/test-token"
    )
    monkeypatch.setattr(OssStorageService, "from_settings", classmethod(lambda cls: fake_storage))

    response = client_authenticated.post(
        "/api/v1/quick-notes/upload-image",
        files={"file": ("test.png", BytesIO(b"fakepng"), "image/png")},
    )
    assert response.status_code == 200
    assert "/api/v1/quick-notes/media/" in response.json()["url"]
    fake_storage.upload_quick_note_image.assert_called_once()
