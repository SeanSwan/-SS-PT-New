# MASTER FIX PLAN — SwanStudios Site Refactor
## Generated: 2026-04-06 | Opus CEO + 15-Brain AI Village (2 runs) + Codex Debate
## Status: IMPLEMENTATION READY — Full consensus (Opus CEO + Codex + 15-Brain AI Village)

---

## Executive Summary

This plan synthesizes findings from:
- **Opus CEO deep analysis** of 5 strategy briefs
- **Opus-Codex recursive debate** (2 rounds, consensus reached — corrected 5 root causes)
- **AI Village Run 1** (11/16 passed, $0.33, 756s) — planning mode on briefs only
- **AI Village Run 2** (12/16 passed, $0.31, 574s) — re-run with 17 code files
- **3 consensus debates** (Security, Code Quality, Design) — all reached agreement
- **Backend root cause investigation** — traced every P0 500/404 to specific files

---

## Phase 0: P0 Blockers (IMMEDIATE — Fix Before Anything Else)

### P0-1: Movement Analysis 500 — Enum Mismatch (CORRECTED via Codex debate)
- **Root Cause**: Frontend (`TrainerAssessmentsPage.tsx:469`) sends `source: 'trainer_assessment'`. Backend model (`MovementAnalysis.mjs:63-67`) only allows `'orientation' | 'admin_dashboard' | 'in_session'`. Sequelize validation rejects the unknown enum value with a 500. Models are resolved via `getModel()` from the cache — exports are NOT the issue.
- **Files**: `backend/controllers/movementAnalysisController.mjs`, `backend/models/MovementAnalysis.mjs`, `frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerAssessmentsPage.tsx`
- **Fix**: Normalize incoming source value server-side:
  ```javascript
  const normalizedSource = req.body.source === 'trainer_assessment' ? 'admin_dashboard' : req.body.source;
  ```
  Or expand the enum if `trainer_assessment` is a real product concept (needs Sean's decision).
- **Risk**: Medium-to-high if enum expansion requires DB migration
- **Effort**: ~5 lines (normalize) or ~15 lines + migration (expand)
- **Verification**: `POST /api/movement-analysis` with `source: 'trainer_assessment'` returns 200/201

### P0-2: Sessions Upcoming/History 404 — Routes Missing Entirely
- **Root Cause**: Frontend calls `GET /api/sessions/upcoming/:userId` and `GET /api/sessions/history/:userId` but these routes DO NOT EXIST in `backend/routes/sessions.mjs`
- **File**: `backend/routes/sessions.mjs`
- **Fix**: Add two new route handlers:
  ```javascript
  router.get('/upcoming/:userId', protect, async (req, res) => {
    // Query sessions where date > now AND (trainerId = userId OR clientId = userId)
  });
  router.get('/history/:userId', protect, async (req, res) => {
    // Query sessions where date <= now AND (trainerId = userId OR clientId = userId)
  });
  ```
- **Effort**: ~40 lines
- **Verification**: `GET /api/sessions/upcoming/:id` and `/history/:id` return 200

### P0-3: Workout Plan Save 500 — Route Shadowing + Stale Service + Schema Drift (CORRECTED via Codex debate)
- **Root Cause (3-part)**:
  1. **Route shadowing**: `backend/core/routes.mjs:322` mounts `/api/workout` BEFORE `/api/workout/plans` at line 324. Express matches the broader mount first, so `POST /api/workout/plans` hits `workoutRoutes.mjs:342` instead of the intended `workoutPlanRoutes.mjs:157`.
  2. **Stale service code**: The active path (`workoutController.mjs:488` → `workoutService.mjs:1053`) references models without `getAllModels()` and uses legacy field names (`name`, `clientId`, `goal`).
  3. **Schema drift**: Controller whitelists `name`/`clientId`/`goal`/`days`, frontend sends `name`/`clientId`/`notes`/`days`, but the actual WorkoutPlan model expects `title`/`userId`/`nasmPhase`/`planData`.
- **Files**: `backend/core/routes.mjs`, `backend/routes/workoutRoutes.mjs`, `backend/controllers/workoutController.mjs`, `backend/services/workoutService.mjs`, `backend/routes/workoutPlanRoutes.mjs`, `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx`
- **Fix (3-part)**:
  1. Swap mount order: `/api/workout/plans` BEFORE `/api/workout` in `core/routes.mjs`
  2. Remove duplicate `POST /plans` from `workoutRoutes.mjs:342` (keep `POST /plans/:planId/generate` at line 363 — no replacement exists yet)
  3. Align the canonical `workoutPlanRoutes` handler with model schema
- **Risk**: High — affects saved data compatibility. Must choose canonical contract BEFORE UI work.
- **Effort**: ~50 lines across 3 files
- **Verification**: `POST /api/workout/plans` returns 200/201 with correct data persisted

### P0-4: Equipment Scan 500 — Missing API Key / Graceful Fallback
- **Root Cause**: `GOOGLE_API_KEY` env var missing or invalid. Handler at `backend/routes/equipmentRoutes.mjs:473` calls `scanEquipmentImage()` which depends on Google Vision AI.
- **Fix Options**:
  - A) Add `GOOGLE_API_KEY` to Render environment variables
  - B) Add graceful fallback when key is missing (return helpful error, not 500)
- **File**: `backend/routes/equipmentRoutes.mjs:490`
- **Effort**: ~10 lines for graceful fallback
- **Verification**: `POST /api/equipment-profiles/:id/scan` returns 200 or 400 (not 500)

### P0-5: RemotionTemplateGallery Crash — styled-components Error #12 (CORRECTED via Codex debate)
- **Root Cause**: `RemotionTemplateGallery.tsx:482` interpolates a `keyframes` object (`pulseGlow`) inside a plain template string instead of a `css` tagged template literal. This is styled-components error #12 — keyframes objects must be used within `css` helper, not string interpolation. The missing ErrorBoundary is a secondary containment issue, not the root cause.
- **Files**: `frontend/src/components/DashBoard/Pages/content-studio/RemotionTemplateGallery.tsx:482`, `frontend/src/components/DashBoard/Pages/content-studio/ContentStudioHub.tsx:122`
- **Fix**:
  1. Primary: Change line 482 to use `css` tagged template:
     ```tsx
     ${({ $selected }) =>
       $selected &&
       css`
         animation: ${pulseGlow} 2s ease-in-out infinite;
       `}
     ```
  2. Secondary: Add ErrorBoundary around the lazy-loaded tab in ContentStudioHub
- **Risk**: Low — isolated frontend fix
- **Effort**: ~5 lines (primary) + ~10 lines (boundary)
- **Verification**: Motion Templates tab loads without crash

### P0-6: StoreV3 Fallback Data — Runtime Data Issue (CORRECTED via Codex debate)
- **Root Cause**: Response-shape mismatch is NOT proven from static code. Frontend (`StoreV3.tsx:638`, `OptimizedGalaxyStoreFront.tsx:296`) uses tolerant parsing (`response.data.items || response.data.packages || response.data.data || []`). The more likely cause is empty or inactive StorefrontItem records in the database at runtime.
- **Files**: `backend/routes/storeFrontRoutes.mjs:84`, `frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx`, `frontend/src/pages/shop/StoreV3.tsx`
- **Fix**: 
  1. Runtime investigation: check `StorefrontItem` table for active records
  2. If empty: seed with real package data
  3. If populated but not returning: debug the query in storeFrontRoutes handler
- **Risk**: Low (investigation) to Medium (if data seeding needed)
- **Effort**: Investigation first, then ~10-30 lines depending on findings
- **Verification**: Storefront shows real packages, not fallback data

### P0-7: Mobile Workout Builder Unusable
- **Root Cause**: No 375px breakpoint in any workout builder styles. Exercise names in table use `{exercise.exerciseId}` with no truncation. Table uses `overflowX: auto` instead of card layout on mobile. Modal padding eats 48px+ of horizontal space. Touch targets below 44px on some elements.
- **Files**: 
  - `frontend/src/components/WorkoutManagement/ExerciseSelectionStep.tsx`
  - `frontend/src/components/WorkoutManagement/WorkoutPlanBuilderStyles.ts`
  - `frontend/src/components/WorkoutManagement/ExerciseLibrary.tsx`
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` (ADDED via Codex debate — live add/save failures surface here)
- **Fix**:
  1. Add `@media (max-width: 430px)` and `@media (max-width: 375px)` breakpoints
  2. Convert exercise table to card layout on mobile (copy ExerciseCardComponent pattern)
  3. Reduce modal/surface padding to 12px on small screens
  4. Enforce 44px min touch targets on all interactive elements
  5. Add text-overflow: ellipsis to exercise names
- **Effort**: ~100 lines across 3 files
- **Verification**: Workout builder usable on iPhone XR (375px viewport)

---

## Phase 1: Code Quality Fixes (AI Village Consensus — LOCKED)

### CQ-1: TabErrorBoundary Global Flag Bug
- **File**: `TabErrorBoundary.tsx`
- **Issue**: `window.__REACT_ERROR_BOUNDARY_REPORTED__` never resets — first error stops ALL subsequent reporting
- **Fix**: Instance-level `this.reported` flag instead of global
- **Source**: AI Village fix-instructions.md — CORRECTION 1

### CQ-2: Tab Sorting Type Safety Gap
- **File**: `dashboard-tabs.ts`
- **Issue**: `as TabKey` cast without runtime guard allows NaN comparators
- **Fix**: Mandatory `isValidTabKey()` guard with unknown-tab fallback
- **Source**: AI Village fix-instructions.md — CORRECTION 2

### CQ-3: OUTLET_ROUTES Duplication
- **Files**: `routes.ts`, `MasterDetailLayout.tsx`
- **Issue**: Hardcoded route strings drift from router config
- **Fix**: Derive from `MASTER_DETAIL_PATHS` single source of truth
- **Source**: AI Village fix-instructions.md — CORRECTION 3

### CQ-4: Auth Context Stability
- **File**: `AuthContext.tsx`, `MasterDetailLayout.tsx`
- **Issue**: `authAxios` recreated on every render
- **Fix**: `useMemo([token])` stabilizes; `AbortController` for cancellation
- **Source**: AI Village CRIT-01

### CQ-5: API Response Validation
- **File**: `api-types.ts`, `MasterDetailLayout.tsx`
- **Issue**: No runtime validation of API responses
- **Fix**: Zod `ClientsApiResponseSchema` validates full envelope
- **Source**: AI Village CRIT-02

### CQ-6: Render Props Stability
- **File**: `MasterDetailLayout.tsx`
- **Issue**: Four render props recreated every render, breaking memo
- **Fix**: `useCallback` on all four render props
- **Source**: AI Village CRIT-03

### CQ-7: Client Detail Remounting
- **File**: `ClientDetailView.tsx`
- **Issue**: `key={client.id}` causes full remount, losing scroll position
- **Fix**: Remove key; use `useEffect([client.id])` to reset tab state
- **Source**: AI Village CRIT-04

---

## Phase 2: Security Hardening (AI Village Consensus — LOCKED)

### SEC-1: Type Safety for Boot Camp Formats
- **File**: `frontend/src/types/bootcamp.types.ts`
- **Fix**: Add `classStyle` field to `StationFormat` discriminated union
- **Source**: AI Village security-plan.md

### SEC-2: Rate Limiting Expansion
- **Current**: Only AI endpoints rate-limited
- **Fix**: Add limits to `/api/auth/login` (5/15min/IP), workout logging (10/min/user), admin APIs
- **Effort**: ~30 lines in middleware

### SEC-3: CSP Headers
- **Fix**: Implement Content Security Policy:
  ```
  default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; img-src 'self' data: https:;
  ```
- **File**: Backend middleware or Render headers config

### SEC-4: IDOR Vulnerability Assessment
- **Issue**: Sequential integer IDs allow enumeration
- **Fix**: Authorization middleware on all data endpoints (verify user owns resource)
- **Note**: Full UUID migration is P3 (large effort, defer to roadmap)

### SEC-5: PII/PHI Data Minimization & Consent Review (Added via Codex debate)
- **Issue**: AI workflow features (Swan Coach, Gemini integrations) transmit health data without documented data minimization or consent mechanisms
- **Fix**: Audit all AI data flows for PII/PHI exposure, document what data is sent where, add consent tracking
- **Note**: Not a blocker for Phase 0-1, but must be tracked explicitly in Phase 2 so it doesn't get lost behind CSP/rate-limiting work

---

## Phase 3: UX/Mobile Refactor (AI Village + CEO Analysis)

### UX-1: Rolodex Pattern — Shared Component
- Create reusable `ContainedScrollList` component for exercise lists, coverage trackers, template browsers
- Bottom-sheet on mobile, side panel on desktop
- Replaces full-screen takeover pattern

### UX-2: Contrast Audit
- WCAG 4.5:1 minimum across all dark theme surfaces
- Specific fixes needed: form assessments, security workspace, marketing keywords, notification sliders
- Error color decision: **Frost Alert `#7DD3FC`** recommended (WCAG AAA 12.8:1, gender-neutral)

### UX-3: Navigation Consistency
- Standardize drawer/modal close behavior
- Add consistent back-button behavior
- Fix z-index stacking on overlays
- Auto-close admin sidebar on destination select

### UX-4: Dashboard Widget Consolidation
- Merge overlapping surfaces (workout builder + workout intelligence)
- Widget-based hub pattern for trainer dashboard

### UX-5: Real vs Mock Data Audit
- Identify all mock/fallback data in production
- Replace with real API data or clear "no data" empty states
- Security workspace: clarify real vs demo data

---

## Phase 4: Architecture Patterns (AI Village Consensus — LOCKED)

### ARCH-1: DB Transaction Locking Strategy
- **Rule**: LLM API calls NEVER inside database transactions
- **Pattern**: Generate outside → open transaction → read memory → write → commit → close
- **Source**: AI Village architecture-plan.md — F-04

### ARCH-2: SSE Reconnection Fix
- **Issue**: Current code passes closed EventSource to reconnect function
- **Fix**: New EventSource with `lastEventId` query param; backend replays missed events
- **Source**: AI Village architecture-plan.md — F-04

### ARCH-3: Exercise Memory SWR with Conflict Guard
- **Pattern**: `useExerciseMemory` hook with `isReadOnly` during active generation
- **Source**: AI Village architecture-plan.md — F-13

---

## Phase 5: Design System Lock (AI Village Consensus — LOCKED)

### DESIGN-1: Design Tokens CSS File
- Create `design-tokens.css` with locked Crystalline Swan tokens
- Add accessible animation tokens: `--color-swan-lavender-base: #50A0D0`, `--color-ice-wing-peak: #80E0FF`
- **Source**: AI Village design-specification.md

### DESIGN-2: Thinking Indicator
- Crystalline diamond shimmer (clip-path polygon, not rotation)
- Zero rotation transforms for GPU compositing
- Staggered animation: 0s, 0.2s, 0.4s

### DESIGN-3: Coach Assistant Chat UI
- Glassmorphism container, backdrop-filter blur 16px
- Coach bubble: Royal Depth bg + Ice Wing left border 3px
- User bubble: Carbon bg + Wing Purple right border 3px

### DESIGN-4: Sidebar Specs
- Desktop: 380px fixed, Carbon bg, Ice Wing hover border
- Mobile: 85vw / max 360px drawer, drag-handle iOS compliant
- 64px item height for touch targets

---

## Deferred (P2/P3 — Roadmap, NOT This Sprint)

| Item | Brief Source | Why Deferred |
|------|-------------|--------------|
| UUID migration for all PKs | AI Village Security | Large effort, needs migration plan |
| Unified AI terminal | AI-PRODUCT-STRATEGY | Feature build, not a fix |
| Teach Me layer | AI-PRODUCT-STRATEGY | Feature build |
| Tool consolidation | AI-PRODUCT-STRATEGY | Requires product decisions |
| Scheduling intelligence | AI-PRODUCT-STRATEGY | Feature build |
| Gamification V2 | AI-PRODUCT-STRATEGY | Already in separate roadmap |
| Feature flag system | AI Village | Infrastructure, not blocking |
| WebSocket SSE fallback | AI Village Architecture | Infrastructure concern |

---

## Execution Order

```
Phase 0 (P0 Blockers)     →  Day 1-2   →  Unblocks all other work
Phase 1 (Code Quality)    →  Day 2-3   →  Stabilizes existing code
Phase 2 (Security)        →  Day 3-4   →  Hardens before feature work
Phase 3 (UX/Mobile)       →  Day 4-7   →  Largest effort, most user-visible
Phase 4 (Architecture)    →  Day 5-7   →  Patterns for future feature work
Phase 5 (Design System)   →  Day 6-8   →  Locks visual system
```

---

## Codex Handoff Requirements

When handing off error/bug fixes to Codex:
1. **MUST provide**: CLAUDE.md + MEMORY.md index
2. **MUST enforce**: No Material-UI, no hardcoded colors, dark-first, 44px touch targets
3. **MUST prevent**: Adding README content to production site (past incident)
4. **MUST prevent**: Using retired Galaxy-Swan theme colors
5. **MUST enforce**: `type(scope): description` commit style
6. **MUST enforce**: Test locally before committing
7. **Codex scope**: Bug fixes and error resolution ONLY — no feature work, no UI redesign

---

*This plan is ready for AI Village validation (Run 3) with 25-debate max per phase.*
