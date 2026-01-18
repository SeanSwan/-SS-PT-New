/**
 * Client Progress API Routes
 * ==========================
 *
 * Endpoints for client progress summaries and measurement history.
 */
import express from 'express';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import {
  getClientProgress,
  getMeasurementHistory,
  createMeasurement
} from '../controllers/clientProgressController.mjs';

const router = express.Router();

router.get('/:userId/progress', protect, getClientProgress);
router.get('/:userId/measurements', protect, getMeasurementHistory);
router.post('/:userId/measurements', protect, trainerOrAdminOnly, createMeasurement);

export default router;
