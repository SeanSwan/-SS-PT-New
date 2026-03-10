# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 9.7s
> **Files:** backend/seeders/20260309000001-seed-nasm-stretches.cjs, backend/services/awardWorkoutXP.mjs, backend/services/gamificationComboService.mjs, frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx
> **Generated:** 3/9/2026, 3:05:50 PM

---

This performance and scalability review covers the provided SwanStudios files.

---

### 1. `backend/seeders/20260309000001-seed-nasm-stretches.cjs`

*   **[LOW] Database Query Efficiency:** The seeder uses `bulkInsert` with `ignoreDuplicates: true`. While safe, if this seeder is run against a massive `exercises` table (10k+ rows) without a unique index on `name`, the "ignore duplicates" check becomes a full table scan per row inserted. Ensure a unique index exists on `exercises.name`.
*   **[LOW] Scalability:** The `down` function hardcodes an array of 50 strings. If names are updated in the `up` array but not the `down` array, "ghost" records will remain in the DB after a rollback.
    *   *Recommendation:* Derive `stretchNames` from the `stretches` array programmatically to ensure parity.

---

### 2. `backend/services/awardWorkoutXP.mjs`

*   **[HIGH] Database Query Efficiency (N+1 Risk):** Inside the `unAwardedMilestones` loop, `UserMilestone.create` is called individually. If a user hits 5+ milestones at once (common for new users), this creates multiple round-trips.
    *   *Recommendation:* Collect milestone objects and use `UserMilestone.bulkCreate(..., { transaction })`.
*   **[MEDIUM] Scalability (Lock Contention):** `User.findByPk(userId, { lock: transaction.LOCK.UPDATE })` is used. While necessary for data integrity, this service performs heavy logic (combo detection, social posts, milestone checks) while holding that lock.
    *   *Recommendation:* Move non-critical side effects (like `createWorkoutAutoPost` and `createStreakAutoPost`) outside the transaction or to a background worker (BullMQ/Redis) to minimize lock hold time.
*   **[MEDIUM] Network Efficiency (Over-fetching):** `Milestone.findAll` includes `UserMilestone` for every milestone in the system just to filter them out.
    *   *Recommendation:* Use a `NOT EXISTS` or `LEFT JOIN ... WHERE userMilestones.id IS NULL` in the SQL query itself to reduce the payload size returned from Postgres.

---

### 3. `backend/services/gamificationComboService.mjs`

*   **[MEDIUM] Render Performance / Computation:** `normalizeType` uses a regex `.replace(/[\s-]/g, '_')` inside a loop for every exercise. While fine for small workouts, this is a "hot path" during XP calculation.
    *   *Recommendation:* Pre-calculate and store the `normalizedType` on the `Exercise` model during seeding/creation so it doesn't need to be computed at runtime.
*   **[LOW] Scalability:** The `COMBOS` array is hardcoded. As the "Galaxy-Swan" theme expands, adding new combos requires a code deployment.
    *   *Recommendation:* Move combo definitions to a database table to allow trainers to create "Seasonal Events" (e.g., "Summer Shred" combo) without a redeploy.

---

### 4. `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx`

*   **[CRITICAL] Memory Leaks / Render Performance:** The file is truncated, but the `ThreePane` layout renders complex station cards and exercise rows. If `setSelectedExercise` is called, the entire page re-renders.
    *   *Recommendation:* Wrap `StationCard` and `ExerciseRow` in `React.memo`. Use a context or a state management library for the "Selected Exercise" to prevent the 3-pane layout from re-rendering the configuration and preview panes when only the detail pane changes.
*   **[HIGH] Bundle Size Impact:** The component imports `EquipmentProfilePicker` and `AITerminalPanel` directly. These are likely heavy components (especially if the Terminal uses a library like `xterm.js` or complex animations).
    *   *Recommendation:* Use `React.lazy(() => import(...))` for `AITerminalPanel` and `EquipmentProfilePicker`. Since they are inside a "Builder" page, they aren't needed for the initial paint.
*   **[HIGH] Render Performance (Heavy Computations):** The `stationExercises` object is recalculated on every render:
    ```javascript
    const stationExercises = bootcamp?.exercises.reduce(...)
    ```
    *   *Recommendation:* Wrap this in `useMemo` dependent on `[bootcamp]`. Currently, every time `floorMode` is toggled, the entire exercise list is re-reduced.
*   **[MEDIUM] Lazy Loading:** The `framer-motion` `AnimatePresence` and `motion.div` add significant weight to the bundle.
    *   *Recommendation:* Ensure `framer-motion` is being tree-shaken or consider using CSS transitions for simple "Floor Mode" toggles to keep the main bundle lean.
*   **[LOW] Network Efficiency:** `handleGenerate` fetches the entire bootcamp object. If the user clicks "Generate" multiple times with the same config, it hits the API every time.
    *   *Recommendation:* Implement a simple client-side cache or use `react-query` to handle the generation request.

---

### Summary Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **N+1 Milestone Creation** | HIGH | DB Efficiency |
| **Missing `useMemo` on Station Grouping** | HIGH | Render Performance |
| **Direct Imports of Heavy UI Components** | HIGH | Bundle Size |
| **Lock Contention in XP Service** | MEDIUM | Scalability |
| **Unnecessary `UserMilestone` Fetching** | MEDIUM | Network Efficiency |
| **Hardcoded Combo Logic** | LOW | Scalability |

---

*Part of SwanStudios 7-Brain Validation System*
