# SwanStudios Companion V2 GOAL Loop Ultra Upgrade

Date: 2026-07-01

## Goal

Upgrade the SwanStudios companion from a simple pet widget into a polished, wellness-first dashboard companion that grows with real user progress.

## Current repo surfaces

- `frontend/src/components/AvatarHome/CompanionPetPanel.tsx`
- `frontend/src/components/AdvancedGamification/components/CompanionPet/CompanionPet.tsx`
- `frontend/src/components/AdvancedGamification/components/CompanionPet/PetSprite.tsx`
- `backend/services/gamification/CompanionPetService.mjs`
- `backend/services/gamification/companionPetConfig.mjs`
- `backend/routes/gamificationRoutes.mjs`
- `backend/controllers/gamificationController.mjs`

## Product thesis

The companion should be a fitness familiar that reflects workouts, nutrition, recovery, streaks, social wins, level-ups, badges, and trainer-approved guidance. It should make the dashboard feel alive while staying lightweight, positive, and premium.

## Phase 0 changes

The first implementation pass upgrades the existing Avatar Home companion panel without changing backend schema:

- add one clear next-best-action message;
- add a visible bond/progression affordance;
- explain why the companion currently feels a certain way;
- make the visual shell more polished;
- keep the current API response compatible;
- keep the rendering cheap for low-end phones.

## Phase 1 changes

The second implementation pass starts the mounted client-dashboard companion surface:

- add a `CompanionV2Snapshot` contract for dashboard-ready companion state;
- add snapshot normalization tests;
- add `ClientCompanionDock` and styles;
- mount the dock in `ClientDashboardHomeTab`, the canonical `/dashboard/client/overview` surface;
- route empty companion state to Avatar Home adoption;
- route ready companion state to the next healthy action and My Home.

## Phase 2 changes

The third implementation pass hardens rollout and prepares event bridging:

- add local, per-user dock collapse persistence;
- add a `VITE_ENABLE_COMPANION_DOCK` rollout guard;
- add source-contract tests proving the dock remains mounted behind the guard;
- add backend `CompanionEventBridgeService` prep for mapping positive platform events into companion activity counters;
- add nutrition and recovery companion lanes so meal/recovery events can create visible companion progression;
- add tests for workout, nutrition, recovery, streak, social, badge, and personal-record event mapping.

## Phase 3 changes

The fourth implementation pass wires the companion event bridge into the shared idempotent point ledger:

- `GamificationPointsService.recordLedgerEntry` now schedules companion ledger events alongside realtime ledger events;
- companion updates are scheduled after transaction commit when a transaction supports `afterCommit`;
- duplicate ledger results, spend/expire transactions, and unknown sources do not increment companion counters;
- workout completion, streak bonuses, achievement awards, and milestone awards can now feed companion counters through one shared bridge;
- companion bridge failures are caught as non-blocking errors so primary gamification success is preserved.

## Phase 4 changes

The fifth implementation pass adds lightweight bridge observability:

- `CompanionEventBridgeService` now returns a `scheduled` or `skipped` summary for ledger events;
- summaries include the source and planned companion activity events;
- `GamificationPointsService` attaches this summary to the ledger result as `companionEvents`;
- scheduled records log compact success metadata through the injected logger;
- skipped events remain cheap and do not schedule unnecessary work.

## Recursive review fixes

The first dock review found that every next-action button originally routed to workout logging. That was too blunt for low-health or low-happiness states. The dock now routes low-health companion states to Progress, low-happiness states to My Home, and momentum states to workout logging.

The rollout review found that the dock needed to be reversible on small screens and stageable in production. The dock now has a persisted collapse control and an explicit environment flag.

The event-bridge review found that nutrition and recovery events would have been dropped or collapsed into unrelated activity lanes. The companion now has first-class `nutrition_logs` and `recovery_actions` counters and appearance triggers.

The ledger-wiring review found that patching the monolithic gamification controller directly was too risky. The integration now lives in `GamificationPointsService`, the existing idempotent point-ledger service used by workout, streak, achievement, and milestone awards.

The observability review found that bridge work needed response-safe metadata without waiting for async companion writes. Ledger results now expose scheduled/skipped companion summaries while the writes remain after-commit and non-blocking.

## Future architecture

Later phases should introduce:

- `CompanionProfiles` for first-class companion identity;
- `CompanionEvents` for idempotent event intake from workouts and gamification;
- `CompanionMemories` for user-visible safe preference summaries;
- `CompanionCosmetics` and `UserCompanionCosmetics` for unlockable appearance items;
- a richer `CompanionV2Snapshot` endpoint for one dashboard-ready state payload;
- render tiers: lite, SVG sprite, voxel sprite, optional Three.js.

## GOAL loop

GOAL means Ground truth, Observe, Act, Loop.

1. Inspect current code and docs.
2. Review the implementation against the product contract.
3. Ship the smallest improvement that makes the companion better.
4. Repeat until the phase has no open issues, then advance to the next phase.

## Current known blocker

GitHub Actions has repeatedly reported `startup_failure` before jobs are created. The available API returns no job logs or artifacts for those runs, so this is tracked as a repository workflow-startup issue rather than a visible companion test failure.

## Review checklist

- Works without a pet.
- Works with missing gamification data.
- Works on low-end mobile.
- Respects reduced motion.
- Uses positive copy.
- Maintains existing API compatibility.
- Shows one helpful next action.
- Feels SwanStudios-specific.
