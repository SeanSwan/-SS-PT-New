# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 12.4s
> **Files:** docs/ai-workflow/blueprints/GALLERY-QUALITY-SHOWCASE-PLAN.md
> **Generated:** 3/12/2026, 4:52:49 PM

---

As a Performance and Scalability Engineer, I have reviewed the **Gallery Quality Showcase Plan**. While the feature provides significant marketing value, the current implementation plan contains several bottlenecks regarding server-side processing, memory management, and network efficiency.

### Executive Summary: Performance Rating
| Category | Rating |
| :--- | :--- |
| **Bundle Size** | **LOW** (Minimal impact) |
| **Render Performance** | **MEDIUM** (Potential layout shift) |
| **Network Efficiency** | **HIGH** (Heavy payload in JSONB) |
| **Memory Leaks** | **LOW** (None identified) |
| **Database Efficiency** | **MEDIUM** (JSONB bloat) |
| **Scalability** | **CRITICAL** (Blocking Event Loop) |

---

### 1. Blocking the Node.js Event Loop (Scalability)
**Rating: CRITICAL**

The `generateShowcaseVariants` function uses a `for...of` loop to perform 8 separate `sharp` operations (5 full-size, 3 crops) sequentially on the main thread.
*   **Issue:** Image processing is CPU-intensive. While Sharp uses libvips (C++), the overhead of managing 8 buffers in a single request will block the Node.js event loop, preventing the instance from handling other API requests (like gallery browsing) for several seconds.
*   **Recommendation:** 
    1.  Offload this to a **Worker Thread** or a background job queue (e.g., BullMQ + Redis).
    2.  Use `Promise.all` to allow libvips to utilize internal multi-threading more effectively, rather than sequential execution.

### 2. Memory Exhaustion / Buffer Bloat (Memory/Scalability)
**Rating: HIGH**

The code holds the `inputBuffer` and then generates 8 additional buffers in memory simultaneously before uploading to R2.
*   **Issue:** A 6000x4000 RAW/JPEG can easily consume 70-100MB of uncompressed pixel data in memory. Multiplying this by 8 variants + the original buffer could exceed 500MB+ for a single request. Under concurrent admin uploads, the container will hit OOM (Out of Memory) limits.
*   **Recommendation:** 
    1.  Use **Streams** instead of Buffers where possible.
    2.  Process and upload variants to R2 **sequentially** and clear the buffer from memory immediately after each upload, rather than storing them all in a `variants` object.

### 3. JSONB Bloat & Over-fetching (Network/Database)
**Rating: HIGH**

Storing the entire `showcase_data` (including 8+ URLs, keys, sizes, and labels) inside a JSONB column on the `GalleryEvent` table.
*   **Issue:** If the `GalleryEvent` table is queried frequently for lists (e.g., `SELECT * FROM gallery_events`), the database must pull this large JSON blob for every row, increasing I/O and memory usage. Furthermore, the frontend `GalleryPage` likely doesn't need the full showcase metadata until the user is actually viewing the showcase.
*   **Recommendation:** 
    1.  Keep the JSONB but ensure it is excluded from "List" queries using Sequelize `attributes: { exclude: ['showcase_data'] }`.
    2.  Better: Use a separate `ShowcasePhotos` table to keep the primary `GalleryEvent` table lean.

### 4. Cumulative Layout Shift (Render Performance)
**Rating: MEDIUM**

The plan places the Showcase Card at the top of the gallery.
*   **Issue:** Since the showcase data is fetched via a separate API call (`/api/gallery/:slug/showcase`), the gallery grid will likely render first, then "jump" down once the showcase card loads its images and file-size bars.
*   **Recommendation:** 
    1.  Server-side render (SSR) the initial dimensions of the showcase card.
    2.  Implement a **Skeleton Loader** that matches the exact height of the card (including the comparison bars) to prevent layout shift.

### 5. Unbounded Image Processing (Scalability)
**Rating: MEDIUM**

The code accepts a "single file photo" without explicit dimension or file-size limits before processing.
*   **Issue:** An admin could upload a 100MB TIFF or a 20k resolution image, causing the `sharp(inputBuffer).metadata()` call to crash the process or hang the CPU.
*   **Recommendation:** 
    1.  Implement a `fileFilter` in Multer to limit file size (e.g., max 50MB).
    2.  Add a pre-check on dimensions before starting the 8-variant pipeline.

### 6. Missing Cache Headers (Network Efficiency)
**Rating: LOW**

The variants are generated once and stored in R2.
*   **Issue:** The API response for `/api/gallery/:slug/showcase` is highly static but lacks a caching strategy.
*   **Recommendation:** 
    1.  Add `Cache-Control: public, max-age=3600` to the GET endpoint.
    2.  Ensure R2 objects are served with long-lived immutable cache headers.

---

### Optimized Code Suggestion (Backend)

```javascript
// Use a worker-thread or background job for this!
async function generateAndUploadShowcase(inputBuffer, eventId) {
  const pipeline = sharp(inputBuffer);
  const metadata = await pipeline.metadata();

  // Process variants one-by-one to save memory
  for (const q of qualities) {
    const buffer = await sharp(inputBuffer) // New instance to avoid state pollution
      .resize(q.maxWidth || null)
      .jpeg({ quality: q.quality, mozjpeg: true })
      .toBuffer();
    
    const uploadResult = await uploadToR2(`showcase_${q.key}.jpg`, buffer);
    // Store reference immediately or collect for one DB update
    await updateDbVariant(eventId, q.key, uploadResult.url, buffer.length);
    
    // Explicitly nullify buffer to hint GC
    buffer = null; 
  }
}
```

### Final Verdict
The feature is well-designed for the **Crystalline Swan** aesthetic, but the **backend processing must be asynchronous (background job)** to prevent production downtime during admin uploads. The frontend must use **Skeleton Screens** to maintain the "Luxury Vault" feel without jarring layout jumps.

---

*Part of SwanStudios 7-Brain Validation System*
