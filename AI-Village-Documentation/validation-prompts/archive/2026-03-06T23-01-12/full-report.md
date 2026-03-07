# SwanStudios Validation Report

> Generated: 3/6/2026, 3:01:12 PM
> Files reviewed: 10
> Validators: 7 succeeded, 1 errored
> Cost: $0.0994
> Duration: 225.7s
> Gateway: OpenRouter (single API key)

---

## Files Reviewed

- `frontend/src/hooks/useMediaPipe.ts`
- `frontend/src/hooks/useCamera.ts`
- `frontend/src/hooks/useBiomechanics.ts`
- `frontend/src/hooks/useFormAnalysisAPI.ts`
- `frontend/src/components/FormAnalysis/constants.ts`
- `frontend/src/components/FormAnalysis/VideoOverlay.tsx`
- `frontend/src/components/FormAnalysis/RepCounter.tsx`
- `frontend/src/components/FormAnalysis/FeedbackPanel.tsx`
- `frontend/src/components/FormAnalysis/FormAnalyzer.tsx`
- `frontend/src/components/FormAnalysis/UploadTab.tsx`

---

## Validator Summary

| # | Validator | Model | Tokens (in/out) | Duration | Status |
|---|-----------|-------|-----------------|----------|--------|
| 1 | UX & Accessibility | google/gemini-2.5-flash | 21,589 / 4,096 | 17.3s | PASS |
| 2 | Code Quality | anthropic/claude-4.5-sonnet-20250929 | 20,815 / 4,096 | 70.4s | PASS |
| 3 | Security | deepseek/deepseek-v3.2-20251201 | 21,170 / 1,822 | 56.0s | PASS |
| 4 | Performance & Scalability | google/gemini-3-flash-preview-20251217 | 21,620 / 1,378 | 11.0s | PASS |
| 5 | Competitive Intelligence | minimax/minimax-m2.1 | 17,718 / 2,667 | 64.5s | PASS |
| 6 | User Research & Persona Alignment | deepseek/deepseek-v3.2-20251201 | 0 / 0 | 180.0s | FAIL |
| 7 | Architecture & Bug Hunter | minimax/minimax-m2.5-20260211 | 18,010 / 8,443 | 90.7s | PASS |
| 8 | Frontend UI/UX Expert | google/gemini-3.1-pro-preview | 26,408 / 2,598 | 35.7s | PASS |

---

## [PASS] UX & Accessibility
**Model:** google/gemini-2.5-flash | **Duration:** 17.3s

Here's a UX and accessibility audit of the provided code, focusing on WCAG 2.1 AA compliance, mobile UX, design consistency, user flow friction, and loading states.

---

## UX and Accessibility Audit: SwanStudios Form Analysis

### 1. WCAG 2.1 AA Compliance

#### Color Contrast

*   **CRITICAL** `frontend/src/components/FormAnalysis/constants.ts` - `getScoreColor` function: The colors defined here (`#00FF88`, `#60C0F0`, `#FFB800`, `#FF6B35`, `#FF4757`) are used for text and UI elements. Their contrast against the dark cosmic theme background (`#002060` or similar dark blue/black) needs to be rigorously checked. Many vibrant colors, especially light blues and greens, often fail against dark backgrounds.
    *   **Recommendation:** Use a contrast checker tool (e.g., WebAIM Contrast Checker) to verify all color combinations. Adjust colors or add background elements to ensure a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text.
*   **HIGH** `frontend/src/components/FormAnalysis/RepCounter.tsx` - `Label` component: `color: rgba(224, 236, 244, 0.6);` against `background: rgba(0, 32, 96, 0.5);`. This transparent color might have insufficient contrast depending on the underlying content.
    *   **Recommendation:** Ensure the effective contrast ratio meets WCAG AA. Consider a slightly brighter or more opaque color for better readability.
*   **HIGH** `frontend/src/components/FormAnalysis/FeedbackPanel.tsx` - `Message` and `ScorePill` components: Text colors are derived from `severityColors` (e.g., `#60C0F0`, `#FFB800`, `#FF4757`, `#00FF88`). These need to be checked against their respective background colors (`rgba(..., 0.15)`).
    *   **Recommendation:** Verify contrast for all severity levels.
*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `PillButton` component: `color: rgba(224, 236, 244, 0.6);` for inactive state against `background: rgba(0, 32, 96, 0.3);`. This is likely to fail contrast requirements.
    *   **Recommendation:** Increase the opacity or brightness of the text color for inactive buttons.
*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `StatusText` and `ErrorText` components: `color: rgba(224, 236, 244, 0.7);` and `#FF4757` respectively, against `background: rgba(0, 32, 96, 0.9);`. The `StatusText` is likely to fail.
    *   **Recommendation:** Ensure sufficient contrast for all informational and error messages.
*   **HIGH** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `DropLabel` and `ExercisePill` (inactive) components: Similar to other transparent/low-opacity text, these are likely to have insufficient contrast.
    *   **Recommendation:** Verify and adjust colors.

#### Aria Labels & Semantics

*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `ActionButton` components: These buttons use single characters (`↩`, `↪`, `Ex`, `■`, `▶`, `0`) as their primary visual label. While `title` attributes are provided, these are not always sufficient for screen readers or users with cognitive disabilities.
    *   **Recommendation:** Add `aria-label` attributes that are more descriptive than the `title` for screen reader users. For example, `aria-label="Flip camera facing mode"`, `aria-label="Toggle exercise selection"`, `aria-label="Stop analysis"`, `aria-label="Start analysis"`, `aria-label="Reset rep count"`.
*   **MEDIUM** `frontend/src/components/FormAnalysis/RepCounter.tsx` - The rep counter and score display are visually distinct.
    *   **Recommendation:** Consider `aria-live` regions for dynamic updates to the rep count and score, so screen reader users are notified of changes. For example, `<CountDisplay aria-live="polite">`.
*   **MEDIUM** `frontend/src/components/FormAnalysis/FeedbackPanel.tsx` - `CueCard` components: These dynamically appear and disappear.
    *   **Recommendation:** Wrap the `Container` in an `aria-live="polite"` region to announce new feedback cues to screen reader users.
*   **MEDIUM** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `DropZone`: While it's visually clear, for screen reader users, it might be helpful to explicitly state its purpose.
    *   **Recommendation:** Add `role="button"` or `role="group"` with an `aria-label` like "Drag and drop or click to upload media for analysis."
*   **LOW** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `Video` element: While `muted` and `autoplay` are used, if the video contains any visual information crucial for understanding, it should have an `aria-label` or `aria-describedby` pointing to a description. In this case, it's a live camera feed, so perhaps less critical, but good to consider if it were pre-recorded.
    *   **Recommendation:** If the video ever shows pre-recorded content, ensure it has appropriate accessibility attributes.

#### Keyboard Navigation & Focus Management

*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `ExerciseSelector` and `PillButton` components: When `showExercises` is true, these buttons appear.
    *   **Recommendation:** Ensure that when `showExercises` becomes true, focus is programmatically moved to the first `PillButton` or a logical container for the exercise options. When `showExercises` becomes false, focus should return to the button that opened the selector.
*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `InitOverlay`: When this overlay appears, focus should be trapped within it until the user interacts with the "Start Analysis" or "Try Again" button.
    *   **Recommendation:** Implement focus trapping within the `InitOverlay` using a library or custom logic.
*   **MEDIUM** General: All interactive elements (`ActionButton`, `PillButton`, `StartButton`, `ExercisePill`, `SubmitButton`) should have clear visual focus indicators (e.g., `outline` or `box-shadow` on `:focus-visible`). Styled-components might override default browser outlines.
    *   **Recommendation:** Explicitly define focus styles for all interactive components.
*   **MEDIUM** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `DropZone`: If this is meant to be keyboard-interactive (e.g., pressing Enter to open file picker), it needs `tabIndex="0"` and an `onClick` handler that triggers the file input.
    *   **Recommendation:** Ensure keyboard users can activate the file upload.

### 2. Mobile UX

#### Touch Targets

*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `ActionButton` components: `min-width: 64px; min-height: 64px;`. These meet the 44px minimum touch target size.
    *   **Finding:** Meets requirement.
*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `PillButton` components: `min-height: 44px;`. These meet the 44px minimum touch target size.
    *   **Finding:** Meets requirement.
*   **HIGH** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `ExercisePill` components: `min-height: 44px;`. These meet the 44px minimum touch target size.
    *   **Finding:** Meets requirement.
*   **HIGH** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `SubmitButton`: `min-height: 56px;`. Meets requirement.
    *   **Finding:** Meets requirement.
*   **HIGH** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `DropZone`: While it's a large area, ensure the clickable area for triggering the file input is at least 44px.
    *   **Recommendation:** If the `DropZone` itself is the click target, its large size naturally covers the requirement. If there's an internal hidden input, ensure its label or the `DropZone`'s `onClick` covers a sufficient area.

#### Responsive Breakpoints

*   **MEDIUM** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `PageWrapper` uses `100vh` and `100dvh`. `100dvh` is good for mobile, accounting for dynamic toolbars.
    *   **Finding:** Good use of `100dvh`.
*   **MEDIUM** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `BottomBar`: `padding-bottom: max(12px, env(safe-area-inset-bottom));` is good for handling notches/safe areas.
    *   **Finding:** Good use of safe area insets.
*   **MEDIUM** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `ExerciseSelector`: `overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; &::-webkit-scrollbar { display: none; }`. This is a good pattern for horizontal scrolling on mobile.
    *   **Finding:** Good for horizontal scrolling.
*   **LOW** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `VideoContainer` and `Video`: `object-fit: cover;` is good for fitting the video to the container without distortion.
    *   **Finding:** Good video scaling.
*   **LOW** `frontend/src/components/FormAnalysis/FeedbackPanel.tsx` - `max-width: 360px; width: 90%;` for cue cards. This ensures they don't become too wide on larger screens, but also scale on smaller screens.
    *   **Finding:** Good responsive sizing for feedback.
*   **LOW** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `max-width: 600px; margin: 0 auto; width: 100%;`. This ensures the upload tab is centered and responsive.
    *   **Finding:** Good responsive sizing for upload tab.

#### Gesture Support

*   **MEDIUM** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `ExerciseSelector` uses `overflow-x: auto` which implies native scroll gestures.
    *   **Finding:** Native horizontal scroll gestures are supported.
*   **LOW** No explicit custom gestures (e.g., swipe to dismiss, pinch to zoom) are implemented, which is generally fine for a functional app unless specific interactions are designed around them.
    *   **Finding:** No custom gestures, which is acceptable.

### 3. Design Consistency

#### Theme Tokens

*   **HIGH** `frontend/src/components/FormAnalysis/constants.ts` - `OVERLAY_COLORS` and `getScoreColor` define specific colors (`#00FF88`, `#60C0F0`, `#FFB800`, `#FF6B35`, `#FF4757`, `rgba(96, 192, 240, 0.9)`, etc.). These appear to be hardcoded values rather than referencing a centralized theme object or CSS variables.
    *   **Recommendation:** Extract these colors into a `styled-components` theme object or CSS variables. This ensures all components use the same definitions, making global changes easier and reducing inconsistencies.
*   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - Many styled components (e.g., `PageWrapper`, `BottomBar`, `ActionButton`, `PillButton`, `InitOverlay`, `StartButton`) use hardcoded colors like `#002060`, `rgba(0, 32, 96, 0.7)`, `#60C0F0`, `rgba(96, 192, 240, 0.4)`, etc.
    *   **Recommendation:** Centralize all color definitions in a theme. This is crucial for maintaining a consistent "Galaxy-Swan dark cosmic theme" and for future theming capabilities.
*   **MEDIUM** `frontend/src/components/FormAnalysis/RepCounter.tsx` - `GlassPanel` and `ScoreBadge` use `rgba(0, 32, 96, 0.5)` for background. This is a common value, but should ideally come from a theme.
    *   **Recommendation:** Use theme tokens for all colors.
*   **MEDIUM** `frontend/src/components/FormAnalysis/FeedbackPanel.tsx` - `severityColors` object defines colors. While grouped, they are still hardcoded.
    *   **Recommendation:** Integrate these into the theme, possibly with a helper function that retrieves theme-defined severity colors.
*   **MEDIUM** `frontend/src/components/FormAnalysis/UploadTab.tsx` - Similar hardcoded colors for backgrounds, borders, and text.
    *   **Recommendation:** Use theme tokens.

#### Hardcoded Colors

*   **CRITICAL** As noted above, there are numerous hardcoded color values across all reviewed components. This is the primary design consistency issue.
    *   **Recommendation:** Implement a `styled-components` theme provider and define all colors (including `rgba` values) as theme tokens. Update all components to consume these tokens. This will also make it easier to ensure WCAG contrast compliance globally.

### 4. User Flow Friction

#### Unnecessary Clicks / Confusing Navigation

*   **MEDIUM** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - Exercise selection: The "Ex" button toggles the `ExerciseSelector` visibility. If a user frequently changes exercises, this might be an extra click.
    *   **Recommendation:** Consider if there's a more direct way to switch exercises, perhaps a long-press on the "Ex" button or a swipe gesture if appropriate. For now, it's acceptable, but keep in mind for power users.
*   **LOW** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - Initial state: User sees an overlay with "Start Analysis" button. This is a clear call to action.
    *   **Finding:** Clear initial call to action.
*   **LOW** `frontend/src/components/FormAnalysis/UploadTab.tsx` - Exercise selection: A grid of pills is good for discoverability.
    *   **Finding:** Clear exercise selection.

#### Missing Feedback States

*   **HIGH** `frontend/src/hooks/useMediaPipe.ts` and `useCamera.ts` - Error handling: Errors are caught and `error` state is set. `FormAnalyzer` displays `ErrorText`.
    *   **Finding:** Error feedback is present.
*   **MEDIUM** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - When `initialize()` or `startCamera()` are called, there's a loading spinner and "Loading AI pose model..." text.
    *   **Finding:** Loading feedback is present for initial setup.
*   **MEDIUM** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `isUploading` and `uploadProgress` are provided. A `ProgressBar` is shown.
    *   **Finding:** Upload progress feedback is present.
*   **MEDIUM** `frontend/src/components/FormAnalysis/FeedbackPanel.tsx` - Provides real-time coaching cues.
    *   **Finding:** Real-time feedback is present.
*   **LOW** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - Button states: `ActionButton` and `PillButton` have `:active` styles and `whileTap` animations. `StartButton` and `SubmitButton` have `:disabled` states.
    *   **Finding:** Good interactive feedback for buttons.

### 5. Loading States

#### Skeleton Screens

*   **LOW** Given the nature of a live camera feed, a skeleton screen for the video itself isn't applicable.
    *   **Finding:** Not applicable.

#### Error Boundaries

*   **CRITICAL** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `FormAnalyzerErrorBoundary`: This is an excellent implementation for handling unexpected errors within the component tree. It provides a user-friendly fallback message and a way to reload.
    *   **Finding:** Excellent use of Error Boundary.

#### Empty States

*   **MEDIUM** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - Initial `InitOverlay`: This serves as an empty state before analysis begins, guiding the user.
    *   **Finding:** Clear initial empty state.
*   **LOW** `frontend/src/components/FormAnalysis/VideoOverlay.tsx` - Handles `!landmarks` by clearing the canvas, effectively an "empty" state for the overlay.
    *   **Finding:** Handles empty landmark data gracefully.
*   **LOW** `frontend/src/components/FormAnalysis/RepCounter.tsx` - Displays `0` reps, which is a clear empty state for the counter.
    *   **Finding:** Clear empty state for rep counter.

---

### Summary and Key Recommendations:

The code demonstrates a strong foundation for a real-time form analysis system with thoughtful UX considerations like `dvh` units, safe area insets, and Framer Motion animations. The `ErrorBoundary` is a standout feature for robustness.

The most critical areas for improvement are:

1.  **WCAG 2.1 AA Color Contrast:** This needs a thorough audit and correction for all text and interactive elements, especially against the dark theme.
2.  **Design Consistency (Theme Tokens):** Centralizing

---

## [PASS] Code Quality
**Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 70.4s

# Code Review: SwanStudios Form Analysis Module

## CRITICAL Issues

### 1. **Missing Error Handling in Animation Loop**
**File:** `FormAnalyzer.tsx` (line 328)  
**Issue:** `runAnalysis` callback has no try/catch around `detectFrame` or `processLandmarks`. A single frame error will crash the entire analysis loop.

```tsx
// CURRENT (unsafe):
const result = detectFrame(videoRef.current, performance.now());
if (result) {
  setLandmarks(result.landmarks);
  const bio = processLandmarks(result.landmarks);
  // ...
}

// SHOULD BE:
try {
  const result = detectFrame(videoRef.current, performance.now());
  if (result) {
    setLandmarks(result.landmarks);
    const bio = processLandmarks(result.landmarks);
    // ...
  }
} catch (err) {
  console.error('[FormAnalyzer] Frame processing error:', err);
  // Optionally stop analysis or show error cue
}
```

**Impact:** Production runtime crash on any MediaPipe inference error.

---

### 2. **Stale Closure in `useBiomechanics.processLandmarks`**
**File:** `useBiomechanics.ts` (line 88)  
**Issue:** `processLandmarks` has empty dependency array but calls `updateRepState`, which is defined *outside* the callback and references `repPhaseRef`, `peakAngleRef`, etc. If `updateRepState` is ever redefined (e.g., via hot reload or future refactor), the closure will be stale.

```tsx
// CURRENT:
const processLandmarks = useCallback(
  (landmarks: NormalizedLandmark[]): BiomechanicsData | null => {
    // ...
    updateRepState(trackAngle); // ← calls function defined outside
    return data;
  },
  [] // ← empty deps
);

const updateRepState = useCallback((angle: number) => { /* ... */ }, []);
```

**Fix:** Include `updateRepState` in dependencies:
```tsx
const processLandmarks = useCallback(
  (landmarks: NormalizedLandmark[]): BiomechanicsData | null => {
    // ...
    updateRepState(trackAngle);
    return data;
  },
  [updateRepState] // ← add dependency
);
```

**Impact:** Rep counting may fail silently or use outdated logic after component updates.

---

### 3. **Race Condition in `useMediaPipe.initialize`**
**File:** `useMediaPipe.ts` (line 48)  
**Issue:** If `initialize()` is called twice rapidly (e.g., user clicks "Start" twice), the second call returns the *first* promise, but the first promise may have already resolved/rejected. The second caller won't know the actual state.

```tsx
// CURRENT:
if (landmarkerRef.current || initPromiseRef.current) {
  return initPromiseRef.current ?? Promise.resolve();
  // ↑ If landmarkerRef.current exists but initPromiseRef is null, returns resolved promise
  //   even if initialization actually failed
}
```

**Fix:**
```tsx
if (landmarkerRef.current) {
  return Promise.resolve(); // Already initialized
}
if (initPromiseRef.current) {
  return initPromiseRef.current; // In progress
}
```

**Impact:** Silent failures on rapid re-initialization attempts.

---

## HIGH Priority Issues

### 4. **Missing Cleanup in `FormAnalyzer` on Exercise Change**
**File:** `FormAnalyzer.tsx` (line 401)  
**Issue:** When user changes exercise, `resetReps()` is called but the animation frame loop continues running with the *old* tracking joint until the next frame processes.

```tsx
const handleExerciseChange = (exercise: typeof EXERCISES[number]) => {
  setSelectedExercise(exercise);
  setTrackingJoint(exercise.trackingJoint); // ← async state update
  resetReps();
  setShowExercises(false);
  // Animation loop still references old trackingJoint until next render
};
```

**Fix:** Cancel and restart the loop:
```tsx
const handleExerciseChange = (exercise: typeof EXERCISES[number]) => {
  if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  setSelectedExercise(exercise);
  setTrackingJoint(exercise.trackingJoint);
  resetReps();
  setShowExercises(false);
  if (isRunning && isReady && cameraActive) {
    animFrameRef.current = requestAnimationFrame(runAnalysis);
  }
};
```

---

### 5. **Hardcoded CDN URLs (Not Theme Tokens)**
**File:** `useMediaPipe.ts` (line 42), `constants.ts` (none)  
**Issue:** WASM CDN and model URLs are hardcoded strings, not configurable via environment or constants.

```tsx
// CURRENT:
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
// ...
modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/...'
```

**Fix:** Move to `.env` or a config file:
```ts
// config/mediapipe.ts
export const MEDIAPIPE_CONFIG = {
  WASM_CDN: process.env.REACT_APP_MEDIAPIPE_WASM_CDN || 'https://cdn.jsdelivr.net/...',
  MODEL_URL: process.env.REACT_APP_MEDIAPIPE_MODEL_URL || 'https://storage.googleapis.com/...',
} as const;
```

**Impact:** Cannot switch to self-hosted WASM/models without code changes.

---

### 6. **No Loading State for `useFormAnalysisAPI` Fetch Operations**
**File:** `useFormAnalysisAPI.ts` (line 60+)  
**Issue:** `fetchHistory`, `fetchAnalysis`, `reprocessAnalysis`, `fetchProfile` have no loading state. Consumers can't show spinners.

```tsx
// CURRENT:
const fetchHistory = useCallback(async (...) => {
  const response = await fetch(...);
  if (!response.ok) throw new Error('Failed to fetch history');
  return await response.json();
}, []);
```

**Fix:** Add loading state like `uploadMedia`:
```tsx
const [isFetching, setIsFetching] = useState(false);

const fetchHistory = useCallback(async (...) => {
  setIsFetching(true);
  try {
    const response = await fetch(...);
    if (!response.ok) throw new Error('Failed to fetch history');
    return await response.json();
  } finally {
    setIsFetching(false);
  }
}, []);

return { ..., isFetching };
```

---

### 7. **Inline Object Creation in Render (Performance)**
**File:** `FormAnalyzer.tsx` (line 485+)  
**Issue:** `style` prop with inline object created on every render:

```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
  style={{
    width: 48, height: 48, borderRadius: '50%',
    border: '3px solid rgba(96, 192, 240, 0.2)',
    borderTopColor: '#60C0F0',
  }} // ← new object every render
/>
```

**Fix:** Extract to styled component or `useMemo`:
```tsx
const SpinnerStyle = useMemo(() => ({
  width: 48, height: 48, borderRadius: '50%',
  border: '3px solid rgba(96, 192, 240, 0.2)',
  borderTopColor: '#60C0F0',
}), []);
```

---

### 8. **Missing `key` Prop in `SKELETON_CONNECTIONS` Map**
**File:** `VideoOverlay.tsx` (line 78)  
**Issue:** Loop over `SKELETON_CONNECTIONS` has no React key (not a list render, but still anti-pattern for debugging).

```tsx
for (const [a, b] of SKELETON_CONNECTIONS) {
  // Drawing operations — no key needed for canvas, but...
}
```

**Not critical** (canvas rendering, not React elements), but if this were JSX, it would be HIGH.

---

## MEDIUM Priority Issues

### 9. **DRY Violation: Duplicate `getAuthHeaders` Logic**
**File:** `useFormAnalysisAPI.ts` (line 37)  
**Issue:** `getAuthHeaders` is duplicated in every API hook. Should be extracted to a shared utility.

```tsx
// CURRENT (in useFormAnalysisAPI.ts):
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// SHOULD BE (utils/api.ts):
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
```

**Also applies to:** Any other API hooks in the codebase.

---

### 10. **Hardcoded Colors in `FeedbackPanel` (Not Theme Tokens)**
**File:** `FeedbackPanel.tsx` (line 39)  
**Issue:** `severityColors` object uses hardcoded RGBA values instead of theme tokens.

```tsx
// CURRENT:
const severityColors = {
  info: { bg: 'rgba(96, 192, 240, 0.15)', border: 'rgba(96, 192, 240, 0.3)', text: '#60C0F0' },
  // ...
};

// SHOULD BE (using styled-components theme):
const severityColors = {
  info: {
    bg: ({ theme }) => theme.colors.swanCyan + '26', // 15% opacity
    border: ({ theme }) => theme.colors.swanCyan + '4D', // 30% opacity
    text: ({ theme }) => theme.colors.swanCyan,
  },
  // ...
};
```

**Impact:** Cannot switch themes without code changes.

---

### 11. **No Abort Controller for Fetch Requests**
**File:** `useFormAnalysisAPI.ts` (all fetch calls)  
**Issue:** If component unmounts during a fetch, the promise continues and may call `setState` on unmounted component.

```tsx
// CURRENT:
const fetchHistory = useCallback(async (...) => {
  const response = await fetch(`/api/form-analysis/history?${params}`, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  // ...
}, []);

// SHOULD BE:
const fetchHistory = useCallback(async (...) => {
  const controller = new AbortController();
  try {
    const response = await fetch(`/api/form-analysis/history?${params}`, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    // ...
  } catch (err) {
    if (err.name === 'AbortError') return;
    throw err;
  }
}, []);
```

**Also:** Store controller in ref and abort on unmount.

---

### 12. **Magic Numbers in Biomechanics Calculations**
**File:** `useBiomechanics.ts` (line 150+)  
**Issue:** Thresholds like `5`, `10`, `3`, `25`, `30` are hardcoded. Should be constants.

```tsx
// CURRENT:
if (Math.abs(bio.kneeValgus.left) > 5) {
  quality[LANDMARK.LEFT_KNEE] = Math.abs(bio.kneeValgus.left) > 10 ? 'danger' : 'warning';
}

// SHOULD BE (in constants.ts):
export const BIOMECHANICS_THRESHOLDS = {
  KNEE_VALGUS_WARNING: 5,
  KNEE_VALGUS_DANGER: 10,
  SHOULDER_TILT_WARNING: 3,
  TORSO_LEAN_WARNING: 25,
  TORSO_LEAN_DANGER: 30,
} as const;
```

---

### 13. **Incomplete TypeScript: `any` in `FormAnalysisRecord.findings`**
**File:** `useFormAnalysisAPI.ts` (line 8)  
**Issue:** `findings`, `recommendations`, `coachingFeedback` are typed as `any`.

```tsx
// CURRENT:
interface FormAnalysisRecord {
  // ...
  findings: any;
  recommendations: any;
  coachingFeedback: any;
}

// SHOULD BE:
interface FormAnalysisRecord {
  findings: FormFinding[] | null;
  recommendations: Recommendation[] | null;
  coachingFeedback: CoachingFeedback | null;
}

interface FormFinding {
  joint: string;
  issue: string;
  severity: 'info' | 'warning' | 'error';
  timestamp?: number;
}
// ... etc.
```

---

### 14. **No Memoization for `EXERCISES` Array**
**File:** `FormAnalyzer.tsx` (line 24)  
**Issue:** `EXERCISES` is redefined on every render (though it's a const, so not a *huge* issue, but still anti-pattern).

```tsx
// CURRENT:
const EXERCISES = [
  { name: 'Squat', trackingJoint: 'leftKnee' as keyof JointAngles },
  // ...
] as const;

// SHOULD BE (outside component or in constants.ts):
const EXERCISES = [
  { name: 'Squat', trackingJoint: 'leftKnee' as const },
  // ...
] as const;
```

**Move to `constants.ts`.**

---

## LOW Priority Issues

### 15. **Inconsistent Error Messages**
**File:** `useCamera.ts` (line 75)  
**Issue:** Error message construction is inconsistent (some use template literals, some use string concatenation).

```tsx
// CURRENT:
if (message.includes('NotAllowedError') || message.includes('Permission')) {
  setError('Camera permission denied. Please allow camera access in your browser settings.');
} else if (message.includes('NotFoundError') || message.includes('DevicesNotFound')) {
  setError('No camera found on this device.');
} else {
  setError(`Camera error: ${message}`); // ← template literal
}

// SHOULD BE (consistent):
setError(`Camera error: ${message}`); // All use template literals
```

---

### 16. **Missing `aria-label` on Icon Buttons**
**File:** `FormAnalyzer.tsx` (line 456+)  
**Issue:** `ActionButton` components use emoji/symbols but no accessible labels.

```tsx
// CURRENT:
<ActionButton
  $variant="secondary"
  onClick={toggleFacing}
  whileTap={{ scale: 0.9 }}
  title="Flip camera" // ← title is good, but add aria-label
>
  {facingMode === 'user' ? '↩' : '↪'}
</ActionButton>

// SHOULD BE:
<ActionButton
  $variant="secondary"
  onClick={toggleFacing}
  whileTap={{ scale: 0.9 }}
  title="Flip camera"
  aria-label="Flip camera" // ← add for screen readers
>
  {facingMode === 'user' ? '↩' : '↪'}
</ActionButton>
```

---

### 17. **Console Logs in Production Code**
**File:** `useMediaPipe.ts` (line 73), `useCamera.ts` (line 82), `FormAnalyzer.tsx` (line 553)  
**Issue:** `console.error` calls should be wrapped in a logger utility for production filtering.

```tsx
// CURRENT:
console.error('[useMediaPipe] Initialization failed:', err);

// SHOULD BE:
import { logger } from '../../utils/logger';
logger.error('[useMediaPipe]

---

## [PASS] Security
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 56.0s

# Security Audit Report: SwanStudios Form Analysis Frontend

**Auditor:** Security Auditor  
**Date:** 2024-01-15  
**Application:** SwanStudios Personal Training SaaS  
**Scope:** Form Analysis Frontend Components (React + TypeScript)

## Executive Summary

The reviewed frontend code demonstrates good security practices in several areas but contains **CRITICAL** vulnerabilities in authentication handling and **HIGH** risks in data exposure. The primary concerns are JWT token storage in localStorage (vulnerable to XSS) and insufficient input validation for API parameters. The code shows strong client-side security hygiene with no `eval()` usage or exposed API keys.

---

## Detailed Findings

### 1. **CRITICAL - Insecure JWT Storage**
**Location:** `useFormAnalysisAPI.ts` - `getAuthHeaders()` function  
**Issue:** Authentication tokens stored in `localStorage` without secure flags, making them vulnerable to XSS attacks.  
**Impact:** Complete account compromise if XSS vulnerability exists elsewhere in the application.  
**Code Reference:**
```typescript
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');  // VULNERABLE
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
```
**Recommendation:** 
- Use `httpOnly` cookies for authentication tokens
- Implement refresh token rotation
- Store tokens in memory or secure session storage with short expiration
- Add CSRF protection for state-changing operations

### 2. **HIGH - Missing Input Validation**
**Location:** `useFormAnalysisAPI.ts` - `uploadMedia()` function  
**Issue:** User-controlled parameters (`exerciseName`, `cameraAngle`, `sessionId`, `trainerId`) are appended to FormData without validation.  
**Impact:** Potential for injection attacks if backend doesn't validate these fields.  
**Code Reference:**
```typescript
formData.append('exerciseName', exerciseName);  // NO VALIDATION
if (options?.cameraAngle) formData.append('cameraAngle', options.cameraAngle);
if (options?.sessionId) formData.append('sessionId', options.sessionId);
if (options?.trainerId) formData.append('trainerId', String(options.trainerId));
```
**Recommendation:**
- Implement Zod/Yup validation schemas for all API parameters
- Sanitize string inputs (exerciseName, cameraAngle)
- Validate numeric IDs are positive integers
- Implement allow-list validation for exercise names

### 3. **HIGH - Sensitive Data Exposure in Console**
**Location:** Multiple files - `console.error()` statements  
**Issue:** Detailed error messages with potentially sensitive information logged to browser console.  
**Impact:** Information disclosure during debugging; could leak PII or system details.  
**Code References:**
- `useMediaPipe.ts`: `console.error('[useMediaPipe] Initialization failed:', err);`
- `useCamera.ts`: `console.error('[useCamera] Failed to start camera:', err);`
- `FormAnalyzer.tsx`: `console.error('[FormAnalyzer] Error:', error, info);`
**Recommendation:**
- Implement structured logging with severity levels
- Strip PII and sensitive data from error messages
- Use environment-based logging (dev vs prod)
- Consider using a logging service instead of console

### 4. **MEDIUM - Missing CORS Configuration**
**Location:** All API calls in `useFormAnalysisAPI.ts`  
**Issue:** No CORS configuration visible in frontend; relies on backend configuration.  
**Impact:** Potential for misconfigured CORS allowing unauthorized domains.  
**Code Reference:** All `fetch()` calls lack CORS mode specification.  
**Recommendation:**
- Explicitly set CORS mode: `fetch(url, { mode: 'cors', credentials: 'include' })`
- Ensure backend CORS policy restricts origins to `sswanstudios.com` and subdomains
- Implement preflight request handling

### 5. **MEDIUM - Missing Content Security Policy (CSP)**
**Location:** Application-wide concern  
**Issue:** No CSP headers visible; critical for preventing XSS given localStorage token storage.  
**Impact:** Increased XSS risk due to lack of script source restrictions.  
**Recommendation:**
- Implement strict CSP with `script-src 'self'`
- Allow CDN sources explicitly: `https://cdn.jsdelivr.net`, `https://storage.googleapis.com`
- Use nonce or hash-based CSP for inline scripts
- Add `frame-ancestors 'none'` to prevent clickjacking

### 6. **LOW - Missing File Type Validation**
**Location:** `UploadTab.tsx` - ALLOWED_TYPES array  
**Issue:** Client-side validation only; can be bypassed.  
**Impact:** Users could upload malicious files if backend validation is insufficient.  
**Code Reference:**
```typescript
const ALLOWED_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'image/jpeg', 'image/png', 'image/webp',  // CLIENT-SIDE ONLY
];
```
**Recommendation:**
- Implement server-side MIME type validation
- Check file signatures (magic bytes)
- Set file size limits server-side
- Scan uploaded files for malware

### 7. **LOW - Missing Rate Limiting on Client**
**Location:** `useFormAnalysisAPI.ts` - `pollAnalysis()` function  
**Issue:** No client-side rate limiting for API polling.  
**Impact:** Could cause excessive server load if many clients poll aggressively.  
**Code Reference:**
```typescript
const pollAnalysis = useCallback(async (
  id: number,
  onUpdate: (analysis: FormAnalysisRecord) => void,
  intervalMs = 3000,  // FIXED INTERVAL, NO BACKOFF
  maxAttempts = 60
) => { ... }, [fetchAnalysis]);
```
**Recommendation:**
- Implement exponential backoff for polling
- Add jitter to prevent thundering herd
- Respect `Retry-After` headers from server
- Consider WebSockets for real-time updates

### 8. **LOW - Missing Error Boundary on Critical Hooks**
**Location:** `FormAnalyzer.tsx` - Missing error boundaries for hooks  
**Issue:** MediaPipe and camera hooks could crash entire component.  
**Impact:** Poor user experience; potential state corruption.  
**Recommendation:**
- Wrap individual hook usage in error boundaries
- Implement graceful degradation
- Add retry mechanisms for transient failures

## Positive Security Observations

1. **No `eval()` or `Function()` usage** - Good practice
2. **No exposed API keys or secrets** in client code
3. **TypeScript usage** provides compile-time safety
4. **No direct DOM manipulation** via `innerHTML` or similar
5. **Proper cleanup** of MediaStream and WebGL resources
6. **Input sanitization** for canvas rendering coordinates
7. **CORS-aware fetch** (though needs explicit configuration)

## Risk Summary

| Risk Level | Count | Primary Concerns |
|------------|-------|------------------|
| CRITICAL   | 1     | JWT in localStorage |
| HIGH       | 2     | Input validation, data exposure |
| MEDIUM     | 2     | CORS, CSP |
| LOW        | 3     | File validation, rate limiting, error handling |

## Immediate Actions Required

1. **CRITICAL:** Move JWT storage from localStorage to httpOnly cookies
2. **HIGH:** Implement input validation schemas for all API parameters
3. **HIGH:** Remove sensitive data from console logs
4. **MEDIUM:** Implement strict CSP headers
5. **MEDIUM:** Configure explicit CORS policies

## Long-term Recommendations

1. Implement proper authentication flow with refresh token rotation
2. Add comprehensive input validation using Zod schemas
3. Set up security headers (CSP, HSTS, X-Frame-Options)
4. Implement client-side rate limiting and exponential backoff
5. Add security testing to CI/CD pipeline
6. Consider implementing WebAuthn for passwordless authentication
7. Add audit logging for sensitive operations

## Files Requiring Immediate Attention

1. `useFormAnalysisAPI.ts` - Authentication and input validation
2. `FormAnalyzer.tsx` - Error handling and logging
3. Backend configuration for CORS and CSP headers

**Note:** This audit covers only frontend code. A comprehensive security review should include backend API endpoints, database configuration, and infrastructure security.

---

## [PASS] Performance & Scalability
**Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.0s

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

## [PASS] Competitive Intelligence
**Model:** minimax/minimax-m2.1 | **Duration:** 64.5s

Based on the provided codebase for SwanStudios, here is a structured product strategy analysis.

### 1. Feature Gap Analysis
While the provided code focuses heavily on the **Real-Time Form Analysis** engine (the "crown jewel"), it reveals gaps compared to established market leaders like Trainerize, TrueCoach, and Future.

*   **vs. Trainerize / TrueCoach (Business Management):**
    *   **Client Management & Programming:** There is no visible interface for Trainers to build workout programs, assign sets/reps, or manage client hierarchies.
    *   **Nutrition Tracking:** Missing meal logging, macro/calorie tracking, and grocery lists. These are the "sticky" features that increase retention in consumer fitness apps.
    *   **Payments & Invoicing:** No visible billing components (Stripe integration, subscription management).
*   **vs. Future / Caliber (High-End Coaching):**
    *   **Wearable Integration:** No syncing with Apple Watch, Whoop, or Garmin. Competitors use this data to auto-regulate workout intensity.
    *   **Habit & Behavior Coaching:** Lack of check-ins, mood tracking, or sleep integration (Caliber focuses heavily on recovery metrics).
*   **Missing in Core Form Analysis:**
    *   **Multi-Angle Analysis:** The current code processes a single video stream. Advanced systems (like V1 Labs or form check pro apps) allow side/front simultaneous analysis or 3D reconstruction.
    *   **Injury History Logic:** While "Pain-Aware" is a prompt requirement, the code `useBiomechanics.ts` currently just calculates angles. There is no logic to filter exercises based on a user's specific injury (e.g., "Don't let knees pass toes" if user has ACL pain).

---

### 2. Differentiation Strengths
The code provides a unique technological and experiential foundation that competitors lack.

*   **Edge-AI Live Analysis:** Unlike TrueCoach or Trainerize, which rely on asynchronous video uploads (or no form check at all), SwanStudios performs **real-time biomechanics in-browser**. This is a massive UX leap.
    *   *Evidence:* `useMediaPipe.ts` runs client-side (WASM), reducing server costs and latency.
    *   *Evidence:* `useBiomechanics.ts` calculates specific joint angles (knee valgus, torso lean) at 10fps locally.
*   **NASM-Aligned Biomechanics:** The hook explicitly calculates angles mapped to the NASM kinetic chain (Shoulder, Hip, Cervical). This appeals specifically to the certification-holding trainer market, not just general consumers.
*   **Galaxy-Swan UX:** The "Gemini Directive" UI (Neon wireframes, Glassmorphism, dark mode) is distinct. It feels like a "Pro Tool" rather than a generic fitness log. The `VideoOverlay` and `RepCounter` are visually high-end.

---

### 3. Monetization Opportunities
The current MVP covers the tool, but the revenue model can be expanded.

*   **Freemium Tiering:**
    *   **Free:** Live form check (webcam), limited to 3 analyses/day, "Galaxy" branding.
    *   **Pro ($14.99/mo):** Unlimited AI analysis, detailed PDF reports, upload high-res video for server-side processing.
*   **B2B Licensing (SaaS):**
    *   Sell the `useFormAnalysisAPI` engine to other fitness apps or gyms. Gyms pay a monthly fee to have this "AI Coach" on their iPads.
*   **Trainer Upsell:**
    *   A "Trainer Dashboard" where pros can watch clients' live sessions (WebRTC) and press a button to trigger specific voice cues (e.g., "Cut the depth") generated by the AI.
*   **Correctional Content:**
    *   Monetize the "Pain-Aware" feature. If the AI detects bad form, offer a $0.99 upsell for a "NASM Corrective Routine" video playlist to fix the issue.

---

### 4. Market Positioning
**Position:** The "AI-First" Strength Training Platform.

*   **Tech Stack:** React/Node is standard for SaaS, but the MediaPipe implementation is cutting-edge for client-side. Most competitors use server-side Python (OpenCV) which is slower and more expensive.
*   **Competitor Landscape:**
    *   *Trainerize* = Shopify for PTs (Great business tools, weak AI).
    *   *Future* = Luxury Concierge (Great hardware/human coaching, weak AI).
    *   **SwanStudios** = AI Biomechanics Engine (The most advanced "Eye" in the market).

---

### 5. Growth Blockers (Technical & UX)
Scaling to 10k+ users requires addressing these immediate friction points in the code.

1.  **Browser Compatibility & Performance:**
    *   The code uses `pose_landmarker_lite` (lowest latency). On older Android devices or iPhones with <4GB RAM, this will cause **thermal throttling** (phone gets hot, app crashes).
    *   *Fix:* Implement a "Low Power Mode" that drops resolution to 480p or reduces frame rate to 15fps to prevent overheating.
2.  **Privacy & Storage Costs:**
    *   `UploadTab` implies server-side storage. Storing raw video for thousands of users is expensive (AWS S3).
    *   *Fix:* Process video immediately on upload, extract keyframes/JSON data, and delete the raw video file within 24 hours to save costs.
3.  **UX Friction in Exercise Selection:**
    *   In `FormAnalyzer.tsx`, the exercise list is a horizontal scroll (`ExerciseSelector`). This is bad for discoverability (User has to scroll to find "Bicep Curl").
    *   *Fix:* Move to a grid or a searchable modal for 10k+ exercise scalability.
4.  **Single-User Focus:**
    *   The current `useCamera` hook and UI assume a single user. There is no logic for switching between "Trainer View" and "Client View" or handling multiple skeletons in frame (Group Training).
5.  **Reliability of "Feedback":**
    *   The feedback in `FormAnalyzer.tsx` (lines 180-200) uses hardcoded thresholds (`Math.abs(bio.kneeValgus.left) > 8`). This is brittle. A tall user might naturally have more valgus without it being "bad form."
    *   *Fix:* Needs a calibration phase ("Let's establish your baseline") or machine learning model to determine "normal" vs "compensated" for that specific user's body type.

---

## [FAIL] User Research & Persona Alignment
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 180.0s

Error: The operation was aborted due to timeout

---

## [PASS] Architecture & Bug Hunter
**Model:** minimax/minimax-m2.5-20260211 | **Duration:** 90.7s

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

## [PASS] Frontend UI/UX Expert
**Model:** google/gemini-3.1-pro-preview | **Duration:** 35.7s

As the Lead UI/UX Architect and Co-Orchestrator for SwanStudios, I have reviewed the implementation of the Form Analysis module. 

While the underlying logic (MediaPipe WASM, biomechanics math, custom hooks) is solid, the **visual execution is currently operating at a generic "dashboard" level, not a premium, $100/month fitness SaaS level.** The hardcoded muddy blues (`#002060`) completely miss our Galaxy-Swan dark cosmic aesthetic (`#0a0a1a`, `#00FFFF`, `#7851A9`). 

To justify our premium positioning against competitors like Apple Fitness+ and Peloton, this interface must feel like a **holographic, AI-powered HUD**. It needs deep space backgrounds, neon-cyan data visualizations, and buttery-smooth glassmorphic overlays.

Here are my authoritative design directives. Claude will use these exact specifications to rewrite the UI.

---

### DIRECTIVE 1: The Galaxy-Swan Cosmic Theme Enforcement
**Severity:** CRITICAL
**File & Location:** `frontend/src/components/FormAnalysis/constants.ts` & All Styled Components
**Design Problem:** The app uses hardcoded, low-contrast colors like `#002060` (muddy navy) and `rgba(0, 32, 96, 0.5)`. This destroys the brand identity and creates severe WCAG AA contrast failures.
**Design Solution:** We are moving to a strict "Deep Space & Neon" token system. The background must be an abyssal dark, allowing the neon UI elements to glow.

**Implementation Notes for Claude:**
1. Update `constants.ts` to export these exact tokens. Replace all hardcoded colors in the styled-components with these:
```typescript
export const SWAN_TOKENS = {
  space: '#0A0A1A', // Deep cosmic background
  spaceGlass: 'rgba(10, 10, 26, 0.6)', // For backdrop-filters
  neonCyan: '#00FFFF', // Primary Swan Cyan
  neonCyanMuted: 'rgba(0, 255, 255, 0.15)',
  neonPurple: '#7851A9', // Secondary Cosmic Purple
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  success: '#00FF88',
  warning: '#FFB800',
  danger: '#FF3366', // Brighter, more neon red than #FF4757
  glassBorder: 'rgba(255, 255, 255, 0.08)',
} as const;
```

---

### DIRECTIVE 2: The "Dynamic Dock" Action Bar
**Severity:** HIGH
**File & Location:** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` (BottomBar)
**Design Problem:** The current `BottomBar` is a full-width, blocky container attached to the bottom of the screen. It feels like a cheap mobile web wrapper.
**Design Solution:** Implement a floating, pill-shaped "Dynamic Dock" that hovers above the bottom edge. It must be safe-area aware and use heavy background blur.

**Implementation Notes for Claude:**
1. Rewrite the `BottomBar` styled-component:
```css
const FloatingDock = styled(motion.div)`
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: ${SWAN_TOKENS.spaceGlass};
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border: 1px solid ${SWAN_TOKENS.glassBorder};
  border-radius: 40px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
`;
```
2. Update `ActionButton` to have a minimum touch target of `48px` (sweaty gym hands need larger targets than the standard 44px). The primary "Start/Stop" button should be `64px` and pulse with a `box-shadow` when active.

---

### DIRECTIVE 3: Holographic Rep Counter & Score
**Severity:** HIGH
**File & Location:** `frontend/src/components/FormAnalysis/RepCounter.tsx`
**Design Problem:** The rep counter lacks visual hierarchy and the "premium AI" feel. The phase indicator is just a tiny dot.
**Design Solution:** The Rep Counter must look like a high-end telemetry widget. We will use a sweeping gradient border and a monospaced, glowing font for the numbers.

**Implementation Notes for Claude:**
1. Apply this specific CSS to the `GlassPanel`:
```css
const GlassPanel = styled.div`
  background: linear-gradient(145deg, rgba(10,10,26,0.8) 0%, rgba(10,10,26,0.4) 100%);
  backdrop-filter: blur(24px);
  border: 1px solid ${SWAN_TOKENS.glassBorder};
  border-radius: 24px;
  padding: 16px 24px;
  position: relative;
  overflow: hidden;
  
  /* Sweeping light effect on the top edge */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 20%; right: 20%;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${SWAN_TOKENS.neonCyan}, transparent);
    opacity: 0.5;
  }
`;
```
2. The `CountDisplay` must use `font-family: 'SF Pro Rounded', 'Inter', monospace;` with a text shadow: `text-shadow: 0 0 20px rgba(0, 255, 255, 0.4);`.
3. Animate the `PhaseIndicator` as a glowing progress ring around the number, not just a dot. (Claude: Implement an SVG circle with `stroke-dashoffset` tied to the phase, or a pulsing background glow behind the number).

---

### DIRECTIVE 4: Premium Mobile-First Exercise Selector
**Severity:** HIGH
**File & Location:** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` (`ExerciseSelector`)
**Design Problem:** A horizontally scrolling list of pills hovering above the action bar is clunky, blocks the camera, and is hard to use one-handed.
**Design Solution:** Replace the inline horizontal list with a sleek, drag-to-dismiss Bottom Sheet Modal.

**Implementation Notes for Claude:**
1. Remove the inline `ExerciseSelector`.
2. Create a new component `<ExerciseBottomSheet>` using Framer Motion.
3. Specs for the Bottom Sheet:
   - `drag="y"`, `dragConstraints={{ top: 0 }}`, `dragElastic={0.2}`
   - Background: `${SWAN_TOKENS.space}`
   - Border-top-left/right-radius: `32px`
   - Include a 40px x 4px drag handle at the top (`background: rgba(255,255,255,0.2); border-radius: 2px;`).
   - Render the exercises as a vertical list of large, touch-friendly rows (min-height: 64px) with a checkmark icon for the active state.

---

### DIRECTIVE 5: True Neon Wireframe Rendering
**Severity:** MEDIUM
**File & Location:** `frontend/src/components/FormAnalysis/VideoOverlay.tsx`
**Design Problem:** The canvas draws solid lines with a basic shadow. It looks like a debug view, not a consumer-facing AI HUD.
**Design Solution:** We need gradient lines that simulate energy flow, and multi-layered radial gradients for the joints to create a true "bloom" effect.

**Implementation Notes for Claude:**
1. In the `VideoOverlay` canvas drawing loop, replace the solid `ctx.strokeStyle` for the skeleton with a `createLinearGradient` between the two joint coordinates.
2. For the joints, draw *three* layers to create a cinematic bloom:
```javascript
// Layer 1: Large faint glow
ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();

// Layer 2: Core color
ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();

// Layer 3: White hot center
ctx.fillStyle = '#FFFFFF';
ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
```
3. Ensure the vignette overlay uses `#0A0A1A` instead of pure black `#000000` to maintain theme consistency.

---

### DIRECTIVE 6: Feedback Choreography & Accessibility
**Severity:** MEDIUM
**File & Location:** `frontend/src/components/FormAnalysis/FeedbackPanel.tsx`
**Design Problem:** Cues pop in and out, but lack semantic meaning for screen readers, and the colors fail contrast on dark backgrounds.
**Design Solution:** Implement `aria-live` regions for the cues, and adjust the severity colors to ensure WCAG AA compliance while maintaining the neon aesthetic.

**Implementation Notes for Claude:**
1. Wrap the `Container` in `<div aria-live="polite" aria-atomic="true">`.
2. Update `cueVariants` to include a slight 3D rotation on entry to make it feel like a HUD element snapping into place:
```javascript
const cueVariants = {
  initial: { opacity: 0, y: 40, scale: 0.9, rotateX: -15 },
  animate: { opacity: 1, y: 0, scale: 1, rotateX: 0 },
  exit: { opacity: 0, scale: 0.9, filter: 'blur(4px)' },
};
```
3. Ensure the text color inside the cues is ALWAYS `#FFFFFF` for readability, using the severity color ONLY for the border, the glowing dot, and a subtle background tint (`rgba(..., 0.1)`).

---

### Execution Mandate for Claude
Claude, as the Lead Software Engineer, you are to take these exact specifications and refactor the provided files. Do not deviate from the `SWAN_TOKENS` color palette. Prioritize the `FloatingDock` and the `ExerciseBottomSheet` as they are critical to the mobile-first UX. Ensure all Framer Motion animations use spring physics (`type: 'spring', stiffness: 300, damping: 25`) rather than linear tweens to maintain a premium, fluid feel.

---

## Aggregate Summary

### Critical Findings
**UX & Accessibility:**
- *   **CRITICAL** `frontend/src/components/FormAnalysis/constants.ts` - `getScoreColor` function: The colors defined here (`#00FF88`, `#60C0F0`, `#FFB800`, `#FF6B35`, `#FF4757`) are used for text and UI elements. Their contrast against the dark cosmic theme background (`#002060` or similar dark blue/black) needs to be rigorously checked. Many vibrant colors, especially light blues and greens, often fail against dark backgrounds.
- *   **LOW** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `Video` element: While `muted` and `autoplay` are used, if the video contains any visual information crucial for understanding, it should have an `aria-label` or `aria-describedby` pointing to a description. In this case, it's a live camera feed, so perhaps less critical, but good to consider if it were pre-recorded.
- *   **CRITICAL** As noted above, there are numerous hardcoded color values across all reviewed components. This is the primary design consistency issue.
- *   **CRITICAL** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `FormAnalyzerErrorBoundary`: This is an excellent implementation for handling unexpected errors within the component tree. It provides a user-friendly fallback message and a way to reload.
- The most critical areas for improvement are:
**Code Quality:**
- **Not critical** (canvas rendering, not React elements), but if this were JSX, it would be HIGH.
**Security:**
- The reviewed frontend code demonstrates good security practices in several areas but contains **CRITICAL** vulnerabilities in authentication handling and **HIGH** risks in data exposure. The primary concerns are JWT token storage in localStorage (vulnerable to XSS) and insufficient input validation for API parameters. The code shows strong client-side security hygiene with no `eval()` usage or exposed API keys.
- **Issue:** No CSP headers visible; critical for preventing XSS given localStorage token storage.
- 1. **CRITICAL:** Move JWT storage from localStorage to httpOnly cookies
**Performance & Scalability:**
- The architecture is well-decoupled, using a "Push-Pull" model where `useMediaPipe` handles the heavy lifting and `useBiomechanics` processes the data. However, there are **Critical** risks regarding memory management in the animation loops and **High** risks regarding bundle size and UI jank due to unoptimized canvas/state updates.
**Architecture & Bug Hunter:**
- This is a deep architectural review and bug hunt for the SwanStudios frontend. The codebase is generally well-structured for a React/TypeScript project, but several critical production issues, logic bugs, and architectural smells were identified.
- *   **Severity:** CRITICAL
- *   **Severity:** CRITICAL
- *   **Severity:** CRITICAL
**Frontend UI/UX Expert:**
- **Severity:** CRITICAL
- Claude, as the Lead Software Engineer, you are to take these exact specifications and refactor the provided files. Do not deviate from the `SWAN_TOKENS` color palette. Prioritize the `FloatingDock` and the `ExerciseBottomSheet` as they are critical to the mobile-first UX. Ensure all Framer Motion animations use spring physics (`type: 'spring', stiffness: 300, damping: 25`) rather than linear tweens to maintain a premium, fluid feel.

### High Priority Findings
**UX & Accessibility:**
- *   **HIGH** `frontend/src/components/FormAnalysis/RepCounter.tsx` - `Label` component: `color: rgba(224, 236, 244, 0.6);` against `background: rgba(0, 32, 96, 0.5);`. This transparent color might have insufficient contrast depending on the underlying content.
- *   **HIGH** `frontend/src/components/FormAnalysis/FeedbackPanel.tsx` - `Message` and `ScorePill` components: Text colors are derived from `severityColors` (e.g., `#60C0F0`, `#FFB800`, `#FF4757`, `#00FF88`). These need to be checked against their respective background colors (`rgba(..., 0.15)`).
- *   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `PillButton` component: `color: rgba(224, 236, 244, 0.6);` for inactive state against `background: rgba(0, 32, 96, 0.3);`. This is likely to fail contrast requirements.
- *   **HIGH** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` - `StatusText` and `ErrorText` components: `color: rgba(224, 236, 244, 0.7);` and `#FF4757` respectively, against `background: rgba(0, 32, 96, 0.9);`. The `StatusText` is likely to fail.
- *   **HIGH** `frontend/src/components/FormAnalysis/UploadTab.tsx` - `DropLabel` and `ExercisePill` (inactive) components: Similar to other transparent/low-opacity text, these are likely to have insufficient contrast.
**Code Quality:**
- **Not critical** (canvas rendering, not React elements), but if this were JSX, it would be HIGH.
**Security:**
- The reviewed frontend code demonstrates good security practices in several areas but contains **CRITICAL** vulnerabilities in authentication handling and **HIGH** risks in data exposure. The primary concerns are JWT token storage in localStorage (vulnerable to XSS) and insufficient input validation for API parameters. The code shows strong client-side security hygiene with no `eval()` usage or exposed API keys.
- 2. **HIGH:** Implement input validation schemas for all API parameters
- 3. **HIGH:** Remove sensitive data from console logs
**Performance & Scalability:**
- The architecture is well-decoupled, using a "Push-Pull" model where `useMediaPipe` handles the heavy lifting and `useBiomechanics` processes the data. However, there are **Critical** risks regarding memory management in the animation loops and **High** risks regarding bundle size and UI jank due to unoptimized canvas/state updates.
**Competitive Intelligence:**
- *   **vs. Future / Caliber (High-End Coaching):**
- *   **Galaxy-Swan UX:** The "Gemini Directive" UI (Neon wireframes, Glassmorphism, dark mode) is distinct. It feels like a "Pro Tool" rather than a generic fitness log. The `VideoOverlay` and `RepCounter` are visually high-end.
- *   **Pro ($14.99/mo):** Unlimited AI analysis, detailed PDF reports, upload high-res video for server-side processing.
**Architecture & Bug Hunter:**
- *   **Severity:** HIGH
- *   **Severity:** HIGH
**Frontend UI/UX Expert:**
- **Severity:** HIGH
- **Severity:** HIGH
- **Design Solution:** The Rep Counter must look like a high-end telemetry widget. We will use a sweeping gradient border and a monospaced, glowing font for the numbers.
- **Severity:** HIGH

---

*SwanStudios Validation Orchestrator v8.0 — AI Village Edition*
*7 Validators: Gemini 2.5 Flash + Claude 4.5 Sonnet + DeepSeek V3.2 x2 + Gemini 3 Flash + MiniMax M2.1 + MiniMax M2.5 + Gemini 3.1 Pro*
