# Clients & Team / Training Command Center — Combined Hostile Audit (Fable Assignment)

**Date:** 2026-07-05
**Surface:** Admin/Trainer selected-client workspace ("Clients & Team") — detail tabs, Training sub-nav, Workout Logger, plan builders.
**Method:** External hostile UX audit (visual + structural) **cross-verified against the real repo** by Claude (manual verification of the 4 load-bearing claims) + a 10-agent verification/audit workflow + a completeness critic. Every verdict below carries file:line evidence. Nothing was modified.
**For:** Fable (Final Decider) to make the fixes/upgrade.

> **How to read this:** The external report is directionally excellent — its refactor vision (unify Training into Today / Program / History / Exercise-Intelligence, one Coach dock, one canonical planner, cockpit logger, one client hero) is **sound and should be kept**. This document does three things the raw report could not: (1) marks each report claim CONFIRMED / PARTIAL / OVERSTATED / REFUTED with evidence, (2) adds the **critical issues the report missed** (the biggest one — eager chart gallery — is not in the report at all), and (3) tells Fable what **not** to "fix" because the report was wrong about it.

---

## 0. RE-BASELINE vs `origin/main` (2026-07-05) — READ THIS FIRST

> The audit below (§1-§7) was performed against a **local working tree 119 commits behind `origin/main`**. Two pushed commits (`6e7b7da94` Training consolidation, `3d1e636d7` truthful chart insight) already reworked part of this surface. This section re-verifies every finding against `origin/main` content (read-only `git show`, no pull). **Fable should act on this table, not the raw §3 severities.**

| Finding | Status on `origin/main` | Evidence |
|---|---|---|
| **Report #1: 7-peer Training sidebar → workflow modes** | **✅ SUBSTANTIALLY FIXED** | `TrainingTabContent.tsx` now renders **3 modes — Today / Plan / History & Inputs** (`trainingWorkflowModes.ts:32-57`) as the rail + a contextual `SectionChipRow` for sub-lanes (`:228-247`). 7 legacy section IDs preserved as deep-link contract. This is the report's exact ask. **The "7 equal tabs" critique is now SUPERSEDED.** Residual: still a left side-rail (report wanted a segmented control), and 3-layer nesting in multi-section modes. |
| **§3-A Billing toggle (Settings)** | **🔴 STANDS — P0, fully current** | `SettingsTabContent.tsx` **unchanged** (still one-tap flip, no confirm, zeroes `availableSessions`, "read-only" docstring). Backend `adminClientController.updateClient` reworked (+55) but grep confirms **still no `AdminAction`/audit log** on the `sessionBillingMode` write (`:1148-1177`). `ClientsWorkspaceTabs.tsx` still passes **0** `onClientUpdated` → change still doesn't propagate. |
| **§3-C FormAnalysis no client prop** | **🔴 STANDS — P0, fully current** | `BiometricsTabContent.tsx` **unchanged** — `<FormAnalysisPage />` still rendered with zero props. |
| **§3-D Eager chart gallery / no SafeChart** | **🔴 STANDS — HIGH, fully current** | Progress grid was heavily reworked (`AdminProgressChartsGrid.primaryCards.tsx` +133, `.detailCards.tsx` +186) **but grep confirms still zero `SafeChart` / `React.lazy` / `Suspense` / `ErrorBoundary`.** The "truthful chart insight layer" added data-truth labels (`progressChartFacts.ts`, `ProgressChartInsightBar`), not the missing error boundary. |
| **§3-B Overview placeholder metrics** | **🟠 STANDS (charts partly improved)** | `OverviewTabContent.tsx` **unchanged** — OPT Phase still defaults to "Phase 1", revenue "$0", no error state. The chart-truth commit improved *charts*, not these scalar tiles. |
| **§A3 Two stacked headers** | **🟠 STANDS** | `ClientsWorkspace.view.tsx` still renders `SelectedClientTrainingHeader` then `ClientDetailView` (its own `DetailHeader`) in one `DetailScrollWrap` (`:187-207`). Not collapsed. |
| **§6/B Coach duplication** | **🟠 PARTIAL** | Modes grouped the coach surfaces, but still ~4 entry points: "Ask Coach" disclosure (`TrainingTabContent.tsx:210`, relabeled from "Tell Swan"), "Coach Draft" chip in Plan mode (`trainingWorkflowModes.ts:63`), logger Coach Terminal, header "Swan". No single canonical owner yet. |
| **§3-E Dead/competing surfaces + oversized logger** | **🔴 STANDS (worse)** | `Admin/WorkoutPlanBuilder.tsx` (628-line dead), `WorkoutLoggerModal.tsx` (325) unchanged. `WorkoutLogger.tsx` grew **1225 → 1257 lines**. |
| **§3-F A11y (contrast, tablet icon-only nav, rolodex double-click)** | **🟠 STANDS** | `TrainingTabContent.styles.ts` reworked but `overflow:visible` + tablet `display:none` label-hiding persist; `NASMExerciseRolodex.tsx:182` still `onDoubleClick` to select (single = preview). |
| **Ledger #8 `current-trainer` sentinel** | **⚪ UNCHANGED (already OVERSTATED)** | Still present (`useWorkoutPlanBuilderController.ts:91`) + still neutralized by `resolveTrainerId` (`useWorkoutMcp.planGeneration.ts:260-261`). No action needed beyond optional cleanup. |
| **§4 REFUTED/OVERSTATED report claims** | **⚪ UNCHANGED** | trainerId-live-bug, ultrawide-narrow-column, trainer-can-flip-billing, names-to-AI — all still incorrect as the report stated them. Do not act on them. |

**Net for Fable:** the IA redesign (report's headline) is largely done on `origin/main`. The **highest-value remaining work is correctness/safety/data-truth, not layout**: (1) billing audit+confirm+propagation, (2) FormAnalysis client prop, (3) Progress SafeChart/lazy, (4) Overview data-truth + error state. These four are on **unchanged files** — they are current, real, and independent of the redesign. Everything in §1-§7 below is the original against-local-main analysis; where §0 marks a finding SUPERSEDED/FIXED, §0 wins.

---

## 1. Executive verdict on the report

**The report is structurally accurate and largely honest.** Nearly every capability/count claim is CONFIRMED: 6 detail tabs, the 7-section Training sub-nav, two stacked headers, `overflow:visible` shell, 4+ Swan-Coach entry points, ~24 logger sub-surfaces, 5 biometric cards, two divergent plan engines, and the client-dashboard shell worth borrowing.

**Its one recurring factual error is LABELS, not capabilities.** It invented "Ask Coach" (real: **Swan Coach Copilot** sub-tab, panel titled *Workout Intelligence*), friendly-renamed `architect`/`plans`/`logger` as "Build Plan / Plan Library / Log Workout", and called the "More Filters" toggle "advanced filters." Capabilities right, strings wrong — Fable should use the **real** IDs/labels below, not the report's.

**It materially OVERSTATED three things** (Section 4) — do not act on these as written.

**It entirely MISSED four things** (Section 3), one of which (eager-loaded chart gallery with no error boundary) is **higher severity than most of what the report flagged** and violates an explicit CLAUDE.md gotcha.

---

## 2. Verification ledger — the report's claims vs the repo

| # | Report claim | Verdict | Evidence (file:line) |
|---|---|---|---|
| 1 | Six top detail tabs (Training/Progress/Nutrition/Biometrics/Overview/Settings) | **CONFIRMED** | `ClientDetailView.tsx:44,65-72` (rendered as equal peers `:171-187`). Note: file's own docstring says "4 tabs" — **stale**. |
| 2 | Seven Training sub-sections, second nav layer | **CONFIRMED** (label drift ×3) | `TrainingTabContent.tsx:53-66`, sidebar tablist `:140-156`. Real IDs: `architect`(Swan Coach Architect), `plans`(Training Plans), `logger`(Workout Logger), `import`, `plaud`, `copilot`(Swan Coach Copilot), `history`. Report's "Build Plan/Plan Library/Ask Coach" are wrong strings. |
| 3 | Two stacked headers, client name printed twice | **CONFIRMED** | `ClientsWorkspace.view.tsx:188` (SelectedClientTrainingHeader) then `:196` (ClientDetailView) → its own `DetailHeader` avatar/name/subtext at `ClientDetailView.tsx:155-166`. |
| 4 | Training shell uses fixed sidebar + `overflow:visible` (→ collision) | **CONFIRMED** (framing PARTIAL) | `TrainingTabContent.styles.ts:19,213,76`; sidebar `width:240px; flex-shrink:0` `:45-46`. **But** `:5-8` shows overflow:visible is a *deliberate* "Phase 13.2 scroll-ownership fix" to AVOID clipping — "causes collision" is unproven by static read. |
| 5 | Default Training section = Log Workout (correct but buried) | **CONFIRMED** | `TrainingTabContent.tsx:89,98` `initialSection ?? 'logger'`. |
| 6 | "Ask Coach" duplicated ×4, no clear owner | **CONFIRMED** (count is actually 5-6; "duplicative"=PARTIAL) | (1) `copilot` sub-tab→WorkoutCopilotPanel; (2) "Tell Swan" disclosure→ClientTrainingCommandBar `TrainingTabContent.tsx:170-197`; (3) `WorkoutLoggerCoachTerminal` `WorkoutLogger.tsx:956`; (4) header "Swan" `ClientsWorkspace.view.tsx:194`; **+ (5)** dictate in `ClientDailyActionStrip` inside header Details `SelectedClientTrainingHeader.tsx:123`; **+ (6)** VoiceMemoUpload in logger `WorkoutLogger.tsx:992`. The three in-Training surfaces are distinct *mechanisms*, so "duplicative/same feature" is OVERSTATED — but **"no clear owner" is a fair, real IA problem.** |
| 7 | Build Plan embeds old WorkoutPlanBuilder 4-step wizard | **CONFIRMED** | `TrainingTabSectionContent.tsx:20-22,82-88`; steps `['Plan Details','Training Schedule','Exercise Selection','Review & Save']`. |
| 8 | Wizard passes hardcoded `trainerId:'current-trainer'` (data-integrity smell) | **OVERSTATED** | String exists (`useWorkoutPlanBuilderController.ts:91`) **but** `resolveTrainerId` swaps it for real `userId` (`useWorkoutMcp.planGeneration.ts:209-210`) and the save payload omits trainerId. It never persists. Clean up the magic string; it is **not** a live bug. |
| 9 | Full admin planner has command panel/status strip/rolodex/builder/teach mode/saved plans/PDF/confirm | **CONFIRMED** (all 8) | `WorkoutPlannerPageLayout.tsx:71,110,121,140,176,179,192-201`. |
| 10 | Full planner locks "Full Body" for multi-week + equipment profile | **CONFIRMED** | `WorkoutPlannerCommandPanel.sections.tsx:134-152`. |
| 11 | Two divergent plan-building engines that can drift | **CONFIRMED** (actually 3-4) | Embedded wizard (→`/api/workout-builder/plan`) vs full planner. **+ 3rd:** `Admin/WorkoutPlanBuilder.tsx` (628 lines, dead, POSTs `/api/workout/plan`). **+ 4th:** `BootcampBuilder/`. See §3-F. |
| 12 | Logger renders ~24 sub-surfaces in one vertical stream | **CONFIRMED** | `WorkoutLogger.tsx:943-1207` (~24-25 blocks). File is **1225 lines** (4× rule-4). |
| 13 | Warmup/corrective before main; balance/core + cooldown after | **CONFIRMED** (intentional NASM order) | `WorkoutLogger.tsx:1015,1027-1140,1141,1153`. This mirrors the NASM OPT template — reorganize the *presentation*, keep the *sequence*. |
| 14 | Section-filter logic extracted/shared | **CONFIRMED** | `NASMExerciseRolodex.sectionFilter.ts:110,124` + shared pattern module. |
| 15 | Settings looks read-only but hides a billing-mutating "No-Pay" toggle via `updateClient` | **CONFIRMED — and worse** | `SettingsTabContent.tsx:191-201` toggle → `handleNoPayToggle:60-77` → `adminClientService.updateClient(...{sessionBillingMode})`. Header says "Read-only" `:4`; all 5 sibling toggles genuinely read-only. **Additions the report missed:** no confirm dialog; **zeroes `availableSessions` to 0** `:69`; backend `adminClientController.updateClient` writes **no audit record** `~1110-1204`. See §3-A. |
| 16 | Rolodex: search/recents/chips/advanced/preview/virtualized/status | **PARTIAL** (6/7) | Real; "advanced filters" is a "More Filters" toggle `NASMExerciseRolodex.tsx:224-226`. |
| 17 | Biometrics 5-card bento, inline expansion | **CONFIRMED** | `BiometricsTabContent.tsx:118-149,235-251`. Docstring says "4 cards" — stale. |
| 18 | Form Analysis rendered without client context (drift) | **CONFIRMED — real bug** | `BiometricsTabContent.tsx:186-224`: 4/5 cards pass client (`userId`/`embeddedClientId`/`propClientId`/`clientId`); `<FormAnalysisPage />` `:212` gets **zero props**; grep of `FormAnalysisPage.tsx` shows no `clientId/userId/useParams/currentUser`. It cannot show the selected client. See §3-C. |
| 19 | Nutrition timeline w/ provenance, verification status, Mark Verified | **CONFIRMED** | `GET /api/macros/client-timeline`; `NutritionTabContent.logic.ts:96-128`. (Note: macro line omits carbs & fat `:128`.) |
| 20 | Overview pulls 11 metrics + bento + nutrition triage | **CONFIRMED — but many are placeholders** | `OverviewTabContent.tsx:210-252`. **Data-truth problem the report missed** — see §3-B. |
| 21 | Progress uses cockpit/cube/war-room/recovery/matrix/mega-stats/deck | **CONFIRMED (real, Victory)** | `AdminProgressChartsGrid.tsx:50-74`. **But eager-loaded, no SafeChart — see §3-D (the biggest miss).** |
| 22 | Client dashboard is a composed shell (12 regions) worth borrowing | **CONFIRMED** | `ClientDashboardHome.tsx` + `ClientDashboardHome.layoutStyles.ts` (Shell/TopNav/Frame/MainCanvas/ContentGrid/PrimaryStack/RightRail/Hero/QuickActions/Assignment/Performance/Insights). Reusable primitives listed in §5. |
| 23 | Client dashboard quick actions: Log/Ask Coach/Progress/Challenges/Book Session | **CONFIRMED** | `ClientDashboardHomeTab.tsx:162` (Book Session conditional on `canBookSessions`). |

---

## 3. Critical issues the report MISSED (ranked) — Fable must add these to scope

### 3-A. Billing mutation with NO audit trail *(HIGH — money path)*
`adminClientController.updateClient` (`~1110-1204`) validates & commits `sessionBillingMode` with **zero audit logging** — no `AdminAction` row, only `logger.error` on failure. A revenue-affecting flip (paid ⇄ free) leaves no record of who changed it or when. The codebase has audit infrastructure elsewhere; this path skips it.
**Fix:** on any change to `sessionBillingMode`/`clientSource`/`accountStatus`/`isLocked`, write `{actorId, clientId, field, oldValue, newValue, timestamp}` to a durable audit table. **Also** add an inline confirm (reuse `ClientLifecycleConfirmDialog`) and stop optimistically zeroing `availableSessions` client-side (`SettingsTabContent.tsx:69`) since the server doesn't — that's a client/server drift. **Also** thread `onClientUpdated` from the parent (`ClientsWorkspaceTabs.tsx:97` never passes it, so a billing change never propagates to parent state/badges).

### 3-B. Overview placeholder metrics presented as fact *(data-truth — rule 62)*
`getClientDetails` never computes OPT phase, revenue, achievements, last/next session, and they aren't `User` columns. So `OverviewTabContent.tsx:92` renders **"Phase 1" always** (`c.currentPhase || c.optPhase || 1`), Revenue **$0**, Achievements **0**, Last/Next Session empty — with **no empty/error state** (a fetch failure leaves cards stuck on "Loading…" forever, `:95,159`). `totalWorkouts` reads a stored `User` column, not the live `WorkoutSession.count` path that exists at `adminClientController.mjs:1485`.
**Fix:** compute these server-side (or the live-count path), and render explicit "not assessed / no data" states instead of a fake "Phase 1"/"$0". *(Confidence `[LIKELY]`: the `mcpStats` object returned alongside `client.toJSON()` was not fully enumerated — Fable should confirm mcpStats doesn't already supply some of these before wiring new endpoints. See §6.)*

### 3-C. Form Analysis client-context drift *(data-truth — confirmed bug, in report but under-scoped)*
Covered in ledger #18. This is a real "shows the wrong subject" bug, not cosmetic. **Fix:** pass `clientId`/`userId` into `FormAnalysisPage` like the sibling cards, and give FormAnalysisPage a client prop it actually consumes.

### 3-D. Admin Progress deck eagerly renders the full chart gallery, no SafeChart / no error boundary *(HIGH — the report missed this entirely)*
`AdminProgressChartsGrid.tsx:13` **statically imports** 7+ heavy Victory panels (ProgressProofCockpit, ClientExerciseMegaStats, ExerciseCodexMatrix, ProgressChartCube, RecoveryObservatory, WarRoomBoard, …) and mounts them all at once with no per-chart lazy-load and no `SafeChart` boundary. This **directly violates the CLAUDE.md gotcha**: *"Chart lazy loading: React.lazy() + SafeChart error boundary — never eagerly load full gallery."* One bad datapoint can white-screen the whole Progress tab; opening a client pays the full chart cost immediately.
**Fix:** wrap each card in `Charts/SafeChart.tsx` (as `ProfileChartsGrid` already does) and lazy-mount detail charts or gate mount on the active lens.

### 3-E. Competing / dead duplicate surfaces *(rule 4 + rule 27/34 hygiene)*
- `Admin/WorkoutPlanBuilder.tsx` — **628 lines, dead** (zero live consumers; guarded only by two "do-not-import" contract tests), POSTs to a *different* endpoint `/api/workout/plan`. Third plan builder.
- `WorkoutLoggerModal.tsx` — 325 lines (over cap), mounted only by `EnhancedAdminClientManagementView`/`AdminClientManagementView` (likely unrouted). Competing logger.
- `BootcampBuilder/` — fourth parallel plan subsystem.
- `MasterDetailShellStyles.ts` — dormant duplicate master-detail shell, never rendered.
**Fix:** classify (rule 27) → grep-confirm zero consumers → archive with Sean's approval (rule 34). Do **not** delete blind. `WorkoutLogger.tsx` itself is **1225 lines (4× rule-4)** and is the highest-churn money/truth file — schedule extraction.

### 3-F. Accessibility & responsive gaps *(static-read; needs browser confirm — §6)*
- **Contrast:** `--text-secondary` fallback `#4070C0` (Swan Lavender) on `#141419`/`#0A0A0F` ≈ **3.8:1**, below WCAG 4.5:1 for the 12-13px text it styles (rules 6, 7). Raise the fallback (e.g. `#94a3b8`/`#8BA8C8`).
- **Tablet (768-1023px):** the 7 Training sub-nav items become **icon-only** with labels only in a `title` tooltip (`TrainingTabContent.styles.ts:143`) — unusable on touch. Show `shortLabel` or a scrollable pill row.
- **DetailTabBar** hides its scrollbar while overflowing >640px with no fade/chevron affordance (`MasterDetailDetailStyles.ts:71`).
- **Rolodex select requires double-click** (single click only previews, `NASMExerciseRolodex.tsx:175`) — touch-hostile. Make single tap select+add.

---

## 4. Report claims that are WRONG — do NOT act on these as written

| Report claim | Reality | Evidence |
|---|---|---|
| `current-trainer` is a CRITICAL live data-integrity bug | Neutralized by `resolveTrainerId`; omitted from save payload. Clean up the magic string only. | `useWorkoutMcp.planGeneration.ts:209-210` |
| Ultrawide "content trapped in a narrow centered column" | The detail chain is **full-width** — no max-width on `DetailScrollWrap`/`DetailContentWrapper`. Only the *logger* has a deliberate readability cap. | `ClientsWorkspace.styles.ts:182`, `MasterDetailDetailStyles.ts:5` |
| "A trainer can flip billing" / access-control breach | **REFUTED** — `PUT /api/admin/clients/:id` is behind `protect` + `authorize(['admin'])`; a trainer gets 403. | `adminClientRoutes.mjs:290-291` |
| Coach surfaces send client **names** to the AI | **REFUTED** — ID-only. `buildDailyCommandPrompt` interpolates `clientId` and instructs "Use client ID only." Rule 8 respected. | `clientTrainingCommandRouteContext.ts:20`, `aiWorkoutService.ts:229` |
| "Role not enforced / everything shown to everyone" | **OVERSTATED** — no per-*component* role check, but the whole surface loads admin-only data behind admin routes. | `ClientsWorkspace.tsx:121` |

> **Nuance for the "no fake metrics" acceptance criterion:** the *charts* (Progress tab) are truthful, real-API-backed — the role-security lens correctly refuted "mock charts." The **Overview scalar tiles** (OPT phase, revenue, achievements, sessions) are the data-truth problem (§3-B). Fable should keep the charts, fix the scalar placeholders.

---

## 5. Consolidated fix plan for Fable (ranked)

**Keep the report's overall vision** (unify Training → Today / Program / History / Exercise-Intelligence; one Coach dock; one canonical planner; cockpit logger; one client hero). Sequence by risk:

**P0 — correctness & money/truth (do first, independent of the redesign):**
1. **Billing safety** (§3-A): server-side audit log + inline confirm + stop client-side session-zeroing + thread `onClientUpdated`. *(Highest severity; smallest blast radius.)*
2. **Progress deck**: SafeChart boundary + lazy/gated mount (§3-D).
3. **Form Analysis** client prop (§3-C).
4. **Overview data-truth**: real values + empty/error states, kill the fake "Phase 1"/"$0" (§3-B).

**P1 — IA unification (the report's core, corrected):**
5. **One selected-client hero** — collapse the two stacked headers into one identity band (drop the duplicated action row in the Details disclosure).
6. **Training Command Center** — replace the 7-peer sidebar with **Today / Program / History & Imports / Exercise Intelligence** using the **real** section IDs (`architect`,`plans`,`logger`,`import`,`plaud`,`copilot`,`history`) mapped underneath. Preserve route/deep-link compatibility via adapters.
7. **One Coach dock** — pick a canonical owner among the 5-6 Swan entry points; subordinate/relabel the rest (keep the distinct *mechanisms*, kill the redundant *entry points*).
8. **One canonical planner** — make the full `WorkoutPlannerPage` engine the single planning surface; wrap/retire the embedded 4-step wizard; archive the dead 3rd/4th builders (§3-E, with approval).

**P2 — polish & hygiene:**
9. Logger cockpit layout (left context / center canvas / right coach+rolodex on desktop; setup→exercises→protocols→review on mobile) — keep logger *logic*, redesign the *shell*; begin the 1225-line extraction.
10. A11y/responsive fixes (§3-F): contrast token, tablet sub-nav labels, tab-bar scroll affordance, single-tap rolodex select.
11. Rename tabs (Snapshot / Training / Progress / Nutrition / Movement & Health / Profile & Controls) + fix the stale docstrings (ClientDetailView "4 tabs"→6; Settings "read-only"→interactive; Biometrics "4 cards"→5; logger test "700-line"→1225).
12. Shared client-detail cache — `/api/admin/clients/:id` is fetched 3× (parent + Overview + Settings) with no cache.

---

## 6. Pre-work checklist — verify BEFORE editing (honest gaps)

These were **not** fully verified (static-read only or backend unread). Fable must confirm before acting:
1. **`mcpStats` contents** from `getClientDetails` (`adminClientController.mjs:866`) — enumerate before concluding Overview values are *all* placeholders (§3-B is `[LIKELY]`, not `[VERIFIED]`).
2. **`/api/workout-plans` and `/api/workout-builder/{plan,generate}` controllers** — never read. The two-engine *save* drift (ledger #11) is unconfirmed at the DB layer.
3. **"No audit trail anywhere"** is negative evidence — confirm no durable audit exists in a table Fable didn't read.
4. **Admin/WorkoutPlanBuilder mount status** — agents disagreed (unverified vs dead). Grep-confirm zero live consumers before archiving.
5. **BootcampBuilder** route-mount/overlap — flagged as context, unverified.
6. **No browser/Playwright run happened** — every responsive/a11y finding in §3-F is static-code-read; confirm in a real viewport (Brave, per project pref) at 375/768/1024/1440/2560.

---

## 7. Preserve-list — working behavior not to break

- The NASM session *sequence* (warmup→main→balance/core→cooldown) is correct; reorganize presentation, keep order (ledger #13).
- `overflow:visible` was a deliberate scroll-ownership fix — don't reintroduce clipping when restructuring (ledger #4).
- Coach payloads are already ID-only (rule 8) — keep them that way.
- Billing mutation is already admin-gated server-side — the fix is audit+confirm, not a new authz layer.
- Progress **charts** are real and Victory-based — fix loading, don't replace with stat cards.
- Client dashboard reusable primitives to borrow: `PanelCard`/`CardBody`/`Kicker`, `QuickActionGrid`/`ActionButton` (44px), `MetricGrid`/`MetricTile`, `ContentGrid`(main+326px rail)/`PrimaryStack`/`RightRail`, `ClientProfileHero`, and the pure view-model builders (`buildAssignmentView`/`buildInsights`/`buildTodaySnapshot`) in `ClientDashboardHome.viewModel.ts`.

---

## 8. Pre-worked implementation recipes (for the `fable/*` arc)

> These four findings are on the surface owned by the active `fable/client-command-center` arc (SESSION-Q lane). They are its next slices. Recipes below are turnkey, grounded in verified current (`origin/main`) code. Ordered by severity. All are TDD-appropriate (write the failing test first per the Bugfix standard).

### Recipe A — Billing-toggle safety (§3-A, P0, money path)
Three coordinated edits:
1. **Backend audit trail** — `backend/controllers/adminClientController.mjs` `updateClient` (~`:1130-1223`). The billing/clientSource/accountStatus/isLocked flip commits with **no audit row**. Mirror the existing money-path pattern at `backend/routes/sessions.mjs:884`:
   - Capture `previousState` from `client` **before** `client.update(safeUpdates, {transaction})` (`:1205`).
   - Immediately after the update, still **inside the open transaction**, write `AdminAccountAuditLog.create({ actorUserId: req.user.id, targetUserId: clientId, action: 'session_billing_mode_change' (or 'client_account_update'), reason, previousState: {sessionBillingMode: old, clientSource: old, ...}, nextState: {...changed}, metadata: { source: 'PUT /api/admin/clients/:id', changedFields } }, { transaction })`.
   - **Recommend inside-transaction (atomic)** over `sessions.mjs`'s fail-soft, so a failed audit rolls back the billing change — no silent money-path mutation without a forensics row. `reason` is `allowNull:false` (schema `AdminAccountAuditLog.mjs:31`) → require the frontend to send a `reason`, or default to `'admin billing/session-policy update'`. Only write when a money/lifecycle field actually changed (diff `safeUpdates` vs `previousState`).
2. **Frontend confirm + no client-side session-zeroing** — `SettingsTabContent.tsx:60-77,191-201`. Gate `handleNoPayToggle` behind an inline confirm (reuse `ClientLifecycleConfirmDialog`), summarizing the effect ("Client will no longer be billed per session; balance resets"). **Stop** optimistically merging `availableSessions: 0` client-side (`:69`) — reflect the server's returned client instead (the server is the source of truth for the balance).
3. **Propagate** — `ClientsWorkspaceTabs.tsx` renders `<SettingsTabContent … />` but passes **no** `onClientUpdated` (grep = 0). Thread it from the parent so the billing change updates `selectedClient` state + grid/header session badges without a reload.
*Regression tests:* backend — updateClient with a `sessionBillingMode` change writes exactly one `AdminAccountAuditLog` row with correct actor/target/prev/next (and rolls back both on audit failure); frontend — toggle shows confirm before mutating, and does not zero `availableSessions` locally.

### Recipe B — FormAnalysis client context (§3-C, P0, data-truth)
`BiometricsTabContent.tsx:212` renders `<FormAnalysisPage />` with zero props while the 4 sibling cards pass client context. **Two-part** (FormAnalysisPage self-sources nothing — grep confirms no `clientId/userId/useParams/currentUser`): (1) pass `<FormAnalysisPage clientId={safeClientId} clientName={clientName} />`; (2) plumb the prop **into** `FormAnalysisPage.tsx` so it actually scopes to that client. *Test:* mounting the Form Analysis card for client N requests/renders client N, not the logged-in user.

### Recipe C — Progress charts SafeChart + lazy (§3-D, HIGH)
`AdminProgressChartsGrid.primaryCards.tsx` / `.detailCards.tsx` statically mount 7+ Victory panels with no boundary (grep = no `SafeChart`/`lazy`/`Suspense`). Wrap each card in `<SafeChart chartName="…">` (`frontend/src/components/Charts/SafeChart.tsx`) exactly as `UserDashboard/components/ProfileChartsGrid.tsx` already does, and lazy-mount detail cards / gate on the active lens so filtered-out charts don't render. *Test:* a throwing chart shows the SafeChart fallback, not a white-screened tab.

### Recipe D — Overview data-truth + error state (§3-B)
`OverviewTabContent.tsx:92,95,159` renders `optPhase: … || 1` ("Phase 1" always), Revenue "$0", Achievements "0", empty Last/Next Session — none computed by `getClientDetails` — and has **no error branch** (fetch-fail → permanent "Loading…"). Either compute the values server-side (there's a live `WorkoutSession.count` path at `adminClientController.mjs:1485` for `totalWorkouts`) or render explicit "not assessed / no data yet" states; add an error card with retry when `data===null && !loading`. *Test:* absent OPT phase renders "not assessed", not "Phase 1"; fetch failure renders an error state, not "Loading…".

---
*Verification provenance: manual file:line reads (claims 8, 15, 18, 4) + 10-agent workflow (nav/coach/planner/logger/settings/biometrics-nutrition-overview-progress/client-shell + responsive-a11y + role-security-datatruth + report-gaps lenses) + completeness critic. ~1.5M verification tokens, 0 agent errors. Confidence tags used where evidence is indirect.*
