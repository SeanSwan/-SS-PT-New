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
- add tests for workout, streak, social, and personal-record event mapping.

## Recursive review fixes

The first dock review found that every next-action button originally routed to workout logging. That was too blunt for low-health or low-happiness states. The dock now routes low-health companion states to Progress, low-happiness states to My Home, and momentum states to workout logging.

The rollout review found that the dock needed to be reversible on small screens and stageable in production. The dock now has a persisted collapse control and an explicit environment flag.

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

## Review checklist

- Works without a pet.
- Works with missing gamification data.
- Works on low-end mobile.
- Respects reduced motion.
- Uses positive copy.
- Maintains existing API compatibility.
- Shows one helpful next action.
- Feels SwanStudios-specific.
