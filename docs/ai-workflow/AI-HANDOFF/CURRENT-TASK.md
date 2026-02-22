# CURRENT TASK - SINGLE SOURCE OF TRUTH

**Last Updated:** 2026-02-21
**Updated By:** Claude Code (Opus 4.6)

---

## CURRENT VISION SNAPSHOT (2026-02-21)

### Active Product Priorities
0. **NASM Admin Operations - Phase 1A Data Layer (IN PROGRESS - 2026-02-22)**
   - **What:** Add normalized workout log storage and onboarding completion flag to support admin provisioning/onboarding/workout logging workflow.
   - **Scope completed in this phase:**
     - `backend/migrations/20260222000001-add-is-onboarding-complete.cjs` (adds `Users.isOnboardingComplete`)
     - `backend/migrations/20260222000002-create-workout-logs.cjs` (creates `workout_logs` with analytics-friendly indexes)
     - `backend/models/WorkoutLog.mjs` (normalized one-row-per-set model)
     - `backend/models/User.mjs` update (`isOnboardingComplete`)
     - `backend/models/associations.mjs` update (`WorkoutSession.hasMany(WorkoutLog)` / `WorkoutLog.belongsTo(WorkoutSession)`)
   - **Deferred by design:** controller logic, SendGrid provisioning, onboarding API behavior, NASM logger UI, and Playwright E2E remain in later phases.

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
