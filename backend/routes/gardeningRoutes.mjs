/**
 * ============================================================================
 * FILE: gardeningRoutes.mjs
 * PURPOSE: REST endpoints for USDA hardiness zone lookup and plant recommendations
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * Endpoints:
 *   GET /api/gardening/zone/:zipCode     — Look up hardiness zone by zip
 *   GET /api/gardening/plants?zone=&...  — Get plant recommendations
 *   GET /api/gardening/filters           — Get available filter options
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { getHardinessZone, getPlantRecommendations, getFilterOptions } from '../services/gardeningService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// ── Security constants ──
const ZIP_REGEX = /^\d{5}$/;

/**
 * GET /api/gardening/zone/:zipCode
 * Look up USDA Plant Hardiness Zone by 5-digit zip code.
 */
router.get('/zone/:zipCode', protect, async (req, res) => {
  try {
    const { zipCode } = req.params;

    if (!ZIP_REGEX.test(zipCode)) {
      return res.status(400).json({ success: false, error: 'Valid 5-digit US zip code required' });
    }

    const zoneData = await getHardinessZone(zipCode);

    if (!zoneData || !zoneData.zone) {
      return res.status(404).json({ success: false, error: 'Zone data not found for this zip code' });
    }

    return res.json({ success: true, ...zoneData });
  } catch (err) {
    logger.error('[GardeningRoutes] Zone lookup error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to look up zone' });
  }
});

/**
 * GET /api/gardening/plants
 * Get plant recommendations for a given zone with optional filters.
 * Query params: zone (required), spaceType, difficulty, category
 */
router.get('/plants', protect, (req, res) => {
  try {
    const { zone, spaceType, difficulty, category } = req.query;

    if (!zone || typeof zone !== 'string') {
      return res.status(400).json({ success: false, error: 'Zone parameter required (e.g., "7b")' });
    }

    // Validate zone format (e.g., "7b", "10a")
    if (!/^\d{1,2}[ab]$/i.test(zone)) {
      return res.status(400).json({ success: false, error: 'Invalid zone format. Expected format: "7b", "10a"' });
    }

    const filters = {};
    if (spaceType && ['indoor', 'balcony', 'outdoor'].includes(spaceType)) {
      filters.spaceType = spaceType;
    }
    if (difficulty && ['easy', 'moderate', 'advanced'].includes(difficulty)) {
      filters.difficulty = difficulty;
    }
    if (category && ['herb', 'vegetable', 'fruit', 'microgreen'].includes(category)) {
      filters.category = category;
    }

    const plants = getPlantRecommendations(zone.toLowerCase(), filters);

    return res.json({
      success: true,
      zone,
      plants,
      count: plants.length,
    });
  } catch (err) {
    logger.error('[GardeningRoutes] Plants lookup error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get plant recommendations' });
  }
});

/**
 * GET /api/gardening/filters
 * Get available filter options for the plant finder.
 */
router.get('/filters', protect, (_req, res) => {
  return res.json({ success: true, filters: getFilterOptions() });
});

export default router;
