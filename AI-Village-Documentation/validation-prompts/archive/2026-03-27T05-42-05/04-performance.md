# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.6s
> **Files:** frontend/src/context/GlobalClientContext.tsx, frontend/src/components/Shared/GlobalClientSelector.tsx, frontend/src/components/Shared/OmniTerminal.tsx, frontend/src/components/Shared/AITerminalPanel.tsx, backend/services/aiChatService.mjs
> **Generated:** 3/26/2026, 10:42:05 PM

---

This is a comprehensive review of the **SwanStudios** performance and scalability architecture.

### Executive Summary
The codebase is functionally rich but contains several **Critical** and **High** risks regarding memory management, redundant network activity, and bundle bloat. The most significant issue is the **AITerminalPanel**, which violates several performance best practices by mixing heavy logic with frequent UI updates.

---

### 1. Bundle Size & Dependency Impact
**Finding: Heavy Component Bloat in Main Thread**
*   **Severity:** HIGH
*   **File:** `AITerminalPanel.tsx`, `OmniTerminal.tsx`
*   **Issue:** `AITerminalPanel` is a massive component (450+ lines) containing complex regex logic, large constant objects (`CONTEXT_LABELS`), and heavy styled-components. It is imported directly into `OmniTerminal`.
*   **Impact:** Since `OmniTerminal` is likely used in a global layout, this entire AI logic (and potentially large Markdown/Syntax highlighting libraries if added later) loads on every page, even if the user never opens the chat.
*   **Recommendation:** Use `React.lazy` to dynamic import `AITerminalPanel` inside `OmniTerminal`. Only load the AI chunk when `isOpen` becomes true.

**Finding: Icon Library Tree-Shaking**
*   **Severity:** LOW
*   **File:** All Frontend Files
*   **Issue:** Using `lucide-react` is generally safe, but ensure the build pipeline (Vite/Webpack) is configured for tree-shaking, as 15+ unique icons are imported across these files.

---

### 2. Render Performance
**Finding: Context "Value" Object Pollution**
*   **Severity:** HIGH
*   **File:** `GlobalClientContext.tsx`
*   **Issue:** The `value` object in `useMemo` includes `clientList`. Every time a trainer fetches their list of 50+ clients, every component consuming `useGlobalClient` (even those only interested in `activeClient`) will re-render.
*   **Impact:** UI lag in the header and sidebar during background refreshes.
*   **Recommendation:** Split the context into `GlobalClientStateContext` and `GlobalClientActionsContext`, or use a selector-based state library (Zustand) to prevent unnecessary top-down re-renders.

**Finding: Expensive Filter in Render Path**
*   **Severity:** MEDIUM
*   **File:** `GlobalClientSelector.tsx`
*   **Issue:** `filteredClients` runs on every keystroke. While `useMemo` is used, the dependency `clientList` is large.
*   **Recommendation:** For lists > 100 clients, implement a debounced search or a transition (`useTransition`) to keep the input field responsive while the list filters.

---

### 3. Network Efficiency
**Finding: Redundant API Polling/Fetching**
*   **Severity:** MEDIUM
*   **File:** `GlobalClientContext.tsx`
*   **Issue:** `refreshClients` is called inside a `useEffect` triggered by `user?.id`. If a user navigates between dashboard tabs, this context might re-mount or re-trigger depending on the Provider's location, causing redundant fetches of the same client list.
*   **Impact:** Unnecessary load on `/api/admin/clients`.
*   **Recommendation:** Implement a "stale-while-revalidate" pattern or check if `clientList.length > 0` before fetching, unless a hard `refresh` is requested.

**Finding: N+1 Risk in AI Context**
*   **Severity:** HIGH
*   **File:** `aiChatService.mjs`
*   **Issue:** The system prompt claims access to 17 data sources (macros, movement, etc.). If the backend fetches these sequentially for every chat message without a caching layer (Redis), the TTFT (Time to First Token) will be extremely high.
*   **Recommendation:** Use `Promise.all` for data fetching or implement a `ClientSnapshot` cache that updates only when specific tables change.

---

### 4. Memory Leaks & DOM
**Finding: Missing Cleanup in Global Event Listeners**
*   **Severity:** MEDIUM
*   **File:** `GlobalClientSelector.tsx`
*   **Issue:** The `mousedown` handler for click-outside is attached to `document`. If the component unmounts during a route change while the dropdown is open, there is a small window for a race condition, though the cleanup function is present.
*   **Recommendation:** Use a React Ref-based approach or a library like `react-use-click-away` to ensure robust cleanup.

**Finding: Body Scroll Lock Leak**
*   **Severity:** HIGH
*   **File:** `OmniTerminal.tsx`
*   **Issue:** `document.body.style.overflow = 'hidden'` is set when `isOpen` is true. If the component unmounts unexpectedly (e.g., a hard error or parent unmount) without `onClose` being called, the main page remains unscrollable.
*   **Recommendation:** Use a dedicated hook like `useLockBodyScroll` that ensures the style is reverted on unmount regardless of the `isOpen` state.

---

### 5. Database & Scalability (Backend)
**Finding: Unbounded Prompt Injection**
*   **Severity:** CRITICAL
*   **File:** `aiChatService.mjs`
*   **Issue:** Large system prompts (NASM references) are sent with *every* request. As conversation history grows, you will hit **Token Context Limits** rapidly.
*   **Impact:** High API costs and eventual "Context Window Exceeded" errors.
*   **Recommendation:** Use **RAG (Retrieval-Augmented Generation)**. Store the NASM/Nutrition references in a Vector Database (Pinecone/pgvector). Only inject the *relevant* sections of the NASM guide based on the user's current query.

**Finding: In-Memory State in Multi-Instance Prod**
*   **Severity:** MEDIUM
*   **File:** `GlobalClientContext.tsx`
*   **Issue:** `sessionStorage` is used for persistence. If the user opens two tabs, selects Client A in Tab 1 and Client B in Tab 2, the `sessionStorage` will conflict or stay out of sync until a refresh.
*   **Recommendation:** Use `BroadcastChannel` API to sync the `activeClient` across multiple tabs in real-time.

---

### 6. Performance Scorecard

| Category | Rating | Primary Concern |
| :--- | :--- | :--- |
| **Bundle Size** | 🟡 MEDIUM | AI Terminal logic should be lazy-loaded. |
| **Render Perf** | 🟠 HIGH | Context value object causes global re-renders. |
| **Network** | 🟡 MEDIUM | Potential for redundant client list fetches. |
| **Scalability** | 🔴 CRITICAL | Massive system prompts will break token limits. |
| **Memory** | 🟢 LOW | Generally well-handled with minor edge cases. |

### Final Performance Engineer Pro-Tip:
Move the `NASM_OPT_REFERENCE` and `NUTRITION_REFERENCE` constants out of the `aiChatService.mjs` execution path and into a separate JSON config or a database. Currently, these strings are re-allocated/processed on every module load, and sending them in full to the LLM on every turn is a "burn rate" nightmare. Use **Prompt Caching** (available in Anthropic/Gemini) to reduce costs for these static instructions.

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
