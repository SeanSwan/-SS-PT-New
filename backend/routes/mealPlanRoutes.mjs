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
import { generateMealPlan, getGolfPresets, getGolfPreset } from '../services/mealPlanService.mjs';
import { analyzeMealPhoto } from '../services/foodPhotoService.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

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
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { calories, protein, carbs, fat, restrictions, healthConditions, activityType, optPhase } = req.body;

    if (!calories || calories < 800 || calories > 6000) {
      return res.status(400).json({ success: false, message: 'Calories must be between 800 and 6000' });
    }

    const plan = await generateMealPlan({
      calories: parseInt(calories),
      protein: protein ? parseInt(protein) : undefined,
      carbs: carbs ? parseInt(carbs) : undefined,
      fat: fat ? parseInt(fat) : undefined,
      restrictions: Array.isArray(restrictions) ? restrictions : [],
      healthConditions: Array.isArray(healthConditions) ? healthConditions : [],
      activityType: activityType || 'general fitness',
      optPhase: optPhase || 'Phase 1 — Stabilization',
    });

    res.json({ success: true, plan });
  } catch (err) {
    logger.error('[MealPlanRoutes] Generate error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Meal plan generation failed' });
  }
});

/**
 * POST /api/meal-plans/analyze-photo
 * Analyzes a meal photo using Gemini Vision.
 * Multipart form: file (image)
 */
router.post('/analyze-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded. Send an image as "photo" field.' });
    }

    const result = await analyzeMealPhoto(req.file.buffer, req.file.mimetype);
    res.json({ success: true, analysis: result });
  } catch (err) {
    logger.error('[MealPlanRoutes] Photo analysis error:', err.message);
    const status = err.message?.includes('not configured') ? 503 : 500;
    res.status(status).json({ success: false, message: err.message || 'Photo analysis failed' });
  }
});

export default router;
