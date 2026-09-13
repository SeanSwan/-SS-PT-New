# CONTINUATION STATUS — 2026-09-13 (b)

Supersedes the resume point in `CONTINUATION-STATUS-20260913.md`. Everything else in
that file still applies.

## LATEST (round 14 — read this first)

**Hostile review round 2 landed and falsified four of round 13's six claims**, including a
CRITICAL: admission required `station.stationIndex`, which the real generator never emits,
so **every station-based save was a 400** and only `full_group` could be saved. Fixed via
station ORDINALS (explicit index, else array position), locked by the new
`bootcampTemplateSaveRealShape.test.mjs`. Also fixed: blank-enum acceptance (`''`), int4
overflow including the `+4`/`+8` derivatives, uninspected allowlisted columns, error
messages echoing client input, and an internal fault reported as a 400.

Verified after those fixes: **backend 1222 files / 10046 passed, 6 skipped — exit 0**;
**real PostgreSQL 5/5 — exit 0**. Logs: `hf7-backend.log`, `hf7-integration.log`.

**Do NOT trust round 13's claim** that "admission rejects every value PostgreSQL would
reject mid-write" — that claim was false. It is corrected in the round-14 register.

## Where the work stands

Canonical checkout: `tmp/worktrees/rolodex-luna-01a098de-20260913`
(branch `codex/rolodex-luna-01a098de`, baseline `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`).
Nothing committed, pushed, migrated or deployed. No production resource touched.
Controller state `state-relocated.json` verified UNCHANGED at
`93a9e7becbda69c92a02e4fa957f2c100a27d3b32dd020ccf30139b1bafd7f26`.

## Verified green — as of this status

| Suite | Result |
|---|---|
| backend full (`npx vitest run`) | **1222 files / 10050 passed, 6 skipped — exit 0** |
| real PostgreSQL integration (`vitest.integration.config.mjs`, `S06_INTEGRATION_READY=true`) | **5/5 — exit 0** |
| frontend consumers — **re-verified round 16** | **256 files / 1555 passed — exit 0** |
| `tsc --noEmit` — **re-verified round 16** | **exit 0** |
| `vite build` | **exit 0** (round 12; no frontend/TS file changed since) |
| browser harness (Playwright, port 5317) | **11/11 — exit 0** (round 11; harness files unchanged since) |
| `git diff --check` | clean |

Logs in this directory: `hf3`–`hf10` backend/integration/frontend logs.

**Vacuous-assertion sweep: DONE and SCOPED (round 16).** Swept repo-wide; 3357
source-text + 1442 boolean matches are a deliberate convention (mostly
`not.toContain` absence-locks), NOT a defect class. The two genuinely vacuous tests
were in this workstream's own slices and are both rewritten. Do not re-open this sweep.

## Findings closed in rounds 13 / 13b

BE‑F3 (no value-domain validation → 500s), BE‑F3b (`STATION_FIELDS` named 8 non-existent
columns and missed the real `equipmentNeeded`, silently discarding every station's
equipment), BE‑F3c (sprint generator emitted an `intensityCategory` vocabulary that
violated the enum **and** scored 0 in its only consumer, while asserting it had prioritized
the pool), the `occurrenceId` non-column, BE‑F7 (`?? null` silently re-opening defect 2),
BE‑F8a (client `templateId` on `POST /log`), BE‑F8b (`PUT /spaces/:id` mass-assigning
`trainerId`), and `getBootcampRouteErrorResponse` being unable to express any 4xx.

New files: `bootcampTemplateRules.mjs`, `bootcampTemplateFields.mjs`,
`bootcampTemplateRows.mjs`, `bootcampTemplateDomainDrift.test.mjs`,
`bootcampLogAndSpaceSafety.test.mjs`.

## OPEN — 17 findings. NOT DRY.

`FINAL-HOSTILE-REVIEW-20260913.md` §OPEN is the register. Highest-value remaining:

1. **`weekId` / `slotId` normalization** (S08) — string-vs-number comparisons on child ids.
2. **`spaceProfileId` in `createSprint`** (S06/S07) — still unvalidated and unauthorized.
3. **`zero-rows` counted-not-observed** — a test that counts rather than observes.
4. **TZ test compares LA against the host clock**, not `TZ=UTC`.
5. **No supertest reaches `POST /api/bootcamp/save`** — route-level coverage gap.
6. **Frontend line caps** — `WorkoutPlannerBlendDialog.tsx` 333,
   `useExerciseSearch.test.tsx` 315, `bootcampRoutes.mjs` 449,
   `bootcampTemplateSaveSafety.test.mjs` 354,
   `bootcampTemplatePersistence.integration.test.mjs` 328, `sprintService.mjs` 302.
7. **Frontend F3–F7** — stale-during-retry unreachable; StrictMode double-fetch with a dead
   5-minute cache; `LIBRARY_COPY.refreshing` has zero consumers; V2 Undo toast never
   dismisses; preview/highlight desync can make Enter add a different row than previewed.
8. **S08 LOW** — `generateSprintClasses` loads children before comparing ownership;
   `regenerateSlot` reuses the raw `slotId` after authorization;
   `sprintGeneratorOwnership.test.mjs` is a denial-only fixture;
   `sprintAccess.test.mjs` contains certified dead code.
9. **Remaining H01–H30 register slices** — claim fencing, atomic memory union, durable SSE
   reconnect, taught-log idempotency (`confirmSlotUsed` is still non-idempotent **by
   design**), H20 progression/deload, H15–H18 frontend, H29 `ClassLog` migration.

## Disclosures carried forward

- **`bootcampRoutes.mjs` is 449 lines** (baseline 430). It was already over the 300 cap; I
  added ~20 lines to it. Pre-existing violation, now larger — it needs a route split.
- **`occurrenceId` is manifest-only.** No model and no migration declares the column, so the
  manifest's occurrence identity is **not durable after a reload**. Making it durable needs a
  migration, which this slice is not authorized to write.
- **Mid-write rollback coverage narrowed.** The integration test that proved a late child
  write rolls back the whole class now proves admission-time rejection instead, because
  BE‑F3 moved the check earlier. Whole-class rollback is still proven by the caller-owned
  transaction tests. Restoring direct coverage needs a synthetic CHECK constraint in the
  fixture DDL.
- **`occurrenceId` uniqueness is asserted only against a mock**
  (`bootcampTemplateSaveSafety.test.mjs:309`), so it does not prove durability.
- **Hostile review round 2 was IN FLIGHT when this status was written**
  (subagent `74998734-eefe-41ab-a629-a9dfc5f5f130`, attacking the round-13 code). Its findings
  are not yet folded in — treat round 13 as **reviewed by the author only** until they land.

## Fixture cleanup

The owned PostgreSQL fixture is **still running** (PID 79488, port 55089, datadir
`tmp/rolodex-postgres-s06-20260913`, db `rolodex_s06_test`). Data deliberately preserved.
Stop with `pg_ctl stop -D <datadir> -m fast` when S06 closes.
