"""Tests for quick notes permission gating."""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_list_quick_notes_ok_when_authenticated(monkeypatch, client_authenticated):
    class MockQuickNoteService:
        def __init__(self, _db):
            pass

        def list_notes(self, user_id, **kwargs):
            return [], 0

        def to_response(self, note):
            raise NotImplementedError

    monkeypatch.setattr(
        "app.api.v1.endpoints.quick_notes.QuickNoteService",
        MockQuickNoteService,
    )
    response = client_authenticated.get("/api/v1/quick-notes")
    assert response.status_code == 200
    assert response.json() == {"notes": [], "total": 0}


def test_upload_quick_note_image_forbidden_without_permission(
    monkeypatch, client_authenticated: TestClient
):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: [],
    )
    monkeypatch.setattr(settings, "OSS_ENABLED", True)
    response = client_authenticated.post(
        "/api/v1/quick-notes/upload-image",
        files={"file": ("test.png", b"fake", "image/png")},
    )
    assert response.status_code == 403
