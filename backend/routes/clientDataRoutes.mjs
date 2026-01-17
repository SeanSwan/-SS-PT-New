import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { getClientDataOverview } from '../controllers/clientOnboardingController.mjs';

const router = express.Router();

// Dashboard overview endpoint
router.get('/overview/:userId', protect, getClientDataOverview);

export default router;
