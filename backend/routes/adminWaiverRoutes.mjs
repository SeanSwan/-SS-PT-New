/**
 * Admin Waiver Routes — Phase 5W-D
 * =================================
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §10.2
 * Mount: app.use('/api/admin/waivers', adminWaiverRoutes)
 */

import express from 'express';
import {
  listWaiverRecords,
  getWaiverRecordDetail,
  approveMatch,
  rejectMatch,
  attachUser,
  revokeWaiver,
  markReconsentRequired,
} from '../controllers/adminWaiverController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { adminLimiter } from '../middleware/rateLimiter.mjs';

const router = express.Router();

// adminLimiter on every endpoint — these were the only admin surfaces with no
// throttle at all, and the list endpoint is the most expensive query in the
// waiver family (SWA-140 W9).
router.use(adminLimiter);

router.get('/', protect, adminOnly, listWaiverRecords);
router.get('/:id', protect, adminOnly, getWaiverRecordDetail);
router.post('/matches/:matchId/approve', protect, adminOnly, approveMatch);
router.post('/matches/:matchId/reject', protect, adminOnly, rejectMatch);
router.post('/:id/attach-user', protect, adminOnly, attachUser);
router.post('/:id/revoke', protect, adminOnly, revokeWaiver);
router.post('/versions/:versionId/mark-reconsent-required', protect, adminOnly, markReconsentRequired);

export default router;
