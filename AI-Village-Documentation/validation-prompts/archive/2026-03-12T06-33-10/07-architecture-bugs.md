# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 28.5s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 11:33:10 PM

---

# Deep Code Review: adminGalleryRoutes.mjs

## Executive Summary

This file contains **significant production risks** including race conditions, missing input validation, potential memory leaks in background processing, and hardcoded URLs. The architecture is functional but would benefit from service extraction.

---

## 1. Bug Detection

### Race Condition in Photo Number Assignment
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | Lines 250-260, 380-420, 520-540, 750-800 | Multiple concurrent uploads can receive the same `photoNumber`. The code calculates `maxPhoto` then increments, but two simultaneous requests will both read the same max and assign duplicate numbers. | Use database-level atomic increment or add optimistic locking with retry logic:<br><br>`const photoNumber = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } }) || 0;`<br>`// Add unique constraint on (eventId, photoNumber) and catch duplicate key error with retry` |

### Slug Uniqueness Not Enforced on Update
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 140-145 | PATCH /events/:id regenerates slug when name changes but doesn't check for duplicates. Can create events with duplicate slugs, breaking public gallery links. | Add uniqueness check after slug regeneration:<br><br>`if (name !== undefined) {`<br>`  updates.name = name.trim();`<br>`  const newSlug = slugify(name.trim());`<br>`  const existing = await GalleryEvent.findOne({ where: { slug: newSlug, id: { [Op.ne]: req.params.id } } });`<br>`  if (existing) return res.status(409).json({ error: 'Event name conflict' });`<br>`  updates.slug = newSlug;`<br>`}` |

### Background Processing Silent Failure
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 750-800 | Large/RAW files create DB record with `processing: true` then use `setImmediate` for background conversion. If background fails, photo remains in "processing" state indefinitely with no retry mechanism or admin notification. | Add a scheduled job to clean up stuck processing records, or implement a callback/webhook when background completes. At minimum, log a distinct error that can be monitored. |

### Missing Null Check on R2 Client
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 310-320, 400-410, 530-550 | Code checks `if (r2Configured)` but then proceeds without checking if `r2Client` is actually truthy. Could cause undefined method errors. | Add explicit null check:<br><br>`if (!r2Client) {`<br>`  return res.status(503).json({ error: 'R2 not available' });`<br>`}` |

### Memory Not Released on Early Returns
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 200-350 | In single upload, if RAW conversion fails at line ~260, the `uploadedPath` temp file may not be cleaned up before returning error. | Ensure cleanup in all early return paths:<br><br>`catch (dcrawErr) {`<br>`  cleanupTemp(uploadedPath, tiffPath);`<br>`  return res.status(422)...`<br>`}` |

---

## 2. Architecture Flaws

### God Endpoint - Single Upload (300+ lines)
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 200-350 | Endpoint handles: file validation, RAW detection, dcraw execution, TIFF conversion, JPEG conversion, watermark, R2 upload, DB creation, event update. Should be split into service functions. | Extract to `services/photoProcessing.mjs`:<br><br>`export async function processUploadedPhoto(file, options) {`<br>`  // RAW detection, conversion, watermark logic`<br>`}`<br>`export async function uploadToStorage(buffer, key) { ... }` |

### God Endpoint - Confirm Upload (500+ lines)
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 750-1250 | Extremely long endpoint with branching logic for large files vs normal files, background processing, inline imports. Should be refactored. | Split into: `processDirectUpload()`, `processBackgroundUpload()`, `confirmUploadBatch()` |

### Duplicate Logic Across Endpoints
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 200-350, 380-600, 750-1250 | RAW detection regex, JPEG conversion via sharp, watermark application, R2 upload pattern repeated 3 times. | Create shared `services/photoProcessor.mjs` with reusable functions |

---

## 3. Integration Issues

### Hardcoded CORS Origins
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 570-580 | CORS allowed origins hardcoded in `setup-r2-cors` endpoint. Should be environment-driven for different deployments. | Use environment variable:<br><br>`const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') \|\| [`<br>`  'https://sswanstudios.com',`<br>`  'https://www.sswanstudios.com'`<br>`];` |

### No Input Validation on Presigned Upload
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 520-540 | `files` array in request body not validated. No check for file name length, size limits, or malicious filenames. | Add validation:<br><br>`const MAX_FILE_SIZE = 150 * 1024 * 1024;`<br>`for (const file of files) {`<br>`  if (!file.name || file.name.length > 255) return 400;`<br>`  if (!file.size || file.size > MAX_FILE_SIZE) return 400;`<br>`}` |

### Inconsistent Metadata Structure
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 290-300 vs 440-450 | Single upload includes `sourceType` in metadata, batch upload doesn't. Makes frontend parsing inconsistent. | Standardize metadata schema across all upload paths |

### No Validation on Photo Number in Confirm
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 750-800 | `confirm-upload` accepts any `photoNumber` from client without validation. Could create gaps or duplicates. | Validate photoNumber is next expected value or within valid range |

---

## 4. Dead Code & Tech Debt

### Unused Import
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Line 30 | `execFileSync` imported but only `execFile` (async) is used in the file | Remove `execFileSync` from import |

### Inconsistent Import Style
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Lines 760-780, 850-870 | Dynamic imports used inside functions (`await import('sharp')`) while top-level imports exist. Should be consistent. | Move to top-level imports or document why dynamic is needed |

### Magic Numbers
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 55, 380, 520 | `150 * 1024 * 1024` (150MB), `50 * 1024 * 1024` (50MB), `600` (10 min) repeated. Should be constants. | Define at top:<br><br>`const MAX_FILE_SIZE = 150 * 1024 * 1024;`<br>`const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;`<br>`const PRESIGN_EXPIRY_SECONDS = 600;` |

---

## 5. Production Readiness

### No Rate Limiting on Expensive Operations
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 380-600 | Batch upload allows 50 files per request. RAW conversion is CPU-intensive. No protection against DoS via repeated large batch uploads. | Add rate limiting middleware or per-user concurrency limits |

### Missing Request Size Validation
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 520-540 | `presign-upload` accepts `files` array without validating total request size. Could send thousands of small file requests. | Add request body size limit at Express level:<br><br>`app.use(express.json({ limit: '1mb' }));` |

### No Transaction for Photo + Event Update
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 300-310 | Photo creation and event photoCount update are not atomic. If event update fails after photo created, counts become inconsistent. | Wrap in transaction:<br><br>`await sequelize.transaction(async (t) => {`<br>`  const photo = await GalleryPhoto.create({...}, { transaction: t });`<br>`  await event.update({ photoCount: totalPhotos }, { transaction: t });`<br>`});` |

### Potential Memory Leak in Batch Upload
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 380-600 | In batch upload loop, `inputBuffer` is set to null but `processedBuffer` is not explicitly nullified before next iteration. Could hold references. | Add explicit cleanup:<br><br>`processedBuffer = null;`<br>`if (global.gc) global.gc();` |

### Missing Error Context in Logs
| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Lines 260-270, 400-410 | Error logs include message but not request context (user ID, event ID, IP). Makes debugging production issues difficult. | Add request context:<br><br>`logger.error('[AdminGallery] Upload error', {`<br>`  userId: req.user?.id,`<br>`  eventId: req.params.id,`<br>`  error: err.message`<br>`});` |

---

## Summary by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 1 | Race condition on photo numbers |
| **HIGH** | 6 | Slug uniqueness, background failure, CORS hardcoding, input validation, rate limiting, request size |
| **MEDIUM** | 8 | Null checks, memory cleanup, god endpoints, duplicate logic, transactions,

---

*Part of SwanStudios 7-Brain Validation System*
