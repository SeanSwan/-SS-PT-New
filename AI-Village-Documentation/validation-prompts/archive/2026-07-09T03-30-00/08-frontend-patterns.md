# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 6.4s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

This review evaluates the **Nutrition Decision Logger** architecture against the SwanStudios production standards. The plan is technically sound but requires specific refinements to ensure data integrity and security.

### 1. Styled-components Organization
*   **Current Pattern:** The plan relies on `NutritionWorkspace` and standard component-level styles.
*   **Recommendation:** Adopt a **"Theme-Token-First"** approach. Since you have 18 themes, ensure all `styled-components` use the `var(--token, #fallback)` pattern strictly.
*   **Barrel Re-exports:** Use `index.ts` files for `components/Nutrition/` to keep imports clean, but **avoid deep nesting** of styled-components. Keep style definitions in a `styles.ts` file adjacent to the component to maintain the 300-line file limit.

### 2. Hook Composition
*   **Current Pattern:** The plan uses `useFoodSearchAddToLog.ts` and `mealPhotoLog.ts`.
*   **Recommendation:** These should be abstracted into a unified `useNutritionDraft` hook.
    *   **Composition:** `useNutritionDraft` should manage the `NutritionEntryDraft` state and expose `updateDraft`, `validateDraft`, and `submitDraft` methods.
    *   **Depth:** Keep logic in hooks; keep components "dumb" (render-only). Avoid nesting hooks more than 2 levels deep (e.g., `useNutrition` -> `useNutritionDraft` -> `useApi`).

### 3. Render Customization
*   **Performance:** The "Draft/Review Panel" is high-frequency.
*   **Recommendation:** Use `React.memo` for the individual food-line items in the draft. Since you are using `Victory` charts for macro visualization, ensure the chart component is wrapped in `React.lazy()` or a `useMemo` block to prevent re-renders during text input in the draft panel.

### 4. Animation Strategy
*   **Strategy:** The plan mixes CSS keyframes and Framer Motion.
*   **Recommendation:** 
    *   **CSS Keyframes:** Use for simple, continuous loops (e.g., loading spinners, pulse effects on the "Today" command ribbon).
    *   **Framer Motion:** Use for layout transitions (e.g., the draft panel expanding/collapsing). 
    *   **Safety:** Ensure all animations are wrapped in `prefers-reduced-motion` media queries. Use `will-change: transform` for GPU acceleration on the mobile drawer transitions.

### 5. Responsive Patterns
*   **Approach:** The plan suggests a 3-column desktop layout collapsing to 1-column mobile.
*   **Recommendation:** Use a **CSS Grid** approach for the main workspace. 
    *   `grid-template-areas` allows you to reorder the "Capture Rail" and "Diary Timeline" easily across breakpoints without duplicating JSX.
    *   **Breakpoint Matrix:** Ensure the 414px (mobile) and 1440px (desktop) layouts are tested for the 44px touch target requirement.

### 6. Form Handling
*   **Strategy:** Controlled inputs are mandatory for the `NutritionEntryDraft` to ensure the "Truth Layer" remains synchronized.
*   **Debounce:** Debounce the `FoodSearch` input (300ms) to prevent excessive API calls to the backend proxy. Do **not** debounce the manual macro input fields; these require immediate feedback to ensure the user sees the "calculated vs. reported" discrepancy in real-time.

### 7. Lazy Boundaries
*   **Recommendation:** 
    *   `FoodScannerPage` (already lazy-loaded).
    *   `NutritionWorkspace` (already lazy-loaded).
    *   **New:** Lazy-load the `AdminReviewConsole` and `RecipeBuilder` components. They are heavy and only accessed by specific user roles or workflows.

### 8. Touch Gestures
*   **Recommendation:** Use `framer-motion`'s `usePanGesture` for the mobile "Diary Timeline" swipe-to-delete/edit actions. 
*   **Accessibility:** Ensure every gesture has a fallback UI control (e.g., a "..." menu button) that performs the same action, as gestures are not inherently screen-reader accessible.

---

### Implementation-Ready Recommendations (Must-Fix)

1.  **Backend Proxy (Security):** You **must** move USDA/OFF API calls to your Express backend. Exposing keys in `FoodSearchPanel.logic.ts` is a critical vulnerability.
2.  **Type-Safe Nutrient Panel:** Replace the `Record<string, number>` in `NutritionEntryDraft` with a strict interface:
    ```typescript
    interface NutrientPanel {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      // ... other core macros
      extra: Record<string, number>; // For non-standard nutrients
    }
    ```
3.  **Scanner Fix:** The `servingSizeGrams: 100` hardcode in `FoodScannerPage.tsx` is a frontend-only limitation. Update the UI to allow user-defined serving sizes; the backend already supports the math.
4.  **Sequelize Bug:** The silent data loss in `foodScannerRoutes.mjs` (writing non-existent fields to `FoodProduct`) must be fixed by explicitly mapping fields to `nutritionalInfo` or `overallRating` before the migration.
5.  **Trainer/Admin Identity:** Add `targetUserId` to the `NutritionEntryDraft` to support trainer-led logging. Ensure this is validated against the `clientId` in the route to prevent cross-account data leakage.

**Verdict:** **APPROVE WITH CHANGES.** Proceed with the implementation slices, prioritizing the **Backend Proxy** and **Type-Safe Nutrient Panel** before starting the UI convergence.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
