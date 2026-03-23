# Frontend UX & Code Patterns — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 6.2s
> **Files:** frontend/src/components/AIAssistant/AIAssistantDrawer.tsx, frontend/src/components/AIAssistant/AIAssistantFAB.tsx, frontend/src/components/AIAssistant/ClientPicker.tsx, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/components/Shared/AITerminalPanel.tsx, frontend/src/hooks/useAIChat.ts
> **Generated:** 3/21/2026, 7:20:52 PM

---

This review evaluates the **SwanStudios AI Assistant** suite against the provided design system and React best practices.

### 1. React Component Patterns
*   **CRITICAL: `useAIChat` State Management:** The hook is missing a `messages` state return, yet `AIAssistantDrawer` consumes `messages` from it. The current implementation will cause runtime errors.
*   **HIGH: Prop Drilling:** `AIAssistantDrawer` is becoming a "God Component." It manages UI state (view, input, client selection) alongside business logic.
    *   *Recommendation:* Extract the "Chat View" into a separate component to reduce the complexity of `AIAssistantDrawer`.
*   **MEDIUM: `useEffect` Dependency Hygiene:** In `AIAssistantDrawer`, the `handleSend` and `handleStartChat` functions have large dependency arrays. While correct, they trigger frequent re-renders of sub-components. Use `useMemo` for complex objects or move logic into a dedicated reducer.

### 2. styled-components Best Practices
*   **HIGH: Theme Token Consistency:** You are using hardcoded hex values (e.g., `#8B5CF6`, `#002060`) inside `AIAssistantFAB.tsx` and `DictationOrb.tsx`.
    *   *Recommendation:* Import the `CS` object from `crystallineSwanTheme.ts` consistently across all files to ensure theme updates propagate globally.
*   **MEDIUM: Glassmorphism:** The `backdrop-filter` is applied inconsistently. Ensure `backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);` is used as a mixin to prevent repetition.

### 3. Animation & Interaction
*   **HIGH: Reduced Motion:** You correctly implemented `prefers-reduced-motion` in `AIAssistantFAB` and `DictationOrb`. However, `AIAssistantDrawer` lacks a transition animation for the slide-in effect.
    *   *Recommendation:* Use `framer-motion` for the drawer slide-in (`initial={{ x: '100%' }} animate={{ x: 0 }}`) to provide a smoother, more premium feel than standard CSS transitions.
*   **MEDIUM: Interaction Feedback:** The `SendBtn` in `AIAssistantDrawer` has an `$active` prop, but the hover state doesn't visually differentiate between "disabled" and "ready" clearly enough for a luxury vault theme.

### 4. Form UX
*   **HIGH: Input Handling:** `AIAssistantDrawer` uses a `textarea` but lacks auto-resizing. On mobile, the input area will quickly become cramped.
    *   *Recommendation:* Implement a simple auto-grow logic or use a library like `react-textarea-autosize`.
*   **MEDIUM: Error Feedback:** The `ErrorBanner` in `AIAssistantDrawer` is good, but it doesn't persist the user's failed message in a way that allows easy editing before retrying.

### 5. State Management
*   **HIGH: Derived State Anti-pattern:** In `ClientPicker`, you are fetching data and manually normalizing it inside `useEffect`.
    *   *Recommendation:* Move the data fetching to a React Query (`useQuery`) hook. This handles caching, loading states, and error retries automatically, removing the need for `loading` and `error` states in the component.

### 6. Accessibility Gaps
*   **CRITICAL: Focus Management:** The `AIAssistantDrawer` implements a custom focus trap. While functional, it is prone to breaking if new elements are added.
    *   *Recommendation:* Use `react-focus-lock` to ensure robust keyboard navigation.
*   **HIGH: Color-only Indicators:** The `ContextPill` active state relies on `opacity` and color.
    *   *Recommendation:* Add a border or a "glow" indicator for the active state to satisfy WCAG 1.4.1 (Use of Color).
*   **MEDIUM: Screen Reader Announcements:** The `DictationOrb` has an `aria-live` region, which is excellent. Ensure the `TypingIndicator` in the drawer also has a clear `aria-live="polite"` region (currently implemented, but ensure it doesn't interrupt other announcements).

---

### Summary Table

| Finding | Severity | Component |
| :--- | :--- | :--- |
| `useAIChat` missing `messages` state | **CRITICAL** | `useAIChat.ts` |
| Custom focus trap fragility | **CRITICAL** | `AIAssistantDrawer.tsx` |
| Hardcoded hex values instead of theme tokens | **HIGH** | `AIAssistantFAB.tsx` |
| Missing slide-in animation for drawer | **HIGH** | `AIAssistantDrawer.tsx` |
| Manual data fetching vs React Query | **MEDIUM** | `ClientPicker.tsx` |
| Lack of auto-resizing input | **MEDIUM** | `AIAssistantDrawer.tsx` |

**Gemini 3.1 Flash Verdict:** The architecture is solid and the "Crystalline Swan" aesthetic is well-defined. Prioritize the `useAIChat` hook fix and move to `react-focus-lock` for accessibility to reach production-grade stability.

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
