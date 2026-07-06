# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 6.3s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

This review evaluates the proposed component architecture against the "Fable Vision" brief and the established constraints of the SwanStudios platform.

### 1. Styled-components Organization
*   **Current Pattern:** The plan relies on `styled-components` with CSS custom properties.
*   **Recommendation:** Implement a **"Theme-Token-First"** architecture. Do not define colors in styled-components; define them in a `global-styles.ts` file using the `:root` selector for the 18 themes.
*   **Barrel Re-exports:** Use `index.ts` files for component directories to maintain clean imports, but **avoid deep nesting**. Limit to `components/FeatureName/index.ts` and `components/FeatureName/FeatureName.tsx`.
*   **Constraint:** Ensure every `styled-component` uses `var(--token-name, #fallback)` to satisfy the "never hardcode hex" rule.

### 2. Hook Composition
*   **Observation:** The plan suggests multiple custom hooks (`useExerciseSearch`, `useBootcampAPI`, etc.).
*   **Recommendation:** Avoid "Hook Hell" (nesting hooks inside hooks). Use a **Service-Layer pattern**:
    *   `hooks/` for UI-state (e.g., `useToggle`, `useBreakpoint`).
    *   `services/` for data-fetching and business logic (e.g., `workoutService.ts`).
    *   Keep components "thin": they should only call one or two hooks and pass data to presentational components.

### 3. Render Customization
*   **Performance:** Custom render maps (e.g., for the `ExerciseRolodex`) can cause re-renders if not memoized.
*   **Recommendation:** Use `React.memo` for list items in the Rolodex and `useCallback` for event handlers passed to child components. For the `ChartExpandModal`, ensure the chart component is lazily mounted only when the modal is open to prevent unnecessary SVG calculations in the background.

### 4. Animation Strategy
*   **Strategy:** The plan mixes `framer-motion` and CSS keyframes.
*   **Recommendation:** 
    *   **CSS Keyframes:** Use for simple, repetitive animations (e.g., the "Dual-Button Glow" pulse). It is more performant and GPU-safe.
    *   **Framer Motion:** Reserve for complex layout transitions (e.g., the mobile bottom-sheet sliding in, or the chart-to-fullscreen expansion).
    *   **Accessibility:** Always wrap animations in `prefers-reduced-motion` media queries.

### 5. Responsive Patterns
*   **Approach:** The plan suggests a mix of CSS and JS.
*   **Recommendation:** **CSS-first.** Use `styled-components` media queries (`@media (min-width: 768px)`) for layout shifts. Use JS only for conditional rendering (e.g., swapping a `Dropdown` for a `BottomSheet` on mobile). This keeps the DOM tree clean and avoids layout thrashing.

### 6. Form Handling
*   **Strategy:** Controlled vs. Uncontrolled.
*   **Recommendation:** 
    *   **Inputs:** Use **controlled components** for the Workout Logger to ensure the "offline queue" can sync state accurately.
    *   **Debounce:** Use a custom `useDebounce` hook for the `ExerciseRolodex` search input (300ms delay) to prevent excessive API calls to the backend.

### 7. Lazy Boundaries
*   **Recommendation:** Apply `React.lazy()` and `Suspense` to the following heavy routes/components:
    *   `ChartExpandModal` (only load when triggered).
    *   `WorkoutPlannerPage` (the 12-month builder).
    *   `NutritionWorkspace` (the 13-tab heavy interface).
    *   `AdminProgressChartsGrid` (only load for authorized staff).

### 8. Touch Gestures
*   **Strategy:** The plan mentions mobile gestures.
*   **Recommendation:** Use `react-use-gesture` (or `use-gesture`) combined with `framer-motion` for swipe-to-delete or bottom-sheet dismissals. 
*   **Accessibility:** Always provide a fallback "Close" button or "Delete" icon. Gestures should be an *enhancement*, not the *only* way to perform an action (WCAG requirement).

---

### Implementation-Ready Checklist for Worker-Bot:
1.  **Rebase:** Execute `git rebase origin/main` before creating any new files.
2.  **Schema Check:** Verify `WorkoutPlan` column mappings (Rule 58) before writing any DB-interacting code.
3.  **Palette Enforcement:** Run a grep search for `#` hex codes in new files; if found, replace with `var(--token, #fallback)`.
4.  **File Size:** If a component exceeds 250 lines, trigger an automatic extraction of logic into a `use[Feature]Logic.ts` hook.
5.  **Documentation:** Every new file must include the blueprint header (Author, Date, Purpose, Dependencies).
6.  **Testing:** Every slice must include a `[Feature].test.tsx` file that verifies the "empty state" and "populated state" rendering.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
