# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 70.4s
> **Files:** frontend/src/hooks/useMediaPipe.ts, frontend/src/hooks/useCamera.ts, frontend/src/hooks/useBiomechanics.ts, frontend/src/hooks/useFormAnalysisAPI.ts, frontend/src/components/FormAnalysis/constants.ts, frontend/src/components/FormAnalysis/VideoOverlay.tsx, frontend/src/components/FormAnalysis/RepCounter.tsx, frontend/src/components/FormAnalysis/FeedbackPanel.tsx, frontend/src/components/FormAnalysis/FormAnalyzer.tsx, frontend/src/components/FormAnalysis/UploadTab.tsx
> **Generated:** 3/6/2026, 3:01:12 PM

---

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

*Part of SwanStudios 7-Brain Validation System*
