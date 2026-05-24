"""Tests for quick notes API."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_quick_notes_requires_auth():
    response = client.get("/api/v1/quick-notes")
    assert response.status_code == 401


def test_create_quick_note_requires_auth():
    response = client.post("/api/v1/quick-notes", json={"content": "hello"})
    assert response.status_code == 401


def test_list_quick_notes_invalid_date_range_requires_auth():
    response = client.get(
        "/api/v1/quick-notes",
        params={"date_from": "2026-05-10", "date_to": "2026-05-01"},
    )
    assert response.status_code == 401
