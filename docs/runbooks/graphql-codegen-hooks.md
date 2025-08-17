# graphql-codegen-hooks

- purpose: Enforce typed GraphQL via generated documents/hooks; ban inline gql in app code
- when: Adding/changing GraphQL operations in the frontend

Rules:
- Define operations in `.graphql` files under `src/frontend/queries/`.
- Run `yarn codegen` to (re)generate typed documents in `src/frontend/graphql/`.
- Import generated documents (e.g., `InventorySummaryDocument`) and use with Apollo hooks:
  - `useQuery(InventorySummaryDocument)`
  - `useMutation(OpenBoxesDocument)`
- Do not embed inline `gql` strings in components. If you must prototype, move to `.graphql` before commit.

Setup:
- Codegen config at `codegen.ts` uses the local schema file and client preset.
- Script: `yarn codegen` regenerates on demand.

Review checklist:
- [ ] New operations live in `.graphql` files
- [ ] No `gql` template in component diffs
- [ ] Imports come from `src/frontend/graphql`
- [ ] `yarn codegen` runs clean locally
