# CURRENT TASK - SINGLE SOURCE OF TRUTH

**Last Updated:** 2026-02-23
**Updated By:** Claude Code (Opus 4.6)

---

## ACTIVE: Homepage Cinematic Overhaul (2026-02-23)

**Status:** Implementation complete (Phases 0-4). Awaiting admin review in Design Lab.

**What was done:**
- Phase 0: Playwright baseline audit of production homepage at 3 viewports (375px, 768px, 1280px)
- Phase 1-4: Built complete cinematic redesign system with 3 design variants
  - **Variant A (Enchanted Apex):** Warm forest/gold/biolume palette, high motion
  - **Variant B (Crystalline Swan):** Sapphire/ice/gold palette, medium-high motion — RECOMMENDED
  - **Variant C (Hybrid Editorial):** Same palette as B, low motion, editorial restraint
- Admin Design Lab at `/dashboard/content/design` — portal-based chromeless preview
- 11 shared section components parameterized by design tokens
- Shared content model (`HomepageContent.ts`) extracted from production homepage
- Build passes cleanly, all new code in separate lazy-loaded chunks

**Files created:** 19 new files in `frontend/src/pages/HomePage/cinematic/` + 1 admin component
**Files modified:** 3 (`index.html`, `ContentWorkspace.tsx`, `UnifiedAdminRoutes.tsx`)
**Current homepage:** UNCHANGED — no visual or functional regression

**Next step:** Admin reviews variants in Design Lab. If approved, Phase 5 creates `HomePage.V3.component.tsx` with layout chrome suppression on `/` route.

**Documentation:**
- `docs/qa/HOMEPAGE-CINEMATIC-BASELINE-AUDIT.md` — pre-change screenshots + content map
- `docs/design/HOMEPAGE-CINEMATIC-VARIANTS-SPEC.md` — variant rationale + token differences
- `frontend/src/pages/HomePage/cinematic/ASSET-MANIFEST.md` — asset tracking

---

## CURRENT VISION SNAPSHOT (2026-02-22)

### Active Product Priorities
0. **NASM Admin Operations - Phase 1C Frontend UI & Gamification XP (COMPLETE - 2026-02-22)**
   - **What:** Admin frontend UI for onboarding/workout endpoints, gamification XP on workout log, Playwright E2E tests. All features deployed and verified on production via Playwright.
   - **Phase 1A (Data Layer) — committed `1052a977`:**
     - `Users.isOnboardingComplete`, `workout_logs` table, `WorkoutLog` model, associations
   - **Phase 1B (Controllers & Routes) — committed `57adee17` + bug fixes:**
     - `backend/controllers/adminOnboardingController.mjs` — save draft, submit, get status, reset
     - `backend/controllers/adminWorkoutLoggerController.mjs` — log workout, get history
     - `backend/utils/onboardingHelpers.mjs` — shared helpers extracted from client controller
     - `backend/utils/clientAccess.mjs` — RBAC guard (admin bypass, trainer assignment check)
     - `backend/routes/adminOnboardingRoutes.mjs` — 3 routes (POST/GET/DELETE)
     - `backend/routes/adminWorkoutLoggerRoutes.mjs` — 2 routes (POST/GET)
     - `backend/tests/api/phase1bControllers.test.mjs` — 28 tests
   - **Phase 1C (Frontend + XP + E2E) — committed `01827cf4` + production fix `d604e56b`:**
     - `backend/services/awardWorkoutXP.mjs` — XP service with triple guard (idempotency, day-level, same-day)
     - `backend/tests/api/phase1cXpIntegration.test.mjs` — 16 behavioral XP tests
     - `frontend/src/services/adminClientService.ts` — 6 new API methods (onboarding CRUD + workout log/history)
     - `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx` — 5 new props (onSubmit, initialData, callbacks, skipSuccessModal)
     - `frontend/src/components/.../AdminOnboardingPanel.tsx` — Admin onboarding wrapper with loading gate + autosave
     - `frontend/src/components/.../WorkoutLoggerModal.tsx` — Workout logging form with dynamic exercises/sets + XP toast
     - `frontend/src/components/.../hooks/useClientActions.ts` — Extracted handlers (~90 lines out of monolith)
     - `frontend/src/components/.../AdminClientManagementView.tsx` — Menu items for legacy route
     - `frontend/src/components/.../ClientsManagementSection.tsx` — **CRITICAL:** Menu items wired into production Clients tab
     - `frontend/e2e/admin-onboarding-workout.spec.ts` — 12 Playwright E2E test specs
   - **Production bug fixed:** Phase 1C originally wired menu items to `AdminClientManagementView.tsx` but production dashboard uses `ClientsManagementSection.tsx` — fixed in `d604e56b`
   - **Production verification (Playwright on sswanstudios.com):**
     - Start Onboarding → Panel opens with 7-step wizard, draft data, status badge ✅
     - Log Workout → Modal opens with title/date/duration/intensity/exercises/sets ✅
     - All dashboard workspaces verified: Scheduling, Store & Revenue, Analytics, System, Content Studio, Gamification ✅
   - **371 backend tests pass, frontend build clean**

   **Key commits (Phases 1A-1C):**
   - `1052a977` — Phase 1A data layer
   - `57adee17` — Phase 1B controllers, routes, tests
   - `a48b519e` — Migration guard for missing workout_sessions table
   - `e856897a` — Fix toNumber null coercion + null-safe validators
   - `06522f63` — Fix model FK references (Users case-sensitivity)
   - `a2f87698` — Startup migration 6: post-sync FK repair
   - `01827cf4` — Phase 1C frontend UI, XP service, E2E tests (10 files, +2458/-95 lines)
   - `d604e56b` — Fix: wire Phase 1C menu items into production Clients tab

0. **Payment Recovery Flow (COMPLETE - 2026-02-21)**
   - **What:** Admin can apply offline payments (Cash/Venmo/Zelle/Check) directly from Session Detail Card when a client reaches 0 sessions. Auto-selects last purchased package. Creates full Order/Transaction/FinancialTransaction audit trail.
   - **Files:**
     - `backend/services/sessionDeductionService.mjs` — 5 exported functions (processSessionDeductions, getClientsNeedingPayment, applyPaymentCredits, getClientLastPackage, applyPackagePayment)
     - `backend/routes/sessionDeductionRoutes.mjs` — 5 endpoints under `/api/sessions/deductions/`
     - `frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.tsx` — Full modal with client selector, package picker, payment method input
     - `backend/tests/api/sessionDeduction.test.mjs` — 30 targeted unit tests
   - **Business-logic bugs fixed (5 audit rounds):**
     - CRITICAL: Sequelize eager-loading duplicate-object bug in batch deductions (grouping + atomic decrement)
     - HIGH: Race condition in concurrent `processSessionDeductions` calls (session row lock added)
     - HIGH: `applyPaymentCredits` used non-atomic read-modify-write (rewritten with transaction + row lock + increment)
     - HIGH: Role inconsistency (`'client'` vs `['client', 'user']`) across 3 functions
     - HIGH: Inactive package could be auto-applied
     - HIGH: error.message leakage in inner catch blocks
     - HIGH: No upper-bound on manual credit grants (capped at 500)
     - MEDIUM: Storefront API response parsing mismatch
     - MEDIUM: OrderItem.metadata double-JSON-encoded
     - MEDIUM: No input validation on route params → upgraded to `Number()` + `Number.isInteger()` (rejects "10abc")
     - MEDIUM: fetchLastPackage raced with packages loading state
     - MEDIUM: No idempotency guard on applyPackagePayment → added 60-second duplicate-order check
     - LOW: Stale closure in handleSelectClient
   - **Remaining known items (documented, not blocking):**
     - LOW: Preselected client silently fails if not in payment-needed list (UX polish, not data corruption)
     - INFO: Manual credit mode (`/apply-payment`) creates no Order/Transaction audit trail — package mode is the recommended path
     - INFO: Vite/Recharts chunk size warnings and React `fullWidth` DOM prop warning in test output are pre-existing framework noise, not regressions
   - **Verification status:**
     - 272 backend tests pass (17 files), 30 targeted session deduction tests
     - Frontend builds clean (6.32s), chunk size warnings are pre-existing
     - No CRITICAL or HIGH findings remain per Rule 8 audit checklist
     - Payment recovery files committed to VCS (abb4816b); unrelated working-tree changes remain

1. **Social & Gamification Integration (ACTIVE)**
   - ✅ **Social Profile Page:** Foundation complete (UserProfilePage, Routes, API).
   - ✅ **Challenges UI:** Wired to real API with mock fallback.
   - ✅ **Challenges Backend:** Fully polished (Commit 753664cb).
   - ✅ **Social Gamification:** Backend models & routes implemented (Commit 5db681ed).
   - ✅ **Database Migration:** Automated via `render-start.mjs` on deploy.
   - ✅ **Deploy Blocker Fixed:** Goal association alias collision resolved (`Goal.supporters` attribute vs association alias).
   - ✅ **Cart Resilience:** Implemented schema recovery and self-healing migrations for shopping cart.

2. **Admin Dashboard Stabilization (COMPLETE)**
   - ✅ **Demo Data Transparency:** Banners added for API failures/mock data.
   - ✅ **Navigation Fix:** Verified working.
   - ✅ **Role Promotion:** Script ready (`backend/scripts/promote-owners.mjs`).

3. **Schedule truthfulness and usability (COMPLETE)**
   - ✅ **UX Overhaul:** TimeWheelPicker, KPI cards, WCAG fixes (Commit 1e6138b5).
   - ✅ **Universal Master Schedule:** Complete refactor with WeekView, Admin Scope, and SearchableSelect.
   - ✅ **Data Integrity:** Fixed cancellation credit restoration and session stats.
   - ✅ **Visual Polish:** Migrated to GlowButton and Galaxy-Swan theme.
   - ✅ **Production Fix:** Resolved TDZ crash in admin view scope (Commit a712ba23).
   - ✅ **Verified Fixes:** Session creation (500), credit restoration logic, and touch targets (Commit d7e9b302).

4. **Auth recovery reliability (COMPLETE)**
   - ✅ **Code Complete:** Forgot/Reset flows verified on production.
   - ⚠️ **Configuration:** Pending `SENDGRID_API_KEY` in Render dashboard.

5. **Quality bar**
   - Accessibility, contrast, and mobile touch targets are required deliverables.
   - No regressions in auth, sessions, checkout, or RBAC.
   - ✅ **MUI Elimination (COMPLETE):**
     - ✅ **100% Migration:** All ~282 files migrated from MUI to Swan primitives.
     - ✅ **Final Push (Batches 26-38):** Migrated remaining 49 complex files (13 commits).
     - ✅ **Verification:** Zero `@mui/` imports remaining. Build passing.
   - 🔄 **User Dashboard Stabilization (ACTIVE):**
     - ✅ **Mobile Layout:** Fixed tab clipping and feed interaction overflow.
     - ✅ **Touch Targets:** Enforced 44px minimums on feed controls.
     - ⏳ **API Reliability:** Investigating 500/403/503 errors found during audit.

6. **Video Library (ACTIVE)**
   - ✅ **Public Interface:** `VideoLibrary.tsx` + `publicVideoRoutes.mjs` deployed.
   - ✅ **Player:** YouTube/HTML5 player integrated.
   - ⏳ **Content:** Pending admin uploads/population.

### Multi-AI Review Quorum (Current)
- Minimum 3 AIs per high-impact change:
  1. Implementer
  2. Reviewer A (security/correctness)
  3. Reviewer B (UX/data semantics)
- Optional 4th AI for tie-breaks or high-risk disagreements.

### Handoff Rules (Operational)
- Start every cycle by reading:
  1. `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` (this file)
  2. `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md`
  3. `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
  4. `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- Record evidence for major changes (build, tests, screenshots/logs when relevant).
- Use `verification-before-completion` skill before any completion claim.
- Use `requesting-code-review` skill before merge to main.
- Do not merge unresolved high-severity findings.

### Skills Infrastructure (2026-02-15)
10 AI agent skills installed in `.agents/skills/`. Key skills:
- **Process:** `verification-before-completion`, `systematic-debugging`, `requesting-code-review`, `test-driven-development`
- **Testing/QA:** `webapp-testing`, `web-design-guidelines`, `audit-website`
- **Browser/Design:** `agent-browser`, `frontend-design`, `ui-ux-pro-max`
- **Full registry:** `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- **Maintenance:** `npx skills check` | `npx skills update`

### Locked Files (Active as of 2026-02-15)
- _None currently tracked in this snapshot._

---

> Legacy backlog (Phases 0-5, old locked files, completed-today logs) has been
> moved to `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK-ARCHIVE.md` for reference.
