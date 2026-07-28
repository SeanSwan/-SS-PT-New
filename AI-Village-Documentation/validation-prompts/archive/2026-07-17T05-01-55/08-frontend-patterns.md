# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview | **Duration:** 6.5s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md
> **Generated:** 7/16/2026, 10:01:55 PM

---

This review evaluates the **VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16** against the SwanStudios technical constraints.

### 1. Styled-components Organization
*   **Recommendation:** Adopt a `styles/` directory structure using **Barrel Exports** (`index.ts`) for tokens and shared primitives, but keep component-specific styles colocated in the same folder as the component (e.g., `Button.tsx`, `Button.styles.ts`).
*   **Constraint Check:** Ensure all `styled-components` files import from a centralized `theme/tokens.ts` that maps to CSS custom properties. **Never** use hardcoded hexes in the `styled` definitions.
*   **Risk:** Avoid "Theme-Hell" by ensuring the 18 themes are handled via a single `ThemeProvider` context that toggles a data-attribute on the `<body>` tag, allowing CSS variables to swap instantly without re-rendering the entire React tree.

### 2. Hook Composition
*   **Recommendation:** Use a "Feature-Hook" pattern. For the coaching loop, create a `useCoachingLoop` hook that aggregates `useWorkoutData`, `useMilestoneTracking`, and `useSwanCoach`.
*   **Depth:** Keep nesting to a maximum of 2 levels. If a hook requires more, it is likely doing too much; split it into a `useData` (fetching) and `useLogic` (transformation) pair.
*   **Performance:** Use `useMemo` and `useCallback` aggressively for any data passed into the `Victory` charts to prevent unnecessary re-renders during dashboard interactions.

### 3. Render Customization
*   **Recommendation:** For the "Evidence Lens" or "Facet-Plane" overlays, use **Render Props** or **Slot-based composition** rather than deep prop-drilling.
*   **Performance:** Avoid `cloneElement`. Use a `Composition` pattern where the parent component accepts a `renderEvidence` prop. This keeps the DOM tree shallow and minimizes reconciliation overhead.

### 4. Animation Strategy
*   **Recommendation:** Use **Framer Motion** for layout transitions (e.g., dashboard tab switching) and **CSS Keyframes** for persistent, low-cost animations (e.g., the "Glow" pulse).
*   **GPU-Safety:** Ensure all animations target `transform` and `opacity`. Never animate `top`/`left` or `box-shadow` (use `filter: drop-shadow` for performance).
*   **Accessibility:** Wrap all motion in a `prefers-reduced-motion` media query check. If enabled, set `transition: none !important` globally.

### 5. Responsive Patterns
*   **Recommendation:** Use a **Mobile-First CSS Grid/Flexbox** approach. Avoid JS-based window-resize listeners for layout.
*   **Breakpoint Matrix:** Define tokens for `mobile`, `tablet`, `desktop`, and `ultrawide`. Use `styled-components` mixins to keep the breakpoint logic DRY.

### 6. Form Handling
*   **Recommendation:** Use **Uncontrolled components** with `useRef` for high-frequency inputs (e.g., workout logging) to prevent re-renders on every keystroke. Use `react-hook-form` for complex validation.
*   **Debounce:** Implement a custom `useDebounce` hook for any search or filter inputs that trigger API calls to the Node.js backend.

### 7. Lazy Boundaries
*   **Recommendation:** Wrap the following in `React.lazy()` and `Suspense`:
    *   `Victory` chart heavy-dashboards (load only when the user navigates to "Progress").
    *   The `Store` and `Waiver` flows (these are distinct from the core coaching loop).
    *   The `Admin` dashboard (only load for authorized roles).

### 8. Touch Gestures
*   **Recommendation:** Use **`react-use-gesture`** for complex interactions (swiping through workout sets).
*   **Accessibility:** Ensure every gesture has a fallback "Click" target. If a user swipes to delete a workout, there must be a visible "Delete" button that performs the same action, meeting the 44px touch target requirement.

---

### Ratification Summary (The Plan)

*   **(a) Site-wide Verdict:** **Swan Deep Field.** It aligns with the "Webb Evidence" preference and provides the most distinct brand identity. The "Amber Warming Layer" is the critical mitigation for the "Space Coldness" risk.
*   **(b) Dashboard Verdict:** **Faceted Sigil.** The "Deep Field" is too distracting for a 40-hour/week coaching interface. **Reconciliation:** Use the "Deep Field" background for marketing, but transition to the "Faceted Sigil" (cleaner, high-contrast, structural) for all dashboard surfaces to ensure trainer speed.
*   **(c) Steal-list:** 1. **Evidence Lens** (from Deep Field) for progress metrics. 2. **Floor-rail section nav** (from Chrome Sovereign) for dashboard organization. 3. **Facet-chrome** (from Faceted Sigil) for all UI panels.
*   **(d) Failure Modes:**
    1. **Data-Density Fatigue:** If the "Evidence Lens" is overused, it loses meaning. *Mitigation:* Limit to exactly one lens per screen.
    2. **Mobile Performance:** Deep Field assets (stars/gradients) may lag on low-end devices. *Mitigation:* Serve simplified CSS-only gradients on mobile; reserve high-fidelity assets for desktop.
    3. **Amber Layer Inconsistency:** If the warming layer is applied inconsistently, the site will look "dirty." *Mitigation:* Define a global `var(--warm-layer)` token that is applied via a single overlay component.
*   **(e) Rollout Order:** **Track A (Marketing) → Track C (Store/Waiver) → Track B (Dashboards).** Revenue-generating flows (Store/Waiver) should take precedence over internal dashboard reskinning to ensure the business core is funded.
*   **(f) Absence-first Gap:** The plan lacks a **"State Recovery" strategy**. If a trainer is mid-log and the browser refreshes, the "Deep Field" atmosphere might reload, causing a jarring transition. Need a `PersistGate` or similar mechanism to cache the current coaching state.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
