# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.4s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

As a Web Performance Engineer, I have reviewed the **Coach Command Center + PLAUD Unified Workflow** plan. While the functional logic is sound, the "all-in-one" nature of the Command Center poses significant risks to the **Interaction to Next Paint (INP)** and **Largest Contentful Paint (LCP)** on mobile devices (the target 300px-430px range).

### Executive Summary: Performance Rating
*   **Bundle Size:** HIGH RISK (Markdown + Highlighting + Audio Processing)
*   **Render Performance:** CRITICAL (Sidebar + Real-time AI streams + Queue updates)
*   **Memory Management:** MEDIUM (Audio buffers + Image previews)

---

### 1. Bundle Size & Dependency Strategy
**Finding: CRITICAL**
Adding `react-markdown`, `remark-gfm`, and `rehype-highlight` adds ~180KB (unzipped) to the main bundle. If these are in the main admin chunk, LCP for the Coach Command Center will suffer on 4G connections.

*   **Optimization:**
    *   **Lazy Load Markdown:** Wrap the message renderer in `React.lazy()`. The trainer doesn't need Markdown parsing until the first message arrives.
    *   **Lightweight Highlighting:** Use `lowlight` or a subset of `highlight.js` languages. Trainers likely only need JSON (for workout data) and plain text.
    *   **Dynamic Import:** Use `import('react-markdown')` only when a message contains markdown characters (`#`, `*`, `[`).

### 2. Render Performance (The "Chat Lag" Problem)
**Finding: HIGH**
The plan calls for a unified staging inbox + AI chat. React's default behavior will re-render the entire message list and the intake queue whenever a new token streams from the AI.

*   **Optimization:**
    *   **Memoization:** `React.memo` for `MessageItem` and `IntakeCard`. Use a stable key (UUID) rather than index.
    *   **Virtual Scrolling:** Use `react-window` or `virtuoso` for the conversation history. With 840+ exercises and long histories, the DOM node count will crash mobile Safari.
    *   **Atomic State:** Use a state manager (Zustand or signals) to update the "Thinking..." indicator without re-rendering the sidebar or the header.

### 3. Voice Recording & Memory Management
**Finding: MEDIUM**
The PLAUD workflow involves fetching audio and potentially local recording. `MediaRecorder` stores blobs in RAM.

*   **Optimization:**
    *   **Chunked Uploads:** Stream audio blobs to the backend/S3 in 5-second chunks rather than holding a 10-minute session in a single `Blob` object.
    *   **Cleanup:** Explicitly call `URL.revokeObjectURL()` for every preview/audio clip when the component unmounts or the item is cleared from the staging queue.

### 4. Markdown Parsing Cost
**Finding: LOW**
Parsing Markdown on every render is expensive during AI streaming (where the component renders 20-60 times per second).

*   **Optimization:**
    *   **Throttled Parsing:** Only re-parse the Markdown every 150ms during an active stream.
    *   **Memoize Output:** Use `useMemo` to store the parsed React tree of *completed* messages so only the "active" message is being parsed.

### 5. Network Waterfall & Data Fetching
**Finding: HIGH**
Phase 1 & 2 risk a "waterfall": Load Page -> Load User -> Load Conversations -> Load Messages -> Load Intake Queue.

*   **Optimization:**
    *   **Parallelize:** Use `Promise.all` in the `useEffect` or a React Query `useQueries` hook to fetch the `intake/queue` and `ai/conversations` simultaneously.
    *   **Prefetching:** Prefetch the first 5 messages of the top 3 conversations in the sidebar when the trainer hovers over the sidebar.

### 6. Image Attachments & Thumbnails
**Finding: MEDIUM**
Trainers uploading "Form Check" photos or transcript screenshots.

*   **Optimization:**
    *   **Canvas Downsampling:** Before uploading, use a hidden `<canvas>` to generate a 200px WebP thumbnail locally. Display this immediately to provide "Instant UI" while the high-res original uploads in the background.
    *   **CSS:** Use `aspect-ratio` and `object-fit: cover` to prevent Layout Shift (CLS) when images load.

### 7. Code Splitting Boundaries
**Finding: MEDIUM**
The "Crystalline Swan" theme uses heavy styled-components.

*   **Proposed Split Points:**
    *   `PlaudMergeWorkspace`: Separate chunk. Only loaded when `workspace=plaud`.
    *   `ClientResolver`: Separate chunk. Only loaded when an intake item needs a "Stub Client."
    *   `WorkoutLogProposal`: Separate chunk. Only loaded when the "Approve" modal is triggered.

### 8. Animation Budget (GPU vs CPU)
**Finding: LOW**
The "Voice Orb" and "Thinking Indicator" can cause high CPU usage, draining the trainer's phone battery during a session.

*   **Optimization:**
    *   **GPU Only:** Use `transform: scale()` and `opacity` for the Voice Orb. Avoid animating `width`, `height`, or `box-shadow` (which trigger Layout/Paint).
    *   **Will-Change:** Apply `will-change: transform` to the sidebar slide-in animation to promote it to a GPU layer.

---

### Implementation Priority & Rating

| Feature | Risk | Optimization |
| :--- | :--- | :--- |
| **Markdown Bundle** | **CRITICAL** | Lazy load `react-markdown` + `rehype`. |
| **Message List** | **HIGH** | Implement `react-virtuoso` for the chat history. |
| **State Management** | **HIGH** | Use `Zustand` to decouple AI stream from the Intake Queue UI. |
| **Audio Memory** | **MEDIUM** | `URL.revokeObjectURL` on all PLAUD clips. |
| **Layout Shift** | **LOW** | Set explicit heights for the "Fixed Bottom Dock." |

### Recommended First Slice (Performance-First)
1.  **Wire `useAIChat` to the existing UI** but wrap the message content in a `Suspense` boundary for the Markdown renderer.
2.  **Implement the "Staging Inbox"** using a CSS Grid layout that collapses to a single column on mobile, ensuring no horizontal overflow (Non-negotiable check).
3.  **Enable SWR (Stale-While-Revalidate)** for the Intake Queue so the trainer sees "cached" data immediately while the fresh queue fetches in the background.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
