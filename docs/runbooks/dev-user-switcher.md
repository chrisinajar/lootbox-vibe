# dev-user-switcher

- purpose: Quickly switch API user in dev to test multiple accounts
- when: Manually testing FE against different LevelDB users

Steps:
- UI badge: Use the floating badge in the bottom-right to set user to `seed-user`, `anonymous`, or clear override.
- Manual override:
  - `sessionStorage.setItem('X-User-Id', 'seed-user')` (preferred for tab-local)
  - Or `localStorage.setItem('X-User-Id', 'seed-user')`
- The FE Apollo link forwards `X-User-Id` header; the backend extracts it via `buildContext(req)`.
- To clear: remove items from both storages or click "clear" in the badge.

Gotchas:
- Prefer sessionStorage to avoid leaking between tabs.
- After changing the user, the inventory panel auto-refetches; if you add new views, listen to `user-id-changed` event.

Related:
- dev-seed-leveldb, graphql-inventory-summary
