# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview | **Duration:** 6.1s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
> **Generated:** 7/21/2026, 9:14:47 PM

---

This review evaluates the **SwanGuard Refactor** and **SwanStudios Redesign** plans against the established technical constraints and the "Enchanted Apex" design language.

### 1. Styled-components Organization
*   **Assessment:** The current plan to move from a "TV Treehouse" skeuomorphic mess to a "Glass/Photography" layer system is sound. However, avoid the "one file per component" trap that leads to 300-line bloat.
*   **Recommendation:** Use a **Colocation + Theme-Token pattern**.
    *   **Barrel Exports:** Use `index.ts` for component folders, but keep `styles.ts` separate.
    *   **Tokenization:** Enforce `var(--color-*)` strictly. Create a `GlobalStyles.ts` that maps your palette (e.g., `--color-midnight-sapphire: #002060`) to ensure the 18-theme toggle works seamlessly.
    *   **Avoid:** Do not nest styled-components inside the component file if they exceed 50 lines. Move them to `ComponentName.styles.ts`.

### 2. Hook Composition
*   **Assessment:** The plan relies on `data-action-id` and `actionRegistry`. This is a risk for "prop drilling" if not handled via Context.
*   **Recommendation:** 
    *   Use a **Registry Provider** pattern. Wrap the app in an `ActionRegistryProvider` that exposes a `useAction()` hook.
    *   **Depth:** Keep hook nesting to a maximum of 2 levels (e.g., `useAction` -> `useAuth`). If you need more, you are likely missing a domain-specific state manager.

### 3. Render Customization
*   **Assessment:** The "Glass layer over photography" approach for the redesign is visually heavy.
*   **Recommendation:** Use `React.memo` on the background imagery components. Since these are "National Geographic" grade assets, they will be heavy. Ensure the `Canvas` or `img` elements are memoized to prevent re-renders during UI state changes (like opening a drawer or toggling a theme).

### 4. Animation Strategy
*   **Assessment:** The plan mentions "cinematic loops" and "glass layers."
*   **Recommendation:**
    *   **Framer Motion:** Use for layout transitions (e.g., the IA collapse from 14 modules to 5).
    *   **CSS Keyframes:** Use for the "Crystalline" subtle pulses or hover states.
    *   **GPU Safety:** Always use `will-change: transform` or `opacity` for animations. 
    *   **Accessibility:** Wrap all animations in `prefers-reduced-motion` media queries. If the user requests reduced motion, kill the cinematic loops and replace them with static high-quality stills.

### 5. Responsive Patterns
*   **Assessment:** The plan correctly identifies the need to kill the "Compass" on desktop.
*   **Recommendation:**
    *   **Breakpoint Strategy:** Use a `theme.breakpoints` object in styled-components.
    *   **Logic:** Use `(hover: hover) and (pointer: fine)` for gesture logic, but use standard `min-width` media queries for layout shifts. Never mix these; keep interaction logic and layout logic distinct.

### 6. Form Handling
*   **Assessment:** The plan moves toward a "calm" UI.
*   **Recommendation:** 
    *   **Controlled vs Uncontrolled:** Use `react-hook-form` for all forms. It is the industry standard for performance. 
    *   **Debounce:** For the `⌘K` palette or search inputs, use `lodash.debounce` with a 300ms delay to prevent excessive API calls to the Sequelize backend.

### 7. Lazy Boundaries
*   **Assessment:** The "14 modules" collapse is the perfect opportunity for code splitting.
*   **Recommendation:** Use `React.lazy()` for the 5 new spaces (Today, Intelligence, Family, Hermes, Settings). Each should be its own chunk. The `Owner Console` (now in Settings) should be behind a dynamic import to keep the main bundle lean.

### 8. Touch Gestures
*   **Assessment:** The plan correctly identifies the need for mobile-first swipe controls.
*   **Recommendation:**
    *   **Library:** Use `@use-gesture/react` + `framer-motion`. It is the most robust way to handle "swipe-to-dismiss" and "hold-to-confirm" without reinventing the wheel.
    *   **Accessibility:** Ensure every gesture has a fallback. If a user swipes to dismiss a card, there must be a visible "X" or "Close" button that performs the same action for screen reader users.

### Summary Checklist for Implementation
1.  **Clean State:** Ensure `c0045c8` is clean before starting S1.
2.  **Token Audit:** Replace all hardcoded hexes with `var(--*)` before the visual reskin (S4).
3.  **Action Diet:** Audit `data-action-id` usage; if it exceeds 60, the refactor is failing the "Action Diet" requirement.
4.  **Photography:** Ensure all hero assets are served via R2 with `loading="eager"` for the hero and `loading="lazy"` for everything else.

**Next Step:** Await Sean's GO on the AI Village run to validate the `action-registry` consolidation logic.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
