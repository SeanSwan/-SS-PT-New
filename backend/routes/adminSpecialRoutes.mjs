import express from 'express';
import {
  listSpecials,
  listActiveSpecials,
  getSpecialById,
  createSpecial,
  updateSpecial,
  deleteSpecial,
  toggleSpecialStatus
} from '../controllers/adminSpecialController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// Public route - active specials
router.get('/active', listActiveSpecials);

// Admin routes
router.get('/', protect, adminOnly, listSpecials);
router.get('/:id', protect, adminOnly, getSpecialById);
router.post('/', protect, adminOnly, createSpecial);
router.put('/:id', protect, adminOnly, updateSpecial);
router.delete('/:id', protect, adminOnly, deleteSpecial);
router.patch('/:id/toggle', protect, adminOnly, toggleSpecialStatus);

export default router;
