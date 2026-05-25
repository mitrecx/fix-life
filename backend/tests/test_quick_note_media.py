"""Tests for quick note OSS cleanup helpers."""
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.services.media_token import create_media_token
from app.services.quick_note_media import (
    cleanup_orphaned_quick_note_images,
    extract_media_tokens,
)


def test_extract_media_tokens_from_markdown_and_absolute_urls():
    token = create_media_token("fix-life/quick-notes/user/test.png", ttl_seconds=3600)
    content = (
        f"![图片](https://fixlife.mitrecx.top/api/v1/quick-notes/media/{token})\n"
        f"see /api/v1/quick-notes/media/{token}"
    )
    assert extract_media_tokens(content) == {token}


@patch("app.services.quick_note_media.settings")
@patch("app.services.quick_note_media.OssStorageService")
def test_cleanup_deletes_orphaned_images(mock_storage_cls, mock_settings):
    user_id = uuid4()
    object_key = f"fix-life/quick-notes/{user_id}/photo.png"
    token = create_media_token(object_key, ttl_seconds=3600)
    deleted_content = f"![图片](/api/v1/quick-notes/media/{token})"

    mock_settings.OSS_ENABLED = True
    mock_settings.OSS_PREFIX = "fix-life"
    mock_storage = MagicMock()
    mock_storage_cls.from_settings.return_value = mock_storage

    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = []

    cleanup_orphaned_quick_note_images(
        db,
        user_id,
        [deleted_content],
        deleted_note_ids={uuid4()},
    )

    mock_storage.delete_object.assert_called_once_with(object_key)


@patch("app.services.quick_note_media.settings")
@patch("app.services.quick_note_media.OssStorageService")
def test_cleanup_skips_images_still_referenced(mock_storage_cls, mock_settings):
    user_id = uuid4()
    object_key = f"fix-life/quick-notes/{user_id}/photo.png"
    token = create_media_token(object_key, ttl_seconds=3600)
    deleted_content = f"![图片](/api/v1/quick-notes/media/{token})"
    remaining_content = f"still here /api/v1/quick-notes/media/{token}"

    mock_settings.OSS_ENABLED = True
    mock_settings.OSS_PREFIX = "fix-life"
    mock_storage = MagicMock()
    mock_storage_cls.from_settings.return_value = mock_storage

    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [(remaining_content,)]

    cleanup_orphaned_quick_note_images(
        db,
        user_id,
        [deleted_content],
        deleted_note_ids={uuid4()},
    )

    mock_storage.delete_object.assert_not_called()


@patch("app.services.quick_note_media.settings")
@patch("app.services.quick_note_media.OssStorageService")
def test_cleanup_refuses_foreign_object_keys(mock_storage_cls, mock_settings):
    user_id = uuid4()
    foreign_key = f"fix-life/quick-notes/{uuid4()}/photo.png"
    token = create_media_token(foreign_key, ttl_seconds=3600)
    deleted_content = f"![图片](/api/v1/quick-notes/media/{token})"

    mock_settings.OSS_ENABLED = True
    mock_settings.OSS_PREFIX = "fix-life"
    mock_storage = MagicMock()
    mock_storage_cls.from_settings.return_value = mock_storage

    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = []

    cleanup_orphaned_quick_note_images(
        db,
        user_id,
        [deleted_content],
        deleted_note_ids={uuid4()},
    )

    mock_storage.delete_object.assert_not_called()


@patch("app.services.quick_note_media.settings")
def test_cleanup_noop_when_oss_disabled(mock_settings):
    mock_settings.OSS_ENABLED = False
    db = MagicMock()

    cleanup_orphaned_quick_note_images(
        db,
        uuid4(),
        ["![图片](/api/v1/quick-notes/media/abc)"],
        deleted_note_ids={uuid4()},
    )

    db.query.assert_not_called()
