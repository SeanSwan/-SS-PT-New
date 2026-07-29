---
decision: "C3 charts/completion activation: golden-master gaps route-locked; badge auto-award live on both lanes + 5 seeded badges; weekly rings built on the dead endpoint; deprecated chart family excised; handoff activation = Sean's one-switch deploy step; streak trend chart cut with evidence"
status: shipped
supersedes: none
---

# WORKOUT OS — C3 Receipt: Completion + Charts Activation (2026-07-29)

Branch `claude/workout-os-build-20260729`. Commits: `e4b79f1d3` (C3a), `471ce5727` (C3b), `7b4e155a8` (C3c), `893bd2397` (C3d).

## C3a — Golden-master gap-fill (HR-13)
`backend/__tests__/dailyWorkoutFormRoutes.receiptPrHandoff.test.mjs` (6 supertest cases): completion-receipt persistence (idempotency key + `dailyWorkoutFormId` + `workoutSessionId` asserted), `prEvents` through the 201 body, handoff on the body + fail-closed null degrade, `awardWorkoutXP` post-commit, badge sweep post-commit with the XP result.

## C3b — Badge auto-award (both dead-ends fixed)
Badges could never be earned for TWO independent reasons — no call site AND an empty-by-design `Badges` table. Fixed:
- `fireWorkoutBadgeChecks` (`badgeGamificationBridge.mjs`) fires `workout_completion` + `streak_update` (+`milestone_reached` with milestones) **POST-commit on persisted stats** from BOTH write lanes (`dailyWorkoutFormRoutes.mjs` setImmediate block; `workoutXpAwardStep.mjs` canonical-adapter lane). Phantom-streak awards impossible (sameDay/alreadyAwarded guards); double-award impossible (`userHasBadge` + DB `unique_user_badge_ownership`); never throws.
- Seeder `backend/seeders/20260729-seed-workout-badges.mjs`: 5 badges whose criteria the CURRENT evaluator provably satisfies — streak 3/7/14/30 (`streak_achievement.days`) + Full-Session Swan (`exercise_completion.count: 6`). Idempotent by name; requires an admin user for `createdBy`.
- **Deferred with reason:** lifetime workout-count badges need a `criteriaType` enum value (DB migration — its own slice); milestone-name badges blocked on unverified `Milestone` table content (Rule 58 — prod probe first).

## C3c — Weekly rings (dead endpoint → live widget)
`ring-weekly-source` had zero frontend refs. Now: `WeeklyRingsCard` on client Progress (above the canonical grid) — workouts/volume/minutes, THIS local Monday week vs trailing-3-week pace (self-referential truth, no invented goals), honoring the endpoint's TZ contract via client-side bucketing (`clientWeeklyRings.logic.ts`, DST-absorbing). Honest loading/error/cold-start states. Reuses the lens-aware `ProgressRing` primitive. Admin-side rings parity = follow-up (admin route exists).

## C3d — Deprecated chart family excised
5 empty stubs + 10 route mounts + the dormant zero-consumer `useClientAnalytics` hook (+ its import-lock test) + obsolete stub-contract tests deleted. The structural `deprecatedEndpointGuard.test.ts` KEPT — it blocks re-introduction on the canonical consumer surfaces.

## Rulings (deviations from §12, with evidence)
1. **Celebration:** the completion moment IS the post-save handoff (mounted, tested, dark). `Celebrations/PostWorkoutCelebration.tsx` renders async-XP data that cannot exist at 201-time (XP awards in setImmediate AFTER the response) — the structural reason it was never mounted. No second celebration built. Component stays dormant; **C9 archives it** per the recorded S-1.3 packet ruling; a lazy XP zone inside the handoff is the recorded follow-up (needs a read-your-award endpoint — own slice).
2. **Streak trend chart CUT:** per-day streak history isn't stored anywhere; charting it would fabricate. `streakDays` is already truthful on the Progress recap card and the handoff's StreakGoalModule. A streak-history ledger is a future slice if Sean wants the trend.
3. **Handoff activation is Sean's switch, not a code-default flip:** the flag is a governed Launch Control capability (server env baseline `ENABLE_POST_SAVE_HANDOFF` + DB override board + client runtime fetch). Flipping the code default would invert the fail-closed posture of the governance system. **Deploy checklist:** set `ENABLE_POST_SAVE_HANDOFF=true` on Render (server payload gate) — the client follows the same runtime flag automatically; or force-on in Launch Control (no rebuild). Kill switch: same switch, off.

## Deploy-time actions (batch checklist)
1. `ENABLE_POST_SAVE_HANDOFF=true` on Render (Sean — one env var; the whole completion moment lights up).
2. `node backend/seeders/20260729-seed-workout-badges.mjs` once on prod (needs an admin user present).

## Gates
Backend battery 8 files/59 tests (route contracts, bridge unit, step, XP unit, security lock) + ring-source 9/9 + schema-drift 46/46; frontend rings logic + Progress page 6 files/29 tests + guard/analytics 69/69; `node --check` clean on all touched backend modules. Full tsc/build re-run at batch gates.
