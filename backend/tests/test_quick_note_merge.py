"""Tests for quick note merge content formatting."""
from types import SimpleNamespace

from app.services.quick_note_service import MERGE_BLOCK_SEPARATOR, QuickNoteService


def _note(content: str) -> SimpleNamespace:
    return SimpleNamespace(content=content)


def test_merge_note_contents_joins_blocks_with_blank_line():
    notes = [_note("第一段"), _note("第二段"), _note("第三段")]
    merged = QuickNoteService._merge_note_contents(notes)
    assert merged == f"第一段{MERGE_BLOCK_SEPARATOR}第二段{MERGE_BLOCK_SEPARATOR}第三段"


def test_merge_note_contents_preserves_internal_blank_lines():
    notes = [_note("标题\n\n正文"), _note("下一条")]
    merged = QuickNoteService._merge_note_contents(notes)
    assert merged == f"标题\n\n正文{MERGE_BLOCK_SEPARATOR}下一条"


def test_merge_note_contents_normalizes_windows_line_endings():
    notes = [_note("第一\r\n行"), _note("第二\r\n行")]
    merged = QuickNoteService._merge_note_contents(notes)
    assert merged == f"第一\n行{MERGE_BLOCK_SEPARATOR}第二\n行"


def test_merge_note_contents_skips_empty_notes():
    notes = [_note("保留"), _note("   "), _note("也保留")]
    merged = QuickNoteService._merge_note_contents(notes)
    assert merged == f"保留{MERGE_BLOCK_SEPARATOR}也保留"
