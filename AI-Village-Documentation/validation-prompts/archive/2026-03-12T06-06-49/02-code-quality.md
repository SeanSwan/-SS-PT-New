# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 55.2s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 11:06:49 PM

---

# Code Review: backend/routes/adminGalleryRoutes.mjs

## Critical Issues

### 1. **Memory Leak Risk - Buffer Not Released in Error Paths**
**CRITICAL**
```javascript
// Line ~200-250: Single upload handler
let inputBuffer = file.buffer;
// ... conversion logic ...
file.buffer = null; // ✅ Released on success path

// ❌ BUT: If applyWatermark() throws, inputBuffer is never nulled
const processedBuffer = await applyWatermark(inputBuffer, { applyWatermark: enableWatermark });
inputBuffer = null; // This line never runs if applyWatermark throws
```

**Fix:** Wrap in try/finally
```javascript
let inputBuffer = file.buffer;
try {
  // ... conversion ...
  file.buffer = null;
  const processedBuffer = await applyWatermark(inputBuffer, { applyWatermark: enableWatermark });
  return res.json({...});
} finally {
  inputBuffer = null;
  file.buffer = null;
  if (global.gc) global.gc();
}
```

---

### 2. **Race Condition in Photo Number Assignment**
**CRITICAL**
```javascript
// Lines 191, 303, 471 - Multiple routes use this pattern:
const maxPhoto = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } });
const photoNumber = (maxPhoto || 0) + 1;
```

**Problem:** If two requests run concurrently, they can get the same `photoNumber`, causing duplicate display names like `EVENT-001`.

**Fix:** Use database-level atomic increment or row-level locking:
```javascript
// Option 1: Postgres sequence
const photoNumber = await sequelize.query(
  'SELECT nextval(pg_get_serial_sequence(\'gallery_photos\', \'photo_number\')) AS num',
  { type: QueryTypes.SELECT }
);

// Option 2: Transaction with row lock
const result = await sequelize.transaction(async (t) => {
  const event = await GalleryEvent.findByPk(eventId, { 
    lock: t.LOCK.UPDATE, 
    transaction: t 
  });
  const nextNum = (event.lastPhotoNumber || 0) + 1;
  await event.update({ lastPhotoNumber: nextNum }, { transaction: t });
  return nextNum;
});
```

---

### 3. **Unhandled Promise Rejection in Background Processing**
**CRITICAL**
```javascript
// Line 617: setImmediate with async function
setImmediate(async () => {
  try {
    // ... background processing ...
  } catch (bgErr) {
    logger.error(`[AdminGallery/BG] ❌ Background processing failed`);
    // ❌ No error propagation - promise rejection is swallowed
  }
});
```

**Problem:** If the async function throws before entering the try block (e.g., import failure), it's an unhandled rejection that can crash Node.js.

**Fix:**
```javascript
setImmediate(() => {
  (async () => {
    try {
      // ... processing ...
    } catch (bgErr) {
      logger.error(`[AdminGallery/BG] ❌ ${bgErr.message}`);
      await GalleryPhoto.update(
        { metadata: { ...photo.metadata, processingError: bgErr.message } },
        { where: { id: bgPhotoId } }
      );
    }
  })().catch(err => {
    logger.error('[AdminGallery/BG] Uncaught error:', err);
  });
});
```

---

## High Priority Issues

### 4. **SQL Injection Risk via Sequelize `literal()`**
**HIGH**
```javascript
// Line 1020:
[fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
```

**Issue:** While this specific case is safe (no user input), using `literal()` is a code smell. If copied elsewhere with user input, it's vulnerable.

**Fix:** Use Sequelize's query builder:
```javascript
[fn('SUM', fn('CASE', 
  [col('vote_type'), 1], 
  [1, 0]
)), 'thumbsUp']

// Or use raw SQL with proper parameterization
```

---

### 5. **Missing Transaction for Multi-Step Operations**
**HIGH**
```javascript
// Line 159: Delete event
await event.destroy(); // CASCADE deletes photos, visitors, etc.
```

**Problem:** If cascade delete fails midway (e.g., foreign key constraint from another table), data becomes inconsistent.

**Fix:**
```javascript
await sequelize.transaction(async (t) => {
  await EnhancementRequest.destroy({ where: { photoId: photoIds }, transaction: t });
  await PhotoVote.destroy({ where: { photoId: photoIds }, transaction: t });
  await GalleryPhoto.destroy({ where: { eventId: event.id }, transaction: t });
  await event.destroy({ transaction: t });
});
```

---

### 6. **Duplicate RAW Conversion Logic (DRY Violation)**
**HIGH**

RAW→JPEG conversion appears **4 times** with slight variations:
- Line 220-260 (single upload)
- Line 340-360 (batch upload)
- Line 530-580 (reprocess)
- Line 620-680 (background confirm)

**Fix:** Extract to shared service:
```javascript
// services/imageConversionService.mjs
export async function convertRawToJpeg(buffer, filename, options = {}) {
  const RAW_EXT = /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw|tiff?)$/i;
  const isRaw = RAW_EXT.test(filename);
  
  if (!isRaw && buffer.length < 50 * 1024 * 1024) {
    return { buffer, wasConverted: false };
  }

  try {
    const jpegBuf = await sharp(buffer, { limitInputPixels: false })
      .jpeg({ quality: options.quality || 95 })
      .toBuffer();
    return { buffer: jpegBuf, wasConverted: true, method: 'sharp' };
  } catch (sharpErr) {
    if (!sharpErr.message.includes('unsupported image format')) throw sharpErr;
    
    // Fallback to dcraw...
    return { buffer: dcrawBuffer, wasConverted: true, method: 'dcraw' };
  }
}
```

---

### 7. **Hardcoded Magic Numbers**
**HIGH**
```javascript
limits: { fileSize: 150 * 1024 * 1024, files: 2 }, // Line 44
if (file.size > 50 * 1024 * 1024) { // Line 223
if (files.length > 50) { // Line 453
```

**Fix:** Move to config/constants:
```javascript
// config/galleryConfig.mjs
export const GALLERY_LIMITS = {
  MAX_FILE_SIZE_MB: 150,
  MAX_FILE_SIZE_BYTES: 150 * 1024 * 1024,
  MAX_BATCH_SIZE: 50,
  RAW_CONVERSION_THRESHOLD_MB: 50,
  PRESIGN_URL_TTL_SECONDS: 600,
};
```

---

## Medium Priority Issues

### 8. **Inconsistent Error Response Format**
**MEDIUM**
```javascript
// Line 91: Returns error string
return res.status(400).json({ success: false, error: 'Event name and password are required' });

// Line 1055: Returns error object
return res.status(500).json({ success: false, error: err.message, stack: err.stack?.split('\n').slice(0, 3) });
```

**Fix:** Standardize error responses:
```javascript
// utils/errorResponse.mjs
export function errorResponse(res, statusCode, message, details = {}) {
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDev && details.stack ? { stack: details.stack.split('\n').slice(0, 5) } : {}),
    ...(details.hint ? { hint: details.hint } : {}),
  });
}
```

---

### 9. **Missing Input Validation**
**MEDIUM**
```javascript
// Line 449: No validation on files array structure
const { files } = req.body;
if (!files || !Array.isArray(files) || files.length === 0) { ... }

// ❌ Missing: validation of file.name, file.size, file.type
for (const file of files) {
  // What if file.name is missing or malicious?
  const rawKey = `gallery-raw/${event.slug}/${photoNumber}-${Date.now()}.jpg`;
}
```

**Fix:**
```javascript
const schema = z.object({
  files: z.array(z.object({
    name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
    size: z.number().positive().max(GALLERY_LIMITS.MAX_FILE_SIZE_BYTES),
    type: z.string().regex(/^(image\/|application\/octet-stream)/),
  })).max(50),
});

const { files } = schema.parse(req.body);
```

---

### 10. **Potential Path Traversal in Slug Generation**
**MEDIUM**
```javascript
// Line 56:
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Used in: `gallery/${event.slug}/${photoNumber}.jpg`
```

**Problem:** If `text` contains Unicode characters that normalize to `..`, it could escape the directory.

**Fix:**
```javascript
function slugify(text) {
  const slug = text
    .normalize('NFKD') // Decompose Unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  
  // Prevent path traversal
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    throw new Error('Invalid event name: contains path traversal characters');
  }
  
  return slug || 'event'; // Fallback if slug is empty
}
```

---

### 11. **Unprotected Diagnostic Endpoints**
**MEDIUM**
```javascript
// Line 494: CORS check endpoint
router.get('/r2-cors-check', async (req, res) => { ... });

// Line 506: CORS setup endpoint
router.post('/setup-r2-cors', async (req, res) => { ... });
```

**Problem:** These expose infrastructure details and can modify bucket configuration. While protected by admin middleware, they should have additional safeguards.

**Fix:**
```javascript
// Add environment check
router.post('/setup-r2-cors', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      success: false, 
      error: 'CORS setup disabled in production — use Cloudflare dashboard' 
    });
  }
  // ... rest of handler
});
```

---

### 12. **Missing Rate Limiting on Upload Endpoints**
**MEDIUM**

Upload endpoints can be abused to exhaust server resources:
```javascript
router.post('/events/:id/upload-single', ...); // No rate limit
router.post('/events/:id/upload', ...); // No rate limit
router.post('/events/:id/presign-upload', ...); // No rate limit
```

**Fix:**
```javascript
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 uploads per 15min per IP
  message: { success: false, error: 'Upload rate limit exceeded. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/events/:id/upload-single', uploadLimiter, ...);
```

---

## Low Priority Issues

### 13. **Inconsistent Logging Levels**
**LOW**
```javascript
logger.info(`[AdminGallery:Single] RAW file...`); // Line 211
logger.error('[AdminGallery] List events error:', err.message); // Line 82
```

**Fix:** Standardize log prefixes and use structured logging:
```javascript
logger.info('[AdminGallery:Upload:Single] Processing RAW file', { 
  eventId: event.id, 
  filename: file.originalname, 
  sizeMB: (file.size / 1024 / 1024).toFixed(1) 
});
```

---

### 14. **Commented Code / Truncated Response**
**LOW**
```javascript
// Line 1077: Response is truncated
return res.json({ success: true, de
// ... truncated ...
```

**Fix:** Complete the response object.

---

### 15. **Unused Import**
**LOW**
```javascript
import GalleryMessage from '../models/GalleryMessage.mjs'; // Line 23
// ❌ Never used in the file
```

---

### 16. **Magic String Duplication**
**LOW**
```javascript
// Repeated error messages:
'Failed to list events' // Line 82
'Failed to create event' // Line 117
'Failed to update event' // Line 142
// ... 15+ more instances
```

**Fix:**
```javascript
const ERRORS = {
  EVENT_NOT_FOUND: 'Event not found',
  EVENT_LIST_FAILED: 'Failed to list events',
  EVENT_CREATE_FAILED: 'Failed to create event',
  // ...
};
```

---

## Performance Anti-Patterns

### 17. **N+1 Query in Vote Stats**
**MEDIUM**
```javascript
// Line 1005-1015:
const photos = await GalleryPhoto.findAll({ where: { eventId }, raw: true });
const photoIds = photos.map(p => p.id);
const voteCounts = await PhotoVote.findAll({ where: { photoId: photoIds }, ... });
```

**Better:** Single query with JOIN:
```javascript
const photos = await GalleryPhoto.findAll({
  where: { eventId },
  attributes: [
    'id', 'photoNumber', 'displayName', 'thumbnailUrl', 'url',
    [fn('COUNT', col('votes.id')), 'totalVotes'],
    [fn('SUM', literal("CASE WHEN votes.vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
    [fn('SUM', literal("CASE WHEN votes.vote_type = -1 THEN 1 ELSE 0 END")), 'thumbsDown'],
  ],
  include: [{
    model: PhotoVote,
    as: 'votes',
    attributes: [],
    required: false,
  }],
  group: ['GalleryPhoto.id'],
  raw: true,
});
```

---

### 18. **Synchronous File Operations in Async Context**
**MEDIUM**
```javascript
// Line 245 (dcraw fallback):
writeFileSync(tempRaw, file.buffer); // ❌ Blocks event loop
const tiffBuffer = readFileSync(tiffPath); // ❌ Blocks event loop
```

**Fix:**
```javascript
await fs.promises.writeFile(tempRaw, file.buffer);
const tiffBuffer = await fs.promises.readFile(tiffPath

---

*Part of SwanStudios 7-Brain Validation System*
