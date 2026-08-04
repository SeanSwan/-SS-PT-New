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
import { randomBytes } from 'node:crypto';
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
import PrintOrder from '../models/PrintOrder.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import sharp from 'sharp';
import { applyWatermark, isWatermarkAvailable } from '../services/watermarkService.mjs';
import { generateVariants, variantKeys } from '../services/imageVariantService.mjs';
import logger from '../utils/logger.mjs';
import { tmpdir } from 'os';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, readFileSync, writeFileSync, chmodSync, statSync, mkdtempSync, rmSync } from 'fs';
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
  limits: { fileSize: 25 * 1024 * 1024, files: 2 }, // 25MB per file (JPEG only — RAW dropped)
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
 * POST /api/admin/gallery/events/:id/recount
 * Sync photoCount from actual GalleryPhoto records (fixes stale counts)
 */
router.post('/events/:id/recount', async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const actualCount = await GalleryPhoto.count({ where: { eventId: event.id } });
    await event.update({ photoCount: actualCount });
    logger.info(`[AdminGallery] Recount event ${event.id}: ${event.photoCount} → ${actualCount}`);
    return res.json({ success: true, event: { ...event.toJSON(), photoCount: actualCount }, previous: event.photoCount, actual: actualCount });
  } catch (err) {
    logger.error('[AdminGallery] Recount error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to recount photos' });
  }
});

/**
 * DELETE /api/admin/gallery/events/:id/photos
 * Delete ALL photos for an event (clean slate) — keeps the event itself
 */
router.delete('/events/:id/photos', async (req, res) => {
  try {
    const event = await GalleryEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    // Delete associated records first (FK constraints)
    const [[countRow]] = await sequelize.query(
      'SELECT COUNT(*) as count FROM gallery_photos WHERE event_id = :eventId',
      { replacements: { eventId: event.id } }
    );
    const photoCount = parseInt(countRow.count, 10);

    if (photoCount > 0) {
      // Get all photo IDs for FK cleanup
      const [photoRows] = await sequelize.query(
        'SELECT id FROM gallery_photos WHERE event_id = :eventId',
        { replacements: { eventId: event.id } }
      );
      const photoIds = photoRows.map(r => r.id);

      // Delete FKs
      await EnhancementRequest.destroy({ where: { photoId: photoIds } });
      await PhotoVote.destroy({ where: { photoId: photoIds } });

      // Delete all photos
      await sequelize.query('DELETE FROM gallery_photos WHERE event_id = :eventId', {
        replacements: { eventId: event.id },
      });
    }

    // Reset count and cover photo
    await event.update({ photoCount: 0, coverPhotoId: null });
    logger.info(`[AdminGallery] Deleted all ${photoCount} photos from event ${event.id} (${event.name})`);
    return res.json({ success: true, message: `Deleted ${photoCount} photos`, deletedCount: photoCount });
  } catch (err) {
    logger.error('[AdminGallery] Delete all photos error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete photos' });
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

function createRawConversionTempPaths(prefix) {
  const safePrefix = String(prefix).replace(/[^a-z0-9-]/gi, '-').slice(0, 64) || 'raw';
  const tempDir = mkdtempSync(join(tmpdir(), `${safePrefix}-${randomBytes(8).toString('hex')}-`));
  return {
    tempDir,
    rawPath: join(tempDir, 'input.arw'),
    tiffPath: join(tempDir, 'input.tiff'),
    cleanup: () => {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* best-effort temp cleanup */ }
    },
  };
}

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

// Separate multer instance: disk storage, exactly 1 file, 25MB max (JPEG only)
const uploadSingle = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (req, file, cb) => cb(null, `upload-${Date.now()}-${randomBytes(8).toString('hex')}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
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
        ? 'Upload rejected. Check file size and upload field.'
        : 'File upload failed';
      logger.error('[AdminGallery] Single upload multer error:', err.message);
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
    // storeMaster: when true, keep an un-watermarked ORIGINAL for paid-print
    // fulfillment (Slice 3a). Default OFF so storage only doubles for galleries
    // the admin opts into print-selling (new-galleries-only — no back-fill).
    // Independent of the watermark flag: original_storage_key always holds the
    // pristine original so Slice 3c has one reliable source.
    const storeMaster = req.body.storeMaster === 'true';
    // sourceType removed — JPEG only workflow

    // Get next photo number
    const maxPhoto = await GalleryPhoto.max('photoNumber', { where: { eventId: event.id } });
    const photoNumber = (maxPhoto || 0) + 1;
    // Use original filename (without extension) so owner can look up source files
    const originalBaseName = file.originalname
      ? file.originalname.replace(/\.[^.]+$/, '')
      : `${event.slug.toUpperCase()}-${String(photoNumber).padStart(3, '0')}`;
    const displayName = originalBaseName;
    const storageKey = `gallery/${event.slug}/${photoNumber}.jpg`;
    // Un-watermarked master lives at an UNGUESSABLE private key. The public
    // watermarked object is at the guessable gallery/{slug}/{n}.jpg and the
    // bucket is public-readable via R2_PUBLIC_URL, so the master MUST NOT be
    // guessable or the paywall leaks — it is never turned into a public URL.
    const masterKey = storeMaster
      ? `gallery-originals/${event.slug}/${photoNumber}-${randomBytes(16).toString('hex')}.jpg`
      : null;

    // Reject RAW files — they should be exported from Lightroom as JPEG Q95 4000px before upload
    const RAW_EXT = /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw|tiff?)$/i;
    const isRaw = RAW_EXT.test(file.originalname || '');

    // File is on disk (multer diskStorage) — read path, not buffer
    const uploadedPath = file.path;
    const originalSize = file.size;
    let inputBuffer = null;

    const cleanupTemp = (...paths) => {
      for (const p of paths) {
        try { if (p && existsSync(p)) unlinkSync(p); } catch { /* best-effort temp cleanup */ }
      }
    };

    try {
      if (isRaw) {
        // ── RAW files are no longer accepted ──
        logger.warn(`[AdminGallery:Single] RAW file rejected: ${file.originalname} (${(originalSize / 1024 / 1024).toFixed(1)}MB)`);
        cleanupTemp(uploadedPath);
        return res.status(422).json({
          success: false,
          error: 'RAW files are not accepted. Please convert to JPEG before uploading.',
          hint: 'Export as JPEG Q95, sRGB, 4000px long edge from your editing software (Lightroom, Capture One, etc.). This produces 3-8MB files that look stunning on any screen and print beautifully up to 13×19".',
        });
      } else {
        // ── Standard image (JPEG/PNG/etc) ──
        const ext = extname(file.originalname || '').toLowerCase();
        const isJpeg = ext === '.jpg' || ext === '.jpeg';

        if (isJpeg) {
          // JPEG files: read directly without re-encoding — just watermark
          logger.info(`[AdminGallery:Single] JPEG file ${file.originalname} (${(originalSize / 1024 / 1024).toFixed(1)}MB) — skipping re-encode, watermark only`);
          try {
            inputBuffer = readFileSync(uploadedPath);
            logger.info(`[AdminGallery:Single] Read JPEG buffer: ${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB`);
          } catch (readErr) {
            logger.error(`[AdminGallery:Single] Failed to read JPEG ${file.originalname}: ${readErr.message}`);
            cleanupTemp(uploadedPath);
            return res.status(422).json({
              success: false,
              error: `Failed to read file ${file.originalname}: ${readErr.message}`,
            });
          }
        } else {
          // Non-JPEG (PNG, WebP, etc.): convert to JPEG via sharp
          logger.info(`[AdminGallery:Single] Non-JPEG file ${file.originalname} (${(originalSize / 1024 / 1024).toFixed(1)}MB) — converting to Q95 JPEG`);
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
        }
        cleanupTemp(uploadedPath);
      }
    } catch (outerErr) {
      logger.error(`[AdminGallery:Single] Unexpected error: ${outerErr.message}`);
      cleanupTemp(uploadedPath);
      throw outerErr;
    }

    // Capture the pristine original for the print master BEFORE watermarking and
    // before inputBuffer is freed. Stored privately at masterKey; never public.
    const masterBuffer = masterKey ? inputBuffer : null;

    // Apply watermark
    const processedBuffer = await applyWatermark(inputBuffer, { applyWatermark: enableWatermark });
    inputBuffer = null;

    // Generate thumbnail + medium variants
    const keys = variantKeys(storageKey);
    let variants = null;
    try {
      variants = await generateVariants(processedBuffer);
    } catch (variantErr) {
      logger.warn(`[AdminGallery:Single] Variant generation failed (non-fatal): ${variantErr.message}`);
    }

    // Upload to R2
    let r2Client = null;
    const R2_BUCKET = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    try {
      const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
      if (r2Configured) r2Client = getR2Client();
    } catch { /* R2 not available */ }

    const buildUrl = (key) => R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
      : `/api/serve-photo/${key}`;

    let url = '';
    let thumbUrl = '';
    let mediumUrl = '';
    let originalStorageKey = null;
    if (r2Client && R2_BUCKET) {
      // Upload full-size
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: processedBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      url = buildUrl(storageKey);

      // Store the un-watermarked master privately (opt-in print galleries only):
      // unguessable key + private cache headers, and never buildUrl()'d so it
      // cannot leak into any public response or the download-all zip.
      if (masterBuffer && masterKey) {
        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: masterKey,
          Body: masterBuffer,
          ContentType: 'image/jpeg',
          CacheControl: 'private, no-store',
        }));
        originalStorageKey = masterKey;
      }

      // Upload variants (thumb + medium)
      if (variants) {
        await Promise.all([
          r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: keys.thumbKey,
            Body: variants.thumb,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000, immutable',
          })),
          r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: keys.mediumKey,
            Body: variants.medium,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000, immutable',
          })),
        ]);
        thumbUrl = buildUrl(keys.thumbKey);
        mediumUrl = buildUrl(keys.mediumKey);
      } else {
        thumbUrl = url;
        mediumUrl = url;
      }
    } else {
      url = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
      thumbUrl = url;
      mediumUrl = url;
    }

    const metadata = {
      originalName: file.originalname,
      size: originalSize,
      processedSize: processedBuffer.length,
      mimetype: file.mimetype,
      watermarked: enableWatermark && isWatermarkAvailable(),
      uploadedAt: new Date().toISOString(),
      thumbSize: variants?.thumb?.length || null,
      mediumSize: variants?.medium?.length || null,
    };

    // Use raw SQL insert to avoid Sequelize referencing columns not yet migrated
    const [insertResult] = await sequelize.query(
      `INSERT INTO gallery_photos (event_id, photo_number, display_name, storage_key, thumbnail_key, url, thumbnail_url, original_filename, file_size, width, height, mime_type, metadata, original_storage_key, created_at, updated_at)
       VALUES (:eventId, :photoNumber, :displayName, :storageKey, :thumbnailKey, :url, :thumbnailUrl, :originalFilename, :fileSize, :width, :height, :mimeType, :metadata, :originalStorageKey, NOW(), NOW())
       RETURNING id, photo_number as "photoNumber", display_name as "displayName", url, thumbnail_url as "thumbnailUrl", width, height, file_size as "fileSize"`,
      {
        replacements: {
          eventId: event.id,
          photoNumber,
          displayName,
          storageKey,
          thumbnailKey: variants ? keys.thumbKey : storageKey,
          url,
          thumbnailUrl: thumbUrl,
          originalFilename: file.originalname,
          fileSize: processedBuffer.length,
          width: variants?.width || null,
          height: variants?.height || null,
          mimeType: 'image/jpeg',
          metadata: JSON.stringify(metadata),
          originalStorageKey: originalStorageKey ?? null,
        },
      }
    );
    const photo = insertResult[0];

    // Update event photo count
    const [[countRow]] = await sequelize.query('SELECT COUNT(*) as count FROM gallery_photos WHERE event_id = :eventId', { replacements: { eventId: event.id } });
    const totalPhotos = parseInt(countRow.count, 10);
    await event.update({ photoCount: totalPhotos });
    if (!event.coverPhotoId) await event.update({ coverPhotoId: photo.id });

    // Aggressively free memory
    const finalSize = processedBuffer.length;
    variants = null;
    if (global.gc) global.gc();

    logger.info(`[AdminGallery:Single] ✅ ${displayName} uploaded (${(finalSize / 1024 / 1024).toFixed(1)}MB, thumb+medium generated) for event ${event.slug}`);

    return res.json({
      success: true,
      photo: {
        id: photo.id,
        photoNumber: photo.photoNumber,
        displayName: photo.displayName,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        mediumUrl: photo.mediumUrl,
        fileSize: finalSize,
        width: photo.width,
        height: photo.height,
      },
      totalPhotoCount: totalPhotos,
    });
  } catch (err) {
    logger.error('[AdminGallery:Single] Upload error:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
    if (global.gc) global.gc();
    return res.status(500).json({ success: false, error: 'Upload failed' });
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
        ? 'Upload rejected. Check file size, upload count, and upload field.'
        : 'File upload failed';
      logger.error('[AdminGallery] Multer error:', err.message);
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
    // storeMaster: opt-in un-watermarked print master (Slice 3a); see upload-single.
    const storeMaster = req.body.storeMaster === 'true';

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
        // Use original filename (without extension) so owner can look up source files
        const originalBaseName = file.originalname
          ? file.originalname.replace(/\.[^.]+$/, '')
          : `${event.slug.toUpperCase()}-${String(photoNumber).padStart(3, '0')}`;
        const displayName = originalBaseName;
        const storageKey = `gallery/${event.slug}/${photoNumber}.jpg`;
        const masterKey = storeMaster
          ? `gallery-originals/${event.slug}/${photoNumber}-${randomBytes(16).toString('hex')}.jpg`
          : null;

        // Reject RAW files — must be exported from Lightroom as JPEG before upload
        const RAW_EXT = /\.(arw|cr2|cr3|nef|nrw|orf|raf|rw2|pef|srw|dng|raw|tiff?)$/i;
        const isRaw = RAW_EXT.test(file.originalname || '');
        if (isRaw) {
          logger.warn(`[AdminGallery] RAW file rejected in batch: ${file.originalname}`);
          throw new Error(`RAW files are not accepted. Please convert "${file.originalname}" to JPEG (Quality 95%, sRGB, 4000px long edge) before uploading.`);
        }
        const inputBuffer = file.buffer;
        // Capture the pristine original for the print master before we release
        // the source buffer (un-watermarked; stored privately, never public).
        const masterBuffer = masterKey ? inputBuffer : null;

        // Release original buffer to help GC
        file.buffer = null;

        // Apply watermark (SwanStudios logo + sswanstudios.com) before upload
        const processedBuffer = await applyWatermark(inputBuffer, {
          applyWatermark: enableWatermark,
        });

        // Generate thumbnail + medium variants
        const keys = variantKeys(storageKey);
        let variants = null;
        try {
          variants = await generateVariants(processedBuffer);
        } catch (variantErr) {
          logger.warn(`[AdminGallery] Variant generation failed (non-fatal) for ${file.originalname}: ${variantErr.message}`);
        }

        const buildUrl = (key) => R2_PUBLIC_URL
          ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
          : `/api/serve-photo/${key}`;

        let url = '';
        let thumbnailUrl = '';
        let mediumUrl = '';
        let originalStorageKey = null;

        if (r2Client && R2_BUCKET) {
          // Upload full-size watermarked photo to R2
          await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: storageKey,
            Body: processedBuffer,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000, immutable',
          }));

          url = buildUrl(storageKey);

          // Store the un-watermarked master privately (opt-in print galleries):
          // unguessable key, private cache headers, never buildUrl()'d.
          if (masterBuffer && masterKey) {
            await r2Client.send(new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: masterKey,
              Body: masterBuffer,
              ContentType: 'image/jpeg',
              CacheControl: 'private, no-store',
            }));
            originalStorageKey = masterKey;
          }

          // Upload variants (thumb + medium)
          if (variants) {
            await Promise.all([
              r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: keys.thumbKey,
                Body: variants.thumb,
                ContentType: 'image/jpeg',
                CacheControl: 'public, max-age=31536000, immutable',
              })),
              r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: keys.mediumKey,
                Body: variants.medium,
                ContentType: 'image/jpeg',
                CacheControl: 'public, max-age=31536000, immutable',
              })),
            ]);
            thumbnailUrl = buildUrl(keys.thumbKey);
            mediumUrl = buildUrl(keys.mediumKey);
          } else {
            thumbnailUrl = url;
            mediumUrl = url;
          }
        } else {
          url = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
          thumbnailUrl = url;
          mediumUrl = url;
        }

        const metadata = {
          originalName: file.originalname,
          size: file.size,
          processedSize: processedBuffer.length,
          mimetype: file.mimetype,
          watermarked: enableWatermark && isWatermarkAvailable(),
          uploadedAt: new Date().toISOString(),
          thumbSize: variants?.thumb?.length || null,
          mediumSize: variants?.medium?.length || null,
        };

        const photo = await GalleryPhoto.create({
          eventId: event.id,
          photoNumber,
          displayName,
          storageKey,
          thumbnailKey: variants ? keys.thumbKey : storageKey,
          url,
          thumbnailUrl,
          thumbKey: variants ? keys.thumbKey : null,
          mediumKey: variants ? keys.mediumKey : null,
          mediumUrl,
          originalFilename: file.originalname,
          fileSize: processedBuffer.length,
          width: variants?.width || null,
          height: variants?.height || null,
          mimeType: 'image/jpeg',
          originalStorageKey,
          metadata,
        });

        // Free variant buffers
        variants = null;

        uploaded.push({
          id: photo.id,
          photoNumber: photo.photoNumber,
          displayName: photo.displayName,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
          mediumUrl: photo.mediumUrl,
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
    return res.status(500).json({ success: false, error: 'Failed to upload photos' });
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
      // Use original filename (without extension) so owner can look up source files
      const originalBaseName = file.name
        ? file.name.replace(/\.[^.]+$/, '')
        : `${event.slug.toUpperCase()}-${String(photoNumber).padStart(3, '0')}`;
      const displayName = originalBaseName;
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
    return res.status(500).json({ success: false, error: 'Failed to generate upload URLs' });
  }
});

/**
 * Infrastructure endpoints below are ADMIN-ONLY. The router-level gate admits trainers
 * (they legitimately manage gallery events/photos), but bucket CORS configuration is
 * infrastructure with no trainer use case: /r2-cors-check leaks the bucket's CORS policy
 * and /setup-r2-cors mutates it. Privilege separation — trainers don't touch infra.
 */
const galleryAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/admin/gallery/r2-cors-check
 * Diagnostic: tests R2 CORS configuration by checking bucket CORS rules.
 */
router.get('/r2-cors-check', galleryAdminOnly, async (req, res) => {
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
    logger.error('[AdminGallery] R2 CORS check error:', err.message);
    return res.json({ success: false, error: 'Failed to check R2 CORS configuration', code: 'R2_CORS_CHECK_FAILED' });
  }
});

/**
 * POST /api/admin/gallery/setup-r2-cors
 * Apply CORS rules to R2 bucket so browser can upload directly via presigned URLs.
 */
router.post('/setup-r2-cors', galleryAdminOnly, async (req, res) => {
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
    return res.json({ success: false, error: 'Failed to apply R2 CORS configuration', code: 'R2_CORS_SETUP_FAILED' });
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
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      const dcraw = (await import('dcrawr')).default || (await import('dcrawr'));
      const dcrawPath = typeof dcraw === 'string' ? dcraw : dcraw.path || dcraw;

      const tempPaths = createRawConversionTempPaths(`reprocess-${photo.id}`);
      try {
        // Write RAW to a private temp directory for this conversion.
        writeFileSync(tempPaths.rawPath, rawBuf);
        rawBuf = null;

        // dcraw -T (TIFF output) -w (camera white balance) -o 1 (sRGB)
        try {
          await execFileAsync(dcrawPath, ['-T', '-w', '-o', '1', tempPaths.rawPath], { timeout: 120000 });
        } catch (dcrawErr) {
          throw new Error(`dcraw conversion failed: ${dcrawErr.message}`);
        }

        // Read TIFF output and pipe through sharp
        const tiffBuf = readFileSync(tempPaths.tiffPath);
        jpegBuf = await sharp(tiffBuf, { limitInputPixels: false })
          .jpeg({ quality: 95 })
          .toBuffer();
      } finally {
        tempPaths.cleanup();
      }
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
    return res.status(500).json({ success: false, error: 'Failed to reprocess photo' });
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
                const { execFile } = await import('child_process');
                const { promisify } = await import('util');
                const execFileAsync = promisify(execFile);
                const dcraw = (await import('dcrawr')).default || (await import('dcrawr'));
                const dcrawPath = typeof dcraw === 'string' ? dcraw : dcraw.path || dcraw;

                const tempPaths = createRawConversionTempPaths(`bg-${bgPhotoId}`);
                try {
                  writeFileSync(tempPaths.rawPath, rawBuf);
                  rawBuf = null;

                  await execFileAsync(dcrawPath, ['-T', '-w', '-o', '1', tempPaths.rawPath], { timeout: 120000 });

                  const tiffBuf = readFileSync(tempPaths.tiffPath);
                  jpegBuf = await sharp(tiffBuf, { limitInputPixels: false })
                    .jpeg({ quality: 95 })
                    .toBuffer();
                } finally {
                  tempPaths.cleanup();
                }
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
    return res.status(500).json({ success: false, error: 'Failed to confirm uploads' });
  }
});

/**
 * GET /api/admin/gallery/events/:id/photos
 * List photos with enhancement stats
 */
router.get('/events/:id/photos', async (req, res) => {
  try {
    // Use raw SQL to avoid Sequelize referencing columns not yet migrated
    const [photos] = await sequelize.query(
      `SELECT id, photo_number as "photoNumber", display_name as "displayName", url,
              thumbnail_url as "thumbnailUrl", width, height, file_size as "fileSize",
              enhanced_url as "enhancedUrl", enhancement_request_count as "enhancementRequestCount",
              created_at as "createdAt"
       FROM gallery_photos WHERE event_id = :eventId ORDER BY photo_number ASC`,
      { replacements: { eventId: req.params.id } }
    );
    return res.json({ success: true, photos });
  } catch (err) {
    logger.error('[AdminGallery] List photos error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list photos' });
  }
});

/**
 * GET /api/admin/gallery/photos/:photoId/original-url
 * Return a short-lived presigned GET URL for the un-watermarked print MASTER
 * (Slice 3a). Admin|trainer-gated (inherited from router.use above). The master
 * key is private + unguessable and is NEVER exposed as a public URL — this is
 * the only delivery path, for admin fulfillment and (Slice 3c) the print lab.
 * 404 when the photo has no stored master (gallery not opted into print-selling).
 */
router.get('/photos/:photoId/original-url', async (req, res) => {
  try {
    const photoId = parseInt(req.params.photoId, 10);
    if (!Number.isInteger(photoId) || photoId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid photo id' });
    }

    const [rows] = await sequelize.query(
      'SELECT id, original_storage_key AS "originalStorageKey" FROM gallery_photos WHERE id = :photoId',
      { replacements: { photoId } }
    );
    const photoRow = rows?.[0];
    if (!photoRow) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }
    if (!photoRow.originalStorageKey) {
      return res.status(404).json({ success: false, error: 'No print master stored for this photo' });
    }

    const { r2Configured, generateGalleryOriginalUrl } = await import('../services/r2StorageService.mjs');
    if (!r2Configured) {
      return res.status(503).json({ success: false, error: 'Object storage is not configured' });
    }

    const expiresInSeconds = 900;
    const url = await generateGalleryOriginalUrl(photoRow.originalStorageKey, { expiresInSeconds });
    return res.json({ success: true, url, expiresInSeconds });
  } catch (err) {
    logger.error('[AdminGallery] original-url failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to generate print-master URL' });
  }
});

/**
 * POST /api/admin/gallery/print-orders/:orderId/retry-fulfillment
 * Manually (re)submit a paid print order to the print lab (Slice 3c). Admin|trainer
 * gated (inherited). Idempotent + fail-closed via the fulfillment service (a stuck
 * 'paid' order — provider outage, missing SKU/master — is retryable from the admin view).
 */
router.post('/print-orders/:orderId/retry-fulfillment', galleryAdminOnly, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid order id' });
    }
    const { submitToProvider } = await import('../services/print/printFulfillmentService.mjs');
    const result = await submitToProvider(orderId, { source: 'admin_retry' });
    return res.json({ success: !!result.ok, result });
  } catch (err) {
    logger.error('[AdminGallery] retry-fulfillment failed:', err.message);
    return res.status(500).json({ success: false, error: 'Fulfillment retry failed' });
  }
});

/**
 * GET /api/admin/gallery/print-orders?status=<enum>
 * Admin fulfillment view (Slice 3d): list print orders with buyer/photo/event context.
 * Admin|trainer gated (inherited). Full rows (shipping address + commission) are for staff.
 */
router.get('/print-orders', async (req, res) => {
  try {
    const VALID = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    const status = typeof req.query.status === 'string' && VALID.includes(req.query.status) ? req.query.status : null;
    const isAdmin = req.user?.role === 'admin';
    const orders = await PrintOrder.findAll({
      where: status ? { status } : undefined,
      // Trainers can fulfill orders but must not see SwanStudios' internal margin.
      attributes: isAdmin ? undefined : { exclude: ['commissionUsd'] },
      include: [
        { model: GalleryVisitor, as: 'visitor', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: GalleryPhoto, as: 'photo', attributes: ['id', 'photoNumber', 'displayName', 'thumbnailUrl'] },
        { model: GalleryEvent, as: 'event', attributes: ['id', 'name', 'slug'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    return res.json({ success: true, orders });
  } catch (err) {
    logger.error('[AdminGallery] list print-orders failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list print orders' });
  }
});

/**
 * POST /api/admin/gallery/print-orders/:orderId/mark-shipped  { trackingNumber? }
 * Manual admin mark-shipped (manually-fulfilled orders or an override). Idempotent —
 * only advances a non-terminal order; never regresses shipped/delivered/cancelled.
 */
router.post('/print-orders/:orderId/mark-shipped', galleryAdminOnly, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid order id' });
    }
    const trackingNumber = typeof req.body?.trackingNumber === 'string'
      ? req.body.trackingNumber.trim().slice(0, 255) || null
      : null;
    const [row] = await sequelize.query(
      `UPDATE print_orders
         SET status='shipped', tracking_number=COALESCE(:tn, tracking_number),
             shipped_at=COALESCE(shipped_at, NOW()), updated_at=NOW()
       WHERE id=:id AND status IN ('paid','processing')
       RETURNING id`,
      { replacements: { id: orderId, tn: trackingNumber }, type: sequelize.QueryTypes.SELECT }
    );
    if (!row) {
      return res.status(409).json({ success: false, error: 'Order is not in a shippable state (already shipped/delivered/cancelled, or not found)' });
    }
    logger.info('[AdminGallery] print order %d manually marked shipped by user %s', orderId, req.user?.id);
    return res.json({ success: true, orderId, status: 'shipped', trackingNumber });
  } catch (err) {
    logger.error('[AdminGallery] mark-shipped failed:', err.message);
    return res.status(500).json({ success: false, error: 'Mark-shipped failed' });
  }
});

/**
 * POST /api/admin/gallery/print-orders/:orderId/refund
 * Manual Stripe refund (Sean's v1 decision) → status='cancelled'. Idempotent via a stable
 * Stripe idempotency key (a double-click never double-refunds). Server-side PI resolution
 * (never trusts client). NOTE: does NOT auto-cancel a Prodigi order already in production —
 * the admin handles provider cancellation separately if the order already shipped.
 */
router.post('/print-orders/:orderId/refund', galleryAdminOnly, async (req, res) => {
  try {
    // Refunds move real money — admin only (the file gate allows trainers for operational
    // routes, but a financial reversal is not a trainer capability).
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Refunds require admin access' });
    }
    const orderId = parseInt(req.params.orderId, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid order id' });
    }
    const order = await PrintOrder.findByPk(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status === 'cancelled') return res.status(409).json({ success: false, error: 'Order already cancelled/refunded' });
    if (order.status === 'pending') return res.status(409).json({ success: false, error: 'Order was never paid — nothing to refund' });
    if (!order.stripeSessionId) return res.status(409).json({ success: false, error: 'No Stripe session recorded on this order' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    // Resolve the PaymentIntent from the Checkout Session server-side (never trust client).
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id || null);
    if (!paymentIntentId) return res.status(409).json({ success: false, error: 'No captured payment to refund' });

    // Stable idempotency key → a double-click / retry returns the same refund, never a second.
    await stripe.refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `print-refund:${order.id}` }
    );

    await sequelize.query(
      `UPDATE print_orders SET status='cancelled', updated_at=NOW() WHERE id=:id AND status <> 'cancelled'`,
      { replacements: { id: order.id } }
    );

    logger.info('[AdminGallery] print order %d refunded (PI %s) by user %s', order.id, paymentIntentId, req.user?.id);
    return res.json({ success: true, orderId: order.id, status: 'cancelled' });
  } catch (err) {
    logger.error('[AdminGallery] refund failed:', err.message);
    return res.status(500).json({ success: false, error: 'Refund failed' });
  }
});

/**
 * DELETE /api/admin/gallery/photos/:photoId
 * Delete an individual photo from an event
 */
router.delete('/photos/:photoId', galleryAdminOnly, async (req, res) => {
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
    return res.status(500).json({ success: false, error: 'Failed to delete photo' });
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

    const photoId = req.query.photo ? parseInt(req.query.photo, 10) : null;

    // Find photos to check
    const whereClause = [];
    const replacements = {};
    if (photoId) {
      whereClause.push('gp.id = :photoId');
      replacements.photoId = photoId;
    }
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
      let repairTempPaths = null;
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

        // Download to temp file (streaming to disk to avoid OOM on 120MB+ RAW files)
        // Use .arw extension so dcraw can identify Sony RAW format
        repairTempPaths = createRawConversionTempPaths(`repair-${id}`);
        const tempRawPath = repairTempPaths.rawPath;
        logger.info(`[RepairRAW] Streaming ${storage_key} (${(r2Size / 1024 / 1024).toFixed(1)}MB) to disk...`);
        const getResp = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: storage_key }));
        const { createWriteStream } = await import('fs');
        const { pipeline } = await import('stream/promises');
        await pipeline(getResp.Body, createWriteStream(tempRawPath));
        logger.info(`[RepairRAW] Downloaded to ${tempRawPath}`);

        // Convert to JPEG — try dcraw first, then sharp as fallback
        let jpegBuffer;
        const dcrawPaths = [
          join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'dcraw-vendored-linux', 'dcraw'),
          join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'dcraw-vendored-win32', 'dcraw.exe'),
        ];
        const dcrawPath = dcrawPaths.find(p => existsSync(p));
        let dcrawWorked = false;

        if (dcrawPath) {
          try {
            logger.info(`[RepairRAW] Trying dcraw: ${dcrawPath}`);
            try { chmodSync(dcrawPath, 0o755); } catch { /* best-effort executable bit */ }
            execFileSync(dcrawPath, ['-T', '-w', '-q', '3', '-o', '1', tempRawPath], { timeout: 180000 });
            const tiffPath = repairTempPaths.tiffPath;
            if (existsSync(tiffPath)) {
              jpegBuffer = await sharp(tiffPath, { limitInputPixels: false })
                .resize(4000, 4000, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 92 })
                .toBuffer();
              dcrawWorked = true;
            }
          } catch (dcErr) {
            logger.warn(`[RepairRAW] dcraw failed for photo ${id}: ${dcErr.message}, trying sharp...`);
            // Clean up any tiff
            try { unlinkSync(repairTempPaths.tiffPath); } catch { /* best-effort temp cleanup */ }
          }
        }

        if (!dcrawWorked) {
          try {
            // Sharp fallback — libvips can handle some RAW formats
            logger.info(`[RepairRAW] Trying sharp directly on ${tempRawPath}`);
            jpegBuffer = await sharp(tempRawPath, { limitInputPixels: false })
              .resize(4000, 4000, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 92 })
              .toBuffer();
          } catch (sharpErr) {
            repairTempPaths.cleanup();
            throw new Error(`Both dcraw and sharp failed. dcraw may not support this RAW format. sharp: ${sharpErr.message}`);
          }
        }

        // Clean up temp raw file
        repairTempPaths.cleanup();

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
        repairTempPaths?.cleanup();
        logger.error(`[RepairRAW] Error on photo ${id}: ${err.message}`);
        results.push({ id, display_name, storage_key, status: 'error', error: 'Repair failed for this photo' });
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
    return res.status(500).json({ success: false, error: 'Repair failed' });
  }
});

// ── Reset Test Data (Super Admin Only) ──────────────────────────────────────
/**
 * POST /api/admin/gallery/reset-test-data
 * Clears all gallery test data: donations, visitors, referrals, messages, enhancement requests.
 * Does NOT delete events or photos (those are real content).
 * Uses DELETE FROM (not TRUNCATE) to respect FK constraints.
 */
router.post('/reset-test-data', async (req, res) => {
  try {
    // Fail-closed env guard: this DELETEs ALL gallery visitor/donation/referral/message rows (real CRM + PII),
    // so it is DISABLED unless explicitly opted in on a non-production environment (survey 2026-07-22, Kimi fix #4).
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_GALLERY_TEST_RESET !== 'true') {
      logger.warn(`[ResetTestData] blocked by env guard (nodeEnv=${process.env.NODE_ENV})`);
      return res.status(403).json({ success: false, error: 'Disabled in this environment' });
    }
    // Extra safety: admin-only (already enforced by middleware, but double-check)
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Super admin access required' });
    }
    // Typed confirmation token so a stray/misfired POST cannot wipe the tables.
    if (req.body?.confirm !== 'RESET_GALLERY_TEST_DATA') {
      return res.status(400).json({ success: false, error: 'Confirmation token required' });
    }

    // Audit with actor id only — never the email (Rule 8 / survey #7b PII-in-logs).
    logger.warn(`[AUDIT] gallery test-data reset by admin id=${req.user.id} at ${new Date().toISOString()}`);

    const results = {};

    // Delete in order that respects potential FK relationships
    const tables = [
      { model: GalleryDonation, name: 'gallery_donations' },
      { model: GalleryReferral, name: 'gallery_referrals' },
      { model: EnhancementRequest, name: 'enhancement_requests' },
      { model: GalleryMessage, name: 'gallery_messages' },
      { model: PhotoVote, name: 'photo_votes' },
      { model: GalleryVisitor, name: 'gallery_visitors' },
    ];

    for (const { model, name } of tables) {
      if (model) {
        const count = await model.destroy({ where: {}, truncate: false });
        results[name] = count;
        logger.info(`[ResetTestData] Deleted ${count} rows from ${name}`);
      } else {
        results[name] = 'model not available';
      }
    }

    console.warn(`[AUDIT] Gallery test data reset complete:`, JSON.stringify(results));

    return res.json({
      success: true,
      message: 'Gallery test data has been reset',
      deleted: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[ResetTestData] Error:', err.message, err.stack);
    return res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

export default router;
