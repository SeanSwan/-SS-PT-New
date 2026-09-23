---
artifact_id: SWAN-CHART-KG1B1-VERIFICATION
owner: lead Codex independent verification; Luna implementation
version: 3.2
effective: 2026-09-04
status: STORAGE-ONLY NARROW-CLAIM-PASS; WRITERS/UI/CHART ADOPTION UNBUILT
supersedes: unimplemented storage status in12/21; not historical-unit or release authorization
---

# Entered-unit storage verified on synthetic PostgreSQL

## Outcome and scope

Luna implemented the two nullable WorkoutLog attributes, additive PostgreSQL migration,
owned legacy fixture and actual SQL/model tests. Parent independently verified20 test cases:
11 native +2 actual-model +7 lead raw-SQL probes, all pass without skips.
Old values are preserved; no historical unit assigned, no data backfill. This is NOT a
unit-aware writer, visible kg/lb selector, normalized chart, or production migration.

Root: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904`.
Branch codex/chart-experience-v3-20260904, HEAD53120649f356c3efccee32872b530096d386642f.
Only six KG1b1 files changed; the new runtime model fields are DECIMAL(12,6)/TEXT with no defaults.
The18 field census remains a baseline receipt; existing FULL ORM reads now request new fields.
Schema-before-code activation and21's migration-runner release warning therefore still apply.

| Path relative to root | Lines / SHA-256 |
|---|---|
| backend/migrations/20260904000001-add-workout-log-entered-weight.cjs |63 /2c29a6b12c7eabbeada476feece56256552385a0dd52272a1f4528837d2dd7b3 |
| backend/models/WorkoutLog.mjs |143 /3d882469697914e162e44b643e440094d0f3f66e9ef91c2cf37214276f97357a |
| backend/tests/helpers/chartUnitStorageFixture.mjs |94 /f1e4d5a5d6d6d5fc86c47cc5406680abc90446474fa4d02b9da145a0e20d37ae |
| backend/tests/node-runner/chartUnitStorageMigration.test.mjs |274 /bfa28e22b39f1a5f60f1974333ec8cae57e09fb7d4718917d9a0a5fe37b9d17d |
| backend/tests/integration/chartUnitStorageModel.test.mjs |101 /87dc949aabbc1c0e9afa4156b43fff2969e86a7dc14a0d7c876baa6985766c55 |
| backend/vitest.chart-unit.config.mjs |12 /5e3f459f2d1e40a7ee1254604c722d2d4fbe36873b847f834448160e6e359cc1 |

Lead verifier SHA-256:459f3452f8bcd2025bc4c96289478acaa2fbf931b367c7c597de835c695da32b.
Git boundary: one modified tracked model +13 untracked files across KG0/KG1 infrastructure
and storage, no other tracked diffs. git diff --check exit0; normal Windows LF/CRLF warning.
No package, lockfile, application DB singleton, runner, route, writer or UI changes.

## Real evidence and exact replay

Parent started only the owned synthetic PG17 cluster and ran each suite serially. From build
root/backend, use the explicit expected directory with the existing strict target constants:

```powershell
$env:CHART_UNIT_TEST_DATA_DIRECTORY = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/qa/chart-weight-db-20260904'
node --test tests/node-runner/chartUnitStorageMigration.test.mjs
node node_modules/vitest/vitest.mjs run --config vitest.chart-unit.config.mjs
```

From shared doc host:

```powershell
node docs/ai-workflow/AI-HANDOFF/chart-experience-v3/verify-kg1b1-storage.mjs C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904 C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/qa/chart-weight-db-20260904
```

- Lead SV01–SV07:7/7,0skipped,~1.29s. Actual raw SQL, not mocked query result matching.
- Native ST01–ST09,ST12,ST13:11/11,0skipped,~2.24s in parent's fresh run.
- Actual WorkoutLog ST10/ST11:1 file,2/2,~1.06s; Vitest4.1.10; no application setup.
- Existing cross-slice native36/36 was independently reproduced by coordinator in20 before
  storage changes; not counted again as new storage evidence.

The native/model entrypoints were RED before implementation for missing migration/fixture.
One initial Vitest invocation was blocked by Windows spawn EPERM before collection. Normal
approved process permissions were used for actual execution, without changing assertions.

## What was proved

Old seeded rows0/100/2.5 retain every old column and timestamp with newNULL/NULL fields.
Actual schema is nullable NUMERIC12/6 and TEXT with no defaults and the named SQL CHECK.
Raw SQL accepts NULL/NULL,0lb,0kg,100kg and upper bound; rejects half-pairs, negative/NaN/
infinities, overflow, uppercase/whitespace/unsupported units. Expected errors are checked
against actual PostgreSQL constraint/range codes, not unrelated FK or malformed-set failures.

Injected failure AFTER actual migration ALTER inside its transaction rolls back both fields
and constraint. Rerun and partial-schema collision reject without rewriting evidence. down
rejects before any SQL. Actual model create/findAll roundtrips100kg as decimal string100.000000;
legacy create returnsNULL/NULL, and validate:false still cannot bypass the DB constraint.

The mock getter and module reset bind EACH real model import to that fixture's verified ORM;
both tests assert WorkoutLog.sequelize===orm. No duplicate test model stands in for the real one.
The API precision rule is NOT proved: PostgreSQL rounds excess precision before CHECK, so
the future strict wire adapter must reject such submissions before SQL.

## Hostile-review ledger

| Round | Evidence / decision |
|---|---|
| 1 | Tests-first source review caught missing parent fixtures, fractional set index, wrong Sequelize error-code field, copied-ALTER rollback instead of actual migration, missing model migration apply, and stale mock ORM binding. Luna corrected inside owned tests; no relaxed product contract |
| 2 | Initial native10/10+model2/2 held, but fixture cleanup claimed tables by name instead of successful creation. Lead requested ST13; Luna reproduced10/11 RED: unexpected same-name parent sentinel had been deleted. REVISE |
| 3 | Scoped successful-create Set/proxy repair; parent source review plus independent rawSQL7/7, including full row retention, constraint boundaries, actual DDL rollback, collision and foreign-table preservation. CLEAN |
| 4 | Parent fresh native11/11 including ST13 and real-model2/2; exact hashes/scope/lines, independent final zero-table/zero-session check, stopped cluster. CLEAN |

DRY-LOOP: CLEAN×2 (rounds:4), storage only. Advisory verdict APPROVE, not commit/release gate.
ST13 now proves a createTable call that throws cannot claim/drop a same-name sentinel.
Cleanup tracks only successful creates for that invocation and removes them child-first.
The lead SV05 initially required PostgreSQL duplicate codes alone, beyond21's stated contract;
it was corrected to allow the stable explicit collision preflight too, keeping all schema/row
preservation assertions. This was a lead test-contract correction, not a weakened data gate.

## Database lifecycle and hygiene

After all suites, independent psql against exact synthetic host/port/db/user returned0 public
tables and0 owned ORM/preflight sessions. Parent stopped that exact cluster with pg_ctl fast
stop, exit0; files retained. No production/default DB, real client data or Windows service used.
Only this run's synthetic fixture/temp/sentinel tables were removed. They contained no user
records and are reproducible from tests. Cluster logs remain; no workspace files were deleted.

New artifacts: six owned code/test files, lead SV verifier,18–22 planning/receipts, local test
runner caches under the isolated dependencies. No root dumps/new screenshots, no external
board or memory writes, no automatic continuity closeout. Old chart worktree stays read-only.
No external model call in this slice;14's prior GLM pair remains VOID. No commit/push/deploy.

## Next lead design gates, then Luna

Strict decimal/wire adapters and real transactional writer tests come next; this storage
approval does not authorize a broad edit of daily/admin/AI/import paths. Before dispatch,
resolve untouched unknown-unit rows in mixed historical edits without inventing units or
discarding known metadata. Also specify how a converted draft preserves entered precision
when its display unit changes. Those are lead decisions, not permission for Luna to guess.
User preference, entry controls, all-chart/export/AI adoption and mounted browser/auth proof
remain unbuilt. The approved Sapphire Ledger visual reference is unchanged, not live V3.
