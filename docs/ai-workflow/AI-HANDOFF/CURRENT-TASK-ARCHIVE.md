# CURRENT TASK — Legacy Backlog Archive

**Archived:** 2026-02-15
**Source:** Extracted from `CURRENT-TASK.md` (lines 55-903, pre-2026-02-15 content)
**Purpose:** Historical reference only. The operational snapshot lives in `CURRENT-TASK.md`.

---

## LEGACY BACKLOG (ARCHIVE - PRE-2026-02-15)

**Current Phase:** PHASE 0 COMPLETE (BACKEND)
**Status:** COMPLETE
**Goal:** Replace disparate calendars with a single, MindBody-equivalent Universal Schedule.

### Decisions
1. Replace ALL existing schedule components once UniversalSchedule is ready.
2. Notification channels: Email, SMS, Push.
3. Implementation order: Backend and frontend in parallel.
4. Recurring limit: Max 52 occurrences or 12 months, whichever comes first.

### Phase 0 Completed (Backend)
1. Migration applied (universal schedule fields).
2. Recurring sessions with 52-cap + 12-month cap enforced.
3. Blocked time slots implemented.
4. Notification preferences + quiet hours implemented.
5. Smoke tests passed (COUNT=53, COUNT=3, block, quiet hours).

### Next Steps (Phase 1: UI)
1. Build `UniversalSchedule.tsx` + supporting components (Calendar, Modal, Recurrence UI).
2. Replace `AdminScheduleTab`, `TrainerScheduleTab`, `ClientScheduleTab` with UniversalSchedule.
3. Add Phase 1 wireframes + UI flow review before frontend implementation.

### Locked Files (Legacy — may no longer be active)
- backend/services/adminSpecial.test.mjs - Locked by ChatGPT-5 - Phase 6 Step 14 tests
- frontend/src/pages/shop/components/SpecialBadge.test.tsx - Locked by ChatGPT-5 - Phase 6 Step 14 tests
- frontend/src/pages/shop/components/PackageCard.test.tsx - Locked by ChatGPT-5 - Phase 6 Step 14 tests
- docs/ai-workflow/blueprints/STORE-PACKAGE-PHASE-6-REDESIGN.md - Locked by ChatGPT-5 - Phase 6 blueprint creation
- backend/migrations/20260201000003-restructure-packages.cjs - Locked by ChatGPT-5 - Phase 6 Step 1 migration
- backend/migrations/20260201000004-create-admin-specials.cjs - Locked by ChatGPT-5 - Phase 6 Step 3 migration
- backend/models/AdminSpecial.mjs - Locked by ChatGPT-5 - Phase 6 Step 4 model
- backend/models/associations.mjs - Locked by ChatGPT-5 - Phase 6 Step 4 associations
- backend/models/index.mjs - Locked by ChatGPT-5 - Phase 6 Step 4 model export
- backend/controllers/adminSpecialController.mjs - Locked by ChatGPT-5 - Phase 6 Step 5 controller
- backend/routes/adminSpecialRoutes.mjs - Locked by ChatGPT-5 - Phase 6 Step 5 routes
- backend/core/routes.mjs - Locked by ChatGPT-5 - Phase 6 Step 5 route registration
- backend/routes/storeFrontRoutes.mjs - Locked by ChatGPT-5 - Phase 6 Step 6 storefront specials response
- frontend/src/pages/shop/components/PackagesGrid.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 remove custom builder
- frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 remove custom package types
- frontend/src/components/ShoppingCart/ShoppingCart.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 remove custom cart items
- frontend/src/pages/shop/components/SpecialBadge.tsx - Locked by ChatGPT-5 - Phase 6 Step 8 special badge component
- frontend/src/pages/shop/components/__tests__/CustomPackageFlow.e2e.test.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 cleanup
- frontend/src/pages/shop/components/PackageCard.tsx - Locked by ChatGPT-5 - Phase 6 Step 9 specials display
- frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsManager.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsTable.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsModal.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/adminSpecials.styles.ts - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/adminSpecials.types.ts - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials route
- frontend/src/config/dashboard-tabs.ts - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials nav
- frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials nav

---

## PHASE 0: DATABASE FOUNDATION (ARCHIVED)

**Status:** COMPLETE (2026-01-15)
**Duration:** ~6 hours (including blocker resolution)

### Completed Tasks
1. Stage 1 migrations executed (5 client_* tables created)
2. OpenAI SDK installed
3. Model associations tested (74 User associations)
4. Seed data created (User ID 7)
5. AI Workout Controller validated (6 tests passed)

### Blockers Resolved
1. Fixed UUID/INTEGER migration mismatches
2. Skipped 3 legacy fix migrations
3. Cleared database locks (8 stuck processes)
4. Verified migrations 3-6 correct types

---

## PHASE 0.5: NASM PROTOCOL REFACTOR COMPLETE

**Status:** COMPLETE (2026-01-15)
**Owner:** Claude Code (Sonnet 4.5)

### Files Modified/Created
1. `docs/ai-workflow/blueprints/NASM-PROTOCOL-REQUIREMENTS.md` (NEW - 600+ lines)
2. `docs/ai-workflow/blueprints/ONBOARDING-FLOW-PART-2.mermaid.md` (UPDATED - NASM ERD)
3. `docs/ai-workflow/blueprints/ONBOARDING-WIREFRAMES-PART-2.md` (UPDATED - NASM UI)
4. `backend/migrations/20260115000000-add-nasm-fields-to-baseline-measurements.cjs` (NEW)
5. `backend/models/ClientBaselineMeasurements.mjs` (UPDATED - 9 fields + 3 methods)

---

## PHASE 1: CLIENT ONBOARDING BLUEPRINT

**Status:** PAUSED — Shifted to Universal Schedule System
**Owner:** ChatGPT-5 (Codex)

See full task breakdown in original archive. Key items:
- Onboarding controller endpoints (POST/GET questionnaire, movement screen)
- Admin data entry interfaces
- UX/UI protocol (P0/P1/P2 items from Gemini audit)
- Dashboard integration

---

## PHASE 2: DASHBOARD STREAMLINING

**Status:** PAUSED
**Key issue:** 7 duplicate client dashboard layouts. Keep RevolutionaryClientDashboard.tsx.

---

## PHASE 3: MOCK DATA ELIMINATION

**Status:** PAUSED
**Key issue:** 30+ components using mock data instead of database-backed APIs.

---

## PHASE 4: AUTOMATION & FOLLOW-UP SYSTEM

**Status:** PAUSED
**Key items:** Twilio SMS, Day 0-7 sequences, admin automation manager.

---

## PHASE 5: CLIENT MATERIALS & LAUNCH READINESS

**Status:** PAUSED
**Key items:** Pricing sheet, Fairmont parent onboarding script, storefront CSS.

---

## OVERALL PROGRESS TRACKING

| Phase | Status | Owner |
|-------|--------|-------|
| Phase 0: Database Foundation | COMPLETE | ChatGPT-5 + Claude Code |
| Phase 0.5: NASM Refactor | COMPLETE | Claude Code |
| Phase 1: Client Onboarding | PAUSED | ChatGPT-5 |
| Phase 2: Dashboard Streamlining | PAUSED | ChatGPT-5 |
| Phase 3: Mock Data Elimination | PAUSED | ChatGPT-5 |
| Phase 4: Automation System | PAUSED | ChatGPT-5 |
| Phase 5: Client Materials | PAUSED | ChatGPT-5 |

---

## FILES LOCKED BY CHATGPT-5 (Legacy)

**Client Data Integration - Stage 1:** All COMPLETE
**Client Data Integration - Stage 2:** All COMPLETE
**Phase 1.1 Onboarding Endpoints:** PAUSED (4 files locked)
**Pending Migration Execution:** NOT RUN

---

## COMPLETED LOGS

### 2026-01-27
- Universal Master Schedule Refactor (modularized into ScheduleHeader, ScheduleStats, ScheduleCalendar, ScheduleModals)
- Production Integration (useCalendarData hook, universalMasterScheduleService)
- Galaxy-Swan Theme compliance
- UI Fixes (dropdown transparency, grey-out past time slots)
- Testing Infrastructure (test-universal-schedule.mjs)

### 2026-01-31
- Vitest + RTL Setup
- Unit Tests (SessionCard, sessionService, useClientDashboardMcp)
- Phase 4.1 Toasts, Phase 4.2 Header Dropdowns, Phase 4.3 Shortcuts, Phase 4.4 Templates
- Phase 4 Polish (template validation, delete UI, shortcut tooltips)

---

**END OF ARCHIVE**
