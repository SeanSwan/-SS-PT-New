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
import { PutObjectCommand } from '@aws-sdk/client-s3';
import GalleryEvent from '../models/GalleryEvent.mjs';
import GalleryPhoto from '../models/GalleryPhoto.mjs';
import GalleryVisitor from '../models/GalleryVisitor.mjs';
import EnhancementRequest from '../models/EnhancementRequest.mjs';
import GalleryDonation from '../models/GalleryDonation.mjs';
import GalleryReferral from '../models/GalleryReferral.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import { applyWatermark, isWatermarkAvailable } from '../services/watermarkService.mjs';
import logger from '../utils/logger.mjs';

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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }, // 25MB per file, 10 files max per batch
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
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

// ── Photo Upload ──────────────────────────────────────────────────────────

/**
 * POST /api/admin/gallery/events/:id/upload
 * Bulk upload photos (up to 50 at a time)
 */
router.post('/events/:id/upload', upload.array('photos', 50), async (req, res) => {
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

        // Apply watermark (SwanStudios logo + sswanstudios.com) before upload
        const processedBuffer = await applyWatermark(file.buffer, {
          applyWatermark: enableWatermark,
        });

        // Release original buffer to help GC
        file.buffer = null;

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
        });

        uploaded.push({
          id: photo.id,
          photoNumber: photo.photoNumber,
          displayName: photo.displayName,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
        });

        logger.info(`[AdminGallery] Uploaded ${displayName} for event ${event.slug}`);
      } catch (photoErr) {
        logger.error(`[AdminGallery] Failed to process photo ${file.originalname}: ${photoErr.message}`);
        errors.push({ file: file.originalname, error: photoErr.message });
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
    logger.error('[AdminGallery] Upload error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to upload photos' });
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
    const photo = await GalleryPhoto.findByPk(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, error: 'Photo not found' });

    const eventId = photo.eventId;

    // Delete associated enhancement requests first
    await EnhancementRequest.destroy({ where: { photoId: photo.id } });

    // Delete the photo record
    await photo.destroy();

    // Update event photo count
    const remaining = await GalleryPhoto.count({ where: { eventId } });
    await GalleryEvent.update({ photoCount: remaining }, { where: { id: eventId } });

    logger.info(`[AdminGallery] Deleted photo ${req.params.photoId} from event ${eventId}`);
    return res.json({ success: true, message: 'Photo deleted', remainingCount: remaining });
  } catch (err) {
    logger.error('[AdminGallery] Delete photo error:', err.message);
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
    const { Op } = await import('sequelize');
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

export default router;
