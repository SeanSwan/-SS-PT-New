# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 9.7s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 10:59:40 PM

---

As a Web Performance Engineer, I have reviewed the **Bootcamp Sprint Planner & Pain Chart Upgrade** plan. While the functional logic is sound, the introduction of high-resolution anatomical imagery and complex 12-week grid views presents significant risks to the "Crystalline Swan" snappiness, especially for the target demographic (wealthy professionals) who likely use high-DPI mobile devices.

### 1. Bundle Size Analysis
*   **Finding:** The plan mentions `react-markdown` and syntax highlighting. While excellent for the AI Coach, these are heavy. Adding `react-calendar` or `fullcalendar` (Feature 3) could add another 40-100KB.
*   **Rating:** **MEDIUM**
*   **Optimization:** 
    *   **Lazy Load Markdown:** Only load `react-markdown` and `rehype-highlight` within the `CoachAssistant` or `SprintDetailPanel` using `React.lazy()`.
    *   **Tree-shaking:** Ensure `date-fns` is used for calendar logic instead of `moment.js` to save ~60KB.

### 2. Render Performance (Sprint Planner & Calendar)
*   **Finding:** A 12-week sprint contains 36–60 `SprintClassSlot` components. If the parent `SprintPlannerPage` state updates (e.g., toggling a "Show Exercises" global switch), React will re-render 60+ complex cards.
*   **Rating:** **HIGH**
*   **Optimization:**
    *   **Windowing:** Use `react-window` for the "List View" of the sprint to ensure only visible weeks are in the DOM.
    *   **Memoization:** Wrap `SprintClassSlot` in `React.memo` with a custom comparison function. Ensure the `exerciseMemory` JSONB is not passed down in its entirety to every slot; pass only the specific slot data.

### 3. Voice Recording & Memory Management
*   **Finding:** The "Voice-first AI coach" implies long-running `MediaRecorder` sessions. Storing raw Blobs in component state will lead to browser crashes on mobile devices after ~10 minutes of recording.
*   **Rating:** **CRITICAL**
*   **Optimization:**
    *   **Chunking:** Implement a "Stream-to-Blob" strategy. Every 5 seconds, move the data chunk to an IndexedDB (using `idb-keyval`) instead of keeping it in RAM.
    *   **Cleanup:** Explicitly call `URL.revokeObjectURL()` when a recording is discarded or uploaded to prevent memory leaks.

### 4. Markdown Parsing Cost
*   **Finding:** Parsing 840+ exercise descriptions or long AI-generated sprint notes on every render is expensive.
*   **Rating:** **LOW**
*   **Optimization:**
    *   **Memoize Output:** Use `useMemo(() => <ReactMarkdown>{content}</ReactMarkdown>, [content])` to prevent the parser from re-running unless the text changes.

### 5. Network Waterfall (The "Sprint Load" Problem)
*   **Finding:** Fetching a 3-month sprint + 60 class slots + exercise details for each slot + client pain data sequentially will create a 3-5 second "loading spinner" hell.
*   **Rating:** **HIGH**
*   **Optimization:**
    *   **Data Flattening:** The `/api/bootcamp/sprints/:id` endpoint should return a "Thin Sprint" (metadata + slot IDs). Use a secondary "Bulk Fetch" for slot details.
    *   **SWR/React Query:** Implement pre-fetching. When a user hovers over a "Week" in the timeline, pre-fetch the class data for that week.

### 6. Image Attachments & Anatomical Imagery
*   **Finding:** The plan calls for "Ultra-realistic 2048x4096" anatomical images. Loading 4 of these (Male/Female Front/Back) is ~20MB of raw texture memory.
*   **Rating:** **CRITICAL**
*   **Optimization:**
    *   **WebP + Srcset:** Serve images in WebP format. Use `srcset` to serve 1024px versions to mobile users.
    *   **Canvas Hotspots:** Do not use 42 separate DOM elements for hotspots. Use a single `<canvas>` or a single optimized `<svg>` overlay to keep the DOM node count low.
    *   **Lazy-load Gender:** Only load the Male or Female assets based on the client's profile; do not load both.

### 7. Code Splitting Boundaries
*   **Finding:** The Pain Chart and Sprint Planner are "heavy" features used less frequently than the daily workout view.
*   **Rating:** **MEDIUM**
*   **Optimization:**
    *   **Route-based Splitting:** `SprintPlannerPage` and `PainChartUpgrade` must be separate chunks.
    *   **Component-based Splitting:** The "Anatomical Overlay" should be a separate chunk loaded only when the user clicks "Expand Map."

### 8. Animation Budget (GPU vs CPU)
*   **Finding:** Sidebar slide-ins and "Voice Orb" visualizations can cause "Jank" (dropped frames) if they trigger Layout/Reflow.
*   **Rating:** **LOW**
*   **Optimization:**
    *   **Transform/Opacity:** Ensure the sidebar uses `transform: translateX()` rather than `left: 0`.
    *   **Will-change:** Apply `will-change: transform` to the Voice Orb during active recording to promote it to a GPU layer.

---

### Summary of Performance Requirements

| Feature | Optimization Strategy | Target Metric |
| :--- | :--- | :--- |
| **Pain Chart** | WebP + SVG Overlay (No heavy PNGs in DOM) | < 2s LCP |
| **Sprint Planner** | Virtualized List + Memoized Slots | 60fps Scroll |
| **AI Coach** | IndexedDB Audio Chunking | < 100MB RAM |
| **Calendar** | Parallel Fetching (Slots + Logs) | < 500ms Interaction |

**Final Recommendation:** Proceed with the plan, but prioritize **Phase D (Anatomical Upgrade)** optimization. High-res medical imagery is the biggest threat to the mobile experience for your 30-55-year-old professional demographic.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
