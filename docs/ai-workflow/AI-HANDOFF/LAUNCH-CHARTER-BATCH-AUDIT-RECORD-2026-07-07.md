# LAUNCH CHARTER BATCH — Rule-48 Audit Record (2026-07-07)

> One self-contained record for the whole launch-charter batch (charter v2 + v3), per Rule 48. Sub-phase detail lives in the per-arc sections. A future reviewer should be able to re-audit security, performance, and UX from this file alone.

## 1. Phase header

- **Phase:** Launch Charter batch — charter v2 (P0/P1/3/4/4B/5/6 buildable slices) + charter v3 (Plan-Ahead OS, History Backfill, PDFs, Mobile).
- **Scope window:** 2026-07-06 → 2026-07-07. Branch `claude/launch-charter-20260706`, 53 commits, rebased onto main `0593b30a2`, pushed as ONE batch (SHA range recorded in §12 at close).
- **Reviewers:** Claude Fable 5 (builder + Rule-61 self-review each slice + final all-slices review), Codex (hostile review acting on the 2026-07-07 17:58 review-queue REQ — 4 commits on the branch, all gate-APPROVED by Fable), Gemini not consulted this batch (documented gap per Rule 46 — post-hoc review welcome).
- **Verdict:** SHIPPED (pending §12 sign-off).

## 2. Files involved (by arc; counts approximate — `git log --stat 0593b30a2..<head>` is authoritative)

- **Truth/P0-P1:** VideoRoom fake-vitals removal; repo-wide credential scrub + `credentialPhrasing.contract.test.ts` lock; `services/priceVisibilityService` + gates across storeFrontRoutes/cart/session-packages/v2/offline/ACH; `content/marketingStats.ts` + contract test; legal pages `pages/legal/*`; `components/seo/SeoHead.tsx`; hero poster.
- **Logger (3c):** `WorkoutLogger/useWorkoutDraft.tsx`, `WorkoutLogger.supersets.ts`, `WorkoutLoggerVoiceImportSection.tsx`, backend `workoutLogUploadRoutes.mjs` (`resolveVoiceUploadScope`).
- **Plan-Ahead OS:** `services/planQueueService.mjs`, `backupPlanService.mjs`, `planBlendService.mjs`, `workout/historyBackfillService.mjs`; routes on `workoutPlanRoutes.mjs`, `adminWorkoutLoggerRoutes.mjs`, `clientAnalyticsRoutes.mjs`; models `HistoryBackfillRun.mjs`; UI `WorkoutPlannerBackupPanel/BlendDialog` + `HistoryBackfillDialog` (+styles/tests).
- **Charts:** `workout/workoutPrDetectionService.mjs` + `models/PersonalRecord.mjs`; ChartExpandTrigger mounts across `CanonicalProgressChartsGrid.*` (client) + `AdminProgressChartsGrid.*` (admin) incl. new `balanceCards/bodyCards/detailBars/chartBodies/effortCard` extractions; `chartDataController.mjs` (+`getEstOneRmTrendChart`, `getExerciseTimelineChart`); `ExerciseTimelineDrilldown.tsx`; `WorkoutHeatmapCalendar.tsx`; lens/types/mapper/sanitizer contract files.
- **Recovery/Mobility:** `recoveryBoardService.mjs`, `models/RecoveryCompletion.mjs`, `recoveryBoardController.mjs`, `RecoveryBoard/RecoveryBoardPanel.tsx`, `useRecoveryBoard.ts`, CES seeder + delegate migration, `adminComplianceHelpers` recovery14d.
- **PDFs:** `services/pdf/{swanPdfKit,progressReportPdf,workoutSessionPdf}.ts` (+tests), `buildProgressReportSections.ts`, `ProgressReportPdfButton.tsx`, plan-adapter refactor.
- **Mobile:** `docs/ai-workflow/references/MOBILE-VIEWPORT-MATRIX.md`, portable `tools/viewport-sweep/`.
- **Nutrition:** adherence utils/hooks + macroCharts panel, hydration weekStrip, scanner SPA-nav, 5.4 consolidation (`NutritionTabContent` Set-targets, trainer builder route, dead nav entry removed).
- **Migrations (run at Render build):** `20260707010000` personal_records · `20260707020000` CES seeder (+`030000` delegate) · `20260707040000` recovery_completions · `20260707050000` history_backfill_runs — all additive + idempotent (`to_regclass` no-op guards).
- **Infra/docs:** AGENTS.md byte-exact mirror + `scripts/sync-agents-mirror.mjs`; `backend/scripts/inspect-launch-migrations.mjs` deploy probe; model-cache registration (`models/associations.mjs`, `models/index.mjs`).

## 3. Architecture & runtime flow (the load-bearing paths)

- **Workout write path (single writer):** UI/logger or adapter → `POST /api/workout-forms` (dailyWorkoutFormRoutes) → billing decision → session transition → **PR detection (sync, pre-201, never-fail try/catch)** → challenge bridge (lazy import) → XP → response carries `prEvents` → SaveSuccessPanel celebration. The AI/voice/backfill lanes reuse `submitAiWorkoutLogAsDailyForm`, whose `workoutLogSourcePolicy` suppresses paid-session deduction / plan advancement / engagement side-effects for `ai_generated_backfill`.
- **Price privacy:** `GET /api/storefront*` runs priceVisibilityService per request (admin/trainer short-circuit; else UserFeatureFlag `store-prices` lookup; **fail-closed** on any error) → strips training-package price fields + `pricesVisible:false`; purchase rails 403 for non-granted callers before any Order/PaymentIntent write.
- **Plan-Ahead:** planner UI → `/api/workout-plans/backup/:userId` (verdict) / `/generate` / `/:id/promote-backup` (transaction: old primary archived, backup promoted) / `/blend` (A-side param-shim → `verifyClientAccessByPlanId`; service re-verifies both plans share one client, writes a NEW plan, sources immutable).
- **Backfill:** admin/trainer router (`protect` + `authorize(['admin','trainer'])`) → preview (pure, nothing persisted; conflict dates excluded) → commit (attestation ≥10 chars → unified adapter per day under the suppressed source → `history_backfill_runs` row with `created` map) → undo (transactional delete logs→sessions→forms from the run's own `created` map only; `undoneAt` prevents replay).
- **Charts:** 15 canonical ids fetched in parallel (`CANONICAL_CHART_IDS` four-place contract: ids/routes/types/mapper) → sanitizers → grid; 402 ⇒ `lockedChartIds` ⇒ upsell card (server-driven tier truth); expand modal renders the SAME row-builders the PDF report uses (one truth per metric).

## 4. Security logic & posture (WHAT it blocks / WHY / HOW it breaks if mishandled)

1. **Price gate fail-closed** — blocks price disclosure + purchases for non-granted users. Breaks if: a new purchase rail forgets the gate (sweep locked offline+ACH; add the gate to ANY new rail), or if `getModels()` inside the service is mocked without User+UserFeatureFlag in tests (masks grant state — Codex receipt in `68954fe83`).
2. **Voice upload self-only scope** — client/user role may upload ONLY for self (`resolveVoiceUploadScope` 403 on any other clientId, in-handler multipart check). Breaks if a new upload route trusts body clientId. IDOR suite locks it.
3. **Backfill attestation + suppression** — blocks fabricated history from billing/XP/streak/PR-points; trainer text attestation is the accountability artifact stored on the run. Breaks if a caller writes days through the canonical route instead of the adapter (canonical route bills) — the admin router only exposes the adapter path.
4. **Promote/blend access** — all plan routes chain `protect` + trainerOrAdmin + `verifyClientAccess*`; blend re-verifies both sources share one client (blocks cross-client data mixing). Breaks if a new plan route mounts after `/:id` (Rule-31 order test-locked for `/backup/*`).
5. **PR award idempotency** — ledger key `pr:{user}:{ex:60}:{metric}:{date}` prevents double-award on retry/replay; `awardPoints=false` for backfill. Breaks if key inputs change shape (60-char slice collision is accepted risk — two exercises sharing a 60-char prefix on the same day/metric would collide; review hook below).
6. **Recovery completions** — XP-light idempotent (`findOrCreate` on user+key+date), never billable, never advances plan cursor. FKs PascalCase "Users" (house gotcha); the dormant lowercase-`users` CASCADE table was explicitly REJECTED (data-reset hazard class).
7. **Rule 8/59 posture** — PII: names never sent to LLMs (voice parser redacts; backup generation is deterministic, no LLM); the deploy probe prints structure/counts only; brainstorm/handoff docs use IDs.
8. **Share opt-in discipline** — RecoverySignals (pain) + body-comp cards carry NO feed-share; staff grids are PNG/copy-only (both contract test-locked).

## 5. Best practices applied

Rules 4 (extractions at every cap), 8/59, 20 (rail sweeps), 26/27 (receipts per slice in charter §11), 31 (mount-order walks + locks), 42 (backend audit at each commit + pre-push), 43 n/a, 44 (secret scan every commit), 45 (no amends — all repairs are follow-up commits), 46-as-amended (Codex hostile input, Fable gate), 51/52/56 (stash-A/B + baseline disclosure discipline throughout), 58 (schema probes: 908 exercises, "Exercises"/exercise_key, dual users tables), 61 (self-review each slice), 62 (strategy gate: every slice maps to the coaching loop), OWASP A01 (fail-closed gates), A04 (idempotency keys).

## 6. Known limitations / non-goals

- Weight/body-fat CLIENT routes remain ungated (pre-existing gallery consumers) — deliberate, documented at the route; Guardian gating = 1-line flip.
- Blend v1 = week-level picks (day-level + AI-suggested blend = fast-follow).
- Backup regen cadence is on-demand/staleness-verdict; no cron (v1 watchdog is compute-on-request by design).
- 5.6/3d/M.2b (authed visual QA), 6.2/6.5 (Sean's numbers/consent), Rule-34 deletions, CLAUDE.md staleness pass — deferred, listed in the handoff.
- PDF fonts are helvetica (jsPDF built-in) — brand typography embedding is a polish follow-up.

## 7. Performance & UX considerations

PDF modules lazy-load on tap (nothing in the main bundle); expand modal lazy-loads; 44px targets throughout incl. full-row Rolodex taps; reduced-motion respected (hero poster, celebration); honest empty/loading/error states on every new surface; two-tap promote confirm instead of a modal (fewer clicks, no hidden hover).

## 8. Test coverage summary

- Backend full suite: **5954 passed / 10 failed** — failing set byte-identical to origin/main baseline (gamification family, pre-existing; A/B worktree receipt).
- Frontend full suite: **5593+ passed / 39-40 failed**, all failing files verified failing IDENTICALLY at origin/main except one branch timeout fixed in `66526973b` (final confirmation run logged in §12).
- New locks added this batch: ~60+ tests (price contract, IDOR voice, plan-route order, blend payload, backfill attestation/undo, PR idempotency + suppression, chart registry/testids/no-share, PDF builders, heatmap grid math, nutrition set-targets).
- NOT tested: live OAuth/Stripe flows (unchanged), authed visual regression (M.2b deferred), real-device safe-areas.

## 9. Rollback plan

- **Code:** `git revert <first-batch-sha>..<head>` on main, push (Render auto-deploys the revert). No feature flags needed — all new surfaces are additive.
- **DB:** migrations are additive; leaving the three new tables + 8 CES rows in place is harmless under reverted code. Hard rollback: each migration has a `down()`; CES seeder `down()` deletes only its 8 keys + reverts its 6 retags.
- **Backfill data:** every run is undoable via `POST /api/admin/backfill-runs/:runId/undo` (also works post-rollback since it's data, not schema).

## 10. Future review hooks (specific)

1. Attack the PR ledger key: craft two exercises sharing a 60-char prefix; confirm collision behavior is acceptable or lengthen the slice.
2. Re-probe `store-prices` grant flow END-TO-END in prod (grant → see, revoke → hidden) — Rule-55 probe was not runnable pre-deploy.
3. Verify backfill undo against a run whose sessions were later EDITED by a trainer (do edits survive? should they?).
4. Confirm the est-1RM SQL's `LEAST(...,1500)` cap and reps 1-15 window still mirror oneRepMaxService if that service's constants change.
5. When physical products go sellable: revisit the price-display cosmetic gap ("By invitation" card copy vs payload).
6. Blend with plans whose weeks[] use `sessions` instead of `days` — composeBlendedPlanData handles both; keep it that way if planData shape evolves.
7. Re-run `node scripts/sync-agents-mirror.mjs --check` after any CLAUDE.md edit (wire into pre-commit if drift recurs).
8. The 10 pre-existing gamification test failures on main deserve their own fix arc (they mask real signal in every future full-suite run).

## 11. Codex / AI review log

- 17:58 REQ posted (review-queue) with the money-path ask list.
- Codex commits on-branch, each reviewed by Fable and APPROVED: `68954fe83` (P1-1 suites → grant contract + User-mock insight), `a7b66e592` (REAL adapter bug: logger missing import in PR catch — never-fail would have thrown), `de30687e5` (voice lock → 3c.3 scope contract), `66526973b` (credential-lock timeout).
- Fable final-review catches: `6c3ef013a` (model-cache registration — collection-killer), `6a2ccc355` (challenge-bridge lazy import — fixed a suite broken on main).
- Gemini: not consulted this batch (gap recorded per Rule 46).

## 12. Sign-off (completed at close)

- Push SHA range: _recorded at push_ · Deploy verify: _probe output + /health + 402 spot-check recorded post-deploy_ · Sean's close: _pending_.
