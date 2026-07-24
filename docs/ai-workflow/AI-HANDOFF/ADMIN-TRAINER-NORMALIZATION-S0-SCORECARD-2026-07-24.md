# Admin↔Trainer Normalization — S0 Component Maturity Scorecard & Visual-Debt Gate

**Workstream:** Admin↔Trainer dashboard normalization (S0→S5)
**Branch:** `feat/admin-trainer-normalization` (worktree off fresh `origin/main@e57f6804a`)
**Author:** Claude Opus 4.8 (lead orchestrator), 2026-07-24
**Handoff:** `ADMIN-TRAINER-NORMALIZATION-HANDOFF-PROMPT-2026-07-24.md`
**Kimi review the plan was hardened against:** `KIMI-ADMIN-TRAINER-NORMALIZATION-2026-07-24.md` (verdict: SHIP-WITH-CHANGES — add this Slice 0)

> This is Kimi's mandatory Slice 0: the mechanical maturity scorecard + visual-debt gate that converts "normalize toward the most mature" from an opinion into a rule. **No migration code is written until this exists.** Kimi's #1 fear — that a builder would drag MUI / Recharts / hardcoded hex / retired Galaxy-Swan into the mature tree — is answered here with grep evidence, not assertion.

---

## TL;DR — the headline finding (the reframe)

**On fresh `origin/main`, the System-A ↔ System-B normalization the handoff describes is ~80% already shipped (Phase 17–19).** The evidence below proves it. This changes the slice plan from "do a big risky migration" to "**lock the already-won state so it can never regress, then finish the genuinely-missing pieces (nav drift, View-As design, least-clicks palette).**"

Specifically, on current main:
- The admin Client Hub and trainer Clients surface are **the same component, two audiences** — `ClientsWorkspace` with an `audience` prop; `TrainerClientsWorkspace` is literally `<ClientsWorkspace audience="trainer" />`. This IS the handoff's target end state.
- **Every** client-action deep link inside that workspace already resolves through `getClientHubAudienceConfig(audience).*Base` — admins stay under `/dashboard/admin/*`, trainers under `/dashboard/trainer/*`. Log-workout does not even navigate; it opens the training tab **in place**.
- The admin sidebar (`WORKSPACE_CONFIG`, 30 entries) is **100% `/dashboard/admin/*`** — zero admin nav entries bounce to trainer.
- The legacy System-B `MyClientsView` is a **dormant lazy export with no route consumer**.
- The visual-debt gate is **clean**: zero MUI, zero Recharts, zero retired Galaxy-Swan hex, zero forbidden copy across both trees.

**Integrity note (Rule 28 / 52 / 73):** I am NOT claiming to have "fixed the admin bounce" — the mounted code path that caused it was fixed by Phase 17–19 before this session. What this workstream ADDS is (a) a regression wall so it cannot silently return, and (b) the not-yet-done pieces below.

---

## 1. Visual-Debt Gate — grep evidence (Kimi's mandatory gates)

All commands run against the fresh worktree `frontend/src`. **A gate must be green before a component is eligible to be "crowned" the mature surface.**

| Gate | Command | Result | Verdict |
|---|---|---|---|
| No MUI/Recharts in System A | `rg -i "@mui\|recharts" .../workspaces` | **0 matches** | ✅ System A is crownable |
| No MUI/Recharts dragged by System B | `rg -i "@mui\|recharts" .../TrainerDashboard` | **0 matches** | ✅ nothing to drag in |
| Retired Galaxy-Swan hex in System B | `rg "#0a0a1a\|#00FFFF\|#7851A9\|#00ffff" .../TrainerDashboard` | **0 matches** | ✅ palette clean |
| Forbidden copy in System B | `rg -i "yoga\|meditation\|NASM-certified" .../TrainerDashboard` | **0 matches** | ✅ copy clean |
| `prefers-reduced-motion` in client trees | `rg -l "prefers-reduced-motion" .../workspaces/clients-team` | 12+ style files | ✅ motion-safe |

**Kimi's single biggest unmitigated risk — "`EnhancedClientProgressView` almost certainly renders Recharts" — is FALSE on current main.** The `@mui|recharts` grep over the entire `TrainerDashboard` tree (which contains `EnhancedClientProgressView`) returns zero. There is no Recharts→Victory port to do; the port already happened. Gate passed.

---

## 2. Canonical Surface Receipt (Rule 26) — how client management actually mounts

| Layer | Evidence (file:line) | Result |
|---|---|---|
| Admin client-mgmt route | `UniversalDashboardLayout.routes.tsx:112` | `/client-management` → `ClientsWorkspace` (System A, `audience='admin'` default) |
| Trainer clients route | `UniversalDashboardLayout.routes.tsx:170` | `/clients` → `TrainerClientsWorkspace` (System A, `audience='trainer'`) |
| One-workspace-two-audiences | `TrainerClientsWorkspace.tsx:14` | `<ClientsWorkspace audience="trainer" />` — same component |
| Audience config | `clients-team/clientHubAudience.ts:37-56` | admin bases `/dashboard/admin/*`, trainer bases `/dashboard/trainer/*` |
| Deep-link resolvers | `clients-team/clientDailyTrainingRoutes.ts:32,71,90,116` | every base read from `getClientHubAudienceConfig(audience).*Base` |
| Quick-action resolver | `clients-team/clientCardQuickActions.ts:8-19` | `buildClientCardQuickActionRoute(id, action, audience)` |
| Admin log-workout | `ClientsWorkspace.tsx:108,166,187` | `showClientDetailTab(client,'training','logger')` — **in place, no navigation** |
| Admin log-workout route redirect | `UniversalDashboardLayout.routeComponents.tsx:186-192` | `/dashboard/admin/log-workout` → stays under `/dashboard/admin/client-management` |
| Admin sidebar | `config/dashboard-tabs.ts:153-212` | `WORKSPACE_CONFIG` 30 entries, all `/dashboard/admin/*` |

**Conclusion:** an admin operating the Client Hub is never sent to `/dashboard/trainer/*`. The receipt proves it end-to-end.

---

## 3. Surface Classification Table (Rule 27)

| Surface | file | Classification | Evidence |
|---|---|---|---|
| `ClientsWorkspace` (audience-scoped) | `workspaces/ClientsWorkspace.tsx` | **CANONICAL** (System A) | mounted admin `/client-management` + trainer `/clients` |
| `TrainerClientsWorkspace` | `workspaces/TrainerClientsWorkspace.tsx` | **CANONICAL** (thin audience wrapper) | `routes.tsx:170` |
| `EnhancedClientProgressView` | `TrainerDashboard/ClientProgress/…` | **CANONICAL (trainer-only)** | `routes.tsx:173` (`/dashboard/trainer/client-progress`); admin uses `AdminClientProgressView` at `/client-progress-tracking` |
| `EnhancedWorkoutLogger` | `TrainerDashboard/WorkoutLogging/…` | **CANONICAL (trainer-only)**, already role-aware | `routes.tsx:172`; uses `clientHubRedirectPath` (Phase 17) |
| `MyClientsView` | `TrainerDashboard/ClientManagement/MyClientsView.tsx` | **DORMANT** | lazy export exists (`routeComponents.tsx:53`) but **no route references it**; trainer `/clients` uses `TrainerClientsWorkspace` |
| `MyClientsViewWithFallback` | `…/MyClientsViewWithFallback.tsx` | **DORMANT / redundant** (377 lines) | named export only; `ClientManagement/index.ts:14` default is `MyClientsView`; truth-test `ClientManagement.index.truth.test.ts:17` locks default ≠ WithFallback |

**The hardcoded `/dashboard/trainer/*` navigate calls the handoff flagged** live only in `MyClientsView.tsx` (110/114/127/131/135) and `MyClientsViewWithFallback.tsx` (200/204/208) — **both DORMANT** — plus `EnhancedClientProgressView.tsx:156` (`onBackToClients`), which is **trainer-only mounted**, so `/dashboard/trainer/clients` is the *correct* target there. **None of these are reachable by an admin.** This is why the live bounce is already gone.

---

## 4. Component Maturity Scorecard (Kimi's 7-column matrix)

Columns: (1) styled-components only · (2) Victory-only (no Recharts) · (3) `var(--token,#fallback)` palette · (4) ≤300 lines · (5) 44px targets · (6) reduced-motion safe · (7) routes audience-aware.

| Capability | Winner (mounted) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Notes |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Client list + selector | `ClientsWorkspace` (288L) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | audience-scoped roster + cards |
| Client detail tabs | `clients-team/tabs/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | tabs gated by `visibleDetailTabs` |
| Workout-logging entry | in-place training tab | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | no navigation — opens logger tab |
| Planner entry | `buildClientWorkoutPlannerRoute` | — | — | — | — | — | — | ✅ | audience-resolved |
| Progress view (trainer) | `EnhancedClientProgressView` (181L) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | trainer-only; back-link correct for trainer |
| Account ops | `useClientAccountLifecycle` | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | `canManageAccounts` gated |
| **Legacy client list** | `MyClientsView` (298L) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | **DORMANT** — hardcodes trainer paths but unmounted |
| **Legacy fallback list** | `MyClientsViewWithFallback` (377L) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | **DORMANT** + over 300L; deletion candidate (Rule 34, Sean-gated) |

**Reading:** the *mounted* client-management stack passes all seven columns. The only rows that fail column 7 (audience-aware routes) are the two **dormant** legacy files — which is a latent landmine, not a live bug. That landmine is what S1 nails shut.

---

## 5. Revised slice plan (what is genuinely left to build)

| Slice | Original handoff intent | Fresh-main reality | This session |
|---|---|---|---|
| **S0** | scorecard + gate | — | ✅ this doc |
| **S1** | replace hardcoded trainer paths in shared components | mounted paths already audience-resolved; only dormant files hardcode | **Regression WALL**: contract test that locks (a) admin audience never yields `/dashboard/trainer/*`, (b) no *mounted* shared client surface contains a hardcoded trainer literal. Neutralizes the dormant landmine by making re-introduction fail CI. |
| **S2** | migrate System-B uniques into System-A, retire System B | migration done; System-B client list is dormant | **Classify + propose deletion** of `MyClientsView*` (Rule 34 — grep-checked, Sean-gated, NOT blind-deleted here). Documented, not executed. |
| **S3** | config-drive trainer sidebar from a shared source | trainer sidebar is a hand-maintained `trainerNavConfig`; admin is a separate `WORKSPACE_CONFIG` → real drift | **Shared nav registry** — single role-filtered source both sidebars derive from + drift-lock test. |
| **S4** | View-As design fix | banner uses cyan-primary (reads "normal"), inline, weak | **Redesign** to warning-adjacent token, full-width persistent, stronger presence, ≥44px, Dual-Button Glow, reduced-motion. |
| **S5** | (optional) Cmd+K palette | not built | **Role-aware command palette** over the nav registry — the real least-clicks answer + Kimi's "signature moment." |

---

## 6. Design contracts (Sean's per-UI-slice rule)

### 6.1 — ViewAsBanner (S4)
- **Token map:** surface `var(--warning-surface, …amber…)` NOT `--accent-primary`; text `var(--text-primary,#E0ECF4)`; return button keeps purple-bg→cyan-glow Dual-Button Glow.
- **Anatomy:** full-width bar pinned above dashboard content · shield/eye icon · heading "Admin view — {Trainer|Client} Dashboard" · supporting audit line · ≥44px "Return to Admin Dashboard" button.
- **Signature moment:** a subtle animated left-edge "live view" indicator (reduced-motion → static).
- **States:** always-present while `activeRole !== 'admin'`; no loading/empty (pure presentational).
- **Responsive 320/375/414/768+:** wraps button below text under 480px; text never clipped; icon+heading stay on one line.
- **Why warning-adjacent, not cyan:** cyan primary = "normal/brand"; the whole point is that impersonation must NOT read as normal (Kimi weakness #5, TrueCoach/Trainerize parity).

### 6.2 — Shared nav registry (S3)
- **Data:** one `DashboardNavItem[]` with `{ id, label, icon, path, roles, section }`; `buildRoleNav(role)` filters by `roles` and preserves section order.
- **Invariant:** filtering hides items **without reordering** survivors (logical focus order preserved — Kimi a11y point).
- **Drift lock:** a test asserts trainer-visible items ⊆ registry and that the admin sidebar prefixes stay `/dashboard/admin/*`.

### 6.3 — Command palette (S5)
- **Trigger:** Cmd/Ctrl+K · **Anatomy:** centered modal, search input, ranked results grouped by section, keyboard nav (↑/↓/Enter/Esc), ≥44px rows.
- **Audience resolution:** every result's path comes from the nav registry filtered by the actor's role — an admin's "Log workout" resolves to the admin surface, never trainer.
- **Signature moment:** type-to-filter with fuzzy match + section chips; reduced-motion safe; focus trap; returns focus to trigger on close.

---

## 7. Verification (S0 has no runtime code — evidence is grep + reads)

- Visual-debt gates: §1 (all green).
- Canonical receipt: §2 (file:line).
- Proof harness confirmed live: `npx vitest run ViewAsBanner.test.tsx` → **6/6 pass** (1.9s) in this worktree after `npm ci`.

**Next slice:** S1 — the audience-resolution regression wall (locks the already-won state so admin↔trainer can never silently re-diverge).
</content>
</invoke>
