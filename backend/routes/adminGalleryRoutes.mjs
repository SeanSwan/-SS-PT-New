/**
 * Admin Gallery Routes
 * ====================
 * Admin-only endpoints for managing photo gallery events, uploads,
 * enhancement requests, visitor leads, donations, and referrals.
 *
 * All routes require authentication + admin role.
 */
import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { Op, fn, literal, col } from 'sequelize';
import sequelize from '../database.mjs';
import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import GalleryEvent from '../models/GalleryEvent.mjs';
import GalleryPhoto from '../models/GalleryPhoto.mjs';
import GalleryVisitor from '../models/GalleryVisitor.mjs';
import EnhancementRequest from '../models/EnhancementRequest.mjs';
import GalleryDonation from '../models/GalleryDonation.mjs';
import GalleryReferral from '../models/GalleryReferral.mjs';
import PhotoVote from '../models/PhotoVote.mjs';
import GalleryMessage from '../models/GalleryMessage.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import sharp from 'sharp';
import { applyWatermark, isWatermarkAvailable } from '../services/watermarkService.mjs';
import logger from '../utils/logger.mjs';
import { tmpdir } from 'os';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, readFileSync, chmodSync, statSync } from 'fs';
import { execFileSync } from 'child_process';

const router = express.Router();

// All admin gallery routes require auth + admin
router.use(protect);
router.use((req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'trainer') {
    return res.status(403).json({ success: false, error: 'Admin or trainer access required' });
  }
  next();
});

// Multer for photo uploads (memory storage → R2)
// Frontend chunks into batches of 5; backend handles up to 10 per request for safety
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif|arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024, files: 2 }, // 150MB per file (RAW files), 2 files max to avoid OOM on 512MB Render
  fileFilter: (req, file, cb) => {
    // Accept image/* MIME types, application/octet-stream (RAW/HEIC), OR common image/RAW file extensions
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream' || ALLOWED_IMAGE_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`File "${file.originalname}" rejected: unsupported type (${file.mimetype}). Only image files are allowed.`), false);
    }
  },
});

// Helper: generate slug from event name
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// ── Event CRUD ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/gallery/events
 * List all events (published and unpublished)
 */
router.get('/events', async (req, res) => {
  try {
    const events = await GalleryEvent.findAll({
      attributes: ['id', 'name', 'slug', 'sport', 'eventDate', 'location', 'photoCount', 'isPublished', 'description', 'createdAt'],
      order: [['eventDate', 'DESC'], ['createdAt', 'DESC']],
    });
    return res.json({ success: true, events });
  } catch (err) {
    logger.error('[AdminGallery] List events error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list events' });
  }
});

/**
 * POST /api/admin/gallery/events
 * Create a new gallery event
 */
router.post('/events', async (req, res) => {
  try {
    const { name, sport, eventDate, location, password, description, isPublished } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, error: 'Event name and password are required' });
    }

    const slug = slugify(name);

    // Check slug uniqueness
    const existing = await GalleryEvent.findOne({ where: { slug } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An event with a similar name already exists. Please use a unique name.' });
    }

    // Hash the event password
    const passwordHash = await bcrypt.hash(password, 10);

    const event = await GalleryEvent.create({
      name: name.trim(),
      slug,
      sport: sport?.trim() || null,
      eventDate: eventDate || null,
      location: location?.trim() || null,
      passwordHash,
      description: description?.trim() || null,
      isPublished: isPublished === true,
    });

    return res.status(201).json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        sport: event.sport,
        eventDate: event.eventDate,
        location: event.location,
        isPublished: event.isPublished,
        shareableLink: `/gallery/${event.slug}`,
      },
    });
  } catch (err) {
    logger.error('[AdminGallery] Create event error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

/**
 * PATCH /api/admin/gallery/events/:id
 * Update event details
 */
router.patch('/events/:id', async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const { name, sport, eventDate, location, password, description, isPublished, coverPhotoId } = req.body;
    const updates = {};

    if (name !== undefined) { updates.name = name.trim(); updates.slug = slugify(name.trim()); }
    if (sport !== undefined) updates.sport = sport?.trim() || null;
    if (eventDate !== undefined) updates.eventDate = eventDate || null;
    if (location !== undefined) updates.location = location?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isPublished !== undefined) updates.isPublished = !!isPublished;
    if (coverPhotoId !== undefined) updates.coverPhotoId = coverPhotoId || null;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);

    await event.update(updates);
    return res.json({ success: true, event });
  } catch (err) {
    logger.error('[AdminGallery] Update event error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});

/**
 * DELETE /api/admin/gallery/events/:id
 * Delete event and all associated photos/visitors
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    await event.destroy(); // CASCADE deletes photos, visitors, etc.
    return res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    logger.error('[AdminGallery] Delete event error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete event' });
  }
});

// ── Single-File Upload (Disk-Based for 512MB Render) ──────────────────────

const __adminGalleryDir = dirname(fileURLToPath(import.meta.url));

// Pre-resolve dcraw binary path at module load time
let _dcrawBin = null;
function getDcrawBin() {
  if (_dcrawBin !== null) return _dcrawBin;
  const candidates = [
    join(__adminGalleryDir, '..', 'node_modules', 'dcraw-vendored-linux', 'dcraw'),
    join(__adminGalleryDir, '..', 'node_modules', 'dcraw-vendored-win32', 'dcraw.exe'),
    '/usr/bin/dcraw',
    '/usr/local/bin/dcraw',
  ];
  _dcrawBin = candidates.find(p => existsSync(p)) || false;
  if (_dcrawBin && !_dcrawBin.endsWith('.exe')) {
    try { chmodSync(_dcrawBin, 0o755); } catch { /* already executable */ }
  }
  if (_dcrawBin) logger.info(`[AdminGallery] dcraw binary found: ${_dcrawBin}`);
  else logger.warn('[AdminGallery] dcraw binary NOT found — RAW conversion will fail');
  return _dcrawBin;
}

// Separate multer instance: disk storage, exactly 1 file, 150MB max
// Disk storage avoids holding 120MB+ RAW files in Node.js heap on 512MB Render
const uploadSingle = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (req, file, cb) => cb(null, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream' || ALLOWED_IMAGE_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`File "${file.originalname}" rejected: unsupported type (${file.mimetype}).`), false);
    }
  },
});

/**
 * POST /api/admin/gallery/events/:id/upload-single
 * Upload exactly ONE photo at a time. Frontend calls this in a sequential loop.
 * This keeps server RAM usage under ~200MB per file even for 120MB RAW files.
 *
 * Body (multipart): photo (single file), watermark ("true"/"false"), sourceType ("raw"/"jpeg")
 * Returns: { success, photo: { id, photoNumber, displayName, url, sourceType } }
 */
router.post('/events/:id/upload-single', (req, res, next) => {
  uploadSingle.single('photo')(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? `Upload rejected: ${err.message}`
        : err.message || 'File upload failed';
      logger.error('[AdminGallery] Single upload multer error:', message);
      return res.status(400).json({ success: false, error: message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No photo uploaded' });

    const enableWatermark = req.body.watermark !== 'false';
    const sourceType = req.body.sourceType || 'jpeg';

    // Get next photo number
    const maxPhoto = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } });
    const photoNumber = (maxPhoto || 0) + 1;
    const displayName = `${event.slug.toUpperCase()}-${String(photoNumber).padStart(3, '0')}`;
    const storageKey = `gallery/${event.slug}/${photoNumber}.jpg`;

    // Detect RAW format
    const RAW_EXT = /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw|tiff?)$/i;
    const isRaw = RAW_EXT.test(file.originalname || '');

    // File is on disk (multer diskStorage) — read path, not buffer
    const uploadedPath = file.path;
    const originalSize = file.size;
    let inputBuffer = null;

    const cleanupTemp = (...paths) => {
      for (const p of paths) {
        try { if (p && existsSync(p)) unlinkSync(p); } catch {}
      }
    };

    try {
      if (isRaw) {
        // ── RAW file: must use dcraw → TIFF → sharp → JPEG ──
        logger.info(`[AdminGallery:Single] RAW file ${file.originalname} (${(originalSize / 1024 / 1024).toFixed(1)}MB) — dcraw pipeline`);
        const dcrawBin = getDcrawBin();
        if (!dcrawBin) {
          cleanupTemp(uploadedPath);
          return res.status(422).json({
            success: false,
            error: `RAW conversion not available: dcraw binary not installed on this server.`,
            hint: 'Convert the ARW file to JPEG on your computer before uploading, or contact support.',
          });
        }
        try {
          // dcraw reads from disk, writes .tiff alongside it — no buffer needed in RAM
          logger.info(`[AdminGallery:Single] Running dcraw: ${dcrawBin} -T -w -q 3 -o 1 ${uploadedPath}`);
          const dcrawResult = execFileSync(dcrawBin, ['-T', '-w', '-q', '3', '-o', '1', uploadedPath], {
            timeout: 120000,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          // dcraw outputs a .tiff file next to the input
          const tiffPath = uploadedPath.replace(/\.[^.]+$/, '.tiff');
          if (!existsSync(tiffPath)) {
            throw new Error(`dcraw completed but TIFF not found at ${tiffPath}`);
          }
          const tiffSizeMB = (statSync(tiffPath).size / 1024 / 1024).toFixed(1);
          logger.info(`[AdminGallery:Single] dcraw produced ${tiffSizeMB}MB TIFF — converting to Q95 JPEG via sharp`);
          // Use sharp to read TIFF from disk (streaming) and convert to JPEG buffer
          inputBuffer = await sharp(tiffPath, { limitInputPixels: false })
            .jpeg({ quality: 95 })
            .toBuffer();
          logger.info(`[AdminGallery:Single] Final JPEG: ${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB`);
          cleanupTemp(uploadedPath, tiffPath);
        } catch (dcrawErr) {
          logger.error(`[AdminGallery:Single] dcraw pipeline FAILED: ${dcrawErr.message}`);
          if (dcrawErr.stderr) logger.error(`[AdminGallery:Single] dcraw stderr: ${dcrawErr.stderr.toString().slice(0, 500)}`);
          cleanupTemp(uploadedPath, uploadedPath.replace(/\.[^.]+$/, '.tiff'));
          return res.status(422).json({
            success: false,
            error: `RAW conversion failed for ${file.originalname}: ${dcrawErr.message}`,
            hint: 'Convert the ARW file to JPEG on your computer before uploading.',
          });
        }
      } else {
        // ── Standard image (JPEG/PNG/etc): sharp reads from disk directly ──
        logger.info(`[AdminGallery:Single] Standard file ${file.originalname} (${(originalSize / 1024 / 1024).toFixed(1)}MB) — converting to Q95 JPEG`);
        try {
          inputBuffer = await sharp(uploadedPath, { limitInputPixels: false })
            .jpeg({ quality: 95 })
            .toBuffer();
          logger.info(`[AdminGallery:Single] Converted: ${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB JPEG`);
        } catch (sharpErr) {
          logger.error(`[AdminGallery:Single] sharp conversion failed for ${file.originalname}: ${sharpErr.message}`);
          cleanupTemp(uploadedPath);
          return res.status(422).json({
            success: false,
            error: `Image conversion failed for ${file.originalname}: ${sharpErr.message}`,
            hint: 'The file may be corrupted or in an unsupported format.',
          });
        }
        cleanupTemp(uploadedPath);
      }
    } catch (outerErr) {
      logger.error(`[AdminGallery:Single] Unexpected error: ${outerErr.message}`);
      cleanupTemp(uploadedPath);
      throw outerErr;
    }

    // Apply watermark
    const processedBuffer = await applyWatermark(inputBuffer, { applyWatermark: enableWatermark });
    inputBuffer = null;

    // Upload to R2
    let r2Client = null;
    const R2_BUCKET = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    try {
      const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
      if (r2Configured) r2Client = getR2Client();
    } catch { /* R2 not available */ }

    let url = '';
    if (r2Client && R2_BUCKET) {
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: processedBuffer,
        ContentType: 'image/jpeg',
      }));
      url = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${storageKey}`
        : `/api/serve-photo/${storageKey}`;
    } else {
      url = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
    }

    const metadata = {
      originalName: file.originalname,
      size: originalSize,
      processedSize: processedBuffer.length,
      mimetype: file.mimetype,
      watermarked: enableWatermark && isWatermarkAvailable(),
      uploadedAt: new Date().toISOString(),
      sourceType,
    };

    const photo = await GalleryPhoto.create({
      eventId: event.id,
      photoNumber,
      displayName,
      storageKey,
      thumbnailKey: storageKey,
      url,
      thumbnailUrl: url,
      originalFilename: file.originalname,
      fileSize: processedBuffer.length,
      mimeType: 'image/jpeg',
      metadata,
      sourceType: isRaw ? 'raw' : sourceType,
    });

    // Update event photo count
    const totalPhotos = await GalleryPhoto.count({ where: { eventId: event.id } });
    await event.update({ photoCount: totalPhotos });
    if (!event.coverPhotoId) await event.update({ coverPhotoId: photo.id });

    // Aggressively free memory
    const finalSize = processedBuffer.length;
    if (global.gc) global.gc();

    logger.info(`[AdminGallery:Single] ✅ ${displayName} uploaded (${(finalSize / 1024 / 1024).toFixed(1)}MB) for event ${event.slug}`);

    return res.json({
      success: true,
      photo: {
        id: photo.id,
        photoNumber: photo.photoNumber,
        displayName: photo.displayName,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        sourceType: photo.sourceType,
        fileSize: finalSize,
      },
      totalPhotoCount: totalPhotos,
    });
  } catch (err) {
    logger.error('[AdminGallery:Single] Upload error:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
    if (global.gc) global.gc();
    return res.status(500).json({ success: false, error: err.message || 'Upload failed' });
  }
});

// ── Photo Upload (Legacy Batch) ──────────────────────────────────────────

/**
 * POST /api/admin/gallery/events/:id/upload
 * Bulk upload photos (up to 50 at a time)
 *
 * Multer errors (file too large, wrong type, too many files) are caught by the
 * wrapper so they return proper JSON instead of hitting the global error handler.
 */
router.post('/events/:id/upload', (req, res, next) => {
  upload.array('photos', 50)(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? `Upload rejected: ${err.message}${err.field ? ` (field: ${err.field})` : ''}`
        : err.message || 'File upload failed';
      logger.error('[AdminGallery] Multer error:', message);
      return res.status(400).json({ success: false, error: message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No photos uploaded' });
    }

    // Watermark toggle: default ON, can be turned off via request body
    // "watermark" param: "true" (default) or "false"
    const enableWatermark = req.body.watermark !== 'false';

    // Get current max photo number for this event
    const maxPhoto = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } });
    let nextNumber = (maxPhoto || 0) + 1;

    const R2_BUCKET = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    let r2Client = null;

    // Try to get R2 client
    try {
      const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
      if (r2Configured) r2Client = getR2Client();
    } catch { /* R2 not available */ }

    const uploaded = [];
    const watermarkStatus = enableWatermark && isWatermarkAvailable() ? 'applied' : 'skipped';

    const errors = [];

    for (const file of req.files) {
      try {
        const photoNumber = nextNumber++;
        const displayName = `${event.slug.toUpperCase()}-${String(photoNumber).padStart(3, '0')}`;
        const storageKey = `gallery/${event.slug}/${photoNumber}.jpg`;

        // Convert RAW/large files to JPEG before watermarking
        // CRITICAL: If conversion fails, we MUST NOT upload the raw buffer.
        // RAW files (ARW, CR2, etc.) are 50-150MB and browsers cannot display them.
        const RAW_EXT = /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw|tiff?)$/i;
        const isRaw = RAW_EXT.test(file.originalname || '');
        let inputBuffer = file.buffer;
        if (isRaw || file.size > 50 * 1024 * 1024) {
          const originalSize = file.size;
          logger.info(`[AdminGallery] ${isRaw ? 'RAW format' : 'Large file'} (${(originalSize / 1024 / 1024).toFixed(1)}MB) — converting to JPEG`);
          try {
            inputBuffer = await sharp(file.buffer, { limitInputPixels: false })
              .jpeg({ quality: 95 })
              .toBuffer();
          } catch (conversionErr) {
            logger.error(`[AdminGallery] JPEG conversion FAILED for ${file.originalname}: ${conversionErr.message}`);
            throw new Error(`RAW→JPEG conversion failed for "${file.originalname}": ${conversionErr.message}. ` +
              `The raw file (${(originalSize / 1024 / 1024).toFixed(0)}MB) was NOT uploaded to prevent broken gallery photos.`);
          }

          // Validate the converted buffer is actually smaller and non-empty
          if (!inputBuffer || inputBuffer.length === 0) {
            logger.error(`[AdminGallery] JPEG conversion produced empty buffer for ${file.originalname}`);
            throw new Error(`RAW→JPEG conversion produced empty output for "${file.originalname}". File was NOT uploaded.`);
          }

          // If "converted" buffer is still >90% of original, sharp likely returned the raw data unchanged
          if (inputBuffer.length > originalSize * 0.9) {
            logger.error(`[AdminGallery] JPEG conversion suspicious: output (${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB) is ≥90% of input (${(originalSize / 1024 / 1024).toFixed(1)}MB) — likely unconverted RAW`);
            throw new Error(`RAW→JPEG conversion failed silently for "${file.originalname}": output size (${(inputBuffer.length / 1024 / 1024).toFixed(0)}MB) suggests raw data was not converted. File was NOT uploaded.`);
          }

          logger.info(`[AdminGallery] Converted to JPEG: ${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB (${((1 - inputBuffer.length / originalSize) * 100).toFixed(0)}% reduction)`);
        }

        // Release original buffer to help GC
        file.buffer = null;

        // Apply watermark (SwanStudios logo + sswanstudios.com) before upload
        const processedBuffer = await applyWatermark(inputBuffer, {
          applyWatermark: enableWatermark,
        });

        let url = '';
        let thumbnailUrl = '';

        if (r2Client && R2_BUCKET) {
          // Upload watermarked photo to R2
          await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: storageKey,
            Body: processedBuffer,
            ContentType: 'image/jpeg',
          }));

          url = R2_PUBLIC_URL
            ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${storageKey}`
            : `/api/serve-photo/${storageKey}`;
          thumbnailUrl = url;
        } else {
          url = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
          thumbnailUrl = url;
        }

        const metadata = {
          originalName: file.originalname,
          size: file.size,
          processedSize: processedBuffer.length,
          mimetype: file.mimetype,
          watermarked: enableWatermark && isWatermarkAvailable(),
          uploadedAt: new Date().toISOString(),
        };

        const photo = await GalleryPhoto.create({
          eventId: event.id,
          photoNumber,
          displayName,
          storageKey,
          thumbnailKey: storageKey,
          url,
          thumbnailUrl,
          originalFilename: file.originalname,
          fileSize: processedBuffer.length,
          mimeType: 'image/jpeg',
          metadata,
          sourceType: isRaw ? 'raw' : 'jpeg',
        });

        uploaded.push({
          id: photo.id,
          photoNumber: photo.photoNumber,
          displayName: photo.displayName,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
          sourceType: photo.sourceType,
        });

        logger.info(`[AdminGallery] Uploaded ${displayName} for event ${event.slug}`);
      } catch (photoErr) {
        logger.error(`[AdminGallery] Failed to process photo ${file.originalname}: ${photoErr.message}`);
        errors.push({ file: file.originalname, error: photoErr.message });
      } finally {
        // Release buffers between files to prevent OOM on Render's 512MB plan
        file.buffer = null;
        if (global.gc) global.gc();
      }
    }

    // Update photo count
    const totalPhotos = await GalleryPhoto.count({ where: { eventId: event.id } });
    await event.update({ photoCount: totalPhotos });

    // Set first photo as cover if none set
    if (!event.coverPhotoId && uploaded.length > 0) {
      await event.update({ coverPhotoId: uploaded[0].id });
    }

    return res.json({
      success: uploaded.length > 0,
      message: errors.length
        ? `${uploaded.length} photo(s) uploaded, ${errors.length} failed`
        : `${uploaded.length} photo(s) uploaded`,
      watermark: watermarkStatus,
      photos: uploaded,
      errors: errors.length ? errors : undefined,
      totalPhotoCount: totalPhotos,
    });
  } catch (err) {
    logger.error('[AdminGallery] Upload error:', err.message, err.stack?.split('\n').slice(0, 5).join('\n'));
    return res.status(500).json({ success: false, error: err.message || 'Failed to upload photos' });
  }
});

// ── Direct R2 Upload (Presigned URLs) ────────────────────────────────────
// Flow: browser → R2 (direct) → confirm → Render watermarks one-at-a-time
// This bypasses Render RAM for the upload, enabling batches of 20+ photos.

/**
 * POST /api/admin/gallery/events/:id/presign-upload
 * Generate presigned R2 PUT URLs for direct browser-to-R2 uploads.
 *
 * Body: { files: [{ name: "IMG_001.jpg", size: 5242880, type: "image/jpeg" }, ...] }
 * Returns: { uploads: [{ name, key, uploadUrl, photoNumber, displayName }, ...] }
 */
router.post('/events/:id/presign-upload', async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files specified' });
    }

    if (files.length > 50) {
      return res.status(400).json({ success: false, error: 'Maximum 50 files per presign request' });
    }

    // Check R2 availability
    let r2Client = null;
    const R2_BUCKET = process.env.R2_BUCKET_NAME;
    try {
      const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
      if (r2Configured) r2Client = getR2Client();
    } catch { /* R2 not available */ }

    if (!r2Client || !R2_BUCKET) {
      return res.status(503).json({ success: false, error: 'R2 storage not configured — use legacy upload endpoint' });
    }

    // Get current max photo number
    const maxPhoto = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } });
    let nextNumber = (maxPhoto || 0) + 1;

    const uploads = [];

    for (const file of files) {
      const photoNumber = nextNumber++;
      const displayName = `${event.slug.toUpperCase()}-${String(photoNumber).padStart(3, '0')}`;
      // Store raw uploads in a staging prefix; watermarked versions go to final location
      const rawKey = `gallery-raw/${event.slug}/${photoNumber}-${Date.now()}.jpg`;
      const finalKey = `gallery/${event.slug}/${photoNumber}.jpg`;

      // Use the browser's content type (application/octet-stream for RAW files)
      // Don't force image/jpeg — it must match what the browser sends in the PUT
      const contentType = file.type || 'application/octet-stream';
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: rawKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(r2Client, command, {
        expiresIn: 600, // 10 min TTL
        unhoistableHeaders: new Set(['content-type']), // Don't sign Content-Type — let browser set it freely
      });

      uploads.push({
        name: file.name,
        rawKey,
        finalKey,
        uploadUrl,
        photoNumber,
        displayName,
      });
    }

    logger.info(`[AdminGallery] Generated ${uploads.length} presigned URLs for event ${event.slug}`);

    return res.json({
      success: true,
      uploads,
      eventSlug: event.slug,
    });
  } catch (err) {
    logger.error('[AdminGallery] Presign error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate upload URLs' });
  }
});

/**
 * GET /api/admin/gallery/r2-cors-check
 * Diagnostic: tests R2 CORS configuration by checking bucket CORS rules.
 */
router.get('/r2-cors-check', async (req, res) => {
  try {
    const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
    if (!r2Configured) {
      return res.json({ success: false, error: 'R2 not configured' });
    }
    const { GetBucketCorsCommand } = await import('@aws-sdk/client-s3');
    const client = getR2Client();
    const result = await client.send(new GetBucketCorsCommand({ Bucket: process.env.R2_BUCKET_NAME }));
    return res.json({ success: true, corsRules: result.CORSRules || [] });
  } catch (err) {
    return res.json({ success: false, error: err.message, code: err.Code || err.name });
  }
});

/**
 * POST /api/admin/gallery/setup-r2-cors
 * Apply CORS rules to R2 bucket so browser can upload directly via presigned URLs.
 */
router.post('/setup-r2-cors', async (req, res) => {
  try {
    const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
    if (!r2Configured) {
      return res.status(503).json({ success: false, error: 'R2 not configured' });
    }
    const { PutBucketCorsCommand } = await import('@aws-sdk/client-s3');
    const client = getR2Client();

    const corsRules = {
      Bucket: process.env.R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [
              'https://sswanstudios.com',
              'https://www.sswanstudios.com',
              'http://localhost:5173',
              'http://localhost:3000',
            ],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'x-amz-request-id'],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    };

    await client.send(new PutBucketCorsCommand(corsRules));
    logger.info('[AdminGallery] R2 CORS rules applied successfully');
    return res.json({ success: true, message: 'R2 CORS rules applied successfully' });
  } catch (err) {
    logger.error('[AdminGallery] Failed to apply R2 CORS:', err.message);
    return res.json({ success: false, error: err.message, code: err.Code || err.name });
  }
});

/**
 * POST /api/admin/gallery/reprocess-photo/:photoId
 * Manually trigger RAW→JPEG conversion + watermark for a photo.
 * Used when background processing fails or needs to be retried.
 */
router.post('/reprocess-photo/:photoId', async (req, res) => {
  try {
    const photo = await GalleryPhoto.findByPk(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, error: 'Photo not found' });

    const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
    if (!r2Configured) return res.status(503).json({ success: false, error: 'R2 not configured' });
    const r2Client = getR2Client();
    const R2_BUCKET = process.env.R2_BUCKET_NAME;

    // Step 1: Download from R2
    const step1Start = Date.now();
    const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: photo.storageKey });
    const obj = await r2Client.send(getCmd);
    const chunks = [];
    for await (const chunk of obj.Body) chunks.push(chunk);
    let rawBuf = Buffer.concat(chunks);
    const downloadMs = Date.now() - step1Start;
    const rawSizeMB = (rawBuf.length / 1024 / 1024).toFixed(1);

    // Step 2: Convert to JPEG
    // Try sharp first (handles JPEG/PNG/WebP/TIFF). If it fails, try dcraw for camera RAW.
    const step2Start = Date.now();
    let jpegBuf;

    try {
      // Try sharp directly — works if file is already JPEG/PNG/WebP/TIFF
      jpegBuf = await sharp(rawBuf, { limitInputPixels: false })
        .jpeg({ quality: 95 })
        .toBuffer();
      rawBuf = null;
      logger.info('[Reprocess] Sharp handled file directly');
    } catch (sharpErr) {
      // Sharp failed — likely a camera RAW file, try dcraw
      logger.info('[Reprocess] Sharp failed (%s), trying dcraw...', sharpErr.message);
      const fs = await import('fs');
      const os = await import('os');
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      const dcraw = (await import('dcrawr')).default || (await import('dcrawr'));
      const dcrawPath = typeof dcraw === 'string' ? dcraw : dcraw.path || dcraw;

      const tmpDir = os.default?.tmpdir?.() || os.tmpdir();
      const tmpRaw = `${tmpDir}/reprocess_${photo.id}.arw`;
      const tmpTiff = `${tmpDir}/reprocess_${photo.id}.tiff`;

      // Write RAW to temp file
      (fs.default || fs).writeFileSync(tmpRaw, rawBuf);
      rawBuf = null;

      // dcraw -T (TIFF output) -w (camera white balance) -o 1 (sRGB)
      try {
        await execFileAsync(dcrawPath, ['-T', '-w', '-o', '1', tmpRaw], { timeout: 120000 });
      } catch (dcrawErr) {
        try { (fs.default || fs).unlinkSync(tmpRaw); } catch {}
        try { (fs.default || fs).unlinkSync(tmpTiff); } catch {}
        throw new Error(`dcraw conversion failed: ${dcrawErr.message}`);
      }

      // Read TIFF output and pipe through sharp
      const tiffBuf = (fs.default || fs).readFileSync(tmpTiff);
      jpegBuf = await sharp(tiffBuf, { limitInputPixels: false })
        .jpeg({ quality: 95 })
        .toBuffer();

      // Clean up temp files
      try { (fs.default || fs).unlinkSync(tmpRaw); } catch {}
      try { (fs.default || fs).unlinkSync(tmpTiff); } catch {}
    }

    const convertMs = Date.now() - step2Start;
    const jpegSizeMB = (jpegBuf.length / 1024 / 1024).toFixed(1);

    // Step 3: Watermark
    const step3Start = Date.now();
    jpegBuf = await applyWatermark(jpegBuf, { applyWatermark: true });
    const watermarkMs = Date.now() - step3Start;
    const finalSizeMB = (jpegBuf.length / 1024 / 1024).toFixed(1);

    // Step 4: Re-upload
    const step4Start = Date.now();
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: photo.storageKey,
      Body: jpegBuf,
      ContentType: 'image/jpeg',
    }));
    const uploadMs = Date.now() - step4Start;

    // Step 5: Update DB
    await photo.update({
      fileSize: jpegBuf.length,
      mimeType: 'image/jpeg',
    });
    jpegBuf = null;

    return res.json({
      success: true,
      photoId: photo.id,
      timing: { downloadMs, convertMs, watermarkMs, uploadMs, totalMs: downloadMs + convertMs + watermarkMs + uploadMs },
      sizes: { rawMB: rawSizeMB, jpegMB: jpegSizeMB, finalMB: finalSizeMB },
    });
  } catch (err) {
    logger.error('[AdminGallery] Reprocess failed:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
    return res.status(500).json({ success: false, error: err.message, stack: err.stack?.split('\n').slice(0, 3) });
  }
});

/**
 * POST /api/admin/gallery/events/:id/confirm-upload
 * After browser uploads to R2, this endpoint:
 *   1. Downloads the raw photo from R2 (one at a time)
 *   2. Applies watermark with sharp
 *   3. Re-uploads watermarked version to final R2 key
 *   4. Creates GalleryPhoto DB record
 *   5. Deletes raw staging file
 *
 * Body: { photos: [{ rawKey, finalKey, photoNumber, displayName, originalName, fileSize }], watermark: true }
 */
router.post('/events/:id/confirm-upload', async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const { photos, watermark: enableWatermark = true } = req.body;
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ success: false, error: 'No photos to confirm' });
    }

    let r2Client = null;
    const R2_BUCKET = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    try {
      const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
      if (r2Configured) r2Client = getR2Client();
    } catch { /* */ }

    if (!r2Client || !R2_BUCKET) {
      return res.status(503).json({ success: false, error: 'R2 storage not configured' });
    }

    const watermarkStatus = enableWatermark && isWatermarkAvailable() ? 'applied' : 'skipped';
    const confirmed = [];
    const errors = [];

    // Process ONE photo at a time to keep RAM low (~150MB peak per file)
    const sharp = (await import('sharp')).default;

    const { CopyObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    for (const photo of photos) {
      try {
        const RAW_EXTENSIONS = /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw|tiff?)$/i;
        const isRawFormat = RAW_EXTENSIONS.test(photo.originalName || photo.rawKey);
        const fileSizeBytes = photo.fileSize || 0;
        const isLargeFile = fileSizeBytes > 50 * 1024 * 1024; // >50MB

        // ── Large/RAW files: CopyObject instantly, then convert+watermark in background ──
        if (isRawFormat || isLargeFile) {
          logger.info(`[AdminGallery] Large/RAW file (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) — copy now, process in background`);

          // Copy from staging key to final key within R2 (instant, no download)
          await r2Client.send(new CopyObjectCommand({
            Bucket: R2_BUCKET,
            CopySource: `${R2_BUCKET}/${photo.rawKey}`,
            Key: photo.finalKey,
          }));

          // Delete staging file (best-effort)
          try {
            await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: photo.rawKey }));
          } catch { /* non-fatal */ }

          // Create DB record immediately (photo visible right away)
          const url = R2_PUBLIC_URL
            ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${photo.finalKey}`
            : `/api/serve-photo/${photo.finalKey}`;

          const dbPhoto = await GalleryPhoto.create({
            eventId: event.id,
            photoNumber: photo.photoNumber,
            displayName: photo.displayName,
            storageKey: photo.finalKey,
            thumbnailKey: photo.finalKey,
            url,
            thumbnailUrl: url,
            originalFilename: photo.originalName || photo.rawKey,
            fileSize: fileSizeBytes,
            mimeType: isRawFormat ? 'image/x-raw' : 'image/jpeg',
            metadata: {
              originalName: photo.originalName,
              originalSize: fileSizeBytes,
              watermarked: false,
              processing: true,
              uploadMethod: 'direct-r2-background',
              uploadedAt: new Date().toISOString(),
            },
          });

          confirmed.push({
            id: dbPhoto.id,
            photoNumber: dbPhoto.photoNumber,
            displayName: dbPhoto.displayName,
            url: dbPhoto.url,
            thumbnailUrl: dbPhoto.thumbnailUrl,
          });

          // ── Background: download, convert RAW→JPEG, watermark, replace in R2 ──
          const bgPhotoId = dbPhoto.id;
          const bgFinalKey = photo.finalKey;
          const bgOrigName = photo.originalName || photo.rawKey;
          const bgEnableWatermark = enableWatermark;

          setImmediate(async () => {
            try {
              logger.info(`[AdminGallery/BG] Starting background processing for ${bgOrigName}`);

              // Download from R2
              const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: bgFinalKey });
              const obj = await r2Client.send(getCmd);
              const dlChunks = [];
              for await (const chunk of obj.Body) dlChunks.push(chunk);
              let rawBuf = Buffer.concat(dlChunks);
              logger.info(`[AdminGallery/BG] Downloaded ${(rawBuf.length / 1024 / 1024).toFixed(1)}MB`);

              // Convert RAW → JPEG using dcraw (sharp can't decode camera RAW)
              const RAW_EXT_BG = /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw)$/i;
              const isCameraRaw = RAW_EXT_BG.test(bgOrigName);
              let jpegBuf;

              if (isCameraRaw) {
                const fs = await import('fs');
                const os = await import('os');
                const { execFile } = await import('child_process');
                const { promisify } = await import('util');
                const execFileAsync = promisify(execFile);
                const dcraw = (await import('dcrawr')).default || (await import('dcrawr'));
                const dcrawPath = typeof dcraw === 'string' ? dcraw : dcraw.path || dcraw;

                const tmpDir = os.default?.tmpdir?.() || os.tmpdir();
                const tmpRaw = `${tmpDir}/bg_${bgPhotoId}.arw`;
                const tmpTiff = `${tmpDir}/bg_${bgPhotoId}.tiff`;

                (fs.default || fs).writeFileSync(tmpRaw, rawBuf);
                rawBuf = null;

                await execFileAsync(dcrawPath, ['-T', '-w', '-o', '1', tmpRaw], { timeout: 120000 });

                const tiffBuf = (fs.default || fs).readFileSync(tmpTiff);
                jpegBuf = await sharp(tiffBuf, { limitInputPixels: false })
                  .jpeg({ quality: 95 })
                  .toBuffer();

                try { (fs.default || fs).unlinkSync(tmpRaw); } catch {}
                try { (fs.default || fs).unlinkSync(tmpTiff); } catch {}
              } else {
                jpegBuf = await sharp(rawBuf, { limitInputPixels: false })
                  .jpeg({ quality: 95 })
                  .toBuffer();
                rawBuf = null;
              }
              logger.info(`[AdminGallery/BG] Converted to JPEG: ${(jpegBuf.length / 1024 / 1024).toFixed(1)}MB`);

              // Watermark
              if (bgEnableWatermark) {
                jpegBuf = await applyWatermark(jpegBuf, { applyWatermark: true });
                logger.info(`[AdminGallery/BG] Watermark applied`);
              }

              // Re-upload processed version to same final key
              await r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: bgFinalKey,
                Body: jpegBuf,
                ContentType: 'image/jpeg',
              }));

              // Update DB record
              const processedSize = jpegBuf.length;
              jpegBuf = null;
              await GalleryPhoto.update(
                {
                  fileSize: processedSize,
                  mimeType: 'image/jpeg',
                  metadata: {
                    originalName: bgOrigName,
                    originalSize: fileSizeBytes,
                    processedSize,
                    watermarked: bgEnableWatermark && isWatermarkAvailable(),
                    processing: false,
                    uploadMethod: 'direct-r2-background',
                    processedAt: new Date().toISOString(),
                  },
                },
                { where: { id: bgPhotoId } }
              );

              logger.info(`[AdminGallery/BG] ✅ Background processing complete for photo ${bgPhotoId}`);
            } catch (bgErr) {
              logger.error(`[AdminGallery/BG] ❌ Background processing failed for photo ${bgPhotoId}: ${bgErr.message}`);
              // Photo still exists in R2 as raw — admin can retry later
            }
          });

          logger.info(`[AdminGallery] Confirmed ${photo.displayName} — background processing queued`);
          continue;
        }

        // ── Normal-sized files: download, watermark, re-upload ──
        // 1. Download raw photo from R2
        const getCommand = new GetObjectCommand({ Bucket: R2_BUCKET, Key: photo.rawKey });
        const rawObj = await r2Client.send(getCommand);
        const chunks = [];
        for await (const chunk of rawObj.Body) {
          chunks.push(chunk);
        }
        let rawBuffer = Buffer.concat(chunks);
        const rawSize = rawBuffer.length;

        let photoBuffer = rawBuffer;
        rawBuffer = null;

        // 2. Watermark
        if (enableWatermark) {
          photoBuffer = await applyWatermark(photoBuffer, { applyWatermark: true });
        }

        // 3. Upload watermarked version to final key
        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: photo.finalKey,
          Body: photoBuffer,
          ContentType: 'image/jpeg',
        }));

        const processedSize = photoBuffer.length;

        // 4. Delete raw staging file (best-effort)
        try {
          await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: photo.rawKey }));
        } catch { /* non-fatal */ }

        // 5. Create DB record
        const url = R2_PUBLIC_URL
          ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${photo.finalKey}`
          : `/api/serve-photo/${photo.finalKey}`;

        const dbPhoto = await GalleryPhoto.create({
          eventId: event.id,
          photoNumber: photo.photoNumber,
          displayName: photo.displayName,
          storageKey: photo.finalKey,
          thumbnailKey: photo.finalKey,
          url,
          thumbnailUrl: url,
          originalFilename: photo.originalName || photo.rawKey,
          fileSize: processedSize,
          mimeType: 'image/jpeg',
          metadata: {
            originalName: photo.originalName,
            originalSize: photo.fileSize || rawSize,
            processedSize,
            watermarked: enableWatermark && isWatermarkAvailable(),
            uploadMethod: 'direct-r2',
            uploadedAt: new Date().toISOString(),
          },
        });

        confirmed.push({
          id: dbPhoto.id,
          photoNumber: dbPhoto.photoNumber,
          displayName: dbPhoto.displayName,
          url: dbPhoto.url,
          thumbnailUrl: dbPhoto.thumbnailUrl,
        });

        // Release buffer and hint GC between files
        photoBuffer = null;

        logger.info(`[AdminGallery] Confirmed ${photo.displayName} (direct R2) for event ${event.slug}`);
      } catch (photoErr) {
        logger.error(`[AdminGallery] Failed to confirm ${photo.rawKey}: ${photoErr.message}`);
        errors.push({ rawKey: photo.rawKey, displayName: photo.displayName, error: photoErr.message });
      }

      // Hint GC between files to reclaim memory before next large photo
      if (global.gc) global.gc();
    }

    // Update photo count
    const totalPhotos = await GalleryPhoto.count({ where: { eventId: event.id } });
    await event.update({ photoCount: totalPhotos });

    // Set first photo as cover if none set
    if (!event.coverPhotoId && confirmed.length > 0) {
      await event.update({ coverPhotoId: confirmed[0].id });
    }

    return res.json({
      success: confirmed.length > 0,
      message: errors.length
        ? `${confirmed.length} photo(s) confirmed, ${errors.length} failed`
        : `${confirmed.length} photo(s) confirmed & watermarked`,
      watermark: watermarkStatus,
      photos: confirmed,
      errors: errors.length ? errors : undefined,
      totalPhotoCount: totalPhotos,
    });
  } catch (err) {
    logger.error('[AdminGallery] Confirm upload error:', err.message, err.stack?.split('\n').slice(0, 5).join('\n'));
    return res.status(500).json({ success: false, error: err.message || 'Failed to confirm uploads' });
  }
});

/**
 * GET /api/admin/gallery/events/:id/photos
 * List photos with enhancement stats
 */
router.get('/events/:id/photos', async (req, res) => {
  try {
    const photos = await GalleryPhoto.findAll({
      where: { eventId: req.params.id },
      attributes: ['id', 'photoNumber', 'displayName', 'url', 'thumbnailUrl', 'fileSize', 'enhancedUrl', 'enhancementRequestCount', 'createdAt'],
      order: [['photoNumber', 'ASC']],
    });
    return res.json({ success: true, photos });
  } catch (err) {
    logger.error('[AdminGallery] List photos error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list photos' });
  }
});

/**
 * DELETE /api/admin/gallery/photos/:photoId
 * Delete an individual photo from an event
 */
router.delete('/photos/:photoId', async (req, res) => {
  try {
    // Use raw SQL to avoid Sequelize referencing columns not yet migrated (e.g. source_type)
    const [rows] = await sequelize.query(
      'SELECT id, event_id FROM gallery_photos WHERE id = :photoId',
      { replacements: { photoId: req.params.photoId } }
    );
    const photoRow = rows?.[0];
    if (!photoRow) return res.status(404).json({ success: false, error: 'Photo not found' });

    const photoId = photoRow.id;
    const eventId = photoRow.event_id;

    // Delete associated records first (FK constraints)
    await EnhancementRequest.destroy({ where: { photoId } });
    await PhotoVote.destroy({ where: { photoId } });

    // Delete the photo record
    await sequelize.query('DELETE FROM gallery_photos WHERE id = :photoId', {
      replacements: { photoId },
    });

    // Update event photo count
    const [[countRow]] = await sequelize.query(
      'SELECT COUNT(*) as count FROM gallery_photos WHERE event_id = :eventId',
      { replacements: { eventId } }
    );
    const remaining = parseInt(countRow.count, 10);
    await GalleryEvent.update({ photoCount: remaining }, { where: { id: eventId } });

    logger.info(`[AdminGallery] Deleted photo ${req.params.photoId} from event ${eventId}`);
    return res.json({ success: true, message: 'Photo deleted', remainingCount: remaining });
  } catch (err) {
    logger.error('[AdminGallery] Delete photo error:', err.message, err.stack);
    return res.status(500).json({ success: false, error: `Failed to delete photo: ${err.message}` });
  }
});

// ── Enhancement Request Queue ─────────────────────────────────────────────

/**
 * GET /api/admin/gallery/enhancements
 * Enhancement request queue with visitor and photo info
 */
router.get('/enhancements', async (req, res) => {
  try {
    const { status = 'requested' } = req.query;
    const where = {};
    if (status !== 'all') where.status = status;

    const requests = await EnhancementRequest.findAll({
      where,
      include: [
        { model: GalleryVisitor, as: 'visitor', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: GalleryPhoto, as: 'photo', attributes: ['id', 'photoNumber', 'displayName', 'url', 'thumbnailUrl', 'eventId'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, requests });
  } catch (err) {
    logger.error('[AdminGallery] List enhancements error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list enhancement requests' });
  }
});

/**
 * PATCH /api/admin/gallery/enhancements/:id
 * Update enhancement status, upload enhanced photo
 */
router.patch('/enhancements/:id', async (req, res) => {
  try {
    const request = await EnhancementRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: 'Enhancement request not found' });

    const { status } = req.body;
    const updates = {};

    if (status) {
      updates.status = status;
      if (status === 'completed') updates.completedAt = new Date();
      if (status === 'delivered') updates.deliveredAt = new Date();
    }

    await request.update(updates);
    return res.json({ success: true, request });
  } catch (err) {
    logger.error('[AdminGallery] Update enhancement error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update enhancement' });
  }
});

// ── Visitor/Lead Management ───────────────────────────────────────────────

/**
 * GET /api/admin/gallery/visitors
 * Email list with lead info
 */
router.get('/visitors', async (req, res) => {
  try {
    const { eventId } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;

    const visitors = await GalleryVisitor.findAll({
      where,
      include: [
        { model: GalleryEvent, as: 'event', attributes: ['id', 'name', 'slug'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, visitors });
  } catch (err) {
    logger.error('[AdminGallery] List visitors error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list visitors' });
  }
});

// ── Donation Management ───────────────────────────────────────────────────

/**
 * GET /api/admin/gallery/donations
 * List all donations with visitor info
 */
router.get('/donations', async (req, res) => {
  try {
    const donations = await GalleryDonation.findAll({
      include: [
        { model: GalleryVisitor, as: 'visitor', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: GalleryEvent, as: 'event', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

    return res.json({ success: true, donations, totalAmount });
  } catch (err) {
    logger.error('[AdminGallery] List donations error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list donations' });
  }
});

/**
 * PATCH /api/admin/gallery/donations/:id/confirm-zelle
 * Admin confirms Zelle payment received
 */
router.patch('/donations/:id/confirm-zelle', async (req, res) => {
  try {
    const donation = await GalleryDonation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ success: false, error: 'Donation not found' });

    await donation.update({ zelleConfirmed: true });
    return res.json({ success: true, message: 'Zelle donation confirmed' });
  } catch (err) {
    logger.error('[AdminGallery] Confirm Zelle error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to confirm Zelle donation' });
  }
});

// ── Referral Management ───────────────────────────────────────────────────

/**
 * GET /api/admin/gallery/referrals
 * List all referrals
 */
router.get('/referrals', async (req, res) => {
  try {
    const referrals = await GalleryReferral.findAll({
      include: [
        { model: GalleryVisitor, as: 'visitor', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: GalleryEvent, as: 'event', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, referrals });
  } catch (err) {
    logger.error('[AdminGallery] List referrals error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list referrals' });
  }
});

/**
 * PATCH /api/admin/gallery/referrals/:id
 * Update referral (contacted, converted)
 */
router.patch('/referrals/:id', async (req, res) => {
  try {
    const referral = await GalleryReferral.findByPk(req.params.id);
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });

    const { contacted, converted } = req.body;
    const updates = {};
    if (contacted !== undefined) updates.contacted = !!contacted;
    if (converted !== undefined) updates.converted = !!converted;

    await referral.update(updates);
    return res.json({ success: true, referral });
  } catch (err) {
    logger.error('[AdminGallery] Update referral error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update referral' });
  }
});

// ── Dashboard Stats ───────────────────────────────────────────────────────

/**
 * GET /api/admin/gallery/stats
 * Gallery dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalEvents,
      totalPhotos,
      totalVisitors,
      totalEnhancements,
      pendingEnhancements,
      totalDonations,
      totalReferrals,
      unconvertedReferrals,
    ] = await Promise.all([
      GalleryEvent.count(),
      GalleryPhoto.count(),
      GalleryVisitor.count(),
      EnhancementRequest.count(),
      EnhancementRequest.count({ where: { status: 'requested' } }),
      GalleryDonation.sum('amount') || 0,
      GalleryReferral.count(),
      GalleryReferral.count({ where: { contacted: false } }),
    ]);

    // Unique emails (newsletter subscribers)
    const newsletterCount = await GalleryVisitor.count({
      where: { newsletterOptIn: true },
      distinct: true,
      col: 'email',
    });

    // Check R2 storage status
    let storageType = 'base64-fallback';
    try {
      const { r2Configured } = await import('../services/r2StorageService.mjs');
      if (r2Configured) storageType = 'cloudflare-r2';
    } catch { /* */ }

    return res.json({
      success: true,
      stats: {
        totalEvents,
        totalPhotos,
        totalVisitors,
        newsletterSubscribers: newsletterCount,
        totalEnhancements,
        pendingEnhancements,
        totalDonationAmount: parseFloat(totalDonations) || 0,
        totalReferrals,
        unconvertedReferrals,
        storageType,
      },
    });
  } catch (err) {
    logger.error('[AdminGallery] Stats error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load gallery stats' });
  }
});

// ── Photo Vote Stats (Admin) ──────────────────────────────────────────────

/**
 * GET /api/admin/gallery/events/:id/vote-stats
 * Get vote stats for all photos in an event, sorted by sentiment.
 */
router.get('/events/:id/vote-stats', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    const photos = await GalleryPhoto.findAll({
      where: { eventId },
      attributes: ['id', 'photoNumber', 'displayName', 'thumbnailUrl', 'url'],
      order: [['photoNumber', 'ASC']],
      raw: true,
    });

    if (photos.length === 0) {
      return res.json({ success: true, photos: [], cleanup: [] });
    }

    const photoIds = photos.map(p => p.id);

    // Aggregate vote counts
    const voteCounts = await PhotoVote.findAll({
      where: { photoId: photoIds },
      attributes: [
        'photoId',
        [fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
        [fn('SUM', literal("CASE WHEN vote_type = -1 THEN 1 ELSE 0 END")), 'thumbsDown'],
        [fn('COUNT', col('id')), 'totalVotes'],
      ],
      group: ['photoId'],
      raw: true,
    });

    const voteMap = {};
    for (const row of voteCounts) {
      voteMap[row.photoId] = {
        thumbsUp: parseInt(row.thumbsUp) || 0,
        thumbsDown: parseInt(row.thumbsDown) || 0,
        totalVotes: parseInt(row.totalVotes) || 0,
      };
    }

    // Enrich photos with vote data
    const enriched = photos.map(p => ({
      ...p,
      thumbsUp: voteMap[p.id]?.thumbsUp || 0,
      thumbsDown: voteMap[p.id]?.thumbsDown || 0,
      totalVotes: voteMap[p.id]?.totalVotes || 0,
      sentiment: (voteMap[p.id]?.thumbsUp || 0) - (voteMap[p.id]?.thumbsDown || 0),
    }));

    // Cleanup suggestions: photos with negative sentiment (more thumbs down than up)
    const cleanup = enriched
      .filter(p => p.thumbsDown > 0 && p.sentiment < 0)
      .sort((a, b) => a.sentiment - b.sentiment);

    return res.json({ success: true, photos: enriched, cleanup });
  } catch (err) {
    logger.error('[AdminGallery] Vote stats error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load vote stats' });
  }
});

/**
 * DELETE /api/admin/gallery/photos/bulk-delete
 * Bulk delete photos (from cleanup suggestions).
 * Body: { photoIds: number[] }
 */
router.delete('/photos/bulk-delete', async (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ success: false, error: 'photoIds array required' });
    }

    // Delete votes first (cascade may handle this, but be explicit)
    await PhotoVote.destroy({ where: { photoId: photoIds } });
    // Delete enhancement requests
    await EnhancementRequest.destroy({ where: { photoId: photoIds } });
    // Delete photos
    const deleted = await GalleryPhoto.destroy({ where: { id: photoIds } });

    logger.info(`[AdminGallery] Bulk deleted ${deleted} photos: ${photoIds.join(', ')}`);
    return res.json({ success: true, deleted });
  } catch (err) {
    logger.error('[AdminGallery] Bulk delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete photos' });
  }
});

// ── Gallery Messages (Admin) ──────────────────────────────────────────────

/**
 * GET /api/admin/gallery/messages
 * List all gallery messages with visitor/event info, sorted by newest first.
 * Query params: ?eventId=<id> — filter by event
 *               ?unreadOnly=true — show only unread messages
 */
router.get('/messages', async (req, res) => {
  try {
    const { eventId, unreadOnly } = req.query;

    const where = {};
    if (eventId) {
      where.eventId = parseInt(eventId, 10);
    }
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const messages = await GalleryMessage.findAll({
      where,
      include: [
        {
          model: GalleryVisitor,
          as: 'visitor',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: GalleryEvent,
          as: 'event',
          attributes: ['id', 'name', 'slug'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, messages });
  } catch (err) {
    logger.error('[AdminGallery] List messages error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

/**
 * GET /api/admin/gallery/messages/count
 * Return unread message count (for badge on Messages tab)
 */
router.get('/messages/count', async (req, res) => {
  try {
    const unreadCount = await GalleryMessage.count({
      where: { isRead: false },
    });

    return res.json({ success: true, unreadCount });
  } catch (err) {
    logger.error('[AdminGallery] Message count error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get message count' });
  }
});

/**
 * PATCH /api/admin/gallery/messages/:id/read
 * Mark a message as read (set isRead=true, readAt=now)
 */
router.patch('/messages/:id/read', async (req, res) => {
  try {
    const message = await GalleryMessage.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await message.update({ isRead: true, readAt: new Date() });

    logger.info(`[AdminGallery] Message ${message.id} marked as read`);
    return res.json({ success: true, message });
  } catch (err) {
    logger.error('[AdminGallery] Mark read error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// ─── Repair RAW Photos ───────────────────────────────────────────────────────
// POST /admin/gallery/repair-raw-photos
// Downloads oversized R2 objects (likely RAW ARW), converts to JPEG via sharp,
// re-uploads, and updates the DB. Requires admin auth.
// Query params: ?event=slug&execute=true&threshold=10
router.post('/repair-raw-photos', async (req, res) => {
  try {
    const eventSlug = req.query.event || null;
    const execute = req.query.execute === 'true';
    const thresholdMB = parseFloat(req.query.threshold) || 10;
    const thresholdBytes = thresholdMB * 1024 * 1024;

    const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
    if (!r2Configured) {
      return res.status(503).json({ success: false, error: 'R2 not configured' });
    }
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    // Find photos to check
    const whereClause = [];
    const replacements = {};
    if (eventSlug) {
      whereClause.push('ge.slug = :slug');
      replacements.slug = eventSlug;
    }
    const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const [photos] = await sequelize.query(`
      SELECT gp.id, gp.storage_key, gp.display_name, gp.file_size, gp.url,
             gp.photo_number, gp.event_id, ge.slug AS event_slug
      FROM gallery_photos gp
      JOIN gallery_events ge ON ge.id = gp.event_id
      ${whereSQL}
      ORDER BY ge.slug, gp.photo_number
    `, { replacements });

    const results = [];

    for (const photo of photos) {
      const { id, storage_key, display_name } = photo;
      try {
        // Check actual R2 object size via HEAD
        let r2Size = null;
        try {
          const head = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: storage_key }));
          r2Size = head.ContentLength;
        } catch (headErr) {
          if (headErr.name === 'NotFound' || headErr.$metadata?.httpStatusCode === 404) {
            results.push({ id, display_name, storage_key, status: 'missing' });
            continue;
          }
          throw headErr;
        }

        if (r2Size < thresholdBytes) {
          results.push({ id, display_name, storage_key, status: 'ok', r2Size });
          continue;
        }

        // Oversized — likely RAW
        if (!execute) {
          results.push({ id, display_name, storage_key, status: 'broken', r2Size, action: 'would_repair' });
          continue;
        }

        // Download, convert, re-upload
        logger.info(`[RepairRAW] Downloading ${storage_key} (${(r2Size / 1024 / 1024).toFixed(1)}MB)...`);
        const getResp = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: storage_key }));
        const chunks = [];
        for await (const chunk of getResp.Body) chunks.push(chunk);
        const rawBuffer = Buffer.concat(chunks);

        // Convert to JPEG via sharp
        let jpegBuffer;
        try {
          jpegBuffer = await sharp(rawBuffer, { limitInputPixels: false })
            .jpeg({ quality: 95 })
            .toBuffer();
        } catch (sharpErr) {
          // Try dcraw fallback for true RAW formats
          const dcrawPaths = [
            join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'dcraw-vendored-win32', 'dcraw.exe'),
            join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'dcraw-vendored-linux', 'dcraw'),
          ];
          const dcrawPath = dcrawPaths.find(p => existsSync(p));
          if (!dcrawPath) throw new Error(`Sharp can't decode and dcraw not found: ${sharpErr.message}`);

          const tempRaw = join(tmpdir(), `repair-${id}.arw`);
          const { writeFileSync: writeSync } = await import('fs');
          writeSync(tempRaw, rawBuffer);
          try {
            // Ensure executable on Linux
            try { chmodSync(dcrawPath, 0o755); } catch {}
            execFileSync(dcrawPath, ['-T', '-w', '-q', '3', '-o', '1', tempRaw], { timeout: 120000 });
            const tiffPath = tempRaw.replace(/\.[^.]+$/, '.tiff');
            const tiffBuffer = readFileSync(tiffPath);
            jpegBuffer = await sharp(tiffBuffer, { limitInputPixels: false }).jpeg({ quality: 95 }).toBuffer();
            try { unlinkSync(tempRaw); } catch {}
            try { unlinkSync(tiffPath); } catch {}
          } catch (dcErr) {
            try { unlinkSync(tempRaw); } catch {}
            try { unlinkSync(tempRaw.replace(/\.[^.]+$/, '.tiff')); } catch {}
            throw new Error(`dcraw conversion failed: ${dcErr.message}`);
          }
        }

        // Re-upload converted JPEG
        await client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: storage_key,
          Body: jpegBuffer,
          ContentType: 'image/jpeg',
        }));

        // Update DB record
        await sequelize.query(`
          UPDATE gallery_photos
          SET file_size = :fileSize,
              mime_type = 'image/jpeg',
              metadata = jsonb_set(
                COALESCE(metadata, '{}'),
                '{repaired}',
                :repairMeta::jsonb
              ),
              updated_at = NOW()
          WHERE id = :id
        `, {
          replacements: {
            id,
            fileSize: jpegBuffer.length,
            repairMeta: JSON.stringify({
              repairedAt: new Date().toISOString(),
              originalR2Size: r2Size,
              convertedSize: jpegBuffer.length,
              reason: 'RAW file stored without JPEG conversion',
            }),
          },
        });

        logger.info(`[RepairRAW] Repaired photo ${id}: ${(r2Size / 1024 / 1024).toFixed(1)}MB → ${(jpegBuffer.length / 1024 / 1024).toFixed(1)}MB`);
        results.push({ id, display_name, storage_key, status: 'repaired', originalSize: r2Size, newSize: jpegBuffer.length });

      } catch (err) {
        logger.error(`[RepairRAW] Error on photo ${id}: ${err.message}`);
        results.push({ id, display_name, storage_key, status: 'error', error: err.message });
      }
    }

    const summary = {
      total: photos.length,
      ok: results.filter(r => r.status === 'ok').length,
      broken: results.filter(r => r.status === 'broken').length,
      repaired: results.filter(r => r.status === 'repaired').length,
      missing: results.filter(r => r.status === 'missing').length,
      errors: results.filter(r => r.status === 'error').length,
      mode: execute ? 'execute' : 'dry-run',
    };

    return res.json({ success: true, summary, results });
  } catch (err) {
    logger.error('[RepairRAW] Repair endpoint error:', err.message, err.stack);
    return res.status(500).json({ success: false, error: `Repair failed: ${err.message}` });
  }
});

export default router;
