import { Router } from 'express';
import logger from '../utils/logger.mjs';
import {
  buildIngredientExplanation,
  buildProductExplanation,
  buildVideoBriefDraft,
} from '../services/foodScannerExplainService.mjs';

const router = Router();

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

router.post('/explain-product', (req, res) => {
  try {
    const product = productFromBody(req.body);
    if (!product) return res.status(400).json({ success: false, message: 'Product payload is required' });
    return res.status(200).json({ success: true, explanation: buildProductExplanation(product) });
  } catch (error) {
    logger.error('Food scanner explain-product failed:', error);
    return res.status(500).json({ success: false, message: 'Could not explain that product right now' });
  }
});

router.post('/explain-ingredient', (req, res) => {
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

router.post('/video-brief', (req, res) => {
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
