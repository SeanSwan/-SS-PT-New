# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 7.8s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-FORMAT-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 12:37:07 PM

---

This review evaluates your architecture against the high-performance requirements of the **Enchanted Apex** design system.

### 1. Styled-components Organization
**Verdict:** 5 files + barrel export is **over-engineering** for a single feature set.
*   **Recommendation:** Use a **Colocation Pattern**. Keep styles in `[ComponentName].styles.ts` next to the component.
*   **Why:** Barrel files create "dependency hell" and make IDE "Go to Definition" harder. If you have shared tokens (Midnight Sapphire, etc.), put those in a `styles/theme.ts` file. Only extract styles if they are truly reused across >3 distinct components.

### 2. Hook Composition
**Verdict:** `useCoachAssistant > useAIChat > useState` is **standard but risky** if not memoized.
*   **Recommendation:** Use a **Context Provider** for the AI state instead of deep nesting.
*   **Implementation:** Create `CoachProvider`. This allows any component (Sidebar, Chat, Builder) to access the state without prop-drilling or deep hook nesting. Use `useReducer` inside the provider to handle complex state transitions (e.g., "thinking" -> "streaming" -> "idle").

### 3. Markdown Component Customization
**Verdict:** Performance is negligible, but **maintainability** is the concern.
*   **Recommendation:** Use a `components` map object passed to `ReactMarkdown`.
*   **Implementation:**
    ```tsx
    const markdownComponents = {
      code: ({ node, inline, className, children, ...props }) => (
        <CodeBlock className={className} {...props}>{children}</CodeBlock>
      ),
      table: ({ children }) => <StyledTable>{children}</StyledTable>
    };
    ```
*   **Performance:** The overhead of the map is micro-seconds. The real performance hit is the *rendering* of the children. Ensure `CodeBlock` is memoized with `React.memo`.

### 4. Animation Strategy
**Verdict:** **Mixing libraries is a "code smell."**
*   **Recommendation:** Standardize on **Framer Motion**.
*   **Why:** CSS keyframes are hard to coordinate with React lifecycle events (e.g., waiting for a sidebar to finish closing before unmounting). Framer Motion’s `AnimatePresence` handles the exit lifecycle natively. Use `variants` to keep your "Thinking" indicator and "Sidebar" animations consistent with the *Crystalline Swan* aesthetic.

### 5. Responsive Patterns
**Verdict:** **CSS-in-JS (Styled-components) is superior here.**
*   **Recommendation:** Use CSS Media Queries within your styled-components.
*   **Implementation:** Avoid JS `window.innerWidth` listeners (they cause re-renders). Use a `SidebarContainer` with `display: none` on mobile and a `Drawer` component that triggers via a boolean state. This keeps the layout logic in the CSS layer where it belongs.

### 6. Form Handling
**Verdict:** Use **Uncontrolled inputs with `useRef`** for search, **Controlled** for conversation.
*   **Recommendation:** 
    *   **Search:** Uncontrolled + `lodash.debounce`. Don't re-render the whole sidebar on every keystroke.
    *   **Conversation:** Controlled. You need the state to sync with the AI coach immediately.
    *   **Debounce:** Use a custom `useDebounce` hook to prevent API spamming during rapid typing.

### 7. Code Block Component
**Verdict:** **Yes, lazy-load it.**
*   **Recommendation:** Use `React.lazy` and `Suspense` for the syntax highlighter (e.g., `prismjs` or `shiki`).
*   **Why:** Syntax highlighting libraries are heavy. You don't want to load them until the user actually generates a code block in the chat.

### 8. Touch Gestures
**Verdict:** **Do not build this from scratch.**
*   **Recommendation:** Use `framer-motion`'s `drag` and `onDragEnd` props.
*   **Implementation:** 
    ```tsx
    <motion.div 
      drag="x" 
      dragConstraints={{ left: -100, right: 0 }}
      onDragEnd={(_, info) => { if (info.offset.x < -50) handleReveal(); }}
    />
    ```
*   **Why:** It handles the physics, momentum, and touch-event cancellation much better than raw CSS or custom JS listeners.

---

### Strategic Advice for the Bootcamp Plan
*   **The "Unilateral" Math:** Do not calculate this in the frontend. Add a `calculateDuration()` method to your `backend/services/bootcamp/bootcampGenerator.mjs`. The frontend should simply consume a `totalDuration` field provided by the API.
*   **Validation:** Since you are dealing with wealthy clients (golf/professionals), **UX precision is your differentiator.** Add a "Validation Layer" in your `ConfigPanel` that highlights the "Timing Preview" in **Red** if the selected format exceeds the 55-minute window.
*   **Data Structure:** Ensure your `FORMAT_CONFIG` in the backend is the *Source of Truth*. The frontend should fetch this on mount to ensure the UI always matches the generation logic.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
