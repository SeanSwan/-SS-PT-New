# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 6.6s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

This review evaluates the proposed architecture against the **Enchanted Apex: Crystalline Swan** design system and the **Jarvis Swan OS** mission.

### 1. Styled-components Organization
The plan’s reliance on `LensPlanFrame` and capability manifests is the correct architectural choice.
*   **Recommendation:** Move away from monolithic `styles.ts` files. Adopt a **"Colocation-by-Feature"** pattern:
    *   `Component.tsx`
    *   `Component.styles.ts` (styled-components only)
    *   `Component.types.ts`
    *   `index.ts` (barrel export)
*   **Risk:** Avoid "prop-drilling" themes. Since you have 18 themes, use a `ThemeProvider` at the root that maps your 18 themes to the CSS custom properties defined in your global `GlobalStyles.ts`. Never use `props.theme.color` inside styled-components; use `var(--color-name)`.

### 2. Hook Composition
The plan references `lens2-*` hooks.
*   **Recommendation:** Ensure hooks are strictly separated by concern:
    *   `useLens()`: Handles the registry and current active recipe.
    *   `useDeviceMatrix()`: Handles responsive logic (breakpoints).
    *   `useCoachState()`: Handles the Jarvis/Aurora Bridge state.
*   **Depth:** Keep nesting to a maximum of 2 levels. If a hook requires more, it is likely a "Service" that should be extracted into a standalone utility function outside the React lifecycle.

### 3. Render Customization
The `LensPlanFrame` is the critical boundary.
*   **Performance:** To avoid re-renders when switching themes, ensure the `LensPlanFrame` uses `React.memo` and that the theme context is memoized.
*   **Cost:** The cost of dynamic CSS variable injection is negligible compared to DOM thrashing. Ensure the `LensPlanFrame` does not trigger a full-tree re-render when a lens is applied; use a CSS-variable-only update strategy where possible.

### 4. Animation Strategy
*   **Strategy:** Use **Framer Motion** for layout transitions (e.g., Coach chat bubbles, dashboard card pinning) and **CSS Keyframes** for micro-interactions (e.g., button glows, loading pulses).
*   **GPU Safety:** All animations must use `transform` and `opacity` only.
*   **Reduced Motion:** Wrap all `framer-motion` components in a check for `prefers-reduced-motion`. If enabled, set `transition={{ duration: 0 }}`.

### 5. Responsive Patterns
*   **Approach:** The `device-matrix` is your source of truth.
*   **Recommendation:** Use a **"Mobile-First + Container Queries"** approach. Since you have 30+ phone targets, media queries alone will become unmanageable. Use `container-type: inline-size` for complex surfaces (like the Workout Logger) so components adapt to their parent container rather than the viewport width.

### 6. Form Handling
*   **Strategy:** Use **Controlled Components** for the Workout Logger (real-time validation is critical for coaching trust).
*   **Debounce:** Use `lodash/debounce` for the Coach chat input and any search-based rolodex inputs.
*   **Accessibility:** Every input must have an explicit `aria-label` or `aria-labelledby` pointing to a visible label, especially for the 44px touch target requirement.

### 7. Lazy Boundaries
*   **Implementation:** Wrap the following in `React.lazy()` + `Suspense`:
    *   `SwanWorld` (The 3D scene is heavy).
    *   `ChartCharter` (Victory charts are resource-intensive).
    *   `AdminDashboard` (Only load when the user role is `ADMIN`).
*   **Boundary:** Place `ErrorBoundary` components around these lazy chunks to ensure a failed chart load doesn't crash the entire workout logger.

### 8. Touch Gestures
*   **Strategy:** Avoid heavy gesture libraries where possible. Use **CSS `touch-action`** properties to prevent browser-default scrolling during active workout logging.
*   **Accessibility:** For custom gestures (e.g., swipe-to-delete in the planner), **always provide a fallback button**. Never hide core functionality behind a gesture-only interaction.

---

### Validator Summary (Per §4/§5/§6)

*   **(a) P0 List:** The list is sound. **Missing:** An "Empty State" library. Since you are building a SaaS, the "first-run" experience (when a user has no workouts) is the biggest churn risk. Add a "Zero-State" design pass to the P0 list.
*   **(b) Workstream Risks:** The "Agent Gateway" is a scope trap. Keep the gateway as a **read-only API** initially. Do not allow external agents to write to the database until the "Review-Gate" (T0–T4) is battle-tested.
*   **(c) Polished Additions:** Add a **"Trust Moment"** to the Workout Logger: a subtle "Data Saved" indicator that uses the `Gilded Fern` gold color to signal success.
*   **(d) Sequencing:** The sequence is correct. Revenue-first (Workout Logger) ensures the platform pays for its own development.
*   **(e) Guardrails:** The token budget dashboard for Jarvis is excellent. Ensure this is visible to the Admin, not just the system logs.
*   **(f) Plan Pack Format:** To prevent drift, every pack must include a **"Forbidden Choices"** list (e.g., "No hardcoded hexes," "No MUI," "No Galaxy-Swan theme"). This acts as a negative constraint that keeps AI agents within the Fable vision.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
