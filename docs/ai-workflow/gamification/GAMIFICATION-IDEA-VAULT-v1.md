# Gamification Idea Vault v1

**Date:** 2026-02-13  
**Status:** Working source of truth (starter set + expansion backlog)  
**Owner:** SwanStudios product + AI implementation workflow

## Purpose
This file is the canonical idea vault for gamification goals, awards, and unlock logic.
It converts the original brainstorm JSON into a cleaner implementation format so any AI can continue from one stable reference.

## Canonical Data Source
- Starter machine-readable catalog: `docs/ai-workflow/gamification/gamification-rewards.catalog.v1.json`

## What Changed vs Original List
1. Normalized field names (`spendRequiredUsd`, `rewardType`, `unlockRules`).
2. Added rollout controls (`phase`, `enabled`, `priority`).
3. Added moderation mode (`issuance`: `auto`, `admin_review`, `admin_award`).
4. Added anti-abuse notes for referral, social, and streak achievements.
5. Kept legacy IDs for continuity (`legacyId`).

## Shared Rules (Platform Guardrails)
1. No client-sensitive data in public badges/leaderboards.
2. Referral achievements require anti-fraud checks (unique payment method/device/IP heuristics + minimum activity).
3. Streak logic supports one grace day per 30-day window to reduce burnout pressure.
4. Admin/manual honors must create audit logs with `awardedBy`, reason, and timestamp.
5. Age-specific achievements must respect account age and privacy settings.
6. Monetized perks (discount/free pass) must respect checkout/session-credit policy and expiration windows.

## Achievement Status Model
- `planned`: Defined but not implemented.
- `active`: Implemented and available.
- `paused`: Temporarily disabled.
- `retired`: No longer earnable; remains in historical user records.

## Rollout Strategy
1. **MVP (`phase: mvp`)**: onboarding, streak, first referrals, core client/trainer/creator loop.
2. **Phase 2 (`phase: phase2`)**: advanced milestones, monetized perks, social depth.
3. **Phase 3 (`phase: phase3`)**: moderator honors, seasonal/community event mechanics.

## Legacy Coverage
The original imported list covered legacy IDs:
- User: `101-119`
- Client: `201-208`
- Trainer: `301-309`
- Creator: `401-409`
- Moderator: `501-504`
- Cross-role: `601-607`

The normalized JSON now includes all legacy IDs from the imported brainstorm list, grouped by phase (`mvp`, `phase2`, `phase3`) and rollout flags (`enabled`).

## First-Time Build Directions (for any AI)
1. Read this file first.
2. Read `gamification-rewards.catalog.v1.json`.
3. Validate current backend routes/controllers against catalog fields before coding.
4. Implement only `phase: mvp` items first.
5. Add tests for each unlock metric type before enabling achievements.
6. Update this vault and the JSON in the same PR whenever rules change.

## Open Product Decisions
1. Exact points-to-dollar conversion policy for redemption.
2. Whether creator monetization badges require payouts enabled in production.
3. Final eligibility rules for teen achievements (`14-17`) by region/compliance.
4. Whether `Year of the Swan` allows any grace-day policy.
