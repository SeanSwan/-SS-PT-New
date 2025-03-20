// /backend/routes/cartRoutes.mjs

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import User from '../models/User.mjs';
import stripe from 'stripe';

const router = express.Router();
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

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
    const cartTotal = cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    res.status(200).json({
      id: cart.id,
      status: cart.status,
      items: cartItems,  // Note: We keep this as 'items' in the response JSON since this is the API contract
      total: cartTotal,
      itemCount: cartItems.length
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Failed to fetch shopping cart', error: error.message });
  }
});

/**
 * Add Item to Cart
 * POST /api/cart/add
 * Adds a training package to the user's cart
 */
router.post('/add', protect, async (req, res) => {
  try {
    const { storefrontItemId, quantity = 1 } = req.body;
    
    if (!storefrontItemId) {
      return res.status(400).json({ message: 'Storefront item ID is required' });
    }

    // Get the storefront item to check price
    const storeFrontItem = await StorefrontItem.findByPk(storefrontItemId);
    if (!storeFrontItem) {
      return res.status(404).json({ message: 'Training package not found' });
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
        price: storeFrontItem.price
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
    const cartTotal = updatedCartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    res.status(200).json({
      message: 'Item added to cart',
      id: cart.id,
      status: cart.status,
      items: updatedCartItems,  // Note: We keep this as 'items' in the response JSON
      total: cartTotal,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ message: 'Failed to add item to cart', error: error.message });
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
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Get the cart item - UPDATED: 'cart' changed to 'shoppingCart'
    const cartItem = await CartItem.findOne({
      where: { id: itemId },
      include: [{
        model: ShoppingCart,
        as: 'shoppingCart',  // CHANGED from 'cart' to 'shoppingCart'
        where: { 
          userId: req.user.id,
          status: 'active'
        }
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
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
    const cartTotal = updatedCartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    res.status(200).json({
      message: 'Cart updated',
      items: updatedCartItems,  // Note: We keep this as 'items' in the response JSON
      total: cartTotal,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ message: 'Failed to update cart item', error: error.message });
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

    // Get the cart item - UPDATED: 'cart' changed to 'shoppingCart'
    const cartItem = await CartItem.findOne({
      where: { id: itemId },
      include: [{
        model: ShoppingCart,
        as: 'shoppingCart',  // CHANGED from 'cart' to 'shoppingCart'
        where: { 
          userId: req.user.id,
          status: 'active'
        }
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
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
    const cartTotal = updatedCartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    res.status(200).json({
      message: 'Item removed from cart',
      items: updatedCartItems,  // Note: We keep this as 'items' in the response JSON
      total: cartTotal,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Failed to remove item from cart', error: error.message });
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
      return res.status(404).json({ message: 'Active cart not found' });
    }

    // Delete all cart items
    await CartItem.destroy({
      where: { cartId: cart.id }
    });

    res.status(200).json({
      message: 'Cart cleared',
      items: [],  // Note: We keep this as 'items' in the response JSON
      total: 0,
      itemCount: 0
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Failed to clear cart', error: error.message });
  }
});

/**
 * Create Stripe Checkout Session
 * POST /api/cart/checkout
 * Creates a Stripe checkout session for the cart items
 */
router.post('/checkout', protect, async (req, res) => {
  try {
    // Find the user's active cart
    const cart = await ShoppingCart.findOne({
      where: { 
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!cart) {
      return res.status(404).json({ message: 'Active cart not found' });
    }

    // Get cart items with storefront item details
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem'
      }]
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Get user data for Stripe customer
    const user = await User.findByPk(req.user.id);

    // Format line items for Stripe
    const lineItems = cartItems.map(item => {
      const storefrontItem = item.storefrontItem;
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: storefrontItem.name,
            description: storefrontItem.description,
            // You can add images if you have them
            // images: [storefrontItem.imageUrl],
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Create a Stripe checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
      client_reference_id: cart.id.toString(),
      customer_email: user.email,
      metadata: {
        cartId: cart.id,
        userId: req.user.id
      }
    });

    res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Failed to create checkout session', error: error.message });
  }
});

/**
 * Handle Successful Checkout
 * POST /api/cart/checkout/success
 * Updates the cart status after successful payment
 */
router.post('/checkout/success', async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // Verify the checkout session with Stripe
    const session = await stripeInstance.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    const cartId = session.metadata.cartId;
    const userId = session.metadata.userId;

    // Update cart status to completed
    await ShoppingCart.update(
      { status: 'completed' },
      { where: { id: cartId, userId } }
    );

    // You might want to create training sessions or update user's balance based on purchased packages
    // This would depend on your business logic

    res.status(200).json({ message: 'Payment completed successfully' });
  } catch (error) {
    console.error('Error handling checkout success:', error);
    res.status(500).json({ message: 'Failed to process successful checkout', error: error.message });
  }
});

export default router;