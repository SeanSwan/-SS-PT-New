import express from 'express';
import creditsController from '../controllers/creditsController.mjs';
import { protect, adminOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * =============================================================================
 * 💳 Credits Routes
 * =============================================================================
 *
 * Purpose:
 * Routes for instant credit grant with pending payment flow
 *
 * =============================================================================
 */

/**
 * @route   POST /api/admin/credits/purchase-and-grant
 * @desc    Purchase package and grant credits instantly (admin only)
 * @access  Private (Admin only)
 * @body    { clientId, storefrontItemId, quantity, trainerId, leadSource, clientState, absorbTax }
 */
router.post(
  '/admin/credits/purchase-and-grant',
  protect,
  adminOnly,
  creditsController.adminPurchaseAndGrant
);

/**
 * @route   POST /api/trainer/credits/purchase-and-grant
 * @desc    Purchase package and grant credits instantly (trainer for assigned clients)
 * @access  Private (Trainer or Admin)
 * @body    { clientId, storefrontItemId, quantity, leadSource, clientState, absorbTax }
 */
router.post(
  '/trainer/credits/purchase-and-grant',
  protect,
  trainerOrAdminOnly,
  creditsController.trainerPurchaseAndGrant
);

export default router;
