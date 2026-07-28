# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 6.6s
> **Files:** docs/ai-workflow/brainstorms/user-dashboard-redesign-PLAN-for-village-2026-07-08.md
> **Generated:** 7/8/2026, 2:04:02 AM

---

This review evaluates the **User Dashboard Redesign (Village 2026-07-08)** against the SwanStudios production constraints.

### 1. Styled-components Organization
*   **Recommendation:** Adopt a **Colocation-First** pattern. Given the 300-line file limit, avoid a monolithic `styles.ts`. Instead, use `Component.styles.ts` for complex components (e.g., `ApexHeader`) and inline `styled` definitions for simple ones.
*   **Barrel Re-exports:** Use `index.ts` files for component folders, but **strictly avoid** re-exporting theme tokens from component barrels. Keep `theme/tokens.ts` as the single source of truth to prevent circular dependencies.
*   **Risk:** Ensure `var(--token, #fallback)` is applied at the `ThemeProvider` level or via a GlobalStyle to ensure the 18-theme swap remains performant without re-rendering the entire tree.

### 2. Hook Composition
*   **Recommendation:** The plan requires a `useDashboardData` hook to aggregate the 6-surface IA. **Avoid deep nesting.** Use a "Data Provider" pattern at the `UserDashboard` root to fetch the core loop data (rings, Guide’s Note, feed), then use specialized hooks (`useWorkoutRings`, `useFeedFilter`) to consume context.
*   **Alternative:** Use `TanStack Query` for the feed and coaching notes to handle caching/loading states, keeping the component logic focused on UI state.

### 3. Render Customization
*   **Recommendation:** For the "Aurora Bloom" and "Ascension Rings," use `React.memo` with custom comparison functions.
*   **Performance:** Since you are avoiding Three.js, use **CSS Custom Properties** to drive the animation state. Update the `--progress-value` variable via `useRef` or a direct DOM ref to avoid triggering React re-renders during high-frequency animation frames.

### 4. Animation Strategy
*   **Recommendation:** **Strict Hybrid.**
    *   **Framer Motion:** Use for layout transitions (nav switching, feed reordering) where `layoutId` is required for smooth UX.
    *   **CSS Keyframes:** Use for the "Aurora Bloom" and ring fills.
*   **GPU Safety:** Ensure all animations use `transform` and `opacity`. The "Aurora Bloom" must use `will-change: transform` and be wrapped in a `prefers-reduced-motion` media query that disables the elastic/particle effects, defaulting to a simple CSS transition.

### 5. Responsive Patterns
*   **Recommendation:** Use a **Mobile-First CSS Grid/Flexbox approach.**
    *   **Breakpoint Matrix:** Define `const breakpoints = { mobile: '320px', tablet: '768px', desktop: '1024px' }`.
    *   **Pattern:** Use `styled-components` media query helpers. Avoid JS-based window resizing logic; rely on CSS `clamp()` for typography and fluid spacing to minimize layout shifts.

### 6. Form Handling
*   **Recommendation:** For the "Quick Post" and "Guide's Note" authoring, use **uncontrolled inputs with `useRef`** for simple text, and `react-hook-form` for complex validation.
*   **Debounce:** Implement a 300ms debounce on the `FeedFilterBar` to prevent excessive API calls when toggling hashtags.

### 7. Lazy Boundaries
*   **Recommendation:** Wrap the following in `React.lazy()` + `Suspense`:
    *   `CommunityFeed` (Heavy DOM).
    *   `VictoryChart` components (Heavy library weight).
    *   `ChallengeBoard` (Complex state).
*   **Strategy:** Place the `ApexHeader` and `Guide's Note` in the main bundle for immediate LCP (Largest Contentful Paint).

### 8. Touch Gestures
*   **Recommendation:** Use **`react-use-gesture` (or `@use-gesture/react`)** for the mobile bottom nav and feed swiping.
*   **Accessibility:** Ensure all gesture-based actions have a redundant UI trigger (e.g., a "Like" button in addition to a swipe-to-like gesture). Ensure the 44px touch target rule is enforced via `padding` on the hit-box, not just the visual icon.

---

### Critical Village Resolutions (D-A to D-D)
*   **D-A (Right Rail):** **Delete entirely.** Move "Next Action" to the `ApexHeader` CTA and "SwanFam-Active" to a small, non-intrusive horizontal scroll at the top of the `Community` tab. This preserves the "Coaching-First" focus.
*   **D-B (Signature FX):** **CSS-only.** Use a `conic-gradient` for the rings and a `radial-gradient` for the Aurora Bloom. This is GPU-safe and renders natively.
*   **D-C (Social Lean):** **The "Proof" Rule.** Only allow social interactions that are tied to a `WorkoutID`. If it isn't a "Proof" or "Win," it doesn't belong in the feed.
*   **D-D (Scope):** **Phase-1 Home-only.** Do not touch the other 5 tabs until the Home "Core Loop" is validated by the metrics.

### Accessibility Note (WCAG 4.5:1)
*   **Rings:** You must include a hidden `aria-label` or a visible text overlay (e.g., "80% of weekly goal") for the rings. Color-only encoding is a violation. Use a high-contrast border for the rings against the `Obsidian Black` background.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
