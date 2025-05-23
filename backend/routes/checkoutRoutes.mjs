// backend/routes/checkoutRoutes.mjs
import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import mockCheckoutService from '../services/mockCheckoutService.mjs';

const router = express.Router();

// --- Conditionally initialize Stripe ---
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' // Use a fixed, recent API version
    });
    logger.info('Stripe client initialized successfully in checkoutRoutes.');
  } catch (error) {
      logger.error(`Failed to initialize Stripe in checkoutRoutes: ${error.message}`);
      // stripeClient remains null
  }
} else {
    logger.warn('Stripe client NOT initialized in checkoutRoutes due to missing/invalid API key. Using mock checkout service instead.');
}
// --- End Conditional Initialization ---

/**
 * POST /checkout
 * Creates a Stripe checkout session for the user's active shopping cart.
 * Uses the authMiddleware to extract userId from token.
 * Returns a checkout URL for redirect.
 */
router.post('/checkout', protect, async (req, res) => {
  try {
    // Extract userId from authenticated request
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User authentication required' 
      });
    }

    // Retrieve the active shopping cart along with its items
    // FIXED: Changed 'items' to 'cartItems' to match setupAssociations.mjs
    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{ 
        model: CartItem, 
        as: 'cartItems', // Changed from 'items' to 'cartItems' to match setupAssociations.mjs
        include: [{ 
          model: StorefrontItem, 
          as: 'storefrontItem' 
        }]
      }]
    });

    // FIXED: Changed cart.items to cart.cartItems to match the association name
    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your cart is empty' 
      });
    }

    // Build line items for the checkout session
    // FIXED: Changed cart.items to cart.cartItems
    const line_items = cart.cartItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.storefrontItem ? item.storefrontItem.name : `Training Package #${item.storefrontItemId}`,
          description: item.storefrontItem ? item.storefrontItem.description : 'Premium training package',
        },
        unit_amount: Math.round(item.price * 100), // Convert dollars to cents
      },
      quantity: item.quantity,
    }));

    // Determine the frontend URLs for success and cancel pages
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Session creation options for both Stripe and mock service
    const sessionOptions = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/CheckoutSuccess`,
      cancel_url: `${baseUrl}/checkout/CheckoutCancel`,
      client_reference_id: userId.toString(),
      metadata: {
        cartId: cart.id.toString()
      }
    };

    // Check if Stripe is available, otherwise use mock service
    let session;
    if (stripeClient) {
      // Use real Stripe service
      session = await stripeClient.checkout.sessions.create(sessionOptions);
      logger.info(`Created Stripe checkout session ${session.id} for user ${userId}`);
    } else {
      // Use mock checkout service
      logger.info(`Using mock checkout service for user ${userId}`);
      session = mockCheckoutService.createSession(sessionOptions);
    }

    // Return the checkout URL to redirect the user
    res.status(200).json({ 
      success: true, 
      checkoutUrl: session.url 
    });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create checkout session. Please try again.' 
    });
  }
});

/**
 * The original create-session route - keeping for backward compatibility
 * Creates a Stripe checkout session with userId provided in the request body.
 */
router.post('/create-session', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Retrieve the active shopping cart along with its items
    // FIXED: Changed 'items' to 'cartItems' to match setupAssociations.mjs
    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{ model: CartItem, as: 'cartItems' }], // Changed from 'items' to 'cartItems'
    });

    // FIXED: Changed cart.items to cart.cartItems
    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // Build line items for the checkout session
    // FIXED: Changed cart.items to cart.cartItems
    const line_items = cart.cartItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Product #${item.storefrontItemId}`,
        },
        unit_amount: Math.round(item.price * 100), // Convert dollars to cents
      },
      quantity: item.quantity,
    }));

    // Determine frontend URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Session creation options
    const sessionOptions = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/CheckoutSuccess`,
      cancel_url: `${baseUrl}/checkout/CheckoutCancel`,
      client_reference_id: userId.toString(),
      metadata: {
        cartId: cart.id.toString()
      }
    };

    // Check if Stripe is available, otherwise use mock service
    let session;
    if (stripeClient) {
      // Use real Stripe service
      session = await stripeClient.checkout.sessions.create(sessionOptions);
      logger.info(`Created Stripe checkout session ${session.id} for user ${userId}`);
    } else {
      // Use mock checkout service
      logger.info(`Using mock checkout service for user ${userId}`);
      session = mockCheckoutService.createSession(sessionOptions);
    }

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Server error creating checkout session.' });
  }
});

export default router;