/**
 * Client Progress API Routes
 * ==========================
 *
 * Endpoints for client progress summaries and measurement history.
 */
import express from 'express';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
import {
  getClientProgress,
  getMeasurementHistory,
  createMeasurement
} from '../controllers/clientProgressController.mjs';

const router = express.Router();

router.get('/:userId/progress', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getClientProgress);
router.get('/:userId/measurements', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getMeasurementHistory);
router.post('/:userId/measurements', protect, trainerOrAdminOnly, verifyClientAccessByUserId({ paramName: 'userId' }), createMeasurement);

export default router;
