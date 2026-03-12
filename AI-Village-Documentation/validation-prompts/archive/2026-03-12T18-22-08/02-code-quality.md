# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 53.8s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/12/2026, 11:22:08 AM

---

# Code Review: backend/routes/adminGalleryRoutes.mjs

## CRITICAL Issues

### 1. **Uncontrolled Memory Growth in Batch Upload**
**CRITICAL** | Lines 313-425

```javascript
for (const file of req.files) {
  try {
    // ... processing ...
  } finally {
    file.buffer = null;
    if (global.gc) global.gc();
  }
}
```

**Problem:** Manual garbage collection (`global.gc()`) is unreliable and requires Node.js to run with `--expose-gc` flag. On Render's 512MB plan, processing multiple 50MB+ files will cause OOM crashes before GC runs.

**Fix:**
```javascript
// Process files sequentially with explicit memory limits
for (let i = 0; i < req.files.length; i++) {
  const file = req.files[i];
  try {
    // ... processing ...
  } finally {
    file.buffer = null;
    req.files[i] = null; // Clear array reference
  }
  
  // Wait for memory to stabilize between files
  if (i < req.files.length - 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

---

### 2. **Unsafe File System Operations Without Cleanup**
**CRITICAL** | Lines 176-250

```javascript
const dcrawResult = execFileSync(dcrawBin, ['-T', '-w', '-q', '3', '-o', '1', uploadedPath], {
  timeout: 120000,
  stdio: ['pipe', 'pipe', 'pipe'],
});
const tiffPath = uploadedPath.replace(/\.[^.]+$/, '.tiff');
```

**Problem:** If dcraw crashes or times out, temp files remain on disk. On Render's ephemeral filesystem, this fills `/tmp` and causes subsequent uploads to fail.

**Fix:**
```javascript
const tiffPath = uploadedPath.replace(/\.[^.]+$/, '.tiff');
try {
  execFileSync(dcrawBin, ['-T', '-w', '-q', '3', '-o', '1', uploadedPath], {
    timeout: 120000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  if (!existsSync(tiffPath)) {
    throw new Error(`dcraw completed but TIFF not found at ${tiffPath}`);
  }
  
  // Process TIFF...
} catch (dcrawErr) {
  // Always cleanup, even on error
  cleanupTemp(uploadedPath, tiffPath);
  throw dcrawErr;
} finally {
  cleanupTemp(uploadedPath, tiffPath);
}
```

---

### 3. **Race Condition in Background Processing**
**CRITICAL** | Lines 655-750

```javascript
setImmediate(async () => {
  try {
    // ... background processing ...
    await GalleryPhoto.update({ /* ... */ }, { where: { id: bgPhotoId } });
  } catch (bgErr) {
    logger.error(`Background processing failed for photo ${bgPhotoId}`);
    // Photo still exists in R2 as raw — admin can retry later
  }
});
```

**Problem:** 
1. No error recovery mechanism — failed photos remain in "processing" state forever
2. Multiple concurrent requests can trigger duplicate background jobs for the same photo
3. No way for admin to know which photos failed processing

**Fix:**
```javascript
// Add job queue with retry logic
import Bull from 'bull';
const photoProcessingQueue = new Bull('photo-processing', process.env.REDIS_URL);

photoProcessingQueue.process(async (job) => {
  const { photoId, finalKey, originalName, enableWatermark } = job.data;
  
  try {
    // ... processing logic ...
    
    await GalleryPhoto.update(
      { 
        metadata: { processing: false, processedAt: new Date().toISOString() },
        fileSize: processedSize,
      },
      { where: { id: photoId } }
    );
  } catch (err) {
    // Mark as failed in DB so admin can retry
    await GalleryPhoto.update(
      { 
        metadata: { 
          processing: false, 
          processingError: err.message,
          failedAt: new Date().toISOString() 
        } 
      },
      { where: { id: photoId } }
    );
    throw err; // Bull will retry
  }
});

// In route handler:
await photoProcessingQueue.add({ photoId: bgPhotoId, finalKey: bgFinalKey, ... }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60000 },
});
```

---

## HIGH Issues

### 4. **SQL Injection Risk in Raw Queries**
**HIGH** | Lines 1008-1015

```javascript
const [rows] = await sequelize.query(
  'SELECT id, event_id FROM gallery_photos WHERE id = :photoId',
  { replacements: { photoId: req.params.photoId } }
);
```

**Problem:** While using `:photoId` placeholder is safe, mixing raw SQL with Sequelize models creates maintenance burden and bypasses model validations.

**Fix:**
```javascript
const photo = await GalleryPhoto.findByPk(req.params.photoId, {
  attributes: ['id', 'eventId'],
  raw: true, // Skip instantiation overhead
});
if (!photo) return res.status(404).json({ success: false, error: 'Photo not found' });

// Delete associated records
await Promise.all([
  EnhancementRequest.destroy({ where: { photoId: photo.id } }),
  PhotoVote.destroy({ where: { photoId: photo.id } }),
]);

await GalleryPhoto.destroy({ where: { id: photo.id } });
```

---

### 5. **Missing Transaction Boundaries**
**HIGH** | Lines 1008-1030

```javascript
await EnhancementRequest.destroy({ where: { photoId } });
await PhotoVote.destroy({ where: { photoId } });
await sequelize.query('DELETE FROM gallery_photos WHERE id = :photoId', { ... });
await GalleryEvent.update({ photoCount: remaining }, { where: { id: eventId } });
```

**Problem:** If any step fails, database is left in inconsistent state (e.g., photo deleted but event photo count not updated).

**Fix:**
```javascript
const transaction = await sequelize.transaction();
try {
  await EnhancementRequest.destroy({ where: { photoId }, transaction });
  await PhotoVote.destroy({ where: { photoId }, transaction });
  await GalleryPhoto.destroy({ where: { id: photoId }, transaction });
  
  const remaining = await GalleryPhoto.count({ 
    where: { eventId }, 
    transaction 
  });
  await GalleryEvent.update(
    { photoCount: remaining }, 
    { where: { id: eventId }, transaction }
  );
  
  await transaction.commit();
  return res.json({ success: true, message: 'Photo deleted', remainingCount: remaining });
} catch (err) {
  await transaction.rollback();
  throw err;
}
```

---

### 6. **Hardcoded File Size Limits**
**HIGH** | Lines 52-63, 142-153

```javascript
limits: { fileSize: 150 * 1024 * 1024, files: 2 },
```

**Problem:** Magic numbers scattered throughout code. Changing limits requires updating multiple locations.

**Fix:**
```javascript
// At top of file
const FILE_LIMITS = {
  MAX_FILE_SIZE: 150 * 1024 * 1024, // 150MB
  MAX_FILES_BATCH: 2,
  MAX_FILES_LEGACY: 50,
  MAX_PRESIGN_BATCH: 50,
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024, // 50MB
} as const;

const uploadSingle = multer({
  storage: multer.diskStorage({ /* ... */ }),
  limits: { 
    fileSize: FILE_LIMITS.MAX_FILE_SIZE, 
    files: FILE_LIMITS.MAX_FILES_BATCH 
  },
  // ...
});
```

---

### 7. **Inconsistent Error Response Format**
**HIGH** | Multiple locations

```javascript
// Line 87
return res.status(403).json({ success: false, error: 'Admin or trainer access required' });

// Line 222
return res.status(422).json({
  success: false,
  error: `RAW conversion failed for ${file.originalname}: ${dcrawErr.message}`,
  hint: 'Convert the ARW file to JPEG on your computer before uploading.',
});

// Line 1008
return res.json({ success: true, message: 'Photo deleted', remainingCount: remaining });
```

**Problem:** Inconsistent response shapes make frontend error handling fragile. Some responses have `message`, others `error`, some have `hint`.

**Fix:**
```typescript
// Create response type definitions
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    hint?: string;
    details?: unknown;
  };
}

// Helper functions
function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, ...(message && { message }) };
}

function errorResponse(
  message: string, 
  code?: string, 
  hint?: string
): ApiResponse {
  return { 
    success: false, 
    error: { message, ...(code && { code }), ...(hint && { hint }) } 
  };
}

// Usage:
return res.status(403).json(
  errorResponse('Admin or trainer access required', 'FORBIDDEN')
);
```

---

## MEDIUM Issues

### 8. **Duplicate Code: R2 Client Initialization**
**MEDIUM** | Lines 290, 395, 517, 596, 688

```javascript
let r2Client = null;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
try {
  const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
  if (r2Configured) r2Client = getR2Client();
} catch { /* R2 not available */ }
```

**Problem:** Repeated 5+ times across routes. Violates DRY principle.

**Fix:**
```javascript
// Add middleware
async function requireR2(req, res, next) {
  try {
    const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
    if (!r2Configured || !process.env.R2_BUCKET_NAME) {
      return res.status(503).json({ 
        success: false, 
        error: 'R2 storage not configured' 
      });
    }
    req.r2Client = getR2Client();
    req.r2Bucket = process.env.R2_BUCKET_NAME;
    req.r2PublicUrl = process.env.R2_PUBLIC_URL;
    next();
  } catch (err) {
    logger.error('[R2] Initialization failed:', err.message);
    return res.status(503).json({ 
      success: false, 
      error: 'Storage service unavailable' 
    });
  }
}

// Usage:
router.post('/events/:id/upload', requireR2, async (req, res) => {
  const { r2Client, r2Bucket, r2PublicUrl } = req;
  // ... use r2Client directly ...
});
```

---

### 9. **Missing Input Validation**
**MEDIUM** | Lines 100-130

```javascript
const { name, sport, eventDate, location, password, description, isPublished } = req.body;

if (!name || !password) {
  return res.status(400).json({ success: false, error: 'Event name and password are required' });
}
```

**Problem:** No validation for:
- Name length (slug limited to 100 chars but name isn't)
- Password strength
- Date format for `eventDate`
- SQL injection in location/description (though Sequelize escapes, explicit validation is better)

**Fix:**
```javascript
import Joi from 'joi';

const eventSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  sport: Joi.string().trim().max(100).optional().allow(null, ''),
  eventDate: Joi.date().iso().optional().allow(null),
  location: Joi.string().trim().max(200).optional().allow(null, ''),
  password: Joi.string().min(8).required(),
  description: Joi.string().trim().max(2000).optional().allow(null, ''),
  isPublished: Joi.boolean().optional(),
});

router.post('/events', async (req, res) => {
  const { error, value } = eventSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      error: error.details[0].message 
    });
  }
  
  const { name, password, ...rest } = value;
  // ... proceed with validated data ...
});
```

---

### 10. **Inefficient Photo Count Updates**
**MEDIUM** | Lines 280, 425, 780

```javascript
const totalPhotos = await GalleryPhoto.count({ where: { eventId: event.id } });
await event.update({ photoCount: totalPhotos });
```

**Problem:** Every photo upload triggers a full table scan to count photos. For events with 500+ photos, this adds 200-500ms per upload.

**Fix:**
```javascript
// Use database trigger or increment/decrement
await event.increment('photoCount', { by: uploaded.length });

// Or use raw SQL with atomic increment
await sequelize.query(
  'UPDATE gallery_events SET photo_count = photo_count + :count WHERE id = :eventId',
  { replacements: { count: uploaded.length, eventId: event.id } }
);
```

---

### 11. **Unhandled Promise Rejection in Background Job**
**MEDIUM** | Lines 655-750

```javascript
setImmediate(async () => {
  try {
    // ... processing ...
  } catch (bgErr) {
    logger.error(`Background processing failed for photo ${bgPhotoId}`);
    // No re-throw or process.on('unhandledRejection') handler
  }
});
```

**Problem:** If an unexpected error occurs outside the try/catch (e.g., in the `setImmediate` callback itself), it becomes an unhandled rejection and crashes the server.

**Fix:**
```javascript
setImmediate(() => {
  (async () => {
    try {
      // ... processing ...
    } catch (bgErr) {
      logger.error(`Background processing failed for photo ${bgPhotoId}:`, bgErr);
      // Update DB to mark as failed
      await GalleryPhoto.update(
        { metadata: { processing: false, error: bgErr.message } },
        { where: { id: bgPhotoId } }
      ).catch(err => logger.error('Failed to update photo status:', err));
    }
  })().catch(err => {
    logger.error('Unhandled error in background job:', err);
    // Don't crash the server
  });
});
```

---

## LOW Issues

### 12. **Inconsistent Logging Format**
**LOW** | Multiple locations

```javascript
logger.info(`[AdminGallery:Single] RAW file ${file.originalname} ...`);
logger.info(`[AdminGallery/BG] Starting background processing ...`);
logger.error('[AdminGallery] List events error:', err.message);
```

**Problem:** Inconsistent prefixes (`[AdminGallery:Single]` vs `[AdminGallery/BG]` vs `[AdminGallery]`) make log filtering difficult.

**Fix:**
```javascript
// Standardize prefix format
const LOG_PREFIX = {
  SINGLE: '[AdminGallery:Upload:Single]',
  BATCH: '[AdminGallery:Upload:Batch]',
  BACKGROUND: '[AdminGallery:

---

*Part of SwanStudios 7-Brain Validation System*
