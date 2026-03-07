# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.9s
> **Files:** backend/models/CustomExercise.mjs, backend/routes/customExerciseRoutes.mjs, frontend/src/hooks/useCustomExerciseAPI.ts, frontend/src/components/FormAnalysis/BiomechanicsStudio.tsx
> **Generated:** 3/6/2026, 3:36:47 PM

---

As a Performance and Scalability Engineer, I have reviewed the **Biomechanics Studio** implementation. The system is architecturally sound but contains several "silent killers" regarding database growth, bundle size, and UI responsiveness.

---

### 1. Database & Scalability (Backend)

#### **CRITICAL: Unbounded Recursive Versioning Query**
The `parentVersionId` creates a linked list in the database. While the current CRUD handles single-level updates, there is no logic to prevent or handle deep version trees.
*   **Risk:** If a trainer updates an exercise 100 times, fetching the "history" or "original" via recursive joins (if added later) will spike CPU.
*   **Scalability:** The `PUT /:id` route archives the *immediate* parent but doesn't index the `slug` + `version` effectively for time-series retrieval.

#### **HIGH: Missing JSONB GIN Indexes**
The `mechanicsSchema` and `validationResult` are `JSONB` columns.
*   **Finding:** You are storing complex rules (landmarks, thresholds) in JSONB but have no GIN index.
*   **Impact:** If you ever need to query "Which exercises use landmark 25?" or "Find exercises with > 5 rules," PostgreSQL will perform a full table scan.
*   **Fix:** Add `index: { type: 'GIN' }` to `mechanicsSchema` in the model definition.

#### **MEDIUM: N+1 Risk in Template Listing**
The `GET /templates` route maps over an in-memory array. While small now, if this moves to a database table:
*   **Finding:** The `ruleCount` and `hasRepDetection` are calculated on the fly.
*   **Fix:** Use a virtual column or a generated column in Postgres to store `rule_count` so it can be indexed and returned without parsing JSON strings in the Node.js layer.

---

### 2. Bundle Size & Lazy Loading (Frontend)

#### **HIGH: Massive Object Literals in Main Bundle**
The `BUILT_IN_TEMPLATES` array in the backend is fine, but if similar large configuration objects are imported into the React frontend (common in "Studio" apps):
*   **Finding:** The `LANDMARK_NAMES` and potential template defaults are hardcoded.
*   **Impact:** These cannot be tree-shaken.
*   **Fix:** Move large static configurations (like the 33 MediaPipe landmark names and descriptions) into a `.json` file and fetch them or use `import()` to load them only when the Studio is opened.

#### **MEDIUM: Missing Code Splitting for the Studio**
The `BiomechanicsStudio` is a heavy "Admin-only" or "Trainer-only" tool.
*   **Finding:** It likely imports heavy libraries (Framer Motion, potentially MediaPipe/TensorFlow in the truncated section).
*   **Impact:** Regular clients (trainees) will download the "Studio" logic even if they only ever see the "Workout" view.
*   **Fix:** Ensure this component is exported via `React.lazy` and wrapped in `Suspense` at the App Router level.

---

### 3. Render Performance (Frontend)

#### **HIGH: Object Reference Instability in `useCustomExerciseAPI`**
*   **Finding:** The `getHeaders` function is called inside `apiFetch`, which is called inside `useCallback` hooks. However, `getHeaders` creates a new object on every call.
*   **Impact:** While not causing re-renders directly, the `api` object returned by the hook changes its internal references frequently.
*   **Fix:** Memoize the `api` object or move `apiFetch` outside the hook.

#### **MEDIUM: Expensive "Step" Re-renders**
*   **Finding:** The `setSchema` function updates a deeply nested object. In `FormRulesStep`, every keystroke in a "Coaching Cue" input triggers a re-render of the *entire* wizard, including the `MetadataStep` and `RepMechanicsStep`.
*   **Impact:** On lower-end devices (tablets used in gyms), the UI will feel "laggy" as the rule list grows.
*   **Fix:** Use **Uncontrolled Components** (refs) for form inputs or `React.memo` for individual `RuleCard` components.

---

### 4. Network Efficiency

#### **MEDIUM: Lack of Request Cancellation**
*   **Finding:** `useCustomExerciseAPI` initializes an `abortRef` but never uses it in `apiFetch`.
*   **Impact:** If a user clicks "Validate" multiple times or switches templates rapidly, multiple "zombie" requests will resolve in the background, potentially setting state on an unmounted component.
*   **Fix:** Pass `abortRef.current.signal` to the `fetch` call and call `abort()` in a `useEffect` cleanup.

#### **LOW: Over-fetching in `listExercises`**
*   **Finding:** The `GET /` route returns the full `mechanicsSchema` for every exercise in the list.
*   **Impact:** If a trainer has 50 exercises, the payload size could reach several megabytes of JSON.
*   **Fix:** Create a "Summary" view in the API that excludes `mechanicsSchema` and `validationResult` for the list view, fetching the full JSON only on the `/:id` detail route.

---

### 5. Memory & Safety

#### **MEDIUM: LocalStorage Token Access**
*   **Finding:** `getHeaders` pulls from `localStorage` on every API call.
*   **Impact:** Synchronous disk I/O (even on SSDs) inside the render/logic path is sub-optimal.
*   **Fix:** Read the token once into a context/state and pass it down, or use an Axios interceptor.

#### **LOW: Slug Collision**
*   **Finding:** The backend generates slugs via regex.
*   **Impact:** Two exercises named "Squat!" and "Squat?" will both result in the slug `squat`, causing a 409 Conflict.
*   **Fix:** Append a short-hash or the `trainerId` to the slug for uniqueness.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Recursive Versioning Query** | **CRITICAL** | Scalability |
| **Missing JSONB GIN Indexes** | **HIGH** | DB Efficiency |
| **Step Re-render Lag** | **HIGH** | Render Perf |
| **Large Config Objects in Bundle** | **HIGH** | Bundle Size |
| **N+1 Template Logic** | **MEDIUM** | Network/DB |
| **Zombie Request (Abort)** | **MEDIUM** | Memory/Network |
| **Over-fetching JSONB in Lists** | **MEDIUM** | Network |

---

*Part of SwanStudios 7-Brain Validation System*
