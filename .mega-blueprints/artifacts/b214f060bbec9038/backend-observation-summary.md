# Backend fixture observation — 2026-09-13

## Verdict

**BLOCKED before test collection.** The exact requested Vitest command reached config loading, then failed with `Error: spawn EPERM` when Vite/esbuild attempted to start its service. No test body ran, no PostgreSQL fixture schema was created, and no source or fixture file changed during the attempt. This is a current-state diagnostic only; it is not admission, authorship, approval, or certification of the held backend lane.

## Guard verification

The inspected PostgreSQL fixture hard-codes `postgres://rolodex_audit@127.0.0.1:55479/rolodex_repair_test`, checks the parsed host, port, user, and database, then queries `current_database()`, `current_user`, `inet_server_port()`, and `current_setting('data_directory')`. It requires the exact data directory `tmp/rolodex-postgres-20260913` before creating its unique `rolodex_red_<pid>_<timestamp>` schema. It imports mocked database/models before importing CRUD, and its cleanup drops only that schema when `schemaCreated` is true. The Vitest config uses the requested node environment, retries 0, forks pool, and one worker.

## Exact command

```text
NODE_ENV=test node backend/node_modules/vitest/vitest.mjs run --config tmp/rolodex-audit-evidence/server-red/vitest.config.mjs --pool forks --maxWorkers 1 --reporter verbose
```

Exit code: `1`.

Captured log: `backend-observation-run.log`, SHA-256 `a1e0891b9bf7d96694f49bdaaae52724760e7b3fd58b5a09d0f10b92c7daabaa`.

Blocker excerpt: `failed to load config ... Error: spawn EPERM` from the shared backend `esbuild` service. There was no Vitest test summary in the log.

## Test inventory and result

The four fixture files contain exactly 12 tests: save 5, read 1, route 3, and guarded PostgreSQL integration 3. The prior contract classifies these as 9 intended RED assertions and 3 controls. Actual execution was **0/12** because config loading failed; therefore there are no individual pass/fail outcomes and no schema cleanup action to report. PostgreSQL was left running for its owner.

## Before/after source integrity

`backend-observation-before.json` and `backend-observation-after.json` contain SHA-256, length, and timestamps for the three held backend files and four fixture files. `changedPaths` is empty and `stable` is `true`. No app, test, workflow/controller, or dependency source was edited.

## Evidence boundary

This run made no provider calls, external requests, production-data connections, `.env` reads by the fixture, or runtime substitution. Native automatic hooks remain unproven.
