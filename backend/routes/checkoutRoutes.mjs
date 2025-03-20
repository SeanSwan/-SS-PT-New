// backend/routes/checkoutRoutes.mjs
import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// Retrieve the Stripe secret key from environment variables
const stripeApiKey = process.env.STRIPE_SECRET_KEY;

if (!stripeApiKey) {
  console.error("STRIPE_SECRET_KEY environment variable is not set");
  // Continue execution but log the error
}

// Initialize Stripe with your secret key
const stripe = new Stripe(stripeApiKey, { apiVersion: '2023-10-16' });

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
    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{ 
        model: CartItem, 
        as: 'items',
        include: [{ 
          model: StorefrontItem, 
          as: 'storefrontItem' 
        }]
      }]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your cart is empty' 
      });
    }

    // Build line items for the Stripe checkout session
    const line_items = cart.items.map((item) => ({
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
    
    // Create the Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/CheckoutSuccess`,
      cancel_url: `${baseUrl}/checkout/CheckoutCancel`,
      client_reference_id: userId.toString(),
      metadata: {
        cartId: cart.id.toString()
      }
    });

    // Return the checkout URL to redirect the user to Stripe
    res.status(200).json({ 
      success: true, 
      checkoutUrl: session.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
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
    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{ model: CartItem, as: 'items' }],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // Build line items for the Stripe checkout session
    const line_items = cart.items.map((item) => ({
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
    
    // Create the Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/CheckoutSuccess`,
      cancel_url: `${baseUrl}/checkout/CheckoutCancel`,
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Server error creating checkout session.' });
  }
});

export default router;