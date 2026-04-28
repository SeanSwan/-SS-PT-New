# Phase 18.B — Admin-as-Client Impersonation / Measurements Gate — Canonical Surface Receipt + Architectural Decision

> **Doc-only slice.** Resolves the Phase 18.B architectural decision flagged in `ACTIVE-PRIORITIES.md`. No code change in this slice — the recon shows the surfaces are already correctly separated. This file is the load-bearing artifact closing the question.
> **Date:** 2026-04-27
> **Author:** Claude Opus 4.7
> **Trigger:** ACTIVE-PRIORITIES.md P1 #3 — "Decide whether the current admin-as-client impersonation surface should remain a route-level workflow, become a scoped Client Hub state, or be removed from the dead-route guard allowlist by retargeting to a canonical admin/client-management surface."
> **Verdict:** **Option 1 — Keep route-level view-as as canonical.** No code change required.

---

## §1 — Canonical Surface Receipt (Rule 26)

### §1.1 Surface A — Route-level read-only impersonation

| Field | Evidence |
|---|---|
| Live route | `/dashboard/admin/client-management/view-as/:userId` |
| Canonical mount | [UniversalDashboardLayout.tsx:506](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L506) |
| Mounted JSX page | `AdminViewAsWrapper` (lazy import) |
| Component file | [AdminViewAsWrapper.tsx](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx) |
| Consumer hook(s) / service(s) | `useAuth().authAxios` (4 parallel reads via `Promise.allSettled`) |
| Frontend API path strings | `/api/admin/clients/${userId}` · `/api/admin/clients/${userId}/workouts` · `/api/sessions?userId=...` · `/api/v1/gamification/profile?viewAs=...` |
| Backend routes that match | [adminClientController.mjs:570-576](backend/controllers/adminClientController.mjs#L570-L576) · [adminWorkoutLoggerController.mjs:96-143](backend/controllers/adminWorkoutLoggerController.mjs#L96-L143) · sessions controller · gamification controller (with viewAsGuard) |
| Authoritative model fields | `User` (firstName, lastName, role, id), `WorkoutSession` (with included `logs[]`), `Session`, gamification profile shape per gamificationController |
| Identity semantic | **Admin impersonating client (read-only).** Banner: *"Viewing as `<name>` (client) — Admin preview of their dashboard"* ([AdminViewAsWrapper.tsx:427-430](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx#L427-L430)). No JWT swap; admin's actions still audit to admin account. |

### §1.2 Surface B — Query-param Client Hub focus

| Field | Evidence |
|---|---|
| Live route | `/dashboard/admin/client-management?clientId=X` |
| Canonical mount | [UniversalDashboardLayout.tsx:505](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L505) → `ClientsWorkspace` |
| Mounted JSX page | `ClientsWorkspace` with child `ClientDetailView` |
| Component file | [ClientsWorkspace.tsx](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx) |
| Query-param consumer | [ClientsWorkspace.tsx:270-299](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx#L270-L299) — `searchParams.get('clientId')` → matched roster client → `setSelectedClient(matchingClient)` → opens `ClientDetailView` slide-in panel |
| Tabs surfaced | Overview · Training · Biometrics · Settings (per [ClientDetailView] subtree) |
| Identity semantic | **Admin focused on a client (write-capable).** No banner. Admin role unchanged; actions flow through normal admin paths (e.g., `/log-workout?clientId=X`). |

### §1.3 Surface C — `ViewAsBanner` shared chrome (not a distinct surface)

| Field | Evidence |
|---|---|
| File | [ViewAsBanner.tsx](frontend/src/components/DashBoard/components/ViewAsBanner.tsx) |
| Mount | [UniversalDashboardLayout.tsx:847-849](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L847-L849) — gated by `userRole === 'admin' && (activeRole === 'trainer' \|\| activeRole === 'client')` |
| Data shape | `{ activeRole: 'trainer' \| 'client' }` (derived from URL path, not a surface parameter) |
| Purpose | Persistent chrome banner shown when admin browses any non-admin dashboard. *"You are signed in as Admin. Actions audit to your admin account."* + "Return to Admin Dashboard" CTA. |
| Classification | Shared UI primitive between Surface A (AdminViewAsWrapper) and any trainer/client dashboard accessed by an admin. **Not a fourth surface.** |

---

## §2 — Surface Classification Table (Rule 27)

| Surface | Classification | File:line evidence |
|---|---|---|
| `/dashboard/admin/client-management/view-as/:userId` → AdminViewAsWrapper | **canonical** | UniversalDashboardLayout.tsx:506 (active mount) |
| `/dashboard/admin/client-management?clientId=X` → ClientsWorkspace + ClientDetailView | **canonical** | UniversalDashboardLayout.tsx:505 (active mount); ClientsWorkspace.tsx:270-299 (query consumer) |
| `ViewAsBanner` chrome | **canonical** (shared primitive) | UniversalDashboardLayout.tsx:847-849 |
| `/dashboard/people/view-as/:userId` (legacy) | **dead** | Removed by Phase 19 cleanup; guarded by `frontend/src/__tests__/no-dead-people-routes.test.ts` |
| `UnifiedAdminRoutes.tsx:211` — duplicate `<Route path="view-as/:userId">` declaration | **dormant** | UnifiedAdminRoutes.tsx itself is "legacy — not JSX-mounted" per `no-dead-people-routes.test.ts` allowlist; the duplicate route declaration is unreachable cruft. Pending dormant-removal pass per Phase 19.A/B notes. |
| `MasterDetailLayout.tsx` | **dormant** | Zero runtime imports; pending dormant-removal pass per allowlist |

---

## §3 — Consumers (CTAs that navigate to each surface)

### Navigates to Surface A (`/view-as/:userId`)

- [ClientsWorkspace.tsx:348-350](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx#L348-L350) — `handleViewAsClient` callback. CTA: "View As" button (Eye icon) in TopBar action row, only visible when a client is selected.

### Navigates to Surface B (`?clientId=X`)

- [EnhancedAdminClientManagementView.tsx:1841](frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx#L1841) — "View Dashboard" RoundButton on each client roster row.
- [EnhancedAdminClientManagementView.tsx:2130](frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx#L2130) — "Swan Coach Insights" ActionButton (variant). *Note: navigates to `/dashboard/admin/coach-assistant?clientId=X`, same query-param pattern, different surface — that's the Coach Assistant, not the Hub. Listed here for completeness because the priorities file cited this line.*
- [ClientMeasurementPanel.tsx:365](frontend/src/components/DashBoard/Pages/admin-clients/components/ClientMeasurementPanel.tsx#L365) — "New Full Measurement" PrimaryButton. Closes the measurement modal and returns to the Hub focused on the client.

### Exit flow (Surface A → Surface B without client param)

- [AdminViewAsWrapper.tsx:391-398](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx#L391-L398) — "Exit View" button → `navigate('/dashboard/admin/client-management')` (no `?clientId=` preserved). Intentional: exiting impersonation returns to the admin's normal workspace, not forced focus on the just-exited client.

---

## §4 — Architectural Decision

The priorities file named three options. Verdict on each:

### ✅ Option 1 — Keep route-level view-as as canonical (**SELECTED**)

**Why this wins:**
- Surfaces A and B serve **different purposes** with intentional separation. A is read-only preview/audit; B is admin-focused management. Folding them would erase the audit-safe boundary.
- The route-level view-as has the architectural property that **ViewAsBanner is automatically applied** via `activeRole !== 'admin'` gating in UniversalDashboardLayout. Folding into Hub state (Option 2) would lose the chrome trigger.
- Phase 18.C.1B.1R and Phase 18 P1-O just shipped substantial work *into* this surface. Discarding it (Option 3) would waste recent investment.
- The read-only/admin-edit distinction is **security-meaningful**: future audit-log policies could differentiate "admin viewed-as-client" from "admin acted-as-admin-on-client-data." Collapsing the surfaces removes that signal.
- No competing-surface drift detected (Rule 27): every CTA goes to the right one for its purpose.

**What this means in practice:**
- `/view-as/:userId` stays as the canonical impersonation route.
- `?clientId=X` stays as the canonical Hub focus pattern.
- ViewAsBanner stays as shared chrome.
- The AdminViewAsWrapper banner copy (post-Phase 18 P1-O) — *"Admin preview of their dashboard"* — correctly reflects the surface's read-only-but-still-admin semantic.

### ❌ Option 2 — Fold view-as into Hub state (`?clientId=X&viewAs=true`)

**Why this loses:**
- Removes the URL-level distinction between "preview" and "manage" semantics — admins lose a clear navigation signal.
- Breaks the ViewAsBanner gating logic (banner depends on `activeRole !== 'admin'`, which is path-derived; query param wouldn't trigger it without rework).
- Increases ClientsWorkspace's responsibility from "manage clients" to "manage clients OR preview as them" — single-component bloat.
- Does not solve any actual problem the recon found.

### ❌ Option 3 — Retarget view-as consumers to Hub canonical surface, deprecate the route

**Why this loses:**
- Throws away Phase 18.C.1B.1R + Phase 18 P1-O work without replacing the read-only impersonation primitive.
- Future trainer/multi-tenant audit features would need to re-introduce a similar pattern.
- The legacy `/dashboard/people/view-as/:userId` was already deprecated by Phase 19 cleanup; that's the only retargeting that needed to happen, and it's done.

---

## §5 — Schema Cross-Check (Rule 29)

Not applicable — this slice does not touch any Sequelize model. The receipt only documents existing surfaces and their authoritative field references.

For reference, the model fields read by the canonical view-as path are:
- `User`: `id, firstName, lastName, email, role` (from `getClientDetails` → `client.toJSON()`)
- `WorkoutSession` with included `logs: WorkoutLog[]` (per [adminWorkoutLoggerController.mjs:117](backend/controllers/adminWorkoutLoggerController.mjs#L117))
- `Session` (upcoming-sessions panel)
- Gamification profile (level, totalPoints, streak, tier, nextLevelPoints) per gamificationController

All field references verified during Phase 18 P1-O sibling sweep.

---

## §6 — Backend Route Ownership / Shadow Audit (Rule 31)

Not applicable for this doc-only slice — no backend route touched. The four read paths used by AdminViewAsWrapper were already mapped during Phase 18.C.1B.1R + Phase 18 P1-O. No new shadow-mount risk introduced.

---

## §7 — Out of Scope (explicit)

This slice closes the architectural decision **only**. The following are NOT addressed and remain in their respective backlogs:

- **L6 / L7 / measurements CTA citations from ACTIVE-PRIORITIES.md.** All three already navigate to canonical surfaces (verified in §3 above). No retargeting required.
- **UnifiedAdminRoutes.tsx dormant-route-declaration cleanup.** Pending the Phase 19 dormant-removal pass per `no-dead-people-routes.test.ts` allowlist commentary. Tracked under Phase 19.C.
- **MasterDetailLayout.tsx dormant cleanup.** Same dormant-removal pass.
- **Trainer view-as pattern.** Currently a feature gap: there is no `/dashboard/trainer/clients/view-as/:userId` route. Admin browsing trainer dashboard works via `MyClientsView`'s role-branched adapter, but there's no surface for a trainer to view a specific client's read-only dashboard. **Future-review hook** flagged in §10.
- **Audit-log policy for admin view-as activity.** Currently no separate audit signal between "admin viewed-as-client" and "admin acted-on-client-data." A future security pass could add this. **Future-review hook** flagged in §10.
- **Phase 19.C nested movement-screen routing.** Separate workstream.

---

## §8 — Implementation Footprint

**This slice ships zero code changes.** The slice's deliverable is this receipt + decision artifact.

| File | Change |
|---|---|
| `docs/ai-workflow/AI-HANDOFF/PHASE-18B-CANONICAL-SURFACE-RECEIPT-2026-04-27.md` (NEW) | This document |

Optionally, in a follow-up commit if Sean wants the priorities file synced:
- `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md` — mark Phase 18.B ✅ DONE with a one-line pointer to this receipt.

---

## §9 — Future Review Hooks

For Codex / Gemini / Village / future Sean / future Claude:

- [ ] **Trainer view-as gap.** The current `MyClientsView` role-branched adapter lets admins browse the trainer dashboard but does not let trainers view-as a specific client. If product direction adds multi-trainer scaling, a `/dashboard/trainer/clients/view-as/:userId` route becomes a real need. Audit current ClientTrainerAssignment scope guards before adding it.
- [ ] **Audit-log differentiation.** Currently admin actions during view-as audit identically to admin actions outside view-as. Future security pass: add an `adminContext: 'view-as' | 'manage'` field to the audit-log records, gated by referrer/path. Threat model: if an admin token is compromised, distinguishing "preview" from "act" calls helps forensics.
- [ ] **UnifiedAdminRoutes dormant-route declaration.** Line 211 still has a `<Route path="view-as/:userId">` declaration that's unreachable (the parent file is not JSX-mounted). It will resurface every time someone greps `view-as` and assumes it's active. Either delete the declaration or add a comment noting "DORMANT — canonical mount lives at UniversalDashboardLayout.tsx:506."
- [ ] **ViewAsBanner consistency on Surface B.** When admin navigates to `?clientId=X` (Surface B), the banner does NOT appear (because `activeRole === 'admin'`). This is correct per the design — Surface B is admin-as-admin, not view-as. But if a future change makes Surface B feel more like impersonation (e.g. presenting client-perspective data), the banner gating logic should be re-examined.
- [ ] **Recon recurrence.** If a fourth client-focus surface appears (e.g. a new `/dashboard/admin/clients/:id` route or similar), re-run the surface map recon before merging to avoid drift back into competing-surface territory.

---

## §10 — Sign-off

| Field | Value |
|---|---|
| **Verdict** | Option 1 — Keep route-level view-as as canonical |
| **Code changes** | None |
| **Tests added/modified** | None |
| **Files added** | This receipt only |
| **Branch** | main |
| **Risk** | Zero — doc only |
| **Next action** | Sean reviews receipt; if approved, commit + push doc; mark Phase 18.B closed in priorities file |

---

**End of Phase 18.B receipt.** This document closes the architectural question. The two surfaces (A: `/view-as/:userId`, B: `?clientId=X`) stay canonical and separate. No code work follows from this slice. Next code slice candidates: cleanup backlog from `2c6ea9787` audit record (motion accessibility + MAW theme-typing) or a new slice driven by what Sean's first-paying-client runbook surfaces in production.
