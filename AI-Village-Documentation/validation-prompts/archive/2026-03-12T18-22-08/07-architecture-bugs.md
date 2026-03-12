# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 27.3s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/12/2026, 11:22:08 AM

---

# Deep Code Review: adminGalleryRoutes.mjs

## Executive Summary

This file handles critical admin operations for the SwanStudios gallery system including photo uploads, event management, and visitor tracking. I've identified **multiple production-critical bugs** including race conditions, security vulnerabilities, and potential data loss scenarios.

---

## 1. Bug Detection

### CRITICAL: Race Condition in Photo Numbering

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | Lines 92-93, 280-281, 489-490 | Photo number calculated via `max('photoNumber') + 1` without locking. Concurrent uploads get duplicate numbers. | Use database transaction with `FOR UPDATE` or atomic increment via SQL: `UPDATE gallery_events SET photo_count = photo_count + 1` |
| **CRITICAL** | Lines 280-281 (batch upload) | Same race condition in legacy batch upload | Same fix - wrap in transaction |

```javascript
// BROKEN: Race condition
const maxPhoto = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } });
const photoNumber = (maxPhoto || 0) + 1;

// FIX: Use atomic counter or transaction lock
const event = await GalleryEvent.findByPk(req.params.id, { lock: true, transaction });
const photoNumber = (event.photoCount || 0) + 1;
```

---

### HIGH: Slug Collision on Event Update

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 118-122 | PATCH event checks slug uniqueness but doesn't exclude current event. Updating name to itself fails with "already exists" error. | Add `where: { slug, id: { [Op.ne]: req.params.id } }` to the uniqueness check |

```javascript
// BROKEN: Will match current event
const existing = await GalleryEvent.findOne({ where: { slug } });

// FIX: Exclude current event
const existing = await GalleryEvent.findOne({ 
  where: { slug, id: { [Op.ne]: req.params.id } } 
});
```

---

### HIGH: Missing Type Guards on Input

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 106, 148-153 | `name?.trim()` called without validating `name` is string. Non-string (array, object) throws TypeError. | Add type validation: `if (typeof name !== 'string')` |
| **HIGH** | Lines 106, 148-153 | No validation that `eventDate` is valid date string | Parse and validate date format |

---

### HIGH: Background Processing Uses Stale Closure

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 571-644 | `setImmediate` captures `r2Client` from outer scope. After request completes, client may be invalidated or connection closed. | Pass required data as parameters, re-initialize client in background handler |

```javascript
// BROKEN: Captures potentially stale r2Client
setImmediate(async () => {
  // r2Client may be invalid after parent request completes
  const obj = await r2Client.send(getCmd);
});

// FIX: Re-initialize in background
setImmediate(async () => {
  const { getR2Client } = await import('../services/r2StorageService.mjs');
  const bgClient = getR2Client();
  // ... use bgClient
});
```

---

### MEDIUM: No Transaction for Photo + Event Updates

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 268-275 | Photo creation and event photoCount update aren't atomic. If second fails, data is inconsistent. | Wrap in Sequelize transaction |

```javascript
// BROKEN: Non-atomic operations
const photo = await GalleryPhoto.create({...});
const totalPhotos = await GalleryPhoto.count({...});
await event.update({ photoCount: totalPhotos });

// FIX: Use transaction
const result = await sequelize.transaction(async (t) => {
  const photo = await GalleryPhoto.create({...}, { transaction: t });
  const totalPhotos = await GalleryPhoto.count({ where: { eventId: event.id } }, { transaction: t });
  await event.update({ photoCount: totalPhotos }, { transaction: t });
  return photo;
});
```

---

### MEDIUM: Potential Data Loss on Failed Upload

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 268-290 | If `GalleryPhoto.create()` fails after R2 upload succeeds, the file remains orphaned in R2 with no DB record. | Delete R2 object in catch block or use cleanup mechanism |

---

### MEDIUM: Cover Photo Race Condition

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 272-273 | Multiple concurrent uploads all check `!event.coverPhotoId` and could set different photos as cover. | Use transaction with lock or set cover only on first upload via atomic check |

---

### LOW: Inconsistent Null Handling

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Multiple locations | Mix of `??` and `||` for null coalescing. `||` treats `0` and `''` as falsy. | Use `??` consistently for null/undefined only |

---

## 2. Architecture Flaws

### HIGH: God Route File

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Entire file (~900 lines) | Single file handles events, photos, uploads, visitors, donations, referrals, stats, CORS, reprocessing. Violates Single Responsibility Principle. | Split into: `eventRoutes.mjs`, `photoRoutes.mjs`, `visitorRoutes.mjs`, `adminRoutes.mjs` |

---

### MEDIUM: Duplicate Upload Logic

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 227-290 (single), 336-450 (batch), 530-644 (presign) | Three different upload paths with 70% duplicate code (RAW detection, conversion, watermark, R2 upload). | Extract to `photoProcessingService.mjs` |

---

### MEDIUM: Circular Import Risk

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 18-26 | Imports models directly. If models import routes, circular dependency. | Use dependency injection or service layer |

---

## 3. Integration Issues

### CRITICAL: Hardcoded Production URLs in CORS

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | Lines 541-548 | `https://sswanstudios.com` hardcoded in CORS config. Cannot change without code deploy. | Use `process.env.ALLOWED_ORIGINS` split by comma |

```javascript
// BROKEN
AllowedOrigins: ['https://sswanstudios.com', ...]

// FIX
AllowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
```

---

### HIGH: No Pagination on List Endpoints

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 84-93, 653-663, 720-732 | `/events`, `/photos`, `/visitors` return ALL records. Will fail with 1000+ events/photos. | Add `limit` and `offset` params with defaults (20-50) |

---

### HIGH: Missing Authorization on Photo Delete

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 670-697 | Any admin/trainer can delete ANY photo from ANY event. No check that user owns the event. | Add event ownership validation before delete |

---

### MEDIUM: Frontend-Backend Contract Mismatch

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 82-93 | `photoCount` returned in event but may not match actual photo count (race condition). Frontend may show wrong number. | Return actual count from query or use event.photoCount with verification |

---

### MEDIUM: Inconsistent Error Response Format

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Throughout | Some endpoints return `{ success: false, error }`, others return `{ success: false, error, hint }`, some return stack trace. | Create standardized error response helper |

---

## 4. Dead Code & Tech Debt

### MEDIUM: Unused Variables

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Line 31 | `literal` imported but never used | Remove import |
| **MEDIUM** | Line 31 | `col` imported but never used | Remove import |
| **MEDIUM** | Line 31 | `fn` imported but never used | Remove import |

---

### MEDIUM: Commented Code

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 52-53 | Commented-out code block for watermark options | Delete or implement |

---

### LOW: TODO Comments

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Throughout | Multiple `logger.info` statements that should be removed for production | Replace with appropriate log levels or remove |

---

## 5. Production Readiness

### CRITICAL: No Rate Limiting on Expensive Operations

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | Lines 227-290, 336-450 | RAW conversion (120s timeout), large file processing have no rate limiting. Single user can DoS the server. | Add express-rate-limit middleware |

```javascript
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: { success: false, error: 'Too many uploads, try again later' }
});

router.post('/events/:id/upload-single', uploadLimiter, ...);
```

---

### HIGH: No Input Validation on Public-Facing Fields

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Lines 106-108 | `name`, `password` accepted without sanitization. `password` has no min length. | Add validation: `name: { notEmpty: true, isLength: { min: 1, max: 100 } }`, `password: { isLength: { min: 6 } }` |
| **HIGH** | Lines 489-495 | `files` array in presign-upload has no validation on item structure | Validate: `files: { isArray: true, len: { min: 1, max: 50 } }` and each item has `name`, `size`, `type` |

---

### HIGH: No Request Validation on IDs

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Throughout | `req.params.id` used directly without UUID format validation. Invalid IDs cause database errors instead of 400. | Add UUID validation middleware or regex check |

---

### MEDIUM: Verbose Logging in Production

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Throughout | Excessive `logger.info` with file sizes, timing, etc. Should use `logger.debug` or `logger.verbose`. | Downgrade to debug level |

---

### MEDIUM: Missing Loading States Indication

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | N/A (backend) | Backend doesn't indicate processing progress. Large RAW files take minutes. | Add progress callback or chunked upload status |

---

### LOW: Global GC Calls

| Severity | File & Line | What's Wrong

---

*Part of SwanStudios 7-Brain Validation System*
