/**
 * ============================================================================
 * FILE: oracleRoutes.mjs
 * PURPOSE: Swan Oracle REST API — fitness content feeds via SerpAPI
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: 4 endpoints for Google Scholar, News, YouTube, Trends.
 * All results are fitness-scoped — no politics or general news.
 *
 * HOW IT FITS IN THE APP: Frontend widgets → oracleRoutes → serpApiService → SerpAPI
 *
 * ENDPOINTS:
 *   GET /api/oracle/scholar?q=squat+biomechanics&num=5
 *   GET /api/oracle/news?q=NASM+certification&num=8
 *   GET /api/oracle/youtube?q=deadlift+form&num=5
 *   GET /api/oracle/trends?q=personal+training
 */

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import {
  searchScholar,
  searchFitnessNews,
  searchYouTube,
  searchTrends,
} from '../services/serpApiService.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

// All oracle endpoints require authentication (admin or trainer)
router.use(protect);
router.use(authorize(['admin', 'trainer']));

// ─────────────────────────────────────────────────────────────
// SECTION: Google Scholar — Exercise Science Research
// ─────────────────────────────────────────────────────────────
router.get('/scholar', async (req, res) => {
  try {
    const { q, num } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });

    const result = await searchScholar(q, Math.max(1, Math.min(parseInt(num) || 5, 10)));
    if (!result.ok) return res.status(502).json({ success: false, error: result.error });

    return res.json({ success: true, articles: result.data, fromCache: result.fromCache });
  } catch (err) {
    logger.error('[Oracle] Scholar endpoint error:', err.message);
    return res.status(500).json({ success: false, error: 'Scholar search failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Google News — Fitness News Only
// ─────────────────────────────────────────────────────────────
router.get('/news', async (req, res) => {
  try {
    const { q, num } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });

    const result = await searchFitnessNews(q, Math.max(1, Math.min(parseInt(num) || 8, 15)));
    if (!result.ok) return res.status(502).json({ success: false, error: result.error });

    return res.json({ success: true, articles: result.data, fromCache: result.fromCache });
  } catch (err) {
    logger.error('[Oracle] News endpoint error:', err.message);
    return res.status(500).json({ success: false, error: 'News search failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: YouTube — Training Videos
// ─────────────────────────────────────────────────────────────
router.get('/youtube', async (req, res) => {
  try {
    const { q, num } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });

    const result = await searchYouTube(q, Math.max(1, Math.min(parseInt(num) || 5, 10)));
    if (!result.ok) return res.status(502).json({ success: false, error: result.error });

    return res.json({ success: true, videos: result.data, fromCache: result.fromCache });
  } catch (err) {
    logger.error('[Oracle] YouTube endpoint error:', err.message);
    return res.status(500).json({ success: false, error: 'YouTube search failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Google Trends — Fitness Market Intelligence
// ─────────────────────────────────────────────────────────────
router.get('/trends', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });

    const result = await searchTrends(q);
    if (!result.ok) return res.status(502).json({ success: false, error: result.error });

    return res.json({ success: true, trends: result.data, fromCache: result.fromCache });
  } catch (err) {
    logger.error('[Oracle] Trends endpoint error:', err.message);
    return res.status(500).json({ success: false, error: 'Trends search failed' });
  }
});

export default router;
