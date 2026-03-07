# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.0s
> **Files:** frontend/src/hooks/useMediaPipe.ts, frontend/src/hooks/useCamera.ts, frontend/src/hooks/useBiomechanics.ts, frontend/src/hooks/useFormAnalysisAPI.ts, frontend/src/components/FormAnalysis/constants.ts, frontend/src/components/FormAnalysis/VideoOverlay.tsx, frontend/src/components/FormAnalysis/RepCounter.tsx, frontend/src/components/FormAnalysis/FeedbackPanel.tsx, frontend/src/components/FormAnalysis/FormAnalyzer.tsx, frontend/src/components/FormAnalysis/UploadTab.tsx
> **Generated:** 3/6/2026, 3:01:12 PM

---

This review focuses on the performance, scalability, and stability of the **SwanStudios** Form Analysis engine.

### Executive Summary
The architecture is well-decoupled, using a "Push-Pull" model where `useMediaPipe` handles the heavy lifting and `useBiomechanics` processes the data. However, there are **Critical** risks regarding memory management in the animation loops and **High** risks regarding bundle size and UI jank due to unoptimized canvas/state updates.

---

### 1. Bundle Size & Loading Impact

| Finding | Severity | Description |
|:---|:---|:---|
| **Heavy MediaPipe Chunks** | **HIGH** | `useMediaPipe.ts` uses dynamic `import('@mediapipe/tasks-vision')`. While this helps initial load, the WASM and Model assets are fetched from external CDNs (`jsdelivr`, `googleapis`). If these CDNs are slow or blocked, the feature fails. |
| **Tree-shaking Blockers** | **MEDIUM** | The `EXERCISES` constant in `FormAnalyzer.tsx` and `UploadTab.tsx` is duplicated. Large constant files should be centralized to allow better minification and prevent redundant memory allocation. |
| **Framer Motion Weight** | **LOW** | `framer-motion` is used for simple spring animations. Ensure the `m` component and `LazyMotion` are used globally to reduce the 30kb+ bundle hit. |

**Recommendation:** Host the MediaPipe WASM and `.task` files on your own S3/CDN to ensure version consistency and better cache control.

---

### 2. Render Performance & UI Jank

| Finding | Severity | Description |
|:---|:---|:---|
| **State-Induced Lag** | **CRITICAL** | In `FormAnalyzer.tsx`, `setLandmarks(result.landmarks)` is called inside a `requestAnimationFrame` (60fps). This triggers a full React re-render of the `FormAnalyzer` and its children 60 times per second. |
| **Canvas Redraw Overhead** | **HIGH** | `VideoOverlay.tsx` uses a `useEffect` that clears and redraws the entire skeleton every time `landmarks` (state) changes. React's reconciliation overhead at 60fps will cause dropped frames on mid-tier mobile devices. |
| **Unthrottled Feedback** | **MEDIUM** | `addCue` is called inside the analysis loop. Although it checks for duplicates, the logic still runs every frame. |

**Recommendation:** 
1. **Remove `landmarks` from React State.** Use a `Ref` to store landmarks.
2. Move the Canvas drawing logic into a dedicated loop inside `VideoOverlay` using its own `requestAnimationFrame`, reading directly from the `Ref`. This bypasses the React render cycle entirely for the HUD.

---

### 3. Network Efficiency

| Finding | Severity | Description |
|:---|:---|:---|
| **Polling Inefficiency** | **HIGH** | `pollAnalysis` in `useFormAnalysisAPI.ts` uses a hardcoded `setTimeout` loop. This is inefficient and doesn't handle tab-backgrounding well. |
| **Missing Upload Progress** | **MEDIUM** | The `uploadMedia` function uses `fetch`. Standard `fetch` does not support upload progress tracking. The `uploadProgress` state is currently hardcoded to `0` then `100`. |

**Recommendation:** 
1. Use **WebSockets** or **Server-Sent Events (SSE)** for analysis completion notifications instead of polling.
2. Switch to `XMLHttpRequest` or `axios` for the upload to provide real-time progress to the `ProgressFill` component.

---

### 4. Memory Leaks & Resource Management

| Finding | Severity | Description |
|:---|:---|:---|
| **Zombie Animation Frames** | **CRITICAL** | In `FormAnalyzer.tsx`, `runAnalysis` is a `useCallback` that references `isReady`. If `isReady` changes, a new `runAnalysis` is created, but the old `requestAnimationFrame` might still be running, leading to multiple overlapping loops. |
| **Event Listener Leak** | **MEDIUM** | `useCamera.ts` has a `useEffect` for `enumerateDevices` but doesn't handle the case where the component unmounts before the promise resolves. |
| **WASM Memory** | **MEDIUM** | `landmarkerRef.current.close()` is called, which is good, but `FilesetResolver` resources are not explicitly cleared. |

**Recommendation:** Use a `useRef` for a "running" boolean flag. Ensure `cancelAnimationFrame` is called immediately before starting a new one to guarantee a singleton loop.

---

### 5. Scalability & Logic Errors

| Finding | Severity | Description |
|:---|:---|:---|
| **In-Memory Rep State** | **MEDIUM** | `repState` is stored in local component state. If a user accidentally refreshes or the app crashes mid-set, all data is lost. |
| **Coordinate Scaling** | **MEDIUM** | `VideoOverlay` assumes `landmarks` are always 0.0-1.0 (normalized). If the video aspect ratio doesn't match the canvas aspect ratio, the skeleton will be offset (letterboxing issues). |
| **N+1 History Fetching** | **LOW** | `fetchHistory` returns a list, but there is no pre-fetching for the individual analysis details, leading to multiple clicks/requests when browsing. |

**Recommendation:** Implement a simple `localStorage` sync for the current session's rep count so it persists through accidental refreshes.

---

### Structured Action Plan

1.  **Immediate (Performance):** Refactor `VideoOverlay` to use a `Ref` for landmarks and an internal `requestAnimationFrame` loop. Stop using `useState` for frame-by-frame data.
2.  **Stability:** Fix the `requestAnimationFrame` race condition in `FormAnalyzer` by ensuring only one loop can exist.
3.  **UX:** Replace `fetch` with `XMLHttpRequest` in `useFormAnalysisAPI` to make the `ProgressBar` actually work.
4.  **Optimization:** Move `EXERCISES` and `LANDMARK` constants to a shared `@swan/constants` package or a top-level config file to improve tree-shaking.

---

*Part of SwanStudios 7-Brain Validation System*
