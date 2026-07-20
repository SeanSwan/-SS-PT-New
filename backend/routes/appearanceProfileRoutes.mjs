/**
 * appearanceProfileRoutes — FUSION F1. GET/PUT /api/appearance/profile.
 * Auth: `protect` (session JWT). Identity is the AUTH USER ONLY — no
 * userId route/query param exists by construction (own-user-only law).
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  getAppearanceProfile,
  putAppearanceProfile,
} from '../controllers/appearanceProfileController.mjs';

const router = express.Router();

// House limiter idiom (see admin analytics routes). Appearance changes are
// rare per user; 60/5min absorbs sync retries without enabling write floods.
const appearanceRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'RATE_LIMITED' },
});

router.get('/profile', protect, appearanceRateLimit, getAppearanceProfile);
router.put('/profile', protect, appearanceRateLimit, putAppearanceProfile);

export default router;
