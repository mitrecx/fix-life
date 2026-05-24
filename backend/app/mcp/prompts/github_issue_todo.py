from __future__ import annotations

import json

from fastmcp import FastMCP

from app.mcp.skills.github_issue_todo import parse_github_issue_reference


def _build_prompt_content(issue_reference: str) -> str:
    ref = parse_github_issue_reference(issue_reference)
    canonical = ref.url if ref else issue_reference.strip()
    payload = {"action": "create", "title": canonical}

    return (
        "Create a Fix Life backlog todo from a GitHub issue using the `todo` tool.\n\n"
        f"Issue reference: {issue_reference.strip()}\n\n"
        "Call `todo` with this payload only:\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n\n"
        "Important:\n"
        "- Do not add description, background, implementation notes, or verification steps.\n"
        "- The server fetches the issue title, sets description to the canonical issue URL only, "
        "and sets context to work.\n"
        "- Supported references include full GitHub URLs, owner/repo#N, and repo issue N shorthands.\n"
        "- After create, report the returned title and description."
    )


def register_github_issue_prompts(mcp: FastMCP) -> None:
    @mcp.prompt(
        name="create_todo_from_github_issue",
        title="从 GitHub Issue 创建待办",
        description=(
            "Create a Fix Life todo from a GitHub issue URL or shorthand reference. "
            "Guides the agent to call `todo` create with minimal payload; "
            "the server normalizes title and URL-only description."
        ),
        tags={"todo", "github"},
    )
    def create_todo_from_github_issue(issue_reference: str) -> list[dict[str, str]]:
        return [
            {
                "role": "user",
                "content": _build_prompt_content(issue_reference),
            }
        ]
