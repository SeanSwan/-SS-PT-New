# SWAN COACH CONTINUITY HANDOFF - 2026-04-11

## Purpose
Use this file to restart Swan Coach work without losing phase history, current state, or next-step logic.

## Read Order For Next Chat
1. `CLAUDE.md`
2. `docs/ai-workflow/AI-HANDOFF/SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md`
3. `docs/ai-workflow/AI-HANDOFF/SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md`
4. Only then read the exact implementation files needed for the active slice

## Current Swan Coach Status

### Repo-verified complete through v13
The following slices were reviewed against live repo code in this session and are considered complete:

1. `v1` Hermes execution
- `create_hermes_task`
- `list_hermes_tasks`

2. `v2` Workout write
- `log_workout`

3. `v3` Workout read + honesty fix
- `view_workout_history`
- honest `not_wired` behavior instead of fake execution

4. `v4` Nutrition reads
- `view_nutrition_log`
- `view_macro_trends`

5. `v5` Nutrition write
- `log_meals`

6. `v6` Measurement read/write
- `view_latest_measurements`
- `log_weighin`

7. `v7` Pain slice
- `view_active_pain`
- `add_pain_entry`

8. `v8` Measurement trends
- `view_measurement_trends`

9. `v9` Destructive substrate + cancel flow
- `cancel_session`

10. `v10` Schedule reads
- `view_today_schedule`
- `view_today_sessions`
- `view_week_schedule`

11. `v11` Pain follow-up
- `resolve_pain_entry`
- `update_pain_entry`

12. `v12` Full measurement write
- `log_measurements`

13. `v13` Trainer availability read
- `view_trainer_availability`

### Live real-exec lane after verified v13
20 live command types:

1. `log_workout`
2. `view_workout_history`
3. `view_nutrition_log`
4. `view_macro_trends`
5. `log_meals`
6. `view_latest_measurements`
7. `log_weighin`
8. `view_measurement_trends`
9. `log_measurements`
10. `view_active_pain`
11. `add_pain_entry`
12. `resolve_pain_entry`
13. `update_pain_entry`
14. `cancel_session`
15. `view_today_schedule`
16. `view_today_sessions`
17. `view_week_schedule`
18. `view_trainer_availability`
19. `create_hermes_task`
20. `list_hermes_tasks`

## v14 Status — CONFIRMED LIVE (2026-04-11)

Repo-verified 2026-04-11 by Claude Sonnet:
- `backend/services/ai/dispatchers/nutritionDispatchers.mjs` ✓
- `backend/services/ai/dispatchers/availabilityDispatchers.mjs` ✓ (contains `create_availability_override`)
- `backend/services/ai/commandRegistry/scheduleCommands.mjs` ✓
- `backend/services/ai/commandDispatcher.mjs` ✓ — 214 lines (under 300 target)

v14 is complete. Do not re-verify.

## v15 Status — CONFIRMED LIVE (2026-04-12)

Repo-verified 2026-04-12 by Claude Opus 4.6 with hostile dual-pass review.

`view_available_slots` read-only command for trainer/admin voice lane.

### Verified surface area
- `backend/services/ai/dispatchers/availabilityDispatchers.mjs:240` — `dispatchViewAvailableSlots`
- `backend/services/ai/commandRegistry/scheduleCommands.mjs:71` — Zod schema, non-destructive, admin+trainer roles
- `backend/services/ai/commandDispatcher.mjs:69,175` — import + dispatcher-map entry (221 lines, under 300 target)
- `backend/routes/availability.mjs:64` — sibling REST route `/api/availability/:trainerId/slots`, same `parseDateOnlyLocal` validation
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts:160-166` — renders `availableSlotCount`, `firstSlotStartUtc`, `lastSlotEndUtc` into the result-card text (explicit "UTC" label carried through to user-facing output)
- `frontend/src/hooks/useTrainerAvailability.ts` — frontend trainer-availability read hook present in repo; included in the v15 surface-area sweep

### Verification evidence
- `backend/tests/unit/availabilityDispatchers.test.mjs` — 4/4 pass (trainer self-default, cross-trainer reject, invalid-date reject, empty-slot summary)
- `backend/tests/api/availabilityRoutes.test.mjs` — 4/4 pass (sibling REST route + impossible-date rejection + duration bounds)

### Review findings
- RBAC/defaulting contract matches v13/v14: trainer self-defaults to `ctx.user.id`, trainer-on-other rejects, admin must supply explicit `trainerId`
- Real calendar-date validation via `parseDateOnlyLocal` catches impossible dates like `2026-02-31` before the service call
- Duration bounded 15–180 min, default 60; schema aligned with REST route validation
- Empty-slot path returns honest flat nulls (`firstSlotStartUtc: null`, `lastSlotEndUtc: null`)
- Service has graceful fallback when `TrainerAvailability` table missing
- Sibling sweep: no other backend service callers of `getAvailableSlots` beyond the REST route and the voice dispatcher; frontend consumers accounted for above

### Deferred polish (NOT a blocker)
Output fields `firstSlotStartUtc`/`lastSlotEndUtc` slice position 11–16 of the service's ISO string. The service builds local-time dates via `buildDate` then `.toISOString()` converts to UTC, so on a non-UTC dev machine the displayed HH:MM is UTC wall-clock rather than the trainer's local time. Field names are honest (`Utc` suffix) and the frontend carries "UTC" through to the user-facing label. On UTC Render production there is no drift. Revisit only if Sean wants a local-time display on the result card.

v15 is complete. Next: trainer workout logging -> client dashboard visibility audit in the revenue-critical proof-of-value chain.

### Intended v14 scope
`exec-substrate-v14` should be:

1. Dispatcher extraction
- extract inline nutrition handlers from `backend/services/ai/commandDispatcher.mjs`
- create `backend/services/ai/dispatchers/nutritionDispatchers.mjs`
- get `commandDispatcher.mjs` comfortably back under 300 lines

2. Additive availability write
- add `create_availability_override`

### Correct v14 constraints
If the next chat finds v14 incomplete, these rules must still be enforced:

1. Do not expose `type: 'available'` in the voice command
- only allow blocking semantics
- use `blocked` by default
- optional `vacation` is acceptable

2. Add real command-local validation
- reject impossible dates like `2026-02-31`
- reject invalid times
- reject `endTime <= startTime`
- overnight windows are out of scope

3. Keep voice-lane RBAC/defaulting consistent
- trainer, no `trainerId` => default to `ctx.user.id`
- trainer, other trainer ID => honest RBAC error
- admin, explicit `trainerId` => allowed
- admin, no `trainerId` => honest error

## Remaining blocked / deferred command areas

### Availability / schedule
1. `set_availability`
- blocked
- live service is full-week destructive replace

2. `view_available_slots`
- clean read candidate
- likely after override write

3. `reschedule_session`
- blocked by session targeting resolution
- blocked by 409 conflict/alternatives path

4. `schedule_session`
- conceptually wrong in live code
- live route creates admin-only available slots, not booked client appointments

5. `FRONTEND_DISPATCH`
- still waiting
- depends on browser-local workout logger state, not server execution

## Revenue-critical product priorities after v14
Once the next safe Swan Coach slice is stable, priority shifts to the trainer workflow that drives retention and package value.

### Highest-priority business workflow
1. Trainer logs workouts reliably
2. Clients can clearly see logged workouts on client dashboard
3. Workout data populates the right charts and KPIs
4. Weight is logged weekly
5. Measurements are logged on the expected cadence
6. Schedule data and workout data feel connected
7. PLAUD transcript ingestion can flow into Swan Coach logging

### Why this matters
This is the workflow tied most directly to:
- client trust
- visible accountability
- retention
- upsell into premium coaching
- package justification at the top tier

## Premium package / gating vision
Swan Coach is intended to become a premium differentiator, not just a generic chat box.

### Direction
1. Highest package should get the deepest Swan Coach capabilities
2. Lower tiers can get narrower, fairer access
3. Free / donation level should be limited to a sensible subset
4. The system should feel operational and product-native, not like a public AI terminal

### Rule for future implementation
Every new workflow or site improvement should be checked for Swan Coach integration:

1. Can Swan Coach read it?
2. Can Swan Coach write it safely?
3. Does registry truth match route/service truth?
4. Does it need confirmation?
5. Does it need flat result rendering?
6. Does package gating need to apply?

## Concrete roadmap

### Now (v14 confirmed — next is v15)
1. Build `view_available_slots` (v15) — clean read, no destructive risk
2. Keep Swan Coach slice-by-slice until the safe command substrate is stable

### Next 3 slices after v14
1. `view_available_slots` if the repo confirms it is still the cleanest next read
2. Revenue-critical trainer workflow audit:
- workout logging -> client dashboard visibility
- chart truthfulness
- measurement cadence surfaces
3. PLAUD transcript ingestion path into Swan Coach / logging workflow

### After that
1. Premium gating / feature-tier alignment for Swan Coach
2. Client dashboard truth audit
3. Social/media/user dashboard audit
4. broader site-by-site operational audit, always checking AI compatibility

## First task in the next chat
Do this before planning anything new:

1. Read `CLAUDE.md` (Open Items section gives full picture)
2. Read this handoff file
3. v14 is confirmed live — skip re-verification, go straight to v15 planning
4. v15 target: `view_available_slots` — read the live availability service before writing any code

## Paste-ready restart prompt
Use the prompt in the current chat response, not this file, so it can be updated without editing the handoff doc every time.
