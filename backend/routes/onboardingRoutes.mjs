// backend/routes/onboardingRoutes.mjs
import express from 'express';
import {
  createClientOnboarding,
  getClientMasterPrompt,
  createClientSelfOnboarding
} from '../controllers/onboardingController.mjs';
import { protect, authorize } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * Onboarding Routes
 * =================
 * POST /api/onboarding - Create/update client with complete master prompt
 * GET /api/onboarding/:userId - Retrieve client's master prompt JSON
 *
 * Authorization:
 * - POST: Admin or Trainer only (protect + authorize)
 * - GET: Admin, Trainer, or the client themselves
 */

// POST /api/onboarding/self - Client self-service onboarding
// MUST be registered BEFORE /:userId to avoid param route capture
router.post('/self',
  protect,
  authorize(['client']),
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
// Requires: Authenticated user (admin, trainer, or the client themselves)
router.get('/:userId',
  protect,
  // Authorization: Allow if admin, trainer, or the user's own data
  async (req, res, next) => {
    const requestingUser = req.user;

    // Strict numeric validation
    if (!/^\d+$/.test(req.params.userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    const targetUserId = parseInt(req.params.userId, 10);
    if (targetUserId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Admin and trainers can access any client's data
    if (requestingUser.role === 'admin' || requestingUser.role === 'trainer') {
      return next();
    }

    // Clients can only access their own data (type-safe comparison)
    if (Number(requestingUser.id) === targetUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden: You do not have permission to access this resource'
    });
  },
  getClientMasterPrompt
);

export default router;
