# docs-verify

- purpose: Keep `yarn verify` green across environments.
- when: Adding or editing docs, or when Markdown linters fail.

## Summary

`yarn verify` runs Markdown style and link checks. Network-reliant tools may fail in sandboxes;
run with elevated permissions if needed. We configure `.markdownlint.json` to relax rules rather
than mass reflow existing docs. Tighten rules later with incremental rewrites.

## Do this

- Run `yarn verify`. If network blocked, re-run with elevated perms.
- Prefer small, targeted doc fixes over disabling rules.
- If re-enabling `MD013` (line length), reflow lines to ~100 chars.

## Gotchas

- `npx` tools fetch remotely; sandboxed shells may block network.
- Avoid large format-only diffs; prefer rule tuning.

## Related

- file: `.markdownlint.json`
- commands: `yarn lint:md`, `yarn lint:links`, `yarn verify`
