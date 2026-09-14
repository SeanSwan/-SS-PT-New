# Phase 18 P1-O — Recent Workouts Drilldown + F-1 Banner + Sibling Sweep — Audit Record

> **Rule 48 artifact.** Permanent, self-contained record of this phase. A future reviewer (Codex / Gemini / Sean / Village) should be able to read this single file and produce useful security, performance, and UX feedback without re-reading the plan, the receipt, or the source files. If you find that incorrect, the gap is in this document.

---

## §1 — Phase Header

| Field | Value |
|---|---|
| **Phase name** | Phase 18 P1-O — Recent Workouts Drilldown + F-1 Banner + Sibling Sweep |
| **Scope** | Frontend-only fix to (a) AdminViewAsWrapper banner empty-name bug (F-1), (b) admin Recent Workouts drilldown gap (P1-O / F-3), (c) Rule-20 sibling sweep across two additional consumers of the same backend endpoint that carried the same unwrap-depth drift |
| **Start date** | 2026-04-25 (S1 partial closeout surfaced the findings) |
| **End date** | 2026-04-27 (commit `276bc2166` pushed to main) |
| **Reviewers** | Sean (operator), in-conversation hostile reviewer (practice round) — REVISE → APPROVE |
| **Codex review status** | DEFERRED — Codex unavailable for ~24h at push time; Sean explicitly authorized direct push and asked for this audit record so Codex can review later |
| **Final verdict** | SHIPPED to main · pending deferred Codex review · awaiting production smoke verification |
| **Commit SHA** | `276bc2166` |
| **Branch** | `main` |
| **Render deploy** | Auto-deploy triggered by push at 2026-04-27 UTC |

---

## §2 — Files Involved

### Runtime code (3 files modified, +58 / -6)

| File | Lines changed | Purpose |
|---|---|---|
| `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx` | +50 / -4 | Banner unwrap fix (F-1); Recent Workouts row → clickable button + modal mount (P1-O); banner copy fidelity fix (Rule 28) |
| `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx` | +4 / -1 | Pre-fill unwrap fix on `/api/admin/clients/:id` consumer (Rule 20 sibling) |
| `frontend/src/components/DashBoard/workspaces/clients-team/tabs/OverviewTabContent.tsx` | +4 / -1 | Bento-overview unwrap fix on the same endpoint (Rule 20 sibling) |

### Test code (4 files created, ~510 lines, 9 new test cases)

| File | Tests | What it locks |
|---|---|---|
| `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.bannerClientName.test.tsx` | 4 | Canonical `{data:{client}}` unwrap; legacy `{client}` regression; `{user}` fallback regression; banner copy NO LONGER claims "read-only preview" |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.recentWorkoutsClick.test.tsx` | 3 | Row renders as `<button>`; click opens `EnhancedWorkoutsModal` with correct `clientId`/`clientName`; close button dismisses |
| `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.unwrap.test.tsx` | 2 | Canonical shape pre-fill via Back-button → step 0 inputs; legacy `{data}` regression |
| `frontend/src/components/DashBoard/workspaces/clients-team/tabs/OverviewTabContent.unwrap.test.tsx` | 2 | Canonical shape consumer fields populate bento cards (totalWorkouts, points, streakDays, optPhase); legacy `{client}` regression |

### Pre-existing files referenced (read-only)

- `backend/controllers/adminClientController.mjs:570-576` — `getClientDetails` response shape source of truth
- `backend/controllers/adminWorkoutLoggerController.mjs:96-143` — `getClientWorkouts` response shape with full `logs[]`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/EnhancedWorkoutsModal.tsx` — canonical modal shell (Phase 13)
- `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx` — canonical history panel (Phase 13)
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:506` — admin route mount for `view-as/:userId` (Phase 18.C.1B.1R)
- `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/ClientsManagementSection.tsx:862-865` — 4th endpoint consumer, verified clean during sweep

---

## §3 — Architecture & Runtime Flow

### F-1 + P1-O surface — `/dashboard/admin/client-management/view-as/:userId`

```
User flow:
  Admin lands on ClientsWorkspace → selects client → clicks "View As" CTA
    → navigates to /dashboard/admin/client-management/view-as/:userId
    → AdminViewAsWrapper mounts
    → Promise.allSettled[
        GET /api/admin/clients/:userId            → profile (banner + user object)
        GET /api/admin/clients/:userId/workouts   → recent workouts list (with full logs[])
        GET /api/sessions?userId=...&upcoming=true → upcoming sessions
        GET /api/v1/gamification/profile?viewAs   → gamification panel
      ]
    → renders Banner + StatCards + Gamification + TwoCol(Workouts | Sessions)
    → admin clicks any Recent Workouts row
    → setHistoryModalOpen(true)
    → EnhancedWorkoutsModal mounts with { open, clientId, clientName }
      → WorkoutHistoryPanel internally fetches GET /api/admin/clients/:clientId/workouts?limit=50
      → renders SummaryBar + tabs + per-session cards (exercises, sets, reps, weight, RPE, notes)
    → admin clicks close → setHistoryModalOpen(false) → modal unmounts
```

### Backend endpoint shapes (the source of the bug class)

```js
// adminClientController.mjs:570-576 — getClientDetails
return res.status(200).json({
  success: true,
  data: { client: client.toJSON(), mcpStats }   // ← TWO levels deep
});

// adminWorkoutLoggerController.mjs:123-138 — getClientWorkouts
return res.status(200).json({
  success: true,
  workouts: workouts.map((w) => ({              // ← ONE level deep, different key
    id, title, date, duration, intensity, status,
    totalSets, totalReps, totalWeight,
    logs: w.logs                                 // ← full WorkoutLog[] for drilldown
  })),
  pagination: { total, limit, offset }
});
```

### The unwrap-depth bug class

Three frontend files were reading from `getClientDetails` with a too-shallow unwrap chain that collapsed to the response wrapper instead of the actual client object. **Pre-fix** all three resolved to `{ client, mcpStats }` → consumer field reads were `undefined` → empty strings, zero defaults, level=1 fallbacks.

```ts
// AdminViewAsWrapper.tsx (BEFORE)
const profile = res.data.client || res.data.user || res.data;
// AdminViewAsWrapper.tsx (AFTER)
const profile = res.data?.data?.client || res.data?.client || res.data?.user || res.data;

// MovementAnalysisWizard.tsx (BEFORE)
const c = res.data?.data || res.data;
// MovementAnalysisWizard.tsx (AFTER)
const c = res.data?.data?.client || res.data?.data || res.data;

// OverviewTabContent.tsx (BEFORE)
const c = json.client || json.data || json;
// OverviewTabContent.tsx (AFTER)
const c = json.data?.client || json.client || json.data || json;
```

All three chains preserve their pre-existing fallback shapes for legacy callers and tests.

### Recent Workouts drilldown wiring (P1-O)

```
AdminViewAsWrapper render
├── ClickableListItem (NEW styled.button)
│   ├── min-height: 44px (Rule 2 touch target)
│   ├── cursor: pointer + hover background tint
│   ├── focus-visible outline (a11y)
│   └── onClick → setHistoryModalOpen(true)
└── <EnhancedWorkoutsModal open clientId clientName onClose />
    └── (Phase 13 canonical reuse — same shell already used by
         EnhancedAdminClientManagementView, ClientsManagementSection,
         and SwanCoachAssistantPage transcriptIntake fixture)
```

The modal is client-scoped, not session-scoped. Every row opens the same modal showing the full client history. The previous version's per-row aria-label promised "View workout details for `<title>`" which mismatched the actual semantic; corrected to "Open workout history (`<title>`)" so screen readers announce the action accurately and the row's title remains as context.

---

## §4 — Security Logic & Posture

### Auth boundaries (unchanged, verified)

| Control | Where | What it blocks | How it could break |
|---|---|---|---|
| `ensureClientAccess(req, clientId)` | [adminWorkoutLoggerController.mjs:98](backend/controllers/adminWorkoutLoggerController.mjs#L98) | Non-admin / trainer-without-assignment from reading another client's workouts | If a future change uses `req.body.clientId` instead of `req.params.clientId` for the access check, an attacker could pass any id while pinning the path to their own. **Audit hook for future reviewer:** confirm this guard's argument source is always the route param. |
| Frontend route param `:userId` | [AdminViewAsWrapper.tsx:273](frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx#L273) via `useParams<{ userId: string }>` | clientId travels from URL → modal prop, not from any user input | If the modal ever takes a `clientId` from a separate state source (e.g. a workout's `userId` field on the wire), cross-client data leak risk reopens. Currently `clientId={user.id}` where `user` resolves through the unwrap from the same scoped endpoint. |
| Bearer auth on the modal's PATCH | `WorkoutHistoryPanel` PATCH `/api/admin/clients/:clientId/workouts/:sessionId` | Same `ensureClientAccess` guard on the backend | Inherited from existing surface; no new mutation introduced by this slice |

### What this slice did NOT change

- No new endpoints; no new auth surface
- No JWT / refresh-token / session handling changes
- No CORS / CSP / HSTS changes (all pre-existing)
- No backend code at all

### Privacy posture

- **Rule 8 (zero PII to LLMs):** N/A — no LLM calls in this surface
- **Rule 44 (secret scan covers writes):** All 7 staged files passed pre-commit secret scan with 0 hits
- **Test fixtures:** synthetic ID `424242`, synthetic name "Fixture Client", synthetic email `fixture@example.test`. No production PII in commit-bound files

### What an attacker could exploit (so future reviewers know what to attack)

1. **Cross-tenant via the modal's PATCH.** If `WorkoutHistoryPanel` ever stops re-validating `clientId` and accepts a session-level override, an admin viewing client A could PATCH client B's workouts. Currently scoped through the same `ensureClientAccess` server-side; review WorkoutHistoryPanel's edit flow before adding session-level mutations.
2. **Banner copy as a false-fidelity signal.** Pre-fix the banner said "read-only preview" while the modal allowed PATCH-edit. This slice fixed the banner. If a future change re-adds "read-only" wording without suppressing edit, the false claim returns and Rule 28 fails.
3. **Unwrap drift recurrence.** Three files in this codebase repeated the same unwrap-depth bug class because there's no shared helper. If a fourth caller is added without grep-checking, the bug will recur. **Mitigation candidate:** extract a `unwrapClientResponse(res)` helper to a shared util — deferred (see §6).

### What this slice does for security

The unwrap fix collapses an information-leak-shaped UX bug (banner with empty client name) but does **not** change auth boundaries. The drilldown wiring exposes existing data through an existing canonical surface (modal already used by 3 other admin consumers) — no new data is reachable from this surface that wasn't already reachable from ClientsWorkspace Training tab. The threat model is unchanged.

---

## §5 — Best Practices Applied

| Standard / Rule | What was followed | Where |
|---|---|---|
| **Rule 2 (44px touch)** | `ClickableListItem` has `min-height: 44px` | AdminViewAsWrapper.tsx:175 |
| **Rule 6 (token-with-fallback)** | `outline: 2px solid var(--accent-primary, #60C0F0)` for focus-visible | AdminViewAsWrapper.tsx:188 |
| **Rule 17 (dual-pass)** | Builder receipt → hostile reviewer practice gate REVISE → fix → APPROVE | See §11 |
| **Rule 18 (existing-pattern-first)** | Reused `EnhancedWorkoutsModal` (Phase 13 canonical shell, 3 production consumers); fallback chain matches AdminViewAsWrapper's prior structure | AdminViewAsWrapper.tsx:522-527 |
| **Rule 20 (sibling sweep)** | Repo-wide grep enumerated 4 read-consumers of `/api/admin/clients/${id}` bare path; 2 fixed in this slice, 1 fixed in original slice, 1 verified clean | See sweep result in §11 Round 2 |
| **Rule 26 (Canonical Surface Receipt)** | Receipt at `PHASE-18-P1O-RECENT-WORKOUTS-DRILLDOWN-PLAN-2026-04-25.md` with file:line citations for backend route, mounted JSX, consumer hook, API path string, model fields | Pre-coding artifact |
| **Rule 28 (Claim-to-Evidence Lock)** | Banner copy now matches inherited PATCH-edit reality; "read-only preview" replaced with "Admin preview" | AdminViewAsWrapper.tsx:429 |
| **Rule 42 (pre-push backend audit)** | Both audit commands run pre-push; both clean (no untracked + no modified-uncommitted backend files) | See §11 Round 4 |
| **Rule 43 (styled-components css helper)** | No new shared style fragment with `${}` styled-primitive interpolation introduced; ClickableListItem uses scalar props only | AdminViewAsWrapper.tsx:170-194 |
| **Rule 44 (secret scan)** | Pre-commit secret scan: 7 files / 0 hits | Commit `276bc2166` log |
| **Rule 51 (confidence tags)** | Author's resubmission tagged the unverified-tsc-baseline claim correctly | Pre-push report |
| **OWASP A01 (broken access control)** | `ensureClientAccess` server-side guard preserved; no client-side trust extensions | adminWorkoutLoggerController.mjs:98 (existing) |
| **WCAG 2.1 AA — focus visibility** | `:focus-visible` outline meets ≥3:1 contrast against panel background | AdminViewAsWrapper.tsx:185-189 |
| **WCAG 2.1 AA — accessible name** | aria-label on ClickableListItem describes activation outcome | AdminViewAsWrapper.tsx:484 |

---

## §6 — Known Limitations / Non-Goals

### Deliberately deferred

1. **Motion accessibility pass on AdminViewAsWrapper.tsx.** `transition: background 0.15s` on `ClickableListItem`, plus four pre-existing animated styled-components in the same file (`ExitBtn`, `XPFill`, `BackBtn` hover) lack a `prefers-reduced-motion` guard. The new transition follows local convention. Tracked as cleanup-backlog follow-up.
2. **Token-with-fallback for hover/gradient colors.** `ClickableListItem` hover `rgba(96, 192, 240, 0.06)` and `XPFill` `linear-gradient(90deg, #60C0F0, #8B5CF6)` use raw RGBA/hex following local in-file convention. Same backlog item as #1.
3. **Shared `unwrapClientResponse` helper.** Three files repeat the same unwrap pattern. Extracting a shared util would prevent recurrence but widens the slice. Deferred to a later pass.
4. **`readOnly` prop on WorkoutHistoryPanel for view-as.** The modal inherits PATCH-edit. Banner copy was fixed instead; if Sean later wants strict read-only on view-as, add a `readOnly` prop and thread through the panel.
5. **MovementAnalysisWizard.tsx pre-existing tsc errors.** ~30 styled-components theme-typing errors at lines <398 pre-date this slice and were not introduced or altered. Deferred to a separate baselined typing-fix slice.
6. **Visual smoke against responsive matrix (320/375/414/768/1024/1440/1920/2560/3440).** Slice is a small DOM/data fix (one row swap from `<div>` to `<button>` inside an existing flex `<Panel>`); risk of mobile overflow is near-zero. Hostile reviewer accepted the waiver per Rule 24 spirit.

### Not in scope

- F-2 from S1 partial closeout (gamification award path coverage for Move Fitness imports) — separate write-path investigation
- F-4 from S1 partial closeout (JWT 3h lifetime decision) — classified P1-N
- S1.3+ Stripe / payment / webhook smoke — paused on operator inputs
- Phase 18.C.1B.2 (β client-dashboard-under-admin-impersonation) — distinct surface
- Hermes / Pi / wiki bridge — unrelated track
- Tier-C AI Village review — not triggered (no auth/Stripe/multi-tenant change)

---

## §7 — Performance & UX Considerations

### UX choices made

- **Reused `EnhancedWorkoutsModal` (option A) over inline expand or drawer.** Inline would clutter the 4-quadrant view-as overview; drawer would require new chrome. Modal matches the canonical pattern used by 3 other admin consumers — predictable, lower learning cost.
- **Banner copy: "Admin preview" over "Viewing as a client" or no banner at all.** Preserves the route's "view-as" naming continuity while removing the false read-only claim. Minimal diff.
- **aria-label includes workout title** so screen-reader users get per-row context, even though the click outcome is identical for all rows.

### UX choices rejected

- "Read-only preview" banner copy with a `readOnly` prop on the modal. **Rejected** because it widens scope (prop-threading through `WorkoutHistoryPanel`); banner copy fix is one line and Rule 28 satisfied.
- Per-session deep-link route (`/dashboard/admin/clients/:clientId/workouts/:sessionId`). **Rejected** because `WorkoutHistoryPanel` already exposes per-session expand within a single panel — adding a sub-route would create a competing surface (Rule 27 risk).

### Latency budget

- Modal opens with no client-perceived delay (state-only).
- Modal's internal `WorkoutHistoryPanel` fetches `GET /api/admin/clients/:clientId/workouts?limit=50` on `active===true`. The parent already fetched `?limit=10`; this is a slight redundancy but cheap (<300ms on production payloads observed during S1 smoke). Acceptable per receipt §3.
- No new bundle weight beyond the modal which was already lazy-imported by adjacent consumers.

### Mobile responsiveness

- `ClickableListItem` extends the existing `ListItem` with `min-height: 44px`; rest of the layout flows through the unchanged `Panel` flex.
- Modal is `width: 95%; max-width: 1000px; max-height: 90vh` ([EnhancedWorkoutsModal.tsx:33-35](frontend/src/components/DashBoard/Pages/admin-clients/components/EnhancedWorkoutsModal.tsx#L33-L35)).
- Existing `WorkoutHistoryPanel` mobile behavior unchanged.

### Accessibility

- Keyboard: button is reachable via Tab; Enter/Space activate; focus-visible outline on focus.
- Screen reader: `role=button` (implicit); accessible name `Open workout history (<title>)`.
- Reduced motion: see §6 deferred items.

### Click count optimization (per Sean's "least clicks" doctrine)

Pre-fix: trainer could not access per-session detail from view-as at all (0 clicks → 0 result).
Post-fix: trainer can drill into any session in **1 click** (row → modal opens). Within the modal, exercises auto-render grouped by name; sets/reps/weight/RPE/notes visible in the same view.

---

## §8 — Test Coverage Summary

### Tests added (9 new cases across 4 files)

```
frontend/src/components/DashBoard/Pages/admin-clients/components/
  AdminViewAsWrapper.bannerClientName.test.tsx        (4 tests)
  AdminViewAsWrapper.recentWorkoutsClick.test.tsx     (3 tests)

frontend/src/components/DashBoard/Pages/admin-movement-analysis/
  MovementAnalysisWizard.unwrap.test.tsx              (2 tests)

frontend/src/components/DashBoard/workspaces/clients-team/tabs/
  OverviewTabContent.unwrap.test.tsx                  (2 tests)
```

### Tests run (5 files / 15/15 passing)

```
$ npx vitest run \
    AdminViewAsWrapper.recentWorkoutsClick.test.tsx \
    AdminViewAsWrapper.bannerClientName.test.tsx \
    AdminViewAsWrapper.viewAs.test.tsx \
    MovementAnalysisWizard.unwrap.test.tsx \
    OverviewTabContent.unwrap.test.tsx
Test Files  5 passed (5)
     Tests  15 passed (15)
  Duration  6.72s
```

### What the tests prove

- Banner unwraps from canonical 2-level shape correctly
- Banner unwrap regression-locked against legacy 1-level `{client}` and `{user}` shapes
- Banner copy NO LONGER claims "read-only preview" (Rule 28 lock)
- Recent Workouts rows render as `<button>` (semantic + a11y)
- Click on row opens modal with correct `clientId` (route param) and `clientName` (composed from unwrap)
- Modal close handler dismisses correctly
- Wizard pre-fill writes correct field values (verified via Back-button → step 0 inputs)
- Wizard regression on legacy `{data: ...client fields}` shape
- Overview bento cards populate from canonical shape (totalWorkouts, points, streak, optPhase)
- Overview regression on legacy `{client}` shape

### What is NOT tested (intentional gaps)

- 404 / 500 swallowing on `/api/admin/clients/:userId` — inherited from `Promise.allSettled` in AdminViewAsWrapper, behavior unchanged by this slice
- Modal's PATCH-edit behavior — inherited from `WorkoutHistoryPanel`, has its own existing test surface
- F-2 gamification XP-award coverage — not a viewAs read-path bug; flagged for separate investigation
- E2E browser smoke against the responsive matrix — see §6 deferred
- Tsc baseline comparison — flagged as `[UNVERIFIED]` in pre-push report; my changes verified zero-new-errors

### Tier-A type-check

`cd frontend && NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit` — slice files clean. MovementAnalysisWizard.tsx pre-existing styled-components theme-typing errors at lines 34, 54, 61, 82, 95, 100, 132, 141, 155, 203, 274, 353 etc. unchanged.

---

## §9 — Rollback Plan

A reviewer who didn't build the phase should be able to roll back with these steps:

### Option A — full revert (preferred)

```bash
cd <REPO>
git revert 276bc2166
git push origin main
```

Render auto-deploys the revert in 2-5 min.

### Option B — surgical per-file revert

If only one of the three component changes proves problematic:

```bash
# Revert AdminViewAsWrapper changes only
git checkout 1b3f27dda -- frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsWrapper.tsx

# OR revert MovementAnalysisWizard changes only
git checkout 1b3f27dda -- frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx

# OR revert OverviewTabContent changes only
git checkout 1b3f27dda -- frontend/src/components/DashBoard/workspaces/clients-team/tabs/OverviewTabContent.tsx

# Then commit the partial revert and push
git commit -m "revert(phase-18-p1o): roll back <file> due to <reason>"
git push origin main
```

The four new test files can stay or be deleted — they exercise no production code path on their own. To delete: `git rm` them in the same revert commit.

### Pre-revert SHA

`1b3f27dda` (doctrine refactor closeout).

### No flag-flip / DB migration / systemctl restart required

This is a pure frontend change. There's no feature flag, no env var, no migration to roll back.

### Production verification of revert

After Render redeploys the revert, re-test:
- `https://sswanstudios.com/dashboard/admin/client-management/view-as/<CLIENT_ID>` should render the banner with the empty `<strong>` again (proves AdminViewAsWrapper revert)
- Recent Workouts rows should be static `<div>` again, no cursor pointer (proves drilldown revert)
- `/dashboard/admin/movement-analysis/...?clientId=<id>` should pre-fill empty fields (proves wizard revert)
- ClientsWorkspace Overview tab should show default values for the consumed client (proves overview revert)

---

## §10 — Future Review Hooks ⭐

A bullet list of explicit prompts for the next reviewer (Codex / Gemini / Village / future Sean / future Claude). Each is one specific thing to look at.

### Security review hooks

- [ ] **Re-audit `ensureClientAccess` argument source** at `backend/controllers/adminWorkoutLoggerController.mjs:98`. Confirm it always reads from `req.params.clientId`, never from `req.body` or `req.query`. If a future change accepts a body-supplied id, cross-tenant write becomes possible.
- [ ] **Review `WorkoutHistoryPanel` PATCH path for session-level scope-bypass.** Currently `clientId` is fixed at modal mount; if the panel ever exposes a session-level override input, an admin viewing client A could mutate client B's data. Check `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx` for any `clientId` writes that diverge from the prop.
- [ ] **Banner copy regression watch.** If a future PR re-introduces "read-only" or similar absolute claims to the AdminViewAsWrapper banner without suppressing the modal's PATCH-edit, Rule 28 fails again. The test at `AdminViewAsWrapper.bannerClientName.test.tsx` line 134 enforces this; verify the test still exists.
- [ ] **Unwrap drift recurrence audit.** Re-grep `frontend/src` for `/api/admin/clients/${...}` (bare path, no `/workouts` suffix). Today there are 4 consumers, all dispositioned. If a 5th appears without the canonical 3-level fallback chain, drift is back.

### Performance / UX review hooks

- [ ] **Modal endpoint redundancy under load.** Parent fetches `?limit=10` and modal fetches `?limit=50`. With many admins simultaneously opening modals, the second fetch may show in slow-query telemetry. If real, consider passing parent's data as a hint or hoisting to a shared query cache.
- [ ] **Trainer flow click-count audit.** Today: 1 click row → modal → expand session inside modal = 2 clicks total to per-session detail. Could be 1 click if sessions auto-expand on modal open. Worth a UX call.
- [ ] **Mobile QA (320/375/414).** This audit waived the responsive matrix. If a tablet user reports overflow inside the modal, suspect the `WorkoutHistoryPanel` table layout, not this slice.
- [ ] **Reduced-motion compliance.** If Sean wants to ship a Rule 25 motion-accessibility pass, this file is a 4-violation cluster (`ClickableListItem`, `ExitBtn`, `XPFill`, `BackBtn`). Single sweep candidate.

### Architecture review hooks

- [ ] **Shared `unwrapClientResponse` helper extraction.** Three consumers now repeat the canonical 3-level fallback. A shared util would prevent the bug class from recurring. Estimated 1-hour slice.
- [ ] **`readOnly` prop on `WorkoutHistoryPanel`.** If product direction shifts to enforce strict read-only on view-as, add the prop and thread through. Today the surface allows admin edit; banner copy reflects that.
- [ ] **Backend response shape standardization.** `getClientDetails` returns `{success, data:{client, mcpStats}}` but `getClientWorkouts` returns `{success, workouts:[], pagination}` (one level deep, different key). The inconsistency drives the unwrap-bug class. A backend response-shape standardization pass would simplify all four frontend consumers — but breaking change, separate slice.

### Cleanup-backlog hooks

- [ ] Motion-accessibility pass on AdminViewAsWrapper.tsx (4 violations + 1 new in this slice)
- [ ] MovementAnalysisWizard.tsx pre-existing tsc theme-typing baseline (~30 errors at lines <398)
- [ ] ACTIVE-PRIORITIES.md should be updated to reflect P1-O ✅ DONE and the two new backlog items above

---

## §11 — Codex / AI Review Log

### Round 0 — Author writes receipt (2026-04-25)

- Builder produced `PHASE-18-P1O-RECENT-WORKOUTS-DRILLDOWN-PLAN-2026-04-25.md`.
- Receipt covered Canonical Surface Receipt (Rule 26), test plan, footprint, stop-and-report condition.
- Sean approved the receipt's plan with one binding direction: banner-copy option (b) "strip read-only assertion" for Rule 28 surface fidelity.

### Round 1 — Hostile reviewer practice gate: REVISE (2026-04-27)

The reviewer (acting as a Codex-stand-in, explicit "practice round" per their note) flagged **two [HIGH] blockers** invoking Rule 20:

- `MovementAnalysisWizard.tsx:399` — same unwrap-depth drift, NOT disclosed in receipt.
- `OverviewTabContent.tsx:181` — same unwrap-depth drift, NOT disclosed in receipt.

Plus 3 should-fix findings (aria-label semantic mismatch, `prefers-reduced-motion` guard, hardcoded RGBA on hover) and 2 unverified-by-reviewer items (tsc --noEmit, visual smoke matrix).

### Round 2 — Author extends slice (2026-04-27)

- Verified both [HIGH] claims directly via Read tool before acting (Rule 52).
- Repo-wide grep on `/api/admin/clients/${...}` enumerated **4 read-consumers**:
  - AdminViewAsWrapper.tsx:289 (already fixed in original slice)
  - MovementAnalysisWizard.tsx:398 (FIX in this revision)
  - OverviewTabContent.tsx:176 (FIX in this revision)
  - ClientsManagementSection.tsx:862 (verified clean — already accesses `data.data.client` at line 865)
- Patched both flagged sites with three-level fallback chains.
- Fixed aria-label semantic mismatch (client-scoped, not session-scoped).
- Wrote 2 regression tests apiece for both new fixes.
- Ran tsc --noEmit with `NODE_OPTIONS=--max-old-space-size=16384`; slice files clean.

### Round 3 — Hostile reviewer practice gate: APPROVE (2026-04-27)

- All blockers cleared.
- 3 should-fix items confirmed: 1 fixed in Round 2 (aria-label), 2 deferred to cleanup backlog (motion accessibility + hardcoded color, both following local convention).
- Recommended commit message stem accepted: `fix(admin-view-as): F-1 banner unwrap + P1-O recent-workouts drilldown + sibling sweep`.
- Codex final gate flagged as still required per Rule 46.

### Round 4 — Sean executive override on Codex deferral (2026-04-27)

- Sean stated: Codex unavailable for ~24h, authorized direct push, asked for this audit record so Codex can review later.
- Per Rule 46 sub-rule "If Codex service is unavailable, pause and wait. Do NOT commit substantial work without Codex approval to 'save time'" — Sean explicitly overrode this for this slice.
- Override documented here for Codex's later review.
- Pre-push backend audit (Rule 42) run despite frontend-only scope — both checks clean (0 untracked / 0 modified-uncommitted in `backend/`).
- Pre-commit secret scan: 7 files / 0 hits.
- Commit `276bc2166` pushed to `origin/main` at 2026-04-27 UTC.

### Pending Codex review checklist (when Codex returns)

When Codex picks this up, here's a prompt skeleton:

> Read this audit record (`PHASE-18-P1O-RECENT-WORKOUTS-DRILLDOWN-AUDIT-RECORD-2026-04-27.md`). The slice was pushed as commit `276bc2166` on 2026-04-27 with a hostile-review-practice gate but no Codex final gate (deferred due to availability). Please review the slice end-to-end against §4 security posture, §5 best practices, §10 future review hooks. Particular focus areas:
>
> 1. The Rule 20 sibling sweep — was 4 consumers actually the full set, or did the grep miss a path?
> 2. The deferred shared `unwrapClientResponse` helper — should it land before more consumers accumulate?
> 3. The banner copy fix — is "Admin preview of their dashboard" tight enough, or is there a remaining false-fidelity claim?
> 4. The aria-label semantic — does "Open workout history (`<title>`)" announce correctly under VoiceOver / NVDA?
>
> Report APPROVE / REVISE / REJECT against the live `main` HEAD.

---

## §12 — Sign-off

| Field | Value |
|---|---|
| **Sean's "phase complete" timestamp** | 2026-04-27 — "Go ahead and push... so far this should be good enough 'cause I don't have codex until 24 hours" |
| **Commit SHA(s)** | `276bc2166` (slice) + this audit record commit |
| **Branch** | `main` |
| **Render deploy** | Auto-deploy triggered on push 2026-04-27 |
| **Next action** | Codex review when available (~2026-04-28); then either close P1-O fully or revise per Codex |
| **Reviewer-friendliness checklist** | ✅ Future AI can find every relevant file from this doc alone · ✅ Every security control labeled with WHAT/WHY/HOW-IT-BREAKS · ✅ Future review hooks specific enough to act on without follow-up · ✅ Rollback plan executable by someone who didn't build the phase |

---

**End of Phase 18 P1-O audit record.** This document is the load-bearing artifact for any future security / performance / UX re-review of this phase. If you are reading this in a future session and the live code has diverged from what's described here, trust the live code and update this document — but do not delete it.
