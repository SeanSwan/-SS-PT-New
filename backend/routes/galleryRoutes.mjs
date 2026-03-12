/**
 * Gallery Routes (Public)
 * =======================
 * Public-facing endpoints for the photo gallery & lead generation system.
 * No user auth required — gallery access uses its own short-lived JWT.
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
 *   POST   /api/gallery/vip-signup          — Create/login user account for VIP conversion
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
import { getUser } from '../models/index.mjs';
import { Op, fn, col, literal } from 'sequelize';
import logger from '../utils/logger.mjs';

const router = express.Router();

const GALLERY_JWT_SECRET = process.env.JWT_SECRET || 'gallery-fallback-secret';
const GALLERY_TOKEN_TTL = '24h';

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
    const decoded = jwt.verify(token, GALLERY_JWT_SECRET);
    if (decoded.type !== 'gallery_access') {
      return res.status(403).json({ success: false, error: 'Invalid gallery token' });
    }
    req.galleryAccess = decoded; // { type, visitorId, eventId, email, slug }
    next();
  } catch {
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
    });

    // Fetch cover photo URLs
    const eventsWithCovers = await Promise.all(events.map(async (event) => {
      const plain = event.toJSON();
      if (plain.coverPhotoId) {
        const coverPhoto = await GalleryPhoto.findByPk(plain.coverPhotoId, {
          attributes: ['thumbnailUrl', 'url'],
        });
        plain.coverPhotoUrl = coverPhoto?.thumbnailUrl || coverPhoto?.url || null;
      } else {
        // Use first photo as cover
        const firstPhoto = await GalleryPhoto.findOne({
          where: { eventId: plain.id },
          attributes: ['thumbnailUrl', 'url'],
          order: [['photoNumber', 'ASC']],
        });
        plain.coverPhotoUrl = firstPhoto?.thumbnailUrl || firstPhoto?.url || null;
      }
      return plain;
    }));

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
    const [visitor] = await GalleryVisitor.findOrCreate({
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
      },
    });

    // Issue gallery access token (24h)
    const galleryToken = jwt.sign(
      {
        type: 'gallery_access',
        visitorId: visitor.id,
        eventId: event.id,
        email: cleanEmail,
        slug: event.slug,
      },
      GALLERY_JWT_SECRET,
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

    const photos = await GalleryPhoto.findAll({
      where: { eventId: req.galleryAccess.eventId },
      attributes: ['id', 'photoNumber', 'displayName', 'url', 'thumbnailUrl', 'width', 'height', 'enhancedUrl', 'enhancementRequestCount'],
      order: [['photoNumber', 'ASC']],
    });

    return res.json({ success: true, photos });
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
    let photosToProcess = newPhotoIds.length;
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
      await visitor.update({ enhancementCredits: visitor.enhancementCredits - creditsToUse });
    }

    // Reload visitor for accurate credit status
    await visitor.reload();

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

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const pricing = CREDIT_PRICING[pkg];
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;

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
      success_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/gallery?credits=success&package=${pkg}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/gallery?credits=cancelled`,
      metadata: {
        type: 'gallery_credits',
        package: pkg,
        credits: String(pricing.credits),
        visitorId: String(visitorId),
        eventId: String(eventId),
      },
    });

    // Apply credits immediately (Stripe webhook can reconcile later if payment fails)
    // For production, move this to a webhook handler for checkout.session.completed
    const visitor = await GalleryVisitor.findByPk(visitorId);
    if (visitor) {
      if (pkg === 'vip') {
        await visitor.update({ isVip: true });
      } else {
        await visitor.update({ enhancementCredits: visitor.enhancementCredits + pricing.credits });
      }
    }

    return res.json({ success: true, checkoutUrl: session.url });
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

    const donationAmount = parseFloat(amount) || 0;

    if (method === 'stripe' && donationAmount < 0.50) {
      return res.status(400).json({ success: false, error: 'Stripe minimum is $0.50' });
    }

    if (method === 'stripe') {
      // Create Stripe Checkout session
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({ success: false, error: 'Payment processing not configured' });
      }

      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeKey);

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
        success_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/gallery?donation=success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/gallery?donation=cancelled`,
        metadata: {
          type: 'gallery_donation',
          visitorId: String(visitorId),
          eventId: String(eventId),
        },
      });

      // Record donation
      await GalleryDonation.create({
        visitorId,
        eventId,
        amount: donationAmount,
        method: 'stripe',
        stripePaymentId: session.id,
      });

      return res.json({ success: true, checkoutUrl: session.url });
    }

    if (method === 'venmo') {
      // Venmo through Stripe (if available on account)
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({ success: false, error: 'Payment processing not configured' });
      }

      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeKey);

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
        success_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/gallery?donation=success`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/gallery?donation=cancelled`,
        metadata: {
          type: 'gallery_donation',
          visitorId: String(visitorId),
          eventId: String(eventId),
        },
      });

      await GalleryDonation.create({
        visitorId,
        eventId,
        amount: donationAmount,
        method: 'venmo',
        stripePaymentId: session.id,
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

/**
 * POST /api/gallery/referral
 * Submit an optional PT referral
 */
router.post('/referral', requireGalleryAccess, async (req, res) => {
  try {
    const { referralName, referralPhone, referralEmail } = req.body;

    if (!referralName || !referralPhone) {
      return res.status(400).json({ success: false, error: 'Referral name and phone are required' });
    }

    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;

    const referral = await GalleryReferral.create({
      visitorId,
      eventId,
      referralName: referralName.trim(),
      referralPhone: referralPhone.trim(),
      referralEmail: referralEmail?.trim() || null,
    });

    // Award 5 enhancement credits for the referral
    const visitor = await GalleryVisitor.findByPk(visitorId);
    if (visitor) {
      await visitor.update({ enhancementCredits: visitor.enhancementCredits + 5 });
    }

    return res.json({
      success: true,
      message: 'Thank you for the referral! You earned 5 enhancement credits.',
      referralId: referral.id,
      creditsAwarded: 5,
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
      const accessToken = jwt.sign(
        { id: userId, role: existingUser.role, tokenType: 'access', tokenId: uuidv4() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '3h' }
      );

      // Update last login
      await existingUser.update({ lastLogin: new Date(), lastActive: new Date() });

      // Link gallery visitor to user account
      const visitor = await GalleryVisitor.findByPk(req.galleryAccess.visitorId);
      if (visitor && !visitor.userId) {
        await visitor.update({ userId: existingUser.id });
      }

      logger.info(`[Gallery VIP] Existing user logged in: ${email} (id=${existingUser.id})`);

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
    const accessToken = jwt.sign(
      { id: userId, role: newUser.role, tokenType: 'access', tokenId: uuidv4() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '3h' }
    );

    // Link gallery visitor to new user account
    const visitor = await GalleryVisitor.findByPk(req.galleryAccess.visitorId);
    if (visitor) {
      await visitor.update({ userId: newUser.id });
    }

    logger.info(`[Gallery VIP] New user created: ${email} (id=${newUser.id}, username=${username})`);

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
    const { userId } = req.body;
    const visitorId = req.galleryAccess.visitorId;
    const eventId = req.galleryAccess.eventId;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const frontendUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
    const gallerySlug = req.galleryAccess.slug || '';

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
      success_url: `${frontendUrl}/gallery/${gallerySlug}?vip=success&userId=${userId}`,
      cancel_url: `${frontendUrl}/gallery/${gallerySlug}?vip=cancelled`,
      metadata: {
        userId: String(userId),
        galleryVisitorId: String(visitorId),
        eventId: String(eventId),
        type: 'vip_pt_session',
      },
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
 * Called after successful Stripe payment to activate VIP status.
 * Sets isVip on visitor, links user, and best-effort creates a session credit.
 * Body: { userId }
 */
router.post('/vip-activate', requireGalleryAccess, async (req, res) => {
  try {
    const { userId } = req.body;
    const visitorId = req.galleryAccess.visitorId;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Set VIP status on gallery visitor
    const visitor = await GalleryVisitor.findByPk(visitorId);
    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Gallery visitor not found' });
    }

    await visitor.update({ isVip: true, userId: parseInt(userId, 10) });

    // Best-effort: add 1 available session credit to the user account
    // The orientation is COMPLIMENTARY (0 credits required in session_types)
    // The PT Training Session uses 1 credit
    // So after orientation: 1 session left. After PT: 0 sessions left.
    try {
      const User = getUser();
      const user = await User.findByPk(userId);
      if (user) {
        const currentSessions = user.availableSessions || 0;
        await user.update({ availableSessions: currentSessions + 1 });
        logger.info(`[Gallery VIP] Added 1 session credit to user ${userId} (now ${currentSessions + 1}). Orientation is complimentary (0 credits).`);
      }
    } catch (sessionErr) {
      logger.warn(`[Gallery VIP] Could not add session credit for user ${userId}: ${sessionErr.message}`);
    }

    // Best-effort: try to create a SessionPackage record for tracking
    try {
      const { default: SessionPackage } = await import('../models/SessionPackage.mjs');
      if (SessionPackage) {
        await SessionPackage.findOrCreate({
          where: { name: 'VIP Gallery Package — PT Session + Complimentary Orientation' },
          defaults: {
            name: 'VIP Gallery Package — PT Session + Complimentary Orientation',
            description: '1 PT Training Session credit + 1 Complimentary NASM Orientation (free, 0 credits). After orientation: 1 session remaining for PT.',
            sessionCount: 1,
            price: 175.00,
            duration: 60,
            packageType: 'individual',
            isActive: true,
          },
        });
        logger.info(`[Gallery VIP] SessionPackage record ensured for VIP PT Session`);
      }
    } catch (pkgErr) {
      logger.warn(`[Gallery VIP] Could not create SessionPackage record: ${pkgErr.message}`);
    }

    logger.info(`[Gallery VIP] Activated VIP for visitor ${visitorId}, linked to user ${userId}`);

    return res.json({
      success: true,
      isVip: true,
      message: 'VIP status activated! 1 PT session credit added + 1 complimentary orientation session (free). Schedule your orientation first!',
    });
  } catch (err) {
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

    return res.json({
      success: true,
      messageId: galleryMessage.id,
    });
  } catch (err) {
    logger.error('[Gallery] Message error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

export default router;
