# telemetry-elog

- purpose: Capture per-request telemetry in a JSONL event log.
- when: Adding new operations, updating aggregates, or debugging performance.

## Summary

Telemetry writes to a JSONL file when enabled by env. Each line includes timestamp, operation name,
uid, requestId, latency, and operation-specific aggregates. Writes are lightweight and gated by
`ELOG_ENABLED` and `ELOG_PATH`.

## Do this

- Enable locally: set `ELOG_ENABLED=1` and `ELOG_PATH=./data/elog.jsonl` in `.env`.
- Instrument new resolvers by wrapping call sites and passing results to the formatter.
- Keep aggregates minimal and stable; avoid high-cardinality fields.

## Gotchas

- Avoid logging secrets or PII.
- Writes append-only; rotate files externally if needed.
- In prod, default is disabled unless explicitly enabled.

## Related

- file: `src/backend/services/TelemetryService.ts`
- file: `src/backend/init.ts`
- env: `ELOG_ENABLED`, `ELOG_PATH`
