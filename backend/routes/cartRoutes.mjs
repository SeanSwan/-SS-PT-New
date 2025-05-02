// /backend/routes/cartRoutes.mjs

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import User from '../models/User.mjs';
import Stripe from 'stripe';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';

const router = express.Router();

// --- Conditionally initialize Stripe ---
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' // Use a fixed, recent API version
    });
    logger.info('Stripe client initialized successfully.');
  } catch (error) {
      logger.error(`Failed to initialize Stripe: ${error.message}`);
      // stripeClient remains null
  }
} else {
    logger.warn('Stripe client NOT initialized due to missing/invalid API key.');
}
// --- End Conditional Initialization ---

/**
 * GET User's Active Cart
 * GET /api/cart
 * Retrieves the current user's active shopping cart with items
 */
router.get('/', protect, async (req, res) => {
  try {
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

    // Get cart items with storefront item details
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem',
        attributes: ['name', 'description', 'imageUrl', 'type']
      }]
    });

    // Calculate cart total
    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    res.status(200).json({
      id: cart.id,
      status: cart.status,
      items: cartItems,
      total: cartTotal,
      itemCount: cartItems.length
    });
  } catch (error) {
    logger.error('Error fetching cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch shopping cart', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * Add Item to Cart
 * POST /api/cart/add
 * Adds a security service package to the user's cart
 */
router.post('/add', protect, async (req, res) => {
  try {
    const { storefrontItemId, quantity = 1 } = req.body;
    
    if (!storefrontItemId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Storefront item ID is required' 
      });
    }

    // Get the storefront item to check price
    const storeFrontItem = await StorefrontItem.findByPk(storefrontItemId);
    if (!storeFrontItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Security service package not found' 
      });
    }

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

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        storefrontItemId
      }
    });

    if (cartItem) {
      // Update quantity if item exists
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.id,
        storefrontItemId,
        quantity,
        price: storeFrontItem.totalCost || 0 // Use totalCost field if available
      });
    }

    // Get updated cart with items
    const updatedCartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem',
        attributes: ['name', 'description', 'imageUrl', 'type']
      }]
    });

    // Calculate cart total
    const cartTotal = updatedCartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      id: cart.id,
      status: cart.status,
      items: updatedCartItems,
      total: cartTotal,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    logger.error('Error adding item to cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add item to cart', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * Update Cart Item Quantity
 * PUT /api/cart/update/:itemId
 * Updates the quantity of an item in the cart
 */
router.put('/update/:itemId', protect, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be at least 1' 
      });
    }

    // Get the cart item
    const cartItem = await CartItem.findOne({
      where: { id: itemId },
      include: [{
        model: ShoppingCart,
        as: 'shoppingCart',
        where: { 
          userId: req.user.id,
          status: 'active'
        }
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    // Update quantity
    cartItem.quantity = quantity;
    await cartItem.save();

    // Get updated cart with items
    const updatedCartItems = await CartItem.findAll({
      where: { cartId: cartItem.cartId },
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem',
        attributes: ['name', 'description', 'imageUrl', 'type']
      }]
    });

    // Calculate cart total
    const cartTotal = updatedCartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      items: updatedCartItems,
      total: cartTotal,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    logger.error('Error updating cart item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update cart item', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * Remove Item from Cart
 * DELETE /api/cart/remove/:itemId
 * Removes an item from the cart
 */
router.delete('/remove/:itemId', protect, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get the cart item
    const cartItem = await CartItem.findOne({
      where: { id: itemId },
      include: [{
        model: ShoppingCart,
        as: 'shoppingCart',
        where: { 
          userId: req.user.id,
          status: 'active'
        }
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    const cartId = cartItem.cartId;

    // Delete the cart item
    await cartItem.destroy();

    // Get updated cart with items
    const updatedCartItems = await CartItem.findAll({
      where: { cartId },
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem',
        attributes: ['name', 'description', 'imageUrl', 'type']
      }]
    });

    // Calculate cart total
    const cartTotal = updatedCartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      items: updatedCartItems,
      total: cartTotal,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    logger.error('Error removing item from cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove item from cart', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * Clear Cart
 * DELETE /api/cart/clear
 * Removes all items from the user's cart
 */
router.delete('/clear', protect, async (req, res) => {
  try {
    // Find the user's active cart
    const cart = await ShoppingCart.findOne({
      where: { 
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Active cart not found' 
      });
    }

    // Delete all cart items
    await CartItem.destroy({
      where: { cartId: cart.id }
    });

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      items: [],
      total: 0,
      itemCount: 0
    });
  } catch (error) {
    logger.error('Error clearing cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear cart', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * Create Stripe Checkout Session
 * POST /api/cart/checkout
 * Creates a Stripe checkout session for the cart items
 */
router.post('/checkout', protect, async (req, res) => {
  // --- Add check for Stripe client ---
  if (!stripeClient) {
    logger.error('Attempted /api/cart/checkout but Stripe is not enabled/initialized.');
    return res.status(503).json({ // 503 Service Unavailable
      success: false,
      message: 'Payment service is currently unavailable. Please try again later or contact support.',
    });
  }
  // --- End check ---

  try {
    console.log('Creating checkout session for user:', req.user.id);
    
    // Find the user's active cart with all related items using the correct alias "cartItems"
    const cart = await ShoppingCart.findOne({
      where: { 
        userId: req.user.id,
        status: 'active'
      },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem'
        }]
      }]
    });

    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Active cart not found' 
      });
    }

    if (!cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Your cart is empty' 
      });
    }

    console.log(`Found cart with ${cart.cartItems.length} items`);

    // Calculate cart total for metadata
    const cartTotal = cart.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Format line items for Stripe
    const lineItems = cart.cartItems.map(item => {
      const storefrontItem = item.storefrontItem;
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: storefrontItem ? storefrontItem.name : `Package #${item.storefrontItemId}`,
            description: storefrontItem ? storefrontItem.description : 'Security service package'
          },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      };
    });

    // Default frontend URL if environment variable isn't set
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log(`Using frontend URL: ${frontendUrl}`);

    // Retrieve user record for Stripe customer creation
    const userRecord = await User.findByPk(req.user.id);
    if (!userRecord || !userRecord.email) {
      return res.status(400).json({ 
        success: false,
        message: 'User information missing' 
      });
    }

    // Check or create Stripe customer
    let customerId = userRecord.stripeCustomerId;
    if (customerId) {
      try {
        const customer = await stripeClient.customers.retrieve(customerId);
        customerId = customer.id;
      } catch (err) {
        console.log('Previous customer ID invalid, creating new customer');
        customerId = null;
      }
    }
    
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: userRecord.email,
        name: `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim(),
        metadata: {
          userId: userRecord.id
        }
      });
      customerId = customer.id;
      // Update user record asynchronously (non-blocking)
      User.update({ stripeCustomerId: customerId }, { where: { id: userRecord.id } })
        .catch(err => logger.error('Failed to update user with Stripe customer ID:', err));
    }

    // Generate an idempotency key to prevent duplicate checkout sessions
    const idempotencyKey = `cart_${req.user.id}_${Date.now()}`;

    // Create a Stripe checkout session
    const sessionOptions = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${frontendUrl}/checkout/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout/CheckoutCancel`,
      client_reference_id: cart.id.toString(),
      customer: customerId,
      metadata: {
        cartId: cart.id,
        userId: req.user.id,
        totalAmount: cartTotal.toFixed(2),
        itemCount: cart.cartItems.length,
        createdAt: new Date().toISOString()
      },
      // Set session expiration to 30 minutes from now
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60)
    };

    const session = await stripeClient.checkout.sessions.create(sessionOptions, { idempotencyKey });
    logger.info('Stripe session created:', session.id);

    // Update cart with checkout session ID for reference
    await cart.update({
      checkoutSessionId: session.id,
      lastActivityAt: new Date()
    });

    // Return the checkout URL to redirect the user
    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    let errorMessage = 'Failed to create checkout session. Please try again.';
    let statusCode = 500;
    
    if (error.type) {
      switch (error.type) {
        case 'StripeCardError':
          errorMessage = 'Your card was declined';
          statusCode = 400;
          break;
        case 'StripeRateLimitError':
          errorMessage = 'Too many requests to payment processor';
          break;
        case 'StripeInvalidRequestError':
          errorMessage = 'Invalid payment information';
          statusCode = 400;
          break;
        case 'StripeAPIError':
        case 'StripeConnectionError':
          errorMessage = 'Payment service temporarily unavailable';
          break;
        case 'StripeAuthenticationError':
          errorMessage = 'Payment service configuration error';
          logger.error('Stripe authentication failed - check API keys');
          break;
        default:
          if (error.message) {
            errorMessage = `Payment error: ${error.message.split('.')[0]}`;
          }
      }
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Webhook handler for Stripe events
 * POST /api/cart/webhook
 * Processes async events from Stripe (payment confirmations, etc.)
 */
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  // --- Add check for Stripe client ---
  if (!stripeClient) {
    logger.error('Received Stripe webhook but Stripe is not enabled/initialized.');
    return res.status(503).send('Webhook Error: Payment processing is not configured.');
  }
  // --- End check ---
  
  const signature = req.headers['stripe-signature'];
  
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('Missing Stripe webhook signature or secret');
    return res.status(400).send('Webhook Error: Missing signature or configuration');
  }
  
  let event;
  
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Payment was successful
        const session = event.data.object;
        
        if (session.payment_status === 'paid') {
          const { cartId, userId } = session.metadata;
          
          if (cartId && userId) {
            // Update cart status to completed
            await ShoppingCart.update(
              { 
                status: 'completed',
                paymentStatus: 'paid', 
                completedAt: new Date()
              },
              { where: { id: cartId, userId } }
            );
            
            // Additional processing can be added here (e.g., create order record)
            logger.info(`✅ Payment completed for cart ${cartId} (User: ${userId})`);
          }
        }
        break;
      }
      
      case 'checkout.session.expired': {
        // Checkout session expired without payment
        const session = event.data.object;
        const { cartId } = session.metadata;
        
        if (cartId) {
          await ShoppingCart.update(
            { checkoutSessionExpired: true },
            { where: { id: cartId } }
          );
          logger.info(`⚠️ Checkout session expired for cart ${cartId}`);
        }
        break;
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    logger.error(`Error processing webhook event: ${err.message}`);
    res.status(500).send(`Webhook processing error: ${err.message}`);
  }
});

// DELETE the /api/cart/checkout/success route - It's insecure
// The backend should rely SOLELY on the 'checkout.session.completed' webhook event
// to fulfill orders/update status, not a redirect from the frontend.

export default router;
