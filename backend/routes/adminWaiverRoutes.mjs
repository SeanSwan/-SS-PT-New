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
} from '../controllers/adminWaiverController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

router.get('/', protect, adminOnly, listWaiverRecords);
router.get('/:id', protect, adminOnly, getWaiverRecordDetail);
router.post('/matches/:matchId/approve', protect, adminOnly, approveMatch);
router.post('/matches/:matchId/reject', protect, adminOnly, rejectMatch);
router.post('/:id/attach-user', protect, adminOnly, attachUser);
router.post('/:id/revoke', protect, adminOnly, revokeWaiver);

export default router;
