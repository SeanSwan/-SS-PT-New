// backend/routes/notificationSettingsRoutes.mjs
import express from 'express';
import {
  getAllSettings,
  getSettingById,
  createSetting,
  updateSetting,
  deleteSetting
} from '../controllers/notificationSettingsController.mjs';
import { protect, admin } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * GET /api/notification-settings
 * Get all notification settings
 */
router.get('/', protect, admin, getAllSettings);

/**
 * GET /api/notification-settings/:id
 * Get a single notification setting by ID
 */
router.get('/:id', protect, admin, getSettingById);

/**
 * POST /api/notification-settings
 * Create a new notification setting
 */
router.post('/', protect, admin, createSetting);

/**
 * PUT /api/notification-settings/:id
 * Update an existing notification setting
 */
router.put('/:id', protect, admin, updateSetting);

/**
 * DELETE /api/notification-settings/:id
 * Delete a notification setting
 */
router.delete('/:id', protect, admin, deleteSetting);

export default router;
