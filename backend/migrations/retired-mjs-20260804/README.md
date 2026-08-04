# Retired `.mjs` migrations (SWA-115 item 3 — 2026-08-04)

These 32 ESM migrations were **never executed in production**: the runner
(`scripts/safe-migrate.mjs` → sequelize-cli) cannot load `.mjs` files, so they sat
invisible for months. A full per-file audit (drift workstream, 2026-08-03/04) found that
executing them now would be harmful or pointless, so they are retired here — out of the
runner's discovery path — instead of being converted or run. `git mv` only; fully
revertable. A unit test (`tests/unit/noMjsMigrations.test.mjs`) fails the suite if a new
top-level `.mjs` migration is ever added. **All new migrations must be `.cjs`.**

## Why not just run them?

| Class | Count | Disposition |
|---|---|---|
| DANGEROUS | 19 | Never auto-run. Includes: two column-DROPs on live `exercises`/`workout_plans` whose prerequisite backfill never ran (the dropped JSON columns are actively queried by the bootcamp rolodex TODAY — running these destroys live data); recreators of the dead PascalCase `Challenges`/`ChallengeParticipants` twins and a would-be lowercase `exercises` twin (+5 FKs into dead lowercase `users`); nine files with `UUID → "Users".id(INTEGER)` FKs that cannot succeed on any Postgres; one `ACCESS EXCLUSIVE` rewrite of the live `Users` auth table; one file (`20260206-add-idempotency-to-shopping-cart.mjs`) that is not a migration at all — it self-executes on import and calls `process.exit()`. |
| SAFE-RUN (green lane) | 4 | Their intents are **already satisfied in the live DB** — verified 2026-08-04: `marketing_calendar_items` + `social_publishing_{accounts,jobs,attempts}` (created via `utils/tableCreationOrder.mjs` PHASE 13), `PointTransactions.idempotencyKey` + the 3 enum source values (startup migration), `client_progress` MCP columns (3/3 present), and the payment idempotency indexes `idx_orders_idempotency_key` / `idx_print_orders_idempotency_key` (both live). |
| SAFE-SKIP | 9 | Tables all exist; `CREATE TABLE IF NOT EXISTS` would no-op and Sequelize's bare `CREATE INDEX` (no IF NOT EXISTS) would then 42P07 partway through, leaving partial DDL. Nothing to gain. |

Full audit detail (per-file operations, FK targets, export shapes) lives in the drift
workstream record: `docs/ai-workflow/AI-HANDOFF/SCHEMA-DRIFT-HOSTILE-AUDIT-RECORD-2026-08-03.md`
and SWA-115.

⚠ Do NOT move files back without reading the audit — `20260206-add-idempotency-to-shopping-cart.mjs`
fires on bare `import()` and kills the process.
