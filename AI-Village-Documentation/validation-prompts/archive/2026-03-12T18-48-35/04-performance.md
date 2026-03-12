# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.4s
> **Files:** backend/routes/galleryRoutes.mjs, backend/services/formAnalysisService.mjs
> **Generated:** 3/12/2026, 11:48:35 AM

---

As a Performance and Scalability Engineer, I have reviewed the provided backend routes and services. While the logic is functionally rich, there are several architectural bottlenecks that will degrade performance as the **Enchanted Apex** user base grows.

### 1. Database & Query Efficiency

**Finding: N+1 Query Pattern in Event Listing**
*   **Location:** `backend/routes/galleryRoutes.mjs` -> `GET /events`
*   **Issue:** The code fetches all events and then performs a separate `GalleryPhoto.findByPk` or `findOne` for **every single event** inside a `Promise.all`. If you have 50 events, this triggers 51 database queries.
*   **Impact:** **HIGH**. This will cause significant latency and DB connection pool exhaustion as the gallery grows.
*   **Recommendation:** Use Sequelize `include` with a limit or a lateral join to fetch cover photos in a single query.

**Finding: Unbounded Aggregations in Lead Recalculation**
*   **Location:** `POST /recalculate-lead-scores`
*   **Issue:** This route performs a `Lead.findAll()` without pagination or batching, then runs 5 `count` queries per lead.
*   **Impact:** **CRITICAL**. On a production database with 10k+ leads, this request will timeout the event loop and potentially crash the RDS instance.
*   **Recommendation:** Use a single `GROUP BY` query joining all tables to calculate scores, or process in batches of 100 using a worker queue (BullMQ).

**Finding: Missing Database Indexes**
*   **Location:** Multiple routes.
*   **Issue:** Queries filter by `visitorId`, `eventId`, and `slug`.
*   **Impact:** **MEDIUM**. Without composite indexes on `(visitorId, photoId)` and `(eventId, isPublished)`, PostgreSQL will perform full table scans.
*   **Recommendation:** Ensure indexes exist for `GalleryVisitor(email, eventId)`, `PhotoVote(photoId, visitorId)`, and `GalleryPhoto(eventId)`.

---

### 2. Network & API Efficiency

**Finding: Redundant Photo Metadata Fetching**
*   **Location:** `GET /events/:slug/photos`
*   **Issue:** Returns all photo attributes for every photo in the event.
*   **Impact:** **MEDIUM**. For a gallery with 500+ high-res photos, the JSON payload becomes massive, delaying the "Time to Interactive" for the frontend.
*   **Recommendation:** Implement pagination or "Infinite Scroll" support (`limit`/`offset`). Only return `thumbnailUrl` initially; fetch `url` (full-res) only when a photo is opened in the lightbox.

**Finding: Synchronous External Fetch in AI Analysis**
*   **Location:** `POST /analyze-form`
*   **Issue:** The server fetches the image from R2 (`fetch(photoUrl)`) and waits for the buffer before even calling Gemini.
*   **Impact:** **HIGH**. This ties up a Node.js worker thread for the duration of two external network hops.
*   **Recommendation:** Pass the R2 URL directly to Gemini if using their API features, or use a streaming approach. Better yet, move AI analysis to a background job and use WebSockets/SSE to push the result.

---

### 3. Scalability & State Concerns

**Finding: In-Memory Stripe Imports**
*   **Location:** `POST /purchase-credits`, `POST /donation`, etc.
*   **Issue:** Dynamic `import('stripe')` inside route handlers.
*   **Impact:** **LOW**. While it saves initial boot time, it adds overhead to the first few requests.
*   **Recommendation:** Move Stripe initialization to a singleton service file.

**Finding: Race Conditions in Credit Updates**
*   **Location:** `POST /enhancement-request`
*   **Issue:** Credits are read, calculated in JS, and then `visitor.update()` is called.
*   **Impact:** **MEDIUM**. If a user double-clicks or submits two requests rapidly, they might bypass credit limits because the second request reads the balance before the first one writes it.
*   **Recommendation:** Use `visitor.decrement('enhancementCredits', { by: creditsToUse, transaction: t })` to handle this at the DB level.

---

### 4. Memory & Bundle Size (Backend Context)

**Finding: Large Buffer Conversions**
*   **Location:** `backend/services/formAnalysisService.mjs`
*   **Issue:** `imageBuffer.toString('base64')` creates a second, larger copy of the image in memory.
*   **Impact:** **MEDIUM**. If multiple users upload 10MB 4K photos for analysis simultaneously, the heap memory will spike, potentially triggering OOM (Out of Memory) kills.
*   **Recommendation:** Use `sharp` to resize/compress the image to a lower resolution (Gemini doesn't need 4K for pose estimation) before converting to base64.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **N+1 Queries in Event List** | **HIGH** | DB Efficiency |
| **Unbounded Lead Recalculation** | **CRITICAL** | Scalability |
| **Lack of Pagination for Photos** | **MEDIUM** | Network Efficiency |
| **In-Memory Base64 Duplication** | **MEDIUM** | Memory |
| **Race Conditions in Credits** | **MEDIUM** | Scalability |

### Performance Pro-Tip for "Crystalline Swan" Theme:
Since your UI uses **Glow Accents** and **Ice Wing** gaming aesthetics, the frontend likely relies on heavy CSS filters/animations. Ensure the backend `GET /photos` returns `width` and `height` (which you are currently doing) so the React frontend can reserve space and prevent **Layout Shift** during the "frozen enchanted forest" transition animations.

---

*Part of SwanStudios 7-Brain Validation System*
