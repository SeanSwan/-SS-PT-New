/**
 * Admin Notifications Routes
 * ==========================
 *
 * Admin-facing notification management and broadcast endpoints.
 *
 * Blueprint Reference: docs/ai-workflow/reviews/dashboard-architecture-review.md
 */

import express from 'express';
import { protect, adminOnly, rateLimiter } from '../middleware/authMiddleware.mjs';
import { getAllModels } from '../models/index.mjs';
import { broadcastAdminNotification } from '../services/adminNotificationBroadcastService.mjs';
import {
  bulkAdminNotificationAction,
  getAdminNotificationDeliveryHealth,
  getAdminNotificationRetentionReport,
  listAdminNotifications,
  serializeAdminNotification,
} from '../services/adminNotificationManagementService.mjs';

const router = express.Router();
const adminNotificationReadLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 120, message: 'Too many admin notification requests.' });
const adminNotificationCommandLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many admin notification changes.' });
const adminNotificationBroadcastLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many notification broadcasts.' });

/**
 * @route   GET /api/admin/notifications
 * @desc    List admin notifications
 * @access  Private (Admin)
 */
router.get('/notifications', protect, adminOnly, adminNotificationReadLimiter, async (req, res) => {
  const result = await listAdminNotifications();
  return res.status(result.statusCode).json(result.body);
});

/**
 * @route   GET /api/admin/notifications/delivery-health
 * @desc    Summarize admin broadcast delivery health
 * @access  Private (Admin)
 */
router.get('/notifications/delivery-health', protect, adminOnly, adminNotificationReadLimiter, async (req, res) => {
  const result = await getAdminNotificationDeliveryHealth({ limit: req.query?.limit });
  return res.status(result.statusCode).json(result.body);
});

/**
 * @route   GET /api/admin/notifications/retention-policy
 * @desc    Summarize communication retention policy counts
 * @access  Private (Admin)
 */
router.get('/notifications/retention-policy', protect, adminOnly, adminNotificationReadLimiter, async (req, res) => {
  const result = await getAdminNotificationRetentionReport();
  return res.status(result.statusCode).json(result.body);
});

/**
 * @route   DELETE /api/admin/notifications/:id
 * @desc    Delete admin notification
 * @access  Private (Admin)
 */
router.delete('/notifications/:id', protect, adminOnly, adminNotificationCommandLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;

    const deleted = await AdminNotification.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

/**
 * @route   POST /api/admin/notifications/broadcast
 * @desc    Broadcast a notification to users
 * @access  Private (Admin)
 */
router.post('/notifications/broadcast', protect, adminOnly, adminNotificationBroadcastLimiter, async (req, res) => {
  try {
    const result = await broadcastAdminNotification({
      requestBody: req.body,
      adminUserId: req.user?.id,
    });

    if (!result.body?.notification) {
      return res.status(result.statusCode).json(result.body);
    }

    const { notification, audienceCount, ...body } = result.body;
    return res.status(result.statusCode).json({
      ...body,
      notification: serializeAdminNotification(notification, audienceCount),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification' });
  }
});

/**
 * @route   GET /api/admin/notifications/:id
 * @desc    Full notification detail
 * @access  Private (Admin)
 */
router.get('/notifications/:id', protect, adminOnly, adminNotificationReadLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    const notification = await AdminNotification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const adminCount = await User.count({ where: { role: 'admin' } });
    return res.status(200).json({
      success: true,
      notification: serializeAdminNotification(notification, adminCount),
    });
  } catch (error) {
    console.error('[adminNotifications] Error fetching notification detail:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch notification' });
  }
});

/**
 * @route   PATCH /api/admin/notifications/:id/resolve
 * @desc    Mark notification as resolved / action taken
 * @access  Private (Admin)
 */
router.patch('/notifications/:id/resolve', protect, adminOnly, adminNotificationCommandLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    const notification = await AdminNotification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.markActionTaken(req.user?.id ?? null, req.body?.notes ?? null);
    const adminCount = await User.count({ where: { role: 'admin' } });

    return res.status(200).json({
      success: true,
      notification: serializeAdminNotification(notification, adminCount),
    });
  } catch (error) {
    console.error('[adminNotifications] Error resolving notification:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to resolve notification' });
  }
});

/**
 * @route   PATCH /api/admin/notifications/:id/archive
 * @desc    Mark notification as read / archived
 * @access  Private (Admin)
 */
router.patch('/notifications/:id/archive', protect, adminOnly, adminNotificationCommandLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    const notification = await AdminNotification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.markAsRead(req.user?.id ?? null);
    const adminCount = await User.count({ where: { role: 'admin' } });

    return res.status(200).json({
      success: true,
      notification: serializeAdminNotification(notification, adminCount),
    });
  } catch (error) {
    console.error('[adminNotifications] Error archiving notification:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to archive notification' });
  }
});

/**
 * @route   POST /api/admin/notifications/bulk
 * @desc    Bulk archive or delete notifications
 * @access  Private (Admin)
 */
router.post('/notifications/bulk', protect, adminOnly, adminNotificationCommandLimiter, async (req, res) => {
  const result = await bulkAdminNotificationAction({
    ids: req.body?.ids,
    action: req.body?.action,
    adminUserId: req.user?.id ?? null,
  });

  return res.status(result.statusCode).json(result.body);
});

export default router;
