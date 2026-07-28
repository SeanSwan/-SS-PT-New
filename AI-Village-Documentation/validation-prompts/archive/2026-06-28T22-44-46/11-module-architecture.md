# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 29.9s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

**Training Command Unification – File‑Organization Review & Recommendations**  
*(Based solely on the supplied plan – no external assumptions)*  

---  

## 1. Decomposition – Are the proposed files/folders right?  

| Existing location (from plan) | What the plan adds | Suggested new/existing files | Comments |
|-------------------------------|-------------------|------------------------------|----------|
| `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx` | Unified “Training Command” shell that hosts **Log Today**, **Choose Generated**, **Generate Plan**, **Backfill History**, **History/Charts** | • Keep the file as a thin **router** that renders `<TrainingCommandShell />`  <br>• New shell component (see below) | The current file is already a good place to host the shell; it should **not** contain UI logic – only route/state wiring. |
| `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` | In‑logger generated‑plan/day picker + ability to load a pre‑filled historical draft | • `WorkoutLogger/PlanDayPicker.tsx` (UI)  <br>• `WorkoutLogger/useGeneratedPlanPickerHook.ts` (data‑fetch)  <br>• `WorkoutLogger/useHistoricalPrefill.ts` (state hook) | The logger stays the “execution surface”; we only add a picker and a pre‑fill hook. |
| `frontend/src/components/DashBoard/workspaces/clients-team/tabs/HistoricalWorkoutImportPanel.tsx` | “Backfill in Logger” action that hands a preview draft to the logger | • No new file needed **if** we expose a small callback (`onBackfillDraft`) from the panel.  <br>• If we prefer encapsulation, add `HistoricalWorkoutImportPanel/useBackfillAction.ts`. | The panel already posts to `/history‑preview`; we just need to forward the draft data. |
| `frontend/src/services/aiWorkoutService.ts` | No new generation engine – we reuse existing calls. | • No new file. | Plan explicitly says “do not add a fourth generation engine.” |
| `frontend/src/components/WorkoutManagement/useWorkoutPlanBuilderController.ts` | Re‑used for plan generation/save flow inside the shell. | • No new file. | Keep as‑is; import where needed. |
| **Backend** (out of scope for this frontend review) | Historical source flag, suppressEngagementSideEffects, etc. | – | Frontend only needs to pass the flag; no new API endpoints required. |

### Verdict  
The plan’s implied breakdown is **reasonable** – we only need a handful of new UI/components and a couple of hooks. No existing file is “too thin”; the risk is that the new shell or logger picker could grow beyond 300 lines if we bundle too much logic in one place.

---  

## 2. Styles/ Organization  

*All colors must be CSS custom properties (`var(--token, #fallback)`).*  

| Proposed style file | Purpose | Why it’s appropriate |
|---------------------|---------|----------------------|
| `src/styles/theme/_tokens.ts` (already exists) | CSS custom property definitions for the 18 swappable themes. | Central source – no duplication. |
| `src/styles/components/TrainingCommandShell.ts` | Styled‑components for the shell layout (mode selector, panels, gutters). | Keeps shell‑specific styling together; < 150 lines. |
| `src/styles/components/WorkoutLogger/PlanDayPicker.ts` | Styles for the in‑logger picker (dropdown, glow buttons, touch targets). | Isolated to the picker; easy to theme‑override. |
| `src/styles/components/HistoricalWorkoutImportPanel.ts` (optional) | If we add a “Backfill in Logger” button, style it here. | Small, reusable. |
| `src/styles/utils/glow.ts` | Shared styled‑component mixins for the **Dual‑Button Glow** (blue→purple, purple→cyan). | Prevents duplication across buttons. |

**Barrel export** – each `styles/components/` folder gets an `index.ts` that re‑exports its styled components. This keeps imports clean (`import { PlanDayPicker } from '@/styles/components/WorkoutLogger'`).  

No over‑fragmentation: each file stays well under the 300‑line limit and groups related styling.

---  

## 3. Hooks/ Separation – Are the proposed hooks clean?  

| Hook (new) | Responsibility | Layer | Why separation is clean |
|------------|----------------|-------|--------------------------|
| `src/hooks/workoutLogger/useGeneratedPlanPicker.ts` | • Calls `/api/workout-plans/client/:userId` (or re‑uses existing `aiWorkoutService` calls)  <br>• Returns `{ plans, selectedDay, loadPlan(dayId), reset }` | **Data‑fetch** | Isolates API logic; UI component only consumes the returned object. |
| `src/hooks/workoutLogger/useHistoricalPrefill.ts` | • Receives draft data from `HistoricalWorkoutImportPanel` (via context or prop)  <br>• Stores it in React state (`useState`) and returns a stable object `{ exercises, notes, date, source }`  <br>• Provides a `clearPrefill()` utility | **UI‑state** (temporary, review‑gated) | Keeps the logger agnostic of where the prefill came from; the panel only needs to call `setHistoricalPrefill(draft)`. |
| `src/hooks/trainingCommand/useModeSelector.ts` | • Tracks the active mode (`logToday` \| `chooseGenerated` \| `generatePlan` \| `backfillHistory` \| `historyCharts`)  <br>• Exposes `setMode`, `isMode` helpers | **UI‑state** (shell) | Pure UI state; no data fetching. |
| `src/hooks/trainingCommand/useHistoricalBackfill.ts` (optional thin wrapper) | • Calls the existing `submitAiWorkoutLogAsDailyForm` (via a service) with `{ historicalSource: true, suppressEngagementSideEffects: true }`  <br>• Returns `{ isSubmitting, error, reset }` | **Business‑logic** (encapsulates the safety contract) | Centralizes the flag logic so any component (logger, panel) can trigger a safe backfill without duplicating the contract. |
| `src/hooks/shared/useApi.ts` (existing) | Generic GET/POST wrapper with auth headers. | **Shared** | Reused by all data‑fetch hooks. |

**Separation of concerns** is clean:  

* Data‑fetch hooks → talk to the backend.  
* UI‑state hooks → manage transient UI values (mode, prefill).  
* Business‑logic hook → encapsulates the *historical backfill safety contract* (flag handling).  

No hook mixes API calls with UI state directly.

---  

## 4. 300‑line Budget – Files at Risk & Suggested Splits  

| File (proposed) | Estimated lines (logic only) | Risk? | Suggested split if >300 |
|-----------------|------------------------------|-------|--------------------------|
| `src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx` | ~80 (just renders shell + passes props) | **Low** | – |
| `src/components/TrainingCommandShell.tsx` | ~200 (layout, mode selector, panel routing) | **Medium** – could creep if we embed panel logic. | **Split**: move each panel into its own file (`LogTodayPanel.tsx`, `GeneratedPlanPickerPanel.tsx`, `HistoryImportPanel.tsx`, `ChartsPanel.tsx`). Shell then only imports and conditionally renders them. |
| `src/components/WorkoutLogger/PlanDayPicker.tsx` | ~150 (dropdown, button groups, glow styling) | **Low** | – |
| `src/components/WorkoutLogger/useHistoricalPrefill.ts` | ~40 | **Low** | – |
| `src/components/WorkoutLogger/useGeneratedPlanPicker.ts` | ~80 (fetch + state) | **Low** | – |
| `src/hooks/trainingCommand/useModeSelector.ts` | ~30 | **Low** | – |
| `src/hooks/trainingCommand/useHistoricalBackfill.ts` | ~50 | **Low** | – |
| `src/styles/components/TrainingCommandShell.ts` | ~120 | **Low** | – |
| `src/styles/components/WorkoutLogger/PlanDayPicker.ts` | ~100 | **Low** | – |
| `src/styles/utils/glow.ts` | ~30 | **Low** | – |

**Only the shell is close to the limit**; extracting the four panels keeps each file comfortably under 150 lines.

---  

## 5. Import Graph – Dependency Tree & Circular Risks  

```
TrainingTabSectionContent.tsx
   └─> TrainingCommandShell.tsx
        ├─> useModeSelector.ts (hooks)
        ├─> LogTodayPanel.tsx
        │    └─> (uses existing WorkoutLogger logic via props)
        ├─> GeneratedPlanPickerPanel.tsx
        │    ├─> WorkoutLogger/PlanDayPicker.tsx
        │    │    ├─> useGeneratedPlanPicker.ts (hooks)
        │    │    │    └─> useApi.ts (shared)
        │    │    └─> styles/WorkoutLogger/PlanDayPicker.ts
        │    └─> styles/TrainingCommandShell.ts
        ├─> HistoryImportPanel.tsx (existing)
        │    └─> (optional) useBackfillAction.ts → uses useHistoricalBackfill.ts
        │          └─> useApi.ts
        ├─> ChartsPanel.tsx (existing Victory charts)
        └─> (optional) useHistoricalBackfill.ts
               └─> useApi.ts
```

* **No circular dependencies** – all arrows point downward (UI → hooks → shared utils).  
* The deepest chain is **3‑4 layers** (Shell → Panel → Picker/Hook → shared API), well within acceptable limits.  
* Shared hooks (`useApi.ts`, `useTheme.ts` if used) are imported by many feature hooks but never import back from features – safe.

---  

## 6. Barrel Exports – Where They Help vs Hurt  

| Directory | Barrel (`index.ts`) recommended? | Reason |
|-----------|----------------------------------|--------|
| `src/components/` | **Yes** – re‑export high‑level components (`TrainingCommandShell`, `WorkoutLogger`, `HistoricalWorkoutImportPanel`). | Allows `import { TrainingCommandShell } from '@/components'` without deep paths. |
| `src/components/WorkoutLogger/` | **Yes** – export `PlanDayPicker` and the two hooks (`useGeneratedPlanPicker`, `useHistoricalPrefill`). | Keeps logger imports tidy. |
| `src/components/DashBoard/workspaces/clients-team/tabs/` | **No** – this folder already has many specific tabs; a barrel would force re‑export of every tab (including unrelated ones). Better to import directly (`import HistoricalWorkoutImportPanel from '@/components/DashBoard/workspaces/clients-team/tabs/HistoricalWorkoutImportPanel'`). |
| `src/hooks/` | **Yes** – separate barrels for `workoutLogger`, `trainingCommand`, `shared`. | Prevents long relative paths and groups related hooks. |
| `src/styles/components/` | **Yes** – export styled components per feature (e.g., `PlanDayPicker`, `TrainingCommandShell`). | Enables `import { PlanDayPicker } from '@/styles/components/WorkoutLogger'`. |
| `src/styles/utils/` | **Yes** – export glow mixins, media queries, etc. | Small utility barrel. |

**Avoid barrels** in directories that contain a mix of unrelated files (e.g., the tabs folder) – they would create a noisy export list and could encourage accidental imports of unused components.

---  

## 7. Shared vs. Feature‑Local – Boundary Check  

| Module | Shared? | Feature‑local? | Rationale |
|--------|---------|----------------|-----------|
| `useApi.ts` | ✅ Shared | – | Generic AJAX wrapper; used by many features. |
| `useTheme.ts` (if exists) | ✅ Shared | – | Provides theme tokens; used across styled‑components. |
| `useModeSelector.ts` | ❌ Feature‑local | ✅ Training Command shell | Only the shell needs to know the active mode. |
| `useHistoricalBackfill.ts` | ❌ Feature‑local | ✅ Training Command (historical backfill) | Encapsulates the safety flag; not needed elsewhere. |
| `useGeneratedPlanPicker.ts` | ❌ Feature‑local | ✅ Workout Logger | Specific to logger’s plan‑day picker. |
| `useHistoricalPrefill.ts` | ❌ Feature‑local | ✅ Workout Logger | Only logger consumes prefill data. |
| `PlanDayPicker.tsx` | ❌ Feature‑local | ✅ Workout Logger | UI piece exclusive to logger. |
| `TrainingCommandShell.tsx` | ❌ Feature‑local | ✅ Training Command workspace | Top‑level layout for the unified tab. |
| Styled‑components under `src/styles/components/` | ❌ Feature‑local (per feature) | ✅ Each feature gets its own folder. | Keeps theme tokens global but component‑scoped styling local. |
| `glow.ts` mixin | ✅ Shared | – | Used by any button that needs the dual‑glow effect (e.g., logger, plan picker). |

**Result:** The plan respects a clean split – truly cross‑cutting concerns (API, theme, glow) live in `shared/`; everything else lives inside the feature folder that owns it.

---  

## Proposed File Tree (frontend only)  

```
frontend/
└─ src/
   ├─ components/
   │  ├─ DashBoard/
   │  │  └─ workspaces/
   │  │     └─ clients-team/
   │  │        └─ tabs/
   │  │           ├─ TrainingTabSectionContent.tsx          ← thin router
   │  │           ├─ HistoricalWorkoutImportPanel.tsx      ← existing (unchanged)
   │  │           └─ (other existing tabs …)
   │  ├─ TrainingCommand/
   │  │  ├─ TrainingCommandShell.tsx                       ← unified shell
   │  │  ├─ LogTodayPanel.tsx                              ← delegates to existing WorkoutLogger
   │  │  ├─ GeneratedPlanPickerPanel.tsx
   │  │  │   └─ PlanDayPicker.tsx                          ← picker UI
   │  │  ├─ HistoryImportPanel.tsx                         ← reuse existing (or thin wrapper)
   │  │  └─ ChartsPanel.tsx                                ← existing Victory charts
   │  ├─ WorkoutLogger/
   │  │  ├─ WorkoutLogger.tsx                              ← existing (unchanged UI)
   │  │  ├─ PlanDayPicker.tsx                              ← new picker UI
   │  │  ├─ useGeneratedPlanPicker.ts                      ← data‑fetch hook
   │  │  ├─ useHistoricalPrefill.ts                        ← UI‑state hook
   │  │  └─ index.ts

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
