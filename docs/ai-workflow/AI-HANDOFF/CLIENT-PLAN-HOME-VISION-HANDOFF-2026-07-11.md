# HANDOFF — Client Active-Plan Card on Home + Full-Plan Modal + Swan Coach Plan Editing

**Date:** 2026-07-11 · **Author:** Claude (Fable 5) · **For:** the next AI/session picking this up
**Live state:** `main` @ `02e9d700f` · frontend suite **5780/5780 green**, `tsc --noEmit` **0 errors repo-wide**
**Companion:** `docs/ai-workflow/AI-HANDOFF/PLAN-PDF-WHITE-LABEL-HANDOFF-2026-07-10.md` (the PDF workstream this grew out of)

---

## 0. Fastest re-entry (read this first)

**Sean's vision, in his words:** the client's **main home page** must ALWAYS show their **active workout plan** — it's always there no matter what. They can **click it → a modal opens showing that specific plan they're on**. And **Swan Coach can see that plan too, and edit/update it.**

**Current reality:** ~⅓ built.
- The home page shows a **today-only summary card**, not the plan.
- **No modal anywhere renders a structured plan** (weeks/days/exercises). The only plan modal is a **PDF viewer**.
- Swan Coach can **create** a plan and **delete** one — but there is **NO update/edit command at all**.
- A **much richer "Plan Vault" card already exists in the repo but is on a page that is NOT routed** (orphaned). Big head start — reuse it, don't rebuild it.

**Build order:** Slice 1 (backend full-plan read) → Slice 2 (plan modal) → Slice 3 (mount the always-visible card on home) → Slice 4 (Swan Coach edit, gated). Slices 1-3 deliver Sean's literal ask; Slice 4 is the bigger one.

**Start here:** §2 canonical surfaces (file:line) → §3 the gap table → §4 the slices.

---

## 1. Mandatory context (do not skip)

- Read `CLAUDE.md` first. This is a production PT SaaS on Render (`sswanstudios.com`). Local dev uses the **production DB**.
- **Rule 26 Canonical Surface Receipt is MANDATORY** before any UI/data-truth code. A lazy `import()` is NOT proof of mount — **JSX usage is**. This handoff already did that work for you (§2) — but re-verify anything you touch, because `main` moves fast (multiple agents).
- **Rule 67:** Codex may be coding this same tree in parallel. Read `.ai-workflow/coordination/*.lane.md` at session start; claim your files.
- **Work on a fresh worktree off `origin/main`** (`git worktree add -b <branch> c:/tmp/<name> origin/main`), junction `node_modules` from the primary tree, and **rebase right before pushing** — `main` moved 26 commits during one recent session.
- **Rule 8 (zero PII to LLMs)** and **Rule 9** (never "yoga"/"meditation" — say "stretching"/"flexibility") apply to all copy.
- **Swan Coach branding:** never say "AI" user-facing. It is **Swan Coach**.

---

## 2. Canonical surfaces (VERIFIED, file:line)

### 2a. The client's REAL home page (the mount chain)
```
route  /dashboard/client/overview
  -> UniversalDashboardLayout.routes.tsx:187-188   { path: '/overview', component: ClientHomeTab }
  -> ClientHomeTab.tsx:38-56                        renders <ClientDashboardHomeTab embedded ... />
  -> ClientDashboardHomeTab.tsx:186                 renders <ClientDashboardHome ... />
  -> ClientDashboardHome.tsx:36-73                  THE CARD GRID (this is where a new card goes)
```
Cards currently rendered by `ClientDashboardHome.tsx`:
`ClientProfileHero` (:48) · `ClientQuickActions` (:49) · `SocialProgressAnalyticsPreview` (:50) · **`TodaysAssignmentCard` (:52)** · `TrainingFocusCard` (:53) · `NextSessionCard` (:54) · `CommunityFeedCard`/`QuickPostCard` (:57-58) · `WeeklyInsightsCard`/`PerformanceZoneCard` (:61-62) · right rail in `ClientDashboardHome.railSections.tsx`.

**The existing plan-ish card:** `TodaysAssignmentCard` — `ClientDashboardHome.sections.tsx:268-282`, `data-testid="current-workout-card"`.
- Shows ONLY today's session: first exercise, exercise count, 3 status rows.
- Built by `buildAssignmentView()` — `ClientDashboardHome.viewModel.ts:129-170`.
- Data from `useCurrentClientWorkout(user.id)` — wired at `ClientDashboardHomeTab.tsx:87` (state) and `:141` (memo).
- **Its button NAVIGATES AWAY** (`viewModel.ts:117-127` → `/dashboard/client/log-workout?loadPlan=today` or `/dashboard/client/workouts`). It does **not** open a modal. This is the core gap.

### 2b. The ORPHANED Plan Vault card (your head start — REUSE THIS)
- `frontend/src/components/DashBoard/Pages/client-dashboard/observatory/ClientTrainingPlanVaultCard.tsx` (+ a passing `.test.tsx`).
- Props (`:22-31`): `{ planVault, currentWorkout, loading, error, canLogToday, onNavigate, onViewPdf, showOpenButton }`.
- Renders 7 horizon plan slots with Primary/Paused/Ready/Default status (`slotStatus()` `:33+`), week/day cursors, "Open PDF", "Log Today".
- Rendered ONLY by `ClientObservatoryWidgets.tsx:101-109` → inside `ClientObservatoryHome.tsx`.
- **`ClientObservatoryHome` IS NOT ROUTED.** Grep-verified: zero JSX mounts outside its own folder. Its docstring *claims* it is "canonical /dashboard/client/overview" — **that docstring is a LIE**; `ClientHomeTab` is what actually mounts. Do not trust it.
- ⚠ This means the vault card is **built and tested but dead**. Decide: mount it on the real home, or extract its slot UI into a new card. (Recommend: reuse, see §4 Slice 3.)

### 2c. Backend — plan model + routes
- **Model:** `backend/models/WorkoutPlan.mjs` (+ `WorkoutPlanDay.mjs`, `WorkoutPlanDayExercise.mjs`). Plan content is **JSONB `planData`**. Status enum: `active | paused | draft | completed`.
- **Active-plan rule:** partial unique index `workout_plans_one_active_per_user` (migration `20260501180931-add-workout-plan-active-unique-index.cjs`). `PUT /:id/activate` (`workoutPlanRoutes.mjs:743`) atomically activates one and demotes siblings to `paused`.
- **`isPrimary`** is a separate metadata flag (`markPlanPrimary` in `workoutPlanRouteHelpers.mjs`), set by `PUT /:id/primary` (`workoutPlanRoutes.mjs:543-613`), which **requires the plan already be `active`**.
- **⚠ ALL of `backend/routes/workoutPlanRoutes.mjs` is `protect + trainerOrAdminOnly`** — list `:90`, `GET /client/:userId` `:142`, `GET /:id` `:240`, POST/PUT/DELETE, `/blend` `:292`, `/activate` `:743`, `/duplicate` `:776`, `/advance` `:834`. **A CLIENT CANNOT CALL ANY OF THESE.** The lone exception is the PDF stream `GET /:id/pdf/content.pdf` (`:529-534`, uses `verifyClientAccessByPlanId`).
- **The client's OWN read path** is a different file: `backend/routes/clientWorkoutRoutes.mjs`
  - `GET /api/workouts/:userId/current` (`:58`) — `protect` + `ensureClientAccess` (allows the client themselves).
  - `GET /api/workouts/:userId/history` (`:166`).
  - Response built by `toCurrentWorkoutPlanResponse(plan)` (`:123`) + `overview.trainingPlanCatalog` (`:116,141,152`) from `clientTrainingReadModelService.mjs:293`.

### 2d. 🚨 THE KEY ARCHITECTURAL FACT (verified — do not skip)
**`GET /api/workouts/:userId/current` does NOT return the full plan.** `toCurrentWorkoutPlanResponse` → `planDataToWorkoutDays(planData, currentWeek)` (`backend/services/workoutPlanShapeService.mjs:96-140`) **flattens only the CURRENT WEEK's days** (`:101-108` picks `currentWeekData`).

➡ **A full-plan modal (all weeks/days/exercises) therefore REQUIRES a small backend addition.** An earlier verbal summary said "no backend change needed" — **that was wrong.** See Slice 1.

### 2e. Swan Coach — what it can and cannot do to a plan
Registry: `backend/services/ai/commandRegistry/workoutCommands.mjs`; dispatch via `commandDispatcher.mjs` / `commandExecutor.mjs`.
- **CREATE (admin/trainer only, debate/confirm-gated):** `build_workout_plan` (`:37-52`, POST `/api/workout-plans`, `isDebateRequired`), `create_nasm_program` (`:54-67`), `generate_periodization` (`:113-125`).
- **DELETE:** `delete_workout_plan` (`:199-210`) → `workoutPlanCommandDispatchers.mjs:23` `dispatchDeleteWorkoutPlan` (soft-archives: status → `completed`).
- **❌ NO `update_workout_plan` COMMAND EXISTS.** Nothing maps to `PUT /api/workout-plans/:id`. Editing a saved plan's `planData` is only possible by a trainer/admin hitting REST directly. (Grep-verified.)
- **FRONTEND_DISPATCH commands** (`:222-314`: `add_exercise_to_form`, `update_set_data`, `submit_workout_form`, …) act on the **WorkoutLogger FORM**, not on a saved WorkoutPlan. Do not confuse these.
- **Client-facing Coach** (`clientSelfService.mjs`, `roleRequired:['client','user']`): `my_workout_today` (`:38-47`, GET `/api/workouts/:myId/current`) = **read-only**; `request_plan_adjustment` (`:139-151`) merely writes a **client_note** via `/api/ai-chat/data-update` — **it does NOT edit the plan.**
- Proposal/review-gate infrastructure that Slice 4 should reuse: `coachActionProposalService.mjs`, `coachSplitPlanApprovalService.mjs`, `coachProposalRoutes.mjs`, `coachWorkoutProposalRouteDefaults.mjs`.

### 2f. Modals
- **No modal renders a structured plan.** The only plan modal is `ProtectedPlanPdfDialog` (`frontend/src/components/DashBoard/shared/plan-pdf/ProtectedPlanPdfDialog.tsx`) — a **PDF viewer**, reused by the orphaned observatory (`ClientObservatoryHome.tsx:288` via `useClientPlanPdfViewer.ts`) and the admin `ClientWorkoutPlansPanel.tsx:135`.
- The only place `planData` structure is actually rendered is inside **WorkoutLogger** when `loadPlan=today` (`WorkoutLogger.tsx:138-139`, auto-load `:565-579`) — and that's ONE session, not the plan.
- **House modal pattern to mirror** (Rule 18): `WorkoutPlannerBlendDialog.tsx` — overlay `z-index: 2200`, `role="dialog" aria-modal`, focus-to-close-button + restore opener, body-scroll-lock, Escape + click-outside close.
- **A good, newer reference:** `frontend/src/components/Shared/PdfApprovalVault.tsx` (I built it this session) — in-house modal, hand-rolled focus trap, `prefers-reduced-motion`, blob lifecycle. **`framer-motion` and `focus-trap-react` are NOT installed — do not add them** (Rule 46 filter); build in-house.

---

## 3. Gap table (what exists vs what's missing)

| Vision piece | Status | Evidence |
|---|---|---|
| Plan **always visible** on client home | **PARTIAL** — only a *today-only* summary card | `ClientDashboardHome.tsx:52`, `sections.tsx:268-282` |
| Richer Plan Vault card | **BUILT BUT DEAD** (page not routed) | `ClientTrainingPlanVaultCard.tsx`; mounted only by unrouted `ClientObservatoryHome` |
| Client can fetch own plan (backend) | **PARTIAL** — current week only, NOT full plan | `clientWorkoutRoutes.mjs:58`; `workoutPlanShapeService.mjs:96-140` |
| Tap → **modal with full plan** (weeks/days/exercises) | **MISSING** | only `ProtectedPlanPdfDialog` (PDF) exists |
| Swan Coach can **SEE** the plan | **EXISTS** | `clientSelfService.mjs:38`; `workoutPlanRoutes.mjs:142` |
| Swan Coach can **EDIT** the plan | **MISSING** — create/delete only | `workoutCommands.mjs:37,54,113,199`; no update dispatcher |

---

## 4. The slices (build in this order)

### SLICE 1 — Backend: let a client read their FULL active plan
**Why first:** Slice 2's modal is blocked without it (§2d).
- Add a client-scoped read to `backend/routes/clientWorkoutRoutes.mjs` (NOT `workoutPlanRoutes.mjs` — that file is trainer/admin-only by design; **do not loosen its middleware**).
- Suggested: `GET /api/workouts/:userId/plan/:planId` **or** `GET /api/workouts/:userId/current/full`, guarded by **`protect` + `ensureClientAccess`** (same guard as `:58`), returning ALL weeks/days/exercises from `planData`.
- **Authorization is the whole risk here.** A client must read **only their own** plan. Reuse `ensureClientAccess`; mirror `verifyClientAccessByPlanId` (used by the PDF route `workoutPlanRoutes.mjs:529`) if you key by planId. **Write an IDOR regression test**: client A must get 403 for client B's plan.
- Reuse the existing flatten helper: `planDataToWorkoutDays` handles BOTH legacy `weeklySchedule` and new `weeks[].days[]` / `weeks[].sessions[]` shapes (`workoutPlanShapeService.mjs:75,96`) — call it per-week rather than writing a new parser.
- **Rule 42:** backend change → before push run `git ls-files --others --exclude-standard backend/` AND `git diff --name-only HEAD backend/` and commit anything they surface (untracked/uncommitted backend files crash Render at boot).
- **Rule 58:** verify `planData` shape against the real DB before trusting it.

### SLICE 2 — `ClientPlanDetailModal` (the tap target)
- New shared modal rendering the full plan: **week → day → exercises** (sets/reps/tempo/rest), with the **current week/day clearly marked "you are here."**
- Mirror the house dialog contract (§2f): `z-index 2200`, `role="dialog" aria-modal`, focus trap + restore, scroll-lock, Escape + click-outside. **No new deps.**
- Design routes through **`swan-design-router`** (Rule 40) — Crystalline Swan palette, styled-components only, no MUI, 44px targets, `prefers-reduced-motion`, and the responsive matrix (Rule 24) incl. **320/414px** — a client opens this on a phone.
- Loading / empty ("no plan assigned yet") / error states are required (Definition of Done).
- **Least-clicks (Sean's standing mandate):** from the modal, one tap to **Log Today** (`/dashboard/client/log-workout?loadPlan=today`) and one tap to **Open PDF** (reuse `ProtectedPlanPdfDialog`).
- Keep it under the **300-line cap** (Rule 4) — extract `.styles.ts` like `PdfApprovalVault.styles.ts`.

### SLICE 3 — Mount the always-visible active-plan card on the REAL home
- Add the card to the **live** grid: `ClientDashboardHome.tsx:36-73` (NOT the orphaned observatory).
- **Prefer reusing `ClientTrainingPlanVaultCard`** (§2b) — it's built and has a passing test. Feed it from `useCurrentClientWorkout` (already wired at `ClientDashboardHomeTab.tsx:87`) + `trainingPlanCatalog`. If its 7-slot vault UI is too heavy for the home grid, extract a compact `ActivePlanCard` from it and keep the vault for a "see all plans" view.
- **"Always there no matter what" (Sean's exact requirement):** the card must render in **every** state — active plan, no plan yet, loading, error. **Never unmount it.** Empty state should read like an invitation ("No plan assigned yet — your coach is on it"), not an error.
- Card **onClick → opens Slice 2's modal** (this is the behavior change: today's card navigates away instead — `viewModel.ts:117-127`).
- ⚠ **Ripple:** `ClientDashboardHome` has render tests. Adding a data-driven card may need auth/hook mocks. Also `ClientObservatoryWidgets.source.test.ts` exists — check whether any source-contract test asserts the vault card's mount location before you move things.
- **Decide + tell Sean:** does `TodaysAssignmentCard` stay alongside the new plan card, or does the plan card absorb it? Two cards showing overlapping "today" info is the *duplicated-facts* smell Sean dislikes. **Recommend:** plan card becomes primary; keep Today's Assignment only if it earns its space.

### SLICE 4 — Swan Coach can edit an existing plan (BIGGEST; do last)
- Add an **`update_workout_plan`** command to `workoutCommands.mjs` + a dispatcher in `workoutPlanCommandDispatchers.mjs` (which today has **delete only**) → `PUT /api/workout-plans/:id`.
- **This must be approval-gated. An AI silently rewriting a client's training program is a real-harm path** (injury risk, trust). Reuse the existing proposal/review infrastructure (`coachActionProposalService.mjs`, `coachProposalRoutes.mjs`, `coachSplitPlanApprovalService.mjs`) — Coach **proposes a diff, Sean/trainer approves, then it applies**. Follow the `isDebateRequired` precedent on `build_workout_plan` (`:37-52`).
- **Role scoping:** editing stays **admin/trainer**. The **client-side** Coach must remain propose-only — keep `request_plan_adjustment` (`clientSelfService.mjs:139`) as the client's path; a client must never self-edit their program.
- Show the pending proposal in Slice 2's modal so Sean sees "Coach suggests changing Week 3 Day 2" with approve/reject.
- This slice deserves its own **grill-me → chromie** pass with Sean before building (Rules 64/65) — the approval UX is a product decision, not just code.

---

## 5. Locked decisions / do-not-relitigate

- The **real** client home is `ClientHomeTab` → `ClientDashboardHomeTab` → `ClientDashboardHome`. **`ClientObservatoryHome` is orphaned** despite its docstring claiming otherwise.
- **Do not loosen `workoutPlanRoutes.mjs` middleware** to serve clients. Client reads belong in `clientWorkoutRoutes.mjs` behind `ensureClientAccess`.
- **No new frontend deps** (`framer-motion` / `focus-trap-react` are NOT installed). In-house modal.
- Coach plan-editing is **approval-gated, admin/trainer-only**. Clients propose, never self-edit.
- The card must be **unconditionally present** on home (all states).

## 6. Verification bar (Definition of Done)

- Targeted `npx vitest run <files>` green + **full suite** stays green — baseline is currently **5780/5780, 1294 files, `tsc` 0 errors repo-wide**. Any red you see is YOURS; do not hand it off.
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (default heap OOMs).
- **IDOR test on Slice 1** (client A cannot read client B's plan) — non-negotiable.
- Responsive check at **320/375/414/768/1440** for the card + modal.
- Rule 61: run a **hostile self-review and fix what it finds BEFORE reporting**.
- Rule 63: `npm run code-health:audit` — fix dead code *your slice* introduces (repo baseline is large/pre-existing; don't boil that ocean).
- Rule 57 closeout: **plain-English summary first**, then technical.

## 7. Known traps (cost real time this session)

- **`main` moves FAST** (26 commits landed during one session). Always `git rev-list --left-right --count origin/main...HEAD` first; rebase right before push.
- **Source-contract tests grep for literal strings.** Renaming a function can redden a test in a file you never opened (e.g. a guard asserted `exportPopulatedPlanPDF(...)` and broke when the call was renamed). After a rename, grep the repo for the old symbol **including test files**.
- **Guards can false-positive on PROSE.** A route description reading "Log in **as any** client" tripped a `not.toContain(' as any')` cast guard; a comment documenting `NASM-certified` tripped the credential lock. If a guard fails, check whether the match is in a **string/comment** before "fixing" the code.
- **`getBy*` after a single `await act()` is flaky** when the target is `lazy()` behind `<Suspense>` — use `findBy*`.
- **Never leave a secret in the clipboard** (a stuck paste key broadcast a live Render API key this session).

## 8. Suggested opening move for the next agent

1. Read `CLAUDE.md`, this doc, and `.ai-workflow/coordination/*.lane.md`.
2. Fresh worktree off `origin/main`; junction `node_modules`; confirm baseline green.
3. **Ask Sean the Slice-3 question** (does `TodaysAssignmentCard` stay or get absorbed?) — it changes the card design.
4. Build **Slice 1** (backend full-plan read + IDOR test) → **Slice 2** (modal) → **Slice 3** (mount card). Commit per slice; **ONE batched push at the end** (Rule 70).
5. Treat **Slice 4** as a separate, Sean-gated workstream (grill-me → chromie first).
