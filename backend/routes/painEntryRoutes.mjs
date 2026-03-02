/**
 * Pain Entry Routes
 * =================
 * CRUD endpoints for client pain/injury tracking.
 * All routes require authentication. Write operations require admin/trainer role.
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  getClientPainEntries,
  getActivePainEntries,
  createPainEntry,
  updatePainEntry,
  resolvePainEntry,
  deletePainEntry,
} from '../controllers/painEntryController.mjs';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Read routes (admin, trainer, or own client)
router.get('/:userId', getClientPainEntries);
router.get('/:userId/active', getActivePainEntries);

// Write routes (admin/trainer only)
router.post('/:userId', authorize(['admin', 'trainer']), createPainEntry);
router.put('/:userId/:entryId', authorize(['admin', 'trainer']), updatePainEntry);
router.put('/:userId/:entryId/resolve', authorize(['admin', 'trainer']), resolvePainEntry);

// Delete (admin only)
router.delete('/:userId/:entryId', authorize(['admin']), deletePainEntry);

export default router;
