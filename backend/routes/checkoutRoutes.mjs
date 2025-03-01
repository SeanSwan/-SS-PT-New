// backend/routes/checkoutRoutes.mjs
import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';

const router = express.Router();

// Retrieve the Stripe secret key from environment variables.
const stripeApiKey = process.env.STRIPE_SECRET_KEY;

if (!stripeApiKey) {
  throw new Error(
    "STRIPE_SECRET_KEY environment variable is not set. Please set it in your .env file."
  );
}

// Initialize Stripe with your secret key and set the API version.
const stripe = new Stripe(stripeApiKey, { apiVersion: '2022-11-15' });

/**
 * POST /api/checkout/create-session
 * Creates a Stripe checkout session for the user's active shopping cart.
 * Expects { userId } in the request body.
 */
router.post('/create-session', async (req, res) => {
  try {
    const { userId } = req.body;

    // Retrieve the active shopping cart along with its items.
    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{ model: CartItem, as: 'items' }],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // Build line items for the Stripe checkout session.
    const line_items = cart.items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          // Replace with your actual product name if available.
          name: `Product #${item.storefrontItemId}`,
        },
        unit_amount: Math.round(item.price * 100), // Convert dollars to cents.
      },
      quantity: item.quantity,
    }));

    // Create the Stripe checkout session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_ORIGINS.split(',')[0]}/checkout-success`,
      cancel_url: `${process.env.FRONTEND_ORIGINS.split(',')[0]}/checkout-cancel`,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Server error creating checkout session.' });
  }
});

export default router;
