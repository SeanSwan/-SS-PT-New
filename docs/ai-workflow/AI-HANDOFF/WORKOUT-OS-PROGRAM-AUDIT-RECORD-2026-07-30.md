---
decision: "Rule 48 audit record — SWA-100 Unified Workout OS program, C0-C8a (C8b deferred): one logger, one planner, activated completion loop, suggested engine, resilience + data convergence"
status: shipped
supersedes: none
---

# WORKOUT OS PROGRAM — Rule 48 Audit Record (2026-07-30)

## 1. Phase header
**Phase:** SWA-100 Unified Workout OS, slices C0-C8a (C8b guide-engine port deferred to its own session per the plan's sequencing clause). **Scope:** one training continuum per role — nav truth, dead-surface excision, logger state language + billing gate, completion/charts activation, session resilience + Today hero, data convergence, suggested-workouts engine + nudges, planner consolidation, demo sandbox. **Dates:** 2026-07-29 → 07-30, one session, ~12 build turns. **Reviewed by:** Fable 5 (builder + Final Decider), Kimi K3 (plan review, pre-build), per-slice hostile dry-loops, 2 executor agents (orchestrator-verified). Codex launch-core audit ran in parallel but posted no workout findings before close (fold-in check satisfied-empty). **Verdict:** SHIPPED (batch push at session end).

## 2. Files involved (by slice; full lists in the per-slice receipts, all in this directory)
- **Plan artifacts:** UNIFIED-WORKOUT-OS-FABLE-BLUEPRINT (§12 plan + §13 HR-1..14 rulings ledger), KIMI review + independent plan, WORKOUT-OS-C0/C1/C2-BILLING-MATRIX/C3/C4/C5/C6/C7 receipts.
- **C0** (04085753a): dashboard-tabs.ts, Admin/Trainer sidebars (+3 files).
- **C1** (383022e2b): −67 files (dormant /workout stack, WorkoutBuilder page, outlet wrapper, mobile placeholder); services/types relocation; LegacyWorkoutRedirect in main-routes.
- **C2** (8691e4d35): styles/train-tokens.ts (NEW), ExerciseSetRow* (3-state language), billing-matrix gate doc.
- **C3** (e4b79f1d3, 471ce5727, 7b4e155a8, 893bd2397, 21bc0bce2): receiptPrHandoff route suite (NEW), badgeGamificationBridge.fireWorkoutBadgeChecks, workoutXpAwardStep + dailyWorkoutFormRoutes badge wiring, 20260729-seed-workout-badges.mjs, WeeklyRingsCard + clientWeeklyRings.logic (NEW), deprecated chart family deletion (5 stubs, 10 routes, dormant hook).
- **C4** (37f1d9a81, 9cd2687fa, 1fc794675, dc80ba090): useWorkoutDraft peek + draft-wins gate, WorkoutDraftGateBanner (NEW), useWorkoutSubmit 409 preservation, advisory lock in dailyWorkoutFormRoutes, WorkoutLoggerEmptyPlanState (NEW), loader outcome reporting, ClientTodayHero (NEW).
- **C5** (70af2a41d): workoutService write-freeze (−177 ln), workoutSessionController deleted, inspect-workout-set-store-drift.mjs (NEW).
- **C6** (5a62d7344, e9530465a): suggestedWorkoutService (NEW), resolveClientPainExclusions extraction, /suggested route, staleClientNudgeCron (NEW) + startup registration, suggest_workout command (registry/dispatcher/wiring), empty-state suggestion surface, TRAIN.active --world-accent Lens seam.
- **C7** (c6593f026, d8a64122e, 72d80656e): plannerViewMode (NEW) + header toggle, Forge retirement (−10 files incl. 4th dead builder, redirects, 17 edits), plannerGold (NEW) + 47-decl hoist.
- **C8a** (7874bcc22): 20260730-seed-demo-client.mjs (NEW).

## 3. Architecture & runtime flow
One continuum: nav (C0) → logger (C2/C4 states + resilience) → canonical save `POST /api/workout-forms` (advisory-locked, C4) → post-commit XP → badge sweep (C3) → handoff/celebration (flag) → charts/rings (C3) → suggested next session when no plan (C6, shared safety spine: context → ONE pain resolver → blocking gate → readiness → verdict-filtered pool) → planner (C7: Guided default, one authoring surface). Nudge cron (C6b) sweeps daily behind its kill switch. Demo sandbox (C8a) feeds the same canonical tables.

## 4. Security logic & posture (WHAT/WHY/HOW-IT-BREAKS)
- **pg_advisory_xact_lock on (clientId, date)** [C4]: blocks concurrent same-day double-writes where no unique index exists. Breaks if: a non-Postgres DB (lock fn missing → 500 — acceptable, prod is PG), or a second SAVE path skips the lock (freeze test + route ordering test guard).
- **Fail-closed suggestion holds** [C6]: unknown pain state / review-required gate / missing readiness policy / empty registry each HOLD — unknown never passes as "no pain". Breaks if a new consumer resolves exclusions locally instead of via `resolveClientPainExclusions` (the extraction exists precisely to prevent this; contract suites lock both existing consumers).
- **Consent + cadence on nudges** [C6b]: hard opt-out (`workoutReminders===false`), cooldown lookback, generic envelope (zero body vocabulary, test-locked), default-off env kill switch, in-app only.
- **Access gates on /suggested** [C6]: own default-off flag (never rides the selfgen WRITE switch); client self-scope; trainer `assertAssignmentOrAdmin`.
- **Badge idempotency** [C3]: post-commit-only firing (no phantom-streak awards), userHasBadge pre-check + DB `unique_user_badge_ownership` — double-award structurally impossible.
- **Billing untouched** [C2]: deduction is TARGET-based; ZERO money-path changes shipped; matrix doc awaits Sean's ruling on the owner-personal-logger credit burn.
- **Flag gates:** ENABLE_POST_SAVE_HANDOFF (Launch Control governed), ENABLE_SUGGESTED_WORKOUTS, ENABLE_STALE_CLIENT_NUDGES — all default OFF; the batch deploys dark.

## 5. Best practices applied
Rules 4 (extractions at every cap trip), 6+Lens directive (var-chain tokens; --world-accent seam), 8 (IDs-only in all docs/memos), 20 (sibling sweeps: fetch-once guard on both ring consumers; shared resolver across 3 gates), 26/27 (receipts per slice; pinned-contract discovery before nav edits), 34 (importer receipts before every deletion; celebration archive RECORDED not executed), 42 (backend audit at push), 45 (follow-up commits, never amend), 51/56 (exit-code-checked tsc; slice-vs-baseline disclosure), 58 (drift probes; ClientPainEntry via model), 70 (batch push), 73 (proof + dry-loops throughout).

## 6. Known limitations / non-goals
C8b guide engine deferred (own session). C2 owner-credit-burn + TrainerPermissions timing were Sean decisions — SWA-87 has since landed on main independently. Deferred-with-reason ledger: NOW-panel card stack (post-C7 design pass), draft payload v2, clientRequestId column + unique (clientId,date) index (prod probes first), 13-chart client surface retirement (coverage audit first), trainer EnhancedClientProgressView formData reader, trainer suggested-panel + push-to-plan, lifetime-count badges (enum migration), milestone-name badges (Milestone table probe), planner autosave, wizard absorption, per-trainer demo instances, admin rings parity, PostWorkoutCelebration+XPCounter archive (C9 follow-up with the XP-zone slice).

## 7. Performance & UX
Today hero + week strip = 1-tap primary action; suggestion loads into the logger through its own addExercise path (no new entry machinery); calm 3-state set colors end the noise; empty states end toast-only dead-ends; celebration/receipt light with ONE env var. All new fetches are once-per-mount, failure-silent.

## 8. Test coverage summary
Added/amended this program: route-level golden masters (receipt/PR/handoff/XP/badge/lock-ordering), write-freeze ratchet, composer 8, nudge 6, draft-gate + trainTokens + plannerGold + plannerViewMode contracts, hero/rings/empty-state component suites. Directory-scale proofs: WorkoutLogger 92 files/531 ×2, client-dashboard 277, planner 70/328 ×2, trainer-dashboard 15/62, cross-slice batteries per receipt. NOT tested in-session: authed browser journeys (SWA-94 credential-autofill hazard — deploy verification + Sean's on-device pass stand in).

## 9. Rollback plan
Everything user-visible is dark behind the 3 default-off flags → flags off = feature rollback with no deploy. Code rollback: per-slice `git revert` on the commit list in §2 (each slice is independently revertible; C1/C7c deletions restore via revert). Seeders are additive (badge rows deletable by name; demo user removable by email). The advisory lock + write freeze are behavior-preserving hardening — revert only with a specific regression in hand.

## 10. Future review hooks
1. Re-probe the same-day duplicate risk after real traffic: does the (clientId,date) unique index become safe to add (drift probe shows zero dupes)?
2. Audit the suggestion composer's outputs against a real client with active pain post-launch (spot-check exclusions held end-to-end in prod data).
3. Re-examine the nudge envelope + cadence after 2 weeks of ENABLE_STALE_CLIENT_NUDGES=true — complaint rate, opt-out usage, whether 4 days is the right threshold.
4. Verify the Launch Control postSaveHandoff flag interplay: env baseline vs any existing DB override row (a stale force-off row would silently defeat the env var).
5. 13-vs-15 chart coverage audit before retiring /progress/detailed (capability-preservation).
6. Check `.understand-anything` generated artifacts for stale Forge nodes — regenerate.
7. After SWA-87's model fixes: re-test the trainer edit_workouts permission path end-to-end (the fail-open helper in dailyWorkoutFormRoutes may now be repairable to fail-closed).

## 11. Review log
Kimi K3 pre-build review (20+ findings folded; 4 rejected with evidence) → Kimi independent plan → Fable three-way synthesis (§12) → pre-build hostile addendum HR-1..10 → per-slice dry-loops (every slice CLEAN×2; ledgers in turn closeouts) → mid-program checkpoint (tsc+build clean at C4) → HR-11..14 build-time rulings → executor-agent verification rounds (C7c/C7d) → this record.

## 12. Sign-off
Sean authorized the program 2026-07-29 ("full refactor authorization"; non-stop build directive). Commit SHAs in §2; batch push SHA recorded in the final session closeout. Next actions: Sean's deploy checklist (3 env flags, badge + demo seeders, drift probe) + the §6 decision queue.
