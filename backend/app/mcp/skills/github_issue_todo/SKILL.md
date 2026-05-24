---
name: github-issue-todo
description: >-
  When creating a Fix Life todo via MCP with a GitHub issue URL, fetch the issue
  title and normalize fields automatically. Use when the user provides
  github.com/owner/repo/issues/N as todo content.
---

# GitHub Issue Todo Skill

## When to apply

Apply on **`todo` tool `create`** when the user gives a **GitHub issue link** as the todo content, for example:

- `https://github.com/mitrecx/fix-life/issues/42`
- `github.com/mitrecx/fix-life/issues/42`

The URL may appear in `title` or `description`.

## Server behavior (automatic)

Fix Life MCP applies this skill in `todo` create:

1. **Title** → GitHub issue title (from GitHub API)
2. **Description** → canonical issue URL only (`https://github.com/owner/repo/issues/N`); any other description text is discarded
3. **Context** → `work` (工作)

Supported issue references in `title` or `description`:

- `https://github.com/owner/repo/issues/42`
- `github.com/owner/repo/issues/42`
- `GitHub: owner/repo#42` or `owner/repo#42` (even inside a longer description)
- `owner/repo issue 42`
- `repo issue 42` or `对应 repo issue 42` (requires server `GITHUB_DEFAULT_OWNER`)

No extra action field is required; pass the URL in `title` or `description`.

## Example payload

```json
{
  "action": "create",
  "title": "https://github.com/mitrecx/fix-life/issues/42"
}
```

## Notes

- Private repos or heavy usage may require `GITHUB_TOKEN` on the server.
- `repo issue N` shorthand requires `GITHUB_DEFAULT_OWNER` (e.g. `x2-tech` for `x-pulsar issue 518`).
- Pull request URLs (`/pull/N`) are not handled; use issue URLs only.
- If GitHub is unreachable, create fails with `GITHUB_FETCH_FAILED`.
