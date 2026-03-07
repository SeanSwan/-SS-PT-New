# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 90.7s
> **Files:** frontend/src/hooks/useMediaPipe.ts, frontend/src/hooks/useCamera.ts, frontend/src/hooks/useBiomechanics.ts, frontend/src/hooks/useFormAnalysisAPI.ts, frontend/src/components/FormAnalysis/constants.ts, frontend/src/components/FormAnalysis/VideoOverlay.tsx, frontend/src/components/FormAnalysis/RepCounter.tsx, frontend/src/components/FormAnalysis/FeedbackPanel.tsx, frontend/src/components/FormAnalysis/FormAnalyzer.tsx, frontend/src/components/FormAnalysis/UploadTab.tsx
> **Generated:** 3/6/2026, 3:01:12 PM

---

This is a deep architectural review and bug hunt for the SwanStudios frontend. The codebase is generally well-structured for a React/TypeScript project, but several critical production issues, logic bugs, and architectural smells were identified.

### **CRITICAL** (Ship Blockers)

#### 1. Hardcoded Production URLs & Unstable Dependencies
*   **Severity:** CRITICAL
*   **Files:** `useMediaPipe.ts` (Lines 62, 67), `useFormAnalysisAPI.ts` (Lines 77, 85, 92, 101), `constants.ts`
*   **What's Wrong:**
    *   **Line 62 (`useMediaPipe.ts`)**: `WASM_CDN` uses `@mediapipe/tasks-vision@latest/wasm`. Using `@latest` in production is dangerous; any breaking change in the library will break the app immediately without a code change.
    *   **Line 67**: `modelAssetPath` is hardcoded to a Google Cloud Storage bucket. If Google changes the bucket policy or path, the app breaks.
    *   **API Calls**: All API endpoints in `useFormAnalysisAPI.ts` use hardcoded `/api/...` paths. There is no environment variable for the base URL.
*   **Fix:**
    *   Move URLs to `.env` files (e.g., `REACT_APP_MEDIAPIPE_WASM_URL`, `REACT_APP_API_BASE`).
    *   Pin versions (e.g., `@mediapipe/tasks-vision@0.10.3`).

#### 2. Fake Upload Progress
*   **Severity:** CRITICAL
*   **File:** `useFormAnalysisAPI.ts` (Lines 55, 77)
*   **What's Wrong:** The code sets `setUploadProgress(0)` then `setUploadProgress(100)` in the `finally` block. The native `fetch` API does not provide upload progress events. For large video files, the UI will show "100%" immediately or stay at 0% then jump, providing no feedback to the user.
*   **Fix:** Replace `fetch` with `XMLHttpRequest` or `axios` to listen to `onuploadprogress` events.

#### 3. Memory Leak in Polling
*   **Severity:** CRITICAL
*   **File:** `useFormAnalysisAPI.ts` (Lines 104-119)
*   **What's Wrong:** The `pollAnalysis` function runs a `for` loop with `setTimeout`. If the user navigates away (component unmounts) while polling is active, the loop continues executing in the background. It will keep calling `fetchAnalysis` (wasting network) and `onUpdate` (calling `setState` on an unmounted component), causing React warnings and memory leaks.
*   **Fix:** Refactor `pollAnalysis` to be a `useEffect` inside the component or return a `cancel` function from the hook that clears the timeout/abort controller.

---

### **HIGH** (Functional Bugs)

#### 4. Rep Counter Logic Flaw
*   **Severity:** HIGH
*   **File:** `useBiomechanics.ts` (Lines 145-150)
*   **What's Wrong:** The rep counter logic assumes the user starts in the "start position" (e.g., standing).
    *   *Scenario:* User starts in a squatted position (e.g., 90 degrees). `peakAngleRef` is set to 90. The threshold is 30.
    *   To enter the `descending` phase, the code checks `if (angle < peakAngleRef.current - threshold)`.
    *   90 < (90 - 30) -> 90 < 60 is **False**.
    *   The user must stand up to trigger the first rep, but once they stand, the logic might count an incomplete rep, or they must manually hit "Reset Reps" to calibrate. If they start in the "bottom" position, the counter is unresponsive until they move.
*   **Fix:** Add a "calibration" state where the system detects the initial angle and sets `peak` or `valley` accordingly, or requires the user to hit "Start Reps" when in the starting position.

#### 5. Missing 401 Unauthorized Handling
*   **Severity:** HIGH
*   **File:** `useFormAnalysisAPI.ts` (Multiple locations)
*   **What's Wrong:** The hook reads the token from `localStorage` but does not check if it is expired. If the API returns a 401 (Unauthorized), the code throws a generic "Failed to fetch" error or "Analysis not found", confusing the user.
*   **Fix:** Check `response.status === 401`. If so, clear token, redirect to login, or show a "Session expired" message.

---

### **MEDIUM** (Architecture & Code Quality)

#### 6. God Component: FormAnalyzer.tsx
*   **Severity:** MEDIUM
*   **File:** `FormAnalyzer.tsx` (Entire file ~400 lines)
*   **What's Wrong:** This component handles camera initialization, MediaPipe initialization, the analysis animation loop, UI state (modals, buttons), and error boundaries. It violates the Single Responsibility Principle.
*   **Fix:** Extract logic into:
    *   `useAnalysisLoop` (custom hook for the RAF and processing)
    *   `AnalysisControls` (component for the bottom bar)
    *   `InitOverlay` (already exists but inline)

#### 7. Circular/Reverse Dependency
*   **Severity:** MEDIUM
*   **Files:** `useBiomechanics.ts` (Imports from `../components/FormAnalysis/constants.ts`)
*   **What's Wrong:** A **Hook** (`useBiomechanics`) is importing constants from a **Component** folder (`components/FormAnalysis`). This creates tight coupling. If the UI team changes constants, they might break the logic layer.
*   **Fix:** Move `constants.ts` to a shared `shared/constants.ts` or `types/` folder, or pass configuration as arguments to the hook.

#### 8. Duplicated Exercise Lists
*   **Severity:** MEDIUM
*   **Files:** `FormAnalyzer.tsx` (Line 66), `UploadTab.tsx` (Line 24)
*   **What's Wrong:** The list of exercises (`EXERCISES`) is defined in both the live analysis page and the upload page. This violates DRY.
*   **Fix:** Create a single source of truth: `const EXERCISES = [...]` in a shared file and import it.

---

### **LOW** (Minor Issues & Cleanup)

#### 9. Console Logs in Production
*   **Severity:** LOW
*   **Files:** `useMediaPipe.ts` (Line 73), `useCamera.ts` (Line 77)
*   **What's Wrong:** `console.error` is used for flow control (e.g., camera start failure). These should be removed or replaced with a proper logging service in production builds.
*   **Fix:** Wrap `console.error` in `if (process.env.NODE_ENV !== 'production')`.

#### 10. Potential Null Reference
*   **Severity:** LOW
*   **File:** `useCamera.ts` (Line 41)
*   **What's Wrong:** `videoRef.current.play()` is called, but if the video element is removed from the DOM (rare, but possible during rapid unmount/remount), this throws.
*   **Fix:** Add a check: `if (videoRef.current) { await videoRef.current.play(); }`.

#### 11. Unused Configuration
*   **Severity:** LOW
*   **File:** `useMediaPipe.ts` (Line 68)
*   **What's Wrong:** `delegate: 'GPU'` is hardcoded. On some mobile devices, this fails. The code catches the error, but it might be better to try 'GPU' and fall back to 'CPU' automatically or default to 'CPU' for broader compatibility.
*   **Fix:** Add logic to detect WebGL support or default to CPU.

---

*Part of SwanStudios 7-Brain Validation System*
