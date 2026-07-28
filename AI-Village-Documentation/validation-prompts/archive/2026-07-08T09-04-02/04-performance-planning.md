# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.4s
> **Files:** docs/ai-workflow/brainstorms/user-dashboard-redesign-PLAN-for-village-2026-07-08.md
> **Generated:** 7/8/2026, 2:04:02 AM

---

As a Web Performance Engineer, I have reviewed the **"Enchanted Apex: Crystalline Swan" User Dashboard Redesign Plan**. The shift from a "widget landfill" to a unified core loop is a significant performance win, but the introduction of high-fidelity "Aurora Bloom" effects and media-heavy "Guide’s Notes" requires strict guardrails.

### 1. Bundle Size & Dependencies
**Tally:** The plan wisely avoids Three.js, but introduces new complexities.
*   **Victory Charts (Existing/Expanded):** ~150kB gzipped. *Optimization:* Ensure `victory-core` and specific chart types are imported, not the entire library.
*   **Framer Motion (Likely for "Aurora Bloom"):** ~30kB gzipped.
*   **Lucide-React (Icons for 6 surfaces):** ~25kB gzipped.
*   **Total New Weight:** ~55kB (assuming Victory is already present).

**[MEDIUM] Finding:** The "Guide’s Note" (Audio/Video) and "Reels" sub-tab introduce heavy media players.
*   **Optimization:** Lazy-load the Video Player component and the `Victory` chart logic for the "Ascension" tab. The Home feed should only load the `MiniChart` component, not the full Victory suite.

### 2. Render Performance
**[HIGH] Finding:** The "Ascension Rings" and "Aurora Bloom" are high-frequency UI updates.
*   **Strategy:** The rings (Ice Wing, Swan Lavender, Gilded Fern) must be isolated in a `MemoizedRing` component. Use `React.memo` with a custom comparator to prevent re-renders unless the specific workout `volume` or `streak` count changes.
*   **Virtualization:** The "Single-column feed" requires `react-window` or `react-virtuoso`. With "Quick Post" and "Mini-charts" in every card, a non-virtualized list of 50+ posts will cause significant scroll-jank on mid-tier mobile devices.

### 3. Memory & Lifecycle
**[CRITICAL] Finding:** "Guide’s Note" (15s video/audio) and "Reels" sub-tab.
*   **Risk:** Multiple video instances in a feed can lead to memory leaks and browser crashes on mobile.
*   **Optimization:** Implement a "Single Player Instance" pattern. Only the video in the viewport should have a source attached. Use `IntersectionObserver` to `null` the `src` of off-screen videos to flush them from the GPU memory buffer.

### 4. Expensive Computation
**[MEDIUM] Finding:** "Every visible number sourced from real workout data" for the Ascension Rings.
*   **Cost Analysis:** Calculating "Weekly Volume" and "Streak" from a raw workout array on every render is $O(n)$.
*   **Optimization:** Perform these calculations in the Selector/Redux layer or use `useMemo`. The "Aurora Bloom" radial-gradient math should be calculated once per "Save" event, not per frame.

### 5. Network Waterfall
**[HIGH] Finding:** The new IA requires data from multiple domains (Workouts, Social Feed, Trainer Notes, Challenges).
*   **Risk:** Sequential fetching (Fetch User -> Fetch Coach -> Fetch Note -> Fetch Feed) will lead to a "pop-in" effect.
*   **Optimization:** Create a **BFF (Backend for Frontend) Aggregate Endpoint** for the `Apex` Home surface. A single `GET /api/v1/dashboard/apex` should return:
    1.  Current Streak/Ring Data.
    2.  The latest `Guide's Note`.
    3.  The first 5 feed items.
*   **Caching:** Use `SWR` or `React Query` with a `stale-while-revalidate` strategy. The "Guide's Note" should be cached for 1 hour; the "Ascension Rings" should invalidate immediately upon workout save.

### 6. Media Handling
**[MEDIUM] Finding:** "Progress photo" and "15s-video" Guide's Note.
*   **Optimization:** The backend must generate **WebP/WebM** versions.
*   **Constraint:** Frontend must use `srcset` for the "Progress photo" to serve 400px widths for the feed, rather than the original high-res upload.

### 7. Code Splitting
**[LOW] Finding:** The 6 new surfaces represent clear boundaries.
*   **Proposed Split:**
    *   `Apex` (Home): Main bundle.
    *   `Ascension` (Progress): `React.lazy()` - contains heavy Victory logic.
    *   `The Flock` (Community/Reels): `React.lazy()` - contains video player logic.
    *   `The Arena` (Challenges): `React.lazy()`.

### 8. Animation Budget (Aurora Bloom)
**[HIGH] Finding:** "Elastic ring fill + CSS radial-gradient aurora."
*   **GPU Safety:** Ensure the "Aurora" uses `opacity` and `transform: scale()` only. **Never** animate `filter: blur()` or `box-shadow` as these trigger heavy Paint cycles on every frame.
*   **Reduced Motion:** The plan correctly identifies a fallback. Ensure the `prefers-reduced-motion` media query is applied via a `ThemeProvider` global style to disable the Aurora Bloom entirely for sensitive users.

---

### Summary of Performance Recommendations

| Feature | Priority | Optimization |
| :--- | :--- | :--- |
| **Data Fetching** | **CRITICAL** | Implement a `GET /apex` aggregate endpoint to prevent 4+ sequential round-trips. |
| **Feed Rendering** | **HIGH** | Virtualize the single-column feed; memoize `PostCard` to prevent re-renders on hashtag clicks. |
| **Aurora Bloom** | **HIGH** | Use CSS `will-change: transform` and avoid animating `filter: blur`. |
| **Guide's Note** | **MEDIUM** | Use `IntersectionObserver` to lazy-load and auto-pause video/audio assets. |
| **Theme Tokens** | **LOW** | Ensure all 18 themes are defined in a single CSS file to leverage browser caching of custom properties. |

**Verdict:** The plan is performance-sound *if* the "Aurora Bloom" is kept to CSS transforms and the data fetching is aggregated. The removal of external enrichment (NASA/iNaturalist) is a major latency win.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
