# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.2s
> **Files:** backend/services/bootcampService.mjs, backend/routes/bootcampRoutes.mjs, backend/models/BootcampTemplate.mjs, backend/models/BootcampStation.mjs, backend/models/BootcampExercise.mjs, frontend/src/hooks/useBootcampAPI.ts, frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx
> **Generated:** 3/6/2026, 5:16:35 PM

---

This performance and scalability review targets the **SwanStudios Boot Camp Class Builder**.

### Executive Summary
The architecture is logically sound for a Phase 10 implementation, but it contains significant "N+1" database patterns and frontend rendering inefficiencies that will degrade performance as the number of templates and exercises grows.

---

### 1. Database & Backend Efficiency

#### [CRITICAL] N+1 Insert Pattern in `saveBootcampTemplate`
**File:** `backend/services/bootcampService.mjs`
The `saveBootcampTemplate` function performs individual `await Exercise.create(...)` calls inside a loop. If a class has 15 exercises and 10 stations, this triggers 25+ separate round-trips to the database.
*   **Impact:** High latency during save; risk of partial data if one insert fails (no transaction).
*   **Recommendation:** Use `Exercise.bulkCreate(exercisesArray)` and wrap the entire operation in a Sequelize transaction (`sequelize.transaction`).

#### [HIGH] Unbounded "Freshness" Logic
**File:** `backend/services/bootcampService.mjs`
The "Exercise Freshness" logic (Step 3) fetches the last 10 logs and then iterates through `log.exercisesUsed`. If `exercisesUsed` is a large JSON blob, this is a heavy in-memory operation.
*   **Impact:** Memory usage spikes as the `recentExerciseNames` Set grows.
*   **Recommendation:** Offload this to the DB. Use a `DISTINCT` query on a join between `ClassLogs` and `Exercises` within the date range.

#### [MEDIUM] Missing Indexes on Foreign Keys
**File:** `backend/models/BootcampTemplate.mjs`
While `trainerId` is indexed, `equipmentProfileId` and `spaceProfileId` are not.
*   **Impact:** Slow joins when filtering templates by equipment or space constraints.
*   **Recommendation:** Add indexes to these foreign key fields in the model definition.

---

### 2. Render Performance (Frontend)

#### [HIGH] Massive Object Re-allocation in Render
**File:** `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx`
The `stationExercises` object is recalculated on **every render** using `.reduce()` on the `bootcamp.exercises` array.
```typescript
const stationExercises = bootcamp?.exercises.reduce(...) // Runs every render
```
*   **Impact:** If the user toggles `floorMode` or types in the "Class Name" input, the entire exercise list is re-processed, causing laggy UI interactions.
*   **Recommendation:** Wrap this logic in `useMemo(() => ..., [bootcamp])`.

#### [MEDIUM] Missing List Virtualization / Key Stability
**File:** `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx`
The exercise rows use `key={\`${si}-\${ex.sortOrder}\`}`. While unique, if the list is re-ordered or filtered, React will re-mount all DOM nodes.
*   **Impact:** Jittery animations and high CPU usage on mobile devices during "Floor Mode" use.
*   **Recommendation:** Use a stable unique ID (like an exercise ID) if available.

---

### 3. Network & Scalability

#### [HIGH] Over-fetching in `getTemplates`
**File:** `backend/services/bootcampService.mjs`
The `getTemplates` function includes the full `exercises` and `stations` models for every template in the list.
*   **Impact:** The payload size for `/api/bootcamp/templates` will explode as the trainer saves more classes.
*   **Recommendation:** Create a "Summary" view for the list that excludes the full exercise array, and fetch details only when a specific template is selected.

#### [MEDIUM] In-Memory Exercise Registry
**File:** `backend/services/bootcampService.mjs`
The service calls `getExerciseRegistry()`. If this registry is a large in-memory object loaded from a JSON file or a single DB fetch at startup:
*   **Impact:** It won't scale across multiple Node.js instances (horizontal scaling) if the registry is updated dynamically.
*   **Recommendation:** Move the Exercise Registry to a cached Redis store or a dedicated DB table with proper indexing.

---

### 4. Bundle Size & Memory

#### [MEDIUM] Large Component Tree
**File:** `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx`
The file is becoming a "Mega-Component" containing the Config, Preview, and Detail logic.
*   **Impact:** Tree-shaking is less effective; any state change in the "Config" pane forces the "Preview" pane to re-evaluate its virtual DOM.
*   **Recommendation:** Split into `BootcampConfig.tsx`, `BootcampPreview.tsx`, and `ExerciseDetail.tsx`. Use `React.memo` on the Preview and Detail components.

#### [LOW] Date Object Creation in Loop
**File:** `backend/services/bootcampService.mjs`
`new Date().toLocaleDateString()` is called inside the template name generation.
*   **Impact:** Negligible for single calls, but bad practice in high-throughput services.
*   **Recommendation:** Define the date string once at the start of the function.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| N+1 Inserts in `saveBootcampTemplate` | **CRITICAL** | Database Efficiency |
| Un-memoized `stationExercises` reduce | **HIGH** | Render Performance |
| Over-fetching full exercise lists in GET | **HIGH** | Network Efficiency |
| In-memory Registry (Multi-instance) | **MEDIUM** | Scalability |
| Missing FK Indexes | **MEDIUM** | Database Efficiency |
| Lack of Component Code-Splitting | **MEDIUM** | Bundle Size |

---

*Part of SwanStudios 7-Brain Validation System*
