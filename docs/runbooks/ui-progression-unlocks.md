# ui-progression-unlocks

- purpose: Implement and maintain the Progression view — unlocked boxes, milestones, RNG unlocks (???), and idle summary/claim.
- when: Changing unlock rules, milestone displays, adding new boxes, or integrating idle catch-up.

## Summary

Progression screen shows unlocked boxes, upcoming milestones with bars and X/Y numbers, and hides RNG unlocks behind `???` until revealed. On login, show a humorous idle summary modal and allow `claimIdle()` to apply rewards.

## Key decisions

- Unlocks: Fetch via `unlocks` (or player profile) and render badges for unlocked vs upcoming. Milestones use a progress bar + numeric X/Y.
- RNG unlocks: Present as `???` with generic silhouettes until triggered; reveal with a one-time animation.
- Idle: On app start, query if idle rewards are pending; show a modal/toast with flavored copy. The claim action calls `claimIdle(requestId)` and updates balances and summaries.

## Checklist

- [ ] Render unlocked and upcoming boxes with themes and lock icons.
- [ ] Show milestone bars and X/Y counts for clear goals.
- [ ] Hide RNG unlocks as `???` until revealed; animate reveal.
- [ ] Implement idle login modal with flavored text and `claimIdle` wiring.
- [ ] Refresh currencies, inventory summary, and unlock state after claims.

## Gotchas

- Spoilers: Avoid leaking RNG unlock identities in alt text or tooltips pre-reveal.
- Idle limits: Respect backend caps on idle hours; handle zero-reward cases gracefully.
- Persisted state: Ensure the modal does not re-show after successful claim within the same session.

## Related

- files: `src/frontend/ui/progression/Progression.tsx`
- schema: `src/backend/api/schema.graphql`
- runbooks: `docs-verify`, `graphql-codegen-hooks`
