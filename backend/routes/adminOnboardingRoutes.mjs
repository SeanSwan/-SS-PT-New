import express from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import {
  getAdminOnboardingList,
  createBaselineMeasurements,
  getBaselineMeasurementsHistory,
} from '../controllers/clientOnboardingController.mjs';

const router = express.Router();

// All admin onboarding routes require authentication and admin/trainer role
router.use(protect);
router.use(authorize(['admin', 'trainer']));

/**
 * GET /api/admin/onboarding
 * Get all client onboarding data for management table
 * Query params: page, limit, package, status, search
 */
router.get('/onboarding', getAdminOnboardingList);

/**
 * POST /api/admin/baseline-measurements
 * Create new baseline measurements record
 */
router.post('/baseline-measurements', createBaselineMeasurements);

/**
 * GET /api/admin/baseline-measurements/:userId
 * Get baseline measurements history for a specific user
 */
router.get('/baseline-measurements/:userId', getBaselineMeasurementsHistory);

export default router;
