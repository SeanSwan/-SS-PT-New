# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.1s
> **Files:** AI-Village-Documentation/PHOTO-GALLERY-LEAD-GEN-PLAN.md
> **Generated:** 3/8/2026, 2:21:46 PM

---

As a Performance and Scalability Engineer, I have reviewed the **SwanStudios Photo Gallery & Lead Generation System** architecture. While the business logic is sound, several technical bottlenecks in the proposed data structures and API flows will impact performance as the photo library grows.

### Executive Summary of Findings
| Category | Critical | High | Medium | Low |
| :--- | :---: | :---: | :---: | :---: |
| **Bundle & Render** | 0 | 1 | 2 | 0 |
| **Network & Database** | 1 | 2 | 1 | 0 |
| **Scalability & Memory** | 0 | 1 | 1 | 0 |

---

### 1. Database & Query Efficiency
#### [CRITICAL] N+1 Query Risk in Admin Enhancement Queue
**Finding:** The `EnhancementRequest` model links to `GalleryVisitor` and `GalleryPhoto`.
**Risk:** The Admin Dashboard route `/api/admin/gallery/enhancements` will likely fetch a list of requests. Without explicit eager loading (`include` in Sequelize), the server will execute 1 query for the list + 2 queries per row to fetch visitor and photo details.
**Recommendation:** Ensure the admin endpoint uses `include: [{ model: GalleryVisitor }, { model: GalleryPhoto }]` and implement **keyset pagination**.

#### [HIGH] Missing Indexes on High-Frequency Columns
**Finding:** The schema defines fields but lacks explicit indexing strategy for high-traffic lookups.
**Risk:** As the `GalleryVisitor` table grows (lead gen), lookups by `email` or `eventId` will slow down significantly.
**Recommendation:** Add composite indexes:
- `GalleryVisitor`: `(email, eventId)`
- `GalleryPhoto`: `(eventId, photoNumber)`
- `EnhancementRequest`: `(status, createdAt)` for the admin queue.

#### [MEDIUM] Denormalized `photoCount` Sync
**Finding:** `GalleryEvent` includes a `photoCount` field.
**Risk:** If bulk uploads fail mid-process or photos are deleted, this count will drift from reality.
**Recommendation:** Use a database trigger or a Sequelize hook to update this count, rather than manual increments in the application logic.

---

### 2. Network Efficiency
#### [HIGH] Thumbnail vs. Full-Res Payload
**Finding:** The `GalleryPhoto` model stores both `url` and `thumbnailUrl`.
**Risk:** If the `/api/gallery/events/:slug/photos` endpoint returns the full object (including metadata and full-res URLs) for 500+ photos, the JSON payload will exceed 1MB, delaying the "Time to Interactive."
**Recommendation:** 
- The grid API should **only** return `id`, `thumbnailUrl`, and `photoNumber`.
- Fetch `metadata` and `url` (full-res) only when a specific photo is opened in the Lightbox.

#### [MEDIUM] Lack of Image Optimization at the Edge
**Finding:** Using Cloudflare R2 for storage.
**Risk:** Serving raw JPGs directly from R2 is egress-heavy.
**Recommendation:** Leverage **Cloudflare Image Resizing**. Instead of storing a separate `thumbnailKey`, store one high-res master and use URL parameters (e.g., `/cdn-cgi/image/width=300,quality=75/path/to/image.jpg`) to generate thumbnails on the fly. This reduces storage costs and improves cache hits.

---

### 3. Render Performance & Lazy Loading
#### [HIGH] Masonry Grid Reflows
**Finding:** "Photo grid: masonry or uniform grid, lazy-loaded thumbnails."
**Risk:** Masonry layouts often cause "Layout Shift" (CLS) as images load, especially if `width` and `height` aren't known before the image binary arrives.
**Recommendation:** Use the `width` and `height` stored in the `GalleryPhoto` table to calculate **aspect-ratio boxes** in CSS/styled-components. This allows the browser to reserve space before the image loads, preventing jumpy UI.

#### [MEDIUM] Component Code-Splitting
**Finding:** New routes like `/gallery/:slug` and `/dashboard/content/gallery`.
**Risk:** Adding these to the main bundle will increase the initial load time for the landing page.
**Recommendation:** Use `React.lazy()` and `Suspense` for the Gallery and Admin modules. The Admin Photo Manager (with drag-and-drop libs) should be in a separate chunk entirely.

---

### 4. Scalability & Memory
#### [HIGH] In-Memory "Gallery Access Tokens"
**Finding:** "Short-lived JWTs (24h) issued after email+password verification."
**Risk:** If these tokens are stored in an in-memory cache (like a local JS object) on the Node.js server, they will vanish on every deployment or if you scale to multiple instances (PM2 or Docker).
**Recommendation:** Since they are JWTs, ensure they are **stateless** (signed with a secret). Do not store session state in memory. If you need to revoke them, use Redis.

#### [MEDIUM] Bulk Upload Memory Pressure
**Finding:** `multer` array for bulk photo uploads.
**Risk:** Processing 100+ high-res JPGs in a single request can spike Node.js heap memory, potentially crashing the instance.
**Recommendation:** 
1. Implement **Client-side direct-to-R2 uploads** using Presigned URLs. 
2. The browser uploads directly to R2; the backend only receives the metadata/keys. This offloads all heavy I/O and memory usage from your Node.js server.

---

### 5. Memory Leaks
#### [LOW] Lightbox Event Listeners
**Finding:** Lightbox with arrow navigation.
**Risk:** Common source of leaks in React if `keydown` listeners for gallery navigation aren't cleaned up in `useEffect` return statements.
**Recommendation:** Ensure a robust cleanup pattern for global window listeners in the Lightbox component.

---

### Final Performance Rating: **B-**
The plan is architecturally sound for a MVP, but the **Bulk Upload** and **Grid Data Fetching** strategies require optimization to handle events with >200 photos without degrading the user experience or crashing the backend. Moving to **Presigned URLs** for uploads is the single most important change for scalability.

---

*Part of SwanStudios 7-Brain Validation System*
