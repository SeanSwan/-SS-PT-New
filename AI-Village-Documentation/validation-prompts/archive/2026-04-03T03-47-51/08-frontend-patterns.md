# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 9.0s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

This architectural review focuses on maintaining the "Crystalline Swan" aesthetic while ensuring the technical debt remains low as you scale the AI-driven onboarding flow.

### 1. Styled-components Organization
**Recommendation:** Use the 5-file split with a `index.ts` barrel export.
*   **Why:** It prevents the "Mega-File" anti-pattern. Given your theme (Midnight Sapphire, Royal Depth, etc.), grouping by concern (e.g., `Layout.ts`, `Typography.ts`, `Interactive.ts`, `Animations.ts`, `ThemeVariables.ts`) is excellent for maintainability.
*   **Caveat:** Ensure your `index.ts` uses `export * from './...'` to keep imports clean. Avoid circular dependencies by ensuring these files only depend on a `Theme.ts` constants file, never on each other.

### 2. Hook Composition
**Recommendation:** Use a **Custom Hook Factory** or a **Context Provider** instead of deep nesting.
*   **The Issue:** `useCoachAssistant(useAIChat(useState))` creates a "wrapper hell" that makes debugging state transitions difficult.
*   **Better Approach:** Use a `CoachProvider` (React Context) to hold the chat state and AI logic.
    ```typescript
    // Instead of nesting, consume the context
    const { sendMessage, chatHistory } = useCoach(); 
    ```
*   This flattens the component tree and allows any component (Sidebar, ChatWindow, TeachMode) to access the AI state without prop-drilling.

### 3. Markdown Component Customization
**Recommendation:** Use a memoized component map.
*   **Performance:** `react-markdown` is efficient, but re-creating the `components` object on every render will cause unnecessary re-renders of the entire chat history.
*   **Implementation:**
    ```typescript
    const components = useMemo(() => ({
      code: CodeBlock,
      table: CustomTable,
      a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />
    }), []);
    // Pass this memoized object to <ReactMarkdown components={components} />
    ```

### 4. Animation Strategy
**Recommendation:** Standardize on `framer-motion`.
*   **Why:** Mixing CSS keyframes and `framer-motion` leads to "layout thrashing" and inconsistent timing.
*   **Implementation:** Use `framer-motion` for the thinking indicator as well. It allows you to sync the "glow" intensity with the AI's state (e.g., `animate={{ opacity: [0.5, 1, 0.5] }}`), which is much smoother than CSS keyframes.

### 5. Responsive Patterns
**Recommendation:** JS-driven `useMediaQuery` for the Sidebar/Drawer.
*   **Why:** Since you have a fixed 280px desktop sidebar, you need to conditionally render a `Drawer` (MUI or custom) on mobile and a `Sidebar` on desktop.
*   **Approach:** Use a `LayoutProvider` that detects the breakpoint and toggles the `isMobile` state. This allows you to swap the component entirely, which is cleaner than trying to force a desktop sidebar to behave like a mobile drawer via CSS.

### 6. Form Handling
**Recommendation:** Controlled inputs with `react-hook-form` + `zod` validation.
*   **Why:** You have 85+ fields in the onboarding questionnaire. Uncontrolled inputs will become a nightmare to sync with your AI pre-fill logic.
*   **Debounce:** Use `useDebounce` from `use-debounce` for the search input in the sidebar, but for the onboarding form, use `handleSubmit` to trigger the backend update only on section completion or "Save" clicks to minimize API traffic.

### 7. Code Block Component
**Recommendation:** Yes, lazy-load it.
*   **Why:** `rehype-highlight` adds significant bundle weight.
*   **Implementation:** Use `React.lazy` and `Suspense` for the `CodeBlock` component. Since users won't see code blocks in every message, this keeps the initial load of the chat interface snappy.

### 8. Touch Gestures
**Recommendation:** Use `framer-motion`'s `drag` constraints.
*   **Why:** CSS-only swipe is possible but lacks the "spring" physics required for a premium SaaS feel.
*   **Implementation:** Wrap your `ConversationItem` in a `motion.div` with `drag="x"` and `dragConstraints={{ left: -100, right: 0 }}`. This provides the native-app feel your wealthy golf clients expect.

---

### Implementation-Ready Recommendations Summary

| Feature | Recommendation |
| :--- | :--- |
| **State** | Move `useAIChat` logic into a `CoachProvider` Context. |
| **Markdown** | Memoize the `components` object to prevent re-renders. |
| **Animations** | Standardize on `framer-motion` for all UI transitions. |
| **Forms** | Use `react-hook-form` for the 85-field questionnaire. |
| **Code Blocks** | Lazy-load `rehype-highlight` components. |
| **Gestures** | Use `framer-motion` `drag` for swipe-to-reveal actions. |

**Strategic Note:** For the "Teach Me" system, trigger it on the **first click** of a chip. Use `localStorage` to persist the "seen" state so power users aren't annoyed by repeated tooltips. Ensure the "Glowing" animation uses `will-change: transform` to keep the GPU load minimal.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
