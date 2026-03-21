/**
 * calculatorRoutes.mjs
 * ─────────────────────────────────────────────────────────────
 * NASM Calculator API routes for the SwanStudios platform.
 *
 * Provides 6 NASM-aligned calculator endpoints:
 *   POST /api/calculators/tdee          → Calorie/TDEE calculator
 *   POST /api/calculators/body-fat      → Body fat % (Navy method)
 *   POST /api/calculators/bmi           → Body Mass Index
 *   POST /api/calculators/1rm           → 1-rep max (Brzycki)
 *   GET  /api/calculators/1rm-chart/:w  → Full 1RM conversion chart
 *   POST /api/calculators/target-weight → Intensity % → weight (CEO ruling)
 *
 * All routes: auth required, numeric input validated, bounded ranges.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.mjs';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateBodyFat,
  calculateBMI,
  calculate1RM_Brzycki,
  calculateTargetWeight,
  generate1RMChart,
} from '../utils/calculators.mjs';

const router = express.Router();

// Calculator rate limiter — 60 requests per 15 minutes per IP
const calculatorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Too many calculator requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All calculator routes require authentication + rate limiting
router.use(protect);
router.use(calculatorLimiter);

// ─── Input Validation Helpers ────────────────────────────────

/**
 * Coerce value to finite positive number, or return null.
 * Prevents NaN propagation, Infinity, and type coercion attacks.
 */
function toPositiveNum(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNum(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate required fields are present and numeric within bounds.
 * Returns { valid: true, values } or { valid: false, error }.
 */
function validateNumericFields(body, specs) {
  const values = {};
  for (const { field, min, max, required } of specs) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === '') {
      if (required) return { valid: false, error: `Missing required field: ${field}` };
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return { valid: false, error: `${field} must be a number` };
    if (min !== undefined && n < min) return { valid: false, error: `${field} must be >= ${min}` };
    if (max !== undefined && n > max) return { valid: false, error: `${field} must be <= ${max}` };
    values[field] = n;
  }
  return { valid: true, values };
}

// ─── TDEE / Calorie Calculator ──────────────────────────────

router.post('/tdee', (req, res) => {
  try {
    const { sex, activityLevel, goal } = req.body;
    const check = validateNumericFields(req.body, [
      { field: 'weightLbs', min: 50, max: 1000, required: true },
      { field: 'heightIn', min: 36, max: 108, required: true },
      { field: 'age', min: 13, max: 120, required: true },
    ]);
    if (!check.valid) return res.status(400).json({ success: false, error: check.error });

    if (!sex || !['male', 'female'].includes(sex.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'sex must be "male" or "female"' });
    }
    const validLevels = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'];
    if (!activityLevel || !validLevels.includes(activityLevel)) {
      return res.status(400).json({ success: false, error: `activityLevel must be one of: ${validLevels.join(', ')}` });
    }

    const bmr = calculateBMR(check.values.weightLbs, check.values.heightIn, check.values.age, sex);
    const tdee = calculateTDEE(bmr, activityLevel);
    const result = { bmr, tdee };

    if (goal && ['lose', 'maintain', 'gain'].includes(goal)) {
      result.macros = calculateMacros(tdee, goal);
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ─── Body Fat Calculator ────────────────────────────────────

router.post('/body-fat', (req, res) => {
  try {
    const { sex, unit = 'in' } = req.body;
    const maxVal = unit === 'cm' ? 300 : 120;
    const check = validateNumericFields(req.body, [
      { field: 'waist', min: 10, max: maxVal, required: true },
      { field: 'neck', min: 5, max: maxVal, required: true },
      { field: 'height', min: 30, max: maxVal, required: true },
      { field: 'hip', min: 10, max: maxVal, required: false },
    ]);
    if (!check.valid) return res.status(400).json({ success: false, error: check.error });

    if (!sex || !['male', 'female'].includes(sex.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'sex must be "male" or "female"' });
    }
    if (!['in', 'cm'].includes(unit)) {
      return res.status(400).json({ success: false, error: 'unit must be "in" or "cm"' });
    }

    const bodyFatPct = calculateBodyFat(
      { waist: check.values.waist, neck: check.values.neck, height: check.values.height, hip: check.values.hip },
      unit,
      sex,
    );

    return res.json({ success: true, data: { bodyFatPct, unit, sex } });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ─── BMI Calculator ─────────────────────────────────────────

router.post('/bmi', (req, res) => {
  try {
    const { unit = 'imperial' } = req.body;
    if (!['imperial', 'metric'].includes(unit)) {
      return res.status(400).json({ success: false, error: 'unit must be "imperial" or "metric"' });
    }

    const check = validateNumericFields(req.body, [
      { field: 'weight', min: 20, max: 1500, required: true },
      { field: 'height', min: unit === 'metric' ? 50 : 24, max: unit === 'metric' ? 300 : 108, required: true },
    ]);
    if (!check.valid) return res.status(400).json({ success: false, error: check.error });

    const result = calculateBMI(check.values.weight, check.values.height, unit);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ─── 1RM Calculator (Brzycki) ───────────────────────────────

router.post('/1rm', (req, res) => {
  try {
    const check = validateNumericFields(req.body, [
      { field: 'weight', min: 1, max: 2000, required: true },
      { field: 'reps', min: 1, max: 30, required: true },
    ]);
    if (!check.valid) return res.status(400).json({ success: false, error: check.error });

    const estimated1RM = calculate1RM_Brzycki(check.values.weight, check.values.reps);
    const chart = generate1RMChart(estimated1RM);

    return res.json({ success: true, data: { estimated1RM, chart } });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ─── 1RM Conversion Chart ───────────────────────────────────

router.get('/1rm-chart/:weight', (req, res) => {
  try {
    const weight = toPositiveNum(req.params.weight);
    if (!weight || weight > 2000) {
      return res.status(400).json({ success: false, error: 'weight must be a number between 1 and 2000' });
    }

    const chart = generate1RMChart(weight);
    return res.json({ success: true, data: { oneRM: weight, chart } });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ─── Target Weight Calculator (backend-only, CEO ruling) ────

router.post('/target-weight', (req, res) => {
  try {
    const check = validateNumericFields(req.body, [
      { field: 'user1RM', min: 0, max: 2000, required: false },
      { field: 'targetIntensity', min: 1, max: 100, required: true },
    ]);
    if (!check.valid) return res.status(400).json({ success: false, error: check.error });

    const targetWeight = calculateTargetWeight(
      check.values.user1RM ?? null,
      check.values.targetIntensity,
    );

    return res.json({
      success: true,
      data: {
        targetWeight,
        user1RM: check.values.user1RM ?? null,
        targetIntensity: check.values.targetIntensity,
        note: targetWeight === null
          ? 'Client 1RM not established — require assessment session'
          : `${check.values.targetIntensity}% of ${check.values.user1RM}lb 1RM = ${targetWeight}lbs`,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
