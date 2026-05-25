"""Tests for quick note delete APIs."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_delete_quick_note_requires_auth():
    response = client.delete("/api/v1/quick-notes/00000000-0000-0000-0000-000000000001")
    assert response.status_code == 401


def test_batch_delete_quick_notes_requires_auth():
    response = client.post(
        "/api/v1/quick-notes/batch-delete",
        json={"ids": ["00000000-0000-0000-0000-000000000001"]},
    )
    assert response.status_code == 401


def test_batch_merge_quick_notes_requires_auth():
    response = client.post(
        "/api/v1/quick-notes/batch-merge",
        json={
            "ids": [
                "00000000-0000-0000-0000-000000000001",
                "00000000-0000-0000-0000-000000000002",
            ]
        },
    )
    assert response.status_code == 401
