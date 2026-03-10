# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 9.8s
> **Files:** backend/seeders/20260309000001-seed-nasm-stretches.cjs, backend/services/awardWorkoutXP.mjs, backend/services/gamificationComboService.mjs, frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx
> **Generated:** 3/9/2026, 2:51:21 PM

---

This performance and scalability review covers the provided SwanStudios files.

---

### 1. `backend/seeders/20260309000001-seed-nasm-stretches.cjs`

*   **[LOW] Database Query Efficiency:** The seeder uses `bulkInsert` with `ignoreDuplicates: true`. While safe, if this seeder is run against a massive `exercises` table (10k+ rows) without a unique index on `name`, the "ignore duplicates" check becomes a full table scan per row inserted.
    *   *Recommendation:* Ensure a unique index exists on `exercises.name`.
*   **[MEDIUM] Scalability (Memory):** You are mapping 50 objects into a new `records` array. For 50 items, this is fine. If this pattern is used for a "10,000 Exercise Library" seeder, it could cause heap exhaustion during deployment.
    *   *Recommendation:* For larger seeds, process in chunks of 500.

---

### 2. `backend/services/awardWorkoutXP.mjs`

*   **[HIGH] Scalability (Lock Contention):** `User.findByPk(userId, { lock: transaction.LOCK.UPDATE })` is used. This is correct for data integrity, but because this service is "DB-heavy" and performs multiple `PointTransaction.create`, `Milestone.findAll`, and `WorkoutSession.update` calls within that same transaction, the **User row is locked for the entire duration**. In a high-concurrency environment (e.g., a group class ends and 30 people log workouts simultaneously), this will lead to transaction timeouts or "Deadlock found" errors.
    *   *Recommendation:* Move non-essential reads (like `GamificationSettings` and `Milestone.findAll`) *before* the `User` lock is acquired. Keep the "locked" section as short as possible.
*   **[MEDIUM] Database Query Efficiency (N+1):** Inside the `unAwardedMilestones` loop, `UserMilestone.create` is called inside a `for...of` loop.
    *   *Recommendation:* Collect all milestone IDs and use `UserMilestone.bulkCreate` to reduce round-trips.
*   **[LOW] Network Efficiency:** The service emits to an `eventBus` and calls `createWorkoutAutoPost`. If these trigger heavy downstream logic (like push notifications or external API calls), they should be truly asynchronous (using a message queue like RabbitMQ/Redis) rather than just `try/catch` blocks, to prevent blocking the HTTP response.

---

### 3. `backend/services/gamificationComboService.mjs`

*   **[MEDIUM] Render Performance / Computation:** The `detectCombos` function uses `normalizeType` which performs regex `.replace(/[\s-]/g, '_')` inside a loop for every exercise.
    *   *Recommendation:* Pre-calculate the normalized type on the `Exercise` model/table during the seeding phase so the service only performs a simple string lookup.
*   **[LOW] Scalability:** The `TYPE_ALIASES` map is hardcoded. As the exercise library grows, this becomes a maintenance bottleneck.
    *   *Recommendation:* Move these mappings to a database table or a cached config file.

---

### 4. `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx`

*   **[CRITICAL] Memory Leak:** The code is truncated, but there is no evidence of cleanup for the `api` hooks or potential event listeners. More importantly, the `handleGenerate` and `handleSave` functions are created using `useCallback`, but they depend on the entire `api` object. If `useBootcampAPI` returns a new object on every render, these functions are redefined every time, defeating the purpose of `useCallback`.
*   **[HIGH] Render Performance (Heavy Tree):** The `ThreePane` layout renders the entire configuration, the preview, and the details in one component.
    *   *Issue:* Changing a single input (like `className`) triggers a re-render of the entire `ThreePane` and all `StationCard` components.
    *   *Recommendation:* Wrap `StationCard` and `AITerminalPanel` in `React.memo`. Split the "Left Panel" (Inputs) into its own component so its local state doesn't force the "Center Panel" (Preview) to re-render.
*   **[MEDIUM] Bundle Size:** The component imports `framer-motion` and `styled-components`. While standard, `framer-motion` is quite large.
    *   *Recommendation:* Use `m` from `framer-motion` (minimal version) and a `LazyMotion` features bundle to reduce the initial load of the Bootcamp page.
*   **[MEDIUM] Lazy Loading:** This page is a complex "Builder" likely used only by Admins/Trainers.
    *   *Recommendation:* Ensure this route is lazily loaded via `React.lazy(() => import(...))` in the main App router to prevent users from downloading this heavy logic on the login/landing pages.
*   **[LOW] Network Efficiency:** `handleGenerate` sends the entire `equipmentProfileId`. Ensure the backend doesn't return the full exercise objects if only IDs and names are needed for the preview, as this increases payload size.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **User Row Lock Duration** | **HIGH** | Scalability / Concurrency |
| **Component Monolith Re-renders** | **HIGH** | Render Performance |
| **Missing React.lazy for Builder** | **MEDIUM** | Bundle Size |
| **N+1 Milestone Creation** | **MEDIUM** | DB Efficiency |
| **Regex in XP Loop** | **MEDIUM** | Computation |
| **Seeder Memory/Index** | **LOW** | Scalability |

---

*Part of SwanStudios 7-Brain Validation System*
