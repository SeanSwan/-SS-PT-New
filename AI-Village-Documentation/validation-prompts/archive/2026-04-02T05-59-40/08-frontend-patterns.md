# Frontend Patterns & React Best Practices — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 8.8s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 10:59:40 PM

---

This is a sophisticated architecture. Given the **Crystalline Swan** aesthetic and the high-end nature of your clientele, performance and visual polish are non-negotiable.

Here is the architectural review and implementation-ready recommendations.

---

### 1. Styled-components Organization
**Verdict:** 5 sub-files is **over-engineering** for a single component's styles.
*   **Recommendation:** Use a single `SwanCoachStyles.ts` file but leverage **CSS Variables** defined in a `theme.ts` or `GlobalStyles.ts`.
*   **Why:** Barrel files add unnecessary import overhead and make debugging harder. If the file exceeds 300 lines, it’s a sign the component itself is too large, not the style file.
*   **Implementation:** Use `styled-components` `css` blocks exported from the main style file to keep logic grouped (e.g., `export const SidebarStyles = css`... `export const ChatStyles = css`...).

### 2. Hook Composition
**Verdict:** Nesting `useCoachAssistant` -> `useAIChat` -> `useState` is **fragile**.
*   **Recommendation:** Use a **Context Provider** (`CoachProvider`) for state and expose custom hooks that consume that context.
*   **Why:** Prop drilling or deep hook nesting makes testing difficult and triggers unnecessary re-renders.
*   **Pattern:** 
    ```typescript
    // Use a Provider to hold the state
    export const CoachProvider = ({ children }) => {
      const [messages, setMessages] = useState([]);
      const [painData, setPainData] = useState(null);
      return <CoachContext.Provider value={{...}}>{children}</CoachContext.Provider>
    }
    ```

### 3. Markdown Component Customization
**Verdict:** Performance is negligible if memoized.
*   **Recommendation:** Use `react-markdown` with `rehype-highlight`. Map components via a `components` prop object.
*   **Performance:** Wrap your custom components (e.g., `CodeBlock`, `Table`) in `React.memo`.
*   **Tip:** Use `prism-react-renderer` for better theme control than standard `rehype-highlight` if you need to match the "Midnight Sapphire" palette exactly.

### 4. Animation Strategy
**Verdict:** **Mixing libraries is a "code smell."**
*   **Recommendation:** Standardize on **Framer Motion**.
*   **Why:** CSS keyframes are performant but lack the orchestration capabilities of `AnimatePresence`. Using both creates "animation drift" where the UI feels inconsistent.
*   **Implementation:** Use `framer-motion` for everything. It handles layout transitions (like the sidebar) and state-based animations (thinking indicators) seamlessly.

### 5. Responsive Patterns
**Verdict:** **CSS-in-JS (Styled-components) is superior here.**
*   **Recommendation:** Use CSS Media Queries within your styled-components.
*   **Why:** JS-based resizing (window.innerWidth) causes layout shift (FOUC). CSS handles this at the browser's paint level.
*   **Pattern:** Define a `SidebarWrapper` that uses `display: none` on mobile and `width: 280px` on desktop, with a `Drawer` component that triggers via state.

### 6. Form Handling
**Verdict:** **Controlled inputs are mandatory** for AI chat/search.
*   **Recommendation:** Use `react-hook-form` for complex forms, but for the search/chat input, use a **debounced controlled input**.
*   **Debounce:** Use `use-debounce` hook. Do not debounce the state update (keep the UI snappy), only debounce the *API call* triggered by the state change.

### 7. Code Block Component
**Verdict:** **Yes, lazy-load it.**
*   **Recommendation:** `const SyntaxHighlighter = React.lazy(() => import('./SyntaxHighlighter'));`
*   **Why:** Syntax highlighting libraries are heavy. Only load them when a code block is actually rendered in the chat.

### 8. Touch Gestures
**Verdict:** **Use a library.**
*   **Recommendation:** `use-gesture` + `framer-motion`.
*   **Why:** Building robust "swipe-to-reveal" that handles scroll-locking and momentum correctly is extremely difficult with raw CSS/JS. `use-gesture` is the industry standard for React.

---

### Strategic Answers to "Questions for AI Village"

1.  **Image Gen:** Use **SVG overlays on high-res WebP images**. SVG is too heavy for complex anatomy, but PNG/WebP lacks interactivity. The hybrid approach (Image + SVG Map) is the gold standard for medical apps.
2.  **Sprint Memory:** Use a **dedicated junction table** (`sprint_exercise_usage`). JSONB is fine for small sets, but for 840+ exercises, you will eventually need to query "When was the last time this specific exercise was used across all sprints?" SQL joins are much faster for this than parsing JSONB.
3.  **Calendar:** **Build a custom grid.** Libraries like `FullCalendar` are bloated and notoriously difficult to style with `styled-components`. A simple CSS Grid calendar is ~100 lines of code and gives you 100% control over the "Crystalline Swan" aesthetic.
4.  **Deload Logic:** **Hybrid.** Auto-insert every 4th week, but provide a "Manual Override" toggle in the Sprint Settings.
5.  **Pain Integration:** **Filter at generation time.** If the AI generates a class that includes a contraindicated exercise, the trainer loses trust in the "AI Coach." It must be excluded or swapped during the generation prompt.
6.  **Anatomical Accuracy:** **Yes.** Use a medical reference (e.g., *Gray's Anatomy* or *Netter's*) to verify the AI output. AI often hallucinates muscle attachments.
7.  **Cross-Sprint Freshness:** **Weighted Decay.** Use a `last_used_date` column in your `exercise_history` table. Penalize exercises used in the last 30 days heavily, and those used 90+ days ago lightly.
8.  **Mobile Calendar:** **Default to List View.** On 375px, a month grid is unreadable. Use a "Agenda/List" view for mobile, and "Month" for desktop.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
