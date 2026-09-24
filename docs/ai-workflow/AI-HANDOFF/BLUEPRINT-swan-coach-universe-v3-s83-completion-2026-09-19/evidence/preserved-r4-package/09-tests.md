# Executable verification plan

**Current status:** every command below is **NOT RUN in this call**. Existing test filenames come from the packet. NEW tests/configs are proposed implementation work and become executable only after their slice creates them.

## Named cases and what they prove

| Test file | Required named cases |
|---|---|
| `backend/tests/integration/coachMemoryPersistence.postgres.test.mjs` | `rolls back successor when predecessor update fails`; `replays committed correction without another row`; `rejects same key with changed normalized input`; `serializes competing corrections`; `corrects owned fact beyond first 500`; `rejects another client's fact without mutation`; `serializes correct and forget in both orders`; `does not extend repeated forget deadline`; `never returns forgotten text on replay`; `pages stable filtered rows without duplication`; `applies safety priority before context limit`; `recovers committed correction after response or invalidation failure without duplication` |
| `backend/tests/integration/coachConsentPersistence.postgres.test.mjs` | `opt-out survives snooze in both commit orders`; `opt-out survives profile patch in both commit orders`; `rejects generic Coach preference writes`; `rolls back profile and preferences together`; `rejects invalid and extra fields`; `uses authenticated self identity only` |
| **NEW** `backend/tests/integration/coachMigrationCompletion.postgres.test.mjs` | `starts from zero public tables and executes full chain`; `rerun applies no completed migrations`; `creates integer UserAchievements on partial history`; `delivers required repair with old migrations already recorded`; `recovers missing junction indexes after interruption`; `refuses destructive unknown identity conversion`; `restores synthetic rows and constraints`; `asserts exact repaired FK targets and types` |
| `backend/tests/unit/migrationFkTypeCompat.test.mjs` | Preserve all six supplied tests; mutation checks prove UUID/integer and blind-catch guards can fail |
| `backend/tests/unit/migrationGuardTableNames.test.mjs` | Preserve all seven supplied tests, including forbidden case/placeholder and UUID junction checks |
| `backend/tests/unit/modelTableGuard.test.mjs` | Preserve six supplied tests; absent junction must not return to the retired allowlist |
| **NEW** `FE/CoachCommandCenterPage.createdThreadCompletion.test.tsx` | `adopts after independent route and active-thread settlement`; `does not settle from route alone`; `does not settle from active thread alone`; `preserves generation and sends once`; `rejects foreign target or audience`; `rejects actor ABA`; `rejects independent selection`; `rejects abort deadline and unmount`; `does not accept another operation with the same tuple` |
| `FE/hooks/useCoachSelectionNavigationBlocker.test.tsx` | `valid first discard survives passive-effect flush`; `changed metadata cannot replace the transition credential`; `malformed query cannot take owned-null exemption`; `duplicate query cannot take owned-null exemption`; preserve no-rearm, refusal, Return and Leave tests |
| `FE/hooks/useCoachSelectionSettledAction.epoch.test.tsx` | Preserve four epoch/current-recovery cases; do not claim the dependency addition repaired a demonstrated live race |
| `FE/CoachCommandCenter.sectionSplit.test.ts` | Preserve existing file set and 300-line threshold; include actual newly created production modules if any |
| `frontend/e2e/coach-memory-consent-remediation.spec.ts` | `corrects and rereads persisted version`; `forgets only chosen version`; `retries lost response with same key`; `masks retired target`; `saves self consent and reads it back`; `supports keyboard and 375px layout` |
| **NEW** `frontend/e2e/coach-created-thread-completion.spec.ts` | `mounted first staff message adopts and completes once`; `selection change prevents stale follow-on send` |
| `frontend/e2e/workout-logger-rest-adjust.spec.ts` | `typed Logger command adjusts real deadline`; `declined adjustment has neutral receipt`; `native Worker survives adjustment`; `does not save workout or decrement session` |
| `frontend/e2e/coach-command-center-mobile.spec.ts` | `requires settled mounted client and chrome nodes`; `closed chrome does not obscure client controls`; `375px controls remain hit-testable`; `keyboard and overlay close restore reachable dock` |

`FE` expands to `frontend/src/components/DashBoard/Pages/coach-assistant/`.

Memory race tests use independent database sessions and deterministic barriers. Fixed sleeps are not concurrency proof.

## Commands already identified by supplied filenames

From `backend`:

```powershell
node ./node_modules/vitest/vitest.mjs run tests/unit/migrationGuardTableNames.test.mjs tests/unit/migrationFkTypeCompat.test.mjs tests/unit/modelTableGuard.test.mjs --maxWorkers=1 --retry=0
```

Historical expectation: three files, 19 tests. A changed count requires explanation, not forced matching.

From `frontend`:

```powershell
node ./node_modules/vitest/vitest.mjs run src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionNavigationBlocker.test.tsx src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionSettledAction.epoch.test.tsx --maxWorkers=1 --retry=0
```

Historical expectation: 19 tests before new cases.

```powershell
node ./node_modules/vitest/vitest.mjs run src/components/DashBoard/Pages/coach-assistant/hooks/useCoachCreatedThreadAdoption.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.selectionBinding.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.sectionSplit.test.ts --maxWorkers=1 --retry=0
```

From `frontend`, after C3 creates its new test:

```powershell
node ./node_modules/vitest/vitest.mjs run src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.createdThreadCompletion.test.tsx --maxWorkers=1 --retry=0
```

## PostgreSQL commands after C0 binding

If C1 requires the specified dedicated config, from `backend`:

```powershell
node ./node_modules/vitest/vitest.mjs run --config vitest.coach-completion.config.mjs tests/integration/coachMemoryPersistence.postgres.test.mjs tests/integration/coachConsentPersistence.postgres.test.mjs --maxWorkers=1 --retry=0
```

After C2 creates its migration test and adds that exact file to the dedicated config:

```powershell
node ./node_modules/vitest/vitest.mjs run --config vitest.coach-completion.config.mjs tests/integration/coachMigrationCompletion.postgres.test.mjs --maxWorkers=1 --retry=0
```

These commands are **BLOCKED until the actual connection and config contracts are supplied**. There is no invented `--postgres` flag.

The existing matrix runner’s exact invocation is also BLOCKED pending G0-DB. Its historical 10-suite/125-test result does not execute the new application suites.

Migration runner subprocess, from `backend`, inside the verified harness environment:

```powershell
node ./node_modules/sequelize-cli/lib/sequelize db:migrate --config config/config.cjs --migrations-path migrations --models-path models --env development
```

The harness must establish the database identity before invoking this command. Running it directly with ordinary application environment is prohibited.

## Exact catalog assertions

Run on the verified fixture connection after migration:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'PainEntryCorrectiveExercises'
      AND column_name IN ('id', 'painEntryId', 'exerciseId'))
    OR
    (table_name = 'UserAchievements'
      AND column_name IN ('id', 'userId', 'achievementId'))
    OR
    (table_name = 'orientations' AND column_name = 'userId')
    OR
    (table_name = 'gallery_visitors' AND column_name = 'user_id')
  )
ORDER BY table_name, column_name;
```

Required types:

```text
PainEntryCorrectiveExercises.id            integer
PainEntryCorrectiveExercises.painEntryId   integer
PainEntryCorrectiveExercises.exerciseId    uuid
UserAchievements.id                       integer
UserAchievements.userId                   integer
UserAchievements.achievementId            integer
orientations.userId                       integer
gallery_visitors.user_id                  integer
```

```sql
SELECT c.relname AS table_name,
       k.conname,
       pg_get_constraintdef(k.oid) AS definition
FROM pg_constraint k
JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND k.contype = 'f'
  AND c.relname IN (
    'PainEntryCorrectiveExercises',
    'UserAchievements',
    'gallery_visitors',
    'leads',
    'bootcamp_exercises'
  )
ORDER BY c.relname, k.conname;
```

Compare actual definitions to the supplied targets; do not merely count rows.

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'PainEntryCorrectiveExercises'
ORDER BY indexname;
```

Require:

- `idx_unique_pain_exercise_phase`: unique, ordered `(painEntryId, exerciseId, phase)`.
- `idx_pain_corrective_pain_entry`: `(painEntryId)`.
- `idx_pain_corrective_exercise`: `(exerciseId)`.

Also assert `Exercises.coachingCues`, all three gallery enhancement columns with their verified definitions, replay columns, and `leads.scheduled_session_id → sessions.id`. Exact missing column definitions come from G0-SCHEMA, not guesses.

## Browser commands

From `frontend`, after C4 binds or creates its exact config:

```powershell
node ./node_modules/@playwright/test/cli.js test --config playwright.coach-completion.config.ts
```

Existing packet-specified configs:

```powershell
node ./node_modules/@playwright/test/cli.js test --config playwright.workout-logger-rest-adjust.config.ts
```

```powershell
node ./node_modules/@playwright/test/cli.js test --config playwright.coach-mobile.config.ts
```

Require owned `BASE_URL`, workers one, retries zero and no backend auto-start.

For each capability record route, actor fixture, admitted target, mounted element, user action, actual request, database readback where applicable, screenshot and source hashes.

Exact `curl` commands are **BLOCKED**, not omitted as unnecessary: the packet lacks complete route envelopes and auth fixture contracts. C0 must supply those before API acceptance commands are added.

## Union, full baseline and compiler

Union manifest:

```text
tmp/coach-remediation-20260913/zcode-union-args-final.txt
sha256: 8f7fb56712e65dda47c1f7c6ccd53dfa7140ec5f90aa81346b224f88d11034d5
```

The harness must batch explicit arguments below Windows limits and compare the union of batches with the manifest: no omission, duplicate or implicit discovery. Do not append a test already in the manifest.

Full-repository commands cannot be specified truthfully without G0-TEST’s package/runner inventory. An unfiltered Vitest run alone does not prove inclusion of native tests, excluded integrations or other packages.

Canonical frontend checks, from `frontend`:

```powershell
node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit --pretty false -p tsconfig.json
```

```powershell
node ./node_modules/vite/bin/vite.js build
```

A 12GB heap is an attempt on a suitable machine, not a guarantee that the historical OOM is resolved. No configuration exclusions may be added solely to obtain green.

## Traceability

| Requirement | Tests / evidence |
|---|---|
| C-R1 | C0 mount receipt + C4 browser/network/readback |
| C-R2 | Two PostgreSQL application suites + connection/teardown receipts |
| C-R3 | Migration completion suite + catalog/restore assertions |
| C-R4 | Created-thread composition and mounted browser tests |
| C-R5 | Real-router blocker suite |
| C-R6 | Memory/consent, Logger and mobile browser suites |
| C-R7 | Runner inventory, union manifest, full results, canonical compiler output |
| C-R8 | Line audit, owned diff and rollback record |
| C-R9 | Frozen evidence index and actual final decision receipt |

No tests were run, no output was fabricated, and no PASS is awarded by this plan.
