# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.4s
> **Files:** AI-Village-Documentation/gemini-consults/latest.md, backend/controllers/authController.mjs, backend/migrations/20260311000000-add-source-type-to-gallery-photos.cjs, backend/models/GalleryPhoto.mjs, backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 9:54:39 PM

---

This review focuses on the **SwanStudios** backend and architectural plan, specifically addressing the transition to RAW photo handling and the existing authentication logic.

### 1. Database & Query Efficiency
*   **Missing Index on `source_type`** | **MEDIUM**
    *   **Finding:** The migration adds `source_type` to `gallery_photos`, and the model reflects this, but no index is created.
    *   **Impact:** As the gallery grows, filtering for "RAW" vs "JPEG" photos (as suggested in the UI directives) will trigger full table scans.
    *   **Recommendation:** Add an index to `source_type` in a follow-up migration.
*   **Unbounded `User.findOne` in `forgotPassword`** | **LOW**
    *   **Finding:** The query uses `sequelize.fn('LOWER', ...)` on the email column.
    *   **Impact:** Functional indexes are required for this to be performant in PostgreSQL. Without a specific expression index on `LOWER(email)`, this query bypasses the standard unique index on `email`.
    *   **Recommendation:** Use a standard case-insensitive collation or ensure an expression index exists.

### 2. Network & Memory Efficiency
*   **OOM Risk: Multer Memory Storage (Critical Context)** | **CRITICAL**
    *   **Finding:** The documentation notes that 120MB RAW files cause OOM crashes on Render (512MB RAM).
    *   **Impact:** Even with a reduced batch size, `multer`'s default memory storage buffers the entire file into RAM before processing. Two concurrent 120MB uploads + Node.js overhead + Sharp processing will exceed 512MB instantly.
    *   **Recommendation:** Switch `multer` to `diskStorage` immediately or implement the suggested **tus** protocol (chunked uploads) to stream data directly to disk/S3, bypassing memory buffering.
*   **N+1 Risk in Gallery Associations** | **MEDIUM**
    *   **Finding:** `GalleryPhoto.associate` defines `hasMany` enhancement requests.
    *   **Impact:** If the admin dashboard lists photos and then queries requests per photo in a loop, it will trigger N+1 queries.
    *   **Recommendation:** Ensure `adminGalleryRoutes.mjs` (truncated in snippet) uses `include: [{ model: EnhancementRequest }]` with proper limit/offset.

### 3. Scalability Concerns
*   **In-Memory Rate Limiting (`loginAttempts`)** | **HIGH**
    *   **Finding:** `authController.mjs` uses `const loginAttempts = new Map();`.
    *   **Impact:** This state is local to the instance. If SwanStudios scales to 2+ instances on Render, a brute-force attack can rotate through instances to reset their attempt count. Additionally, a restart clears all blocks.
    *   **Recommendation:** Migrate `loginAttempts` to Redis as noted in the code's TODO.
*   **In-Memory Upload Queue State** | **MEDIUM**
    *   **Finding:** The plan suggests a `GlobalUploadManager` in React context.
    *   **Impact:** If the user refreshes the browser, the upload state is lost unless persisted.
    *   **Recommendation:** Use `localStorage` or `IndexedDB` to persist the `UploadQueue` metadata so the UI can resume tracking after a crash or refresh.

### 4. Security & Logic
*   **JWT Secret Fallback** | **HIGH**
    *   **Finding:** `generateRefreshToken` uses `process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET`.
    *   **Impact:** If the refresh secret isn't set, the access and refresh tokens use the same key. If an access token is compromised, the attacker has the key to forge refresh tokens.
    *   **Recommendation:** Force a unique `JWT_REFRESH_SECRET` and throw an error during startup if it is missing.
*   **Bcrypt Blocking the Event Loop** | **MEDIUM**
    *   **Finding:** `bcrypt.hash(refreshToken, 10)` is called inside the login/refresh flow.
    *   **Impact:** While `bcryptjs` is asynchronous, it is CPU intensive. High login volume can lead to event loop lag.
    *   **Recommendation:** This is acceptable for current scale, but monitor "Event Loop Delay" metrics as the user base grows.

### 5. Performance & Bundle Size (Frontend Plan)
*   **Framer Motion Layout Animations** | **LOW**
    *   **Finding:** The plan specifies `layout` changes for reordering 40+ items.
    *   **Impact:** `layout` prop in Framer Motion triggers heavy calculations (getBoundingClientRect) on every frame for every sibling in the list.
    *   **Recommendation:** Use `React Window` or `TanStack Virtual` if the gallery upload queue exceeds 50 items to keep the DOM lean.
*   **Glassmorphism Performance** | **LOW**
    *   **Finding:** `backdrop-filter: blur(24px)` on a floating widget.
    *   **Impact:** High GPU usage on mobile devices, especially during concurrent CSS animations (the "Cosmic Pulse").
    *   **Recommendation:** Use `will-change: transform` on the progress bar and consider disabling blur on low-power devices via media queries.

### Summary Rating Table

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Multer Memory Storage OOM** | **CRITICAL** | Memory / Scalability |
| **In-Memory Rate Limiting** | **HIGH** | Scalability / Security |
| **JWT Secret Fallback** | **HIGH** | Security |
| **Missing Index on `source_type`** | **MEDIUM** | DB Efficiency |
| **In-Memory Upload State** | **MEDIUM** | UX / Scalability |
| **Bcrypt Event Loop Lag** | **MEDIUM** | Render Performance |

---

*Part of SwanStudios 7-Brain Validation System*
