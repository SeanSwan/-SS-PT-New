# Server RED acceptance evidence

Revision under test: `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`.

The isolated tests execute the real `saveBootcampTemplate`, `getTemplates`, and
`bootcampRoutes` exports. Model, database, auth, logger, and event-bus edges are
synthetic mocks; no application source, database, `.env`, network, or provider
was used. The tests are restricted by `server-red/vitest.config.mjs`.

## Exact acceptance cases

- `bootcamp-template-save.red.test.mjs`: parent and every child write must
  receive one transaction; an injected exercise-write rejection must call
  rollback; caller `id`, `trainerId`, and `templateId` must not control child
  persistence; profile IDs, zero timing, board/order, and the versioned
  `selectionManifestV1` provenance contract must be persisted.
- `bootcamp-template-read.red.test.mjs`: `getTemplates` must request the direct
  `exercises` association for `full_group`, preserve station/direct counts, and
  return profile and manifest metadata.
- `bootcamp-template-route.red.test.mjs`: route controls verify trusted caller
  identity, empty-input rejection, and service-error status mapping. Transaction
  ownership is deliberately tested in the service, so internal callers cannot
  bypass atomicity.

## Behavioral RED result

Command from the worktree root:

```powershell
$env:NODE_ENV='test'; node backend/node_modules/vitest/vitest.mjs run --config tmp/rolodex-audit-evidence/server-red/vitest.config.mjs --pool forks --maxWorkers 1 --reporter verbose
```

Native rerun exit code: `1`. Vitest loaded all three suites and executed nine
tests; six service/read acceptance tests fail on intended behavioral assertions
and three route validation/error controls pass. There were no import, transform,
or test-environment errors in the final run.

Observed failures map to the current source:

- no transaction option reaches parent or child writes;
- late exercise failure does not roll back;
- station/stretch/overflow spreads let submitted IDs and `templateId`/`trainerId`
  reach persistence;
- profile IDs and `selectionManifestV1` are absent from the parent payload;
- `getTemplates` has no direct root exercise include;
- service transaction ownership is absent; the route controls remain green as
  required by the corrected boundary.

Raw outputs:

- `../server-red-vitest-native-final.log` — prior behavioral RED run before the
  transaction-boundary correction; preserved for audit history.
- `../server-red-vitest-native-corrected.log` — corrected service-owned
  transaction RED run; authoritative after Astra's boundary correction.
- `../server-red-vitest.log` — sandbox startup `spawn EPERM` setup error; not RED
  evidence.
- `../server-red-vitest-native.log` — superseded setup-only mock-import error;
  corrected before the authoritative run.

No application source diff was created. SHA-256 source snapshots are in
`server-source-hashes.json`.

## Guarded real-PostgreSQL RED result

`bootcamp-template-postgres.red.integration.test.mjs` constructs Sequelize
directly with the fixed test-only URL, verifies database `rolodex_repair_test`,
user `rolodex_audit`, port `55479`, and the exact server data directory
`ROOT/tmp/rolodex-postgres-20260913` before creating a unique schema. It mocks
production model/database/logger modules before importing the real CRUD helper;
the model accessors point at real Sequelize models and real PostgreSQL tables.
The fixture never imports production `database.mjs`, so it never reads `.env`.

Command (single fixture):

```powershell
$env:NODE_ENV='test'; node backend/node_modules/vitest/vitest.mjs run --config tmp/rolodex-audit-evidence/server-red/vitest.config.mjs --pool forks --maxWorkers 1 --reporter verbose ../tmp/rolodex-audit-evidence/server-red/bootcamp-template-postgres.red.integration.test.mjs
```

Authoritative result: exit code `1`; all 3 tests ran and all 3 failed on
behavioral assertions after the guard passed. The real database rows showed:

- profile persistence is `NULL` after save instead of the submitted profile IDs;
- a submitted station foreign key leaves the parent row behind after the child
  FK failure;
- an injected late exercise failure leaves the parent and station rows behind,
  proving the current service has no atomic rollback;
- the test also checks the real direct full-group/profile/provenance reload path
  and fails before the missing root association assertion because profile data
  is already `NULL`.

Raw PostgreSQL outputs:

- `../server-red-vitest-native-pg-only-final2.log` — authoritative guarded PG
  RED result.
- `../server-red-vitest-native-pg-only-final.log` — prior run after cleanup SQL
  correction but before trainer identity correction.
- `../server-red-vitest-native-pg-only.log` — superseded fixture setup error;
  the cleanup statement lacked `TRUNCATE TABLE`.

Combined evidence command (synthetic plus guarded PostgreSQL fixtures) also
exited `1`: 4 files, 12 tests, 9 intended RED failures, and 3 passing route
controls. Its authoritative raw output is
`../server-red-vitest-native-all-final.log`.

The unique schema is dropped in `afterAll` only after successful preflight/schema
creation. The fixture is test-only and uses no app DB, live app config, network,
providers, or production schema.

## Narrow implementation scope after admission

- `backend/services/bootcamp/bootcampCrud.mjs`: service-owned managed
  transaction, optional caller-owned transaction pass-through, explicit parent
  and child allowlists, server-owned IDs/FKs, manifest/profile persistence, and
  direct full-group read association.
- `backend/services/bootcamp/bootcampTemplateContract.mjs`: new normalization
  and `selectionManifestV1` metadata envelope seam described by 13-server
  repair contract; no schema migration.
- `backend/routes/bootcampRoutes.mjs`: validation and error mapping only; route
  does not own the transaction.
- Model accessors only if the existing association exports require a minimal
  additive seam. No unrelated route, schema, provider, or deployment changes.
