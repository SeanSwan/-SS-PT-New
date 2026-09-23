/**
 * Gallery Routes (Public + Admin Maintenance)
 * =======================
 * Public-facing endpoints for the photo gallery & lead generation system.
 * Gallery access uses its own short-lived JWT; admin maintenance routes still
 * require the normal SwanStudios JWT + admin role.
 *
 * Endpoints:
 *   GET    /api/gallery/events              — List published events
 *   GET    /api/gallery/events/:slug        — Get event details (no photos)
 *   POST   /api/gallery/events/:slug/access — Email + password → gallery access token
 *   GET    /api/gallery/events/:slug/photos — Get photos (requires gallery token)
 *   GET    /api/gallery/photos/:id/download — Download full-res photo
 *   POST   /api/gallery/enhancement-request — Submit enhancement request (3 free/event, then credits)
 *   GET    /api/gallery/credits             — Get current credit status
 *   POST   /api/gallery/purchase-credits    — Purchase enhancement credits via Stripe
 *   POST   /api/gallery/donation            — Create optional Stripe donation session
 *   POST   /api/gallery/donation/zelle-confirm — Mark Zelle sent (admin verifies later)
 *   POST   /api/gallery/referral            — Submit optional referral (awards 5 credits)
 *   POST   /api/gallery/vip-signup          — Create user account for VIP conversion
 *   POST   /api/gallery/vip-login           — Login existing user for VIP conversion
 *   POST   /api/gallery/vip-checkout        — Create Stripe Checkout for $175 VIP PT session
 *   POST   /api/gallery/vip-activate        — Activate VIP status after successful payment
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import GalleryEvent from '../models/GalleryEvent.mjs';
import GalleryPhoto from '../models/GalleryPhoto.mjs';
import GalleryVisitor from '../models/GalleryVisitor.mjs';
import EnhancementRequest from '../models/EnhancementRequest.mjs';
import GalleryDonation from '../models/GalleryDonation.mjs';
import GalleryReferral from '../models/GalleryReferral.mjs';
import PhotoVote from '../models/PhotoVote.mjs';
import GalleryMessage from '../models/GalleryMessage.mjs';
import Lead from '../models/Lead.mjs';
import LeadActivity from '../models/LeadActivity.mjs';
import PrintOrder from '../models/PrintOrder.mjs';
import { analyzeForm } from '../services/formAnalysisService.mjs';
import { getUser } from '../models/index.mjs';
import { createAdminNotification } from '../controllers/notificationController.mjs';
import { getClientIp, lookupGeo } from '../services/geoIpService.mjs';
import { Op, fn, col, literal } from 'sequelize';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import {
  buildWindowedStripeIdempotencyKey,
} from '../utils/stripeIdempotency.mjs';
import {
  buildGalleryPrintAttemptKey,
  claimIdempotentRecord,
} from '../utils/paymentIdempotency.mjs';
import { fulfillGalleryVipSession } from '../services/galleryVipFulfillmentService.mjs';
import {
  classifyStripeCheckoutSessionError,
  validateCheckoutSessionId,
} from '../utils/stripeCheckoutSessionErrors.mjs';
import { getJwtSecret, isJwtSecretConfigurationError } from '../utils/jwtSecretGuard.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import archiver from 'archiver';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getLegacyDefaultStripeClient } from '../utils/stripeClient.mjs';

const router = express.Router();

const GALLERY_TOKEN_TTL = '24h';

function signSwanAccessToken(userId, role) {
  return jwt.sign(
    { id: userId, role, tokenType: 'access', tokenId: uuidv4() },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '3h' }
  );
}

// Rate limiter for access endpoint (prevent brute-force password guessing)
const accessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many access attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for downloads
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200,
  message: { success: false, error: 'Download limit reached. Please try again later.' },
});

// Tighter limiter for full-gallery ZIP downloads (each request streams the whole
// event through the server). Keyed per-visitor (auth runs first, so the token's
// visitorId is always present) so one client can't be blocked by a shared IP.
const downloadAllLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  message: { success: false, error: 'Too many full-gallery downloads. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ga_${req.galleryAccess?.visitorId ?? 'anon'}`,
});

/**
 * Middleware: Verify gallery access token
 */
function requireGalleryAccess(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Gallery access required. Please enter your email and event password.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (decoded.type !== 'gallery_access') {
      return res.status(403).json({ success: false, error: 'Invalid gallery token' });
    }
    req.galleryAccess = decoded; // { type, visitorId, eventId, email, slug }
    next();
  } catch (error) {
    if (isJwtSecretConfigurationError(error)) {
      logger.error('[Gallery] JWT secret is not configured for gallery access');
      return res.status(500).json({ success: false, error: 'Gallery access is not configured' });
    }

    return res.status(401).json({ success: false, error: 'Gallery access expired. Please re-enter your email and event password.' });
  }
}

// ── Public Event Listing ──────────────────────────────────────────────────

/**
 * GET /api/gallery/events
 * List published events (public, no auth)
 */
router.get('/events', async (req, res) => {
  try {
    const events = await GalleryEvent.findAll({
      where: { isPublished: true },
      attributes: ['id', 'name', 'slug', 'sport', 'eventDate', 'location', 'photoCount', 'description', 'coverPhotoId', 'createdAt'],
      order: [['eventDate', 'DESC'], ['createdAt', 'DESC']],
      include: [{
        model: GalleryPhoto,
        as: 'coverPhoto',
        attributes: ['thumbnailUrl', 'url'],
        required: false,
      }],
    });

    // For events without a coverPhotoId, batch-fetch first photos (2 queries total, not N+1)
    const eventsMissingCover = events.filter(e => !e.coverPhotoId);
    const fallbackCovers = {};
    if (eventsMissingCover.length > 0) {
      const eventIds = eventsMissingCover.map(e => e.id);
      const firstPhotos = await GalleryPhoto.findAll({
        where: { eventId: eventIds },
        attributes: ['eventId', 'thumbnailUrl', 'url'],
        order: [['photoNumber', 'ASC']],
      });
      for (const photo of firstPhotos) {
        if (!fallbackCovers[photo.eventId]) {
          fallbackCovers[photo.eventId] = photo;
        }
      }
    }

    const eventsWithCovers = events.map(event => {
      const plain = event.toJSON();
      if (plain.coverPhoto) {
        plain.coverPhotoUrl = plain.coverPhoto.thumbnailUrl || plain.coverPhoto.url || null;
      } else {
        const fb = fallbackCovers[plain.id];
        plain.coverPhotoUrl = fb?.thumbnailUrl || fb?.url || null;
      }
      delete plain.coverPhoto;
      return plain;
    });

    return res.json({ success: true, events: eventsWithCovers });
  } catch (err) {
    logger.error('[Gallery] List events error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load events' });
  }
});

/**
 * GET /api/gallery/events/:slug
 * Get event details (public, no photos returned)
 */
router.get('/events/:slug', async (req, res) => {
  try {
    const event = await GalleryEvent.findOne({
      where: { slug: req.params.slug, isPublished: true },
      attributes: ['id', 'name', 'slug', 'sport', 'eventDate', 'location', 'photoCount', 'description', 'createdAt'],
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    return res.json({ success: true, event });
  } catch (err) {
    logger.error('[Gallery] Get event error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load event' });
  }
});

// ── Email + Password Access Gate ──────────────────────────────────────────

/**
 * POST /api/gallery/events/:slug/access
 * Verify event password + capture email → return gallery access JWT
 */
router.post('/events/:slug/access', accessLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, newsletterOptIn, parentalConsent } = req.body;

    // Validate email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Event password is required' });
    }

    const event = await GalleryEvent.findOne({
      where: { slug: req.params.slug, isPublished: true },
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Verify password (hashed with bcrypt)
    const passwordValid = await bcrypt.compare(password.trim(), event.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Incorrect event password' });
    }

    // Upsert visitor record (same email + event = same visitor)
    const cleanEmail = email.trim().toLowerCase();
    const visitorIp = getClientIp(req);
    const [visitor, visitorCreated] = await GalleryVisitor.findOrCreate({
      where: { email: cleanEmail, eventId: event.id },
      defaults: {
        email: cleanEmail,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        phone: phone?.trim() || null,
        eventId: event.id,
        newsletterOptIn: newsletterOptIn !== false,
        parentalConsent: parentalConsent === true,
        source: 'gallery',
        ipAddress: visitorIp,
      },
    });

    // Update IP + geo on every access (async, non-blocking)
    (async () => {
      try {
        const geo = await lookupGeo(visitorIp);
        const updateFields = { ipAddress: visitorIp };
        if (geo) {
          Object.assign(updateFields, {
            country: geo.country,
            countryCode: geo.countryCode,
            region: geo.region,
            city: geo.city,
            lat: geo.lat,
            lon: geo.lon,
          });
        }
        await visitor.update(updateFields);
      } catch { /* non-blocking */ }
    })();

    // ── Auto-create Lead from gallery visitor (CRM funnel) ──
    try {
      const [lead, leadCreated] = await Lead.findOrCreate({
        where: { email: cleanEmail },
        defaults: {
          email: cleanEmail,
          firstName: visitor.firstName || firstName?.trim() || null,
          lastName: visitor.lastName || lastName?.trim() || null,
          phone: visitor.phone || phone?.trim() || null,
          source: 'gallery',
          sourceDetail: `${event.name} (${event.slug})`,
          status: 'new',
          score: 10, // Base score for gallery access
          galleryVisitorId: visitor.id,
        },
      });
      if (leadCreated) {
        await LeadActivity.create({
          leadId: lead.id,
          type: 'status_change',
          performedByAI: true,
          title: 'Lead auto-created from gallery access',
          description: `Visitor registered for event "${event.name}"`,
          metadata: { from: null, to: 'new', eventSlug: event.slug },
        });
        logger.info(`[Gallery:CRM] Auto-created lead id=${lead.id} from visitor=${visitor.id}`);
      } else if (!lead.galleryVisitorId) {
        // Link existing lead to this visitor
        await lead.update({ galleryVisitorId: visitor.id });
      }
    } catch (leadErr) {
      // Non-blocking — don't fail access if lead creation fails. No email in logs (Rule 8 / survey #7b).
      logger.warn(`[Gallery:CRM] Lead auto-create failed (visitor=${visitor?.id ?? 'n/a'}): ${leadErr.message}`);
    }

    // Issue gallery access token (24h)
    const galleryToken = jwt.sign(
      {
        type: 'gallery_access',
        visitorId: visitor.id,
        eventId: event.id,
        email: cleanEmail,
        slug: event.slug,
      },
      getJwtSecret(),
      { expiresIn: GALLERY_TOKEN_TTL }
    );

    return res.json({
      success: true,
      token: galleryToken,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        sport: event.sport,
        eventDate: event.eventDate,
        location: event.location,
        photoCount: event.photoCount,
        description: event.description || null,
      },
      visitor: {
        id: visitor.id,
        email: visitor.email,
      },
    });
  } catch (err) {
    logger.error('[Gallery] Access gate error:', err.message, err.stack);
    return res.status(500).json({ success: false, error: 'Failed to verify access' });
  }
});

// ── Photos (Requires Gallery Access) ──────────────────────────────────────

/**
 * GET /api/gallery/events/:slug/photos
 * Get all photos for an event (requires gallery access token)
 */
router.get('/events/:slug/photos', requireGalleryAccess, async (req, res) => {
  try {
    if (req.galleryAccess.slug !== req.params.slug) {
      return res.status(403).json({ success: false, error: 'Access token does not match this event' });
    }

    const [photos] = await sequelize.query(
      `SELECT id, photo_number as "photoNumber", display_name as "displayName", url,
              thumbnail_url as "thumbnailUrl", medium_url as "mediumUrl", width, height,
              enhanced_url as "enhancedUrl", enhancement_request_count as "enhancementRequestCount"
       FROM gallery_photos WHERE event_id = :eventId ORDER BY photo_number ASC`,
      { replacements: { eventId: req.galleryAccess.eventId } }
    );

    // Slice 3f: the client "Order prints" storefront is flag-gated OFF until the whole
    // print chain (masters + webhook + Prodigi + tax) is verified. Flip PRINT_STOREFRONT_ENABLED.
    return res.json({ success: true, photos, printStorefrontEnabled: process.env.PRINT_STOREFRONT_ENABLED === 'true' });
  } catch (err) {
    logger.error('[Gallery] Get photos error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load photos' });
  }
});

/**
 * GET /api/gallery/photos/:id/download
 * Download full-res photo (requires gallery access)
 */
router.get('/photos/:id/download', downloadLimiter, requireGalleryAccess, async (req, res) => {
  try {
    const photo = await GalleryPhoto.findByPk(req.params.id, {
      attributes: ['id', 'eventId', 'url', 'displayName', 'mimeType'],
    });

    if (!photo || photo.eventId !== req.galleryAccess.eventId) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    // Redirect to the photo URL for download
    return res.json({
      success: true,
      downloadUrl: photo.url,
      filename: `${photo.displayName}.jpg`,
    });
  } catch (err) {
    logger.error('[Gallery] Download error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to download photo' });
  }
});

/**
 * GET /api/gallery/events/:slug/download-all
 * Stream every photo in the event as a single ZIP (requires gallery access).
 * Streams one R2 object at a time to keep memory flat on Render; JPEGs are
 * STORED (level 0 — already compressed). ALL guards run BEFORE any bytes/headers
 * are written, because once the zip stream starts a JSON error can't be sent.
 * The bytes served are the same watermarked storage_key objects the single
 * download serves — no un-watermarked path is introduced.
 * Auth runs before the limiter so unauthenticated hits don't burn the budget.
 */
router.get('/events/:slug/download-all', requireGalleryAccess, downloadAllLimiter, async (req, res) => {
  if (req.galleryAccess.slug !== req.params.slug) {
    return res.status(403).json({ success: false, error: 'Access token does not match this event' });
  }

  let photos;
  try {
    [photos] = await sequelize.query(
      `SELECT photo_number as "photoNumber", display_name as "displayName", storage_key as "storageKey"
       FROM gallery_photos WHERE event_id = :eventId ORDER BY photo_number ASC`,
      { replacements: { eventId: req.galleryAccess.eventId } }
    );
  } catch (err) {
    logger.error('[Gallery] download-all query error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load photos' });
  }

  if (!photos || photos.length === 0) {
    return res.status(404).json({ success: false, error: 'No photos to download' });
  }

  // R2 must be configured to stream originals (local dev may use data: URIs).
  let r2Client;
  try {
    const { getR2Client, r2Configured } = await import('../services/r2StorageService.mjs');
    if (!r2Configured) {
      return res.status(503).json({ success: false, error: 'Photo storage is not configured for downloads' });
    }
    r2Client = getR2Client();
  } catch (err) {
    logger.error('[Gallery] download-all R2 init error:', err.message);
    return res.status(503).json({ success: false, error: 'Photo storage is unavailable' });
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const zipName = `${req.params.slug}-photos.zip`;

  // ── From here on bytes may flow — no more JSON responses. ──
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { store: true });
  let aborted = false;

  archive.on('warning', (err) => logger.warn('[Gallery] download-all archive warning:', err?.message));
  archive.on('error', (err) => {
    logger.error('[Gallery] download-all archive error:', err?.message);
    aborted = true;
    if (!res.writableEnded) res.destroy(err);
  });

  // Client disconnected mid-stream — stop reading R2 and tear down.
  res.on('close', () => {
    if (!res.writableEnded) {
      aborted = true;
      archive.destroy();
    }
  });

  archive.pipe(res);

  const usedNames = new Set();
  let added = 0;

  for (const photo of photos) {
    if (aborted) break;
    if (!photo.storageKey) continue;

    const safeName = String(photo.displayName || 'photo')
      .replace(/[\\/:*?"<>| -]/g, '_')
      .slice(0, 120);
    let entryName = `${String(photo.photoNumber).padStart(3, '0')}_${safeName}.jpg`;
    let dedupe = 1;
    while (usedNames.has(entryName)) {
      entryName = `${String(photo.photoNumber).padStart(3, '0')}_${dedupe++}_${safeName}.jpg`;
    }
    usedNames.add(entryName);

    try {
      const obj = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: photo.storageKey }));
      // Append this stream and wait until archiver finishes consuming it before
      // opening the next R2 object — keeps ~1 object in flight (flat memory).
      // Settle on the entry event OR any error (never hang the loop).
      await new Promise((resolve, reject) => {
        const onEntry = () => { cleanup(); resolve(); };
        const onErr = (e) => { cleanup(); reject(e); };
        const cleanup = () => {
          archive.off('entry', onEntry);
          archive.off('error', onErr);
          obj.Body.off('error', onErr);
        };
        archive.once('entry', onEntry);
        archive.once('error', onErr);
        obj.Body.once('error', onErr);
        archive.append(obj.Body, { name: entryName });
      });
      added += 1;
    } catch (err) {
      logger.error(`[Gallery] download-all skip ${photo.storageKey}:`, err?.message);
      // Skip a single unreadable object rather than failing the whole zip.
    }
  }

  if (aborted) return;

  if (added === 0) {
    // Nothing could be read — the stream has started, so we can only end it.
    logger.error('[Gallery] download-all: no readable photos for event', req.galleryAccess.eventId);
  }

  try {
    await archive.finalize();
  } catch (err) {
    logger.error('[Gallery] download-all finalize error:', err?.message);
    if (!res.writableEnded) res.destroy(err);
  }
});

// ── Enhancement Credits Constants ─────────────────────────────────────────

const FREE_ENHANCEMENTS_PER_EVENT = 3;
const CREDIT_PRICING = {
  single: { price: 15, credits: 1, label: 'Single Enhancement' },
  bundle5: { price: 50, credits: 5, label: '5 Enhancement Bundle (33% off)' },
  vip: { price: 175, credits: 0, label: 'VIP — 2 Sessions (Orientation + PT) + Unlimited Enhancements' },
};

/**
 * Helper: Build credit status object for API responses
 */
function buildCreditStatus(visitor, eventKey) {
  const freeUsed = (visitor.freeEnhancementsUsed || {})[eventKey] || 0;
  return {
    freeRemaining: Math.max(0, FREE_ENHANCEMENTS_PER_EVENT - freeUsed),
    purchasedCredits: visitor.enhancementCredits,
    isVip: visitor.isVip,
    freeUsedThisEvent: freeUsed,
  };
}

// ── Enhancement Requests (3 free/event, then credits) ─────────────────────

/**
 * POST /api/gallery/enhancement-request
 * Submit enhancement request — 3 free per event, then requires credits or VIP
 */
router.post('/enhancement-request', requireGalleryAccess, async (req, res) => {
  try {
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Select at least one photo to enhance' });
    }

    if (photoIds.length > 50) {
      return res.status(400).json({ success: false, error: 'Maximum 50 photos per enhancement request' });
    }

    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;
    const eventKey = `eventId_${eventId}`;

    // Load visitor with current credit state
    const visitor = await GalleryVisitor.findByPk(visitorId);
    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Visitor not found' });
    }

    // Verify photos belong to this event
    const photos = await GalleryPhoto.findAll({
      where: { id: photoIds, eventId },
      attributes: ['id'],
    });
    const validPhotoIds = photos.map(p => p.id);

    if (validPhotoIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid photos found for this event' });
    }

    // Filter out already-requested photos
    const newPhotoIds = [];
    for (const photoId of validPhotoIds) {
      const existing = await EnhancementRequest.findOne({ where: { visitorId, photoId } });
      if (!existing) newPhotoIds.push(photoId);
    }

    if (newPhotoIds.length === 0) {
      return res.json({
        success: true,
        message: 'All selected photos were already requested',
        requestCount: 0,
        alreadyRequested: validPhotoIds.length,
        credits: buildCreditStatus(visitor, eventKey),
      });
    }

    // Calculate how many free enhancements remain for this event
    const freeUsed = (visitor.freeEnhancementsUsed || {})[eventKey] || 0;
    const freeRemaining = Math.max(0, FREE_ENHANCEMENTS_PER_EVENT - freeUsed);

    // Determine how many can be fulfilled
    const photosToProcess = newPhotoIds.length;
    let freeToUse = 0;
    let creditsToUse = 0;

    if (visitor.isVip) {
      // VIP: unlimited, no cost
      freeToUse = 0;
      creditsToUse = 0;
    } else {
      // Use free credits first
      freeToUse = Math.min(freeRemaining, photosToProcess);
      const remaining = photosToProcess - freeToUse;

      if (remaining > 0) {
        // Need purchased credits for the rest
        if (visitor.enhancementCredits >= remaining) {
          creditsToUse = remaining;
        } else {
          // Not enough credits — reject the entire request
          return res.status(402).json({
            success: false,
            error: 'credits_required',
            freeUsed: freeUsed,
            freeRemaining,
            photosRequested: photosToProcess,
            creditsAvailable: visitor.enhancementCredits,
            creditsNeeded: remaining - visitor.enhancementCredits,
            pricing: {
              single: CREDIT_PRICING.single.price,
              bundle5: CREDIT_PRICING.bundle5.price,
              vip: CREDIT_PRICING.vip.price,
            },
            credits: buildCreditStatus(visitor, eventKey),
          });
        }
      }
    }

    // Process the enhancements
    const created = [];
    for (const photoId of newPhotoIds) {
      const [request, wasCreated] = await EnhancementRequest.findOrCreate({
        where: { visitorId, photoId },
        defaults: { visitorId, photoId, status: 'requested' },
      });
      if (wasCreated) {
        created.push(request);
        await GalleryPhoto.increment('enhancementRequestCount', { where: { id: photoId } });
      }
    }

    // Deduct credits
    if (freeToUse > 0) {
      const updatedFreeUsed = { ...(visitor.freeEnhancementsUsed || {}), [eventKey]: freeUsed + freeToUse };
      await visitor.update({ freeEnhancementsUsed: updatedFreeUsed });
    }
    if (creditsToUse > 0) {
      // Atomic decrement to prevent race conditions with concurrent requests
      await GalleryVisitor.decrement('enhancementCredits', {
        by: creditsToUse,
        where: { id: visitorId, enhancementCredits: { [Op.gte]: creditsToUse } },
      });
    }

    // Reload visitor for accurate credit status
    await visitor.reload();

    // ── Bump lead score on enhancement request (high-intent signal) ──
    try {
      const lead = await Lead.findOne({ where: { email: req.galleryAccess.email } });
      if (lead) {
        const scoreBoost = created.length * 5; // +5 per enhancement
        const newScore = Math.min(100, (lead.score || 0) + scoreBoost);
        await lead.update({ score: newScore });
        await LeadActivity.create({
          leadId: lead.id,
          type: 'score_changed',
          performedByAI: true,
          title: `Lead score +${scoreBoost} (enhancement request)`,
          description: `Requested ${created.length} enhancement(s) for event "${req.galleryAccess.slug}"`,
          metadata: { previousScore: lead.score, newScore, reason: 'enhancement_request' },
        });
      }
    } catch (scoreErr) {
      logger.warn(`[Gallery:CRM] Lead score bump failed: ${scoreErr.message}`);
    }

    return res.json({
      success: true,
      message: `Enhancement requested for ${created.length} photo(s)`,
      requestCount: created.length,
      alreadyRequested: validPhotoIds.length - newPhotoIds.length,
      freeUsed: freeToUse,
      creditsUsed: creditsToUse,
      credits: buildCreditStatus(visitor, eventKey),
    });
  } catch (err) {
    logger.error('[Gallery] Enhancement request error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to submit enhancement request' });
  }
});

// ── Credit Status ─────────────────────────────────────────────────────────

/**
 * GET /api/gallery/credits
 * Get current enhancement credit status for this visitor + event
 */
router.get('/credits', requireGalleryAccess, async (req, res) => {
  try {
    const visitor = await GalleryVisitor.findByPk(req.galleryAccess.visitorId);
    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Visitor not found' });
    }

    const eventKey = `eventId_${req.galleryAccess.eventId}`;
    const freeUsedThisEvent = (visitor.freeEnhancementsUsed || {})[eventKey] || 0;

    return res.json({
      success: true,
      freeRemaining: Math.max(0, FREE_ENHANCEMENTS_PER_EVENT - freeUsedThisEvent),
      purchasedCredits: visitor.enhancementCredits,
      isVip: visitor.isVip,
      freeUsedThisEvent,
    });
  } catch (err) {
    logger.error('[Gallery] Credits check error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to check credits' });
  }
});

// ── Purchase Credits ──────────────────────────────────────────────────────

/**
 * POST /api/gallery/purchase-credits
 * Create Stripe Checkout session for enhancement credits
 * Body: { package: 'single' | 'bundle5' | 'vip' }
 */
router.post('/purchase-credits', requireGalleryAccess, async (req, res) => {
  try {
    const { package: pkg } = req.body;

    if (!pkg || !CREDIT_PRICING[pkg]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package. Choose: single ($15/1 credit), bundle5 ($50/5 credits), or vip ($175/unlimited)',
      });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const stripe = getLegacyDefaultStripeClient();
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const pricing = CREDIT_PRICING[pkg];
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;
    const frontendUrl = (process.env.FRONTEND_URL || 'https://sswanstudios.com').replace(/\/$/, '');
    const gallerySlug = req.galleryAccess.slug || '';
    const galleryPath = gallerySlug ? `/gallery/${encodeURIComponent(gallerySlug)}` : '/gallery';
    const idempotencyKey = buildWindowedStripeIdempotencyKey(
      `gallery-credits:${visitorId}:${eventId}:${pkg}`,
      {
        visitorId,
        eventId,
        package: pkg,
        credits: pricing.credits,
        price: pricing.price
      }
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `SwanStudios ${pricing.label}`,
            description: pkg === 'vip'
              ? 'Unlimited photo enhancements for this event + a personal training session'
              : `${pricing.credits} photo enhancement credit(s)`,
          },
          unit_amount: pricing.price * 100,
        },
        quantity: 1,
      }],
      success_url: `${frontendUrl}${galleryPath}?credits=success&package=${pkg}`,
      cancel_url: `${frontendUrl}${galleryPath}?credits=cancelled`,
      metadata: {
        type: 'gallery_credits',
        package: pkg,
        credits: String(pricing.credits),
        visitorId: String(visitorId),
        eventId: String(eventId),
      },
    }, {
      idempotencyKey,
    });

    // Credits are applied via the Stripe webhook handler (checkout.session.completed)
    // — NOT here — to prevent fraud from cancelled checkouts.

    return res.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    logger.error('[Gallery] Purchase credits error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// ── Donations (Optional) ─────────────────────────────────────────────────

/**
 * POST /api/gallery/donation
 * Create optional Stripe donation checkout session
 */
router.post('/donation', requireGalleryAccess, async (req, res) => {
  try {
    const { amount, method = 'stripe' } = req.body;
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;
    const frontendUrl = (process.env.FRONTEND_URL || 'https://sswanstudios.com').replace(/\/$/, '');
    const gallerySlug = req.galleryAccess.slug || '';
    const galleryPath = gallerySlug ? `/gallery/${encodeURIComponent(gallerySlug)}` : '/gallery';

    const donationAmount = parseFloat(amount) || 0;

    if ((method === 'stripe' || method === 'venmo') && donationAmount < 0.50) {
      return res.status(400).json({ success: false, error: 'Stripe checkout minimum is $0.50' });
    }

    if (method === 'stripe') {
      // Create Stripe Checkout session
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({ success: false, error: 'Payment processing not configured' });
      }

      const stripe = getLegacyDefaultStripeClient();
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Payment processing not configured' });
      }
      const idempotencyKey = buildWindowedStripeIdempotencyKey(
        `gallery-donation:${visitorId}:${eventId}:stripe`,
        {
          visitorId,
          eventId,
          method: 'stripe',
          amount: donationAmount
        }
      );

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'SwanStudios Gallery Donation',
              description: 'Thank you for supporting SwanStudios!',
            },
            unit_amount: Math.round(donationAmount * 100),
          },
          quantity: 1,
        }],
        success_url: `${frontendUrl}${galleryPath}?donation=success`,
        cancel_url: `${frontendUrl}${galleryPath}?donation=cancelled`,
        metadata: {
          type: 'gallery_donation',
          visitorId: String(visitorId),
          eventId: String(eventId),
          method: 'stripe',
          amount: String(donationAmount),
        },
      }, {
        idempotencyKey,
      });

      return res.json({ success: true, checkoutUrl: session.url });
    }

    if (method === 'venmo') {
      // Venmo through Stripe (if available on account)
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({ success: false, error: 'Payment processing not configured' });
      }

      const stripe = getLegacyDefaultStripeClient();
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Payment processing not configured' });
      }
      const idempotencyKey = buildWindowedStripeIdempotencyKey(
        `gallery-donation:${visitorId}:${eventId}:venmo`,
        {
          visitorId,
          eventId,
          method: 'venmo',
          amount: donationAmount
        }
      );

      const paymentMethodTypes = ['card'];
      // Venmo is available in Stripe for US accounts
      try { paymentMethodTypes.push('venmo'); } catch { /* Venmo may not be available */ }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: paymentMethodTypes,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'SwanStudios Gallery Donation',
              description: 'Thank you for supporting SwanStudios!',
            },
            unit_amount: Math.round(donationAmount * 100),
          },
          quantity: 1,
        }],
        success_url: `${frontendUrl}${galleryPath}?donation=success`,
        cancel_url: `${frontendUrl}${galleryPath}?donation=cancelled`,
        metadata: {
          type: 'gallery_donation',
          visitorId: String(visitorId),
          eventId: String(eventId),
          method: 'venmo',
          amount: String(donationAmount),
        },
      }, {
        idempotencyKey,
      });

      return res.json({ success: true, checkoutUrl: session.url });
    }

    return res.status(400).json({ success: false, error: 'Invalid donation method. Use stripe or venmo.' });
  } catch (err) {
    logger.error('[Gallery] Donation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create donation' });
  }
});

/**
 * POST /api/gallery/donation/zelle-confirm
 * Parent marks "I sent Zelle" — admin verifies later
 */
router.post('/donation/zelle-confirm', requireGalleryAccess, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;

    await GalleryDonation.create({
      visitorId,
      eventId,
      amount: parseFloat(amount) || 0,
      method: 'zelle',
      zelleConfirmed: false, // Admin will confirm
      note: note?.trim() || null,
    });

    // Notification trigger: Zelle donation pending verification
    try {
      const zelleAmount = parseFloat(amount) || 0;
      await createAdminNotification({
        title: 'Gallery Zelle Donation Pending',
        message: `Visitor #${visitorId} sent $${zelleAmount.toFixed(2)} via Zelle — please verify`,
        type: 'admin'
      });
    } catch (notifErr) {
      logger.warn(`Zelle donation notification failed: ${notifErr.message}`);
    }

    return res.json({
      success: true,
      message: 'Thank you! We will verify your Zelle payment.',
    });
  } catch (err) {
    logger.error('[Gallery] Zelle confirm error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to record Zelle donation' });
  }
});

// ── Referrals (Optional) ─────────────────────────────────────────────────

const referralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.galleryAccess?.visitorId || req.ip,
  message: { success: false, error: 'Referral limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/gallery/referral
 * Submit an optional PT referral
 */
router.post('/referral', requireGalleryAccess, referralLimiter, async (req, res) => {
  try {
    const { referralName, referralPhone, referralEmail } = req.body;

    if (!referralName || !referralPhone) {
      return res.status(400).json({ success: false, error: 'Referral name and phone are required' });
    }

    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;
    const cleanReferralName = referralName.trim();
    const cleanReferralPhone = referralPhone.trim();
    const cleanReferralEmail = referralEmail?.trim() || null;

    // Normalize phone (digits only) so formatting tricks ("555-1234" vs "5551234") can't bypass dedup (fix #1).
    const normPhone = cleanReferralPhone.replace(/\D/g, '');
    if (normPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'A valid phone number is required' });
    }

    const REFERRAL_CREDIT = 5;
    const MAX_REFERRAL_CREDITS = 25; // lifetime cap per visitor (5 referrals × 5) — anti credit-farming (survey #1)
    let referral;
    let creditsAwarded = 0;
    try {
      await sequelize.transaction(async (t) => {
        // The DB partial-unique index (visitor, event, norm-phone) throws on a dup; the referral row still
        // persists at cap (it's a real lead) — only the credit grant is gated.
        referral = await GalleryReferral.create(
          {
            visitorId,
            eventId,
            referralName: cleanReferralName,
            referralPhone: cleanReferralPhone,
            referralPhoneNorm: normPhone,
            referralEmail: cleanReferralEmail,
          },
          { transaction: t },
        );
        // Atomic conditional grant — fails closed once the lifetime cap is hit; concurrent-safe (no
        // read-then-write race). Real column is enhancement_credits (snake_case), not the camelCase attribute.
        const [, meta] = await sequelize.query(
          `UPDATE gallery_visitors SET enhancement_credits = enhancement_credits + :credit
             WHERE id = :visitorId AND enhancement_credits < :cap
           RETURNING id`,
          { replacements: { credit: REFERRAL_CREDIT, visitorId, cap: MAX_REFERRAL_CREDITS }, transaction: t },
        );
        creditsAwarded = (meta?.rowCount ?? 0) > 0 ? REFERRAL_CREDIT : 0;
      });
    } catch (e) {
      if (e?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ success: false, error: 'This referral has already been submitted for this event.' });
      }
      throw e;
    }
    const visitor = await GalleryVisitor.findByPk(visitorId);
    try {
      await createAdminNotification({
        title: 'Gallery Referral Received',
        message: `Visitor #${visitorId} submitted referral #${referral.id} (${cleanReferralName}) for event #${eventId}.`,
        type: 'admin',
      });
    } catch (notifErr) {
      logger.warn(`Gallery referral notification failed: ${notifErr.message}`);
    }

    // ── Bump lead score on referral (high-trust signal) ──
    try {
      const lead = await Lead.findOne({ where: { email: req.galleryAccess.email } });
      if (lead) {
        const newScore = Math.min(100, (lead.score || 0) + 15);
        await lead.update({ score: newScore });
        await LeadActivity.create({
          leadId: lead.id,
          type: 'score_changed',
          performedByAI: true,
          title: 'Lead score +15 (referral submitted)',
          description: `Referred "${cleanReferralName}" from event "${req.galleryAccess.slug}"`,
          metadata: { previousScore: lead.score, newScore, reason: 'referral' },
        });
      }
    } catch (scoreErr) {
      logger.warn(`[Gallery:CRM] Lead score bump (referral) failed: ${scoreErr.message}`);
    }

    return res.json({
      success: true,
      message: creditsAwarded > 0
        ? 'Thank you for the referral! You earned 5 enhancement credits.'
        : 'Thank you for the referral! Your maximum referral credits have already been reached.',
      referralId: referral.id,
      creditsAwarded,
      totalCredits: visitor ? visitor.enhancementCredits : 0,
    });
  } catch (err) {
    logger.error('[Gallery] Referral error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to submit referral' });
  }
});

// ── Photo Voting (Thumbs Up / Thumbs Down) ──────────────────────────────

/**
 * POST /api/gallery/vote
 * Cast or change a vote on a photo.
 * Body: { photoId: number, voteType: 1 | -1 }
 * Toggle: voting the same type again removes the vote.
 */
router.post('/vote', requireGalleryAccess, async (req, res) => {
  try {
    const { photoId, voteType } = req.body;
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;

    if (!photoId || ![1, -1].includes(voteType)) {
      return res.status(400).json({ success: false, error: 'photoId and voteType (1 or -1) required' });
    }

    // Verify photo belongs to this event
    const photo = await GalleryPhoto.findOne({ where: { id: photoId, eventId } });
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found in this event' });
    }

    // Check for existing vote by this visitor
    const existing = await PhotoVote.findOne({ where: { photoId, visitorId } });

    if (existing) {
      if (existing.voteType === voteType) {
        // Toggle off — remove vote
        await existing.destroy();
        const counts = await getVoteCounts(photoId);
        return res.json({ success: true, action: 'removed', userVote: null, ...counts });
      }
      // Change vote direction
      await existing.update({ voteType });
      const counts = await getVoteCounts(photoId);
      return res.json({ success: true, action: 'changed', userVote: voteType, ...counts });
    }

    // New vote
    await PhotoVote.create({ photoId, visitorId, voteType });
    const counts = await getVoteCounts(photoId);
    return res.json({ success: true, action: 'created', userVote: voteType, ...counts });
  } catch (err) {
    logger.error('[Gallery] Vote error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to record vote' });
  }
});

/**
 * GET /api/gallery/events/:slug/votes
 * Get vote counts for all photos in an event + the visitor's own votes.
 */
router.get('/events/:slug/votes', requireGalleryAccess, async (req, res) => {
  try {
    if (req.galleryAccess.slug !== req.params.slug) {
      return res.status(403).json({ success: false, error: 'Access token does not match this event' });
    }

    const eventId = req.galleryAccess.eventId;
    const visitorId = req.galleryAccess.visitorId;

    // Get all photos for this event
    const photos = await GalleryPhoto.findAll({
      where: { eventId },
      attributes: ['id'],
    });
    const photoIds = photos.map(p => p.id);

    if (photoIds.length === 0) {
      return res.json({ success: true, votes: {} });
    }

    // Aggregate vote counts per photo
    const voteCounts = await PhotoVote.findAll({
      where: { photoId: photoIds },
      attributes: [
        'photoId',
        [fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
        [fn('SUM', literal("CASE WHEN vote_type = -1 THEN 1 ELSE 0 END")), 'thumbsDown'],
      ],
      group: ['photoId'],
      raw: true,
    });

    // Get this visitor's votes
    const myVotes = await PhotoVote.findAll({
      where: { photoId: photoIds, visitorId },
      attributes: ['photoId', 'voteType'],
      raw: true,
    });

    // Build response map: { photoId: { thumbsUp, thumbsDown, userVote } }
    const votesMap = {};
    for (const row of voteCounts) {
      votesMap[row.photoId] = {
        thumbsUp: parseInt(row.thumbsUp) || 0,
        thumbsDown: parseInt(row.thumbsDown) || 0,
        userVote: null,
      };
    }
    for (const vote of myVotes) {
      if (!votesMap[vote.photoId]) {
        votesMap[vote.photoId] = { thumbsUp: 0, thumbsDown: 0, userVote: null };
      }
      votesMap[vote.photoId].userVote = vote.voteType;
    }

    return res.json({ success: true, votes: votesMap });
  } catch (err) {
    logger.error('[Gallery] Get votes error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load votes' });
  }
});

/** Helper: get aggregated vote counts for a single photo */
async function getVoteCounts(photoId) {
  const result = await PhotoVote.findAll({
    where: { photoId },
    attributes: [
      [fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
      [fn('SUM', literal("CASE WHEN vote_type = -1 THEN 1 ELSE 0 END")), 'thumbsDown'],
    ],
    raw: true,
  });
  const row = result[0] || {};
  return {
    thumbsUp: parseInt(row.thumbsUp) || 0,
    thumbsDown: parseInt(row.thumbsDown) || 0,
  };
}

// ── VIP PT Session Conversion ─────────────────────────────────────────────

// Rate limiter for VIP signup (prevent abuse)
const vipSignupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: 'Too many signup attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/gallery/vip-signup
 * Create or login a SwanStudios user account from gallery visitor context.
 * The email is taken from the gallery access token (already verified).
 * Body: { password, phone, firstName, lastName }
 */
router.post('/vip-login', vipSignupLimiter, requireGalleryAccess, async (req, res) => {
  try {
    const { email: requestedEmail, password } = req.body;
    const email = req.galleryAccess.email;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    if (requestedEmail && requestedEmail.trim().toLowerCase() !== email) {
      return res.status(403).json({
        success: false,
        error: 'Gallery access email does not match this login attempt',
      });
    }

    const User = getUser();
    const existingUser = await User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const passwordValid = await existingUser.checkPassword(password);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const userId = existingUser.id.toString();
    const accessToken = signSwanAccessToken(userId, existingUser.role);

    await existingUser.update({ lastLogin: new Date(), lastActive: new Date() });

    const visitor = await GalleryVisitor.findByPk(req.galleryAccess.visitorId);
    if (visitor && !visitor.userId) {
      await visitor.update({ userId: existingUser.id });
    }

    logger.info(`[Gallery VIP] Existing user logged in (id=${existingUser.id})`);

    return res.json({
      success: true,
      token: accessToken,
      userId: existingUser.id,
      isNewUser: false,
      user: {
        id: existingUser.id,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        email: existingUser.email,
        role: existingUser.role,
      },
    });
  } catch (err) {
    logger.error('[Gallery VIP] Login error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to process VIP login' });
  }
});

router.post('/vip-signup', vipSignupLimiter, requireGalleryAccess, async (req, res) => {
  try {
    const { password, phone, firstName, lastName } = req.body;
    const email = req.galleryAccess.email;

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password is required and must be at least 8 characters',
      });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required',
      });
    }

    const User = getUser();

    // Check if user already exists with this email
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      // Existing user — verify password and log them in
      const passwordValid = await existingUser.checkPassword(password);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password for existing account. Please use your SwanStudios password.',
        });
      }

      // Generate auth tokens
      const userId = existingUser.id.toString();
      const accessToken = signSwanAccessToken(userId, existingUser.role);

      // Update last login
      await existingUser.update({ lastLogin: new Date(), lastActive: new Date() });

      // Link gallery visitor to user account
      const visitor = await GalleryVisitor.findByPk(req.galleryAccess.visitorId);
      if (visitor && !visitor.userId) {
        await visitor.update({ userId: existingUser.id });
      }

      logger.info(`[Gallery VIP] Existing user logged in (id=${existingUser.id})`);

      return res.json({
        success: true,
        token: accessToken,
        userId: existingUser.id,
        isNewUser: false,
        user: {
          id: existingUser.id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          role: existingUser.role,
        },
      });
    }

    // New user — create account
    // Generate a username from email (before the @)
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    let username = baseUsername;
    let suffix = 1;
    while (await User.findOne({ where: { username } })) {
      username = `${baseUsername}_${suffix}`;
      suffix++;
    }

    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      username,
      password, // hashed by User.beforeCreate hook
      phone: phone?.trim() || null,
      role: 'client',
      isActive: true,
      lastActive: new Date(),
      lastLogin: new Date(),
      // Store acquisition source in preferences JSON
      preferences: JSON.stringify({ acquisitionSource: 'swan_photography_vip' }),
    });

    const userId = newUser.id.toString();
    const accessToken = signSwanAccessToken(userId, newUser.role);

    // Link gallery visitor to new user account
    const visitor = await GalleryVisitor.findByPk(req.galleryAccess.visitorId);
    if (visitor) {
      await visitor.update({ userId: newUser.id });
    }

    logger.info(`[Gallery VIP] New user created (id=${newUser.id}, username=${username})`);

    return res.json({
      success: true,
      token: accessToken,
      userId: newUser.id,
      isNewUser: true,
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    logger.error('[Gallery VIP] Signup error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to process VIP signup' });
  }
});

/**
 * POST /api/gallery/vip-checkout
 * Create a Stripe Checkout session for the $175 VIP PT Session package.
 * Body: { userId, token }
 */
router.post('/vip-checkout', requireGalleryAccess, async (req, res) => {
  try {
    const { userToken } = req.body;
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;

    // Attribution comes ONLY from the verified token — never a raw body userId.
    // Trusting body.userId let a caller bind a Stripe checkout to any user id.
    let userId = null;
    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, getJwtSecret(), { algorithms: ['HS256'] });
        userId = decoded.id;
      } catch (tokenErr) {
        if (isJwtSecretConfigurationError(tokenErr)) {
          logger.error('[Gallery VIP] JWT secret is not configured for checkout token verification');
          return res.status(500).json({ success: false, error: 'Authentication is not configured' });
        }

        logger.warn('[Gallery VIP] Invalid userToken in checkout:', tokenErr.message);
      }
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Please log in to continue to checkout' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const stripe = getLegacyDefaultStripeClient();
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
    const gallerySlug = req.galleryAccess.slug || '';
    const idempotencyKey = buildWindowedStripeIdempotencyKey(
      `gallery-vip:${userId}:${visitorId}:${eventId}`,
      {
        userId,
        visitorId,
        eventId,
        amount: 175
      }
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'VIP Gallery Package — 2 Sessions + Unlimited Enhancements',
            description: 'Includes: 1 Complimentary NASM Assessment (1hr) + 1 PT Training Session (1hr) + Unlimited Photo Enhancements + Personalized 90-Day Blueprint',
          },
          unit_amount: 17500, // $175.00
        },
        quantity: 1,
      }],
      success_url: `${frontendUrl}/gallery/${gallerySlug}?vip=success&userId=${userId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/gallery/${gallerySlug}?vip=cancelled`,
      metadata: {
        userId: String(userId),
        galleryVisitorId: String(visitorId),
        eventId: String(eventId),
        type: 'vip_pt_session',
      },
    }, {
      idempotencyKey,
    });

    logger.info(`[Gallery VIP] Checkout session created for user ${userId}, visitor ${visitorId}`);

    return res.json({ success: true, checkoutUrl: session.url });
  } catch (err) {
    logger.error('[Gallery VIP] Checkout error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/gallery/vip-activate
 * Called after Stripe redirects back from a successful VIP checkout.
 * Verifies the Checkout Session before syncing VIP/session fulfillment.
 * Body: { sessionId, userId? }
 */
/**
 * GET /api/gallery/vip-spots
 * Returns how many of the first 5 "unlimited enhancements" VIP spots remain.
 * No auth required — this is public info to drive urgency.
 */
const VIP_UNLIMITED_SPOTS = 5;

router.get('/vip-spots', async (req, res) => {
  try {
    const vipCount = await GalleryVisitor.count({ where: { isVip: true } });
    const spotsRemaining = Math.max(0, VIP_UNLIMITED_SPOTS - vipCount);
    return res.json({ success: true, spotsRemaining, totalSpots: VIP_UNLIMITED_SPOTS });
  } catch (err) {
    logger.error('[Gallery VIP] Spots check error:', err.message);
    return res.json({ success: true, spotsRemaining: 0, totalSpots: VIP_UNLIMITED_SPOTS });
  }
});

router.post('/vip-activate', requireGalleryAccess, async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    const visitorId = req.galleryAccess.visitorId;
    const validation = validateCheckoutSessionId(sessionId);

    if (!validation.ok) {
      return res.status(validation.statusCode).json({
        success: false,
        code: validation.code,
        error: validation.message,
      });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const stripe = getLegacyDefaultStripeClient();
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }
    const session = await stripe.checkout.sessions.retrieve(validation.sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(409).json({
        success: false,
        code: 'VIP_PAYMENT_NOT_CONFIRMED',
        error: `Payment status is ${session.payment_status || 'unknown'}`,
      });
    }

    const meta = session.metadata || {};
    const metadataVisitorId = Number.parseInt(meta.galleryVisitorId, 10);
    const metadataEventId = Number.parseInt(meta.eventId, 10);
    const metadataUserId = Number.parseInt(meta.userId, 10);

    if (
      meta.type !== 'vip_pt_session' ||
      metadataVisitorId !== visitorId ||
      metadataEventId !== req.galleryAccess.eventId ||
      (userId && Number.parseInt(userId, 10) !== metadataUserId)
    ) {
      return res.status(403).json({
        success: false,
        code: 'VIP_SESSION_MISMATCH',
        error: 'Checkout session does not match this gallery visitor',
      });
    }

    const result = await fulfillGalleryVipSession({
      sessionId: session.id,
      visitorId: metadataVisitorId,
      userId: metadataUserId,
      eventId: metadataEventId,
      amount: 175,
    });

    return res.json({
      success: true,
      isVip: true,
      alreadyProcessed: result.alreadyProcessed,
      sessionCreditGranted: result.sessionCreditGranted,
      message: 'VIP status activated! 1 PT session credit added + 1 complimentary orientation session (free). Schedule your orientation first!',
    });
  } catch (err) {
    const stripeError = classifyStripeCheckoutSessionError(err);
    if (stripeError.code !== 'SESSION_VERIFICATION_FAILED') {
      return res.status(stripeError.statusCode).json({
        success: false,
        code: stripeError.code,
        error: stripeError.message,
        details: stripeError.details,
      });
    }

    logger.error('[Gallery VIP] Activation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to activate VIP status' });
  }
});

// ── Messages (Contact from Gallery Visitors) ─────────────────────────────

// Rate limiter for gallery messages (5 per 15 minutes per visitor)
const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => req.galleryAccess?.visitorId || req.ip,
  message: { success: false, error: 'Message limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/gallery/message
 * Submit a message from a gallery visitor (requires gallery access token)
 * Body: { message (required), firstName (optional), phone (optional) }
 */
router.post('/message', requireGalleryAccess, messageLimiter, async (req, res) => {
  try {
    const { message, firstName, phone } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({ success: false, error: 'Message must be under 5000 characters' });
    }

    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;
    const email = req.galleryAccess.email;

    const galleryMessage = await GalleryMessage.create({
      visitorId,
      eventId,
      email,
      firstName: firstName?.trim() || null,
      phone: phone?.trim() || null,
      message: message.trim(),
    });

    logger.info(`[Gallery] Message created id=${galleryMessage.id} from visitor=${visitorId} event=${eventId}`);
    try {
      await createAdminNotification({
        title: 'Gallery Message Received',
        message: `Visitor #${visitorId} sent gallery message #${galleryMessage.id} for event #${eventId}.`,
        type: 'admin',
      });
    } catch (notifErr) {
      logger.warn(`Gallery message notification failed: ${notifErr.message}`);
    }

    return res.json({
      success: true,
      messageId: galleryMessage.id,
    });
  } catch (err) {
    logger.error('[Gallery] Message error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// ── Print-on-Demand ──────────────────────────────────────────────────────

/** Product catalog with pricing + commission rates */
const PRINT_PRODUCTS = {
  print:     { label: 'Fine Art Print',  sizes: { '8x10': 29.99, '11x14': 44.99, '16x20': 59.99, '24x36': 89.99 }, commission: 0.20 },
  canvas:    { label: 'Gallery Canvas',  sizes: { '12x16': 79.99, '16x20': 109.99, '24x36': 159.99 }, commission: 0.18 },
  metal:     { label: 'Metal Print',     sizes: { '8x10': 49.99, '12x16': 79.99, '16x20': 119.99, '24x36': 179.99 }, commission: 0.18 },
  poster:    { label: 'Premium Poster',  sizes: { '12x18': 24.99, '18x24': 34.99, '24x36': 49.99 }, commission: 0.20 },
  photobook: { label: 'Photo Book',      sizes: { '8x8': 49.99, '10x10': 69.99, '12x12': 89.99 }, commission: 0.15 },
};

/**
 * GET /api/gallery/print-products
 * Returns available print products and pricing
 */
router.get('/print-products', (_req, res) => {
  const products = Object.entries(PRINT_PRODUCTS).map(([type, config]) => ({
    type,
    label: config.label,
    sizes: Object.entries(config.sizes).map(([size, price]) => ({ size, price })),
  }));
  return res.json({ success: true, products });
});

/**
 * POST /api/gallery/print-order
 * Create a print order → Stripe checkout
 */
router.post('/print-order', requireGalleryAccess, async (req, res) => {
  try {
    // Server-side storefront gate (3f review fix): the flag must gate the MONEY endpoint,
    // not just the UI — otherwise the "dormant" storefront accepts real orders by direct API.
    if (process.env.PRINT_STOREFRONT_ENABLED !== 'true') {
      return res.status(403).json({ success: false, error: 'Print ordering is not currently available.' });
    }
    const { photoId, productType, size, quantity, cropData } = req.body;
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;

    // Validate product
    const product = PRINT_PRODUCTS[productType];
    if (!product) {
      return res.status(400).json({ success: false, error: 'Invalid product type' });
    }
    const unitPrice = product.sizes[size];
    if (!unitPrice) {
      return res.status(400).json({ success: false, error: `Invalid size "${size}" for ${product.label}` });
    }
    const qty = Math.max(1, Math.min(10, parseInt(quantity) || 1));

    // Verify photo belongs to this event
    const photo = await GalleryPhoto.findOne({ where: { id: photoId, eventId } });
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found in this event' });
    }
    // Print-master precondition (3f review fix): never charge for a photo with no
    // un-watermarked master — it can't be fulfilled and would strand the order at 'paid'.
    if (!photo.originalStorageKey) {
      return res.status(409).json({ success: false, error: 'Prints are not available for this photo yet.' });
    }

    const totalPrice = (unitPrice * qty).toFixed(2);
    const commission = (totalPrice * product.commission).toFixed(2);

    // Create Stripe Checkout session
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const stripe = getLegacyDefaultStripeClient();
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
    const printAttemptKey = buildGalleryPrintAttemptKey({
      visitorId,
      eventId,
      photoId,
      productType,
      size,
      quantity: qty,
      totalPrice,
      cropData: cropData || null,
    });

    const { record: order, created } = await claimIdempotentRecord({
      model: PrintOrder,
      lookupWhere: { idempotencyKey: printAttemptKey },
      createValues: {
        visitorId,
        photoId,
        eventId,
        productType,
        size,
        quantity: qty,
        cropData: cropData || null,
        priceUsd: totalPrice,
        commissionUsd: commission,
        status: 'pending',
        idempotencyKey: printAttemptKey,
      },
    });

    if (!created) {
      if (order.stripeSessionId) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
          if (existingSession?.url) {
            return res.json({
              success: true,
              checkoutUrl: existingSession.url,
              orderId: order.id,
              sessionId: order.stripeSessionId,
            });
          }
        } catch (sessionErr) {
          logger.warn(`[Gallery] Could not reuse recent print checkout session: ${sessionErr.message}`);
        }
      }

      return res.status(409).json({
        success: false,
        code: 'PAYMENT_ATTEMPT_INCOMPLETE',
        error: 'A matching print checkout is still being prepared. Please retry shortly.',
      });
    }

    // Slice 3e: Stripe Tax on the print checkout, flag-gated OFF. Enabling automatic_tax
    // without Stripe Tax active in the dashboard ERRORS checkout — flip
    // PRINT_STRIPE_TAX_ENABLED only after Stripe Tax + a tax registration are set up.
    // When off, the spread fields collapse to no-ops (behavior byte-identical to before).
    const printStripeTaxEnabled = process.env.PRINT_STRIPE_TAX_ENABLED === 'true';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product.label} — ${size}`,
            description: `${photo.displayName || 'Gallery Photo'} printed on ${product.label}`,
            // Tangible-goods tax classification (only sent when Stripe Tax is on).
            ...(printStripeTaxEnabled ? { tax_code: 'txcd_99999999' } : {}),
          },
          unit_amount: Math.round(unitPrice * 100),
          // Tax added on top of the listed price (exclusive) when Stripe Tax is on.
          ...(printStripeTaxEnabled ? { tax_behavior: 'exclusive' } : {}),
        },
        quantity: qty,
      }],
      success_url: `${baseUrl}/gallery?print=success&orderId=${order.id}`,
      cancel_url: `${baseUrl}/gallery?print=cancelled`,
      // Prints are physically shipped by the print lab (Slice 3c) — collect a
      // recipient address. Expand allowed_countries as fulfillment coverage grows.
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      // Stripe Tax computes sales tax from the collected ship-to address (Slice 3e).
      ...(printStripeTaxEnabled ? { automatic_tax: { enabled: true } } : {}),
      metadata: {
        type: 'print_order',
        orderId: String(order.id),
        visitorId: String(visitorId),
        photoId: String(photoId),
      },
    }, {
      idempotencyKey: printAttemptKey,
    });

    await order.update({ stripeSessionId: session.id });

    // Bump lead score (+10 for print interest)
    try {
      const lead = await Lead.findOne({ where: { email: req.galleryAccess.email } });
      if (lead) {
        const newScore = Math.min(100, (lead.score || 0) + 10);
        await lead.update({ score: newScore });
        await LeadActivity.create({
          leadId: lead.id,
          type: 'score_changed',
          performedByAI: true,
          title: 'Lead score +10 (print order placed)',
          description: `Ordered ${product.label} ${size} for "${photo.displayName}"`,
          metadata: { previousScore: lead.score, newScore, reason: 'print_order' },
        });
      }
    } catch (scoreErr) {
      logger.warn(`[Gallery:CRM] Lead score bump (print) failed: ${scoreErr.message}`);
    }

    return res.json({
      success: true,
      checkoutUrl: session.url,
      orderId: order.id,
      total: totalPrice,
      // NOTE: never return `commission` — that is SwanStudios' internal margin (Rule 8),
      // mirrors the exclude on GET /print-orders.
    });
  } catch (err) {
    logger.error('[Gallery] Print order error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create print order' });
  }
});

/**
 * GET /api/gallery/print-orders
 * Get visitor's print order history
 */
router.get('/print-orders', requireGalleryAccess, async (req, res) => {
  try {
    const orders = await PrintOrder.findAll({
      where: { visitorId: req.galleryAccess.visitorId },
      // Never echo the recipient's home address (PII — Rule 8; families may include
      // minors) or SwanStudios' internal margin/payment refs back to the client.
      attributes: { exclude: ['shippingAddress', 'commissionUsd', 'idempotencyKey', 'stripeSessionId', 'printProviderOrderId'] },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, orders });
  } catch (err) {
    logger.error('[Gallery] Print orders fetch error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// ── AI Form Analysis ────────────────────────────────────────────────────

/** Rate limiter: 10 analyses per 15 min per IP (per Security brain guidance) */
const formAnalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many analysis requests. Please try again later.' },
});

/**
 * POST /api/gallery/analyze-form
 * Analyze exercise form from a gallery photo
 * Body: { photoId: number }
 */
router.post('/analyze-form', requireGalleryAccess, formAnalysisLimiter, async (req, res) => {
  try {
    const { photoId } = req.body;
    const eventId = req.galleryAccess.eventId;

    if (!photoId) {
      return res.status(400).json({ success: false, error: 'photoId is required' });
    }

    const photo = await GalleryPhoto.findOne({ where: { id: photoId, eventId } });
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    // Fetch the photo from R2 for analysis
    const photoUrl = photo.url;
    const imageResponse = await fetch(photoUrl);
    if (!imageResponse.ok) {
      return res.status(502).json({ success: false, error: 'Failed to fetch photo for analysis' });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const result = await analyzeForm(imageBuffer);

    return res.json(result);
  } catch (err) {
    logger.error('[Gallery] Form analysis error:', err.message);
    return res.status(500).json({ success: false, error: 'Form analysis failed' });
  }
});

// ── Lead Engagement Score (Admin) ─────────────────────────────────────────

/**
 * POST /api/gallery/recalculate-lead-scores
 * Batch recalculate lead scores based on gallery engagement.
 * Scoring formula:
 *   +10  Gallery access (base)
 *   +5   Per enhancement request
 *   +15  Per referral submitted
 *   +20  Per donation made
 *   +25  VIP conversion
 *   +10  Per message sent
 *   +2   Per photo vote
 * Max score: 100
 */
router.post('/recalculate-lead-scores', protect, adminOnly, async (req, res) => {
  try {
    const leads = await Lead.findAll({ where: { source: 'gallery', galleryVisitorId: { [Op.ne]: null } } });
    let updated = 0;

    for (const lead of leads) {
      const visitor = await GalleryVisitor.findByPk(lead.galleryVisitorId);
      if (!visitor) continue;

      const [enhancements, referrals, donations, messages, votes] = await Promise.all([
        EnhancementRequest.count({ where: { visitorId: visitor.id } }),
        GalleryReferral.count({ where: { visitorId: visitor.id } }),
        GalleryDonation.count({ where: { visitorId: visitor.id } }),
        GalleryMessage.count({ where: { visitorId: visitor.id } }),
        PhotoVote.count({ where: { visitorId: visitor.id } }),
      ]);

      let score = 10; // base gallery access
      score += enhancements * 5;
      score += referrals * 15;
      score += donations * 20;
      score += visitor.isVip ? 25 : 0;
      score += messages * 10;
      score += votes * 2;
      score = Math.min(100, score);

      if (score !== lead.score) {
        await lead.update({ score });
        updated++;
      }
    }

    return res.json({ success: true, leadsProcessed: leads.length, leadsUpdated: updated });
  } catch (err) {
    logger.error('[Gallery:CRM] Lead score recalculation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to recalculate lead scores' });
  }
});

// Gallery credit fulfillment is handled by the unified Stripe webhook at /webhooks/stripe/webhook
// — see backend/webhooks/stripeWebhook.mjs (fulfillGalleryCredits function)

export default router;
