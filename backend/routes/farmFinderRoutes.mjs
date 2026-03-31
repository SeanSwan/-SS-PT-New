/**
 * ============================================================================
 * FILE: farmFinderRoutes.mjs
 * PURPOSE: REST endpoints for USDA Farmers Market Directory search
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * Endpoints:
 *   GET /api/farms/search?zip=       — Search markets by zip code
 *   GET /api/farms/nearby?lat=&lng=  — Search markets by coordinates
 *   GET /api/farms/detail/:id        — Get market details by USDA ID
 */
import express from 'express';
import { searchByZip, searchByLocation, getMarketDetail } from '../services/farmFinderService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// ── Security constants ──
const ZIP_REGEX = /^\d{5}$/;

/**
 * GET /api/farms/search?zip=12345
 * Search farmers markets near a zip code.
 */
router.get('/search', async (req, res) => {
  try {
    const { zip } = req.query;

    if (!zip || !ZIP_REGEX.test(zip)) {
      return res.status(400).json({ success: false, error: 'Valid 5-digit US zip code required' });
    }

    const markets = await searchByZip(zip);

    return res.json({
      success: true,
      markets,
      count: markets.length,
    });
  } catch (err) {
    logger.error('[FarmFinderRoutes] Zip search error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to search farmers markets' });
  }
});

/**
 * GET /api/farms/nearby?lat=35.2&lng=-80.8
 * Search farmers markets near coordinates.
 */
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, error: 'Valid lat and lng required' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, error: 'Coordinates out of range' });
    }

    const markets = await searchByLocation(lat, lng);

    return res.json({
      success: true,
      markets,
      count: markets.length,
    });
  } catch (err) {
    logger.error('[FarmFinderRoutes] Location search error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to search nearby markets' });
  }
});

/**
 * GET /api/farms/detail/:id
 * Get detailed information about a specific farmers market.
 */
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, error: 'Valid market ID required' });
    }

    const detail = await getMarketDetail(id);

    if (!detail) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    return res.json({ success: true, market: detail });
  } catch (err) {
    logger.error('[FarmFinderRoutes] Detail error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get market details' });
  }
});

export default router;
