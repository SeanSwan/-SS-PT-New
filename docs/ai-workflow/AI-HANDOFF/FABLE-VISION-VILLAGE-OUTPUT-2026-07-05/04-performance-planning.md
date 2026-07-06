# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.2s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

This performance review analyzes the **Fable Vision Master Build Brief v2**. As a web performance engineer, my focus is on ensuring the "award-winning" UI/UX does not degrade the 2026-era production metrics of SwanStudios.

### **Executive Summary: Performance Risk Profile**
The plan introduces significant complexity in **conditional logic (Next-Best-Action engine)** and **visual density (28 themes + expanded charts)**. The primary risks are **Main Thread Bloat** from the Victory chart expansion and **Network Waterfalls** from the fragmented nutrition/session data fetches.

---

### **1. Bundle Size & Dependency Tally**
The plan largely consolidates existing tools, but introduces specific new overhead:
*   **`framer-motion` (Proposed for Workstream A/I):** ~30kB gzip. Essential for the "award-winning" feel of the mobile bottom-sheets and chart expansions.
*   **`lucide-react` (Expanded set):** ~5kB (tree-shaken).
*   **`react-use-gesture` / `@use-gesture/react`:** ~7kB gzip. Necessary for the "pinch-zoom/scrub" on mobile charts (Workstream I).
*   **`date-fns` (if not present):** ~10kB. Required for the 12-month macro-plan logic (Workstream G).

**Optimization:** 
*   **CRITICAL:** The "50-chart gallery" (Workstream I) and "Theme Showcase" (Workstream A) must be **React.lazy()** boundaries. Users should not download the logic for 28 themes or 50 demo charts on the initial dashboard load.

---

### **2. Render Performance**
*   **Workstream B (Rolodex):** Virtualization is mentioned (`react-window`), which is correct for 736+ exercises. 
*   **Workstream H (Next-Best-Action):** This component will likely sit on the Dashboard. Since it derives data from multiple streams (Pain, History, Plan), it risks re-rendering on every heartbeat/socket update.
*   **Strategy:** Implement `React.memo` on the `NextBestActionCard` with a custom `areEqual` check that only triggers on `lastLoggedWorkoutId` or `planCursor` changes.

---

### **3. Memory & Lifecycle Risks**
*   **Workstream I (Chart Drill-down):** Opening high-density Victory charts in modals creates a memory spike. 
*   **Risk:** Victory components often leak if not unmounted correctly during rapid modal toggling.
*   **Optimization (MEDIUM):** Ensure the `ChartExpandModal` explicitly nullifies data references on unmount. Use `Canvas` rendering for Victory if the "drill-down" involves >1000 data points to avoid DOM node bloat.

---

### **4. Expensive Computation**
*   **Workstream A (Theme Clamping):** The plan suggests a "table-driven WCAG pass" using a luminance helper at runtime.
*   **Cost Analysis:** Calculating contrast for 28 themes × 15 tokens on every mount is wasteful.
*   **Optimization (HIGH):** Move the luminance clamping to a **Build-Time script** or a **Memoized Theme Provider**. The result should be a static CSS object, not a series of runtime calculations.

---

### **5. Network Waterfall Analysis**
The current data flow is fragmented (Workstream L, E, J).
*   **The Problem:** A client dashboard currently fetches `/api/macros`, `/api/workout-plans`, `/api/client/analytics`, and `/api/sessions` sequentially.
*   **Optimization (HIGH):** Implement a **BFF (Backend for Frontend) Aggregate Endpoint**: `GET /api/v1/dashboard/summary`. 
    *   This should return the Next-Best-Action, current session balance, and today's macro progress in a single round-trip.
    *   **Caching:** Use `SWR` or `React Query` with a 5-minute `stale-while-revalidate` window for the Rolodex (Workstream B) since exercise data is static.

---

### **6. Media Handling**
*   **Workstream B/E (Exercise/Food Photos):** 
*   **Risk:** High-res demo videos or food photos will tank the LCP (Largest Contentful Paint).
*   **Optimization (MEDIUM):** Implement a `SwanImage` component that uses `srcset` for thumbnails and `loading="lazy"`. For exercise videos, use a "Click-to-Play" poster image strategy to prevent the browser from pre-fetching heavy `.mp4` files on the Rolodex scroll.

---

### **7. Code Splitting Boundaries**
Proposed `React.lazy()` splits to keep the main bundle < 200kB:
1.  `components/modals/ChartExpandModal` (Workstream I)
2.  `components/theme/ThemeGridPicker` (Workstream A)
3.  `components/nutrition/GardenModule` (Workstream E)
4.  `components/admin/ProgramStudio` (Workstream G)

---

### **8. Animation Budget (GPU Compositing)**
*   **Dual-Button Glow:** Must use `filter: drop-shadow` or `box-shadow` on a pseudo-element (`::after`) with `opacity` transitions. 
*   **CRITICAL:** Avoid animating `background-color` or `border` directly, as these trigger Layout/Paint. 
*   **Reduced Motion:** All `framer-motion` components must check `window.matchMedia('(prefers-reduced-motion: reduce)')`.

---

### **Summary of Rated Findings**

| Finding | Rating | Optimization |
| :--- | :--- | :--- |
| **Theme Luminance Calc** | **HIGH** | Move runtime contrast clamping to a memoized build-step. |
| **Dashboard Fetching** | **HIGH** | Create a single aggregate endpoint for the 4 dashboard roles. |
| **Chart Modal Bloat** | **MEDIUM** | Lazy-load Victory modal; use Canvas for high-density drill-downs. |
| **Rolodex Media** | **MEDIUM** | Poster-image "Click-to-Play" for exercise videos. |
| **Next-Action Renders** | **LOW** | Memoize the recommendation engine output. |

**Engineer's Note:** The plan to consolidate the backend write paths (Workstream F) is the single best performance move for data integrity and reducing "ghost" state updates. Proceed with **Workstream G (P0)** first to stabilize the data schema before the UI remakes.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
