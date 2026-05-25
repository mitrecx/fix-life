"""Tests for quick notes permission gating."""
from fastapi.testclient import TestClient


def test_list_quick_notes_forbidden_without_permission(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: [],
    )
    response = client_authenticated.get("/api/v1/quick-notes")
    assert response.status_code == 403


def test_list_quick_notes_ok_with_permission(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: ["quick_notes:use"],
    )

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
