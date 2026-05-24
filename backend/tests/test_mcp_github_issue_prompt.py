"""Tests for GitHub issue todo MCP prompt."""

import asyncio

from app.mcp.prompts.github_issue_todo import _build_prompt_content
from app.mcp.server import mcp_server


def test_build_prompt_content_uses_canonical_url():
    content = _build_prompt_content("GitHub: x2-tech/x-pulsar#518")
    assert "https://github.com/x2-tech/x-pulsar/issues/518" in content
    assert '"action": "create"' in content
    assert "Do not add description" in content


def test_github_issue_prompt_is_registered():
    prompts = asyncio.run(mcp_server.list_prompts())
    names = {prompt.name for prompt in prompts}
    assert "create_todo_from_github_issue" in names
