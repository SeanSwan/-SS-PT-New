// backend/routes/storefrontRoutes.js
import express from 'express';
import StorefrontItem from '../models/StorefrontItem.js';

const router = express.Router();

/**
 * GET /api/storefront/items
 * Retrieves all storefront items.
 *
 * This endpoint is used by the frontend StoreFront component to display available packages.
 */
router.get('/items', async (req, res) => {
  try {
    const items = await StorefrontItem.findAll();
    res.json(items);
  } catch (error) {
    console.error('Error fetching storefront items:', error.message);
    res.status(500).json({ message: 'Server error fetching storefront items.' });
  }
});

/**
 * POST /api/storefront/items
 * Creates a new storefront item.
 *
 * This endpoint can be used by admins to add new products.
 */
router.post('/items', async (req, res) => {
  try {
    const newItem = await StorefrontItem.create(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating storefront item:', error.message);
    res.status(500).json({ message: 'Server error creating storefront item.' });
  }
});

export default router;
