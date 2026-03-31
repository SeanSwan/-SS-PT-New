# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.1s
> **Files:** docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md
> **Generated:** 3/30/2026, 9:51:35 PM

---

This performance review focuses on the **Swan Coach Assistant Upgrade Plan**. While the feature set significantly elevates the UX to "Claude-grade," the introduction of heavy markdown libraries and real-time voice processing requires specific architectural safeguards to maintain the "Crystalline" speed expected by wealthy, high-end clients.

### Executive Summary of Findings
*   **Bundle Size:** **HIGH RISK**. Adding `react-markdown` and syntax highlighters adds ~50-60KB gzipped. Without lazy loading, this impacts the initial TTI (Time to Interactive) for the entire dashboard.
*   **Render Performance:** **MEDIUM RISK**. Markdown parsing is CPU-intensive. Re-rendering a long conversation history on every keystroke in the input bar will cause noticeable lag.
*   **Memory Management:** **MEDIUM RISK**. Audio Blobs and Base64 image strings can quickly bloat the heap, leading to tab crashes on mobile devices (iOS Safari).

---

### 1. Bundle Size & Code Splitting
**Rating: HIGH**

*   **Finding:** The plan adds `react-markdown`, `remark-gfm`, and `rehype-highlight`. These are heavy and only needed when a conversation is active.
*   **Optimization:**
    *   **Lazy Load Markdown:** Do not include these in the main `SwanCoachAssistantPage` chunk. Create a `LazyMarkdown` wrapper.
    *   **Selective Highlighting:** `rehype-highlight` pulls in many languages. Use `lowlight` or configure `rehype-highlight` to only include common languages (TS, JS, CSS, JSON) to save ~30KB.
    *   **Split Boundary:** The `ConversationSidebar` should be in the main chunk, but the `MessagesArea` (containing the markdown engine) should be wrapped in `React.lazy()`.

```typescript
// Proposed Split
const MarkdownRenderer = React.lazy(() => import('./MarkdownRenderer'));
// Use a Shimmer/Skeleton placeholder to prevent Layout Shift (CLS)
```

### 2. Render Performance & Memoization
**Rating: CRITICAL**

*   **Finding:** React components often re-render the entire list when the parent state changes (e.g., as the user types in the `CoachInputBar`).
*   **Optimization:**
    *   **Memoize Messages:** Wrap `CoachMessage` in `React.memo` with a custom comparison function. Since messages are immutable once received, they should *never* re-render.
    *   **Virtual Scrolling:** With "840+ exercise database" and long periodization plans, conversations will get long. Use `react-window` or `virtuoso` for the `MessagesArea` to keep DOM nodes under 50.
    *   **Input Decoupling:** Ensure the `CoachInputBar` state is isolated from the `MessagesArea` state to prevent "typing lag."

### 3. Markdown Parsing Cost
**Rating: MEDIUM**

*   **Finding:** Parsing markdown on every render of a message is expensive, especially with tables and code blocks.
*   **Optimization:**
    *   **Memoize Output:** Inside `CoachMessage`, use `useMemo` to store the parsed markdown result, keyed by the message ID and content string.
    *   **Pre-parsing:** For historical messages loaded from the API, consider parsing them once on load and storing the result in a local cache.

### 4. Voice Recording & Memory
**Rating: HIGH**

*   **Finding:** `MediaRecorder` stores data in memory. Long recordings or multiple attempts without cleanup will leak memory.
*   **Optimization:**
    *   **Chunking:** Use the `timeslice` parameter in `mediaRecorder.start(1000)` to handle data in small chunks.
    *   **Explicit Cleanup:** In `useVoiceRecorder`, ensure `URL.revokeObjectURL()` is called on every recording discard or successful upload to free up browser memory.
    *   **Max Duration:** Hard-cap recordings at 2 minutes to prevent massive Blob allocations.

### 5. Network Waterfall & Caching
**Rating: MEDIUM**

*   **Finding:** Sequential loading (List -> Active Conv -> Messages) creates a "stutter" UI.
*   **Optimization:**
    *   **Parallel Requests:** Use `Promise.all` to fetch the conversation list and the most recent active conversation simultaneously on mount.
    *   **Optimistic UI:** When renaming or archiving in the sidebar, update the local state immediately before the API responds.
    *   **SWR/React Query:** Implement a caching layer so switching back to a previous conversation is instant.

### 6. Image Attachments & Canvas
**Rating: LOW**

*   **Finding:** Large "form check" photos can exceed Gemini's token limits and slow down the upload.
*   **Optimization:**
    *   **Client-side Compression:** Use a hidden `<canvas>` to resize images to a max-width of 1024px before converting to Base64/Blob. This reduces payload size by ~80% for modern smartphone photos.
    *   **CSS object-fit:** Use `aspect-ratio` and `object-fit: cover` for previews to prevent Layout Shift.

### 7. Animation Budget (GPU vs CPU)
**Rating: LOW**

*   **Finding:** Voice orb amplitude and sidebar transitions.
*   **Optimization:**
    *   **GPU Only:** Ensure the sidebar uses `transform: translateX()` rather than `left: 0`.
    *   **Voice Orb:** Use `will-change: transform` on the waveform bars. Use `requestAnimationFrame` for the amplitude logic rather than a high-frequency `setInterval`.

---

### Summary of Recommended Optimizations

| Feature | Strategy | Impact |
| :--- | :--- | :--- |
| **Markdown** | `React.lazy` + `useMemo` | Reduces initial load by 50KB; prevents typing lag. |
| **Sidebar** | `React.memo` + Optimistic UI | Instant feel for wealthy/busy professionals. |
| **Voice** | `URL.revokeObjectURL` | Prevents tab crashes during long coaching sessions. |
| **Images** | Canvas Downsampling | Faster uploads; stays within Gemini API limits. |
| **List** | Virtual Scrolling | Maintains 60fps even with 100+ message history. |

**Final Verdict:** The plan is functionally excellent. Implementing the **Lazy Loading** and **Memoization** strategies above is required to prevent the "Professional Upgrade" from feeling "heavy" or "sluggish" compared to the current lightweight version.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
