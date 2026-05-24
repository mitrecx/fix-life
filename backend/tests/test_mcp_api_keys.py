"""Tests for MCP API key helpers and app wiring."""
import hashlib
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.secret_encryption import decrypt_secret, encrypt_secret
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


def test_secret_encryption_roundtrip():
    plaintext = f"{API_KEY_PREFIX}roundtrip-secret"
    ciphertext = encrypt_secret(plaintext)
    assert ciphertext != plaintext
    assert decrypt_secret(ciphertext) == plaintext


def test_mcp_mount_exists():
    client = TestClient(app)
    response = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
    assert response.status_code != 404


def test_reveal_mcp_key_requires_auth():
    client = TestClient(app)
    response = client.get(f"/api/v1/system-settings/mcp-keys/{uuid4()}/secret")
    assert response.status_code == 401
