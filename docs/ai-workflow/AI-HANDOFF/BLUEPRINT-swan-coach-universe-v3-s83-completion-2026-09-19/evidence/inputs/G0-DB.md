# G0-DB — Owned test database: provisioning, identity, migration config

Classification: **present**  |  Needs Sean: no

## What must still exist before the uninterrupted window

Owned cluster provisioning/teardown receipt; actual connection identity from the RUNNER namespace; dedicated no-dotenv migration config. Historical port 55440 is not current ownership; current ownership is 127.0.0.1:55533 (R6-07 lifecycle ruling applied).

## Cited positions

- g0-db-receipt-v2.json — identity probed from the runner namespace over loopback 55533; v1 retained as history; R6-07 namespace conflation and universal-cause claims corrected; lifecycle events recorded

## Bound sources

| Path | Available | Lines | Bytes | sha256 |
|---|---|---|---|---|
| `backend/tests/helpers/coachTestDatabase.mjs` | yes | 136 | 10177 | `2286dcedf2a5e872…` |
| `backend/tests/helpers/coachTestDatabaseLoader.mjs` | yes | 12 | 764 | `af9ccb83c3f6e621…` |
| `backend/tests/helpers/coachDatabaseLease.mjs` | yes | 232 | 13097 | `ce25b6839acc87ac…` |
| `backend/run-coach-postgres.mjs` | yes | 296 | 16804 | `f96ea112d5209970…` |
| `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19/evidence/g0-db-receipt-v2.json` | yes | 79 | 6371 | `d5ae20710784b874…` |
