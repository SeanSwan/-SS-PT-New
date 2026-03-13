# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 12.4s
> **Files:** docs/ai-workflow/blueprints/GALLERY-STRATEGY-REVISED-PLAN.md, docs/ai-workflow/blueprints/GALLERY-PERFORMANCE-THUMBNAIL-PLAN.md
> **Generated:** 3/12/2026, 5:05:16 PM

---

This performance and scalability review focuses on the **Gallery Strategy** and **Thumbnail Generation Plan** for SwanStudios.

### Executive Summary
The transition from a RAW-heavy pipeline to a pre-processed JPEG pipeline is a **massive architectural win**. It shifts heavy computation (RAW debayering) to the edge (Photographer's local machine) and optimizes the delivery layer. However, there are specific risks regarding Node.js memory management during batch processing and frontend layout stability.

---

### 1. Bundle Size & Frontend Impact
**Finding: Potential for Heavy Image Component Logic**
*   **Rating: LOW**
*   **Analysis:** Adding aspect-ratio logic and multiple URL handling to the `GalleryPage.tsx` and `PhotoDetailModal.tsx` is lightweight. However, ensure that the `sharp` library or any heavy image manipulation libraries are **never** imported into the frontend source, as they are Node-only and will break the build or bloat the bundle if shimmed.
*   **Recommendation:** Use standard `<img>` tags with `loading="lazy"` and `decoding="async"` to keep the main thread free.

### 2. Render Performance
**Finding: Layout Instability (CLS) during Thumbnail Loading**
*   **Rating: MEDIUM**
*   **Analysis:** The plan mentions extracting `width` and `height` for CLS prevention. If the React component waits for the API to return these values before setting the container size, the "jump" still occurs.
*   **Recommendation:** Ensure the API returns `aspectRatio` (width/height) as a single float. In React, apply `aspect-ratio: ${ratio}` via `styled-components` on a wrapper `div` *before* the image loads. This reserves the exact vertical space on the grid.

### 3. Network Efficiency
**Finding: Lack of Responsive Images (`srcset`)**
*   **Rating: MEDIUM**
*   **Analysis:** The plan uses a "Medium" (1200px) and "Thumb" (400px). While better than original files, a single 400px thumbnail on a high-DPI (Retina) mobile device may look blurry, while a 1200px modal image is overkill for a small phone.
*   **Recommendation:** Implement `srcset` on the frontend.
    ```html
    <img src="thumb.jpg" srcset="thumb.jpg 400w, medium.jpg 1200w" sizes="(max-width: 600px) 400px, 1200px">
    ```
    This allows the browser to choose the most efficient asset based on device pixel density.

### 4. Memory Leaks & Resource Exhaustion
**Finding: Buffer Accumulation in Batch Uploads**
*   **Rating: HIGH**
*   **Analysis:** The plan suggests `Promise.all` for uploading 3 variants to R2. In a batch upload of 10+ photos, if the backend holds the `processedBuffer`, `thumbBuffer`, and `mediumBuffer` in memory simultaneously for all concurrent uploads, the Node.js heap will hit the **512MB Render limit** quickly and crash (OOM).
*   **Recommendation:** 
    1.  Use a **sequential processing queue** (e.g., `p-map` with `concurrency: 2`) for the Sharp transformations.
    2.  Nullify buffer references immediately after the R2 upload promise resolves.
    3.  Use `sharp.concurrency(1)` to limit libvips thread pool usage on small instances.

### 5. Database Query Efficiency
**Finding: Unbounded Gallery Queries**
*   **Rating: MEDIUM**
*   **Analysis:** As the photographer adds more "Crops" (Problem #3 in the plan), an event with 153 photos could grow to 300+. Fetching all 300 metadata rows in one `GalleryPhoto.findAll()` call increases JSON payload size and DB memory.
*   **Recommendation:** Implement **Keyset Pagination** (e.g., `WHERE id > last_seen_id LIMIT 50`) for the gallery grid. Even with thumbnails, loading 300+ DOM nodes at once impacts scroll performance.

### 6. Scalability Concerns
**Finding: Local File System Dependency**
*   **Rating: LOW**
*   **Analysis:** The plan correctly uses R2 (S3-compatible) storage. This allows the app to scale to multiple instances.
*   **Warning:** Ensure the `processedBuffer` is never written to a local `/temp` folder. If it is, the app will fail in a multi-instance environment (or on ephemeral disks like Heroku/Render) if the cleanup fails or the disk fills up. Stick to **In-Memory Buffers** or **Streams**.

### 7. Critical Logic Review: RAW Rejection
**Finding: User Experience Friction on RAW Upload**
*   **Rating: LOW**
*   **Analysis:** The plan to reject RAW files is correct for performance. 
*   **Recommendation:** Ensure the `422 Unprocessable Entity` response includes the specific "Lightroom Export Guide" text so the photographer doesn't have to hunt for documentation when an upload fails.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Node.js OOM during Batch Processing** | **HIGH** | Memory/Scalability |
| **Missing `srcset` for High-DPI screens** | **MEDIUM** | Network Efficiency |
| **Unbounded DB Queries for large events** | **MEDIUM** | DB Efficiency |
| **CLS Prevention via CSS Aspect Ratio** | **MEDIUM** | Render Performance |
| **Bundle Bloat (Potential)** | **LOW** | Bundle Size |

### Final Performance Engineer Pro-Tip:
Since you are using **Cloudflare R2**, you can enable **Cloudflare Polish** or **Image Resizing** on the edge. This would allow you to upload just the "Full" watermarked JPEG and let Cloudflare generate the WebP/AVIF thumbnails on-the-fly via URL parameters (e.g., `image.jpg?width=400`). This would eliminate the `imageVariantService.mjs` complexity entirely.

---

*Part of SwanStudios 7-Brain Validation System*
