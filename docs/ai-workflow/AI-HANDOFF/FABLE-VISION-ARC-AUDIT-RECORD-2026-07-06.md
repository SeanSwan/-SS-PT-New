# FABLE VISION BUILD ARC — Rule-48 Audit Record (snapshot @ 2026-07-06)

## 1. Phase header

- **Phase:** Fable Vision Build Arc — money/data plumbing first, then logger/chart/picker elevation. Governing doc: `docs/ai-workflow/AI-HANDOFF/FABLE-VISION-BUILD-HANDOFF-PROMPT-2026-07-05.md` (v2, triple-hostile-reviewed rewrite of Sean's v1).
- **Scope covered here:** slices 0.1 → 2.1b (plus D1/D2 decision implementations and the archiver outage recovery). The arc is still running (1.5b next); this record is the phase-so-far snapshot so the posture is re-auditable even if the session ends.
- **Dates:** 2026-07-05 → 2026-07-06. **Builder:** Claude Fable 5 (SESSION-X, Sean-directed /loop, Final Decider per CLAUDE.md hierarchy).
- **Review state:** every slice self-hostile-reviewed (rule 61, ≤3 rounds to zero-new-findings); Codex REQs posted per slice in `.ai-workflow/coordination/review-queue.md` — **all still OPEN, no Codex verdicts returned yet** (rule 46 gap recorded per-commit). Sean sign-off: PENDING (see §12).
- **Verdict:** SHIPPED per slice; every slice §4.9 deploy-verified live on Render.

## 2. Files involved (by slice; all shipped to `main`)

**Slice 0.1 — server-side session-completion billing (473937503):**
- `backend/services/sessions/sessionCompletionBillingPolicy.mjs` (NEW) — flag-gated decision policy + waive audit payload builder.
- `backend/services/sessions/session.service.mjs`, `backend/routes/sessions.mjs` — flag-gated decision block; waiveReason forwarding on PATCH complete + PUT alias.
- `frontend/src/components/UniversalMasterSchedule/SessionDetailCompletionBillingPanel.tsx`, `useSessionCompletion.ts`, `sessionCreditEligibility.ts` — waive-reason UI, honest billing panel.
- `frontend/src/services/sessionService.ts` + `universal-master-schedule-service.ts` — dormant `deductSessionCredit:false` hardcodes REMOVED.
- `backend/scripts/diagnostics/unbilled-completions.sql` (NEW) — read-only reconciliation.
**Slice 0.2 — bootcamp Mark-as-Taught (1def94d0d):** `frontend/src/components/BootcampBuilder/BootcampTaughtPanel{,.styles}.tsx` (NEW), `frontend/src/hooks/useBootcampTaughtLog.ts` (NEW), `ClassPreviewPanel` mount; `backend/routes/bootcampRoutes.mjs` validation; `backend/services/aiChatService.mjs:1417` table-name drift fix.
**Slice 0.3 — pain-chart intelligence (c44755d6c):** `frontend/src/components/BodyMap/` 3-way merge — PainChartInsightPanel (+`.styles.ts`), painChartInsights engine, PainChartTrendFollowUp, BodyMapClientTargetSelector; FDA comfort-modifications disclaimer. Backup branch `pain-wip-backup` = d7e501559.
**Phase 1.1a — unified workout write path (87680741e):** `backend/controllers/adminWorkoutLoggerController.mjs` → `submitAiWorkoutLogAsDailyForm`; `backend/services/workout/workoutXpAwardStep.mjs` (NEW, idempotent XP); `backend/services/workout/workoutLogSourcePolicy.mjs` (NEW, plaud_merge class).
**Phase 1.5a — NBA extension + shared card (8d332d83d):** `backend/services/nextBestActionService.mjs` (rungs rest_day/plan_next/credit_nudge + constraints), `backend/services/nextBestActionContext.mjs` (NEW), `backend/controllers/progressPulseController.mjs`; `frontend/src/components/NextBestAction/NextBestActionCard.tsx` (NEW) mounted on user + client homes.
**D1/D2 (Sean-locked decisions):** `backend/services/nextBestActionService.mjs` LITE_RUNG_CODES tier; `backend/routes/clientAnalyticsRoutes.mjs` `/nba-lite` (ungated) + `analytics.teaser` gate on 2 teaser charts; `backend/config/tierCatalog.mjs` + `frontend/src/config/tierCatalog.ts`; `frontend/src/hooks/analytics/useProgressPulse.ts` lite fallback; `frontend/src/components/DashBoard/Pages/client-dashboard/lockedCard.tsx` (NEW) + grid wiring.
**Phase 2.1a — Save-Success moment (343467f71):** `frontend/src/components/WorkoutLogger/SaveSuccessPanel{,.test}.tsx` (NEW); WorkoutLogger deferred-onComplete rewiring; helpers extraction (`WorkoutLogger.helpers.ts`).
**Phase 2.2a/b/c — chart expand modals (bae222359 + follow-ups):** `frontend/src/components/DashBoard/progress-proof/ChartExpandModal{,.styles,.test}.tsx`, `ChartExpandDataTable.tsx`, `ChartExpandTrigger.tsx` (NEW); client-dashboard `expandRows.ts`, `setsRepsState.ts`, `prBars.tsx`; admin `AdminProgressChartsGrid.chartBodies.tsx` (NEW).
**Outage fix (507b7fe72):** `backend/package.json` archiver pinned `^7.0.1` (v8 ESM default-export break). **Quick win (fdcf9c88f):** `frontend/src/components/WorkoutManagement/ExerciseLibrary.tsx` limit 50→1000.
**Phase 2.3a — shared picker (00060f333):** `frontend/src/components/Shared/SwanExercisePicker/` (10 NEW: types/filters/styles/hook/SearchBar/List/shell + 3 tests); `frontend/src/pages/workout/components/ExerciseSelector.tsx` → adapter + contract-lock rewrite.
**Phase 2.3b — picker preview/sheet (f0c98c6a5):** `SwanExercisePickerPreview.tsx`, `SwanExercisePickerSheet.tsx`, `styles.overlay.ts` (NEW) + shell/List/types wiring.
**Phase 2.1b — share CTA + ghost re-apply (9f37c1710):** `shareWorkoutPost{,.test}.ts`, `WorkoutLogger.ghostReapply{,.test}.ts` (NEW); SaveSuccessPanel share section; `useProgressPulse.ts` promise guards.

## 3. Architecture & runtime flow (load-bearing chains)

- **Completion billing (0.1):** SessionDetailModal → useSessionCompletion → PATCH `/api/sessions/:id/complete` (waiveReason) → session.service `completeSession` → **flag OFF ⇒ byte-identical legacy branch**; flag ON ⇒ `resolveCompletionBillingAction` (server decides deduct/waive; explicit-false waive needs ≥5-char reason → amount-0 FinancialTransaction audit; same-day workout-form dedup) → response carries billing receipt → UI renders honest line.
- **NBA (1.5a/D1):** engine = deterministic rung ladder (nextBestActionService) + context (plan cursor, pain, next session, credits, hasTrainer, recentDays — all null-degrading). Paid: pulse endpoint enriched same round-trip. Free: `/nba-lite` serves LITE_RUNG_CODES only with analytics-free fallback. Frontend: NextBestActionCard self-fetches pulse → falls back to lite on 402/failure (`_isBackgroundRequest` keeps the FrostedPaywall closed on passive probes).
- **Save-Success → share (2.1a/2.1b):** logger 201 → `lastSaveResponse` state (navigation DEFERRED) → SaveSuccessPanel (sets/volume/streak/billing/plan/challenge) → optional one-tap share: composer-shape workoutData from live exercises → single multipart POST `/api/social/posts` (visibility 'friends').
- **Shared picker (2.3a/b):** useSwanExercisePicker wraps the existing useExerciseSearch worker (fetch `/api/exercises/library`, fuzzy search) + 300ms debounce + pure filter pipeline (excludeIds → equip/type → muscle → section) → virtualized List → mode config table drives filters/media/preview per surface; Preview lazy-fetches cues via `useExerciseTeachData` (`/api/exercises/:id/teach-mode`); Sheet = hardened overlay (portal/z-2200/scroll-lock/focus-return/Escape/reduced-motion). First adopter: workout-page ExerciseSelector (thin adapter, emit shape preserved).
- **Write-path unification (1.1a):** Path B (admin PLAUD/history) now writes through `submitAiWorkoutLogAsDailyForm` → DailyWorkoutForm truth + billing DECISION lane (plaud_merge suppressed) + plan advance + challenges + idempotent XP (workoutXpAwardStep, form-id key, single social auto-post).

## 4. Security logic & posture

- **Billing flag fail-closed (0.1):** `SESSION_COMPLETION_SERVER_BILLING_ENABLED` default OFF; unset/garbage ⇒ legacy. Blocks accidental billing-behavior change at deploy. Breaks if someone inverts the check or "cleans up" the legacy branch — flag OFF must stay byte-identical (contract-tested).
- **Waive audit (0.1):** every explicit non-deduction becomes an amount-0 FinancialTransaction (paymentMethod `session_credit_waive`) + reason — blocks silent revenue leaks. WHY: the arc's founding bug class. Breaks if a new completion path skips `resolveCompletionBillingAction`.
- **Server-derived role/identity:** NBA/pulse endpoints derive role server-side; credit balances never leave the server in free-tier lite responses. `/nba-lite` is deliberately ungated but serves only non-analytics rungs (D1 lock).
- **Tier gates (D2):** `requireFeature('analytics.teaser')` on exactly 2 teaser charts → 402 + upgradeUrl; global interceptor suppressed for background probes only (`_isBackgroundRequest`) — user-initiated fetches still paywall.
- **Share privacy (2.1b):** share CTA self-mode ONLY (trainers cannot post a client's workout); visibility defaults 'friends' (matches backend non-staff default); consent model: automated posts gated by `autoShareWorkoutsToFeed` (fail-closed), user-initiated shares exempt BY CONTRACT (`socialAutoPostConsent.test.mjs`).
- **PLAUD billing suppression (1.1a):** `plaud_merge` source class suppresses paid-session deduction until Sean classifies (T4-adjacent money decision stays human).
- **FDA/FTC copy:** pain constraints framed as "comfort modifications … not medical advice" (0.3, render-locked); NBA card carries permanent "Rule-based guidance … not medical advice" disclosure (1.5a, test-locked).
- **Rule 47/59 hygiene:** no secrets read/written; pre-commit secret scan clean on every commit (logged per-commit).

## 5. Best practices applied

Rules 2/3/6 (44px, dark-first, tokens+fallbacks) on all new UI; Rule 4 via extraction ratchet (WorkoutLogger 1268<1270; styles.overlay split); Rule 8 (IDs only); Rule 17/61 (hostile ≤3 rounds/slice, zero-new-findings convergence); Rules 26–31 (receipts before code — three false premises in the v1 handoff killed with receipts); Rule 20 sibling sweeps (e.g. `.then`-on-undefined class → useProgressPulse); Rule 42 pre-push backend audit every push; Rules 51/52/56 (bisect-verified baseline disclosures); Rule 58 drift catches (`bootcamp_class_logs`→singular; `recommendedRest` phantom field); Rule 62 gate (every slice traced to the core loop); §4.9 release-marker deploy verification (never `/health` alone) via dual-pattern chunk walker (`c:/tmp/chunk-walker.mjs`).

## 6. Known limitations / non-goals (deliberate)

- Billing flag still OFF — **Sean flips** after staging smoke; retro-deduction of the unbilled backlog needs his written approval (diagnostic SQL shipped, read-only).
- plaud_merge billable-or-not classification: Sean's call, one-flag flip.
- 2.3c/2.3d picker adoptions (bootcamp/logger) deferred: data-safe (same worker) but pure dedupe vs live surfaces; receipts banked in lane.
- 1.1b/1.1c (Path-A adapter, unique-index migration + backfill), 1.2 program bridge, 1.3 credit subsystem, 2.5 milestone share, D4 two-homes: named backlog, not silently dropped.
- Auto-post + manual rich share can coexist for one workout (product-accepted; revisit if feed feels spammy).
- Dormant-file deletions (Shared/ExercisePickerPanel.tsx, ExerciseSelector.styles.ts, most of ExerciseSelector.logic.ts) pending Sean approval (Rule 34).

## 7. Performance & UX considerations

One-tap actions throughout (share = 1 tap; preview open→add = 2 taps); 840-exercise library virtualized (~7 mounted rows) with worker-side search off the main thread + 300ms debounce; cues fetched lazily per exercise (bulk payload stays lean, 10-min server cache); charts render measured (ResizeObserver, 260–420px adaptive height); reduced-motion honored on every overlay; truthful loading/empty/failure states everywhere (library load-failure no longer blames user filters); Save-Success defers (never blocks) each mount's navigation.

## 8. Test coverage summary

Per-slice RED-first suites; headline counts at ship time: 0.1 backend 88 adjacent + 19 unit + 12 disclosure; 0.2 28+4; 0.3 BodyMap 17; 1.1a 181 across 17 suites; 1.5a engine 25 + adjacents 47 + frontend 250/251 (1 pre-existing, bisect-verified); 2.1a logger family 362 across 62 suites; 2.2a modal 6 + family; 2.3a picker 16 new / sweep 63; 2.3b family 27 / sweep 59; 2.1b logger+analytics **416/416 across 74 files with 0 unhandled errors** (pre-existing exit-1 noise fixed). NOT tested (named): live Stripe/webhook paths (out of arc), real-device mobile QA (viewport-level only), Render runtime env drift (probed via release markers instead).

## 9. Rollback plan

- Any slice: forward `git revert <sha>` on main (never force-push; §4.9 HALT doctrine). Shas in §2.
- Billing (0.1): flag stays OFF ⇒ no behavioral rollback needed; if ON and wrong: unset `SESSION_COMPLETION_SERVER_BILLING_ENABLED` on Render → instant legacy behavior, then revert at leisure.
- Picker adoption (2.3a): revert restores the old self-fetching ExerciseSelector (logic/styles files were left intact on purpose).
- Share CTA (2.1b): revert 9f37c1710; no backend surface shipped.
- archiver pin (507b7fe72): do NOT revert to ^8 without converting `galleryRoutes.mjs` to named exports; v8 boot-crashes the API (see §10).

## 10. Future review hooks (act on these)

1. When Sean flips `SESSION_COMPLETION_SERVER_BILLING_ENABLED`: run `backend/scripts/diagnostics/unbilled-completions.sql` before AND after; watch waive-audit rows land amount-0.
2. Re-audit the symmetric double-deduct hole: unlinked complete-then-log (0.1 residual) — needs the form↔session auto-link slice.
3. `/api/bootcamp/log` still has NO server-side dedup (client latch only) — add unique guard when bootcamp usage grows.
4. Sprint `confirmSlotUsed` writes no BootcampClassLog — freshness engine stays blind to sprint-taught classes.
5. Verify the picker's url-persistence (`spk_*` params) against any router that reads location.search reactively before the first non-ephemeral consumer ships (2.3c).
6. Feed duplication watch: if users report double workout posts, revisit manual-share vs auto-post coexistence (2.1b REQ item).
7. Amount-0 FT rows skew transactionCount/averageAmount analytics — filter follow-up named in 0.1 residuals.
8. CI import-execution smoke for backend route modules (archiver-class boot breaks are invisible to node --check + source-contract tests) — slice named, not yet built.
9. Codex verdict sweep: every arc REQ is still OPEN — fold verdicts when they land (rule 46 as amended).
10. Trial-semantics contradiction in the stale clientProgressIdentity lock needs Sean's ruling (pre-existing, bisect-verified).

## 11. Codex / AI review log

Rule 46 as amended 2026-06-10: Fable is Final Decider; Codex input mandatory-but-advisory. This arc: per-slice self-hostile reviews (2 rounds typical, findings fixed in-slice — e.g. recommendedRest phantom-field catch, lying empty state, `.then`-on-undefined class, D2 paywall-pop side effect); Codex REQs posted per slice (review-queue.md), verdicts pending; Gemini not consulted (design work followed the already-ratified house patterns — WorkoutDayDrilldown overlay, LeadCaptureDrawer geometry, Crystalline tokens); skipped-review gaps recorded in commit messages per rule 46 fallback.

## 12. Sign-off

**PENDING SEAN.** Arc still in progress (1.5b next). Ship shas: 473937503 · 1def94d0d · c44755d6c · 87680741e · 8d332d83d · 343467f71 · bae222359 · 507b7fe72 · fdcf9c88f · 00060f333 · f0c98c6a5 · 9f37c1710 (all §4.9-verified live). Next-action pointer: 1.5b coach/admin NBA views → then Sean's approval queue (billing flag flip · plaud classification · trial-lock ruling · dormant deletions) → phase-close sign-off updates this section.
