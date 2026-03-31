# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 8.8s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

This architecture review focuses on maintaining the "Enchanted Apex" aesthetic while ensuring the performance required for a 840+ exercise database.

### 1. Styled-components Organization
**Verdict:** 5 sub-files with a barrel export is **excellent**.
*   **Why:** It prevents the "Mega-File" anti-pattern and improves IDE intellisense.
*   **Recommendation:** Use a `theme.ts` file for your palette constants (Midnight Sapphire, etc.) and inject them via `ThemeProvider`. Ensure your sub-files (e.g., `Sidebar.styles.ts`, `Tabs.styles.ts`) import from a central `tokens.ts` to maintain consistency.

### 2. Hook Composition
**Verdict:** Nesting `useCoachAssistant` > `useAIChat` > `useState` is **acceptable but risky**.
*   **Issue:** Deep nesting creates "Prop Drilling" or "Context Hell."
*   **Alternative:** Use a **Compound Hook Pattern** or a dedicated `CoachProvider`.
*   **Recommendation:** Create a `CoachContext` that holds the state. Your hooks should be consumers of this context rather than wrappers of each other. This flattens the dependency tree and allows components to access state without re-rendering the entire chain.

### 3. Markdown Component Customization
**Verdict:** Custom component mapping is the **gold standard**.
*   **Performance:** It is highly performant because `react-markdown` uses a simple lookup table.
*   **Recommendation:** Memoize your custom components (`const CodeBlock = React.memo(...)`). This prevents re-renders of heavy syntax-highlighted blocks when the parent sidebar state changes.

### 4. Animation Strategy
**Verdict:** Mixing `framer-motion` and CSS keyframes is **sub-optimal**.
*   **Issue:** It creates inconsistent "feel" and increases bundle size.
*   **Recommendation:** Standardize on `framer-motion`. It handles `AnimatePresence` for sidebars and can easily replicate CSS keyframe "thinking" pulses using `animate={{ opacity: [0.5, 1, 0.5] }}`. Remove CSS keyframes to keep the codebase clean.

### 5. Responsive Patterns
**Verdict:** Use **JS-driven layout state** for the sidebar/drawer.
*   **Recommendation:** Use a `useMediaQuery` hook to toggle between a `Sidebar` component (Desktop) and a `Drawer` component (Mobile). Do not try to force one component to handle both via CSS; the DOM structure for a fixed sidebar vs. a slide-over drawer is fundamentally different.

### 6. Form Handling
**Verdict:** Use **Uncontrolled inputs with `useRef`** for search; **Controlled** for conversation.
*   **Search:** Use `useRef` + `debounce` (from `lodash` or custom). You don't need a re-render on every keystroke for a search filter.
*   **Conversation:** Controlled inputs are necessary here to support AI "streaming" and real-time validation.

### 7. Code Block Component
**Verdict:** **Yes, lazy-load it.**
*   **Recommendation:** Use `React.lazy(() => import('./CodeBlock'))` inside a `Suspense` boundary. Since code blocks are only needed when the AI outputs code, you save the weight of the syntax highlighter library for 90% of standard text interactions.

### 8. Touch Gestures
**Verdict:** **Use a library.**
*   **Recommendation:** Do not write custom touch-swipe logic (it’s a nightmare for edge cases like scroll-blocking). Use `framer-motion`'s `drag` constraints or `react-use-gesture`. It integrates perfectly with your existing animation strategy.

---

### Strategic Answers to "Questions for AI Village"

1.  **Data Gap:** **(c) Hybrid.** Seed the top 200 exercises. For the remaining 600+, use a "Generate on Demand" strategy with a `loading` state in the UI. Cache the result in your DB/Redis so the second user to view it gets the cached version.
2.  **Architecture:** **(a) Shared Component Library.** Create a `TeachModeProvider` that manages the "active exercise" or "active context." This allows any tab to trigger the sidebar without knowing about the others.
3.  **Depth vs Performance:** **(c) Cache in Redux/LocalState.** Fetch the "Deep Data" only when the sidebar is opened. Once fetched, keep it in a `Map` in your global state.
4.  **Persistence:** **(c) User Preferences API.** For a professional SaaS, persistence across devices is a "delighter." Store `isTeachModeOpen` in the user's profile settings in the DB.
5.  **Progressive Disclosure:** **(a) Collapsed by default.** Use `Accordion` components. It keeps the UI clean for power users while providing depth for learners.
6.  **Mobile Experience:** **(a) Bottom Sheet.** It is the most ergonomic pattern for mobile users (thumb-friendly). Use `framer-motion` to animate the sheet height.
7.  **Gamification:** **(c) Both.** Reward the *action* of opening (discovery) and the *completion* of a quiz (retention).

### Implementation-Ready Recommendation: The "TeachMode" Wrapper
```tsx
// Example of the recommended architecture
const TeachModeProvider = ({ children }) => {
  const [activeContext, setActiveContext] = useState(null);
  const [data, setData] = useState({});

  const fetchDeepData = async (id) => {
    if (data[id]) return;
    const res = await api.get(`/exercises/${id}/teach-mode`);
    setData(prev => ({ ...prev, [id]: res.data }));
  };

  return (
    <TeachModeContext.Provider value={{ activeContext, fetchDeepData, data }}>
      {children}
      <TeachModeSidebar />
    </TeachModeContext.Provider>
  );
};
```
*This approach decouples your business logic from the UI, ensuring the sidebar remains a "dumb" display component while the Provider handles the heavy lifting.*

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
