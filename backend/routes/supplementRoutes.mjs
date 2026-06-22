/**
 * ============================================================================
 * FILE: supplementRoutes.mjs
 * PURPOSE: REST API for supplement catalog, gap analysis, and recommendations
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exposes supplement catalog (public), nutrition gap
 * analysis (auth required), and Sean's picks. FTC disclosure included in
 * every response that contains affiliate links.
 *
 * HOW IT FITS IN THE APP: NutritionWorkspace → SupplementsTab → these routes
 * KEY DECISIONS: Gap analysis requires auth (reads user's macro logs).
 *   Catalog is public (no PII involved).
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.mjs';
import {
  getCategories,
  getProducts,
  getProduct,
  getSeansPicks,
  analyzeNutritionGaps,
} from '../services/supplementService.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

const FTC_DISCLOSURE = 'This page contains affiliate links. SwanStudios may earn a commission on purchases made through these links at no additional cost to you. All recommendations are based on genuine trainer experience and NASM-aligned nutrition science.';
const DAYS_QUERY_PATTERN = /^[1-9]\d*$/;

const parseGapDays = (value) => {
  if (value === undefined) return 7;
  if (typeof value !== 'string' || !DAYS_QUERY_PATTERN.test(value.trim())) return null;

  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) ? Math.min(Math.max(parsed, 1), 90) : null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Public Routes (no auth needed)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/supplements/categories
 * Returns all supplement categories with icons and descriptions.
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: getCategories(),
    ftcDisclosure: FTC_DISCLOSURE,
  });
});

/**
 * GET /api/supplements/products?category=protein
 * Returns supplement catalog, optionally filtered by category.
 */
router.get('/products', (req, res) => {
  const { category } = req.query;
  const products = getProducts(category || null);
  res.json({
    success: true,
    products,
    count: products.length,
    ftcDisclosure: FTC_DISCLOSURE,
  });
});

/**
 * GET /api/supplements/picks
 * Returns Sean's handpicked recommendations.
 */
router.get('/picks', (req, res) => {
  res.json({
    success: true,
    picks: getSeansPicks(),
    ftcDisclosure: FTC_DISCLOSURE,
  });
});

/**
 * GET /api/supplements/product/:id
 * Returns a single supplement by ID.
 */
router.get('/product/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Supplement not found' });
  }
  res.json({
    success: true,
    product,
    ftcDisclosure: FTC_DISCLOSURE,
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Auth-Required Routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/supplements/gaps?days=7
 * Analyzes user's macro logs and identifies nutritional gaps.
 * Returns gap list with severity and supplement recommendations.
 */
router.get('/gaps', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseGapDays(req.query.days);
    if (!days) {
      return res.status(400).json({ success: false, message: 'Invalid days' });
    }

    const result = await analyzeNutritionGaps(userId, days);

    // Enrich gaps with full supplement details
    for (const gap of result.gaps) {
      if (gap.suggestedSupplements) {
        gap.suggestedProducts = gap.suggestedSupplements
          .map(id => getProduct(id))
          .filter(Boolean);
      }
    }

    res.json({
      success: true,
      ...result,
      ftcDisclosure: FTC_DISCLOSURE,
      fdaDisclaimer: 'These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease. Consult your healthcare provider before starting any supplement regimen.',
    });
  } catch (err) {
    logger.error('[SupplementRoutes] Gap analysis error:', err);
    res.status(500).json({ success: false, message: 'Failed to analyze nutrition gaps' });
  }
});

export default router;
