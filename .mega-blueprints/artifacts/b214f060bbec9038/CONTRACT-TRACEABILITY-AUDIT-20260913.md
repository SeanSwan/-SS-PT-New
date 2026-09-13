# CONTRACT TRACEABILITY AUDIT — every `*.test.mjs` the repair contract names

**Date:** 2026-09-13 · **Checkout:** `tmp/worktrees/rolodex-luna-01a098de-20260913` @ `c0cbe538` (all changes uncommitted)
**Source of truth:** `docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/13-server-repair-contract.md` §8 (the traceability table and the acceptance command at line 311).

## Why this artifact exists

Two hostile reviews found the same class of defect twice: **the contract names a test file as an acceptance surface, and the file does not exist.** `bootcampTaughtIdempotency.test.mjs` (S-H29, line 303) was missing, and so was `sprintGenerationSemantics.test.mjs` (S-H20b, line 299) — in both cases the behaviour was covered *somewhere*, under a different name, which is exactly why nobody noticed. A reader following the contract could not verify either row.

So every `*.test.mjs` the contract names was resolved **by basename across the whole backend test tree**, and each miss was investigated rather than assumed.

## Result

**23 names extracted · 19 resolve to a real file · 4 do not.**

### Verified present (19)

| Named in contract | Resolves to |
|---|---|
| `bootcampAttendance.test.mjs` | `tests/unit/bootcampAttendance.test.mjs` |
| `bootcampAttendanceRouteSafety.test.mjs` | `tests/api/bootcampAttendanceRouteSafety.test.mjs` |
| `bootcampBrain.test.mjs` | `tests/unit/bootcampBrain.test.mjs` |
| `bootcampCommands.test.mjs` | `tests/unit/bootcampCommands.test.mjs` |
| `bootcampEquipmentProfile.test.mjs` | `__tests__/bootcampEquipmentProfile.test.mjs` |
| `bootcampGenerateStyleContract.test.mjs` | `tests/api/bootcampGenerateStyleContract.test.mjs` |
| `bootcampGenerationSemantics.test.mjs` | `tests/unit/bootcampGenerationSemantics.test.mjs` |
| `bootcampSubstitutionIdentity.test.mjs` | `tests/unit/bootcampSubstitutionIdentity.test.mjs` |
| `bootcampTaughtIdempotency.test.mjs` | `tests/unit/bootcampTaughtIdempotency.test.mjs` — **CREATED this session** (was missing) |
| `bootcampTemplateMediaRejoin.test.mjs` | `tests/unit/bootcampTemplateMediaRejoin.test.mjs` |
| `sprintCalendarContract.test.mjs` | `tests/unit/sprintCalendarContract.test.mjs` |
| `sprintGenerationSemantics.test.mjs` | `tests/unit/sprintGenerationSemantics.test.mjs` — **CREATED this session** (was missing) |
| `sprintRoutesSecurity.test.mjs` | `tests/api/sprintRoutesSecurity.test.mjs` |
| `workoutBuilderCandidateSafety.test.mjs` | `tests/unit/workoutBuilderCandidateSafety.test.mjs` |
| `workoutBuilderLongHorizon.test.mjs` | `__tests__/workoutBuilderLongHorizon.test.mjs` |
| `workoutPrescriptionProgression.test.mjs` | `tests/unit/workoutPrescriptionProgression.test.mjs` |
| `workoutProgressionService.test.mjs` | `__tests__/workoutProgressionService.test.mjs` |
| `assignmentTypes.test.mjs` | fragment of `workoutBuilderService.assignmentTypes.test.mjs` (present) |
| `postgres.test.mjs` | fragment of `rolodexServerRepair.postgres.test.mjs` (present) |

### Investigated misses (4)

| Contract row | Named file | Its SUBJECT module | Verdict |
|---|---|---|---|
| **S-H01/02** (line 289) — FK injection; late stretch/manifest failure; root/station/board reload | `tests/unit/bootcampTemplateTransaction.test.mjs` | `services/bootcamp/bootcampTemplateSave.mjs` — **exists** | **COVERED UNDER ANOTHER NAME — with a default-gate caveat on the reload phrase (T4).** `tests/api/bootcampTemplateSaveSafety.test.mjs` (20 tests, test names lines 140–347) asserts the write-side phrases: injected ids dropped, stationId resolved from the NEW station rows, malformed library id never persisted, exactly one managed transaction, caller-owned transaction used as-is, late child failure propagated, manifest keyed by persisted ids, empty class, zero timing preserved. **It asserts no read-back at all** — two independent greps (`reload\|refetch\|findByPk`, then `findAll\|find(\|readTemplate\|getTemplate\|list\|refetch`) return zero hits in that file — so the **reload half is asserted only by the opt-in real-PostgreSQL suites**: `tests/integration/bootcampTemplatePersistence.integration.test.mjs:218,234` and `tests/integration/rolodexServerRepair.postgres.test.mjs:241,342-364`. Those files are **excluded from the default gate** by `vitest.config.mjs:22` (`exclude: [… 'tests/integration/**' …]`), so the green `npm test` run recorded in the readiness receipt **does not prove the reload phrase**. Rollback is likewise real-DB only. |
| **S-H05** (line 292) — second memory write fails; regeneration throws; resume mixed slots; duplicated legacy key | `tests/unit/sprintGenerationAtomicity.test.mjs` | `services/bootcamp/sprintGenerator.mjs` + `sprintSlotWrite.mjs` — **exist** | **CLOSED this session.** The slot+union rollback half was already `tests/unit/sprintSlotWrite.test.mjs` (8 tests) plus the real-DB union case; the RESUME half had no owner, so the file was **created** with six cases (resume skips existing classes; remaining exposure retained; a failed class keeps the Sprint `draft`; a no-op run still releases the claim; regeneration keeps the old snapshot on a throw; the persist payload carries the ordinal week). |
| **S-H07/08** (line 294) — primary+secondary aliases gated; AND/OR truth table; rack survives bodyweight; strict constraint persists across bridge failure | `tests/unit/exerciseConstraintContract.test.mjs` | `services/exerciseConstraintContract.mjs` — **DOES NOT EXIST** | **SUBJECT NEVER BUILT.** The row's own module column (line 44) planned that file; the behaviour landed inside `services/workoutBuilderCandidateService.mjs` / `variationEngine.mjs` instead, and `tests/unit/workoutBuilderCandidateSafety.test.mjs` is where its safety is asserted. The named file cannot be written without inventing a module. **Recorded as a stale contract row**, not as missing coverage — any future reader must treat the row's file path as superseded. |
| **S-H04** (line 291) — two readers, A lease expires, B claims, late A success/finally/heartbeat; retry same/different hash | `tests/unit/sprintGenerationClaim.test.mjs` | `services/bootcamp/sprintGenerationClaim.mjs` — **DOES NOT EXIST** | **SUBJECT NEVER BUILT — and the row describes a design the code does not have.** There is no lease and no heartbeat: the implemented fence is a compare-and-swap on `generationVersion` in `sprintGenerator.mjs:89-98`, which the scoping pass verified by reading (and corrected its own earlier claim about). The outcome column ("one claimant; stale A performs zero writes") IS satisfied by that CAS and is asserted indirectly by `sprintGenerationAtomicity.test.mjs`'s status lifecycles; the lease/heartbeat phrases are **not implemented anywhere**. **Recorded as a stale contract row** so nobody hunts for a lease that was never written. |

## What this audit does NOT claim

* It does not claim the rows marked COVERED are exhaustively proven — only that each named phrase has a real assertion behind it, with the file named so a reader can check.
* **T4 — "covered" does not mean "covered by the default gate."** For S-H01/02 the reload and rollback phrases are proven only by suites that `vitest.config.mjs:22` excludes from `npm test`; they run only under `vitest.integration.config.mjs` with `S06_INTEGRATION_READY=true` against the owned disposable fixture. Read every COVERED row as "an assertion exists", **not** as "the recorded green default run exercised it". The two runs are reported separately in the readiness receipt for exactly this reason.
* It does not claim the two stale rows are harmless: S-H04's lease/heartbeat language and S-H07/08's module name are **contract text that does not match the built system**. If either capability is wanted, it needs its own acceptance contract — the same conclusion the H20 `manual_protocol` row reached.
* No production database, migration or deployment was involved. The only database touched is the owned disposable fixture on `127.0.0.1:55089`, and the real-DB suites leave it as they find it.
