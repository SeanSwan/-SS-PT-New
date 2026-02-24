/**
 * Admin Notifications Routes
 * ==========================
 *
 * Admin-facing notification management and broadcast endpoints.
 *
 * Blueprint Reference: docs/ai-workflow/reviews/dashboard-architecture-review.md
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { getAllModels, Op } from '../models/index.mjs';

const router = express.Router();

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  try {
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch (error) {
    return {};
  }
};

const mapAdminTypeToUi = (adminType, metadata) => {
  if (metadata?.type) return metadata.type;

  const alertTypes = ['security_alert', 'performance_alert', 'payment_failed', 'refund_request'];
  const marketingTypes = ['purchase', 'high_value_purchase', 'revenue_milestone'];

  if (alertTypes.includes(adminType)) return 'alert';
  if (marketingTypes.includes(adminType)) return 'marketing';
  if (adminType === 'new_user') return 'user';
  return 'system';
};

const serializeAdminNotification = (notification, adminCount) => {
  const metadata = parseMetadata(notification.metadata);
  const audience = metadata.audience || { type: 'all', count: adminCount };
  const channels = Array.isArray(metadata.channels) ? metadata.channels : ['in-app'];
  const status = notification.actionRequired && !notification.actionTaken ? 'scheduled' : 'sent';

  return {
    id: notification.id,
    title: notification.title,
    content: notification.message,
    type: mapAdminTypeToUi(notification.type, metadata),
    status,
    audience: {
      type: audience.type || 'all',
      count: Number(audience.count || adminCount || 0)
    },
    channels,
    createdAt: notification.createdAt,
    scheduledFor: notification.expiresAt || null,
    sentAt: notification.createdAt,
    metrics: {
      sent: Number(audience.count || adminCount || 0),
      delivered: Number(audience.count || adminCount || 0),
      opened: notification.isRead ? Number(audience.count || adminCount || 0) : 0,
      clicked: 0
    },
    template: metadata.template || null
  };
};

/**
 * @route   GET /api/admin/notifications
 * @desc    List admin notifications
 * @access  Private (Admin)
 */
router.get('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    if (!AdminNotification) {
      return res.status(200).json({
        success: true,
        notifications: [],
        stats: { total: 0, unread: 0, highPriority: 0, actionRequired: 0 },
        degraded: true
      });
    }

    const adminCount = await User.count({ where: { role: 'admin' } });
    const notifications = await AdminNotification.findAll({
      where: {
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }]
      },
      order: [['createdAt', 'DESC']],
      limit: 200,
      raw: true
    });

    const summary = AdminNotification.getNotificationSummary
      ? await AdminNotification.getNotificationSummary()
      : {
          total: notifications.length,
          unread: notifications.filter((item) => !item.isRead).length,
          highPriority: notifications.filter((item) =>
            ['high', 'critical'].includes(item.priority)
          ).length,
          actionRequired: notifications.filter((item) => item.actionRequired && !item.actionTaken).length
        };

    return res.status(200).json({
      success: true,
      notifications: notifications.map((notification) =>
        serializeAdminNotification(notification, adminCount)
      ),
      stats: summary
    });
  } catch (error) {
    console.error('[adminNotifications] Error fetching notifications:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      degraded: true
    });
  }
});

/**
 * @route   DELETE /api/admin/notifications/:id
 * @desc    Delete admin notification
 * @access  Private (Admin)
 */
router.delete('/notifications/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;

    const deleted = await AdminNotification.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

/**
 * @route   POST /api/admin/notifications/broadcast
 * @desc    Broadcast a notification to users
 * @access  Private (Admin)
 */
router.post('/notifications/broadcast', protect, adminOnly, async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'system',
      audience = 'all',
      channels = ['in-app'],
      userIds,
      link,
      image
    } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const models = getAllModels();
    const User = models.User;
    const Notification = models.Notification;
    const AdminNotification = models.AdminNotification;

    let where = {};
    if (audience === 'specific') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds are required for specific audience broadcasts'
        });
      }
      where = { id: userIds };
    } else if (audience === 'clients') {
      where = { role: 'client' };
    } else if (audience === 'trainers') {
      where = { role: 'trainer' };
    }

    const recipients = await User.findAll({
      where,
      attributes: ['id'],
      raw: true
    });

    const recipientIds = recipients.map((user) => user.id);
    const senderId = Number(req.user?.id);

    if (recipientIds.length > 0) {
      await Notification.bulkCreate(
        recipientIds.map((recipientId) => ({
          userId: recipientId,
          title,
          message: content,
          type: 'admin',
          read: false,
          link: link || null,
          image: image || null,
          senderId: Number.isFinite(senderId) ? senderId : null
        }))
      );
    }

    const adminNotification = await AdminNotification.create({
      type: 'system_alert',
      title,
      message: content,
      priority: type === 'alert' ? 'high' : 'medium',
      actionRequired: type === 'alert',
      metadata: JSON.stringify({
        audience: { type: audience, count: recipientIds.length },
        channels,
        type,
        senderId: Number.isFinite(senderId) ? senderId : null
      })
    });

    return res.status(201).json({
      success: true,
      notificationsCreated: recipientIds.length,
      notification: serializeAdminNotification(adminNotification, recipientIds.length)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification'
    });
  }
});

/**
 * @route   GET /api/admin/notifications/:id
 * @desc    Full notification detail
 * @access  Private (Admin)
 */
router.get('/notifications/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    const notification = await AdminNotification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const adminCount = await User.count({ where: { role: 'admin' } });

    return res.status(200).json({
      success: true,
      notification: serializeAdminNotification(notification, adminCount)
    });
  } catch (error) {
    console.error('[adminNotifications] Error fetching notification detail:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notification'
    });
  }
});

/**
 * @route   PATCH /api/admin/notifications/:id/resolve
 * @desc    Mark notification as resolved / action taken
 * @access  Private (Admin)
 */
router.patch('/notifications/:id/resolve', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    const notification = await AdminNotification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const adminUserId = req.user?.id ?? null;
    const notes = req.body?.notes ?? null;

    await notification.markActionTaken(adminUserId, notes);

    const adminCount = await User.count({ where: { role: 'admin' } });

    return res.status(200).json({
      success: true,
      notification: serializeAdminNotification(notification, adminCount)
    });
  } catch (error) {
    console.error('[adminNotifications] Error resolving notification:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve notification'
    });
  }
});

/**
 * @route   PATCH /api/admin/notifications/:id/archive
 * @desc    Mark notification as read / archived
 * @access  Private (Admin)
 */
router.patch('/notifications/:id/archive', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    const notification = await AdminNotification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const adminUserId = req.user?.id ?? null;

    await notification.markAsRead(adminUserId);

    const adminCount = await User.count({ where: { role: 'admin' } });

    return res.status(200).json({
      success: true,
      notification: serializeAdminNotification(notification, adminCount)
    });
  } catch (error) {
    console.error('[adminNotifications] Error archiving notification:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive notification'
    });
  }
});

/**
 * @route   POST /api/admin/notifications/bulk
 * @desc    Bulk archive or delete notifications
 * @access  Private (Admin)
 */
router.post('/notifications/bulk', protect, adminOnly, async (req, res) => {
  try {
    const { ids, action } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids must be a non-empty array'
      });
    }

    if (!['archive', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be 'archive' or 'delete'"
      });
    }

    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    let processed = 0;

    if (action === 'delete') {
      processed = await AdminNotification.destroy({
        where: { id: { [Op.in]: ids } }
      });
    } else {
      // archive — mark all as read
      const adminUserId = req.user?.id ?? null;
      const now = new Date();

      const [affectedCount] = await AdminNotification.update(
        {
          isRead: true,
          readAt: now,
          readBy: adminUserId
        },
        {
          where: { id: { [Op.in]: ids } }
        }
      );
      processed = affectedCount;
    }

    return res.status(200).json({
      success: true,
      processed
    });
  } catch (error) {
    console.error('[adminNotifications] Error in bulk operation:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process bulk operation'
    });
  }
});

export default router;
