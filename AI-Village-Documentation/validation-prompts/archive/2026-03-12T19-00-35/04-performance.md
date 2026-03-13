# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.6s
> **Files:** backend/routes/galleryRoutes.mjs, backend/services/formAnalysisService.mjs
> **Generated:** 3/12/2026, 12:00:35 PM

---

As a performance and scalability engineer, I have reviewed `galleryRoutes.mjs` and `formAnalysisService.mjs`. The system is well-structured for a lead-generation funnel, but there are significant risks regarding **database atomicity**, **N+1 query patterns**, and **memory management** in the AI service.

---

### 1. Database & Query Efficiency

#### [CRITICAL] N+1 Query Pattern in `/events`
The `/events` route performs a `GalleryEvent.findAll` and then executes a separate `GalleryPhoto` query inside a `Promise.all` map for every single event.
*   **Impact:** If you have 50 events, this triggers 51 database round-trips.
*   **Fix:** Use a Sequelize `include` with a `limit` or a lateral join to fetch the cover photo in a single query.

#### [HIGH] Missing Database Transactions on Credits/VIP
The `/enhancement-request` and `/vip-activate` routes perform multiple `update` and `increment` calls across different models (Visitor, Photo, Lead, Activity) without a transaction.
*   **Impact:** If the server crashes mid-execution, a user might lose credits without a request being recorded, or vice versa.
*   **Fix:** Wrap logic in `await sequelize.transaction(async (t) => { ... })`.

#### [MEDIUM] Unbounded Aggregation in `/recalculate-lead-scores`
This route fetches *all* leads where `source: 'gallery'` and then performs 5 `count` queries per lead.
*   **Impact:** This will time out or lock the database once you have >1,000 leads.
*   **Fix:** Use a single query with `LEFT JOIN` and `GROUP BY` to calculate counts for all leads at once, or process in batches of 100.

---

### 2. Scalability & State Management

#### [HIGH] Race Condition in Credit Updates
The code uses `visitor.update({ enhancementCredits: visitor.enhancementCredits - creditsToUse })`.
*   **Impact:** If a user double-clicks or sends two simultaneous requests, both might read the same initial credit value, leading to "double spending" or incorrect balances.
*   **Fix:** Use `visitor.decrement('enhancementCredits', { by: creditsToUse, transaction: t })`.

#### [MEDIUM] In-Memory Stripe Import
`const { default: Stripe } = await import('stripe');` is called inside the request body.
*   **Impact:** While this helps with cold starts (lazy loading), it creates overhead on every request.
*   **Fix:** Move the import to the top of the file. Node.js caches modules, but the logic is cleaner and avoids repeated resolution logic in the hot path.

---

### 3. Network & Memory Efficiency

#### [HIGH] Memory Bloat in `analyze-form`
The route `fetch`es the image from R2, converts it to a `Buffer`, and then to a `base64` string.
*   **Impact:** For a 10MB high-res photo, you are holding ~30MB of string data in V8 memory per request. Under high load, this will trigger OOM (Out of Memory) kills.
*   **Fix:** Stream the image directly to the Gemini API if possible, or resize/compress the image using `sharp` before converting to base64.

#### [MEDIUM] Missing Cache Headers
Public routes like `/events` and `/print-products` return static-heavy data but lack `Cache-Control` headers.
*   **Impact:** Unnecessary load on the Node.js process for data that changes infrequently.
*   **Fix:** Add `res.set('Cache-Control', 'public, max-age=300')`.

---

### 4. Security & Rate Limiting

#### [MEDIUM] Unprotected `recalculate-lead-scores`
The route `/recalculate-lead-scores` is a POST but has no authentication middleware.
*   **Impact:** An external attacker could spam this endpoint to trigger a Denial of Service (DoS) by forcing the DB to recalculate thousands of scores repeatedly.
*   **Fix:** Add an `admin` middleware check.

---

### 5. Code Splitting & Bundle Size (Frontend Context)
*Note: This review covers the backend, but the API design impacts the React frontend.*
*   **Finding:** The `/events/:slug/photos` endpoint returns `url`, `thumbnailUrl`, `width`, `height`, and `enhancementRequestCount` for *all* photos at once.
*   **Impact:** If an event has 500 photos, the JSON payload will be massive, delaying the "Time to Interactive" on the gallery page.
*   **Fix:** Implement pagination or "infinite scroll" support on the backend (`limit` and `offset`).

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **N+1 Queries in `/events`** | **CRITICAL** | Database Efficiency |
| **Non-Atomic Credit Updates** | **HIGH** | Scalability / Data Integrity |
| **Memory Bloat (Base64 Images)** | **HIGH** | Memory / Performance |
| **Missing DB Transactions** | **HIGH** | Scalability |
| **Unprotected Admin Route** | **MEDIUM** | Security |
| **Lack of Pagination for Photos** | **MEDIUM** | Network Efficiency |

### Recommended Action Plan
1.  **Immediate:** Wrap credit/payment logic in Sequelize transactions.
2.  **Immediate:** Fix the N+1 query in `galleryRoutes.mjs` using `include`.
3.  **Short-term:** Add `sharp` to the `formAnalysisService` to downscale images before AI processing to save memory.
4.  **Short-term:** Add an `isAdmin` check to the recalculation route.

---

*Part of SwanStudios 7-Brain Validation System*
