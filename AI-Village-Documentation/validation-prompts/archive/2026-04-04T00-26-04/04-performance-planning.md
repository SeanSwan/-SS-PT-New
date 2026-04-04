# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.4s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-BUILDER-OVERHAUL-PLAN.md
> **Generated:** 4/3/2026, 5:26:04 PM

---

This performance review focuses on the **Bootcamp Builder Overhaul**, specifically the integration of the 840+ exercise database, the AI Hive Mind, and the new multi-pane responsive UI.

---

### 1. Bundle Size: Markdown & Highlighting
**Rating: MEDIUM**
*   **Finding:** Adding `react-markdown`, `remark-gfm`, and `rehype-highlight` adds ~65-80KB (gzipped) to the main bundle. Since "Teach Me" mode and AI explanations are secondary to the actual builder, these should not block the initial load.
*   **Optimization:** 
    *   **Lazy Load:** Wrap the Markdown renderer in `React.lazy()` and load it only when a "Teach Me" toggle is activated or the AI Detail panel is opened.
    *   **Lightweight Alternatives:** Consider `snarkdown` or `micromark` if you don't need the full plugin ecosystem of Remark.

### 2. Render Performance: Exercise Rolodex & Preview
**Rating: HIGH**
*   **Finding:** With 840+ exercises and a 3-pane layout, the `ClassPreviewPanel` will re-render every time a user types in the `ExerciseRolodexPanel` search bar if state is managed at the parent level.
*   **Optimization:**
    *   **Virtualization:** Use `react-window` or `react-virtuoso` for the Exercise Rolodex list. Rendering 800+ DOM nodes with images/badges will cause significant input lag.
    *   **Memoization:** Wrap `ExerciseCard` and `StationCard` in `React.memo`. Use a selector-based state management (like Zustand or Redux) to ensure searching in the Rolodex doesn't trigger a diffing cycle on the Preview stations.

### 3. Voice Recording & AI Memory
**Rating: MEDIUM**
*   **Finding:** The "Voice-first AI coach" integration implies long-running audio streams. `MediaRecorder` stores data in blobs; if a trainer records a 55-minute session, this can consume hundreds of MBs of RAM.
*   **Optimization:**
    *   **Chunking:** Stream audio chunks to the backend/S3 every 5–10 seconds rather than holding one massive `Blob` in memory.
    *   **Cleanup:** Ensure `URL.revokeObjectURL()` is called on every preview/thumbnail generated to prevent memory leaks in the browser.

### 4. Markdown Parsing Cost
**Rating: LOW**
*   **Finding:** Parsing "Teach Me" content on every render is wasteful, especially during drag-and-drop operations in the builder.
*   **Optimization:**
    *   **Memoize Output:** Use `useMemo(() => <ReactMarkdown>{content}</ReactMarkdown>, [content])`.
    *   **Pre-parse:** For static "Teach Me" content, store the pre-rendered HTML in a constant file or fetch it as a JSON blob to bypass client-side parsing.

### 5. Network Waterfall: Data Fetching
**Rating: HIGH**
*   **Finding:** The plan mentions loading equipment profiles, exercise lists, and AI suggestions. If these are sequential (Fetch Profile -> Fetch Exercises -> Fetch AI), the UI will feel sluggish.
*   **Optimization:**
    *   **Parallelize:** Use `Promise.all()` to fetch the Exercise Registry and Equipment Profile simultaneously.
    *   **Stale-While-Revalidate:** Use `TanStack Query` (React Query) for the Exercise Rolodex. The 840+ exercise list is relatively static; cache it in `localStorage` or `IndexedDB` to allow instant "Manual Mode" access on return visits.

### 6. Image Attachments & Thumbnails
**Rating: MEDIUM**
*   **Finding:** 840+ exercises likely have thumbnails. Loading these all at once in the Rolodex will saturate the network tab.
*   **Optimization:**
    *   **Lazy Loading:** Use the native `loading="lazy"` attribute on exercise images.
    *   **Canvas Thumbnails:** For user-uploaded images/modifications, use a Canvas-based resizer on the client side before upload to ensure the "Preview" doesn't try to render a 10MB 4K photo of a squat rack.

### 7. Code Splitting Boundaries
**Rating: MEDIUM**
*   **Finding:** The "Admin" vs "Trainer" dashboard logic is merging.
*   **Optimization:**
    *   **Split by Role:** Use `React.lazy()` to split the `BootcampBuilder` from the main `TrainerDashboard`. 
    *   **Feature Split:** The `ExerciseRolodexPanel` should be its own chunk, as it contains the bulk of the search/filter logic and the exercise database metadata.

### 8. Animation Budget (GPU vs CPU)
**Rating: LOW**
*   **Finding:** The "Voice Orb" and "Sidebar Slide" animations can cause layout shifts (CLS) or jank if they trigger "Reflow."
*   **Optimization:**
    *   **GPU Only:** Use `transform: translateX()` for the sidebar and `opacity` for the AI thinking indicator. Avoid animating `width`, `height`, or `margin`.
    *   **Will-Change:** Apply `will-change: transform` to the Voice Orb to promote it to its own compositor layer.

---

### Summary of Recommendations

| Feature | Priority | Recommendation |
| :--- | :--- | :--- |
| **Exercise List** | **CRITICAL** | Implement **Virtual Scrolling** for the 840+ exercise database. |
| **Data Fetching** | **HIGH** | Use **React Query** to cache the exercise registry and prevent redundant API calls. |
| **Bundle Size** | **MEDIUM** | **Lazy load** `react-markdown` and the `ExerciseDetailPanel`. |
| **Responsiveness** | **MEDIUM** | Use **CSS Grid** for the 3-pane layout to avoid JS-heavy resize listeners. |
| **Memory** | **LOW** | Explicitly **revoke Object URLs** for exercise thumbnails and audio blobs. |

**Performance Score Estimate: 84/100** (Potential for 95+ with Virtualization and Parallel Fetching).

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
