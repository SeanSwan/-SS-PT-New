# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.6s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 11:06:49 PM

---

This review focuses on the **backend/routes/adminGalleryRoutes.mjs** file. As a performance and scalability engineer, I have identified several risks related to memory management on constrained environments (like Render's 512MB plan) and database efficiency.

### Executive Summary
The code demonstrates a high awareness of memory constraints by using `global.gc()` and sequential processing. However, the use of `multer.memoryStorage()` for 150MB files is a "Russian Roulette" strategy for OOM (Out of Memory) crashes. The background processing implementation also lacks a formal queue, which will lead to race conditions and resource exhaustion under load.

---

### 1. Database & Query Efficiency

#### [HIGH] Unbounded "List All" Queries
**Routes:** `/events`, `/visitors`, `/donations`, `/referrals`
**Finding:** These endpoints perform `findAll()` without pagination (`limit`/`offset`). 
**Impact:** As the platform grows, fetching thousands of visitors or photos in a single request will increase TTFB (Time to First Byte), consume excessive Node.js heap memory, and potentially lock database rows.
**Recommendation:** Implement cursor-based or offset-based pagination.

#### [MEDIUM] N+1 Potential in Stats Route
**Route:** `/stats`
**Finding:** Multiple `count()` and `sum()` calls are executed. While `Promise.all` helps with concurrency, these are separate round-trips to the DB.
**Impact:** Minor latency.
**Recommendation:** For high-scale, consider a single raw SQL query or a materialized view for dashboard stats if they don't need to be real-time.

---

### 2. Memory & Scalability

#### [CRITICAL] Memory Storage for Large Files
**Code:** `storage: multer.memoryStorage()` with `fileSize: 150 * 1024 * 1024`
**Finding:** You are accepting 150MB files into RAM. Node.js buffers require contiguous memory. On a 512MB RAM instance, a single 150MB upload + the overhead of `sharp` or `dcraw` processing will almost certainly trigger an OOM crash.
**Impact:** Server restarts during uploads, dropping all concurrent connections.
**Recommendation:** Switch to `multer.diskStorage()` to stream uploads to `/tmp` first, or use the `direct-r2` approach exclusively.

#### [HIGH] Volatile Background Processing (setImmediate)
**Route:** `/confirm-upload`
**Finding:** Background tasks are launched via `setImmediate`. 
**Impact:** 
1. **Scalability:** If the server restarts or crashes, the "queued" processing is lost forever, leaving "raw" files in the gallery.
2. **Resource Exhaustion:** If an admin confirms 20 RAW files, `setImmediate` will try to spawn 20 background tasks simultaneously, crushing the CPU and RAM.
**Recommendation:** Use a dedicated job queue like **BullMQ** (with Redis) to process watermarking and RAW conversion one-at-a-time across instances.

#### [MEDIUM] Manual Garbage Collection Dependency
**Finding:** Frequent calls to `global.gc()`.
**Impact:** This is a "code smell" indicating the memory pressure is too high for the V8 engine to manage. It also requires the `--expose-gc` flag to be set in production, or the app will crash.
**Recommendation:** Reduce the peak memory footprint by using **Streams** (e.g., streaming from R2 to Sharp and back to R2) instead of `Buffer.concat()`.

---

### 3. Network Efficiency

#### [MEDIUM] Over-fetching in Vote Stats
**Route:** `/events/:id/vote-stats`
**Finding:** You are fetching `url` and `thumbnailUrl` for every photo just to calculate vote counts.
**Impact:** Unnecessary payload size for an admin dashboard.
**Recommendation:** Only select the `id`, `photoNumber`, and `displayName` for the stats table.

#### [LOW] Redundant R2 Imports
**Finding:** `import()` is called inside loops or frequently hit routes (e.g., `getR2Client`).
**Impact:** Minor overhead, though ESM caches these.
**Recommendation:** Move these to the top-level scope or a singleton service initialized once.

---

### 4. Scalability Concerns

#### [HIGH] Multi-Instance Race Conditions
**Finding:** `GalleryPhoto.max('photoNumber')` followed by `GalleryPhoto.create()`.
**Impact:** If two trainers upload photos to the same event simultaneously on different server instances, they may calculate the same `nextNumber`, leading to a Unique Constraint violation or duplicate display names.
**Recommendation:** Use a database sequence or a transaction with `SELECT ... FOR UPDATE` to lock the event record while calculating the next photo number.

#### [MEDIUM] Local File System Dependency (dcraw)
**Finding:** The `reprocess-photo` and `confirm-upload` routes write to `tmpdir()`.
**Impact:** In a multi-instance/containerized environment, the local disk is ephemeral and not shared. While fine for a single task, it prevents moving to a serverless architecture (like AWS Lambda) easily.
**Recommendation:** Ensure the cleanup (`unlinkSync`) is robust (use `finally` blocks) to prevent filling up the container's disk.

---

### Ratings Summary

| Finding | Rating | Category |
| :--- | :--- | :--- |
| **Multer Memory Storage (150MB)** | **CRITICAL** | Memory / Stability |
| **setImmediate for Heavy Processing** | **HIGH** | Scalability / Reliability |
| **N+1 / Unbounded Queries** | **HIGH** | Database Efficiency |
| **Race Condition on Photo Numbers** | **HIGH** | Scalability |
| **Manual GC Dependency** | **MEDIUM** | Memory |
| **Over-fetching in Admin APIs** | **MEDIUM** | Network Efficiency |

### Recommended Action Plan
1. **Immediate:** Change Multer to use `diskStorage` to protect the Node.js heap.
2. **Short-term:** Add `LIMIT` and `OFFSET` to all admin list routes.
3. **Long-term:** Implement **BullMQ** for the RAW/Watermark processing to ensure reliability and resource throttling.

---

*Part of SwanStudios 7-Brain Validation System*
