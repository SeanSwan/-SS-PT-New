// backend/routes/cartRoutes.js
import express from 'express';
import ShoppingCart from '../models/ShoppingCart.js';
import CartItem from '../models/CartItem.js';

const router = express.Router();

/**
 * GET /api/cart/:userId
 * Retrieves the active shopping cart for a user.
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{ model: CartItem, as: 'items' }],
    });
    if (!cart) {
      // If no active cart exists, create one.
      cart = await ShoppingCart.create({ userId, status: 'active' });
    }
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error.message);
    res.status(500).json({ message: 'Server error fetching cart.' });
  }
});

/**
 * POST /api/cart/:userId/add
 * Adds an item to the user's cart.
 */
router.post('/:userId/add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { storefrontItemId, quantity, price } = req.body;
    // Retrieve or create an active cart.
    let cart = await ShoppingCart.findOne({ where: { userId, status: 'active' } });
    if (!cart) {
      cart = await ShoppingCart.create({ userId, status: 'active' });
    }
    // Create a new CartItem.
    const newItem = await CartItem.create({
      cartId: cart.id,
      storefrontItemId,
      quantity,
      price,
    });
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item to cart:', error.message);
    res.status(500).json({ message: 'Server error adding item to cart.' });
  }
});

/**
 * DELETE /api/cart/:userId/item/:itemId
 * Removes an item from the user's cart.
 */
router.delete('/:userId/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await CartItem.destroy({ where: { id: itemId } });
    res.json({ message: 'Item removed from cart.' });
  } catch (error) {
    console.error('Error removing item from cart:', error.message);
    res.status(500).json({ message: 'Server error removing item from cart.' });
  }
});

export default router;
