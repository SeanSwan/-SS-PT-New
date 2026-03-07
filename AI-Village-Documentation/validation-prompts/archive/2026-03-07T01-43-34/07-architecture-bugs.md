# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 68.2s
> **Files:** backend/services/bootcampService.mjs, frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx, frontend/src/hooks/useBootcampAPI.ts, backend/routes/bootcampRoutes.mjs
> **Generated:** 3/6/2026, 5:43:34 PM

---

# Deep Code Review: SwanStudios Bootcamp Builder

## Executive Summary
This review identifies **3 CRITICAL bugs**, **2 HIGH severity architectural flaws**, and several production readiness issues that must be addressed before shipping to `sswanstudios.com`. The core logic for class generation is functional but suffers from data integrity risks and performance bottlenecks.

---

## 1. Bug Detection

### CRITICAL: Data Integrity Failure in Station Generation
**File:** `backend/services/bootcampService.mjs` (Lines 195-215, 240-260)

**What's Wrong:**
The `selectStationExercises` function can return an empty array if the pool of available exercises is exhausted or filtered too aggressively. The code assumes `stationExercises` always has at least `exercisesPerStation - 1` items. If it returns fewer (or zero), the loop logic for adding cardio finishers fails or adds them incorrectly, resulting in stations with **zero exercises** being saved to the database.

```javascript
// Line 195: Assumes count-1 exercises
return matching.slice(0, count - 1);

// Line 240: Logic assumes loop runs at least once
for (let e = 0; e < stationExercises.length; e++) {
    const ex = stationExercises[e];
    const isLast = e === stationExercises.length - 1;
    // If length is 0, loop never runs. Station has no exercises.
}
```

**Fix:**
Add a validation check after selection to ensure minimum exercise count, or fallback to a default set if the pool is empty.
```javascript
// In generateBootcampClass, after selectStationExercises
if (stationExercises.length < format.exercisesPerStation - 1) {
  logger.warn(`Insufficient exercises for station ${s}, falling back to defaults`);
  // Implement fallback logic or throw error
}
```

---

### CRITICAL: N+1 Database Writes on Save
**File:** `backend/services/bootcampService.mjs` (Lines 280-315)

**What's Wrong:**
The `saveBootcampTemplate` function creates database records inside `for` loops. For a class with 10 stations and 4 exercises each, this results in ~40+ sequential `await` calls. This is a severe performance anti-pattern that will lock the event loop and cause timeouts under load.

**Fix:**
Use Sequelize `bulkCreate` for stations and exercises.
```javascript
const stationRecords = generatedClass.stations.map(s => ({ ... }));
const createdStations = await Station.bulkCreate(stationRecords);
// Map IDs and proceed
```

---

### CRITICAL: Unhandled Non-JSON API Responses
**File:** `frontend/src/hooks/useBootcampAPI.ts` (Lines 48-52)

**What's Wrong:**
If the backend returns a 502 Bad Gateway (HTML error page) or any non-JSON response, `res.json()` throws an unhandled promise rejection. This crashes the React application entirely rather than gracefully handling the error.

```javascript
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ... } });
  const data = await res.json(); // CRASH HERE if body isn't JSON
  // ...
}
```

**Fix:**
Wrap `res.json()` in try/catch.
```javascript
let data;
try {
  data = await res.json();
} catch (e) {
  throw new Error(`Invalid server response: ${res.status}`);
}
```

---

## 2. Architecture Flaws

### HIGH: Frontend/Backend Contract Mismatch (Format)
**Files:** 
- `frontend/src/hooks/useBootcampAPI.ts` (Line 12)
- `backend/routes/bootcampRoutes.mjs` (Line 27)

**What's Wrong:**
The frontend TypeScript type `ClassFormat` includes `'custom'`, but the backend `FORMAT_CONFIG` does not support it. When a user selects "Custom", the backend silently defaults to `'stations_4x'` (Line 28 of routes). The user sees "Custom" in the UI but gets a standard class, leading to confusion.

**Fix:**
Remove `'custom'` from the frontend `ClassFormat` type definition, or implement the logic in the backend service.

---

### HIGH: Missing Rate Limiting on Expensive Operation
**File:** `backend/routes/bootcampRoutes.mjs`

**What's Wrong:**
The `/api/bootcamp/generate` endpoint performs complex logic (exercise selection, timing calculations, DB lookups). It has no rate limiting. A malicious user or a buggy client loop could easily DoS the server by spamming generation requests.

**Fix:**
Apply a rate limiter middleware (e.g., `express-rate-limit`) to this specific route.
```javascript
import rateLimit from 'express-rate-limit';
const generateLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });
router.post('/generate', generateLimiter, async (req, res) => { ... });
```

---

## 3. Integration Issues

### MEDIUM: Type Safety Leak in Template Fetching
**File:** `frontend/src/hooks/useBootcampAPI.ts` (Line 94)

**What's Wrong:**
`getTemplates` returns `unknown[]`. The frontend casts this implicitly when using it. If the backend schema changes, the UI will break silently or crash at runtime with cryptic errors.

**Fix:**
Define a `BootcampTemplate` interface and return `BootcampTemplate[]`.

---

### MEDIUM: Inconsistent Data Handling (Full Group vs Stations)
**Files:** 
- `backend/services/bootcampService.mjs` (Lines 165-190)
- `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx` (Lines 280-310)

**What's Wrong:**
For station-based classes, the frontend groups exercises by `stationIndex`. For `full_group`, it iterates the flat list directly. This logic divergence makes the component harder to maintain and suggests the backend data model (`stationIndex` being optional) isn't strictly enforced.

**Fix:**
Always populate `stationIndex` in the backend (e.g., -1 for full group) and handle grouping consistently in the frontend.

---

## 4. Dead Code & Tech Debt

### LOW: Unused Variables in Service
**File:** `backend/services/bootcampService.mjs` (Line 68)

**What's Wrong:**
`equipmentProfileId` is destructured from options but never used in the function body.

```javascript
const {
  // ...
  equipmentProfileId, // <--- Unused
  // ...
} = options;
```

**Fix:** Remove the variable or implement the equipment filtering logic.

---

### LOW: Hardcoded Magic Numbers
**File:** `backend/services/bootcampService.mjs` (Lines 66, 67)

**What's Wrong:**
`demoDuration: 5` and `clearDuration: 5` are hardcoded. These should likely be configurable or derived from the class size/format.

**Fix:** Move to configuration or constants.

---

## 5. Production Readiness

### MEDIUM: Insufficient Error Logging
**File:** `backend/routes/bootcampRoutes.mjs` (Multiple locations)

**What's Wrong:**
Errors are logged with `err.message`, but production debugging requires the stack trace (`err.stack`).

**Fix:**
```javascript
logger.error('[Bootcamp] Generate failed:', err.message, err.stack);
```

---

### LOW: Missing Loading State for "Save"
**File:** `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx` (Lines 260-270)

**What's Wrong:**
The "Save as Template" button does not disable or show a spinner while the async `api.saveTemplate` is pending. Users can double-click and trigger duplicate saves.

**Fix:**
Add a `saving` state and disable the button.

---

## Summary Table

| Severity | File | Issue | Impact |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | `bootcampService.mjs` | Empty station exercises | Data corruption/Blank UI |
| **CRITICAL** | `bootcampService.mjs` | N+1 DB inserts | Server timeouts |
| **CRITICAL** | `useBootcampAPI.ts` | Non-JSON crash | App-wide crash |
| **HIGH** | `bootcampRoutes.mjs` | No rate limiting | DoS vulnerability |
| **HIGH** | Types vs Routes | Format mismatch ('custom') | User confusion |
| **MEDIUM** | `bootcampRoutes.mjs` | Missing stack traces | Debugging difficulty |
| **MEDIUM** | `useBootcampAPI.ts` | `unknown[]` return type | Runtime fragility |
| **LOW** | `bootcampService.mjs` | Unused variables | Code clutter |

---

*Part of SwanStudios 7-Brain Validation System*
