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
  painCheckIn,
  trainerPainDigest,
} from '../controllers/painEntryController.mjs';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Slice 5: trainer digest — MUST mount before the /:userId param routes or
// 'trainer' would be swallowed as a userId (Rule 31 mount-order shadow).
router.get('/trainer/digest', authorize(['admin', 'trainer']), trainerPainDigest);

// Read routes (admin, trainer, or own client)
router.get('/:userId', verifyClientAccessByUserId({ paramName: 'userId' }), getClientPainEntries);
router.get('/:userId/active', verifyClientAccessByUserId({ paramName: 'userId' }), getActivePainEntries);

// Write routes (admin, trainer, or own client — controller enforces ownership)
router.post('/:userId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), createPainEntry);
// Slice 5 (C6): post-workout check-in — asymmetric gate (worse = immediate,
// better = trainer-confirmed) lives in painCheckInService.
router.post('/:userId/check-in', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), painCheckIn);
router.put('/:userId/:entryId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), updatePainEntry);
router.put('/:userId/:entryId/resolve', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), resolvePainEntry);

// Delete (admin only)
router.delete('/:userId/:entryId', authorize(['admin']), verifyClientAccessByUserId({ paramName: 'userId' }), deletePainEntry);

export default router;
