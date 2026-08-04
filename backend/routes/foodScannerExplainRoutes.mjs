import { Router } from 'express';
import logger from '../utils/logger.mjs';
import { foodScannerLimiter } from '../middleware/rateLimiter.mjs';
import {
  buildIngredientExplanation,
  buildProductExplanation,
  buildVideoBriefDraft,
} from '../services/foodScannerExplainService.mjs';

const router = Router();

// These endpoints stay PUBLIC on purpose: the /food-scanner page works logged-out
// and its explain calls carry no auth token. They are deterministic template
// generators (no LLM, no DB write), so the exposure is compute only — the shared
// scanner limiter bounds that. Auth lands when the scanner is folded into the
// authenticated workspace (blueprint Phase 4E).
// Per-route, NOT router.use(): this router is mounted at /api/food-scanner ahead
// of the scanner router, so a router-level middleware would also run for every
// scanner request falling through it — double-charging each scan against the
// shared cap (caught by foodScannerSurfaceLockdown.test.mjs).

const productFromBody = (body = {}) => {
  const product = body.product;
  return product && typeof product === 'object' && !Array.isArray(product) ? product : null;
};

const ingredientFromBody = (body = {}) => {
  const ingredient = body.ingredient;
  if (ingredient && typeof ingredient === 'object' && !Array.isArray(ingredient)) return ingredient;
  if (typeof body.ingredientName === 'string' && body.ingredientName.trim()) return { name: body.ingredientName.trim() };
  return null;
};

router.post('/explain-product', foodScannerLimiter, (req, res) => {
  try {
    const product = productFromBody(req.body);
    if (!product) return res.status(400).json({ success: false, message: 'Product payload is required' });
    return res.status(200).json({ success: true, explanation: buildProductExplanation(product) });
  } catch (error) {
    logger.error('Food scanner explain-product failed:', error);
    return res.status(500).json({ success: false, message: 'Could not explain that product right now' });
  }
});

router.post('/explain-ingredient', foodScannerLimiter, (req, res) => {
  try {
    const ingredient = ingredientFromBody(req.body);
    if (!ingredient) return res.status(400).json({ success: false, message: 'Ingredient payload is required' });
    return res.status(200).json({
      success: true,
      explanation: buildIngredientExplanation({ ingredient, product: productFromBody(req.body) || {} }),
    });
  } catch (error) {
    logger.error('Food scanner explain-ingredient failed:', error);
    return res.status(500).json({ success: false, message: 'Could not explain that ingredient right now' });
  }
});

router.post('/video-brief', foodScannerLimiter, (req, res) => {
  try {
    const product = productFromBody(req.body);
    if (!product) return res.status(400).json({ success: false, message: 'Product payload is required' });
    return res.status(200).json({
      success: true,
      videoBrief: buildVideoBriefDraft({ product, ingredient: ingredientFromBody(req.body) }),
    });
  } catch (error) {
    logger.error('Food scanner video-brief failed:', error);
    return res.status(500).json({ success: false, message: 'Could not create that video brief right now' });
  }
});

export default router;
