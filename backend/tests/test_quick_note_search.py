"""Tests for quick note list search."""

from unittest.mock import MagicMock
from uuid import uuid4

from app.services.quick_note_service import QuickNoteService, _escape_ilike


def test_escape_ilike_escapes_wildcards():
    assert _escape_ilike("100%") == "100\\%"
    assert _escape_ilike("a_b") == "a\\_b"
    assert _escape_ilike("a\\b") == "a\\\\b"


def test_list_notes_skips_blank_search_term():
    db = MagicMock()
    query = MagicMock()
    db.query.return_value = query
    query.filter.return_value = query
    query.count.return_value = 0
    query.order_by.return_value = query
    query.offset.return_value = query
    query.limit.return_value = query
    query.all.return_value = []

    service = QuickNoteService(db)
    service.list_notes(uuid4(), q="   ")

    assert query.filter.call_count == 1


def test_list_notes_applies_search_filter():
    db = MagicMock()
    query = MagicMock()
    db.query.return_value = query
    query.filter.return_value = query
    query.count.return_value = 0
    query.order_by.return_value = query
    query.offset.return_value = query
    query.limit.return_value = query
    query.all.return_value = []

    service = QuickNoteService(db)
    service.list_notes(uuid4(), q="hello")

    assert query.filter.call_count == 2
