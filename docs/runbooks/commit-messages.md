---
id: commit-messages
description: Write clean Conventional Commits (multi-line)
owner: eng-foundation
triggers:
  - package.json
  - docs/**
  - src/**
checklist:
  - Use Conventional Commits (feat/fix/docs/chore/refactor)
  - Keep subject concise (~50 chars), blank line before body
  - Use real newlines (not literal \n) in bodies
  - Prefer multiple -m flags or -F- heredoc; avoid shell-escaped artifacts
  - Reference issues with #123 when applicable
source: runbook
---
Summary: Write clean, multi-line Conventional Commit messages using real newlines.

When to use:
- Any commit that benefits from a descriptive body (most changes)
- When committing from scripts/CLI where quoting/newlines are tricky

Steps:
1) Preferred: interactive editor
   - `git commit` (opens editor); write:
     - First line: `feat: concise subject`
     - Blank line
     - Body: wrapped at ~72 chars with bullets as needed
2) CLI with multiple -m flags (recommended)
   - Example:
     - `git commit -m "server: dynamic delay override" \\
        -m "- delay directive: persist final delay" \\
        -m "- account fields prefer context delay"`
3) CLI using heredoc (no temp file)
   - `git commit -F- <<'MSG'
     feat: subject line

     - Bullet 1
     - Bullet 2
     MSG`
4) Amending a bad message
   - `git commit --amend` (editor) or repeat (2) or (3)
5) Validate formatting
   - `git log --decorate -n 5` and `git show -s --format=fuller HEAD`
   - Ensure bullets/newlines render correctly (no literal \n)

Gotchas:
- Do not put `\n` inside a single `-m` string; those backslashes appear in logs
- Avoid shell-escaped artifacts (`\t`, `\n`) in messages
- Keep the subject ~50 chars; body lines ~72 chars
- One blank line between subject and body
- Imperative mood for subjects (e.g., "add", "fix", "refactor")

Related:
- dependency-management (use Yarn commands, not manual edits)
- package-manager (Yarn over npm)
