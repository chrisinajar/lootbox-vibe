# config-authoring-guide (runbook)

- purpose: Keep the primary authoring guide up to date.
- when: Schema fields or authoring expectations change.

The configuration authoring reference for content authors lives at:

- docs/config-authoring-guide.md

Maintenance checklist (when schema or expectations change):

- Update docs/config-authoring-guide.md for new fields/semantics.
- Ensure `$id` and example `$schema` values match the current schemas.
- Run `yarn config:check` locally to verify examples validate.
- Add/adjust tests if new fields are used by the backend.
- Link the new guidance from any relevant product/tech specs.
