# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.3s
> **Files:** backend/models/VariationLog.mjs, backend/migrations/20260306000003-create-variation-logs.cjs, backend/services/variationEngine.mjs, backend/routes/variationRoutes.mjs, frontend/src/hooks/useVariationAPI.ts, frontend/src/components/VariationEngine/VariationEnginePage.tsx
> **Generated:** 3/6/2026, 4:21:28 PM

---

This performance and scalability review targets the **SwanStudios Variation Engine**. The architecture is logically sound for a fitness platform, but several implementation details will cause performance degradation as the exercise registry and user base grow.

### 1. Database & Scalability Efficiency

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Missing Composite Index on History Queries** | **HIGH** | Database |
| **Unbounded JSONB Growth** | **MEDIUM** | Scalability |
| **N+1 Potential in Suggestion Logic** | **MEDIUM** | Network |

**[HIGH] Missing Composite Index on History Queries**
The `getVariationTimeline` function and the `/history` route frequently query by `clientId` AND `templateCategory` ordered by `sessionDate`.
*   **Issue:** While you have `idx_variation_log_client_category`, the `order by sessionDate` will trigger a filesort on large datasets.
*   **Fix:** Update the index in `VariationLog.mjs` to:
    `{ fields: ['clientId', 'templateCategory', 'sessionDate'], name: 'idx_variation_log_client_cat_date' }`

**[MEDIUM] Unbounded JSONB Growth**
The `exercisesUsed` and `swapDetails` fields are `JSONB`.
*   **Issue:** While flexible, storing full exercise metadata or large arrays in every log entry increases row size significantly. As a client reaches 500+ sessions, `findAll` queries for history will become memory-intensive.
*   **Fix:** Store only `exercise_keys` (strings). Ensure the frontend fetches the `EXERCISE_REGISTRY` once and maps the keys locally.

---

### 2. Render Performance (Frontend)

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Heavy Computation in Render Path** | **HIGH** | Render |
| **Missing List Virtualization** | **MEDIUM** | Render |
| **Context/Prop Drilling Re-renders** | **LOW** | Render |

**[HIGH] Heavy Computation in Render Path**
In `VariationEnginePage.tsx`, the `exercises` array is filtered and mapped inside the main component body.
*   **Issue:** Every time `clientId` or `nasmPhase` changes, the entire `TagGrid` and `PillBar` are re-evaluated.
*   **Fix:** Wrap the exercise filtering logic in `useMemo`:
    ```typescript
    const filteredExercises = useMemo(() => {
      return exercises.filter(ex => category === 'full_body' || ex.category === category);
    }, [exercises, category]);
    ```

**[MEDIUM] Missing List Virtualization**
The `TagGrid` renders all exercises in the registry (currently 81, but likely to grow to 500+).
*   **Issue:** Rendering 500+ `ExerciseTag` buttons with individual click handlers and styled-component overhead will cause "jank" during category switching.
*   **Fix:** Use `react-window` or `react-virtuoso` for the `TagGrid`, or implement a simple search/pagination filter.

---

### 3. Network & Bundle Size

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Large Static Registry in Service** | **HIGH** | Bundle/Memory |
| **Redundant Registry Fetching** | **MEDIUM** | Network |
| **Missing Request Debouncing** | **LOW** | Network |

**[HIGH] Large Static Registry in Service**
`variationEngine.mjs` contains a hardcoded `EXERCISE_REGISTRY` object.
*   **Issue:** This is a "Tree-shaking Blocker." Even if a route doesn't need the registry, the entire 81-exercise object (and growing) is loaded into memory on the server and potentially bundled if shared with the frontend.
*   **Fix:** Move the registry to a separate JSON file or a dedicated Database table. This allows for partial loading and better caching.

**[MEDIUM] Redundant Registry Fetching**
The frontend calls `api.getExercises` inside a `useEffect` triggered by `category`.
*   **Issue:** If a user clicks "Chest" -> "Back" -> "Chest", the app makes 3 network requests for data that is largely static.
*   **Fix:** Implement a simple cache in `useVariationAPI` or use `React Query` (TanStack Query) with a high `staleTime`.

---

### 4. Memory & Logic Safety

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Dynamic Import Overhead** | **MEDIUM** | Performance |
| **In-Memory History Slicing** | **MEDIUM** | Scalability |

**[MEDIUM] Dynamic Import Overhead**
In `variationRoutes.mjs`, you use `await import('../models/index.mjs')` inside the request handler for equipment.
*   **Issue:** While this saves initial boot time, it adds latency to the first few requests and can be problematic in high-concurrency serverless environments (cold starts).
*   **Fix:** Move imports to the top of the file. The memory savings of a dynamic import for a core model are negligible compared to the execution overhead.

**[MEDIUM] In-Memory History Slicing**
`generateSwapSuggestions` takes a `recentlyUsed` array generated by `history.slice(-2)`.
*   **Issue:** The `getVariationTimeline` fetches 10 records, then the route slices them. As the logic gets more complex (e.g., "don't repeat exercises from the last month"), fetching all that data just to slice it in JS is inefficient.
*   **Fix:** Use specific SQL queries to get "Recently Used" keys:
    `SELECT DISTINCT jsonb_array_elements_text("exercisesUsed") FROM variation_logs WHERE "clientId" = :id ORDER BY "sessionDate" DESC LIMIT 20`

---

### Summary Rating: MEDIUM / HIGH
The engine is well-structured for a Phase 8 rollout. However, the **Static Registry** and **Missing Database Indexes** are the primary bottlenecks that will degrade performance once the platform scales beyond a few hundred active clients.

**Top Priority:** Move the Exercise Registry to the DB and optimize the `clientId/category/date` index.

---

*Part of SwanStudios 7-Brain Validation System*
