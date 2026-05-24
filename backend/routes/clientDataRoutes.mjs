import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
import { getClientDataOverview } from '../controllers/clientOnboardingController.mjs';

const router = express.Router();

// Dashboard overview endpoint
router.get('/overview/:userId', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getClientDataOverview);

export default router;
