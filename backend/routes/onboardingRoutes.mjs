// backend/routes/onboardingRoutes.mjs
import express from 'express';
import {
  createClientOnboarding,
  getClientMasterPrompt
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

// POST /api/onboarding - Create new client onboarding
// Requires: Admin or Trainer role
router.post('/',
  protect,
  authorize('admin', 'trainer'),
  createClientOnboarding
);

// GET /api/onboarding/:userId - Get client master prompt
// Requires: Authenticated user (admin, trainer, or the client themselves)
router.get('/:userId',
  protect,
  // Authorization: Allow if admin, trainer, or the user's own data
  async (req, res, next) => {
    const requestingUser = req.user;
    const targetUserId = parseInt(req.params.userId);

    // Admin and trainers can access any client's data
    if (requestingUser.role === 'admin' || requestingUser.role === 'trainer') {
      return next();
    }

    // Clients can only access their own data
    if (requestingUser.id === targetUserId) {
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
