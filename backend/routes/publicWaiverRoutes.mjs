/**
 * Public Waiver Routes — Phase 5W-G
 * ===================================
 * Public endpoints for waiver version retrieval and submission.
 * No authentication required (optionalAuth on POST only).
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §5, §10.1
 */
import express from 'express';
import { getCurrentWaiverVersions, submitPublicWaiver } from '../controllers/publicWaiverController.mjs';
import { optionalAuth } from '../middleware/optionalAuth.mjs';
import { waiverLimiter } from '../middleware/rateLimiter.mjs';

const router = express.Router();

router.get('/versions/current', getCurrentWaiverVersions);
router.post('/submit', waiverLimiter, optionalAuth, submitPublicWaiver);

export default router;
