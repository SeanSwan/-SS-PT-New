# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 21.1s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 9:33:09 PM

---

This performance review evaluates the **Bootcamp Creator Upgrade Plan** for SwanStudios. Given the target demographic (wealthy professionals) and the "Enchanted Apex" high-fidelity UI, performance must be invisible and instantaneous.

### Executive Summary: Performance Rating
The plan is functionally robust but contains several **HIGH** risk areas regarding DOM bloat and main-thread blocking during AI interactions and complex layout rendering (Two-Board system).

---

### 1. Bundle Size & Dependency Impact
**Rating: MEDIUM**
*   **Findings:** Adding `react-markdown`, `remark-gfm`, and `rehype-highlight` adds ~65-75KB (gzipped). In a "Coach Assistant" sidebar, this is significant.
*   **Optimization:** 
    *   **Lazy Load:** Do not include markdown parsers in the main `BootcampBuilder` chunk. Use `React.lazy(() => import('./MarkdownRenderer'))` only when the AI Assistant pane is toggled open.
    *   **Lightweight Alternatives:** Consider `snarkdown` (2KB) if GitHub-flavored markdown (GFM) tables aren't strictly required for chat.

### 2. Render Performance (Sidebar & Station Cards)
**Rating: HIGH**
*   **Findings:** The plan involves a "Coach Assistant" chat. React's default behavior will re-render the entire sidebar (and potentially the parent orchestrator) on every streamed token from the AI.
*   **Optimization:**
    *   **Atomic Updates:** Use a dedicated `ChatMessages` component wrapped in `React.memo`.
    *   **Virtualization:** If conversation history exceeds 20 messages, use `react-window` or `virtuoso`.
    *   **CSS Containment:** Use `contain: strict;` on station cards to prevent layout shifts in the center pane when the sidebar animates.

### 3. Voice Recording & Memory Management
**Rating: MEDIUM**
*   **Findings:** Long recordings for "Coach Assistant" commands can lead to massive `Blob` arrays in RAM.
*   **Optimization:**
    *   **Chunking:** Implement a `requestData` interval (e.g., every 3 seconds) on the `MediaRecorder` to process/upload chunks or move them to IndexedDB if the recording is long.
    *   **Cleanup:** Explicitly call `URL.revokeObjectURL()` on all preview snippets to prevent memory leaks in the SPA.

### 4. Markdown Parsing Strategy
**Rating: LOW**
*   **Findings:** Parsing on every render is expensive for long AI explanations.
*   **Optimization:**
    *   **Memoization:** Wrap the markdown output in `useMemo(() => <ReactMarkdown>{content}</ReactMarkdown>, [content])`.
    *   **Server-Side Pre-parsing:** If the AI Hive Mind returns static templates, have the backend send pre-rendered HTML to save client-side CPU.

### 5. Network Waterfall (Data Fetching)
**Rating: CRITICAL**
*   **Findings:** Loading `BootcampTemplate` -> `Stations` -> `Exercises` -> `EquipmentProfiles` sequentially will create a 2-3 second "spinner hell."
*   **Optimization:**
    *   **Parallelization:** Use `Promise.all()` in `useBootcampAPI` to fetch the template and equipment profiles simultaneously.
    *   **Prefetching:** Prefetch the `EquipmentProfile` when the user hovers over the "Create New Bootcamp" button.
    *   **Data Flattening:** Update the backend to return a "Hydrated Template" JSON that includes stations and exercises in a single request.

### 6. Image Attachments & Thumbnails
**Rating: MEDIUM**
*   **Findings:** 840+ exercise database likely contains high-res demos. Loading these in a "Two-Board" view will spike memory.
*   **Optimization:**
    *   **Canvas Thumbnails:** Generate 100x100px thumbnails via Canvas for the `BootcampExerciseRow`.
    *   **Lazy Loading:** Use the native `loading="lazy"` attribute on all exercise demo images.
    *   **Intersection Observer:** Only trigger the "Alternative Board" image loads when the toggle is switched.

### 7. Code Splitting Strategy
**Rating: HIGH**
*   **Findings:** The `BootcampBuilderPage` is being decomposed into 12 files, but they shouldn't all be in one bundle.
*   **Proposed Split Boundaries:**
    *   **Main UI:** `BootcampConfigPanel` and `BootcampClassPreview`.
    *   **Lazy Load:** `BootcampAIInsights` (AI is heavy), `BootcampTimeline` (D3/Chart logic), and `PDFExportService`.
    *   **Floor Mode:** This should be a completely separate route/bundle (`/bootcamp/floor-mode`) to keep the "Builder" logic out of the "Workout" view.

### 8. Animation Budget (GPU Optimization)
**Rating: LOW**
*   **Findings:** "Voice orb" and "Sidebar slide" can cause jank if they trigger layout reflows.
*   **Optimization:**
    *   **GPU Compositing:** Use `transform: translateX()` for the sidebar and `opacity` for the orb. Avoid animating `width`, `height`, or `margin`.
    *   **Will-Change:** Apply `will-change: transform;` to the sidebar during the transition phase only.

---

### Summary of Specific Optimizations

| Feature | Priority | Optimization Action |
| :--- | :--- | :--- |
| **AI Chat** | **CRITICAL** | Memoize message list; use `react-markdown` only via `React.lazy`. |
| **Data Fetching** | **HIGH** | Flatten API response to prevent N+1 waterfall requests. |
| **Two-Board View** | **MEDIUM** | Use CSS `grid` and `content-visibility: auto` for off-screen station cards. |
| **Flow Optimizer** | **MEDIUM** | Run the optimization logic in a **Web Worker** if calculating for >10 stations to keep UI responsive. |
| **Voice Orb** | **LOW** | Use RequestAnimationFrame (rAF) or CSS animations for the amplitude viz to avoid React state overhead. |

**Engineer's Note:** The "Two-Board System" is the highest risk for DOM node count. Ensure that when switching between Board 1 and Board 2, you are not rendering both and hiding one with `display: none`. Use conditional rendering to keep the DOM lean for mobile devices used on the gym floor.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
