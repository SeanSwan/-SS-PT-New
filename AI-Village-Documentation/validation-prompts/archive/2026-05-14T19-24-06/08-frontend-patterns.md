# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 7.1s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

This review focuses on the technical architecture of the **Coach Command Center**. Your current plan is robust, but the transition from "prototype" to "production" requires tightening the abstraction layers to prevent the "God Component" anti-pattern.

### 1. Styled-components Organization
**Recommendation: REVISE.**
Splitting into 5 files is overkill for a single page. It increases cognitive load and file-switching friction.
*   **Better Pattern:** Use a single `CoachCommandCenter.styles.ts` file. Use **Styled-Component transient props** (`$isPending`, `$variant`) to handle state-driven styling.
*   **Why:** You need to maintain the "Crystalline Swan" theme consistency. Centralizing tokens and shared mixins (e.g., `glassmorphism`, `mobileDock`) in one file ensures the theme doesn't drift across sub-components.

### 2. Hook Composition
**Recommendation: REVISE.**
`useCoachAssistant` wrapping `useAIChat` is fine, but avoid deep nesting that hides state updates.
*   **Alternative:** Use a **Context Provider** (`CoachCommandProvider`) at the `CoachCommandCenter` level.
*   **Implementation:** Expose `state` and `actions` via a custom hook `useCoachContext()`. This flattens the dependency tree and prevents prop-drilling the `conversationId` or `clientContext` through 5 layers of UI.

### 3. Markdown Component Customization
**Recommendation: APPROVE (with caution).**
*   **Performance:** React-markdown is efficient, but `rehype-highlight` can be heavy.
*   **Strategy:** Map components via a memoized object outside the render function.
*   **Optimization:** Only lazy-load the syntax highlighter if the user actually opens a code block. Use a lightweight `pre` wrapper that renders plain text until the user clicks "Expand/Highlight."

### 4. Animation Strategy
**Recommendation: REVISE.**
Mixing `framer-motion` and CSS keyframes is a maintenance nightmare.
*   **Recommendation:** Standardize on **Framer Motion** for everything.
*   **Why:** `AnimatePresence` handles exit animations (crucial for mobile drawer closing) much better than CSS keyframes. Use `layout` prop in Framer for the sidebar/drawer transitions to get "free" smooth resizing.

### 5. Responsive Patterns
**Recommendation: JS-DRIVEN.**
*   **Approach:** Use a `useMediaQuery` hook to toggle a `isMobile` state.
*   **Implementation:** Render a `Sidebar` on desktop and a `Drawer` (using a Portal) on mobile. Do not try to make one component handle both via CSS; the DOM structure for a fixed sidebar vs. a slide-over drawer is fundamentally different for accessibility (focus trapping).

### 6. Form Handling
**Recommendation: CONTROLLED.**
*   **Strategy:** Use `react-hook-form` with `zod` validation.
*   **Debounce:** For search/composer, use `useDebounce` (from `usehooks-ts`) on the *value*, not the *event*.
*   **Why:** You need to ensure the "Command" is validated before it hits the AI backend to prevent malformed requests.

### 7. Code Block Component
**Recommendation: LAZY-LOAD.**
*   **Implementation:** Yes, make it a separate component. Wrap it in `React.lazy` and `Suspense`.
*   **Logic:** If the AI output contains code, the `CodeBlock` component should be the only thing that imports the heavy `highlight.js` or `prismjs` libraries.

### 8. Touch Gestures
**Recommendation: GESTURE LIBRARY.**
*   **Implementation:** Use `react-use-gesture` + `framer-motion`.
*   **Why:** CSS-only swipe is prone to "jank" and conflicts with browser scroll. A gesture library allows you to bind the `x` translation to the drag state, providing the "native feel" required for a trainer in a gym environment.

---

### Strategic Review of Plan (Answers to Questions)

1.  **Highest Risk:** The **Data Model Drift**. If `coach_action_proposals` and `WorkoutLog` services aren't perfectly synced, you will end up with "Ghost Workouts" that exist in the UI but fail to update the aggregate charts.
2.  **Phase 1 Scope:** Wire real conversations, but **keep PLAUD review state separate**. Do not force PLAUD clips into the `AiConversation` model yet; keep them as distinct "Intake Items" in the queue.
3.  **Stub Clients:** Use a `is_stub: true` flag in the `Client` model. Ensure these records are excluded from public-facing leaderboards or social feeds until a "Conversion" event (adding email/phone) occurs.
4.  **Canonical Path:** `WorkoutLog` service is the source of truth. `DailyWorkoutForm` should be treated as a *view* or *input buffer* that eventually writes to `WorkoutLog`.
5.  **Mobile UX:** The "Quick Approve" button is the most important element. It must be reachable by the thumb in the bottom-right corner.
6.  **Blocked until Phase 2/3:** **Automated Client Creation.** Do not allow the AI to trigger `client_onboarding` without a hard-coded "Human-in-the-loop" approval step that requires a physical button press.

### Recommended First Implementation Slice
1.  **Setup:** Create the `CoachCommandProvider` (Context).
2.  **UI:** Build the `CoachCommandCenter` layout with the mobile-first dock.
3.  **Integration:** Connect the `useAIChat` hook to the existing `backend/routes/aiChatRoutes.mjs`.
4.  **Verification:** Ensure that a message sent in the UI creates a record in `AiConversation` and persists on refresh. **Do not touch the PLAUD merge logic until this is stable.**

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
