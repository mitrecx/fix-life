from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import requests

from app.core.config import settings
from app.mcp.helpers import tool_error
from app.models.task_context import TaskContext

_GITHUB_ISSUE_URL_RE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/(?P<owner>[^/\s?#]+)/(?P<repo>[^/\s?#]+)/issues/(?P<number>\d+)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class GitHubIssueRef:
    owner: str
    repo: str
    number: str
    url: str


def parse_github_issue_url(text: str) -> GitHubIssueRef | None:
    match = _GITHUB_ISSUE_URL_RE.search((text or "").strip())
    if not match:
        return None
    owner = match.group("owner")
    repo = match.group("repo")
    number = match.group("number")
    return GitHubIssueRef(
        owner=owner,
        repo=repo,
        number=number,
        url=f"https://github.com/{owner}/{repo}/issues/{number}",
    )


def find_github_issue_url(*texts: str | None) -> GitHubIssueRef | None:
    for text in texts:
        if not text:
            continue
        ref = parse_github_issue_url(text)
        if ref is not None:
            return ref
    return None


def fetch_github_issue_title(ref: GitHubIssueRef) -> str:
    api_url = f"https://api.github.com/repos/{ref.owner}/{ref.repo}/issues/{ref.number}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "fix-life-mcp",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = getattr(settings, "GITHUB_TOKEN", "") or ""
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.get(api_url, headers=headers, timeout=10)
    except requests.RequestException as exc:
        tool_error(
            502,
            "GITHUB_FETCH_FAILED",
            f"Failed to fetch GitHub issue title: {exc}",
        )

    if response.status_code == 404:
        tool_error(404, "GITHUB_ISSUE_NOT_FOUND", f"GitHub issue not found: {ref.url}")
    if response.status_code == 403:
        tool_error(
            403,
            "GITHUB_RATE_LIMITED",
            "GitHub API rate limit reached; configure GITHUB_TOKEN for higher limits",
        )
    if not response.ok:
        tool_error(
            502,
            "GITHUB_FETCH_FAILED",
            f"GitHub API returned {response.status_code} for {ref.url}",
        )

    payload = response.json()
    title = (payload.get("title") or "").strip()
    if not title:
        tool_error(502, "GITHUB_FETCH_FAILED", f"GitHub issue has no title: {ref.url}")
    return title


def enrich_todo_from_github_issue(data: dict[str, Any]) -> dict[str, Any]:
    """When todo content is a GitHub issue URL, use issue title and set work context."""
    ref = find_github_issue_url(data.get("title"), data.get("description"))
    if ref is None:
        return data

    issue_title = fetch_github_issue_title(ref)
    enriched = dict(data)
    enriched["title"] = issue_title[:200]
    enriched["description"] = ref.url
    enriched["context"] = TaskContext.WORK.value
    return enriched
