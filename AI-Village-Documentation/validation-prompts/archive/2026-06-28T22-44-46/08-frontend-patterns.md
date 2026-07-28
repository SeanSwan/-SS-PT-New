# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 4.9s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

This review evaluates the **Training Command Unification** plan against the SwanStudios architectural standards.

### 1. Styled-components Organization
The current plan relies on colocated components. To maintain the "Crystalline Swan" theme:
*   **Recommendation:** Move away from inline style objects. Use a `styles.ts` file for each major component (e.g., `WorkoutLogger.styles.ts`) to house `styled` components.
*   **Barrel Exports:** Use `index.ts` files in feature folders to re-export components, but **strictly avoid** deep-nesting exports that exceed 3 levels.
*   **Theme Tokens:** Ensure all `styled` components consume the 18-theme variables via `props.theme` or direct `var(--token)` usage. Never hardcode colors.

### 2. Hook Composition
The plan mentions `useWorkoutPlanBuilderController`.
*   **Recommendation:** Avoid "God Hooks." Split logic into:
    *   `useWorkoutData`: Handles fetching/caching (React Query).
    *   `useWorkoutActions`: Handles the `submitAiWorkoutLogAsDailyForm` logic.
    *   `useWorkoutState`: Manages the local UI state for the "Picker" or "Prefill" modes.
*   **Nesting:** Keep hook depth to a maximum of 2 levels of composition to prevent re-render cascades in the Logger.

### 3. Render Customization
The plan suggests a "Unified Training Command shell."
*   **Performance:** Avoid deep prop-drilling. Use `React.Context` for the `TrainingCommandContext` to provide the current `activeMode` (Log/Backfill/Plan) to children.
*   **Cost:** Memoize the `WorkoutLogger` sub-components using `React.memo` to prevent re-renders when the "Picker" state changes.

### 4. Animation Strategy
*   **Approach:** Use `framer-motion` for layout transitions (e.g., switching between Logger and History Import) and CSS keyframes for micro-interactions (e.g., button glows).
*   **Safety:** Wrap all animations in `prefers-reduced-motion` media queries.
*   **GPU:** Ensure all `framer-motion` transforms use `will-change: transform` or are hardware-accelerated via `layout` props.

### 5. Responsive Patterns
*   **Strategy:** Use a mobile-first approach.
*   **Breakpoint Matrix:** Define a shared `theme.breakpoints` object. Use `styled-components` media queries rather than JS-based window listeners to keep the UI in sync with the CSSOM.
*   **Touch Targets:** Enforce the 44px min-touch target via a `TouchTarget` mixin applied to all buttons in the Logger and Picker.

### 6. Form Handling
*   **Controlled vs Uncontrolled:** Use `react-hook-form` for the `WorkoutLogger` to handle the complex state of exercises/sets.
*   **Debounce:** Debounce the voice-to-text input and any "Auto-save" drafts to the backend to prevent race conditions in the `aiWorkoutDailyFormService`.

### 7. Lazy Boundaries
The plan identifies `WorkoutPlanBuilder`, `WorkoutLogger`, and `HistoricalWorkoutImportPanel`.
*   **Recommendation:** Wrap these in `React.lazy()` at the `TrainingTabSectionContent` level.
*   **Suspense:** Implement a `CrystallineLoader` (a subtle, branded pulse animation) to wrap these boundaries to maintain the "Enchanted Apex" aesthetic during chunk loading.

### 8. Touch Gestures
*   **Recommendation:** Use `react-use-gesture` (or `use-gesture`) for swipe-to-delete or swipe-to-import actions in the history list.
*   **Accessibility:** Ensure every gesture has a redundant UI trigger (e.g., a "Delete" button icon) to satisfy WCAG requirements for users who cannot perform complex gestures.

---

### Implementation-Ready Recommendations

| Feature | Priority | Technical Requirement |
| :--- | :--- | :--- |
| **Historical Safety** | P0 | Add `source: 'historical_import'` to `submitAiWorkoutLogAsDailyForm` payload. |
| **Backend Guard** | P0 | Update `workoutLogService` to check `source` for `suppressEngagementSideEffects`. |
| **Logger Picker** | P1 | Add `currentPlanCatalog` context to `WorkoutLogger` to allow selection without navigation. |
| **Prefill Logic** | P1 | Use `sessionStorage` to pass `draft` data from `HistoricalWorkoutImportPanel` to `WorkoutLogger`. |

**Critical Warning:** Do not implement the "Unified Training Command shell" (Option D) until the `historical_import` source contract is verified in the backend. The risk of accidental billing/XP triggering is too high to combine these surfaces before the data-write logic is hardened.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
