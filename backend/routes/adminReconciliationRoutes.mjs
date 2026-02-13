/**
 * Admin Reconciliation Routes
 * ============================
 * Provides admin-only endpoints for monitoring and fixing
 * payment-to-session attribution issues.
 *
 * Endpoints:
 *   GET /api/admin/reconciliation/report  - View ungranted carts + stats
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { getShoppingCart, getCartItem, getStorefrontItem, getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * GET /api/admin/reconciliation/report
 * Returns counts of ungranted carts, granted carts, and total sessions.
 */
router.get('/report', protect, adminOnly, async (req, res) => {
  try {
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();

    // Count carts by grant status
    const [ungrantedCarts, grantedCarts] = await Promise.all([
      ShoppingCart.findAll({
        where: { status: 'completed', sessionsGranted: false },
        include: [
          {
            model: CartItem,
            as: 'cartItems',
            include: [{ model: StorefrontItem, as: 'storefrontItem' }],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName', 'availableSessions'],
          },
        ],
      }),
      ShoppingCart.count({ where: { status: 'completed', sessionsGranted: true } }),
    ]);

    // Calculate ungranted session totals
    const ungrantedDetails = ungrantedCarts.map(cart => {
      const sessionsOwed = cart.cartItems.reduce((sum, item) => {
        return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
      }, 0);
      return {
        cartId: cart.id,
        userId: cart.userId,
        userEmail: cart.user?.email || 'unknown',
        userName: `${cart.user?.firstName || ''} ${cart.user?.lastName || ''}`.trim(),
        sessionsOwed,
        cartTotal: cart.total,
        completedAt: cart.completedAt,
      };
    });

    const totalSessionsOwed = ungrantedDetails.reduce((sum, d) => sum + d.sessionsOwed, 0);

    res.json({
      success: true,
      data: {
        summary: {
          ungrantedCarts: ungrantedCarts.length,
          grantedCarts,
          totalSessionsOwed,
        },
        ungrantedDetails,
      },
    });

    logger.info(`[Reconciliation] Report generated: ${ungrantedCarts.length} ungranted, ${grantedCarts} granted`);
  } catch (error) {
    logger.error(`[Reconciliation] Report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reconciliation report',
    });
  }
});

export default router;
