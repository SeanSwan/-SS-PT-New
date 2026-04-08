# OPUS CEO x CODEX DEBATE — TIER 5 COMPREHENSIVE PLAN — SUMMARY
## Date: 2026-04-08 | Status: CONSENSUS REACHED (Round 4)

### Outcomes
- 7 Tier 5 items planned with revenue-first priority ordering
- All effort estimates widened per Codex feasibility review
- Guardian vs. Crystalline billing semantics clarified (one-time donation vs. recurring)
- Dependency gaps filled: 6.1 Phase 0 prerequisites, 6.6 backend model, 6.7 node-cron reminders, 6.11 test tenant

### Agreed Priority Order
1. **6.1 Subscription Tiers** (5-7 days) + **6.9 Dashboard P0 Fixes** (concurrent)
2. **6.5 Nutrition Intelligence** (4-6 days) + **6.9 Widget Redesign** (depends on 6.1 paywall UX)
3. **6.8 Teach Me Mode** (3-4 days) + **6.6 Content Studio Phase 1** (6-8 days)
4. **6.6 Content Studio Phase 2-3** + **6.7 Calendar** (4-6 days)
5. **6.11 Playwright QA** (5-7 days) — runs last

### Key Decisions
- requireTier middleware centralized in one file, reads from JWT
- $5/day AI ceiling deferred to post-launch
- Barcode phased: BarcodeDetector first, WASM fallback later
- Playwright CI = Chromium primary, Brave optional local
- Admin-only session creation dropped (trainers keep scheduling)
- TIER_GATING_ENABLED feature flag for rollback safety

### Codex Corrections (Round 2)
- Widened all 7 effort estimates
- Added 6.1 Phase 0 (migration, Stripe IDs, webhook idempotency, auth payload)
- Clarified Guardian donation vs Crystalline subscription semantics
- Added backend model for 6.6 content calendar
- Added node-cron + fallback for 6.7 reminders
- Added test tenant isolation for 6.11

Full transcript: `debate-archive/OPUS-CODEX-DEBATE-TIER5-PLAN-2026-04-08.md`
