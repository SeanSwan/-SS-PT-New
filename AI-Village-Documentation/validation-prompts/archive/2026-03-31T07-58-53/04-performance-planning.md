# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 12.1s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

As a Web Performance Engineer, I have reviewed the **Teach Mode Expansion Plan**. While the feature set is robust for the NASM-certified target market, the "comprehensive exercise encyclopedia" approach introduces significant risks to the **Time to Interactive (TTI)** and **Main Thread Blocking Time** on the Workout Planner.

Below is the performance impact assessment and optimization strategy.

---

### 1. Bundle Size & Dependency Management
**Rating: HIGH**
*   **Finding:** Adding `react-markdown`, `remark-gfm`, and `rehype-highlight` adds ~65KB (gzip) to the vendor bundle. If imported statically into `TeachModeSidebar.tsx`, this weight will penalize the initial load of the Workout Planner even if Teach Mode is closed.
*   **Optimization:** 
    *   **Dynamic Import:** Wrap the Markdown renderer in a `React.lazy` component. Only trigger the fetch when the user first clicks the "Teach Mode" toggle.
    *   **Lightweight Alternatives:** Since you are targeting "wealthy golf clients" (likely on high-end iOS devices), consider `snarkdown` (2KB) if GFM/Highlighting isn't strictly required for exercise cues.

### 2. Render Performance (Sidebar & Tabs)
**Rating: MEDIUM**
*   **Finding:** The 3-tab layout with deep exercise data (instructions, cues, biomechanics) creates a large DOM tree. Re-rendering the entire sidebar when switching exercises in the Rolodex will cause noticeable "jank."
*   **Optimization:**
    *   **React.memo:** Memoize the `Tab` panels. Only the `Phase & Progression` tab should re-render when the user toggles OPT Phases (1-5).
    *   **Windowing:** If the "Exercise Rolodex" list remains visible while Teach Mode is open, ensure the list uses `react-window` or `react-virtuoso` to prevent DOM bloat.

### 3. Voice Recording & Memory Management
**Rating: HIGH**
*   **Finding:** Long recordings for the "Coach Assistant" (Phase 2) store raw Blob data in memory. For 30-55-year-old professionals who may multi-task, leaving a recording active can lead to browser tab crashes.
*   **Optimization:**
    *   **Chunking:** Stream `MediaRecorder` data to a `Web Worker` to process/compress (e.g., to Ogg/WebM) off the main thread.
    *   **Auto-Cleanup:** Implement a `useEffect` cleanup return that calls `URL.revokeObjectURL()` for all preview blobs to prevent memory leaks.

### 4. Markdown Parsing Cost
**Rating: LOW**
*   **Finding:** Parsing 880+ exercise instructions on every render is wasteful.
*   **Optimization:**
    *   **Memoize Output:** Use `useMemo(() => <ReactMarkdown>{content}</ReactMarkdown>, [content])`.
    *   **Server-Side Pre-render:** Ideally, the API should return a `sanitizedHtml` field alongside the raw `markdown` to offload parsing to the backend/build-step.

### 5. Network Waterfall (Data Fetching)
**Rating: CRITICAL**
*   **Finding:** The plan suggests "Lazy-load deep data only when Teach Mode is open." If done sequentially (Fetch Exercise -> Open Sidebar -> Fetch Teach Data), the user sees multiple loading spinners.
*   **Optimization:**
    *   **Parallel Fetching:** Use a "Hover Intent" trigger. When a trainer hovers over an exercise in the Rolodex for >150ms, pre-fetch the `/api/exercises/:id/teach-mode` endpoint.
    *   **SWR/React Query:** Implement a stale-while-revalidate strategy with a 5-minute cache to make switching between previously viewed exercises instantaneous.

### 6. Image & Video Attachments
**Rating: MEDIUM**
*   **Finding:** Visual references (thumbnails/videos) in Tab 3 can trigger Layout Shift (CLS).
*   **Optimization:**
    *   **Aspect Ratio Boxes:** Use CSS `aspect-ratio: 16 / 9` on containers to reserve space before the image/video loads.
    *   **Canvas Thumbnails:** For user-uploaded form videos, generate 120px canvas thumbnails to avoid loading full-resolution video frames into memory.

### 7. Code Splitting Strategy
**Rating: MEDIUM**
*   **Finding:** The "Gamification," "Client Management," and "Scheduling" Teach Modes are context-specific.
*   **Optimization:**
    *   **Split by Domain:** Do not create one giant `TeachMode.tsx`. Create `ExerciseTeachMode.lazy.tsx`, `CoachTeachMode.lazy.tsx`, etc.
    *   **Shared Shell:** Use a lightweight `TeachModeShell` (the sidebar frame/tabs) that is part of the main bundle, but lazy-load the *content* based on the active route.

### 8. Animation Budget (GPU vs CPU)
**Rating: LOW**
*   **Finding:** Sidebar slide-ins and "Voice Orb" visualizations can drop frame rates if they trigger "Layout" or "Paint."
*   **Optimization:**
    *   **Transform/Opacity Only:** Use `transform: translateX()` for the sidebar slide-in. Avoid animating `width` or `left`.
    *   **Will-Change:** Apply `will-change: transform` to the Sidebar and Voice Orb to promote them to their own GPU layers.

---

### Summary of Recommended Architecture

| Feature | Strategy | Impact |
| :--- | :--- | :--- |
| **Data Fetching** | `GET /exercises/:id/details` (Separate from list) | **High** (Reduces initial payload) |
| **Markdown** | `React.lazy` + `useMemo` | **Medium** (Saves 60KB initial JS) |
| **Images** | `loading="lazy"` + `srcset` | **Medium** (Saves bandwidth) |
| **State** | `localStorage` for "Sidebar Open" preference | **Low** (UX consistency) |

**Final Verdict:** The plan is technically sound but must avoid "Hydration Mismatch" and "Bundle Bloat" by strictly isolating the Educational content from the Functional UI (the Planner/Scheduler) via **Dynamic Imports**.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
