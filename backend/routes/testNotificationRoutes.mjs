// backend/routes/testNotificationRoutes.mjs
import express from 'express';
import { testAdminNotification, testDirectNotification } from '../controllers/testNotificationController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * POST /api/test-notifications/admin
 *
 * Protected route: Only accessible to admin users.
 * Sends a test notification to all configured admin emails and phones.
 */
router.post('/admin', protect, adminOnly, testAdminNotification);

/**
 * POST /api/test-notifications/direct
 *
 * Protected route: Only accessible to admin users.
 * Sends a test notification to a specific email and phone number.
 */
router.post('/direct', protect, adminOnly, testDirectNotification);

export default router;
