---
artifact_id: SWAN-CHART-KG1B1-STORAGE
owner: lead Codex blueprint; Luna future bounded implementation
version: 3.2
effective: 2026-09-04
status: STORAGE IMPLEMENTED AND VERIFIED IN22; WRITERS/UI STILL GATED
supersedes: unspecified migration/model mechanics in12/15; does not authorize writer changes
---

# Add the evidence fields without rewriting history

## Outcome and boundary

Add nullable enteredWeight/enteredWeightUnit to workout_logs and its actual Sequelize model.
Keep legacy weight and every historical row intact. No User preference field yet, no writer,
chart, route, import, AI or UI changes; no production SQL, default DB import or deployment.
This is a storage-capability slice, NOT permission to display historical weight as pounds/kg.
Source/root/HEAD are18. KG1b0 must pass real SH11–SH13 before implementation is dispatched.
Do not infer authorization solely because this file exists.
Lead accepted those gates in20 and explicitly dispatched the six-file slice on2026-09-04.

## Proposed exact ownership at dispatch

Runtime lane only; lead must claim these before Luna edits:

- backend/migrations/20260904000001-add-workout-log-entered-weight.cjs (new)
- backend/models/WorkoutLog.mjs (two additive attributes plus blueprint comment only)
- backend/tests/helpers/chartUnitStorageFixture.mjs (new, synthetic fixture lifecycle)
- backend/tests/node-runner/chartUnitStorageMigration.test.mjs (new, actual PostgreSQL)
- backend/tests/integration/chartUnitStorageModel.test.mjs (new, actual model with guarded DB mock)
- backend/vitest.chart-unit.config.mjs (new, includes that ONE model test; no global setup)

No package/lock/config or existing migration edits. Max300 lines per file; ask before extra
extraction. Existing helpers/tests remain regression dependencies, not implicitly editable.
Read18 before changing model fields; full-column queries make schema-before-code mandatory.

## Migration contract

CommonJS up(queryInterface, Sequelize)/down, matching selected current migrations. PostgreSQL
only: unsupported dialect rejects. Use queryInterface.sequelize.transaction with every DDL
query on its supplied transaction; no default singleton, sequelize.sync, or separate pool.
The table must already exist; no silent skip or automatic creation of application tables.

One additive ALTER TABLE public.workout_logs in the transaction adds:

```sql
"enteredWeight" NUMERIC(12,6) NULL,
"enteredWeightUnit" TEXT NULL,
CONSTRAINT workout_logs_entered_weight_pair_check CHECK (
  ("enteredWeight" IS NULL AND "enteredWeightUnit" IS NULL)
  OR (
    "enteredWeight" IS NOT NULL AND "enteredWeightUnit" IS NOT NULL
    AND "enteredWeightUnit" IN ('lb', 'kg')
    AND "enteredWeight" >= 0 AND "enteredWeight" <= 999999.999999
  )
)
```

No defaults, new index, backfill, UPDATE or type change to weight. Explicit IS NOT NULLs keep
SQL's unknown truth value from accepting half-pairs. Upper bound excludes numeric NaN and
positive infinity on PostgreSQL; lower bound excludes negative infinity. Prove that in PG17.
NUMERIC coercion rounds excess fractional precision BEFORE checks. Therefore this schema
alone CANNOT enforce the future wire contract's no-rounding rule; the KG1 writer adapter must
reject excess precision before SQL. Do not claim otherwise or weaken the type to FLOAT.

Migration is apply-once via the migration ledger. If either new column/constraint already
exists, reject the collision atomically; do not guess that a partly matching schema is valid.
Explicit rerun must fail without row/column changes. Future release tooling must adjudicate
its actual schema, not convert an arbitrary collision into success.
Either a preflight CHART_UNIT_STORAGE_MIGRATION_COLLISION or PostgreSQL duplicate-column/
constraint rejection is acceptable; both must leave the exact schema/rows unchanged. This
internal migration error has no public HTTP contract. Lead gate does not require one mechanism.
down MUST reject with CHART_UNIT_STORAGE_ROLLBACK_REQUIRES_REVIEW before any SQL; preserve
both columns/data. Roll back application activation instead. Dropping verified unit evidence
requires separate human-approved recovery, not automatic db:migrate:undo.

## Model contract

Add enteredWeight DataTypes.DECIMAL(12,6), allowNull:true; enteredWeightUnit DataTypes.TEXT,
allowNull:true, validate isIn exact lb/kg when non-null. Neither gets a default or getter that
converts NUMERIC strings into numbers, nor setters that infer/fill the other field.
SQL pair/range validation remains authoritative for ORM/raw writes, including validate:false.
Do not attach an unproven field to associations or mutate WorkoutSession totals yet.
Model hydration returns enteredWeight as the driver's exact decimal string; decoded domain
numbers belong to the future strict adapter. KG0 accepts numbers, not Sequelize instances.

## Synthetic fixture and identity ownership

Fixture API: `withChartUnitStorageFixture(target, run)` internally uses withChartUnitTestDatabase,
creates the named legacy schema and passes that exact ORM to run; returns its result and
always performs owned-table cleanup before the enclosing ORM closes. It does NOT apply the
new migration automatically: each test controls the pre/post-migration assertions.
No concurrent use of this single synthetic DB; run native and Vitest suites sequentially.

Use withChartUnitTestDatabase, not the app database.mjs or CLI migration runner. Before fixture
creation, verify public has ZERO user tables; reject nonempty DB without modifying anything.
The helper creates and owns only public.workout_sessions (UUID id primary key) and
public.workout_logs, plus the latter's owned serial sequence/indexes. Minimal parent is an
explicit FK stub, NOT proof of the complete WorkoutSession schema or user authorization.

Construct legacy logs using these exact existing up migrations in order, with the SAME ORM:

1. 20260222000002-create-workout-logs.cjs (sees precreated parent, creates logs/indexes).
2. 20260415000001-add-exercise-note-to-workout-logs.cjs.
3. 20260828000001-add-workout-log-circuit-fields.cjs.

Do not replay20260321000002's absent exerciseId/clientId indexes or the full migration history.
Insert only generated UUIDs, synthetic exercise labels, and known test scalars; no client data.
Before/after assertions include all seeded old row values and timestamps, not just counts.
Cleanup in finally drops ONLY the two tables this invocation successfully created, child first,
without CASCADE. A preexisting table is never claimed/deleted. Cleanup failures fail tests.
Do not delete the cluster/files. This permits repeatable tests without touching existing data.

## Test harness boundaries

Native migration tests import CJS by createRequire and run directly against the guarded ORM.
Model tests use installed Vitest4's vi.hoisted state and exact vi.mock('../../database.mjs'):
mock factory must throw unless state.orm already points to the verified callback's instance.
Only THEN dynamically import the real models/WorkoutLog.mjs. Do not import models/index,
associations, server or dotenv. Never set TEST_DATABASE_URL/DATABASE_URL to drive this test.
Dedicated config includes only the new model test, environment node, no application setup or
automatic DB skip. Current isolated root/backend .env paths are absent; keep them absent.
Explicit owned target comes from a required CHART_UNIT_TEST_DATA_DIRECTORY argument/env key;
this is only the expected dataDirectory, not a general connection override. All other target
values remain the strict existing synthetic constants. Reject missing directory, don't skip.

## Required cases (ST IDs are subgates, not new domain acceptance counts)

| ID | Proof |
|---|---|
| ST01 | Missing explicit target fails before fixture/model/default configuration load |
| ST02 | Nonempty public DB rejects before fixture changes; foreign sentinel table survives |
| ST03 | Existing three selected migrations produce expected legacy log columns; no unit pair before up |
| ST04 | Seed old0,100,2.5 rows; up preserves every old field and timestamp, new pairNULL/NULL |
| ST05 | Information schema proves NUMERIC12/6 and TEXT, nullable/no default; named CHECK exists |
| ST06 | Raw SQL acceptsNULL/NULL,0lb,0kg,100kg,999999.999999lb |
| ST07 | Raw SQL rejects both half-pair directions,negative,NaN,+/-Infinity,overflow,uppercase,whitespace,lbs,other unit; assert appropriate PG error class |
| ST08 | Force failure after actual ALTER inside its transaction; both columns and constraint roll back, legacy rows unchanged |
| ST09 | Explicit rerun collides without changing schema/rows; down rejects before SQL, recorded evidence retained |
| ST10 | Actual model binds to verified ORM; rawAttributes have exact types/nullability/no defaults; real create/findAll roundtrip preserves100kg as decimal string pluskg |
| ST11 | Actual model legacy create yieldsNULL/NULL; invalid pair with validate:false still rejected by PostgreSQL |
| ST12 | Fixture cleanup leaves zero public tables and no owned ORM sessions; failure path cleans only its own created objects |
| ST13 | Failed parent create cannot claim/drop a same-name synthetic sentinel; regression added during lead review |

Cases involving expected PostgreSQL errors must use separate/autocommit statements or explicit
savepoints; a failed transaction cannot prove later cases. No broad exception swallowing.
Lead-owned verify-kg1b1-storage.mjs adds seven independent raw PostgreSQL confirmation probes
for these storage properties; Luna must not edit it. Parent runs it after native/model suites,
never concurrently against this single synthetic database.
ST02 may create/drop one named synthetic sentinel inside the verified test callback, recording
ownership; it proves the fixture refuses it. Do not run this negative control on another DB.

## Release gate that this slice does not clear

Current53120649f backend/scripts/safe-migrate.mjs:226–288 can mark schema failures completed
and quarantine them;250 also marks eligible structural collisions completed. Therefore its
overall exit/SequelizeMeta entry is NOT proof these columns/constraint exist. Do not rely on
the older shared checkout's different strict-mode text; it is not this build's runner.
Before any future release, independently verify exact installed columns/CHECK, known/unknown
counts, apply result and code ordering, and reconcile with the release owner. Runner changes
are cross-cutting and NOT authorized in this slice. No release may bypass this open gate.

After ST green and two clean review rounds, lead writes exact evidence and dispatches KG1c
strict decimal/wire adapters and transactional writers. Do not fold User preference/UI, source
unit inference or all-consumer migration into this bounded storage change.
