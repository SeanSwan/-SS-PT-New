import express from 'express';
import {
  getAlerts,
  getCriticalRenewalAlerts,
  markAsContacted,
  markAsRenewed,
  dismissRenewalAlert,
  getStats,
  getAlertsForUser,
  createManualRenewalAlert,
  runAlertCheck
} from '../controllers/renewalAlertController.mjs';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/renewal-alerts
 * @desc    Get all active renewal alerts
 * @access  Trainer, Admin
 */
router.get('/', authorizeRoles('admin', 'trainer'), getAlerts);

/**
 * @route   GET /api/renewal-alerts/critical
 * @desc    Get critical alerts (urgency >= 8)
 * @access  Trainer, Admin
 */
router.get('/critical', authorizeRoles('admin', 'trainer'), getCriticalRenewalAlerts);

/**
 * @route   GET /api/renewal-alerts/stats
 * @desc    Get renewal alert statistics
 * @access  Trainer, Admin
 */
router.get('/stats', authorizeRoles('admin', 'trainer'), getStats);

/**
 * @route   GET /api/renewal-alerts/user/:userId
 * @desc    Get alerts for specific user
 * @access  Trainer, Admin
 */
router.get('/user/:userId', authorizeRoles('admin', 'trainer'), getAlertsForUser);

/**
 * @route   POST /api/renewal-alerts/manual
 * @desc    Create manual renewal alert
 * @access  Trainer, Admin
 */
router.post('/manual', authorizeRoles('admin', 'trainer'), createManualRenewalAlert);

/**
 * @route   POST /api/renewal-alerts/check
 * @desc    Run renewal alert check on all clients (cron job endpoint)
 * @access  Admin only
 */
router.post('/check', authorizeRoles('admin'), runAlertCheck);

/**
 * @route   PUT /api/renewal-alerts/:id/contacted
 * @desc    Mark alert as contacted
 * @access  Trainer, Admin
 */
router.put('/:id/contacted', authorizeRoles('admin', 'trainer'), markAsContacted);

/**
 * @route   PUT /api/renewal-alerts/:id/renewed
 * @desc    Mark alert as renewed
 * @access  Trainer, Admin
 */
router.put('/:id/renewed', authorizeRoles('admin', 'trainer'), markAsRenewed);

/**
 * @route   PUT /api/renewal-alerts/:id/dismiss
 * @desc    Dismiss alert
 * @access  Trainer, Admin
 */
router.put('/:id/dismiss', authorizeRoles('admin', 'trainer'), dismissRenewalAlert);

export default router;
