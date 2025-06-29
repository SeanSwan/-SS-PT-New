/**
 * EMERGENCY P0 CHECKOUT FIX - Direct Association Patch
 * ===================================================
 * Simple, production-safe fix that directly patches the cart routes
 * without complex async model imports that may be causing deployment issues.
 */

// /backend/routes/cartRoutes.mjs
// EMERGENCY FIX: Replace the problematic async model imports

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';

// 🚨 EMERGENCY FIX: Direct model imports with association setup
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import User from '../models/User.mjs';

// 🎯 P0 CRITICAL FIX: Ensure associations are established before any queries
const ensureAssociations = () => {
  // Set up the critical association if it doesn't exist
  if (!CartItem.associations || !CartItem.associations.storefrontItem) {
    console.log('🚨 EMERGENCY: Setting up CartItem -> StorefrontItem association directly');
    
    // Establish the associations directly
    CartItem.belongsTo(StorefrontItem, { 
      foreignKey: 'storefrontItemId', 
      as: 'storefrontItem' 
    });
    
    StorefrontItem.hasMany(CartItem, { 
      foreignKey: 'storefrontItemId', 
      as: 'cartItems' 
    });
    
    ShoppingCart.hasMany(CartItem, { 
      foreignKey: 'cartId', 
      as: 'cartItems' 
    });
    
    CartItem.belongsTo(ShoppingCart, { 
      foreignKey: 'cartId', 
      as: 'cart' 
    });
    
    console.log('✅ EMERGENCY: Direct associations established');
  } else {
    console.log('✅ EMERGENCY: Associations already exist');
  }
};

// Call this immediately when the module loads
ensureAssociations();

import Stripe from 'stripe';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import cartHelpers from '../utils/cartHelpers.mjs';
const { updateCartTotals, getCartTotalsWithFallback, debugCartState } = cartHelpers;

const router = express.Router();

// Rest of the cart routes code remains the same...
// But with a critical verification in the GET route

/**
 * GET User's Active Cart
 * GET /api/cart
 * Retrieves the current user's active shopping cart with items
 */
router.get('/', protect, async (req, res) => {
  try {
    // 🚨 EMERGENCY VERIFICATION: Check associations before proceeding
    ensureAssociations();
    
    const hasAssociation = !!CartItem.associations?.storefrontItem;
    console.log('🔍 EMERGENCY DEBUG: Cart GET - Association status:', hasAssociation);
    
    // Find or create the user's active cart
    let [cart, created] = await ShoppingCart.findOrCreate({
      where: { 
        userId: req.user.id,
        status: 'active'
      },
      defaults: {
        userId: req.user.id
      }
    });

    // Get cart items with storefront item details - CRITICAL QUERY
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem',
        attributes: ['id', 'name', 'description', 'imageUrl', 'price', 'totalCost', 'packageType', 'sessions', 'totalSessions'],
        required: false // Make it LEFT JOIN to avoid filtering out items
      }]
    });

    // 🚨 EMERGENCY DEBUG: Log the actual query results
    console.log('🔍 EMERGENCY DEBUG: Cart items found:', cartItems.length);
    if (cartItems.length > 0) {
      const firstItem = cartItems[0];
      console.log('🔍 EMERGENCY DEBUG: First item StorefrontItem data:', {
        hasStorefrontItem: !!firstItem.storefrontItem,
        storefrontItemId: firstItem.storefrontItemId,
        sessions: firstItem.storefrontItem?.sessions,
        totalSessions: firstItem.storefrontItem?.totalSessions,
        name: firstItem.storefrontItem?.name
      });
    }

    // Calculate cart total using helper (with session tracking preparation)
    const { total: cartTotal, totalSessions } = cartHelpers.calculateCartTotals(cartItems);
    
    console.log('🔍 EMERGENCY DEBUG: Calculated totals:', {
      cartTotal,
      totalSessions,
      itemCount: cartItems.length
    });

    res.status(200).json({
      id: cart.id,
      status: cart.status,
      items: cartItems,
      total: cartTotal,
      totalSessions, // Include session count for future dashboard integration
      itemCount: cartItems.length
    });
  } catch (error) {
    console.error('🚨 EMERGENCY ERROR in cart GET:', error);
    logger.error('Error fetching cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch shopping cart', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Export the rest normally
export default router;
