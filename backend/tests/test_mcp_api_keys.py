"""Tests for MCP API key helpers and app wiring."""
import hashlib

from fastapi.testclient import TestClient

from app.main import app
from app.services.mcp_api_key_service import API_KEY_PREFIX, McpApiKeyService


def test_api_key_prefix_constant():
    assert API_KEY_PREFIX == "fl_live_"


def test_mask_suffix():
    key = f"{API_KEY_PREFIX}abcdefghijklmnopqrstuvwxyz"
    assert McpApiKeyService.mask_suffix(key) == "wxyz"


def test_hash_key_helper():
    key = f"{API_KEY_PREFIX}test"
    expected = hashlib.sha256(key.encode("utf-8")).hexdigest()
    from app.services import mcp_api_key_service

    assert mcp_api_key_service._hash_key(key) == expected


def test_mcp_mount_exists():
    client = TestClient(app)
    response = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
    assert response.status_code != 404
