# Phase 18.C.1B.1R — Recovery Receipt (Canonical Remount)
**Date:** 2026-04-24
**Author:** Claude Opus 4.7
**Preceded by:** Production smoke REVISE (Playwright, this session) — confirmed `AdminViewAsWrapper` is orphaned; the 3-commit stack `74bfbc82c` + `961d38920` + `01c555d35` fixed display-layer bugs on a component that no live route renders.
**Status:** Receipt only — NO CODE until receipt is approved.

---

## §1. Correction of the prior Canonical Surface Receipt

The Phase 18.C.1B planning doc (`PHASE-18C1B-PLANNING-FRONTEND-VIEWAS-WIRING-2026-04-24.md:§1.1`) claimed `/dashboard/people/view-as/:userId` was the canonical admin view-as entry point and cited `UnifiedAdminRoutes.tsx:211` as JSX proof of mount. That was incorrect — I had nested-Route JSX evidence but failed to walk UP the tree to verify the parent (`UnifiedAdminRoutes`) was itself mounted in the live route tree. Phase 19 cleanup (2026-04-21) unmounted that parent. Exactly the failure mode CLAUDE.md rule 26 is written to prevent.

The corrected receipt for live admin surfaces follows.

---

## §2. Required Proofs (rule 26 — Canonical Surface Receipt, with file:line evidence)

### §2.1 PROOF — Live parent route is `UniversalDashboardLayout`, NOT `UnifiedAdminRoutes`

**Evidence chain:**
- [frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:483](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L483): `const roleConfigurations: Record<string, RoleConfig> = { admin: { routes: [...], defaultPath: '/coach-assistant' } }` — this is the canonical source of all admin routes.
- [frontend/src/config/dashboard-tabs.ts:537-547](frontend/src/config/dashboard-tabs.ts#L537-L547) (committed 2026-04-21): explicit comment stating `/dashboard/people` prefix "resolved to UnifiedAdminRoutes which is no longer mounted in the active routing tree (only UniversalDashboardLayout is mounted at /dashboard/* per routes/DashboardRoutes.tsx:49-58)."
- [docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md:44](docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md): classifies `ClientsWorkspace.tsx` as canonical, `UnifiedAdminRoutes.tsx` (line 50) + `UnifiedAdminDashboardLayout.tsx` (line 51) + `MasterDetailLayout.tsx` (line 52) as legacy/dormant.
- Production Playwright smoke this session: navigation to `/dashboard/people/view-as/<CLIENT_ID_REDACTED>` was silently redirected to `/dashboard/admin/coach-assistant`. No fetch ever fired (network log empty on the `gamification|people|view-as|api/admin/clients/<CLIENT_ID_REDACTED>` filter). Matches the documented catch-all behavior.

**Result:** PROVEN. `UnifiedAdminRoutes` is legacy; `UniversalDashboardLayout` is the only live admin parent.

### §2.2 PROOF — Canonical admin namespace is `/dashboard/admin/*`

**Evidence chain:**
- Every admin route at [UniversalDashboardLayout.tsx:485-570](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L485-L570) is a relative path (e.g. `/overview`, `/coach-assistant`, `/client-management`). These paths are rendered inside a `<Route path="/dashboard/:role/*">` outer mount such that the admin role resolves them all under `/dashboard/admin/*`.
- Catch-all at [UniversalDashboardLayout.tsx:869](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L869) and [:874](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L874): `<Navigate to={`/dashboard/${activeRole}${roleConfig.defaultPath}`} replace />` confirms the `/dashboard/{role}/*` mount shape. For admin role this renders `/dashboard/admin/{path}`.
- Production smoke: landed on `/dashboard/admin/coach-assistant` after the dead-route redirect fired (admin `defaultPath = '/coach-assistant'` at [UniversalDashboardLayout.tsx:572](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L572)), directly confirming the `/dashboard/admin/*` shape.

**Result:** PROVEN.

### §2.3 PROOF — Existing Client Hub is `/dashboard/admin/client-management`

**Evidence:**
- [UniversalDashboardLayout.tsx:500](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L500): `{ path: '/client-management', component: React.lazy(() => import('./workspaces/ClientsWorkspace')), title: 'Client Hub', description: 'Unified client management with selector, cards, and detail tabs' }`.
- Production smoke verified: clicking "Clients & Team" in the admin sidebar landed on `https://sswanstudios.com/dashboard/admin/client-management` and rendered ClientsWorkspace with the live client roster (names redacted per rule 44).
- Clicking a live client with non-zero gamification data took me to `https://sswanstudios.com/dashboard/admin/client-management?clientId=<CLIENT_ID_REDACTED>` — confirms `/dashboard/admin/client-management` is the live canonical admin client surface.

**Result:** PROVEN.

### §2.4 PROPOSED — New canonical route for AdminViewAsWrapper

**Recommended:** `/dashboard/admin/client-management/view-as/:userId`

**Rationale:**
- Semantically nests the view-as detail under the Client Hub surface where it already belongs conceptually ("drill into one client from the roster").
- Uses only the existing canonical `/dashboard/admin/*` namespace — no `/dashboard/people/*` reintroduced.
- Does NOT require re-mounting `UnifiedAdminRoutes` (forbidden by Sean's constraint).
- Parallels other deep paths already in roleConfigurations like `/nutrition/:clientId?`, `/notes/:clientId?`, `/workouts/:clientId?`, `/photos/:clientId?` ([UniversalDashboardLayout.tsx:504-507](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L504-L507)).

**Alternative considered:** `/dashboard/admin/view-as/:userId` (flat, peer to `/client-management` rather than child). Rejected because it loses the semantic link to the Client Hub, complicates the "back to clients list" navigation story, and duplicates the concept "admin looking at a specific client" across two adjacent routes. The nested form is more discoverable.

### §2.5 PROOF — Mount via roleConfigurations, not UnifiedAdminRoutes

**Evidence that this is the canonical pattern:**
- All live admin routes live in the admin config at [UniversalDashboardLayout.tsx:483-573](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L483-L573). There is no other live path-to-component registration for admin in the repo.
- The Phase 19 receipt explicitly classifies `UnifiedAdminRoutes` as legacy ([PHASE-19 receipt:50](docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md)).

**Implementation will:** add one entry to the admin `routes` array at `UniversalDashboardLayout.tsx:500-508`, adjacent to `/client-management` so they're visually grouped:
```ts
{
  path: '/client-management/view-as/:userId',
  component: React.lazy(() => import('./Pages/admin-clients/components/AdminViewAsWrapper')),
  title: 'View As Client',
  description: 'Read-only admin impersonation view of a single client\'s profile, workouts, sessions, and gamification'
}
```

**Result:** Mount mechanism ratified against the canonical pattern.

### §2.6 PROOF — Existing viewAs test was invalid (synthesized dead mount)

**Evidence:**
- [AdminViewAsWrapper.viewAs.test.tsx:36-39](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.viewAs.test.tsx#L36-L39):
  ```tsx
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/dashboard/people/view-as/:userId" element={<AdminViewAsWrapper />} />
      <Route path="/dashboard/people/view-as" element={<AdminViewAsWrapper />} />
    </Routes>
  </MemoryRouter>
  ```
  The test synthesizes a mount at a path that does not exist in the live route tree. It validated the component's internal behavior but did not prove the route is live. Tests passed 4/4 while the production page redirected before mount.
- Rule 26 explicitly calls this out: "a lazy `import()` declaration is NOT proof of mount, JSX usage is." A MemoryRouter synthesizing a route is analogous — JSX that never executes in production.

**Result:** PROVEN. Test must be updated to point at the new canonical path AND a separate route-level guard test must assert that path exists in the live `roleConfigurations` admin routes array.

### §2.7 Related live reference: L6 in Phase 19 receipt

Per Phase 19 receipt §3.3 L6 ([PHASE-19 receipt:65](docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md)): `EnhancedAdminClientManagementView.tsx:1841, 2130` has a "View client dashboard" button + Swan Coach insights CTA pointing at `/dashboard/people/view-as/{clientId}` — blocked until 18.B delivered a canonical admin-as-client impersonation route.

**This recovery slice unblocks L6.** Once `/dashboard/admin/client-management/view-as/:userId` is live, those two navigate targets can be retargeted.

**Grep confirmation this session:** I ran `grep -n "view-as/\|dashboard/people" EnhancedAdminClientManagementView.tsx` and found 0 current matches. The Phase 19 receipt line numbers (1841, 2130) either drifted or were fixed in a later commit. **This slice does not rely on that pre-existing caller.** No pre-existing caller found; this recovery slice adds the canonical Client Hub CTA (§4.1 item 3) as the live entry point, so the new route ships with a working workflow from the Hub — not just direct URL.

---

## §3. Hard constraints honored (per Sean's directive)

- ✅ Do NOT remount `UnifiedAdminRoutes` — new route lives in `roleConfigurations` only.
- ✅ Do NOT reintroduce `/dashboard/people/*` — new route is `/dashboard/admin/client-management/view-as/:userId`, strictly within the canonical admin namespace.
- ✅ Do NOT claim 18.C.1B.1 is production-fixed until Playwright smoke on the NEW path passes. The prior 3-commit stack's corrected framing: "display-layer drift fixes applied to an orphaned aggregator" — only becomes "production-fixed" after 18.C.1B.1R lands and the production smoke on the new path passes the 7-point checklist.
- ✅ Backend Phase 18.C.1A remains untouched — this slice is frontend-route-plumbing only.

---

## §4. Proposed implementation scope (to be built ONLY after receipt approval)

### §4.1 Files touched

1. **`frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`** — MODIFIED
   - Add lazy import for `AdminViewAsWrapper` near the existing Pages/admin-clients imports.
   - Add one entry to the admin `routes` array (adjacent to the `/client-management` entry at line 500):
     ```ts
     { path: '/client-management/view-as/:userId', component: AdminViewAsWrapper, title: 'View As Client', description: '...' }
     ```
   - Estimated: +1 lazy import line, +1 route config line (kept single-line to match the existing style of adjacent entries).
   - Export of `roleConfigurations`: NOT added. Per Codex Gate #1, the guard test uses source-text scanning (see item 4) — no API-surface change needed.

2. **`frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx`** — MODIFIED
   - Header JSDoc block at lines 1-26: update `PARENT:` reference from `UnifiedAdminRoutes / ClientsWorkspace` to `UniversalDashboardLayout roleConfigurations (admin)`. Leave `CLICK-OUTCOMES: [Exit View] → /dashboard/admin/client-management` intact — it matches the runtime `handleExit()` at [AdminViewAsWrapper.tsx:358](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx#L358) (already canonical; confirmed by grep this session — only two `/dashboard/people` references would exist in the JSDoc parent-path block, nowhere else in the file).
   - No functional change — doc-only updates.

3. **`frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx`** — MODIFIED (NEW live CTA per Codex Gate #1 Fix 2)
   - Add a new `handleViewAsClient` callback near the existing `useCallback` block (current handlers at [lines 313-336](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx#L313-L336)):
     ```ts
     const handleViewAsClient = useCallback(() => {
       if (selectedClient) {
         navigate(`/dashboard/admin/client-management/view-as/${selectedClient.id}`);
       }
     }, [navigate, selectedClient]);
     ```
   - Add a new `ActionBtn` inside `<TopBarActions>` at [lines 405-420](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx#L405-L420), gated on `selectedClient` (same gating as "Log Workout"). Proposed placement: between "Log Workout" and "Swan Coach" so the user's mental model is "drill into client data → view as client → open coach context":
     ```tsx
     {selectedClient && (
       <ActionBtn onClick={handleViewAsClient} title={`View ${selectedClient.firstName}'s dashboard as admin (read-only)`}>
         <Eye size={16} />
         <span>View As</span>
       </ActionBtn>
     )}
     ```
   - Import `Eye` from `lucide-react` (matches the existing icon import pattern in this file).
   - Text "View As" chosen over "Preview Dashboard" because it matches the URL segment and the repo's established `admin-view-as` terminology.

4. **`frontend/src/components/DashBoard/UniversalDashboardLayout.adminViewAsRoute.test.ts`** — NEW (source-text guard)
   - Per Codex Gate #1 Fix 1, uses **source-text scanning** (option B), NOT runtime import of `roleConfigurations` (which is private at [UniversalDashboardLayout.tsx:483](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L483); the file's only default export is at [line 959](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L959)). Does NOT rely on `React.lazy` factory `.toString()`.
   - Pattern mirrors the existing `frontend/src/__tests__/no-dead-people-routes.test.ts` which already does `readFileSync` + regex scans.
   - Asserts four invariants by reading `UniversalDashboardLayout.tsx` as raw text:
     - (a) Contains the route **object pattern** `path: '/client-management/view-as/:userId'` — not just the literal anywhere in the file. Regex requires the `path:` key immediately before the literal, so a stray comment or unrelated string cannot pass the guard.
     - (b) The route object's `component:` field references `AdminViewAsWrapper` within a short distance of the route literal (scoped proximity match — e.g. same block or within ~200 chars) so the test proves the route is wired to the right component, not any component.
     - (c) Contains an import statement pulling `AdminViewAsWrapper` from `./Pages/admin-clients/components/AdminViewAsWrapper`.
     - (d) Does NOT contain `/dashboard/people/view-as` anywhere (defensive — this file is already in the live tree so a regression there would be a rule-27 violation).
   - This guard prevents the "test passes while production route is dead" regression by anchoring to the ONE file that is definitively in the live route tree, AND prevents a weaker form of regression where the literal exists but isn't wired into a real route object.

5. **`frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.viewAs.test.tsx`** — MODIFIED
   - Update `MemoryRouter` paths at [lines 37-38](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.viewAs.test.tsx#L37-L38) from `/dashboard/people/view-as/:userId` and `/dashboard/people/view-as` to `/dashboard/admin/client-management/view-as/:userId` and `/dashboard/admin/client-management/view-as` (no-userId variant).
   - Update `renderAt` call sites (there are 4, invoked from each `it(...)` block — lines 79, 96, 106, 121) to pass the new path prefix.
   - Update the explanatory comment block at lines 1-18 to note the route lives under `/dashboard/admin/client-management/*` and the synthesized-mount failure mode discovered in 18.C.1B.1R.
   - No assertion changes — URL-under-test does not affect the asserted fetch URL (`/api/v1/gamification/profile` with `{ params: { viewAs } }`).

6. **`frontend/src/components/DashBoard/workspaces/ClientsWorkspace.viewAsCta.test.tsx`** — NEW (Codex Gate #1 Fix 2)
   - Sibling test file proving the "View As" CTA navigates to the new canonical route.
   - Mocks `react-router-dom`'s `useNavigate` to capture the nav target.
   - Renders `ClientsWorkspace` with a seeded selected synthetic fixture client (id=424242) and mocked auth/global-client context (mirrors the minimal-context pattern used by other admin-clients tests this session). Synthetic id chosen to keep production PII out of commit-bound files (rule 44).
   - Asserts: clicking the "View As" button calls `navigate('/dashboard/admin/client-management/view-as/424242')` exactly once with that exact string.
   - Asserts: when no client is selected, the "View As" button is NOT rendered (gated on `selectedClient` like "Log Workout").

7. **`frontend/src/__tests__/no-dead-people-routes.test.ts`** — AUDIT, likely unchanged
   - Current ALLOWLIST at lines 34-48 covers `UnifiedAdminRoutes.tsx`, `MasterDetailLayout.tsx`, `ClientsWorkspace.tsx`, `dashboard-tabs.ts` — none of which this slice introduces new `/dashboard/people` literals to. No ALLOWLIST delta expected.
   - Note: `ClientsWorkspace.tsx` is already allowlisted for an existing documentation comment (per line 42). The new `handleViewAsClient` handler I'm adding uses only `/dashboard/admin/client-management/view-as/...` literals, so the allowlist reason stays accurate.
   - Confirm post-implementation: full `no-dead-people-routes.test.ts` still passes.

8. **`docs/ai-workflow/AI-HANDOFF/PHASE-18C1B-PLANNING-FRONTEND-VIEWAS-WIRING-2026-04-24.md`** — MODIFIED (closeout correction)
   - Add §9 Correction block: document that §1.1 canonical surface receipt was wrong (synthesized-mount trap), link to this recovery receipt, correct the "production-fixed" framing.

### §4.2 Non-goals (explicit — locked)
- No β (client-dashboard-under-admin-impersonation via `useGamificationData` hook + new admin shell). That remains deferred to 18.C.1B.2 per original sequencing. This slice is α-recovery only.
- No backend changes.
- No axios interceptor.
- No React context for impersonated userId (Phase 18.A's `useGlobalClient` context already exists for a different flow — do not entangle).
- No `EnhancedAdminClientManagementView` CTA retargeting in this slice — if live callers exist, retarget them in a follow-up slice so this one stays pure route-plumbing + new canonical entry point. Confirm current state via grep during impl.
- No named export of `roleConfigurations` — guard test uses source-text scanning instead (Codex Gate #1 Fix 1 option B).

### §4.3 Post-implementation verification
1. Targeted frontend unit tests:
   - `AdminViewAsWrapper.viewAs.test.tsx` — 4/4 passing with new `/dashboard/admin/client-management/view-as/*` paths.
   - `UniversalDashboardLayout.adminViewAsRoute.test.ts` — NEW source-text guard, 3 assertions (route literal present, import path present, no `/dashboard/people/view-as` in this live file).
   - `ClientsWorkspace.viewAsCta.test.tsx` — NEW CTA test, 2 assertions (click → navigate to canonical route; no render when no client selected).
2. Rule-42 backend audit: trivially clean (no backend changes).
3. Rule-44 secret scan: pre-commit hook on ~7 files.
4. **Full `no-dead-people-routes` guard still passes.**
5. Frontend test subset (related): `MyClientsView.adminViewAs.test.ts`, `UniversalDashboardLayout.viewAsBanner.test.ts`, existing `ClientsWorkspace`-consuming tests if any — confirm no collateral regressions.
6. **Production Playwright smoke on `/dashboard/admin/client-management/view-as/<realClientId>`** — 7-point checklist from Sean's original smoke spec. Passing this is the ONLY acceptable closeout.
7. **Live-CTA smoke (new, per Codex Gate #1 Fix 2):** from the canonical Client Hub (`/dashboard/admin/client-management`), select a client with non-zero gamification data, click the new "View As" button, verify navigation to the correct canonical URL and that points 1-7 of the original checklist still pass from that entry path (not just typed URL).

### §4.4 Gate sequence (rule 46)
- **Gate #1 (this receipt):** submit to Sean + optional Codex relay before any code edit.
- **Gate #2 (pre-code receipts):** N/A for a slice this narrow — the receipt IS the pre-code evidence. Proceed to impl under auto-mode once Gate #1 approves.
- **Gate #3 (impl diff):** produce Opus/Codex debate doc with the 5-6 file diff; Sean direct or Codex relay.
- **Production smoke gate:** Playwright on the NEW canonical path. Closeout only on PASS.

---

## §5. Known unknowns / open audit items

1. Whether `EnhancedAdminClientManagementView.tsx` still contains `/dashboard/people/view-as/{clientId}` live CTAs as Phase 19 L6 claimed. My grep this session found 0 matches at 2026-04-24. Phase 19 receipt line numbers (1841, 2130) may have drifted. Re-verify during implementation; do NOT retarget in this slice either way (out of scope).

2. Whether any non-test file (besides `UnifiedAdminRoutes.tsx`, already allowlisted) references `AdminViewAsWrapper` in a way that assumes the old route. To confirm during impl, `grep -rn "AdminViewAsWrapper\|view-as" frontend/src/` minus the test file.

3. Whether Phase 18.A's persistent `ViewAsBanner` + `useGlobalClient` pattern ([UniversalDashboardLayout.tsx:31, 835](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx) + [ViewAsBanner.tsx:142](frontend/src/components/DashBoard/components/ViewAsBanner.tsx)) conflicts with rendering AdminViewAsWrapper at its new canonical path. Likely not — the banner is a top-level layout concern that applies uniformly, and AdminViewAsWrapper is a page-level component that renders below the banner. But call this out in the impl commit's debate doc so a reviewer can sanity-check.

---

## §6. Round log

### Round 1 — Claude → Sean (2026-04-24)
Receipt submitted. Proposed verdict: APPROVE.

### Round 2 — Codex Gate #1 → Claude (2026-04-24) — REVISE
Two HIGH findings + one LOW:
- **HIGH (Fix 1):** Route guard test not implementable as written — `roleConfigurations` is private (no named export at [UniversalDashboardLayout.tsx:483](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L483)), only default component export at line 959. Must either add named export OR use source-text guard. React.lazy `.toString()` not acceptable.
- **HIGH (Fix 2):** No live user entry point — direct-URL-only would pass smoke without restoring admin workflow. Current Client Hub action bar at [ClientsWorkspace.tsx:405-420](frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx#L405-L420) shows Log Workout / Swan Coach / New Client only. Must add a selected-client "View As" CTA with a targeted test.
- **LOW:** typo `PROOPOSED` at §2.4; tighten stale line refs.

### Round 3 — Claude → Sean (this revision, 2026-04-24)
Applied in receipt:
- **§2.4:** typo fixed (`PROOPOSED` → `PROPOSED`).
- **§4.1 item 1:** explicitly notes `roleConfigurations` stays private; no named export added.
- **§4.1 item 3 (NEW):** `ClientsWorkspace.tsx` modification — new `handleViewAsClient` callback + `ActionBtn` gated on `selectedClient`, placed between "Log Workout" and "Swan Coach" for the drill-in mental model. Uses `Eye` icon, text "View As". Navigates to `/dashboard/admin/client-management/view-as/${selectedClient.id}`.
- **§4.1 item 4 (rewritten):** route guard test now source-text based (Codex Fix 1 option B), mirrors the `no-dead-people-routes.test.ts` `readFileSync` + regex pattern. Three assertions: route literal present, import path present, no `/dashboard/people/view-as` in this live file.
- **§4.1 item 6 (NEW):** `ClientsWorkspace.viewAsCta.test.tsx` proves CTA navigation + gating behavior.
- **§4.2:** new explicit non-goal — no named export of `roleConfigurations`.
- **§4.3:** post-implementation checklist expanded — new tests listed, new live-CTA smoke step added as checklist item #7.

Scope total: 8 files (2 modified core + 1 modified CTA + 2 new tests + 1 modified existing test + 1 audit + 1 planning-doc closeout correction).

**Proposed verdict:** APPROVE. Ready for Sean to relay to Codex Gate #1 Round 2 or approve directly.
