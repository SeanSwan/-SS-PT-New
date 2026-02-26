# CURRENT TASK - SINGLE SOURCE OF TRUTH

**Last Updated:** 2026-02-25
**Updated By:** Claude Code (Opus 4.6)

---

## ACTIVE: Smart Workout Logger — Phase 5A Complete (2026-02-25)

**Status:** Phase 5A DEPLOYED + VERIFIED. Commit `beb2f48c`, 823/823 tests, 6/6 production smoke tests. Ordering confirmed live.

**What was done (Phase 5A — Smart Workout Logger MVP Coach Copilot):**

### Phase 5A New Files
1. **`backend/services/ai/oneRepMax.mjs`** — NASM-aligned 1RM estimation (Epley), load recommendations by OPT phase, RPE↔intensity conversion
2. **`backend/services/ai/progressContextBuilder.mjs`** — PII-free training history summarizer (exercise history, volume trends, frequency, recency)
3. **`backend/services/ai/contextBuilder.mjs`** — Unified AI context builder merging de-identified profile + NASM constraints + template + progress + 1RM data. Produces generation modes: `full`, `template_guided`, `progress_aware`, `basic`, `unavailable`
4. **`backend/tests/unit/oneRepMax.test.mjs`** — 22 tests
5. **`backend/tests/unit/progressContextBuilder.test.mjs`** — 20 tests
6. **`backend/tests/unit/contextBuilder.test.mjs`** — 22 tests
7. **`backend/tests/unit/phase5aIntegration.test.mjs`** — 8 integration tests (full pipeline, privacy regression, safety constraints, draft contract)
8. **`backend/tests/unit/aiWorkoutApproval.test.mjs`** — 31 tests (16 validator + 15 controller with mocked models)

### Phase 5A Modified Files
9. **`backend/controllers/aiWorkoutController.mjs`** — Extended `generateWorkoutPlan` with progress context + draft mode + explainability. Added `approveDraftPlan` with hardened security ordering
10. **`backend/routes/aiRoutes.mjs`** — Added `POST /api/ai/workout-generation/approve`
11. **`backend/services/ai/outputValidator.mjs`** — Added `validateApprovedDraftPlan()` last-mile gate

### Phase 5A Security Hardening (2 review rounds)
| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | HIGH | `/approve` lacked trainer-assignment RBAC | Added `ClientTrainerAssignment` check (admin bypasses) |
| 2 | HIGH | `/approve` bypassed consent re-check | Added `AiPrivacyProfile` consent verification |
| 3 | HIGH | `AiInteractionLog` wrote nonexistent `metadata` field | Changed to `tokenUsage` JSONB merge with approval provenance |
| 4 | MEDIUM | Validation ran before authz (ordering leak) | Reordered: auth → role → input → user existence → assignment → consent → validation |
| 5 | MEDIUM | No target user existence check | Added `User.findByPk` with 404 |
| 6 | MEDIUM | Test coverage overstated (only 6 controller tests) | Expanded to 31 tests: assignment 403, consent 403, user 404, admin bypass, ordering precedence |

### Phase 5A Test Summary
- **823/823 tests passing across 38 files** (zero regressions)
- Approval controller tests prove: authz errors take precedence over validation errors (ordering verification)

### Phase 5A Approval Endpoint Security Ordering
```
1. Auth (401) → 2. Role trainer/admin (403) → 3. Input presence (400)
→ 4. User exists (404) → 5. Trainer assigned (403) → 6. Consent active (403)
→ 7. Draft validation (422) → 8. Persist in transaction → 9. Audit log
```

### Phase 5A Production Deploy Checklist
- [x] Push to main for Render deploy (`beb2f48c`)
- [x] Smoke: draft generation → 403 (consent gate active)
- [x] Smoke: approve nonexistent user → 404
- [x] Smoke: approve unassigned trainer → 404 (user-existence fires first, ordering correct)
- [x] Smoke: approve invalid draft → 403 (consent fires before validation, ordering correct)
- [x] Smoke: approve no auth → 401

**Smoke note:** Tests confirm ordering precedence (earlier gates fire before later ones). Full branch coverage (assignment 403, live 422) requires assigned trainer + consented client — covered by unit tests, not prod smoke.

---

## PREVIOUS: Smart Workout Logger — Phase 1 Closeout (2026-02-24)

**Status:** Phase 1 COMPLETE (2 review rounds, all findings resolved).

**What was done (Phase 0 → Phase 1 → Hardening → Closeout → Closeout R2):**
- **Phase 0 (Baseline Audit):** Comprehensive code audit of AI workout generation pipeline, privacy services, NASM integration. Playwright evidence (14 unauthenticated + 8 authenticated captures).
- **Phase 1 (Privacy Foundation):** End-to-end de-identification pipeline for AI workout generation.
- **Phase 1 Hardening:** Fixed 2 HIGH + 3 MEDIUM findings from cross-AI review.
- **Phase 1 Closeout:** Consent UI, onboarding integration, backend polish, backfill script.
- **Phase 1 Closeout R2:** Fixed 2 HIGH + 1 MEDIUM from second cross-AI review (routing, API service, admin guard).

**Phase 1 complete deliverables:**

### Backend (Privacy Infrastructure)
1. **Models + Migrations:**
   - `backend/models/AiPrivacyProfile.mjs` — per-user AI consent state
   - `backend/models/AiInteractionLog.mjs` — audit trail
   - `backend/migrations/20260225000001-create-ai-privacy-profiles.cjs`
   - `backend/migrations/20260225000002-create-ai-interaction-logs.cjs`
2. **De-identification Service:**
   - `backend/services/deIdentificationService.mjs` — strips PII, preserves training context, fail-closed
3. **Kill Switch Middleware:**
   - `backend/middleware/aiConsent.mjs` — `aiKillSwitch` (env toggle → 503)
4. **Controller Wiring:**
   - `backend/controllers/aiWorkoutController.mjs` — de-identified payload, server-derived constraints only, RBAC-before-consent, audit log lifecycle
5. **Consent Management Controller (with closeout polish):**
   - `backend/controllers/aiConsentController.mjs` — grant/withdraw/read endpoints
   - **[CLOSEOUT]** Target user existence validation (404 for non-existent users)
   - **[CLOSEOUT]** Role validation (400 for non-client targets on grant)
   - **[CLOSEOUT]** consentVersion validation against whitelist
   - **[CLOSEOUT]** JSDoc for `resolveTargetUser` route semantics
6. **Route Wiring:**
   - `backend/routes/aiRoutes.mjs` — workout + consent routes
7. **Model Registration:**
   - `backend/models/associations.mjs` + `backend/models/index.mjs`

### Frontend (Consent UX)
8. **AI Consent Service:**
   - `frontend/src/services/aiConsentService.ts` — typed API layer for consent endpoints
   - **[CLOSEOUT R2]** Uses production `apiService` (token refresh, auth headers, correct base URL)
9. **AI Consent Panel (active client dashboard):**
   - `frontend/src/components/ClientDashboard/AiConsentPanel.tsx` — embeddable consent panel
   - Full consent management: status display, grant/withdraw with confirmation, privacy disclosures
   - Galaxy-Swan themed, 44px touch targets, accessible
   - **[CLOSEOUT R2]** Integrated into `AccountGalaxy` in `GalaxySections.tsx` (active client dashboard)
   - Placed between PersonalStarmap and Session History sections
10. **Legacy Consent Screen (inactive, kept for reference):**
    - `frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx`
    - Route-based page wired into `UniversalDashboardLayout.tsx` (admin-only route tree)
    - NOTE: Clients use `RevolutionaryClientDashboard` (section-based), not this route tree
11. **Onboarding Integration:**
    - `frontend/src/pages/onboarding/components/ConsentSection.tsx` — step 7 of 8 in wizard
    - Opt-in toggle with privacy disclosures, disclosure v1.0 text, skip-friendly UX
    - `ClientOnboardingWizard.tsx` — calls `grantConsent()` on successful self-submit if opted in (best-effort, non-blocking)
    - **[CLOSEOUT R2]** Admin override path (`onSubmit`) does NOT call self-consent grant (prevents admin granting consent to own account)

### Rollout
12. **Backfill Script:**
    - `backend/scripts/backfill-ai-consent-profiles.mjs`
    - **Policy: default deny / opt-in required**
    - Creates `AiPrivacyProfile` with `aiEnabled=false` for all existing clients without a profile
    - Supports `--dry-run` flag
    - New users prompted during onboarding step 7

### Tests
13. **Backend Tests:**
    - `backend/tests/api/aiPrivacy.test.mjs` — 43 unit tests
    - `backend/tests/api/aiPrivacyIntegration.test.mjs` — 24 integration tests (18 original + 6 closeout validation tests)
    - 474/474 total backend tests passing (25 test files, zero regressions)
14. **Frontend Build:**
    - Clean build in 7.5s, consent panel bundled into `RevolutionaryClientDashboard` chunk

**Closeout R1 findings addressed (1 MEDIUM, 2 LOW):**
| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | MEDIUM | grant/withdraw/status don't validate target user existence | 404 for non-existent users, 400 for non-client role on grant |
| 2 | LOW | consentVersion not validated at controller level | Whitelist validation against `VALID_CONSENT_VERSIONS` |
| 3 | LOW | Consent status route semantics ambiguous for non-client self | JSDoc on `resolveTargetUser` explaining role-based behavior |

**Closeout R2 findings addressed (2 HIGH, 1 MEDIUM):**
| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 4 | HIGH | AiConsentScreen wired into admin-only route tree (`UniversalDashboardLayout`), unreachable by clients | Created `AiConsentPanel.tsx`, integrated into `AccountGalaxy` in active `RevolutionaryClientDashboard` |
| 5 | HIGH | `aiConsentService.ts` bypassed production API client (raw fetch + localhost fallback) | Rewritten to use production `apiService` with token refresh and auth headers |
| 6 | MEDIUM | Admin onboarding silently calls `grantConsent()` for admin's own account | Guarded: only self-submit path calls consent grant; admin override path skips it |

**Production deploy checklist:**
- [ ] Run migrations: `npx sequelize-cli db:migrate`
- [ ] Run backfill (dry-run first): `node backend/scripts/backfill-ai-consent-profiles.mjs --dry-run`
- [ ] Run backfill: `node backend/scripts/backfill-ai-consent-profiles.mjs`
- [ ] Push to main for Render deploy
- [ ] Smoke test: consent status → grant → AI generate → withdraw → AI blocked

**Remaining items (not blocking closeout):**
- Additional PII fields may need review (foodAllergies, age combined with measurements)
- Admin consent management UI (currently API-only for admin role)

**Next steps (Phase 3 — Unified v4 Plan):**
- **Design proposal written:** `docs/ai-workflow/blueprints/PHASE-3-PROVIDER-ROUTER-DESIGN.md`
- **Status:** Awaiting cross-AI review + owner approval before implementation
- **Scope:** Provider abstraction (OpenAI/Anthropic/Gemini), failover chain, circuit breaker, degraded mode, Zod validation, rate limiting, audit integration
- **Estimated new files:** 14 (services, adapters, middleware, migration, tests)
- **Estimated modified files:** 5 (controller, routes, model, monitoring, package.json)
- **No frontend changes** — backend-only phase

---

## PREVIOUS: Homepage Cinematic Overhaul (2026-02-23)

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
