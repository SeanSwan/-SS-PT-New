# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 81.0s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

# Architectural Review: Nutrition Decision Logger Plan
## SwanStudios — React/TypeScript/styled-components

---

## Executive Summary

The plan is **architecturally sound at the planning level** but contains several implementation-level gaps that will cause production problems if not resolved before coding begins. The free-brain synthesis has already caught the most critical bugs; this review focuses on React/TypeScript-specific architectural concerns the synthesis did not fully address.

**Overall verdict: APPROVE WITH CHANGES** — the component decomposition and state strategy need explicit decisions before Slice 1 begins.

---

## Finding 1 — Component Decomposition

### 1.1 `NutritionWorkspace` Will Exceed 300 Lines

**Severity: HIGH**
**File: `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx`**

**Issue:** The plan asks `NutritionWorkspace` to become the host for a Today command ribbon, a capture rail with 9 modes, a draft/review panel, a source-truth panel, and a diary timeline. The current file is already at line 288. Adding the new shell, mode-switching logic, and panel orchestration will push it past 600–800 lines.

**Recommended Fix:**

```
NutritionWorkspace.tsx              ← orchestrator only, <100 lines
  NutritionTodayRibbon.tsx          ← date, macro ring, hydration, streak
  NutritionCaptureRail.tsx          ← mode selector, 44px controls
  NutritionDraftPanel.tsx           ← editable draft, serving basis, reconciliation
  NutritionSourceTruthPanel.tsx     ← source system, confidence, conflicts
  NutritionDiaryTimeline.tsx        ← diary rows, verification chips, repeat
  capture/
    ManualCaptureCard.tsx
    SearchCaptureCard.tsx
    BarcodeCaptureCard.tsx
    LabelPhotoCaptureCard.tsx
    VoiceCaptureCard.tsx
    RecipeCaptureCard.tsx
    LocalProduceCaptureCard.tsx
    RepeatCaptureCard.tsx
```

`NutritionWorkspace` becomes a layout shell that composes these pieces. Each capture card is independently lazy-loadable, which matters because voice and label-photo pull in heavy dependencies (ML Kit, audio APIs).

---

### 1.2 `NutritionDraftPanel` Will Exceed 300 Lines

**Severity: HIGH**
**File: `NutritionDraftPanel.tsx` (proposed)**

**Issue:** The draft panel must render editable food lines, serving-basis selector, nutrient comparison table, raw-vs-calculated calorie display, reconciliation status, and save/review controls. That is at minimum 5 distinct UI concerns in one file.

**Recommended Fix:**

```
NutritionDraftPanel.tsx             ← composes the pieces, <80 lines
  DraftFoodLineList.tsx             ← editable food rows
  ServingBasisSelector.tsx          ← label_serving/per_100g/weighed/household
  NutrientComparisonTable.tsx       ← reported vs calculated columns
  ReconciliationStatusBadge.tsx     ← status chip + explanation
  DraftSaveControls.tsx             ← save / needs-review / discard
```

---

### 1.3 `ClientNutritionEstimateReviewPanel` Needs a Parallel Admin Queue Shell

**Severity: MEDIUM**
**File: `frontend/src/components/DashBoard/workspaces/clients-team/ClientNutritionEstimateReviewPanel.tsx`**

**Issue:** The plan extends the review queue into a source-quality console (Slice 6). Bolting unmatched-barcode, OCR-confidence, and stale-source queues onto the existing estimate panel will exceed 300 lines and mix two distinct concerns: client-estimate verification and food-data-source quality.

**Recommended Fix:** Keep `ClientNutritionEstimateReviewPanel` for client-estimate review. Create a sibling `NutritionSourceQualityConsole.tsx` for the data-quality queues. Share a `useNutritionReviewQueue` hook between them.

---

### 1.4 `FoodScannerPage` Scanner-Return State

**Severity: MEDIUM**
**File: `frontend/src/pages/FoodScanner/FoodScannerPage.tsx`**

**Issue:** The plan proposes a "first-class launcher to `/food-scanner` with return-to-nutrition state" (Slice 3). `FoodScannerPage` currently has no concept of a return path or a draft handoff. If the scanner stays as a separate route, it needs a controlled exit that passes a `NutritionEntryDraft` back to the nutrition shell — not just a browser back-navigation.

**Recommended Fix:** Add a `returnTo` query param and a `onScanComplete` state payload passed via `location.state`. The nutrition shell reads `location.state?.scanDraft` on mount and pre-populates the draft panel. This avoids embedding the full scanner in `NutritionWorkspace` while keeping the data flow clean.

---

## Finding 2 — State Management

### 2.1 No Proposed State Owner for `NutritionEntryDraft`

**Severity: CRITICAL**
**File: No file proposed in the plan**

**Issue:** The plan defines `NutritionEntryDraft` as a shared contract but does not specify where the in-progress draft lives. Nine capture modes all write to the same draft. If each capture card manages its own local state and "hands off" to the parent, the parent becomes a prop-drilling hub. If each card reads from a context, the context needs a defined reducer.

**Recommended Fix:** Create a `useDraftNutritionEntry` hook that owns the draft via `useReducer`. The hook exposes typed action creators (`setCaptureModeAction`, `updateNutrientsAction`, `setServingBasisAction`, `resetDraftAction`). `NutritionWorkspace` instantiates the hook once and passes the dispatch down via a `NutritionDraftContext`. Capture cards consume the context; they do not receive the full draft as props.

```typescript
// hooks/useDraftNutritionEntry.ts
type DraftAction =
  | { type: 'SET_CAPTURE_MODE'; mode: NutritionEntryDraft['captureMode'] }
  | { type: 'UPDATE_NUTRIENTS'; nutrients: Partial<NutrientPanel> }
  | { type: 'SET_SERVING_BASIS'; basis: NutritionEntryDraft['servingBasis']; value: number | null; unit: string | null }
  | { type: 'SET_SOURCE'; system: NutritionEntryDraft['sourceSystem']; recordId: string | null }
  | { type: 'RESET' };

// NutritionDraftContext.tsx  
const NutritionDraftContext = React.createContext<{
  draft: NutritionEntryDraft;
  dispatch: React.Dispatch<DraftAction>;
} | null>(null);
```

This is a clean separation: the hook owns business logic, the context owns distribution, capture cards own their input UI only.

---

### 2.2 Circular Dependency Risk Between Draft Hook and Capture Cards

**Severity: HIGH**
**Files: `useDraftNutritionEntry.ts`, capture card components**

**Issue:** If capture cards import types from `useDraftNutritionEntry` and the hook imports normalization utilities that import capture-mode constants that capture cards also define, you get a circular import chain. TypeScript will not always catch this at compile time; it surfaces as `undefined` at runtime.

**Recommended Fix:** Extract all shared types (`NutritionEntryDraft`, `NutrientPanel`, `CaptureMode`, `ServingBasis`, `SourceSystem`, `ReconciliationStatus`, `ReviewStatus`) into a single `types/nutritionDraft.ts` file. Nothing else exports these types. The hook, the context, and all capture cards import from `types/nutritionDraft.ts` only.

```
types/
  nutritionDraft.ts    ← all shared types, no imports from feature files
hooks/
  useDraftNutritionEntry.ts    ← imports from types/
  useNutritionDiary.ts         ← imports from types/
  useNutritionReviewQueue.ts   ← imports from types/
```

---

### 2.3 `NutritionWorkspace` Macro Refresh After Save

**Severity: MEDIUM**
**File: `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx:146`**

**Issue:** The current workspace refreshes macros after meal log success via a callback at line 146. The plan adds Today ribbon, diary timeline, and hydration as additional surfaces that all need to refresh after a save. If each surface subscribes to its own fetch independently, a single save triggers 3–4 parallel refetches of overlapping data.

**Recommended Fix:** Create a `useNutritionPageData` hook that owns all page-level data fetching (today summary, diary entries, macro totals, hydration). It exposes a single `refresh()` function. After any save succeeds, call `refresh()` once. All display components read from this hook's return values.

```typescript
// hooks/useNutritionPageData.ts
const useNutritionPageData = (date: string) => {
  const [state, dispatch] = useReducer(nutritionPageReducer, initialState);
  
  const refresh = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    const [diary, macros, hydration] = await Promise.all([
      fetchDiaryEntries(date),
      fetchMacroTotals(date),
      fetchHydration(date),
    ]);
    dispatch({ type: 'FETCH_SUCCESS', diary, macros, hydration });
  }, [date]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, refresh };
};
```

---

### 2.4 Active Capture Mode State Location

**Severity: MEDIUM**
**File: `NutritionCaptureRail.tsx` (proposed)**

**Issue:** The plan does not specify whether the active capture mode (which of the 9 modes is currently open) lives in the draft context, in `NutritionWorkspace` local state, or in the URL. This matters because:
- If it is local state, deep-linking to "open barcode scanner" is impossible.
- If it is in the draft context, resetting the draft also resets the active mode, which may be undesirable.
- If it is in the URL, the scanner-return flow (Finding 1.4) becomes simpler.

**Recommended Fix:** Put the active capture mode in the URL as a query param (`?capture=barcode`). `NutritionCaptureRail` reads from `useSearchParams`. The draft context holds the draft data only, not UI state. This also makes the scanner return path clean: the scanner redirects back to `/user-dashboard/nutrition?capture=barcode` with `location.state.scanDraft`.

---

## Finding 3 — Data Flow

### 3.1 Race Condition: Async Capture Lanes Writing to Shared Draft

**Severity: HIGH**
**Files: `LabelPhotoCaptureCard.tsx`, `VoiceCaptureCard.tsx`, `useDraftNutritionEntry.ts`**

**Issue:** Label-photo OCR and voice capture are async operations that may take 2–8 seconds. If a user starts a voice capture, then taps "Search" while the voice request is in flight, both async operations will attempt to write to the same draft. The second write will overwrite the first without warning.

**Recommended Fix:** Add a `captureInFlight: boolean` and `captureAbortController: AbortController | null` to the draft reducer state. When a new capture mode is selected while one is in flight, dispatch `ABORT_CAPTURE` first, which calls `abortController.abort()` and resets `captureInFlight`. The capture rail disables mode switching while `captureInFlight` is true, or shows a "cancel current capture" confirmation.

```typescript
// In the reducer
case 'START_CAPTURE': {
  const controller = new AbortController();
  return { ...state, captureInFlight: true, captureAbortController: controller };
}
case 'ABORT_CAPTURE': {
  state.captureAbortController?.abort();
  return { ...state, captureInFlight: false, captureAbortController: null };
}
```

---

### 3.2 Stale Draft After Successful Save

**Severity: HIGH**
**Files: `DraftSaveControls.tsx`, `useDraftNutritionEntry.ts`**

**Issue:** After a successful `POST /api/macros`, the plan calls `refresh()` on the page data but does not specify that the draft is reset. If the draft is not explicitly reset, the user sees the just-saved food still in the draft panel, which is confusing and risks a double-submit.

**Recommended Fix:** The save handler in `DraftSaveControls` must dispatch `RESET` to the draft context immediately on save success, before the page data refresh completes. The sequence is:

```
1. User taps Save
2. POST /api/macros (optimistic: disable save button)
3. On success: dispatch({ type: 'RESET' })  ← clears draft immediately
4. On success: pageData.refresh()           ← updates diary/macros/hydration
5. On error: re-enable save button, show error, draft preserved
```

---

### 3.3 `FoodSearchPanel` Client-Side USDA Key Exposure

**Severity: CRITICAL**
**Files: `frontend/src/components/FoodTracker/FoodSearchPanel.logic.ts:55`, `:148`**

**Issue:** Already flagged by the synthesis. Restating here because it affects the data flow architecture: if the USDA proxy is not in place before Slice 2 ships, the search capture lane will either be broken (key removed) or insecure (key exposed). This is not a nice-to-have; it gates Slice 2.

**Recommended Fix:** Add `GET /api/nutrition/food-search?q=&source=usda|off` as a backend proxy endpoint before any frontend search work begins. The frontend search capture card calls only this endpoint. The backend holds all external API keys in environment variables. This endpoint also becomes the natural place to implement Swan-cache-first lookup (check `FoodProduct` before hitting external APIs).

---

### 3.4 Scanner Write Path Stale Serving Size

**Severity: HIGH**
**File: `frontend/src/pages/FoodScanner/FoodScannerPage.tsx:472-475`**

**Issue:** The synthesis correctly identifies this as a frontend-only hardcode. The architectural implication is that `NutritionEntryDraft.servingBasis` will always be `'per_100g'` for scanner-originated entries until this is fixed, which means the reconciliation status will always show `'missing_source'` for label-serving entries. This corrupts the review queue signal.

**Recommended Fix:** Before posting to `/api/food-scanner/log-scan`, the scanner flow must present a `ServingBasisSelector` (the same component used in the draft panel) and populate `servingSizeGrams` from user input. The backend already accepts this value; the fix is purely in the frontend capture card.

---

## Finding 4 — React Patterns

### 4.1 Missing `React.memo` on Capture Cards

**Severity: MEDIUM**
**Files: All capture card components (proposed)**

**Issue:** `NutritionCaptureRail` renders all 9 capture cards (or at minimum their trigger buttons). When the draft context updates — which happens on every keystroke in the manual capture card — all 9 cards will re-render unless memoized. The draft context update rate is high.

**Recommended Fix:** Wrap all capture card components in `React.memo`. The capture rail passes only the `isActive: boolean` prop to each card. Cards that need draft data consume the context directly inside themselves, not via props from the rail. This means a draft update only re-renders the active card, not all 9.

```typescript
const ManualCaptureCard = React.memo(({ isActive }: { isActive: boolean }) => {
  const { draft, dispatch } = useNutritionDraftContext(); // only re-renders this card
  if (!isActive) return null;
  // ...
});
```

---

### 4.2 Missing `useMemo` on Nutrient Comparison Calculation

**Severity: MEDIUM**
**File: `NutrientCompari

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
