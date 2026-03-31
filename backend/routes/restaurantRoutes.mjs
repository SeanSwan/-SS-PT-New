/**
 * ============================================================================
 * FILE: restaurantRoutes.mjs
 * PURPOSE: Restaurant & food search API endpoints using FatSecret
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * Endpoints:
 *   GET  /api/restaurant/search?q=chipotle+bowl&page=0  - Search foods/restaurants
 *   GET  /api/restaurant/food/:id                       - Get detailed nutrition
 *   GET  /api/restaurant/autocomplete?q=chipo           - Autocomplete suggestions
 *   GET  /api/restaurant/status                         - API configuration status
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { searchFoods, getFoodDetails, autocomplete, isFatSecretConfigured } from '../services/fatSecretService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
router.use(protect);

// ── Security constants ──
const MAX_QUERY_LENGTH = 200;
const sanitizeQuery = (q) => {
  if (!q || typeof q !== 'string') return '';
  return q.trim().substring(0, MAX_QUERY_LENGTH).replace(/[<>{}]/g, '');
};

/**
 * GET /api/restaurant/status
 * Check if FatSecret API is configured
 */
router.get('/status', (_req, res) => {
  res.json({
    success: true,
    configured: isFatSecretConfigured(),
    provider: 'FatSecret Platform API',
  });
});

/**
 * GET /api/restaurant/search?q=query&page=0&limit=20
 * Search for restaurant foods, brand foods, and generic foods
 */
router.get('/search', async (req, res) => {
  try {
    const query = sanitizeQuery(req.query.q);
    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
    }

    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const result = await searchFoods(query, page, limit);

    return res.json({
      success: true,
      query,
      ...result,
    });
  } catch (err) {
    logger.error('[RestaurantRoutes] Search error:', err.message);
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/**
 * GET /api/restaurant/food/:id
 * Get detailed nutrition facts for a specific food item
 */
router.get('/food/:id', async (req, res) => {
  try {
    const foodId = req.params.id;
    if (!foodId || !/^\d+$/.test(foodId)) {
      return res.status(400).json({ success: false, error: 'Invalid food ID' });
    }

    const food = await getFoodDetails(foodId);
    if (!food) {
      return res.status(404).json({ success: false, error: 'Food not found' });
    }

    return res.json({ success: true, food });
  } catch (err) {
    logger.error('[RestaurantRoutes] Food detail error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get food details' });
  }
});

/**
 * GET /api/restaurant/autocomplete?q=chipo
 * Get autocomplete suggestions for food search
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const query = sanitizeQuery(req.query.q);
    if (!query || query.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await autocomplete(query);
    return res.json({ success: true, suggestions });
  } catch (err) {
    logger.error('[RestaurantRoutes] Autocomplete error:', err.message);
    return res.json({ success: true, suggestions: [] });
  }
});

export default router;
