# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 8.9s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/12/2026, 11:22:08 AM

---

As a Performance and Scalability Engineer, I have reviewed the `adminGalleryRoutes.mjs` file. The code demonstrates a sophisticated attempt to handle high-resolution photography (RAW files) on resource-constrained infrastructure (512MB RAM), but several architectural patterns pose significant risks to production stability and database performance.

### 1. Database Query Efficiency
| Finding | Rating | Description |
|:---|:---|:---|
| **N+1 Queries in Loops** | **HIGH** | The `confirm-upload` and `upload` routes perform `GalleryPhoto.count` and `GalleryEvent.update` inside a `for` loop. For a batch of 50 photos, this triggers 100+ database roundtrips. |
| **Missing Pagination** | **MEDIUM** | `GET /events`, `/visitors`, and `/donations` fetch all records without `limit` or `offset`. As the business grows, these endpoints will slow down and eventually time out or crash the Node process. |
| **Unindexed Slug Lookups** | **LOW** | `GalleryEvent.findOne({ where: { slug } })` is used. Ensure a unique index exists on `slug` in the PostgreSQL schema to prevent full table scans. |

### 2. Network Efficiency
| Finding | Rating | Description |
|:---|:---|:---|
| **Redundant R2 Downloads** | **CRITICAL** | In `confirm-upload`, the server downloads the raw file from R2, processes it, and re-uploads it. This doubles the bandwidth cost and adds significant latency. |
| **Base64 Fallback** | **MEDIUM** | If R2 is unavailable, the code returns the entire image as a Base64 string in the JSON response. This can easily exceed the 4MB-10MB limit of many API gateways/proxies and bloat the response size by 33%. |

### 3. Memory & Scalability
| Finding | Rating | Description |
|:---|:---|:---|
| **Blocking Event Loop (Sharp/dcraw)** | **CRITICAL** | Synchronous file operations (`readFileSync`, `writeFileSync`, `unlinkSync`) and heavy CPU tasks (Sharp/dcraw) are executed on the main thread. This blocks the event loop, preventing the server from handling other concurrent requests. |
| **Zombie Processes** | **HIGH** | `execFileSync` and `execFileAsync` are used to call `dcraw`. If the Node process crashes or the request is aborted, these child processes may continue to run, consuming CPU/RAM (Zombies). |
| **In-Memory Buffer Bloat** | **HIGH** | `Buffer.concat(chunks)` for 150MB RAW files creates a copy in memory. On a 512MB plan, having two concurrent uploads will trigger an **OOM (Out of Memory)** crash immediately. |
| **Non-Atomic State** | **MEDIUM** | `nextNumber = (maxPhoto || 0) + 1` is calculated in-memory. In a multi-instance (scaled) environment, two admins uploading simultaneously will result in duplicate `photoNumber` values. |

### 4. Memory Leaks
| Finding | Rating | Description |
|:---|:---|:---|
| **Manual GC Dependency** | **MEDIUM** | The code relies on `global.gc()`. This is a "code smell" indicating that memory management is not being handled correctly via streams. It also requires the `--expose-gc` flag, which may not be present in all environments. |
| **Unlinked Temp Files** | **LOW** | While cleanup functions exist, a crash mid-execution in `reprocess-photo` will leave `.arw` and `.tiff` files in `/tmp`, eventually filling the disk. |

---

### Recommendations

#### 1. Implement Streaming (Performance)
Instead of `Buffer.concat`, use Node.js streams to pipe the R2 download directly into Sharp and then back to R2. This keeps memory usage constant regardless of file size.
```javascript
// Example of streaming vs Buffers
const passThrough = new PassThrough();
const uploadPromise = r2Client.send(new PutObjectCommand({ ..., Body: passThrough }));
await pipeline(obj.Body, sharpInstance, passThrough);
```

#### 2. Offload Heavy Processing (Scalability)
The `setImmediate` background processing is dangerous for a single-instance server. If the server restarts, the background task is lost.
*   **Short term:** Use a library like `p-queue` to limit concurrency of Sharp/dcraw tasks to 1 at a time.
*   **Long term:** Move RAW conversion and watermarking to a **Serverless Function** (AWS Lambda / Cloudflare Workers) or a dedicated worker process using a message queue (BullMQ/Redis).

#### 3. Batch Database Operations (Efficiency)
Replace individual `GalleryPhoto.create` calls in loops with `GalleryPhoto.bulkCreate`.
```javascript
// Instead of loop + create
await GalleryPhoto.bulkCreate(photoDataArray);
await GalleryEvent.increment('photoCount', { by: photoDataArray.length, where: { id: event.id } });
```

#### 4. Use `execFile` with AbortSignal
Always provide a timeout and an `AbortSignal` to `execFile` to ensure that `dcraw` processes are killed if the parent request times out.

#### 5. Database-Level Increments
To prevent race conditions on `photoNumber`, use a database sequence or `COALESCE((SELECT MAX(photo_number)...), 0) + 1` within a transaction.

---

*Part of SwanStudios 7-Brain Validation System*
