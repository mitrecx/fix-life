"""Parse and clean up quick-note image references stored in OSS."""
from __future__ import annotations

import logging
import re
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.quick_note import QuickNote
from app.services.media_token import verify_media_token
from app.services.oss_storage import OssStorageError, OssStorageService

logger = logging.getLogger(__name__)

MEDIA_TOKEN_RE = re.compile(r"/quick-notes/media/([A-Za-z0-9_-]+)")


def extract_media_tokens(content: str) -> set[str]:
    return set(MEDIA_TOKEN_RE.findall(content))


def _user_quick_note_prefix(user_id: UUID) -> str:
    prefix = settings.OSS_PREFIX.strip("/")
    return f"{prefix}/quick-notes/{user_id}/"


def cleanup_orphaned_quick_note_images(
    db: Session,
    user_id: UUID,
    deleted_contents: list[str],
    *,
    deleted_note_ids: set[UUID],
) -> None:
    if not settings.OSS_ENABLED or not deleted_contents:
        return

    candidate_tokens: set[str] = set()
    for content in deleted_contents:
        candidate_tokens.update(extract_media_tokens(content))
    if not candidate_tokens:
        return

    remaining_rows = (
        db.query(QuickNote.content)
        .filter(QuickNote.user_id == user_id, QuickNote.id.notin_(deleted_note_ids))
        .all()
    )
    remaining_blob = "\n".join(row[0] for row in remaining_rows)
    orphaned_tokens = {token for token in candidate_tokens if token not in remaining_blob}
    if not orphaned_tokens:
        return

    try:
        storage = OssStorageService.from_settings()
    except OssStorageError:
        logger.warning("Skipping quick-note OSS cleanup because storage is unavailable")
        return

    expected_prefix = _user_quick_note_prefix(user_id)
    for token in orphaned_tokens:
        try:
            object_key = verify_media_token(token)
        except ValueError:
            continue
        if not object_key.startswith(expected_prefix):
            logger.warning("Refusing to delete quick-note object outside user prefix: %s", object_key)
            continue
        try:
            storage.delete_object(object_key)
        except OssStorageError:
            logger.exception("Failed to delete quick-note OSS object: %s", object_key)
