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
import rateLimit from 'express-rate-limit';
import {
  searchScholar,
  searchFitnessNews,
  searchYouTube,
  searchTrends,
} from '../services/serpApiService.mjs';
import logger from '../utils/logger.mjs';

// Oracle-specific rate limiter: 30 requests/minute per IP (protects SerpAPI quota)
const oracleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many Oracle requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const MAX_QUERY_LENGTH = 500;

const router = Router();

// All oracle endpoints require auth (admin/trainer) + rate limiting
router.use(protect);
router.use(authorize(['admin', 'trainer']));
router.use(oracleLimiter);

// ─────────────────────────────────────────────────────────────
// SECTION: Google Scholar — Exercise Science Research
// ─────────────────────────────────────────────────────────────
router.get('/scholar', async (req, res) => {
  try {
    const { q, num } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    if (String(q).length > MAX_QUERY_LENGTH) return res.status(400).json({ success: false, error: 'Query too long' });

    logger.info(`[Oracle] Scholar query by user ${req.user.id}: "${String(q).slice(0, 80)}"`);
    const result = await searchScholar(String(q).slice(0, MAX_QUERY_LENGTH), Math.max(1, Math.min(parseInt(num) || 5, 10)));
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
    if (String(q).length > MAX_QUERY_LENGTH) return res.status(400).json({ success: false, error: 'Query too long' });

    logger.info(`[Oracle] News query by user ${req.user.id}: "${String(q).slice(0, 80)}"`);
    const result = await searchFitnessNews(String(q).slice(0, MAX_QUERY_LENGTH), Math.max(1, Math.min(parseInt(num) || 8, 15)));
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
    if (String(q).length > MAX_QUERY_LENGTH) return res.status(400).json({ success: false, error: 'Query too long' });

    logger.info(`[Oracle] YouTube query by user ${req.user.id}: "${String(q).slice(0, 80)}"`);
    const result = await searchYouTube(String(q).slice(0, MAX_QUERY_LENGTH), Math.max(1, Math.min(parseInt(num) || 5, 10)));
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
    if (String(q).length > MAX_QUERY_LENGTH) return res.status(400).json({ success: false, error: 'Query too long' });

    logger.info(`[Oracle] Trends query by user ${req.user.id}: "${String(q).slice(0, 80)}"`);
    const result = await searchTrends(String(q).slice(0, MAX_QUERY_LENGTH));
    if (!result.ok) return res.status(502).json({ success: false, error: result.error });

    return res.json({ success: true, trends: result.data, fromCache: result.fromCache });
  } catch (err) {
    logger.error('[Oracle] Trends endpoint error:', err.message);
    return res.status(500).json({ success: false, error: 'Trends search failed' });
  }
});

export default router;
