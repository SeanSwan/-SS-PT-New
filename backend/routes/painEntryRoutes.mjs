/**
 * Pain Entry Routes
 * =================
 * CRUD endpoints for client pain/injury tracking.
 * All routes require authentication. Write operations require admin/trainer role.
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
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
router.get('/:userId', verifyClientAccessByUserId({ paramName: 'userId' }), getClientPainEntries);
router.get('/:userId/active', verifyClientAccessByUserId({ paramName: 'userId' }), getActivePainEntries);

// Write routes (admin, trainer, or own client — controller enforces ownership)
router.post('/:userId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), createPainEntry);
router.put('/:userId/:entryId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), updatePainEntry);
router.put('/:userId/:entryId/resolve', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), resolvePainEntry);

// Delete (admin only)
router.delete('/:userId/:entryId', authorize(['admin']), verifyClientAccessByUserId({ paramName: 'userId' }), deletePainEntry);

export default router;
