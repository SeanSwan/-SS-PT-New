# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 10.6s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-BUILDER-OVERHAUL-PLAN.md
> **Generated:** 4/3/2026, 5:26:04 PM

---

This is a robust architectural plan. Given the complexity of the "Bootcamp Builder" and the high-end "Crystalline Swan" aesthetic, here is my review and implementation-ready recommendations.

---

### 1. Styled-components Organization
**Verdict:** 5 sub-files with a barrel export is **excellent** for maintainability.
*   **Why:** It prevents the "Mega-File" anti-pattern. Grouping by domain (e.g., `Layout.ts`, `Typography.ts`, `Buttons.ts`, `Cards.ts`, `Animations.ts`) allows for easier theme variable injection.
*   **Recommendation:** Ensure your `index.ts` barrel file uses `export * from './...'` to keep imports clean: `import { Card, Button } from '@styles/bootcamp';`.

### 2. Hook Composition
**Verdict:** `useCoachAssistant` -> `useAIChat` -> `useState` is **too deep**.
*   **Issue:** Prop drilling and "Hook Hell" make debugging state transitions (e.g., "Thinking" -> "Streaming" -> "Error") difficult.
*   **Recommendation:** Use the **State Machine pattern** (e.g., `XState` or a simple `useReducer`).
    *   Instead of nesting hooks, create a `CoachProvider` at the top level of the Builder. Use `useContext` to expose the AI state. This flattens the dependency tree and prevents unnecessary re-renders of the entire Builder when the AI chat state updates.

### 3. Markdown Component Customization
**Verdict:** Custom component mapping is highly performant if memoized.
*   **Recommendation:** Use `react-markdown` with `rehype-highlight`.
*   **Performance:** Wrap your component map in `useMemo`.
    ```tsx
    const components = useMemo(() => ({
      code: ({ node, ...props }) => <CodeBlock {...props} />,
      table: ({ node, ...props }) => <StyledTable {...props} />
    }), []);
    ```
    This prevents the markdown parser from re-creating the component object on every render.

### 4. Animation Strategy
**Verdict:** Mixing libraries is a **bad idea**.
*   **Recommendation:** Standardize on `framer-motion`. It handles `AnimatePresence` (for sidebars) and layout transitions (for reordering exercises in stations) natively.
*   **CSS Keyframes:** Keep these only for global, non-interactive elements (e.g., a subtle "pulse" on the logo). Use `framer-motion` for everything that interacts with the user to ensure sync with React state.

### 5. Responsive Patterns
**Verdict:** Use **JS-driven state for the Sidebar/Drawer**, but **CSS-driven for the layout grid**.
*   **Recommendation:** Use a `useMediaQuery` hook to toggle a `isMobile` boolean.
    *   **Desktop:** CSS Grid (`grid-template-columns: 280px 1fr 350px`).
    *   **Mobile:** CSS Grid (`grid-template-columns: 1fr`). Use a `Drawer` component (via `framer-motion`) that slides over the content. Do not try to force the 3-pane layout into a mobile screen; use a "Tabbed" view or "Bottom Sheet" for the secondary panels.

### 6. Form Handling
**Verdict:** **Controlled inputs** are mandatory here.
*   **Why:** You need real-time validation for the "55-minute limit" and the "Flow Score."
*   **Debounce:** Use `use-debounce` for the search input in the `ExerciseRolodexPanel`. Do not debounce the "Class Builder" inputs, as the trainer needs immediate feedback on the timing bar.

### 7. Code Block Component
**Verdict:** **Yes, lazy-load it.**
*   **Recommendation:** Since the AI Coach is a "nice-to-have" feature, use `React.lazy` for the `CodeBlock` and `SyntaxHighlighter`. This keeps the initial bundle size small for the core Builder functionality.

### 8. Touch Gestures
**Verdict:** Don't write custom CSS swipe logic.
*   **Recommendation:** Use `framer-motion`'s `drag` and `onDragEnd` props.
    *   It provides the "physics" (springs, friction) that make the app feel premium.
    *   Implement a `swipe-to-reveal` by wrapping the exercise item in a `motion.div` with `drag="x"` and `dragConstraints={{ left: -100, right: 0 }}`.

---

### Strategic Answers to your "Questions for AI Village"

1.  **Format vs. Sub-style:** Treat them as **Formats**. EMOM/Tabata/AMRAP have distinct timing logic that will break the standard "Station" model if forced into a sub-style.
2.  **Optimal Station Count:**
    *   Standard/Circuit: 6-8 stations.
    *   EMOM/AMRAP: 3-4 stations (to keep transitions tight).
3.  **Rolodex UI:** **Sidebar on Desktop, Modal on Mobile.** The screen real estate on mobile is too precious for a permanent panel.
4.  **Equipment Constraints:** Use a **"Hard/Soft" filter system**. If a format requires weight plates (e.g., Pyramid), the UI should grey out exercises that don't support that equipment, but allow the trainer to override it (with a warning).
5.  **AI/Manual Flow:** **"AI-First, Manual-Refine."** The AI generates the baseline. The trainer then enters "Edit Mode" to swap/add. This is the most efficient workflow for busy professionals.
6.  **Industry Reference:** Reference **NASM OPT Model** for the logic, but look at **"Tabata Timer"** and **"SmartWOD"** for the UI/UX timing patterns.
7.  **Teach Me Content:** **Dynamic AI-generated.** Static markdown will get stale. Use the LLM to generate the "Teach Me" content based on the *current context* (e.g., if the user is in "Tabata" mode, the AI explains Tabata).
8.  **Limited Gear:** Implement a **"Substitution Engine."** If the user has limited equipment, the AI should automatically suggest the "next best" exercise (e.g., if no Barbell, suggest Dumbbell or Resistance Band equivalent).

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
