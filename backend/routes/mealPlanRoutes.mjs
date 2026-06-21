/**
 * ============================================================================
 * FILE: mealPlanRoutes.mjs
 * PURPOSE: Routes for AI meal plan generation, food photo analysis, and
 *          golf nutrition presets
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exposes meal plan generation (auth), food photo
 * analysis (auth), and golf presets (public). Photo uploads use multer
 * with 10MB limit.
 *
 * HOW IT FITS IN THE APP: NutritionWorkspace → MealPlanTab → these routes
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.mjs';
import { requireTier } from '../middleware/requireTier.mjs';
import { generateMealPlan, getGolfPresets, getGolfPreset } from '../services/mealPlanService.mjs';
import { analyzeMealPhoto } from '../services/foodPhotoService.mjs';
import { parseNutritionTranscript } from '../services/nutrition/nutritionTranscriptParserService.mjs';
import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const router = Router();
const INTERNAL_ERROR = 'internal_error';
const INVALID_PHOTO_UPLOAD = 'invalid_photo_upload';
const DECIMAL_NUMBER_REGEX = /^\d+(?:\.\d+)?$/;

const sendMealPlanError = (res, status, message, error = INTERNAL_ERROR) => (
  res.status(status).json({ success: false, message, error })
);

const toFiniteDecimalNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_REGEX.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const optionalMealPlanTarget = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = toFiniteDecimalNumber(value);
  return parsed !== null && parsed > 0 ? parsed : undefined;
};

// Multer config for photo uploads (10MB max, images only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// ─────────────────────────────────────────────────────────────
const uploadMealPhoto = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();

    logger.warn('[MealPlanRoutes] Photo upload rejected:', err.message);
    return sendMealPlanError(
      res,
      400,
      'Upload a JPEG, PNG, or WebP image under 10MB.',
      INVALID_PHOTO_UPLOAD
    );
  });
};

// SECTION: Public Routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/meal-plans/golf-presets
 * Returns all golf nutrition presets.
 */
router.get('/golf-presets', (_req, res) => {
  res.json({ success: true, presets: getGolfPresets() });
});

/**
 * GET /api/meal-plans/golf-presets/:id
 * Returns a specific golf preset (pre-round, on-course, post-round, tournament-day).
 */
router.get('/golf-presets/:id', (req, res) => {
  const preset = getGolfPreset(req.params.id);
  if (!preset) {
    return res.status(404).json({ success: false, message: 'Golf preset not found. Valid: pre-round, on-course, post-round, tournament-day' });
  }
  res.json({ success: true, preset });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Auth-Required Routes
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/meal-plans/generate
 * Generates a personalized AI meal plan.
 * Body: { calories, protein, carbs, fat, restrictions[], healthConditions[], activityType, optPhase }
 */
router.post('/generate', authenticateToken, requireTier('pro', 'nutrition.coaching'), async (req, res) => {
  try {
    const { calories, protein, carbs, fat, restrictions, healthConditions, activityType, optPhase } = req.body;
    const calorieTarget = toFiniteDecimalNumber(calories);

    if (calorieTarget === null || calorieTarget < 800 || calorieTarget > 6000) {
      return res.status(400).json({ success: false, message: 'Calories must be between 800 and 6000' });
    }

    const plan = await generateMealPlan({
      calories: calorieTarget,
      protein: optionalMealPlanTarget(protein),
      carbs: optionalMealPlanTarget(carbs),
      fat: optionalMealPlanTarget(fat),
      restrictions: Array.isArray(restrictions) ? restrictions : [],
      healthConditions: Array.isArray(healthConditions) ? healthConditions : [],
      activityType: activityType || 'general fitness',
      optPhase: optPhase || 'Phase 1 — Stabilization',
    });

    res.json({ success: true, plan });
  } catch (err) {
    logger.error('[MealPlanRoutes] Generate error:', err.message);
    return sendMealPlanError(res, 500, 'Meal plan generation failed');
  }
});

/**
 * POST /api/meal-plans/analyze-photo
 * Analyzes a meal photo using Gemini Vision.
 * Multipart form: file (image)
 */
router.post('/analyze-photo', authenticateToken, requireTier('pro', 'nutrition.coaching'), uploadMealPhoto, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded. Send an image as "photo" field.' });
    }

    const result = await analyzeMealPhoto(req.file.buffer, req.file.mimetype);
    res.json({ success: true, analysis: result });
  } catch (err) {
    logger.error('[MealPlanRoutes] Photo analysis error:', err.message);
    const status = err.message?.includes('not configured') ? 503 : 500;
    const message = status === 503
      ? 'Photo analysis is temporarily unavailable'
      : 'Photo analysis failed';
    return sendMealPlanError(res, status, message);
  }
});

/**
 * POST /api/meal-plans/parse-voice
 * Parses a spoken/typed meal description into a REVIEW-READY macro draft. Does NOT
 * write to the DB — the client reviews/edits, then /api/macros saves it (Decision #2,
 * lighter self-serve). RULE 8: the transcript is redacted INSIDE parseNutritionTranscript
 * before any LLM call; the client is never named to the model.
 * Body: { transcript }
 */
router.post('/parse-voice', authenticateToken, requireTier('pro', 'nutrition.coaching'), aiRateLimiter, async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Say a bit more about what you ate so we can log it.' });
    }

    // RULE 8 parity with the workout parser: feed the client's OWN name(s) as redaction
    // hints so a self-spoken name ("I, John, had...") is masked before the transcript
    // reaches the LLM (contextual regex alone misses names outside verb/fitness context).
    // Fail-soft — a DB hiccup must never block logging.
    let nameHints = [];
    try {
      const u = await User.findByPk(req.user?.id, { attributes: ['firstName', 'lastName', 'username'] });
      if (u) {
        const full = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        nameHints = [full, u.username].filter((n) => n && String(n).trim().length >= 3);
      }
    } catch (lookupErr) {
      logger.warn('[MealPlanRoutes] parse-voice name-hint lookup failed (non-fatal):', lookupErr?.message);
      if (req.user?.username && String(req.user.username).length >= 3) nameHints = [req.user.username];
    }

    const draft = await parseNutritionTranscript({
      transcript: transcript.slice(0, 4000),
      clientId: req.user?.id,
      nameHints,
    });

    res.json({ success: true, draft });
  } catch (err) {
    const msg = err?.message || '';
    if (/too short|No meals/i.test(msg)) {
      return res.status(422).json({
        success: false,
        message: 'We could not pick out any foods from that. Try naming what you ate.',
        error: 'no_meals_parsed',
      });
    }
    logger.error('[MealPlanRoutes] Voice nutrition parse error:', msg);
    const status = /not configured|provider/i.test(msg) ? 503 : 500;
    return sendMealPlanError(
      res,
      status,
      status === 503 ? 'Voice meal logging is temporarily unavailable' : 'Could not understand that meal description. Please try again.',
    );
  }
});

export default router;
