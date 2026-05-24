// backend/routes/onboardingRoutes.mjs
import express from 'express';
import {
  createClientOnboarding,
  getClientMasterPrompt,
  createClientSelfOnboarding
} from '../controllers/onboardingController.mjs';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';

const router = express.Router();

/**
 * Onboarding Routes
 * =================
 * POST /api/onboarding - Create/update client with complete master prompt
 * GET /api/onboarding/:userId - Retrieve client's master prompt JSON
 *
 * Authorization:
 * - POST: Admin or Trainer only (protect + authorize)
 * - GET: Admin, assigned trainer, or the client themselves
 */

// POST /api/onboarding/self - Client self-service onboarding
// MUST be registered BEFORE /:userId to avoid param route capture
router.post('/self',
  protect,
  authorize(['client', 'admin']),
  createClientSelfOnboarding
);

// POST /api/onboarding - Create new client onboarding
// Requires: Admin or Trainer role
router.post('/',
  protect,
  authorize(['admin', 'trainer']),
  createClientOnboarding
);

// GET /api/onboarding/:userId - Get client master prompt
// Requires: Authenticated user with client ownership or assignment access
router.get('/:userId',
  protect,
  verifyClientAccessByUserId({ paramName: 'userId' }),
  getClientMasterPrompt
);

export default router;
