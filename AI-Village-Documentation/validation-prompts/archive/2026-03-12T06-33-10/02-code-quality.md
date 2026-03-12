# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 52.2s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 11:33:10 PM

---

# Code Review: backend/routes/adminGalleryRoutes.mjs

## Critical Issues

### 1. **Uncontrolled Memory Growth from Streaming Without Backpressure**
**Severity:** CRITICAL  
**Lines:** 404-407, 743-746

```javascript
const chunks = [];
for await (const chunk of obj.Body) chunks.push(chunk);
let rawBuf = Buffer.concat(chunks);
```

**Issue:** Accumulating all chunks in memory without size limits can cause OOM crashes on 512MB Render instances. A 150MB file becomes 150MB+ in heap.

**Fix:**
```javascript
const chunks = [];
let totalSize = 0;
const MAX_SIZE = 150 * 1024 * 1024;
for await (const chunk of obj.Body) {
  totalSize += chunk.length;
  if (totalSize > MAX_SIZE) throw new Error('File exceeds 150MB limit');
  chunks.push(chunk);
}
```

---

### 2. **Synchronous File Operations Blocking Event Loop**
**Severity:** CRITICAL  
**Lines:** 262-263, 277, 286, 288

```javascript
chmodSync(_dcrawBin, 0o755);
const tiffSizeMB = (statSync(tiffPath).size / 1024 / 1024).toFixed(1);
(fs.default || fs).writeFileSync(tmpRaw, rawBuf);
```

**Issue:** Synchronous FS operations block the event loop during large file processing (100MB+ RAW files), causing request timeouts for other users.

**Fix:**
```javascript
import { chmod, stat, writeFile, unlink } from 'fs/promises';

await chmod(_dcrawBin, 0o755);
const tiffStats = await stat(tiffPath);
await writeFile(tmpRaw, rawBuf);
```

---

### 3. **Unhandled Promise Rejections in Background Processing**
**Severity:** CRITICAL  
**Lines:** 755-822

```javascript
setImmediate(async () => {
  try {
    // ... background processing
  } catch (bgErr) {
    logger.error(`[AdminGallery/BG] ❌ Background processing failed`);
    // No error recovery, photo stuck in "processing: true" state
  }
});
```

**Issue:** Background failures leave photos in broken state with no retry mechanism. Database record shows `processing: true` forever.

**Fix:**
```javascript
setImmediate(async () => {
  try {
    // ... processing
  } catch (bgErr) {
    logger.error(`[AdminGallery/BG] Failed: ${bgErr.message}`);
    await GalleryPhoto.update(
      { 
        metadata: { 
          ...dbPhoto.metadata, 
          processing: false, 
          processingError: bgErr.message,
          failedAt: new Date().toISOString() 
        } 
      },
      { where: { id: bgPhotoId } }
    );
  }
});
```

---

### 4. **SQL Injection via Unsanitized `literal()` Usage**
**Severity:** CRITICAL  
**Lines:** 1049-1050

```javascript
[fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
[fn('SUM', literal("CASE WHEN vote_type = -1 THEN 1 ELSE 0 END")), 'thumbsDown'],
```

**Issue:** While currently safe (hardcoded values), using `literal()` is dangerous. If `vote_type` ever comes from user input, this becomes SQL injection.

**Fix:**
```javascript
[fn('SUM', fn('CASE', 
  { [Op.eq]: [col('vote_type'), 1] }, 1, 
  0
)), 'thumbsUp']
```

Or use raw query with parameterized values.

---

## High Priority Issues

### 5. **Race Condition in Photo Number Assignment**
**Severity:** HIGH  
**Lines:** 223, 486, 637

```javascript
const maxPhoto = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } });
let nextNumber = (maxPhoto || 0) + 1;
```

**Issue:** Concurrent uploads can assign duplicate photo numbers. Two requests reading `max=5` simultaneously will both create photo #6.

**Fix:**
```javascript
// Use database transaction with row-level lock
const result = await sequelize.transaction(async (t) => {
  const event = await GalleryEvent.findByPk(eventId, { 
    lock: t.LOCK.UPDATE, 
    transaction: t 
  });
  const nextNumber = event.nextPhotoNumber || 1;
  await event.update({ nextPhotoNumber: nextNumber + 1 }, { transaction: t });
  return nextNumber;
});
```

---

### 6. **Missing Input Validation on File Metadata**
**Severity:** HIGH  
**Lines:** 637-643

```javascript
const { photos, watermark: enableWatermark = true } = req.body;
if (!photos || !Array.isArray(photos) || photos.length === 0) {
  return res.status(400).json({ success: false, error: 'No photos to confirm' });
}
```

**Issue:** No validation of `photos` array contents. Malicious input like `{ rawKey: "../../etc/passwd" }` could cause path traversal.

**Fix:**
```javascript
const photoSchema = z.array(z.object({
  rawKey: z.string().regex(/^gallery-raw\/[a-z0-9-]+\/\d+-\d+\.jpg$/),
  finalKey: z.string().regex(/^gallery\/[a-z0-9-]+\/\d+\.jpg$/),
  photoNumber: z.number().int().positive(),
  displayName: z.string().max(100),
  originalName: z.string().max(255),
  fileSize: z.number().int().positive().max(150 * 1024 * 1024),
})).max(50);

const { photos } = photoSchema.parse(req.body);
```

---

### 7. **Uncontrolled Resource Exhaustion from Concurrent Background Jobs**
**Severity:** HIGH  
**Lines:** 755-822

**Issue:** No concurrency limit on background processing. Uploading 50 large RAW files triggers 50 simultaneous dcraw processes, exhausting CPU/RAM.

**Fix:**
```javascript
import pLimit from 'p-limit';
const bgProcessingQueue = pLimit(2); // Max 2 concurrent background jobs

bgProcessingQueue(async () => {
  // ... background processing
});
```

---

### 8. **Improper Error Handling Exposes Stack Traces**
**Severity:** HIGH  
**Lines:** 412, 547, 1025

```javascript
return res.status(500).json({ 
  success: false, 
  error: err.message, 
  stack: err.stack?.split('\n').slice(0, 3) 
});
```

**Issue:** Exposing stack traces in production leaks internal paths, library versions, and code structure to attackers.

**Fix:**
```javascript
logger.error('[AdminGallery] Error:', err.stack);
return res.status(500).json({ 
  success: false, 
  error: process.env.NODE_ENV === 'production' 
    ? 'Photo processing failed' 
    : err.message 
});
```

---

## Medium Priority Issues

### 9. **DRY Violation: R2 Client Initialization Repeated 7 Times**
**Severity:** MEDIUM  
**Lines:** 227-232, 483-488, 560-565, 639-644, 991-996

```javascript
let r2Client = null;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
try {
  const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
  if (r2Configured) r2Client = getR2Client();
} catch { /* */ }
```

**Fix:** Extract to middleware or helper:
```javascript
async function getR2ClientSafe() {
  try {
    const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
    return r2Configured ? getR2Client() : null;
  } catch {
    return null;
  }
}
```

---

### 10. **DRY Violation: Photo Metadata Construction Duplicated**
**Severity:** MEDIUM  
**Lines:** 347-355, 529-537, 815-823

**Fix:**
```javascript
function buildPhotoMetadata({ 
  originalName, 
  originalSize, 
  processedSize, 
  watermarked, 
  uploadMethod = 'legacy',
  processing = false 
}) {
  return {
    originalName,
    originalSize,
    processedSize,
    watermarked: watermarked && isWatermarkAvailable(),
    uploadMethod,
    processing,
    uploadedAt: new Date().toISOString(),
  };
}
```

---

### 11. **Missing Transaction Rollback on Partial Upload Failures**
**Severity:** MEDIUM  
**Lines:** 464-542

**Issue:** If 4/5 photos upload successfully but #5 fails, the 4 successful photos remain in DB/R2 but response shows `success: false`. User retries and creates duplicates.

**Fix:**
```javascript
const transaction = await sequelize.transaction();
try {
  // ... upload all photos
  await transaction.commit();
} catch (err) {
  await transaction.rollback();
  // Delete uploaded R2 files
  throw err;
}
```

---

### 12. **Inefficient Database Query: N+1 Problem**
**Severity:** MEDIUM  
**Lines:** 1036-1051

```javascript
const photos = await GalleryPhoto.findAll({ where: { eventId }, raw: true });
const photoIds = photos.map(p => p.id);
const voteCounts = await PhotoVote.findAll({ where: { photoId: photoIds }, ... });
```

**Issue:** Two separate queries when one JOIN would suffice.

**Fix:**
```javascript
const photos = await GalleryPhoto.findAll({
  where: { eventId },
  include: [{
    model: PhotoVote,
    attributes: [
      [fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
      [fn('COUNT', col('id')), 'totalVotes'],
    ],
  }],
});
```

---

### 13. **Hardcoded Magic Numbers**
**Severity:** MEDIUM  
**Lines:** 54, 167, 223, 486

```javascript
limits: { fileSize: 150 * 1024 * 1024, files: 2 }
```

**Fix:**
```javascript
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 150 * 1024 * 1024,
  MAX_FILES_SINGLE: 2,
  MAX_FILES_BATCH: 50,
  MAX_PRESIGN_BATCH: 50,
} as const;
```

---

### 14. **Missing Rate Limiting on Expensive Endpoints**
**Severity:** MEDIUM  
**Lines:** 195, 464, 637

**Issue:** No rate limiting on `/upload`, `/upload-single`, `/confirm-upload`. Attacker can exhaust server resources.

**Fix:**
```javascript
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 uploads per 15min per IP
  message: 'Too many upload requests, please try again later',
});

router.post('/events/:id/upload', uploadLimiter, ...);
```

---

## Low Priority Issues

### 15. **Inconsistent Error Message Formatting**
**Severity:** LOW  
**Lines:** 91, 127, 154, 180

```javascript
return res.status(500).json({ success: false, error: 'Failed to list events' });
return res.status(500).json({ success: false, error: 'Failed to create event' });
```

**Fix:** Standardize error responses:
```javascript
const errorResponse = (message: string, details?: unknown) => ({
  success: false,
  error: message,
  ...(details && { details }),
});
```

---

### 16. **Unused Import**
**Severity:** LOW  
**Line:** 32

```javascript
import { existsSync, unlinkSync, readFileSync, chmodSync, statSync } from 'fs';
```

`readFileSync` is never used.

---

### 17. **Inconsistent Logging Levels**
**Severity:** LOW  
**Lines:** 266, 279, 285, 300

```javascript
logger.info(`[AdminGallery:Single] RAW file...`);
logger.info(`[AdminGallery:Single] Running dcraw...`);
logger.error(`[AdminGallery:Single] dcraw pipeline FAILED...`);
```

**Fix:** Use structured logging:
```javascript
logger.info('[AdminGallery:Single] Processing RAW file', { 
  filename: file.originalname, 
  sizeMB: (originalSize / 1024 / 1024).toFixed(1) 
});
```

---

### 18. **Missing JSDoc for Complex Functions**
**Severity:** LOW  
**Lines:** 64-69, 250-260

```javascript
function slugify(text) { ... }
function getDcrawBin() { ... }
```

**Fix:**
```javascript
/**
 * Converts event name to URL-safe slug
 * @param text - Event name (e.g., "Boston Marathon 2024")
 * @returns Lowercase hyphenated slug (e.g., "boston-marathon-2024")
 */
function slugify(text: string): string { ... }
```

---

### 19. **Potential Memory Leak: Event Listeners Not Cleaned Up**
**Severity:** LOW  
**Lines:** 404-407

```javascript
for await (const chunk of obj.Body) chunks.push(chunk);
```

**Issue:** If stream errors mid-read, chunks array may not be garbage collected.

**Fix:**
```javascript
try {
  for await (const chunk of obj.Body) chunks.push(chunk);
} finally {
  chunks.length = 0; // Explicit cleanup
}
```

---

### 20. **Inconsistent Null Handling**
**Severity:** LOW  
**Lines:** 116, 119, 121

```javascript
sport: sport?.trim() || null,
eventDate: eventDate || null,
location: location?.trim() || null,
```

**Fix:** Use consistent pattern:
```javascript
sport: sport?.trim() ?? null,
eventDate: eventDate ?? null,
location: location?.trim() ?? null,
```

---

## Summary

| Severity | Count | Must Fix Before Production |
|----------|-------|---------------------------|
| CRITICAL | 4 | ✅ Yes |
| HIGH | 4 | ✅ Yes |
| MEDIUM | 9 | ⚠️ Recommended |
| LOW | 7 | ℹ️ Optional |

**Top 3 Priorities:**
1. Fix memory accumulation in streaming (CRITICAL #1)
2. Add transaction locking for photo numbers (HIGH #5)
3. Implement background job queue with concurrency limits (HIGH #7)

---

*Part of SwanStudios 7-Brain Validation System*
