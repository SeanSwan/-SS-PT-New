# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 6.4s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 9:33:09 PM

---

This is a robust architectural plan. Transitioning from a monolithic structure to a domain-driven, modular design is the correct move for a SaaS platform of this complexity.

Here is the technical review and implementation-ready recommendations for your 8-point architecture plan.

---

### 1. Styled-components Organization
*   **Recommendation:** **Keep the 5-file split, but use a "Theme-Injection" pattern.**
*   **Why:** Barrel re-exports are standard, but ensure you aren't just exporting raw components. Export a `Styled` object or specific sub-components (e.g., `Bootcamp.Card`, `Bootcamp.Layout`).
*   **Avoid:** Importing individual files directly from other components. Always import from the barrel file (`index.ts`) to maintain a clean API surface.

### 2. Hook Composition
*   **Recommendation:** **Flatten the nesting using a "Controller" pattern.**
*   **Why:** `useCoachAssistant(useAIChat(useState))` creates a "prop-drilling" nightmare for state updates.
*   **Alternative:** Create a `BootcampProvider` (Context API) that holds the state.
    *   `useBootcampState()`: Accesses the context.
    *   `useCoachAssistant()`: A standalone hook that consumes the context and exposes methods like `applySuggestion(suggestion)`.
    *   This keeps your components clean and avoids deep hook nesting.

### 3. Markdown Component Customization
*   **Recommendation:** **Memoize the component map.**
*   **Why:** If the map is defined inside the render function, React will re-create it on every render, causing child components to unmount/remount.
*   **Implementation:**
    ```tsx
    const components = useMemo(() => ({
      code: CodeBlock,
      table: CustomTable,
      a: CustomLink
    }), []);
    // ...
    <ReactMarkdown components={components}>{content}</ReactMarkdown>
    ```

### 4. Animation Strategy
*   **Recommendation:** **Standardize on Framer Motion.**
*   **Why:** Mixing CSS keyframes and Framer Motion creates "layout thrashing" and makes it difficult to synchronize exit animations (`AnimatePresence`).
*   **Implementation:** Use Framer Motion for *everything* (sidebar, thinking indicators, list reordering). It handles the layout transitions (FLIP animation) for your station cards much better than CSS keyframes.

### 5. Responsive Patterns
*   **Recommendation:** **JS-based Media Queries (`useMediaQuery`).**
*   **Why:** Since you are using `styled-components`, you can use the `theme` object for breakpoints, but for the **Sidebar vs. Drawer** logic, use a custom hook.
*   **Logic:** If `isMobile`, render `Drawer` (Portal); if `isDesktop`, render `Sidebar` (Static). Do not try to make one component "morph" via CSS; it leads to accessibility issues with focus management.

### 6. Form Handling
*   **Recommendation:** **Uncontrolled with `useRef` for search; Controlled for complex forms.**
*   **Why:** For a sidebar search, controlled inputs cause unnecessary re-renders of the entire list. Use `useRef` + `debounce` for search. For the `BootcampBuilder` (where state needs to be synced with the AI), use `react-hook-form` with `zod` validation.

### 7. Code Block Component
*   **Recommendation:** **Yes, lazy-load it.**
*   **Why:** `rehype-highlight` is heavy.
*   **Implementation:** Use `React.lazy` and `Suspense`.
    ```tsx
    const CodeBlock = React.lazy(() => import('./CodeBlock'));
    // Wrap in Suspense with a skeleton loader.
    ```

### 8. Touch Gestures
*   **Recommendation:** **Use `framer-motion` `drag` constraints.**
*   **Why:** Don't write custom touch handlers. Framer Motion’s `drag="x"` with `dragConstraints` and `onDragEnd` is perfect for "swipe-to-reveal" actions. It’s performant, handles momentum, and integrates with your existing animation library.

---

### Critical Architectural Advice for Sean (The Trainer)

1.  **The "Flow Optimizer" (Phase 2):** Since this is your #1 priority, ensure the `setupTimeSec` is a **hard constraint** in the AI prompt. If the AI generates a sequence that violates the "no-wait" rule, the `bootcampFlowOptimizer.mjs` should automatically trigger a "re-shuffle" before the UI even renders.
2.  **The Two-Board System:** Do not store these as separate entities in the DB. Use a `board` flag on the `BootcampExercise` model. This allows you to toggle the view in the UI by simply filtering the array: `exercises.filter(e => e.board === activeBoard)`.
3.  **AI Hive Mind:** Since you are using a 3-brain consensus (Flash → Qwen → Pro), ensure the **System Prompt** for the final "Pro" step includes the `EquipmentProfile` as a JSON schema. This forces the AI to output valid, parseable data rather than conversational text.

**Next Step:** Proceed with **Phase 0 (Decomposition)** immediately. Do not add new features until the 723-line monolith is broken down. This will reveal hidden dependencies that will make Phase 1-6 significantly easier to implement.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
