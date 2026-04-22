# Phase 19.B Canonical Surface Receipt — Movement-Screen Cluster

**Date:** 2026-04-22
**Author:** Claude Opus 4.7 (1M)
**Task:** Resolve the deferred L3/L4/L5 movement-screen references from Phase 19.A receipt (`docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md` §3.3).
**Rule compliance:** Produced before any code change per rules 15, 26, 27, 31.
**Scope-of-claim lock (rule 28):** This receipt proves what's LIVE vs DORMANT in the movement-analysis surface. It does NOT yet propose a route — Sean picks scope (§6) based on the findings.

---

## 1. Canonical Surface Receipt (Rule 26)

### 1.1 MovementAnalysisWizard — live mount chain

| Layer | File | Line | Evidence |
|-------|------|------|----------|
| (a) Route mount | [DashboardRoutes.tsx](frontend/src/routes/DashboardRoutes.tsx#L49-L58) | 49–58 | JSX: `<UniversalDashboardLayout />` at `/dashboard/*` (unchanged since Phase 19.A). |
| (b) Admin role path | [UniversalDashboardLayout.tsx](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L500) | 500 | `{ path: '/client-management', component: React.lazy(() => import('./workspaces/ClientsWorkspace')) }`. |
| (c) Canonical URL | — | — | `/dashboard/admin/client-management` (search-param addressable: `?clientId=XX`). |
| (d) Tab render prop | [ClientsWorkspace.tsx](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx#L49) | 49, 375 | Imports `BiometricsTabContent` lazy; renders at line 375 via `<BiometricsTabContent clientId={...} clientName={...} />`. |
| (e) Expanded-card mount | [BiometricsTabContent.tsx](frontend/src/components/DashBoard/workspaces/clients-team/tabs/BiometricsTabContent.tsx#L70-L71) | 70–71, 378 | Lazy-imports `MovementAnalysisWizard`; JSX-mounts at line 378 when `expandedCard === 'movement-analysis'`. |
| (f) Trigger | [BiometricsTabContent.tsx](frontend/src/components/DashBoard/workspaces/clients-team/tabs/BiometricsTabContent.tsx#L347-L350) | 118, 347–350 | Card config at line 118 `{ id: 'movement-analysis', ... }`; `setExpandedCard(cardId)` at line 350 sets state; render at line 378 swaps the tab content to the wizard. |
| (g) Backend API | [backend/routes/movementAnalysisRoutes.mjs](backend/routes/movementAnalysisRoutes.mjs), [controllers/movementAnalysisController.mjs](backend/controllers/movementAnalysisController.mjs) | — | Live. Wizard calls `GET /api/movement-analysis/:id` (line 388), `GET /api/admin/clients/:clientId` (line 392). |
| (h) Model | [backend/models/MovementAnalysis.mjs](backend/models/MovementAnalysis.mjs), [PendingMovementAnalysisMatch.mjs](backend/models/PendingMovementAnalysisMatch.mjs) | — | Live. Migration: `backend/migrations/20260305000001-create-movement-analysis-tables.cjs`. |

**The live mount pattern is EMBEDDED (expanded-card in BiometricsTab), NOT routed.** The wizard runs in-place inside the client-hub tab; `setExpandedCard('movement-analysis')` is internal React state, not a URL transition. The current live URL while the wizard is open is `/dashboard/admin/client-management?clientId=XX`.

### 1.2 Pre-existing wizard bug (discovered during receipt)

[MovementAnalysisWizard.tsx:377](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx#L377) reads client context via `useParams<{ id?: string; clientId?: string }>()`. Since the live embedded mount is NOT routed with params, both `id` and `clientId` are **always undefined** in the live flow. The client-prefill effect at lines 391–406 never fires — the wizard always starts as a blank new assessment, requiring the user to re-enter client info in step 2.

The expanded-card parent (`BiometricsTabContent`) receives `clientId` as a prop (line 343) but never passes it to the wizard. This is an independent bug that predates Phase 19 work. Not blocking for this receipt, but worth flagging for scope.

## 2. Dead-Nav Mechanism (Rules 27 + 31)

Two live-code navigate calls target `/dashboard/people/movement-screen`:

| # | File | Line | Trigger | Outcome |
|---|------|------|---------|---------|
| L4a | [MovementAnalysisWizard.tsx:480](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx#L480) | 480 | `completeAssessment()` after final save | `navigate('/dashboard/people/movement-screen')` → no matching admin route → catch-all at `UniversalDashboardLayout.tsx:869,874` → silent redirect to `/dashboard/admin/overview`. User loses all client context after completing a full assessment. |
| L4b | [MovementAnalysisWizard.tsx:971](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx#L971) | 971 | Close button (X) in wizard header | Same destination, same trap. |

**These are the only live-code dead-nav calls in the movement-screen cluster.** Everything else in Phase 19.A's L3/L5 classification turns out to be inside dormant files — see §3.

## 3. Surface Classification Table (Rule 27)

### 3.1 Canonical — LIVE

| File | Status | Evidence |
|------|--------|----------|
| [MovementAnalysisWizard.tsx](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx) | **canonical (live)** | JSX-mounted at `BiometricsTabContent.tsx:378` in the canonical tree. Backend API live. Model + migration present. |
| [BiometricsTabContent.tsx](frontend/src/components/DashBoard/workspaces/clients-team/tabs/BiometricsTabContent.tsx) | **canonical (live)** | JSX-mounted at `ClientsWorkspace.tsx:375` which is lazy-mounted at `UniversalDashboardLayout.tsx:500`. |

### 3.2 Legacy — DORMANT (re-confirmed from Phase 19.A)

| File | Status | Evidence |
|------|--------|----------|
| [UnifiedAdminRoutes.tsx](frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx) | **dormant** | Not JSX-mounted in the live tree. Contains lines 229–232 that `<Route>`-mount `MovementAnalysisListPage` and `MovementAnalysisWizard` at `movement-screen*` paths — all dormant. Phase 17/18/19.A receipts all classified this file legacy. |
| [MovementAnalysisListPage.tsx](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisListPage.tsx) | **dormant** | ONLY imported by `UnifiedAdminRoutes.tsx:66` (dormant parent). Zero canonical consumers. Its lines 273 + 313 `navigate('/dashboard/people/movement-screen*')` calls are inside dead code. |
| [ClientsManagementSection.tsx](frontend/src/components/DashBoard/Pages/admin-dashboard/sections/ClientsManagementSection.tsx) | **dormant** | Imported by: `UnifiedAdminRoutes.tsx` (dormant), `DashBoard/index.ts` (barrel), `sections/index.ts` (sub-barrel), and 2 verification scripts (not runtime). Zero canonical runtime JSX mounts. The line 1455 `navigate('/dashboard/people/movement-screen/new/${menuClient.id}')` is in dead code. |

### 3.3 Orphaned Config

| File | Status | Evidence |
|------|--------|----------|
| [dashboard-tabs.ts:155–164](frontend/src/config/dashboard-tabs.ts#L155-L164) | **orphaned data** | `movement-screen` entry sits inside the `ADMIN_DASHBOARD_TABS` array (exported at line 81) which is marked **deprecated**. Repo-wide grep shows zero imports of `ADMIN_DASHBOARD_TABS` outside the file itself. Live `AdminStellarSidebar.tsx:34` imports `WORKSPACE_CONFIG / WORKSPACE_SECTIONS` — not `ADMIN_DASHBOARD_TABS`. |

## 4. Backend Route Ownership Walk (Rule 31)

Not a frontend-route issue — backend movement-analysis API is already live and correctly-scoped:
- `GET /api/movement-analysis/:id` — wizard load-existing
- `GET /api/admin/clients/:clientId` — wizard client-prefill
- No Express mount-order shadowing concerns for this surface.

## 5. Blast Radius Summary

**Live-code dead-nav (must fix):** 2 call sites — `MovementAnalysisWizard.tsx:480` and `:971`.

**Dormant-code dead-nav (no user impact today):**
- `ClientsManagementSection.tsx:1455` (inside dormant file)
- `MovementAnalysisListPage.tsx:273,313` (inside dormant file)
- `dashboard-tabs.ts:161` (inside deprecated, unused export)

Fixing dormant entries has zero user-facing impact but keeps the grep-based guard test honest. Rule 34 still applies — no file deletion without approval; string-literal cleanup inside dormant files is fine.

## 6. Decision for Sean — Scope Options

Sean's stated preference (2026-04-22 message) was `/dashboard/admin/client-management/:clientId/movement-screen`. Given the findings in §1–§3, that preference implies ONE of:

### Option C — Minimal retarget (RECOMMENDED)

**Scope:** 2 live-code string swaps + allowlist cleanup. No new routes, no refactor.

- `MovementAnalysisWizard.tsx:480` → `navigate('/dashboard/admin/client-management')` (or with `?clientId=${data.userId}` if populated)
- `MovementAnalysisWizard.tsx:971` → same
- Optionally clean up the 3 dormant string-literals (L3, L5, dashboard-tabs.ts:161) for grep hygiene
- Remove the 3 dormant-file allowlist entries from `no-dead-people-routes.test.ts` if we clean the dormant strings
- Total diff: ~5–10 lines of code + test allowlist edit

**Rationale:** The live mount is already at Client Hub via `/dashboard/admin/client-management` — just without per-assessment deep-linking. The "canonical route decision" has an existing answer: Client Hub. Deep-linking to a specific assessment is a nice-to-have that can be a later phase. Fits the Phase 19 "cleanup" framing.

**Does NOT match your stated URL preference** (`/dashboard/admin/client-management/:clientId/movement-screen`) because that URL doesn't exist yet. Option C ships the correctness fix without committing to a URL shape that requires a real refactor.

### Option B — Nested routing under Client Hub (Sean's stated preference, fully)

**Scope:** Real architectural change.

Required work:
1. Refactor `ClientsWorkspace` from search-param client selection + expanded-card tab state → nested routing: `<Routes>` inside the workspace, with sub-routes like `/:clientId/biometrics/movement-screen`.
2. Add route mount points at `UniversalDashboardLayout.tsx` admin role config (or inside `ClientsWorkspace`).
3. Fix the pre-existing wizard bug (§1.2) — wizard currently uses `useParams` but gets empty object because the live mount isn't routed. Route-based mount would solve this naturally.
4. `BiometricsTabContent` — change card click from `setExpandedCard` to `navigate()`.
5. Retarget the 2 live-code dead-nav calls to the new canonical URL.
6. Preserve expanded-card UX (back button, sticky header) under the new routed model.
7. Update guard test allowlist + Phase 19 receipt.

**Rationale:** Deep-linkable per-assessment URLs. Browser back/forward works. Matches Phase 18.A's client-hub direction cleanly. Also fixes the silent wizard-prefill bug.

**Cost:** This is NOT Phase 19 cleanup scope — it's Phase 18.A-sized work (multi-file refactor with receipt + Codex review + smoke testing). Estimated 4–8 hours of focused work if no hidden dependencies.

### Option A — Fold into `/dashboard/admin/body-map`

**Rejected earlier by Sean.** Listed here only for completeness. Movement screening is a distinct NASM assessment workflow, not a pain-charting surface; folding would hide the distinction.

## 7. Recommendation

**I recommend Option C for this slice**, with Option B scheduled as a separate phase (Phase 19.C or similar).

Reasoning:
- Phase 19 was framed as "dead-route cleanup" — Option C fits that framing. Option B is a feature-architecture slice.
- The live mount already resolves to Client Hub. The fix is narrow. Ship the correctness fix now.
- Option B opens up the wizard-clientId bug, which deserves a proper receipt + test coverage — not a rushed inline fix inside Phase 19.B.
- After Option C lands, every remaining `/dashboard/people/*` ref in the codebase is inside dormant files, and the guard test catches any new occurrences. That's the clean Phase 19 closeout.
- Option B becomes a planned architecture slice, not a scope creep.

**If you want Option B anyway** (your stated preference), I'll treat it as a new phase and start with a planning doc + recursive-planning gate (rule 15) before writing code. Expect 2–3 sessions minimum.

## 8. Decision Needed From Sean

1. **Option C** (minimal retarget) — I proceed now with 2-line fix + dormant-string cleanup + guard allowlist edit + Codex review.
2. **Option B** (full nested-routing refactor) — I open a new planning doc and we gate it through AI Village / rule 15 recursive planning first, then implement across 2–3 sessions.
3. **Hybrid** — Option C now (ship the fix), Option B as a named follow-up phase in the roadmap.

## 9. Scope Guards

- No Phase 18.B work.
- No changes to backend movement-analysis API.
- No Hermes / AI-workflow infrastructure work.
- No repo-hygiene sweep.
- No push without explicit Sean approval.

---

## 10. Decision + Implementation Log (2026-04-22)

### 10.1 Sean's Decision

**Hybrid — tightened.** Ship Option C (minimal live-surface cleanup) now. Include the `useParams()` bug fix inside 19.B since it's a tiny prop pass — not deeper state/data wiring. Do NOT add the `/dashboard/admin/client-management/:clientId/movement-screen` route tonight; defer to a future Phase 19.C or Phase 18.B-adjacent slice that gets its own planning doc, route receipt, and regression tests.

### 10.2 Implemented Changes

Six files touched:

1. **[MovementAnalysisWizard.tsx](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx)** — three changes:
   - Added optional `propClientId?: string | number` to `WizardProps`.
   - `useParams` destructuring renamed: `const { id, clientId: urlClientId } = useParams<...>()`. Composite resolver: `const clientId = urlClientId || (propClientId != null ? String(propClientId) : undefined)`. URL wins when both present. Fixes pre-existing silent-prefill bug (§1.2) in the live embedded mount.
   - `completeAssessment` (line 480) and close button (line 971) now navigate to `/dashboard/admin/client-management?clientId=${data.userId}` (or bare `/dashboard/admin/client-management` when `data.userId` is empty).
2. **[BiometricsTabContent.tsx:378](frontend/src/components/DashBoard/workspaces/clients-team/tabs/BiometricsTabContent.tsx#L378)** — `<MovementAnalysisWizard />` → `<MovementAnalysisWizard propClientId={clientId} />`. Passes the selected client's id into the wizard so the live embedded flow finally pre-fills correctly.
3. **[ClientsManagementSection.tsx:1455](frontend/src/components/DashBoard/Pages/admin-dashboard/sections/ClientsManagementSection.tsx#L1455)** — dormant file hygiene: action-menu "Movement Screen" navigate target updated to `/dashboard/admin/client-management?clientId=${menuClient.id}`.
4. **[MovementAnalysisListPage.tsx:273,313](frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisListPage.tsx)** — dormant file hygiene: `NewButton` and `TableRow` navigate targets updated to `/dashboard/admin/client-management`.
5. **[dashboard-tabs.ts:161](frontend/src/config/dashboard-tabs.ts#L161)** — orphaned tab config's `route` string updated to `/dashboard/admin/client-management`. Entry remains in the deprecated `ADMIN_DASHBOARD_TABS` export (no consumers) but no longer carries the dead URL.
6. **[no-dead-people-routes.test.ts](frontend/src/__tests__/no-dead-people-routes.test.ts)** — 3 allowlist entries removed (`MovementAnalysisWizard.tsx`, `MovementAnalysisListPage.tsx`, `ClientsManagementSection.tsx`) since the files no longer contain the forbidden literal. `dashboard-tabs.ts` reason updated to reflect that only the historical audit comment remains.

### 10.3 Verification

- **Guard test:** `frontend/src/__tests__/no-dead-people-routes.test.ts` — 2/2 passing in 1.57s after cleanup (confirms no file outside the trimmed allowlist contains `/dashboard/people`).
- **Full frontend vitest:** 634 passing / 7 pre-existing failures (`PublicWaiverPage.test.tsx` + `WorkoutCopilotPanel.test.tsx`) — identical to the post-Phase-19.A baseline. Zero new failures introduced by Phase 19.B.
- **Backend:** No backend changes in this slice. Rule 42 audit remains 0/0 clean from the prior session.

### 10.4 What's Left for Phase 19.C (deferred)

- Nested routing inside `ClientsWorkspace` to enable deep-linkable per-assessment URLs (e.g. `/dashboard/admin/client-management/:clientId/movement-screen`).
- Refactor `BiometricsTabContent` cards from `setExpandedCard` state → `navigate()` when the new route tree lands.
- Removes the remaining expanded-card modal pattern in favor of full URL-routed tabs.
- Requires its own planning doc + rule 15 gate + 3-brain review before any code.

### 10.5 Remaining Guard Allowlist (post-19.B)

6 entries remain (was 9 pre-19.B; the 3 movement-screen cluster entries were removed):
- `UnifiedAdminRoutes.tsx` — legacy, not JSX-mounted, pending dormant-removal pass
- `MasterDetailLayout.tsx` — dormant, zero runtime imports, pending dormant-removal pass
- `ClientsWorkspace.tsx` — documentation comment only at lines 42–46
- `dashboard-tabs.ts` — historical audit comment only (Phase 6 + Phase 19 annotations)
- `EnhancedAdminClientManagementView.tsx` — view-as CTAs blocked on Phase 18.B
- `ClientMeasurementPanel.tsx` — measurements CTA blocked on canonical measurements route decision
