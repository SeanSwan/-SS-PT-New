// ============================================================================
// freeApiRoutes.mjs - Public + protected routes for free API integrations
// ============================================================================

import { Router } from 'express';
import { protect } from '../middleware/auth.mjs';
import {
  searchFoods,
  getFoodDetails,
  getNutrition,
  searchExercises,
  getMotivationalQuote,
  getWeather,
} from '../services/freeApiService.mjs';

const router = Router();

const parseFoodSearchPageSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 15;
  return Math.min(Math.max(Math.trunc(parsed), 1), 25);
};

// ---------------------------------------------------------------------------
// Protected routes (require auth)
// ---------------------------------------------------------------------------

// GET /api/free/food-search?q=chicken
router.get('/food-search', protect, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ ok: false, error: 'Missing query parameter "q"' });
  if (q.length > 120) return res.status(400).json({ ok: false, error: 'Food search query is too long' });

  const result = await searchFoods(q, parseFoodSearchPageSize(req.query.pageSize));
  return res.status(result.ok ? 200 : 502).json(result);
});

// GET /api/free/nutrition?q=2 eggs and toast
router.get('/nutrition', protect, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ ok: false, error: 'Missing query parameter "q"' });
  const result = await getNutrition(q);
  return res.status(result.ok ? 200 : 502).json(result);
});

// ---------------------------------------------------------------------------
// Public routes (no auth required)
// ---------------------------------------------------------------------------

// GET /api/free/food/:fdcId
router.get('/food/:fdcId', async (req, res) => {
  const { fdcId } = req.params;
  const result = await getFoodDetails(fdcId);
  return res.status(result.ok ? 200 : 502).json(result);
});

// GET /api/free/exercises?muscle=biceps&type=strength
router.get('/exercises', async (req, res) => {
  const { name, muscle, type } = req.query;
  const result = await searchExercises({ name, muscle, type });
  return res.status(result.ok ? 200 : 502).json(result);
});

// GET /api/free/quote
router.get('/quote', async (_req, res) => {
  const result = await getMotivationalQuote();
  return res.status(result.ok ? 200 : 502).json(result);
});

// GET /api/free/weather?lat=33.8&lon=-117.9
router.get('/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ ok: false, error: 'Missing "lat" and/or "lon" query parameters' });
  const result = await getWeather(Number(lat), Number(lon));
  return res.status(result.ok ? 200 : 502).json(result);
});

export default router;
