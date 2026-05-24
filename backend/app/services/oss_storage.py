"""Aliyun OSS storage for user-uploaded files."""
from __future__ import annotations

import uuid
from typing import Final

import oss2

from app.core.config import settings
from app.services.media_token import create_media_token

ALLOWED_IMAGE_TYPES: Final[dict[str, str]] = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}

MAX_QUICK_NOTE_IMAGE_SIZE: Final[int] = 5 * 1024 * 1024


class OssStorageError(Exception):
    """Raised when OSS is unavailable or upload fails."""


class OssStorageService:
    def __init__(self) -> None:
        if not settings.OSS_ENABLED:
            raise OssStorageError("OSS is not enabled")
        if not all(
            [
                settings.OSS_ACCESS_KEY_ID,
                settings.OSS_ACCESS_KEY_SECRET,
                settings.OSS_BUCKET,
                settings.OSS_ENDPOINT,
            ]
        ):
            raise OssStorageError("OSS configuration is incomplete")

        auth = oss2.Auth(settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET)
        self._bucket = oss2.Bucket(
            auth,
            f"https://{settings.OSS_ENDPOINT}",
            settings.OSS_BUCKET,
        )
        self._prefix = settings.OSS_PREFIX.strip("/")

    @classmethod
    def from_settings(cls) -> OssStorageService:
        return cls()

    def build_public_url(self, object_key: str) -> str:
        base = settings.OSS_PUBLIC_BASE_URL.strip().rstrip("/")
        if base:
            return f"{base}/{object_key}"
        return f"https://{settings.OSS_BUCKET}.{settings.OSS_ENDPOINT}/{object_key}"

    def build_access_url(self, object_key: str) -> str:
        token = create_media_token(object_key)
        api_base = settings.FRONTEND_URL.rstrip("/")
        return f"{api_base}/api/v1/quick-notes/media/{token}"

    def get_object(self, object_key: str) -> tuple[bytes, str]:
        try:
            result = self._bucket.get_object(object_key)
            content = result.read()
            content_type = result.headers.get("Content-Type") or "application/octet-stream"
        except oss2.exceptions.OssError as exc:
            raise OssStorageError(str(exc)) from exc
        return content, content_type

    def upload_quick_note_image(self, user_id: uuid.UUID, content: bytes, content_type: str) -> str:
        extension = ALLOWED_IMAGE_TYPES.get(content_type)
        if extension is None:
            raise ValueError("unsupported content type")

        object_key = f"{self._prefix}/quick-notes/{user_id}/{uuid.uuid4()}.{extension}"
        headers = {"Content-Type": content_type}
        try:
            result = self._bucket.put_object(object_key, content, headers=headers)
        except oss2.exceptions.OssError as exc:
            raise OssStorageError(str(exc)) from exc
        if result.status // 100 != 2:
            raise OssStorageError(f"OSS upload failed with status {result.status}")
        return self.build_access_url(object_key)
