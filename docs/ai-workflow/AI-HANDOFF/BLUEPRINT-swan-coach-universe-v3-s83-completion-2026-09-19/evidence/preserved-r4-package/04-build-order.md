# File-by-file execution order

Existing application files are **not** recreated. NEW below means proposed, not present or executed.

Path aliases:

```text
FE = frontend/src/components/DashBoard/Pages/coach-assistant/
BE = backend/
PKG = docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19/
```

## Ordered scope

| Order / slice | Exact path | Responsibility, imports/exports, budget |
|---|---|---|
| 1 / C0 | `PKG/00-README.md` through `PKG/09-tests.md` as listed in this package | Operator saves nine supplied artifacts; each ≤300 physical lines. No runtime imports. |
| 2 / C0 | `PKG/evidence/source-bindings.json` — NEW | Operator-supplied source hashes, mount receipts, runner/config identities and ownership. No secrets. ≤200 lines; data only. |
| 3 / C1 | `backend/tests/helpers/coachTestDatabase.mjs` | Existing isolated connection; change only after G0-DB supplies exports. Preserve public API; ≤300 lines. |
| 4 / C1 | `backend/tests/helpers/coachTestDatabaseLoader.mjs` | Existing loader; admit only required real model paths. Do not redirect arbitrary imports. Exact exports from G0-DB; ≤300 lines. |
| 5 / C1 | `backend/tests/integration/coachMemoryPersistence.postgres.test.mjs` | Real memory atomicity/replay/ownership tests; import supplied real services/helper. Preserve existing cases; ≤300 lines or coherent fixture extraction. |
| 6 / C1 | `backend/tests/integration/coachConsentPersistence.postgres.test.mjs` | Real participating-writer concurrency tests; same helper; ≤300 lines. |
| 7 / C1 | `backend/vitest.coach-completion.config.mjs` — NEW only if necessary | Dedicated two-suite config extending verified existing setup. Default export; serial, retries zero; ≤100 lines. No guessed base-config import. |
| 8 / C1 | `docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/evidence/remediation-20260913/run-owned-postgres-matrix.mjs` | Canonical runner candidate. Packet also names a `tmp/` copy; operator must establish authority. No edit until bound. |
| 9 / C2 | `backend/tests/integration/coachMigrationCompletion.postgres.test.mjs` — NEW | Real chain/installed-history/interruption assertions; imports verified helper and approved migrations. ≤280 lines. |
| 10 / C2 | `backend/tests/helpers/coachMigrationCompletionFixtures.mjs` — NEW | Synthetic database-state fixtures only; no production data. Exact exports defined when missing schemas arrive; ≤250 lines. |
| 11 / C2 | `backend/tests/unit/migrationFkTypeCompat.test.mjs` | Preserve six tests; narrow misleading authority documentation; add coverage only for demonstrated scanner gaps. Existing Vitest pattern; ≤300 lines. |
| 12 / C2 | `backend/migrations/20260325000001-create-pain-entry-corrective-exercises.cjs` | Conditional interrupted-index repair. Preserve table/types/actions; `up/down` exports; ≤300 lines. |
| 13 / C2 | New forward migration, **path BLOCKED pending C2 decision** | Only if installed-history evidence requires it. Exact filename, DDL and rollback must be checkpointed before creation. No placeholder migration file. |
| 14 / C3 | `FE/hooks/useCoachCreatedThreadAdoption.test.tsx` | Extend real lifecycle tests; do not substitute them for mounted composition. ≤300 lines or split by lifecycle responsibility. |
| 15 / C3 | `FE/CoachCommandCenterPage.createdThreadCompletion.test.tsx` — NEW | Real composing layer/router/chat adoption path. Real bindings, controlled HTTP boundary; ≤280 lines. |
| 16 / C3 | `FE/hooks/useCoachSelectionNavigationBlocker.test.tsx` | First capture, malformed candidate, refusal and safe exits. Real data router. Preserve prior assertions. |
| 17 / C3 | `FE/hooks/useCoachCommandCenterSelection.ts` | Preferred existing composition entry for passing settler; G0-ADOPT determines actual location. Preserve existing exports; ≤300 lines. |
| 18 / C3 | `FE/CoachCommandCenter.controller.ts` | Wire actual committed observations if required; preserve public API and one owner; ≤300 lines. |
| 19 / C3 | `FE/hooks/useCoachCreatedThreadAdoption.ts` | Preserve existing implementation; edit only if its supplied API cannot support required settlement. ≤300 lines. |
| 20 / C3 | `FE/hooks/useCoachSelectionNavigationBlocker.ts` | Repair A1-11/A1-12 only after behavioral RED; keep separate discard/exit claims. Existing exports; ≤300 lines. |
| 21 / C3 | `FE/hooks/useCoachSelectionSettledAction.ts` | Correct hardening comment only; no second behavior refactor. Existing exports; ≤300 lines. |
| 22 / C4 | `frontend/e2e/coach-memory-consent-remediation.spec.ts` | Existing/planned mounted journey; bind actual runner/root first. ≤300 lines; synthetic users only. |
| 23 / C4 | `frontend/e2e/coach-created-thread-completion.spec.ts` — NEW | Mounted first-message completion and stale-operation case; ≤250 lines. |
| 24 / C4 | `frontend/playwright.coach-completion.config.ts` — NEW only if needed | Verified Playwright pattern, exact test matches, one worker, retries zero, owned BASE_URL, no backend auto-start; ≤100 lines. |
| 25 / C4 | `frontend/e2e/workout-logger-rest-adjust.spec.ts` | Reuse actual typed Logger/receiver/timer; preserve provider mock labeling. No production feature toggle. |
| 26 / C4 | `frontend/e2e/coach-command-center-mobile.spec.ts` | Add 375px and node-presence assertions if absent; retain existing matrix. |
| 27 / C4 | `frontend/src/components/DashBoard/UniversalDashboardLayout.styles.ts` | Conditional measured geometry repair only; ≤300 lines or approved cohesive split. |
| 28 / C4 | `FE/CoachCommandCenter.bridgeMobileDockStyles.ts` | Conditional corresponding viewport-height change; no z-index-only fix; ≤300 lines. |
| 29 / C5 | `PKG/evidence/verification-receipt.json` — NEW | Command/status/source/manifest references. No fabricated output. |
| 30 / C5 | `PKG/evidence/module-line-audit.json` — NEW | Complete tracked-module scope and changed/new-module subset; separate classifications. |
| 31 / C5 | `docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/README.md` | Replace active entry block, preserving historical sections. No false execution status. |
| 32 / C5 | `docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/77-open-findings-register.md` | Formal F3 disposition and precise residuals; operator supplies target section before patch. |
| 33 / C6 | `PKG/07-checkpoints.md` | Append actual review dispositions and immutable evidence references. Operator files hostile review separately. |

## Existing patterns available in the packet

- Structural types: `coachSelectionLifecycleTypes.ts`; type-only leaf, no runtime ownership.
- React lifecycle: supplied adoption contract and blocker; preserve effect/cleanup ownership, but do not copy the capture issue identified in A1.
- Static guard: supplied `migrationFkTypeCompat.test.mjs`; actual Vitest `describe/it/expect`, nonvacuous discovery and mutation RED.
- Sequelize model: complete `CoachFact` definition in `03-contracts.md`.
- Migration: supplied transactional `UserAchievements.up()` illustrates transaction plumbing, **not** an acceptable data-loss conversion.
- Styled-component and real route/controller examples: **missing**, required only before corresponding production edits.
- No chart changes: Victory implementation example is **N/A**.

## File-budget rule

Do not squeeze comments, minify or scatter helpers to satisfy 300 lines. If a named test needs separation, split by independently meaningful scenario families and record exact new paths before creation.

Do not edit the reported 543-line `coachFactService.mjs` opportunistically. If C1 reproduces a defect there, checkpoint a cohesive extraction and exact new interface first.
