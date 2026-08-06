/**
 * Renewal Alert Routes (SWA-138 S10)
 * ==================================
 * Base path: /api/renewal-alerts
 *
 * The RenewalAlert model, service, and an 8-function controller shipped long
 * ago — but no route file ever registered them, so the churn-risk pipeline was
 * cron-only and unreachable from any UI. This mounts the existing controller.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ GET    /                     Admin/Trainer  Active alerts          │
 * │ GET    /critical             Admin/Trainer  Urgency >= 8           │
 * │ GET    /stats                Admin/Trainer  Counts by status       │
 * │ GET    /user/:userId         Admin/Trainer  One client's alerts    │
 * │ POST   /                     Admin          Create manual alert    │
 * │ PATCH  /:id/contacted        Admin/Trainer  Mark outreach done     │
 * │ PATCH  /:id/renewed          Admin/Trainer  Mark renewed (win)     │
 * │ PATCH  /:id/dismissed        Admin/Trainer  Dismiss                │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Access: authenticated staff only (admin or trainer) — churn data exposes
 * client session balances and inactivity, so `protect` + a role gate are
 * mandatory. Literal paths are declared BEFORE param routes (Rule 31).
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  getAlerts,
  getCriticalRenewalAlerts,
  markAsContacted,
  markAsRenewed,
  dismissRenewalAlert,
  getStats,
  getAlertsForUser,
  createManualRenewalAlert,
} from '../controllers/renewalAlertController.mjs';

const router = express.Router();

/** Staff gate: admin or trainer. Clients must never read churn intelligence. */
function requireStaff(req, res, next) {
  const role = req.user?.role;
  if (role === 'admin' || role === 'trainer') return next();
  return res.status(403).json({ success: false, message: 'Staff access required' });
}

router.use(protect);
router.use(requireStaff);

// Literal paths first — a param route would otherwise shadow them.
router.get('/critical', getCriticalRenewalAlerts);
router.get('/stats', getStats);
router.get('/user/:userId', getAlertsForUser);
router.get('/', getAlerts);
router.post('/', createManualRenewalAlert);

router.patch('/:id/contacted', markAsContacted);
router.patch('/:id/renewed', markAsRenewed);
router.patch('/:id/dismissed', dismissRenewalAlert);

export default router;
