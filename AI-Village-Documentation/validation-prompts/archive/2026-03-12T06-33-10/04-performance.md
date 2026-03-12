# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.7s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 11:33:10 PM

---

This review focuses on the backend gallery management routes for SwanStudios. Given the **512MB RAM constraint** on Render and the handling of **150MB RAW files**, the primary concerns are memory exhaustion and database efficiency.

### Executive Summary
The code demonstrates high awareness of memory constraints (using `diskStorage`, `global.gc()`, and sequential processing). However, there are critical risks regarding **synchronous blocking of the Event Loop** during image processing and **N+1 query patterns** in the admin dashboard.

---

### 1. Database & Query Efficiency
#### [HIGH] N+1 and Unbounded Queries in `confirm-upload`
In the `confirm-upload` route, `GalleryPhoto.count` is called inside a loop (effectively) or immediately after a loop to update the `GalleryEvent`.
*   **Impact:** As the gallery grows to thousands of photos, these counts become expensive.
*   **Recommendation:** Use `sequelize.literal` to increment the `photoCount` in a single query or perform a single bulk count after the loop finishes.

#### [MEDIUM] Missing Pagination on Admin Lists
`GET /events`, `GET /visitors`, and `GET /enhancements` fetch all records without limits.
*   **Impact:** As the SaaS scales, fetching 5,000 visitors or 10,000 photos in one request will cause high latency and potential 504 Gateway Timeouts.
*   **Recommendation:** Implement `limit` and `offset` (pagination) for all admin list endpoints.

---

### 2. Scalability & Memory Leaks
#### [CRITICAL] Blocking the Event Loop with `readFileSync` and `writeFileSync`
In `reprocess-photo` and the background worker in `confirm-upload`, the code uses `fs.writeFileSync` and `fs.readFileSync`.
*   **Impact:** Node.js is single-threaded. Writing a 150MB RAW file to disk synchronously blocks **all other users** from accessing the API for several seconds.
*   **Recommendation:** Use `fs.promises.writeFile` or `fs.createReadStream`.

#### [HIGH] In-Memory Buffer Concatenation
The code downloads R2 objects by pushing chunks into an array and calling `Buffer.concat(chunks)`.
*   **Impact:** To process a 150MB file, you need 150MB for the chunks and another 150MB for the concatenated buffer. On a 512MB RAM plan, this leaves almost no room for the Node.js runtime and Sharp's internal memory.
*   **Recommendation:** Use **Streams**. Pipe the R2 `GetObject` stream directly into Sharp:
    ```javascript
    const obj = await r2Client.send(getCmd);
    const transformer = sharp().jpeg({ quality: 95 });
    const processedBuffer = await obj.Body.pipe(transformer).toBuffer();
    ```

---

### 3. Network Efficiency
#### [MEDIUM] Redundant Re-uploads in `confirm-upload`
For "Normal-sized files," the code downloads from R2, watermarks, and re-uploads.
*   **Impact:** High egress/ingress costs and latency.
*   **Recommendation:** If the file is already a JPEG and doesn't need conversion, use a Lambda/Edge function for watermarking, or ensure the frontend only sends "confirm" for files that actually require server-side processing.

#### [LOW] Presigned URL TTL
The `expiresIn: 600` (10 minutes) is appropriate for small batches but might expire if a user has a very slow upload speed for 50 RAW files.
*   **Recommendation:** Increase to 1800 (30 mins) for better UX on slow connections.

---

### 4. Security & Reliability
#### [HIGH] Shell Injection Risk in `dcraw` Pathing
The `getDcrawBin` function searches for binaries. While the paths are currently hardcoded, if any part of the file pathing becomes dynamic based on user input (like `photo.id` in temp filenames), it could lead to vulnerabilities.
*   **Recommendation:** Ensure `execFile` is always used (as you have done) rather than `exec`, but strictly sanitize the `tmpRaw` paths.

#### [MEDIUM] Atomic Operations
If the DB record creation succeeds but the R2 `PutObject` fails (or vice versa), the system enters an inconsistent state.
*   **Recommendation:** Wrap the DB creation and R2 cleanup in a try/catch block that deletes the DB record if the upload fails.

---

### 5. Code Splitting & Bundle Size (Backend Context)
#### [LOW] Dynamic Imports for Heavy SDKs
You are already using dynamic imports for `@aws-sdk/client-s3` and `sharp` in some routes.
*   **Impact:** This is excellent for keeping the initial process memory low.
*   **Recommendation:** Continue this pattern for `bcryptjs` and `dcrawr` only when needed.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| Synchronous FS operations blocking Event Loop | **CRITICAL** | Scalability |
| Buffer concatenation of large files (OOM Risk) | **HIGH** | Memory |
| N+1 Queries in upload loops | **HIGH** | Database |
| Missing Pagination on Admin endpoints | **MEDIUM** | Performance |
| Lack of atomic DB/Cloud Storage transactions | **MEDIUM** | Reliability |

### Performance Engineer's Pro-Tip:
On a **512MB Render instance**, you should set `UV_THREADPOOL_SIZE=1`. Sharp uses multiple threads by default, which can lead to memory fragmentation and "Memory Limit Exceeded" crashes when multiple images are processed near-simultaneously. Force sequential processing and limit the threadpool to stabilize the heap.

---

*Part of SwanStudios 7-Brain Validation System*
