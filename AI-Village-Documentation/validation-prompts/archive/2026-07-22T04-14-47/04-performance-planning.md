# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview | **Duration:** 9.4s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
> **Generated:** 7/21/2026, 9:14:47 PM

---

This performance review evaluates the **SwanGuard Refactor** and the **SwanStudios Photographic-Luxury Redesign** master plan.

### **Executive Summary**
The plan shifts from a "component-heavy" UI to an "asset-heavy" cinematic experience. While the refactor reduces DOM complexity by deleting ~100 buttons and collapsing 14 modules, the redesign introduces significant risks regarding **LCP (Largest Contentful Paint)** and **Memory Pressure** due to 4K imagery and video loops.

---

### **1. Bundle Size & Dependencies**
*   **New Libraries:**
    *   `framer-motion` (likely for "cinematic" transitions): ~30kB gzip.
    *   `lucide-react` (for the new ⌘K palette/nav): ~25kB gzip (tree-shaken).
    *   `canvas-video-player` or similar (for frame-scrubbing): ~5-10kB.
*   **Reductions:** Deleting 10 `actionRegistry` files and ~100 `data-action-id` buttons will significantly reduce the initial JS execution cost for the `CommandScreenDeck`.
*   **Strategy:** **HIGH PRIORITY.** The ⌘K palette and the "Owner Console" (now in Settings) must be `React.lazy()` loaded. The "Morning Brief" signature moment should be its own code-split chunk.
*   **Rating: MEDIUM**

### **2. Render Performance**
*   **Surfaces:** The "Today" brief and "Intel" feeds will now auto-load data previously hidden behind buttons.
*   **Strategy:** Use `React.memo` on the new "Status Cards" in the Today view. Since the plan calls for "National Geographic" style layouts, ensure that the CSS `grid` or `flex` layouts for these cards don't trigger layout thrashing during data hydration.
*   **Rating: LOW**

### **3. Memory & Media Handling**
*   **Risks:** "Ultra-4K" photography and "Seedance 2.0 cinematic loops" are memory-intensive.
*   **Optimization:**
    *   **Canvas Frame-Scrubbing:** For the hero video, do not use a `<video>` tag if possible; use the canvas-draw method mentioned in the plan to maintain control over memory buffers.
    *   **Image Decoding:** Use `decoding="async"` on all full-bleed imagery to prevent main-thread jank.
    *   **R2 Optimization:** Implement `srcset` for all 4K assets. Desktop gets 4K; mobile must capped at 1080p/720p.
*   **Rating: CRITICAL**

### **4. Expensive Computation**
*   **Derivations:** The "Action Diet" requires filtering ~60 contextual actions based on user state/permissions.
*   **Strategy:** Memoize the action filtering logic using `useMemo` based on the `user.permissions` and `activeSpace` dependencies to avoid recalculating the ⌘K list on every keystroke.
*   **Rating: LOW**

### **5. Network Waterfall**
*   **Data Flow:** Moving from "Load X" buttons to "Auto-load on mount" creates a massive parallel fetch spike on app initialization.
*   **Strategy:** **HIGH PRIORITY.** Implement a **BFF (Backend for Frontend) Aggregate Endpoint** for the "Today" space. Instead of 5 calls for Brief, Readiness, Alerts, etc., fetch a single `initial_briefing` payload. Use `stale-while-revalidate` caching for the Intel Wiki.
*   **Rating: HIGH**

### **6. Code Splitting**
*   **Boundaries:**
    *   `TodaySpace.tsx` (Eager)
    *   `IntelSpace.tsx` (Lazy)
    *   `FamilySpace.tsx` (Lazy)
    *   `OwnerSettings.tsx` (Lazy)
*   **Redesign:** The "Cinematic Hero" should be prioritized, but the "Store/Pricing" editorial pages must be separate chunks to keep the landing page TTI (Time to Interactive) low.
*   **Rating: MEDIUM**

### **7. Animation Budget**
*   **GPU Compositing:** The "Glass layers" and "Aurora Console" skins must use `backdrop-filter: blur()`. This is expensive on mobile.
*   **Fallback:** Provide a `reduced-motion` media query that swaps `backdrop-filter` for a solid `rgba` background and disables the "frame-scrub" video.
*   **Rating: HIGH**

---

### **Specific Optimization Requirements**

| Feature | Finding | Optimization |
| :--- | :--- | :--- |
| **4K Imagery** | **CRITICAL** | Implement `priority` hints on Hero images; use WebP/AVIF formats via R2/Cloudflare Polish. |
| **Auto-load Panels** | **HIGH** | Batch the 14-module-to-5-space transition into a single GraphQL or REST aggregate query to avoid 6+ concurrent TLS handshakes. |
| **Glass UI** | **MEDIUM** | Limit `backdrop-filter` to top-level containers only. Avoid nesting blurred elements, which causes exponential GPU paint cost. |
| **Action Registry** | **LOW** | Move the registry to a static JSON or constant file to ensure it is tree-shakable and doesn't bloat the main `App.tsx`. |

### **Engineer's Verdict**
The plan is performance-positive regarding **DOM size** (by purging the "button wall") but performance-negative regarding **Payload size** (due to the luxury redesign). **The aggregate endpoint (BFF) and a strict 4K-to-1080p responsive image strategy are mandatory to prevent the "luxury" look from feeling "sluggish."**

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
