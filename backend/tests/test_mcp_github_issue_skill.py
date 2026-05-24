"""Tests for GitHub issue todo MCP skill."""

from unittest.mock import MagicMock, patch

import pytest
from fastmcp.exceptions import ToolError

from app.mcp.skills.github_issue_todo import (
    enrich_todo_from_github_issue,
    find_github_issue_url,
    parse_github_issue_url,
)


def test_parse_github_issue_url_accepts_https_and_plain_host():
    ref = parse_github_issue_url("https://github.com/mitrecx/fix-life/issues/42")
    assert ref is not None
    assert ref.owner == "mitrecx"
    assert ref.repo == "fix-life"
    assert ref.number == "42"
    assert ref.url == "https://github.com/mitrecx/fix-life/issues/42"

    ref2 = parse_github_issue_url("github.com/acme/app/issues/7")
    assert ref2 is not None
    assert ref2.url == "https://github.com/acme/app/issues/7"


def test_find_github_issue_url_prefers_title_then_description():
    ref = find_github_issue_url(
        "not a url",
        "https://github.com/mitrecx/fix-life/issues/1",
    )
    assert ref is not None
    assert ref.number == "1"


@patch("app.mcp.skills.github_issue_todo.fetch_github_issue_title")
def test_enrich_todo_from_github_issue_sets_title_description_and_work(mock_fetch):
    mock_fetch.return_value = "Fix progress sync between pages"

    enriched = enrich_todo_from_github_issue(
        {
            "title": "https://github.com/mitrecx/fix-life/issues/99",
            "context": "learning",
        }
    )

    assert enriched["title"] == "Fix progress sync between pages"
    assert enriched["description"] == "https://github.com/mitrecx/fix-life/issues/99"
    assert enriched["context"] == "work"
    mock_fetch.assert_called_once()


@patch("app.mcp.skills.github_issue_todo.fetch_github_issue_title")
def test_enrich_todo_from_github_issue_noop_without_url(mock_fetch):
    payload = {"title": "Write docs", "description": "README"}
    assert enrich_todo_from_github_issue(payload) == payload
    mock_fetch.assert_not_called()


@patch("app.mcp.skills.github_issue_todo.requests.get")
def test_fetch_github_issue_title_raises_on_404(mock_get):
    from app.mcp.skills.github_issue_todo import GitHubIssueRef, fetch_github_issue_title

    response = MagicMock()
    response.ok = False
    response.status_code = 404
    mock_get.return_value = response

    ref = GitHubIssueRef("mitrecx", "fix-life", "404", "https://github.com/mitrecx/fix-life/issues/404")
    with pytest.raises(ToolError, match="GITHUB_ISSUE_NOT_FOUND"):
        fetch_github_issue_title(ref)
