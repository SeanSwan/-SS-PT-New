# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.9s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CLASS-BUILDER-DESIGN.md
> **Generated:** 3/6/2026, 2:38:23 PM

---

As a performance and scalability engineer, I have reviewed the **Phase 10 Boot Camp Class Builder Design Document**. While the architectural logic is sound for a fitness application, several areas pose significant risks to frontend responsiveness, database scalability, and infrastructure costs.

### 1. Bundle Size & Frontend Impact
**Finding: Heavy Component Bloat in Builder View**
*   **Rating: MEDIUM**
*   **Issue:** The "3-Pane Layout" with station cards, difficulty tiers, and AI insights suggests a very high DOM node count. If implemented as a single monolithic React component, the bundle size for the `ClassBuilder` will swell.
*   **Recommendation:** Use **Dynamic Imports** (`React.lazy`) for the "AI Insights Panel" and "Space Profile Modals." These are not needed for the initial paint of the workout grid.

**Finding: Heavy Visualization Libraries**
*   **Rating: LOW**
*   **Issue:** "Difficulty distribution charts" and "Rotation calendars" often pull in large libraries like Recharts or FullCalendar.
*   **Recommendation:** Ensure these are code-split. Use CSS Grid for the "Station Canvas" instead of heavy drag-and-drop libraries unless reordering is a core requirement.

---

### 2. Render Performance
**Finding: O(N) Re-renders on Station Updates**
*   **Rating: HIGH**
*   **Issue:** In a complex boot camp with 7 stations and 4 exercises each (28+ items), updating one "Easy Variation" could trigger a re-render of the entire canvas if state is held in a single parent object.
*   **Recommendation:** Use **React Memo** for `StationCard` and `ExerciseRow`. Implement a specialized state manager (like Zustand) or use `useReducer` to avoid passing massive prop trees down to individual exercise inputs.

---

### 3. Network Efficiency
**Finding: Over-fetching in Template List**
*   **Rating: MEDIUM**
*   **Issue:** `GET /api/bootcamp/templates` returns templates with stations and exercises. For a dashboard view, this is massive over-fetching.
*   **Recommendation:** Implement a "Summary View" for the list API that excludes the `JSONB` metadata and exercise arrays. Only fetch full details when a specific template is selected.

**Finding: N+1 AI Analysis Calls**
*   **Rating: MEDIUM**
*   **Issue:** The "Trend Research Engine" suggests analyzing YouTube/Reddit. If the frontend requests an analysis for every item in a list individually, it will bottleneck.
*   **Recommendation:** Batch the trend analysis requests or move them to a background worker (Redis/BullMQ) so the UI polls a single "Status" endpoint.

---

### 4. Database Query Efficiency
**Finding: Unbounded JSONB Searches**
*   **Rating: HIGH**
*   **Issue:** The `bootcamp_class_log` stores `exercises_used` as `JSONB`. The "Rotation Health" logic requires checking if an exercise was used in the last 2 weeks. Querying inside a JSONB array across hundreds of logs will cause sequential scans.
*   **Recommendation:** Create a join table `bootcamp_log_exercises` (log_id, exercise_id) to allow standard indexed SQL queries for "Freshness" checks. Do not rely on `JSONB_CONTAINS` for core business logic.

**Finding: Missing Indexes on Foreign Keys**
*   **Rating: LOW**
*   **Issue:** `bootcamp_stations` and `bootcamp_exercises` lack indexes on `template_id` in the schema description (though some are noted, ensure all FKs are indexed).
*   **Recommendation:** Explicitly add `CREATE INDEX` for all `template_id` and `station_id` columns to prevent slow deletes/cascades.

---

### 5. Memory & Scalability
**Finding: In-Memory Trend Scraping**
*   **Rating: CRITICAL**
*   **Issue:** "YouTube transcript analysis" and "Reddit scraping" are high-latency, memory-intensive tasks. If handled within the Express request-response cycle, it will block the Event Loop and crash the instance under load.
*   **Recommendation:** **Offload to a Background Worker.** Use a task queue (BullMQ). The API should only trigger the job and return a `jobId`.

**Finding: Vision API Cost & Latency**
*   **Rating: MEDIUM**
*   **Issue:** Gemini Flash Vision on 360-degree videos is expensive and slow.
*   **Recommendation:** Implement **Request Debouncing** on the frontend for the "Re-analyze" button. Store the AI results in the `layout_data` column and only re-run if the `media_urls` change.

---

### 6. Memory Leaks
**Finding: Media Stream Cleanup**
*   **Rating: MEDIUM**
*   **Issue:** The "Record 360 Video" feature uses `getUserMedia`. If the stream is not explicitly stopped when the component unmounts, the camera remains active (hardware leak).
*   **Recommendation:** Ensure `stream.getTracks().forEach(track => track.stop())` is called in the `useEffect` cleanup function.

---

### Summary of Ratings
| Category | Rating | Primary Concern |
| :--- | :--- | :--- |
| **Database** | **HIGH** | JSONB querying for exercise rotation will fail at scale. |
| **Scalability** | **CRITICAL** | AI/Scraping logic must be moved to background workers. |
| **Performance** | **MEDIUM** | High DOM node count in the Builder UI. |
| **Network** | **MEDIUM** | Over-fetching of template details in list views. |

**Engineer's Note:** The "Freshness Engine" is the most expensive part of this design. By normalizing the exercise logs into a join table now, you avoid a massive migration and performance degradation 6 months post-launch.

---

*Part of SwanStudios 7-Brain Validation System*
