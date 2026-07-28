# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview | **Duration:** 10.5s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md
> **Generated:** 7/17/2026, 12:24:21 PM

---

This performance review evaluates the **World-Switcher Marketing Redesign Plan** for SwanStudios.

### Performance Verdict: ADOPT WITH MODS
**Reason:** The "World-as-Data" architecture is highly scalable, but the plan risks a "Main Thread Death by 1,000 Gradients" if the `WorldLayer` isn't strictly virtualized or CSS-composited.

---

### 1. Bundle Size Tally
The plan introduces minimal logic but potentially heavy assets.
*   **New Libraries:** None explicitly named, but "World Switcher UI" implies a sophisticated picker. If using `framer-motion` (assumed via `SURFACE_MOTION_TIERS`), ensure it's the `dom-animation` subset.
*   **Estimated Gzip Impact:** ~15-25KB for the `WorldLayer` logic and `WorldSwitcher` UI.
*   **Lazy Loading Strategy:** 
    *   **CRITICAL:** `WorldLayer` must be `React.lazy()`. The marketing pages (Home, About) should not block the initial render of the `ChromeLayer` (functional UI).
    *   **HIGH:** The `WorldSwitcher` UI (the picker with previews) should be loaded only on user interaction (hover/click of the toggle).

### 2. Render Performance
*   **World Switcher Previews:** If the picker shows "tiny live previews" of 18 worlds, rendering 18 `WorldLayer` instances simultaneously will tank the frame rate.
    *   **Optimization:** Use static `webp` thumbnails for the switcher; only render the active `WorldLayer` in the background.
*   **React.memo Strategy:** The `ChromeLayer` must be wrapped in `React.memo`. It should never re-render when the `WorldLayer` (atmosphere) updates its internal animation state.
*   **Virtualization:** Not needed for lists, but **GPU Layer Promotion** is needed for the `WorldLayer`. Use `will-change: transform` to ensure the atmosphere doesn't trigger layout repaints.

### 3. Memory & Lifecycle
*   **Video Hero:** The plan mentions "teardown on unmount." 
    *   **Optimization:** Ensure the `<video>` element's `src` is set to `""` and `load()` is called on unmount to fully release the hardware decoder buffer in Chrome/Safari.
*   **Particle Layers:** If "World-appropriate particles" use Canvas, a single global `requestAnimationFrame` loop is required. Multiple canvas contexts for one "atmosphere" will leak memory on route transitions.

### 4. Expensive Computation
*   **Token Derivation:** Deriving 14+ CSS custom properties (`--world-*`) on every theme swap.
    *   **Optimization:** Memoize the `themeUtils.ts` injector. Use a single `style` tag injection or a root-level CSS variable block rather than updating styled-components props on every child.

### 5. Network Waterfall
*   **Sequential Risk:** `App` -> `ThemeContext` -> `WorldLayer` -> `Video/Poster`.
*   **Strategy:** 
    *   **Parallel:** Use `<link rel="preload">` for the `swans-poster.webp` and the *default* world's primary background asset in the HTML head.
    *   **Caching:** World definitions should be a static JSON manifest cached via Service Worker (Workbox).

### 6. Media Handling
*   **World-Graded Overlay:** This is a **HIGH** performance win. Using CSS `backdrop-filter` or an absolute-positioned overlay with `mix-blend-mode` is significantly cheaper than loading 18 different videos.
*   **Constraint:** `backdrop-filter` is expensive on mobile. Use a simple colored `opacity` overlay for M0/M1 tiers.

### 7. Code Splitting
*   **Split Boundaries:** 
    1.  `MarketingArc.chunk.js` (Home, About, Contact).
    2.  `WorldAssets.chunk.js` (The logic for the 10+ atmosphere types).
    3.  `Legal.chunk.js` (Waiver/Store - kept M0/lightweight).

### 8. Animation Budget
*   **GPU Compositing:** All "World" effects must be limited to `transform`, `opacity`, and `filter`. 
*   **Reduced Motion:** The plan correctly identifies `reduced-motion` static fallbacks. This must be enforced via a `usePrefersReducedMotion` hook that returns a null `WorldLayer`.

---

### Structured Risk Assessment

| Finding | Rating | Optimization |
| :--- | :--- | :--- |
| **P0 Build Break** | **CRITICAL** | **Blocker:** Fix `@zxing/browser` and `package-lock.json` before merging the `WorldLayer` architecture. |
| **Main Thread Jitter** | **HIGH** | Move particle/atmosphere math to a **Web Worker** or use pure CSS Keyframes to keep the main thread free for "Swan Coach" logic. |
| **LCP Delay** | **HIGH** | The "Swan Video" must have the `swans-poster.webp` (missing in plan) hardcoded in the HTML to prevent a white flash during JS hydration. |
| **Retired Purple Leak** | **MEDIUM** | Run a `grep` for `7851A9` and `rgba(120,81,169` as a pre-commit hook to prevent re-introduction. |
| **Over-Engineering** | **LOW** | Ensure the "World Switcher" doesn't load all 18 world assets at once. Use a "Hover-to-Hydrate" pattern. |

### The "Wow" Moment
The **"Signature Depth Beat"**: A scroll-scrubbed parallax where the Swan Video stays pinned while the `WorldLayer` (e.g., Glacier Cathedral) shifts its light-leaks and particles in 3D space around the video, creating a "Looking through a Crystalline Lens" effect.

### Sequencing Recommendation
1.  **Infra Fix:** Resolve P0 Build + P1 Purple Leak (The "Clean Slate").
2.  **Contract:** Implement `ChromeLayer` vs `WorldLayer` boundary with snapshot tests.
3.  **The Default:** Build the "Home" redesign using ONLY the default world (Swan Deep Field).
4.  **The Switcher:** Add the `WorldSwitcher` and additional world data as a secondary enhancement.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
