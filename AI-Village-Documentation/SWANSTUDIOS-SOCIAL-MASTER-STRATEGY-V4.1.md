# SwanStudios Social: Master Strategy & Execution Plan (v4.1 Polish)

**Role:** Principal Product Strategist + Social Systems Architect  
**Reviewer:** OpenAI Codex App (VS Code) - Final QA Gate  
**Last Updated:** February 27, 2026  
**Status:** Pre-Implementation Master Source

---

## 1. Purpose

This document is the implementation-grade source for SwanStudios Social. It consolidates product strategy, compliance gates, system architecture, moderation operations, performance targets, QA gates, and final polish requirements.

This revision adds one hard requirement that applies across the entire platform:

1. Global dark mode support must work end-to-end across:
- Marketing/public site pages
- Core app shell
- Social app surfaces
- Workout/training surfaces
- Admin/moderation surfaces

---

## 2. Non-Negotiable Product Directives

1. Safety before revenue. Phase 1 has no ads and no pay-to-win mechanics.
2. Phase 0 and 0.5 gates must complete before frontend social implementation.
3. Social must extend existing systems, not create parallel systems.
4. Moderation is defense-in-depth with provider cascade and human SLAs.
5. UI quality must follow Cinematic System Preset F-Alt (Enchanted Apex: Crystalline Swan).
6. Progression must use SDT + behavioral economics without toxic loops.
7. Features unlock progressively via Trust Score and account age.

---

## 3. Final Polish Additions (v4.1)

### 3.1 Global Theme System and Dark Mode

Dark mode is now a release-blocking requirement, not a nice-to-have.

#### Required Theme Modes

- `dark`
- `light`
- `system` (follows OS `prefers-color-scheme`)

#### Default Behavior

- Default for SwanStudios app surfaces: `dark` using Preset F-Alt tokens.
- Public marketing pages may default to `system`.
- User preference must override system preference.

#### Persistence

- Store preference as `ui_theme_mode` in user settings/profile.
- Mirror in local storage for pre-auth and fast restore.
- Hydrate theme before first paint to prevent flash-of-wrong-theme.

#### Token Architecture (No Hardcoded Colors)

All UI color usage must come from semantic tokens, never raw inline hex in feature code.

- `--bg-base`, `--bg-elevated`, `--bg-glass`
- `--text-primary`, `--text-muted`, `--text-inverse`
- `--border-soft`, `--border-strong`
- `--accent-primary`, `--accent-secondary`, `--accent-gold`
- `--success`, `--warning`, `--danger`, `--info`

Map these tokens to F-Alt palette values per mode.

#### Coverage Matrix (Must Pass Before Release)

1. Site shell: header, nav, footer, dialogs, toasts.
2. Social: feed, post composer, comments, profile, follows, notifications, challenges.
3. Workout/training: workout logger, schedule, sessions, progress cards, streak UI.
4. Admin: moderation queues, report detail panels, audit logs, settings screens.
5. Empty/error/loading states.
6. Charts and data visualizations.
7. Email-safe fallback colors for server-rendered templates where applicable.

#### Accessibility Constraints

- WCAG 2.1 AA contrast minimums in both dark and light modes.
- Keyboard focus visibility in both themes.
- `prefers-reduced-motion` support remains mandatory.
- Minimum touch target size remains 44x44.

#### QA Acceptance Criteria for Theme

1. Theme preference survives logout/login and browser restart.
2. No route in app falls back to hardcoded light palette in dark mode.
3. No unreadable text on any semantic surface.
4. No hydration flicker on first load.
5. Visual regression checks pass in both dark and light snapshots.

### 3.2 Missing-Work Visibility

This plan now includes explicit "open gaps" and release gates so implementation teams can identify what remains incomplete before merge.

---

## 4. Compliance and Legal Gates (Phase 0)

No schema work starts until these are approved.

1. COPPA 2025-compliant age gating and minor handling.
2. Guardian verification path for applicable minor flows.
3. Data map documenting collection, purpose, storage, access, retention.
4. Third-party SDK inventory and minimization.
5. Export and deletion rights with 30-day purge workflow.
6. Moderation audit retention (7 years) and legal-hold handling.
7. No behavioral advertising, no data resale.

Under-13 accounts are training/scheduling only with no social features.

---

## 5. Architecture and Data Model (Phase 0.5)

Social extends the existing `users` model and existing gamification stack.

### 5.1 Core Tables

- `social_posts`
- `social_comments`
- `swan_reactions`
- `swan_allowances`
- `social_follows`
- `social_profiles`
- `report_queue`
- `moderation_actions`
- `content_filter_log`
- `social_notifications`
- `ai_moderation_config`

### 5.2 Performance and Integrity Rules

1. Cursor pagination for feed endpoints.
2. Feed/index strategy optimized for created-at and relationship filters.
3. Redis for feed cache, rate limits, allowance cache, and background job orchestration.
4. Per-user rate limits for posting, comments, swans, follow churn, reports, and uploads.
5. S3 + CDN media pipeline with strict size/count limits.

---

## 6. Existing-System Integration (No Parallel Systems)

Social event writes must trigger existing gamification APIs and logic.

1. Swan received event awards XP via existing gamification endpoints.
2. Workout log social events update existing progress tracking.
3. Rest day social events preserve streak logic.
4. Achievement and challenge completions can auto-generate social posts.
5. Existing Stripe tiers and role hierarchy remain source of truth.

Source of truth modules remain:

- Existing `gamificationSlice` and `/api/v1/gamification/*` endpoints
- Existing user roles (`admin`, `trainer`, `client`, `user`)
- Existing workout/session and challenge infrastructure

---

## 7. Swan Economy and Trust Score

### 7.1 Swan Economy

1. 10 daily Swans base allowance.
2. Streak-based bonus Swans.
3. Mystery bonus probability event.
4. Weekly giver lottery.
5. No purchased Swans.
6. Hard anti-inflation cap enforcement.

### 7.2 Trust Score Progressive Unlock

- 0-30: restricted/read-only
- 31-49: limited posting only
- 50: standard social functionality
- 60+: links, discover eligibility, challenge joins
- 75+: challenge creation eligibility
- 90+: moderator-candidate tier

Trust score adjustments are tied to positive and negative behavior with moderation penalties weighted by severity.

---

## 8. Moderation Operations

### 8.1 Defense-in-Depth Layers

1. System blocks (rate limits, trust gates, URL policy).
2. AI pre-filter (provider cascade).
3. Community reports and auto-escalation logic.
4. Human moderation with SLA enforcement and appeals.

### 8.2 Provider Cascade

Primary and fallbacks:

1. Venice AI (privacy-first default)
2. Mistral Moderation
3. OpenAI Moderation
4. Google Perspective
5. Local regex/TF emergency filter (always on)

P1 double-check rule: severe flags require confirmation by second provider when available.

### 8.3 Human SLA Targets

- P1: under 1 hour
- P2: under 8 hours
- P3: under 24 hours

Appeals must route to a different reviewer than the original decision maker.

---

## 9. API Surface (Phase 1 Baseline)

### Social Core

- `POST /api/v1/social/posts`
- `GET /api/v1/social/posts/:id`
- `DELETE /api/v1/social/posts/:id`
- `GET /api/v1/social/feed`
- `POST /api/v1/social/posts/:id/comments`
- `GET /api/v1/social/posts/:id/comments`
- `DELETE /api/v1/social/comments/:id`
- `POST /api/v1/social/posts/:id/swan`
- `DELETE /api/v1/social/posts/:id/swan`
- `GET /api/v1/social/swans/allowance`

### Profile and Follows

- `GET /api/v1/social/profile/:userId`
- `PUT /api/v1/social/profile`
- `POST /api/v1/social/follow/:userId`
- `DELETE /api/v1/social/follow/:userId`
- `GET /api/v1/social/followers/:userId`
- `GET /api/v1/social/following/:userId`

### Notifications

- `GET /api/v1/social/notifications`
- `PUT /api/v1/social/notifications/:id/read`
- `PUT /api/v1/social/notifications/read-all`
- `GET /api/v1/social/notifications/preferences`
- `PUT /api/v1/social/notifications/preferences`

### Moderation/Admin

- `GET /api/v1/social/admin/reports`
- `PUT /api/v1/social/admin/reports/:id`
- `POST /api/v1/social/admin/bulk-action`
- `GET /api/v1/social/admin/moderation-log`
- `PUT /api/v1/social/admin/trust-score/:userId`

### User Reports and Privacy

- `POST /api/v1/social/reports`
- `GET /api/v1/social/reports/mine`
- `POST /api/v1/social/data/export`
- `POST /api/v1/social/data/delete`

---

## 10. QA Gates and Test Matrix

### Mandatory Automated Gates

1. `social-feed.spec.ts`
2. `moderation.spec.ts`
3. `onboarding.spec.ts`
4. `trust-score.spec.ts`
5. `rate-limits.spec.ts`
6. `swan-economy.spec.ts`
7. `accessibility.spec.ts`
8. Dark-mode regression suite across social + training + app shell.

### Manual/Visual Gates

1. Mobile (320px) and desktop (1024px+) layout validation.
2. Reduced motion behavior checks.
3. Contrast and focus checks in both themes.
4. F-Alt token compliance review.

---

## 11. Performance and Cost Targets

### Performance Budgets

- Initial feed load under 500ms
- Paginated feed under 300ms
- Post create under 1s
- Image upload flow under 3s
- LCP under 1.8s
- TTI under 2.5s on constrained conditions

### Cost Scaling

1. MVP: starter compute + starter DB + Redis + S3/CDN.
2. Growth: workerized feed and moderation workloads.
3. Scale: autoscaling web, HA DB, queue and cache expansion.

---

## 12. Monetization Gate

No monetization launches before 30 consecutive days of:

1. Toxicity Incident Rate under 1%
2. D30 retention over 20%
3. No unresolved P1 older than 2 hours
4. Moderation SLA compliance at 95%+

---

## 13. Open Gaps and Required Clarifications (Must Be Closed)

1. Final schema migration sequence and ownership for all new social tables.
2. Exact discover feed ranking policy for Phase 1.
3. Final trust-score threshold tuning values by policy owner.
4. Definitive provider timeout and retry policy per moderation tier.
5. Admin runbook for provider outages and emergency-only mode.
6. Final dark-mode token mapping file location in frontend architecture.
7. Snapshot test baseline for theme parity across social and training routes.
8. Release checklist owner for COPPA/CCPA evidence artifacts.

---

## 14. Delivery Order

1. Phase 0 compliance artifacts and approvals.
2. Phase 0.5 schema, API contracts, and moderation config tables.
3. Integration wiring into existing gamification and role systems.
4. Social core API + moderation pipeline.
5. Frontend social surfaces with global theme support.
6. End-to-end QA gates including dark/light parity.
7. Controlled rollout and KPI monitoring.

---

## 15. Definition of Done

SwanStudios Social is not done until all items below are true:

1. Compliance gates approved and documented.
2. All core APIs and tables implemented with migration safety checks.
3. Moderation cascade, logging, and SLAs operational.
4. Social events correctly drive existing gamification progression.
5. Global dark mode and light mode work across site, social, and training sections.
6. Accessibility and performance budgets pass.
7. QA gates pass with evidence.
8. Open gaps in Section 13 are resolved or explicitly deferred with owner/date.

---

## 16. Canonical References

1. `AI-Village-Documentation/CINEMATIC-WEB-DESIGN-SYSTEM.md`
2. `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`
3. `docs/ai-workflow/blueprints/WAIVER-CONSENT-QR-FLOW-CONTRACT.md`
4. `docs/ai-workflow/gamification/GAMIFICATION-MASTER-PROMPT-FINAL.md`
5. `docs/ai-workflow/AI-HANDOFF/MASTER-ONBOARDING-PROMPT.md`
