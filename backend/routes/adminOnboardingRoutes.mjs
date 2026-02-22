import express from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import {
  getAdminOnboardingList,
  createBaselineMeasurements,
  getBaselineMeasurementsHistory,
} from '../controllers/clientOnboardingController.mjs';
import {
  saveOrSubmitOnboarding,
  getOnboardingStatus,
  resetOnboarding,
} from '../controllers/adminOnboardingController.mjs';

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

// --- Phase 1B: Per-client onboarding management ---

/** POST /api/admin/clients/:clientId/onboarding — save draft or submit */
router.post('/clients/:clientId/onboarding', saveOrSubmitOnboarding);

/** GET /api/admin/clients/:clientId/onboarding — get onboarding status */
router.get('/clients/:clientId/onboarding', getOnboardingStatus);

/** DELETE /api/admin/clients/:clientId/onboarding — reset to in_progress */
router.delete('/clients/:clientId/onboarding', resetOnboarding);

export default router;
