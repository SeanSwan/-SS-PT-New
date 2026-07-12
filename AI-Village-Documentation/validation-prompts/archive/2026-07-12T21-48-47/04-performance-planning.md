# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.1s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

This performance review evaluates the **Jarvis Swan OS** plan against the production constraints of **SwanStudios**.

### Executive Summary
The plan introduces significant architectural complexity, specifically with **React Three Fiber (R3F)** for Swan World and **Victory Chart** proliferation via the AI Coach. While the "Golden Pair" Lens v2 engine optimizes CSS delivery, the addition of 3D runtimes and real-time AI chat streams poses a risk to the "ultra-mobile" performance mandate.

---

### 1. Bundle Size Analysis
**Finding: HIGH IMPACT**
The plan introduces several heavy-weight categories.
*   **Swan World (R3F Stack):** `three` (~600kB), `@react-three/fiber` (~20kB), `@react-three/drei` (~60kB). Total Gzip: **~150kB+**.
*   **AI Coach (Streaming/Voice):** `lucide-react` (if new icons), potentially `markdown-it` or `react-markdown` for chat formatting (~15kB), and Web Speech API wrappers.
*   **Wearables (OAuth/API):** Minimal (mostly backend), but adds to the Node.js dependency tree.

**Optimization:**
*   **CRITICAL:** Swan World must be a separate entry point or heavily code-split. Do not include `three.js` in the main `vendor.js` chunk.
*   **MEDIUM:** Use `three-stdlib` and tree-shaking to only include necessary geometries/materials.

### 2. Render Performance
**Finding: MEDIUM IMPACT**
*   **Workout Logger/Planner (P0):** These are complex forms. Converting them to "Lens-aware" primitives means every input/row will be reading from a `ThemeContext` or CSS Custom Properties.
*   **AI Chat Bubbles:** Rendering `SafeChart` (Victory) inside chat bubbles is expensive. Victory charts are SVG-heavy.

**Optimization:**
*   **React.memo:** Apply to `ChartCard` and `WorkoutRow` components. Since themes use CSS variables, the React tree doesn't need to re-render when a theme toggles—only the CSS variables on `:root` change.
*   **Virtualization:** The "Exercise Rolodex" and "Workout Logger" (for long sessions) **require** `react-window` or `virtuoso` to maintain 60fps on P1-tier mobile devices.

### 3. Memory Management
**Finding: HIGH IMPACT**
*   **Swan World (3D):** 3D textures and geometries stay in GPU memory.
*   **Voice-First (TTS/STT):** Audio buffers can leak if listeners aren't cleaned up on component unmount.

**Optimization:**
*   **Dispose Pattern:** Use `<Suspense>` for 3D assets and ensure `geometry.dispose()` and `material.dispose()` are called in R3F `useEffect` cleanups.
*   **Asset Tiering:** Load low-poly models for mobile (P1-P5) and high-poly only for desktop/high-end (P12+).

### 4. Expensive Computation
**Finding: LOW IMPACT**
*   **Lens Compiler v2:** The plan mentions a "compiler/whatChanged" logic. If this runs on every keystroke in the Lab, it will lag.

**Optimization:**
*   **Memoize the Manifest:** Use `useMemo` for the result of the Lens compiler.
*   **Web Workers:** If the "axes-diff" calculation for 25+ themes is heavy, move it to a Web Worker to keep the UI thread free for animations.

### 5. Network Waterfall
**Finding: MEDIUM IMPACT**
*   **Coach Data Fetching:** "Chart my squat volume vs sleep" requires multi-resource fetching (Workouts + Wearables).

**Optimization:**
*   **BFF (Backend for Frontend):** Create a `GET /api/v1/coach/visualize` endpoint that aggregates these data sources on the server to avoid client-side waterfalls.
*   **SWR/React Query:** Implement for the "Workout Rolodex" to cache exercise definitions locally.

### 6. Media Handling
**Finding: MEDIUM IMPACT**
*   **Swan World Assets:** GLB/GLTF files.
*   **Video Library:** Lens analysis on video.

**Optimization:**
*   **Draco Compression:** All 3D assets must be `.glb` with Draco compression (reduces size by ~70%).
*   **Lazy Video:** Use `IntersectionObserver` to only initialize video players/lens-overlays when they enter the viewport.

### 7. Code Splitting Strategy
**Finding: CRITICAL**
The app is growing too large for a single-page bundle.

**Proposed Boundaries:**
1.  **`WorldChunk`**: Everything in §7 (Swan World).
2.  **`CoachChunk`**: The Jarvis chat interface and custom chart builder.
3.  **`AdminChunk`**: Workout Planner and Plan Library (not needed by clients).
4.  **`VictoryChunk`**: Victory charts are heavy; lazy-load them so the initial "Schedule Strip" loads instantly.

### 8. Animation Budget
**Finding: LOW IMPACT**
*   **Dual-Button Glow:** Uses `box-shadow` or `filter: drop-shadow`.

**Optimization:**
*   **GPU Acceleration:** Ensure the "purple glow" uses `will-change: transform` or animates `opacity` of a pseudo-element rather than animating the `box-shadow` property directly (which triggers layout/paint).
*   **Reduced Motion:** Use `window.matchMedia('(prefers-reduced-motion: reduce)')` to disable the "morph beat" for sensitive users.

---

### Summary of Ratings & Actions

| Feature | Risk | Optimization |
| :--- | :--- | :--- |
| **Swan World (3D)** | **CRITICAL** | Draco compression + separate entry point. |
| **AI Coach Charts** | **HIGH** | Virtualize chat list; memoize SVG charts. |
| **Lens v2 Rollout** | **MEDIUM** | Use CSS Variables to prevent React re-renders on theme swap. |
| **Wearables Sync** | **LOW** | Move aggregation to Node.js BFF. |

**Engineer's Verdict:** The plan is feasible but requires a **"3D-Is-Optional"** architecture. If the R3F bundle loads on the landing page, Lighthouse scores will plummet, hurting SEO and conversion. **Swan World must be an opt-in load.**

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
