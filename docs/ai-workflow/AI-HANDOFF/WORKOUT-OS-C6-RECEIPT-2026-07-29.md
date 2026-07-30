---
decision: "C6 shipped: zero-LLM suggested-workouts composer on the shared safety spine (plan-wins stand-down), client no-plan surface + suggest_workout command, consent-gated stale-client nudge cron; Swan Lens seam wired into the Train active token per Sean's mid-build directive"
status: shipped
supersedes: none
---

# WORKOUT OS — C6 Receipt: Suggested Engine + Auto-Nudges (2026-07-29)

Branch `claude/workout-os-build-20260729`. Commits: `5a62d7344` (C6a) + this slice's C6b-d commit. C6.0 precondition VERIFIED shipped (no 7-day pain window anywhere in AI services).

## C6a — Composer (see 5a62d7344)
`buildSuggestedWorkouts` mirrors the guided-candidates ordering; **plan wins = full stand-down**; four fail-closed holds (unknown pain / review_required / missing Cortex policy vault / empty registry); 1-3 archetype sessions, underworked-focus ordering, cold-start conservatism + "coach will refine" label, template `whyRationale`. **Rule-58 defusal:** `resolveClientPainExclusions` extracted to ONE exported resolver in `coachDispatchEligibilityService`; chat gate + candidates refactored onto it (locked suites green). `GET /api/workout-builder/suggested/:clientId` behind default-off `ENABLE_SUGGESTED_WORKOUTS` (own flag — read-only compose must not ride the selfgen WRITE kill-switch); client self-scoped, trainer `assertAssignmentOrAdmin`.

## C6b — Stale-client nudge cron
`staleClientNudgeCron.mjs` copies the `automationCron` pattern exactly: default-off `ENABLE_STALE_CLIENT_NUDGES` kill switch, pure injectable `runStaleClientNudgeTick`, overlap guard, start/stop pair, lazy env-gated startup registration. Tick: clients with no completed session in `STALE_CLIENT_NUDGE_DAYS` (default 4, min 2) → ONE generic in-app envelope (`createNotification`, type `reminder` — in-app only; the notify path has no Telegram/email). **Consent:** `notificationPreferences.workoutReminders === false` is a hard opt-out. **Cadence:** cooldown via lookback for this cron's own envelope — never re-nudged inside the window. Envelope carries zero pain/body vocabulary (test-locked).

## C6c — `suggest_workout` Coach command
Registry entry (workoutCommands, read command, trainer/admin, requiresClientRef) + `suggestWorkout` dispatcher in `workoutReadDispatchers` (card-friendly flat summary; same env flag; holds reported truthfully) + commandDispatcher map wiring. Client self-access rides the UI surface, not the command (v1).

## C6d — Client surface
The C4b no-plan empty state IS the suggestion surface: on `no_plan` + self-mode it fetches the top suggestion and offers "Load this session" — each exercise flows through the logger's OWN `addExercise` entry-construction path via a typed adapter (`toLoggerExercise` → full `ExerciseSlim`). Crash-proof under partially-hydrated auth (typeof-guarded, promise-wrapped, silent degrade). Threaded WorkoutLogger → strip → panel (+2 props, shell cap honored).

## Swan Lens integration (Sean's mid-build directive)
All Workout-OS surfaces are var-chain tokened → Lens-rethemable by construction; the rings reuse the lens-aware `ProgressRing`. Gap fixed: `TRAIN.active` now carries the world seam — `var(--train-active, var(--world-accent, var(--accent-primary, #60C0F0)))` — so Lens world recipes drive the ACTIVE hue while `done`/`pr` gold and `coach` purple stay brand-fixed state semantics. Token contract updated-verified (19/19). No Kimi consult needed (mechanical seam alignment, in-repo precedent).

## Deferred with reason
Trainer "Suggested next session" panel + Push-to-plan (needs the server-side draft + opaque-id hydration pattern — own slice); milestone/lifetime-count badges tie-ins; suggestion analytics.

## Deploy checklist additions
`ENABLE_SUGGESTED_WORKOUTS=true` · `ENABLE_STALE_CLIENT_NUDGES=true` (+ optional `STALE_CLIENT_NUDGE_DAYS`).

## Gates
Composer 8/8 (real eligibility fns) · post-refactor chat-gate + candidates 18/18 · safety-spine confirmation 4 files/34 · nudge cron 6/6 · dispatcher contracts 18/18 · panel + adjacent 18/18 · **full WorkoutLogger dir 92 files/531 ×2 consecutive** (earlier single-fail proven a stale-worker flake; real interaction fixed with the partially-hydrated-auth guard) · token contract 19/19 with the Lens seam · node --check clean ×5.
