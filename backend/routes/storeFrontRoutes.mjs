import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';

const router = express.Router();

/**
 * Get all storefront items
 * GET /api/storefront
 * Public
 */
router.get('/', async (req, res) => {
  try {
    const items = await StorefrontItem.findAll();
    res.json(items);
  } catch (error) {
    console.error('Error fetching storefront items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get a single storefront item
 * GET /api/storefront/:id
 * Public
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching storefront item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Create a new storefront item
 * POST /api/storefront
 * Private/Admin
 */
router.post('/', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const item = await StorefrontItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating storefront item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update a storefront item
 * PUT /api/storefront/:id
 * Private/Admin
 */
router.put('/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    console.error('Error updating storefront item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete a storefront item
 * DELETE /api/storefront/:id
 * Private/Admin
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    await item.destroy();
    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error('Error deleting storefront item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;