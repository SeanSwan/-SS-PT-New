# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 9.5s
> **Files:** docs/ai-workflow/AI-HANDOFF/MASTER-FIX-PLAN-2026-04-06.md
> **Generated:** 4/6/2026, 5:33:04 PM

---

This review evaluates your architecture against the **Crystalline Swan** design system requirements and React best practices.

### 1. Styled-components Organization
**Verdict: Recommended.**
Splitting `SwanCoachStyles.ts` into sub-files (e.g., `Layout.ts`, `Typography.ts`, `Buttons.ts`, `Animations.ts`, `Theme.ts`) is excellent for maintainability.
*   **Recommendation:** Use a `styles/index.ts` barrel file to re-export everything. Ensure you use **TypeScript module augmentation** if you are extending the `DefaultTheme` interface to ensure type safety across these files.
*   **Warning:** Avoid circular dependencies. Ensure `Theme.ts` (the tokens) is imported by the others, but never import the components back into `Theme.ts`.

### 2. Hook Composition
**Verdict: Nesting is acceptable, but consider a Context-based approach.**
`useCoachAssistant` -> `useAIChat` -> `useState` is a standard "Custom Hook Chain."
*   **Alternative:** If `useAIChat` state needs to be accessed by multiple components (e.g., a sidebar history and a main chat window), move the state into a `CoachChatProvider`. This prevents "prop drilling" and unnecessary re-renders of the parent component.
*   **Performance:** If you stick to hooks, ensure you use `useMemo` and `useCallback` for any objects/functions passed down to children to prevent the "re-render cascade."

### 3. Markdown Component Customization
**Verdict: Performance is negligible; DX is high.**
Mapping components in `react-markdown` is the standard way to handle custom styling.
*   **Performance:** The overhead of a component map is minimal compared to the DOM reconciliation of the rendered Markdown.
*   **Recommendation:** Memoize your `components` object outside the render function (or via `useMemo`) to prevent the Markdown parser from re-initializing the component map on every render.

### 4. Animation Strategy
**Verdict: Mixing is acceptable, but keep concerns separated.**
*   **Framer Motion:** Use for layout transitions, mounting/unmounting (`AnimatePresence`), and complex orchestration.
*   **CSS Keyframes:** Use for "infinite" or "background" loops (e.g., your thinking indicator).
*   **Rule:** Never animate the same property with both libraries simultaneously. Use CSS for performance-heavy, long-running animations to keep the main thread clear for React state updates.

### 5. Responsive Patterns
**Verdict: JS-driven for Drawer, CSS for Sidebar.**
*   **Desktop:** Use CSS Grid/Flexbox with a fixed `280px` width.
*   **Mobile:** Use a JS-controlled Drawer (e.g., `framer-motion` `AnimatePresence`).
*   **Approach:** Define a `useMediaQuery` hook that returns a boolean `isMobile`. Use this to conditionally render the `Sidebar` vs `Drawer`. Do not try to force a single component to handle both via CSS `display: none` if the DOM structure needs to change significantly (e.g., portal vs. inline).

### 6. Form Handling
**Verdict: Controlled for UI sync, Uncontrolled for performance.**
*   **Search Input:** Use **uncontrolled** with a `ref` or a debounced `onChange` handler. Do not trigger a re-render on every keystroke for a sidebar search.
*   **Conversation Input:** Use **controlled** components. You need the state to manage the "Send" button's disabled state and the auto-growing textarea height.
*   **Debounce:** Use `lodash.debounce` or a custom `useDebounce` hook for the search input to avoid hitting the API on every character.

### 7. Code Block Component
**Verdict: Lazy-load if the bundle size is large.**
*   **Recommendation:** If you are using `rehype-highlight` or `prismjs`, the syntax highlighting library can be heavy.
*   **Implementation:** Create a `CodeBlock` component and use `React.lazy` + `Suspense` if it’s only used in specific "Deep Dive" sections. If it’s used in every chat message, keep it bundled but ensure the highlighting logic is memoized.

### 8. Touch Gestures
**Verdict: Use a library.**
*   **Recommendation:** Do not write custom swipe-to-reveal logic in raw CSS/JS. It is notoriously difficult to get right (handling scroll vs. swipe, rubber-banding, etc.).
*   **Library:** Use `react-use-gesture` (or `@use-gesture/react`) combined with `framer-motion`. This is the industry standard for mobile-first React apps and will handle the "reveal" physics perfectly.

---

### Summary Checklist for Implementation
1.  **Barrel Exports:** Create `src/styles/index.ts` for your 5-file split.
2.  **Memoization:** Audit all `useCallback` and `useMemo` hooks in the `useCoachAssistant` chain.
3.  **CSS Tokens:** Ensure `design-tokens.css` is loaded globally to support the Crystalline Swan theme.
4.  **Touch Targets:** Ensure all buttons in the mobile drawer meet the `44px` minimum height requirement.
5.  **Error Boundaries:** Wrap the `react-markdown` renderer in a `TabErrorBoundary` to prevent a single malformed AI response from crashing the entire chat UI.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
