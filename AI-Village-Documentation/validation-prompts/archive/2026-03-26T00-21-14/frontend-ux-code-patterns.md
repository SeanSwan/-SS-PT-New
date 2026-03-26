# Frontend UX & Code Patterns — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 5.7s
> **Files:** docs/ai-workflow/blueprints/CLIENT-DETAIL-WIRING-BLUEPRINT.md
> **Generated:** 3/25/2026, 5:21:14 PM

---

This review evaluates the `CLIENT-DETAIL-WIRING-BLUEPRINT.md` against the SwanStudios design system and technical architecture.

### 1. React Component Patterns
*   **Finding:** The plan to decompose monoliths (e.g., `WorkoutPlanBuilder` from 1,457 to ~200 lines) is **CRITICAL**. The current structure violates the Single Responsibility Principle and will lead to massive re-renders.
*   **Recommendation:** Ensure the `index.tsx` for each feature uses a **State Machine (XState or `useReducer`)** rather than prop-drilling to manage the complex transitions between "Draft," "Approval," and "Active" states.
*   **Rating:** **HIGH**

### 2. styled-components Best Practices
*   **Finding:** The design tokens are well-defined, but the "Bento Grid" implementation risks becoming a "CSS-in-JS" nightmare if not abstracted.
*   **Recommendation:** Create a `BentoGrid` and `BentoCard` component library using `styled-components` with transient props (e.g., `$colSpan`) to handle the 12-column logic. Avoid inline styles for grid-template-columns.
*   **Rating:** **MEDIUM**

### 3. Animation & Interaction
*   **Finding:** The "Expansion to full-view overlay" for Biometrics cards is specified as CSS-only, while sub-tabs use Framer Motion. This creates a disjointed UX.
*   **Recommendation:** Use `framer-motion`'s `layoutId` prop for the card expansions. This allows the card to "morph" into the full-screen view seamlessly, maintaining the "Enchanted" feel. Ensure `reduced-motion` media queries are implemented to disable these transitions for accessibility.
*   **Rating:** **MEDIUM**

### 4. Form UX
*   **Finding:** The `PainPhotoCapture` workflow is a multi-step process.
*   **Recommendation:** Ensure the "Capture" button has a clear `aria-label` and that the camera/file input is hidden but accessible via a custom-styled label. Provide immediate visual feedback (e.g., a skeleton loader or progress ring) during the AI vision analysis phase to prevent "dead-air" UX.
*   **Rating:** **HIGH**

### 5. State Management
*   **Finding:** The blueprint mentions "WorkoutLogger state loss on tab switch."
*   **Recommendation:** Do not use `sessionStorage` for active workout state. Use a **React Context Provider** scoped to the `ClientDetailView` or a persistent store like `Zustand`. This ensures that if a trainer switches from "Training" to "Biometrics" and back, the active session timer and logged sets remain intact.
*   **Rating:** **CRITICAL**

### 6. Accessibility Gaps
*   **Finding:** The AI Command Bar uses `Ctrl+K` and keyboard shortcuts, but there is no mention of focus management.
*   **Recommendation:** 
    *   **Focus Trapping:** When the AI Command Bar expands (especially on mobile), ensure focus is trapped within the modal/panel.
    *   **Color Indicators:** The blueprint mentions "Arctic Cyan" for data. Ensure that charts also use patterns or high-contrast labels, as color-only indicators fail WCAG 2.1 success criteria for color blindness.
    *   **Skip Navigation:** Ensure a "Skip to Content" link is present, especially since the new sidebar/command bar structure adds significant navigation overhead.
*   **Rating:** **HIGH**

---

### Summary of Action Items for Development:

1.  **Refactor Strategy:** Prioritize the `WorkoutPlanBuilder` decomposition before wiring the `ClientDetailView` to avoid "dependency hell."
2.  **State Persistence:** Implement a `ClientSessionProvider` (Zustand) to handle the cross-tab state of the `WorkoutLogger`.
3.  **Accessibility:** Add `aria-live="polite"` to the AI Command Bar response area so screen readers announce AI output.
4.  **Theme Enforcement:** Strictly enforce the `Gilded Fern` and `Ice Wing` tokens via a `ThemeProvider` wrapper to prevent "theme drift" during the refactor.

**Overall Status:** The blueprint is technically sound and aligns with the *Crystalline Swan* aesthetic. The shift from a floating FAB to an embedded terminal is a significant UX improvement. Proceed to Phase 1.

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
