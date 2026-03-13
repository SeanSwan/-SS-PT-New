# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 67.7s
> **Files:** docs/ai-workflow/blueprints/GALLERY-QUALITY-SHOWCASE-PLAN.md
> **Generated:** 3/12/2026, 4:52:49 PM

---

# Deep Architecture Review: Gallery Quality Showcase Plan

**Document:** `docs/ai-workflow/blueprints/GALLERY-QUALITY-SHOWCASE-PLAN.md`  
**Review Type:** Specification & Code Snippet Analysis  
**Result:** PRODUCTION-BLOCKING ISSUES FOUND

---

## Executive Summary

This document is a **feature specification** containing embedded code snippets. While the high-level design is sound, the implementation details contain **critical bugs**, **security gaps**, and **architectural omissions** that would cause production failures. I am reviewing both the specification design and the embedded code.

---

## 1. Bug Detection

### CRITICAL: Memory Exhaustion with Large RAW Files

**File:** `generateShowcaseVariants` function (lines 62-92)

**What's Wrong:**  
The function loads the entire input buffer into Sharp without size limits. RAW files from Sony A7 series can be 80-150MB. With multiple concurrent uploads, this will exhaust Node.js memory and crash the server.

```javascript
// CURRENT - No memory protection
async function generateShowcaseVariants(inputBuffer) {
  const metadata = await sharp(inputBuffer).metadata();
  // ...
```

**Fix:**
```javascript
const MAX_INPUT_SIZE = 200 * 1024 * 1024; // 200MB

async function generateShowcaseVariants(inputBuffer) {
  if (inputBuffer.length > MAX_INPUT_SIZE) {
    throw new Error(`Input file too large: ${inputBuffer.length} bytes (max: ${MAX_INPUT_SIZE})`);
  }
  
  // Use streaming pipeline instead of loading entire buffer
  const pipeline = sharp({
    failOnError: true,
    limitInputPixels: 10000 * 10000 // Reject absurdly large images
  });
  // ...
}
```

---

### CRITICAL: Image Extraction Coordinates Out of Bounds

**File:** `generateShowcaseVariants` function (lines 84-86)

**What's Wrong:**  
The crop calculation does not validate that `cropLeft` and `cropTop` are non-negative, nor that `cropSize` fits within the image dimensions. For images smaller than 800×800, this will throw a Sharp error.

```javascript
// CURRENT - No bounds validation
const cropSize = Math.min(800, width, height);
const cropLeft = Math.round((width - cropSize) / 2);
const cropTop = Math.round((height - cropSize) / 2);
// extract() will fail if cropSize > width or height
```

**Fix:**
```javascript
const cropSize = Math.min(800, width, height);
const cropLeft = Math.max(0, Math.round((width - cropSize) / 2));
const cropTop = Math.max(0, Math.round((height - cropSize) / 2));

// Validate extraction bounds
if (cropLeft + cropSize > width || cropTop + cropSize > height) {
  throw new Error(`Image too small for crop: ${width}x${height}`);
}
```

---

### HIGH: Conflicting Sharp Options

**File:** `generateShowcaseVariants` function (line 73)

**What's Wrong:**  
`progressive: true` and `mozjpeg: true` have conflicting behaviors. Mozjpeg handles progressive encoding differently—setting both can cause unexpected output or be ignored.

```javascript
// CURRENT
.jpeg({ quality: q.quality, progressive: true, mozjpeg: true })
```

**Fix:**
```javascript
.jpeg({ 
  quality: q.quality, 
  progressive: q.quality < 90 ? true : false, // Progressive only for lower quality
  mozjpeg: true 
})
```

---

### HIGH: Missing Error Handling in Pipeline

**File:** `generateShowcaseVariants` function (throughout)

**What's Wrong:**  
No try-catch blocks. A single corrupt image upload will crash the entire request with an unhelpful error.

**Fix:**
```javascript
try {
  const metadata = await sharp(inputBuffer).metadata();
} catch (err) {
  throw new Error(`Failed to read image metadata: ${err.message}`);
}

try {
  // variant processing
} catch (err) {
  throw new Error(`Failed to generate variants: ${err.message}`);
}
```

---

### MEDIUM: Integer Overflow in Size Calculations

**File:** Variant size storage (database schema section)

**What's Wrong:**  
`size: buffer.length` returns a JavaScript number which can lose precision for files > 2^53 bytes. While unlikely, this is a latent bug.

**Fix:**
```javascript
size: BigInt(buffer.length), // Store as BIGINT in PostgreSQL
```

---

## 2. Architecture Flaws

### CRITICAL: Synchronous Processing Blocks Event Loop

**File:** `generateShowcaseVariants` function (entirety)

**What's Wrong:**  
Sharp processing is CPU-intensive and runs synchronously on the main thread. This will block the Node.js event loop, causing all other requests to hang during processing. A 150MB RAW conversion can take 10-30 seconds.

**Fix:**
```javascript
// Use worker_threads or offload to a job queue
import { Worker } from 'worker_threads';

async function generateShowcaseVariants(inputBuffer) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./imageProcessingWorker.mjs', {
      workerData: { buffer: inputBuffer }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// OR use a job queue like BullMQ
await showcaseJobQueue.add('generate-variants', { eventId, buffer });
```

**Recommendation:** Implement a job queue (BullMQ/Redis) for all variant generation. Return immediately with a "processing" status.

---

### HIGH: God Service Mixing Concerns

**File:** `backend/services/showcaseService.mjs`

**What's Wrong:**  
The service mixes image processing, R2 upload, and database updates. This violates Single Responsibility Principle and makes testing impossible.

**Proposed Architecture:**
```
showcaseService.mjs      → Orchestration only
├── imageProcessor.mjs  → Sharp processing (testable, mockable)
├── storageService.mjs  → R2 uploads
└── showcaseRepo.mjs    → Database operations
```

---

### HIGH: No Cleanup Strategy for Orphaned R2 Objects

**File:** Part 1 (Backend), Delete endpoint

**What's Wrong:**  
DELETE `/api/admin/gallery/events/:id/showcase-photo` removes the database record but doesn't delete the R2 objects. This causes storage leaks.

**Fix:**
```javascript
async function deleteShowcase(eventId) {
  const event = await GalleryEvent.findByPk(eventId);
  const showcase = event.showcaseData;
  
  // Delete all R2 objects
  const keysToDelete = [
    ...Object.values(showcase.variants).map(v => v.key),
    ...Object.values(showcase.crops).map(c => c.key)
  ];
  
  await r2Client.deleteMany(keysToDelete);
  await event.update({ showcaseData: null });
}
```

---

### MEDIUM: Missing Indexes for Showcase Queries

**File:** Database Schema

**What's Wrong:**  
JSONB columns in PostgreSQL require specific indexes for efficient querying. The spec doesn't define indexes for:
- `showcase_data->>'enabled'`
- `showcase_data->>'uploadedAt'`

**Fix:**
```sql
CREATE INDEX idx_gallery_events_showcase_enabled 
ON gallery_events (((showcase_data->>'enabled')::boolean));

CREATE INDEX idx_gallery_events_showcase_uploaded 
ON gallery_events ((showcase_data->>'uploadedAt') DESC);
```

---

## 3. Integration Issues

### CRITICAL: No Authentication/Authorization on Public Endpoint

**File:** API Endpoints section

**What's Wrong:**  
`GET /api/gallery/:slug/showcase` is marked "public, requires gallery access" but there's no implementation detail on how gallery access is enforced. This could leak showcase data to unauthorized users.

```javascript
// MISSING IMPLEMENTATION
GET /api/gallery/:slug/showcase  // How is "gallery access" verified?
```

**Fix:**
```javascript
// In galleryRoutes.mjs
router.get('/:slug/showcase', requireGalleryAccess, async (req, res) => {
  // verify user has access to this gallery
  const hasAccess = await verifyGalleryAccess(req.user.id, req.params.slug);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this gallery' });
  }
  // proceed...
});
```

---

### CRITICAL: No File Type Validation

**File:** Upload endpoint (line 46)

**What's Wrong:**  
The spec accepts "JPEG or RAW" but doesn't validate MIME types. Attackers could upload malicious files (WebShell, executables).

**Fix:**
```javascript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/x-sony-arw',
  'image/x-adobe-dng',
  'image/x-canon-cr2',
  'image/x-nikon-nef'
];

function validateFileType(mimeType) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}`);
  }
}
```

---

### HIGH: No Rate Limiting

**File:** API Endpoints section

**What's Wrong:**  
No rate limiting on upload endpoints. Attackers could flood storage or cause DoS.

**Fix:**
```javascript
// Apply rate limiting to upload routes
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: 'Too many uploads, please try again later'
});

router.post('/showcase-photo', uploadLimiter, uploadController);
```

---

### HIGH: Inconsistent Data Transformation

**File:** Backend-Frontend contract

**What's Wrong:**  
The backend stores `size` as bytes (e.g., `9500000`) but the frontend likely expects human-readable format ("9.5 MB"). There's no transformation layer documented.

**Fix:**
```javascript
// Backend: Add formatted sizes
variants: {
  q95: { 
    url: "...",
    size: 9500000,
    sizeFormatted: "9.5 MB",  // Add this
    label: "Studio Master"
  }
}

// OR: Frontend utility
const formatBytes = (bytes) => {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
};
```

---

### MEDIUM: Missing Webhook for RAW Request Notifications

**File:** Part 4 (RAW File Request Flow)

**What's Wrong:**  
"Request RAW File" mentions "Business Intelligence Alerts" but doesn't specify the integration. If that system goes down, admin never gets notified.

**Fix:**
```javascript
// Implement dual notification
async function notifyRawRequest(enhancementRequest) {
  // 1. Business Intelligence Alerts (existing)
  await biAlerts.notify({ type: 'raw_request', ... });
  
  // 2. Email fallback (guaranteed delivery)
  await emailService.sendAdminNotification({
    subject: 'RAW File Requested',
    body: `Client requested RAW for event ${enhancementRequest.eventId}`
  });
  
  // 3. Database record for retry
  await NotificationLog.create({
    type: 'raw_request',
    status: 'pending',
    retryCount: 0
  });
}
```

---

## 4. Dead Code & Tech Debt

### LOW: Duplicate Quality Definitions

**File:** `generateShowcaseVariants` function

**What's Wrong:**  
`cropQualities` duplicates quality values from the main `qualities` array. If you change Q92, you must remember to update both arrays.

**Fix:**
```javascript
const QUALITY_TIERS = [
  { key: 'q95', quality: 95, label: 'Studio Master' },
  { key: 'q94', quality: 94, label: 'Premium Print' },
  { key: 'q93', quality: 93, label: 'High Quality' },
  { key: 'q92', quality: 92, label: 'Gallery Standard' },
  { key: 'q80', quality: 80, label: 'Web Preview', maxWidth: 1200 },
];

// Derive crop qualities from main tiers
const cropQualities = QUALITY_TIERS
  .filter(tier => ['q95', 'q92', 'q80'].includes(tier.key))
  .map(tier => ({ key: `crop_${tier.key}`, quality: tier.quality }));
```

---

### LOW: Hardcoded Values

**File:** Throughout

**What's Wrong:**  
`800`, `400`, `1200` are hardcoded. These should be configuration constants.

**Fix:**
```javascript
const SHOWCASE_CONFIG = {
  CROP_SIZE: 800,
  CROP_DISPLAY_SIZE: 400,
  WEB_MAX_WIDTH: 1200,
  MAX_INPUT_SIZE_MB: 200
};
```

---

## 5. Production Readiness

### CRITICAL: No Logging

**File:** `generateShowcaseVariants` entire function

**What's Wrong:**  
Zero logging. When this fails in production, you'll have no visibility.

**Fix:**
```javascript
import { logger } from '../utils/logger.mjs';

async function generateShowcaseVariants(inputBuffer) {
  logger.info('Starting showcase variant generation', { 
    inputSize: inputBuffer.length 
  });
  
  try {
    const metadata = await sharp(inputBuffer).metadata();
    logger.debug('Image metadata extracted', { width: metadata.width, height: metadata.height });
    // ...
  } catch (err) {
    logger.error('Showcase generation failed', { error: err.message, stack: err.stack });
    throw err;
  }
}
```

---

### CRITICAL: No Request Timeout Protection

**File:** API endpoint definitions

**What's Wrong:**  
A slow upload or processing request can hang indefinitely. No timeout protection.

**Fix:**
```javascript
// Middleware timeout
import requestTimeout from 'express-timeout';

router.post('/showcase-photo', 
  requestTimeout({ timeout: 300000, disable: ['off'] }), // 5 min timeout
  upload.single('photo'),
  showcaseController.upload
);
```

---

### HIGH: No Input Validation on Gallery Event ID

**File:** API routes

**What's Wrong:**  
`:id` parameter not validated. SQL injection possible if used raw in queries (Sequelize handles this, but non-numeric IDs could cause 500 errors).

**Fix:**
```javascript
router.delete('/showcase-photo', async (req, res) => {
  const { id } = req.params;
  
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
  
  // proceed...
});
```

---

### HIGH: Missing Progress Indication

**File:** Upload endpoint (line 46)

**What's Wrong:**  
No way for admin to know upload + processing progress. A 50MB file could take 30+ seconds with no feedback.

**Fix:**
```javascript
// Option 1: WebSocket progress updates
// Option 2: Server-Sent Events
router.post('/showcase-photo', upload.single('photo'), async (req, res) => {
  const job = await showcaseJobQueue.add('process-showcase', {
    eventId: req.params.id,
    filePath: req.file.path
  });
  
  res.status(202).json({ 
    message: 'Processing started',
    jobId: job.id,
    statusUrl: `/api/admin/jobs/${job.id}`
  });
});
```

---

### MEDIUM:

---

*Part of SwanStudios 7-Brain Validation System*
