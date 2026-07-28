/**
 * Notification Controller
 * -----------------------
 * Route handlers for authenticated notification reads, read-state updates, and
 * deletion. Internal notification creation is re-exported from the delivery
 * service so existing callers keep the same import path while creation logic
 * stays isolated and testable.
 */

import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';
import { getNotification, getUser } from '../models/index.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';
import {
  recordNotificationClicked,
  recordNotificationOpened,
} from '../services/communications/notificationDeliveryLedgerService.mjs';
import {
  applyNotificationActionStatus,
  normalizeActionResolutionStatus,
} from '../services/communications/notificationActionStatusService.mjs';
import {
  applyNotificationSnooze,
  buildVisibleNotificationWhere,
  normalizeSnoozeDurationMinutes,
  SNOOZE_DURATION_ERROR,
} from '../services/communications/notificationSnoozeService.mjs';

export {
  createAdminAndEmit,
  createAdminNotification,
  createAndEmit,
  createNotification,
} from '../services/notificationDeliveryService.mjs';
export {
  getNotificationPreferences,
  updateNotificationPreferences,
} from './notificationPreferencesController.mjs';

const getRequestedSnoozeDuration = (req) => (
  req.body?.durationMinutes ?? req.body?.minutes ?? req.body?.duration
);

export const getAllNotifications = async (req, res) => {
  try {
    const Notification = getNotification();
    const User = getUser();

    if (!Notification || !User) {
      logger.error('Notification or User model not initialized');
      return errorResponse(res, 'Server error: Models not initialized', 500);
    }

    const userId = req.user.id;
    const where = buildVisibleNotificationWhere(userId);
    let notifications;

    try {
      notifications = await Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'photo'],
            required: false,
          },
        ],
      });
    } catch (includeError) {
      logger.warn('Sender include failed, falling back to basic query:', includeError.message);
      notifications = await Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });
    }

    const unreadCount = notifications.filter((notification) => !notification.read).length;

    return successResponse(res, {
      notifications,
      unreadCount,
    }, 'Notifications retrieved successfully');
  } catch (error) {
    logger.error('Error in getAllNotifications:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving notifications', 500);
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const Notification = getNotification();
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const unreadCount = await Notification.count({
      where: { ...buildVisibleNotificationWhere(userId), read: false },
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching notification count',
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const Notification = getNotification();
    if (!Notification) return errorResponse(res, 'Server error: Model not initialized', 500);

    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return errorResponse(res, 'Notification not found', 404);

    notification.read = true;
    notification.status = 'read';
    notification.openedAt = notification.openedAt || new Date();
    await notification.save();

    const lifecycleResult = await recordNotificationOpened({ notificationId: notification.id, userId });
    if (!lifecycleResult.success) logger.warn(`Notification open ledger skipped for notification ${notification.id}: ${lifecycleResult.error}`);

    return successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    logger.error('Error in markAsRead:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error marking notification as read', 500);
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const Notification = getNotification();
    if (!Notification) return errorResponse(res, 'Server error: Model not initialized', 500);

    const userId = req.user.id;
    const where = { userId, read: false, [Op.or]: [{ persistent: false }, { persistent: null }] };
    const notifications = await Notification.findAll({ attributes: ['id', 'userId'], where, raw: true });

    await Notification.update(
      { read: true, status: 'read', openedAt: new Date() },
      { where },
    );

    const lifecycleResults = await Promise.all(notifications.map((notification) => recordNotificationOpened({
      notificationId: notification.id,
      userId: notification.userId || userId,
    })));
    lifecycleResults.forEach((result, index) => {
      if (!result.success) logger.warn(`Notification open ledger skipped for notification ${notifications[index]?.id}: ${result.error}`);
    });

    return successResponse(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    logger.error('Error in markAllAsRead:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error marking all notifications as read', 500);
  }
};

export const markAsClicked = async (req, res) => {
  try {
    const Notification = getNotification();
    if (!Notification) return errorResponse(res, 'Server error: Model not initialized', 500);

    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return errorResponse(res, 'Notification not found', 404);

    const now = new Date();
    notification.read = true;
    notification.status = 'read';
    notification.openedAt = notification.openedAt || now;
    notification.clickedAt = notification.clickedAt || now;
    await notification.save();

    const lifecycleResult = await recordNotificationClicked({ notificationId: notification.id, userId });
    if (!lifecycleResult.success) logger.warn(`Notification click ledger skipped for notification ${notification.id}: ${lifecycleResult.error}`);

    return successResponse(res, notification, 'Notification marked as clicked');
  } catch (error) {
    logger.error('Error in markAsClicked:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error marking notification as clicked', 500);
  }
};

export const snoozeNotification = async (req, res) => {
  try {
    const Notification = getNotification();
    if (!Notification) return errorResponse(res, 'Server error: Model not initialized', 500);

    const durationMinutes = normalizeSnoozeDurationMinutes(getRequestedSnoozeDuration(req));
    if (!durationMinutes) return errorResponse(res, SNOOZE_DURATION_ERROR, 400);

    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return errorResponse(res, 'Notification not found', 404);

    const snoozeResult = applyNotificationSnooze(notification, { durationMinutes });
    if (!snoozeResult.success) return errorResponse(res, snoozeResult.error, 400);

    await notification.save();
    return successResponse(res, notification, 'Notification snoozed successfully');
  } catch (error) {
    logger.error('Error in snoozeNotification:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error snoozing notification', 500);
  }
};

export const resolveNotificationAction = async (req, res) => {
  try {
    const Notification = getNotification();
    if (!Notification) return errorResponse(res, 'Server error: Model not initialized', 500);

    const status = normalizeActionResolutionStatus(req.body?.status ?? req.body?.actionStatus);
    if (!status) return errorResponse(res, 'Notification action status must be resolved or dismissed.', 400);

    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return errorResponse(res, 'Notification not found', 404);

    const actionResult = applyNotificationActionStatus(notification, { status, actorUserId: userId });
    if (!actionResult.success) return errorResponse(res, actionResult.error, actionResult.statusCode || 400);

    await notification.save();
    return successResponse(res, notification, `Notification action ${status} successfully`);
  } catch (error) {
    logger.error('Error in resolveNotificationAction:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error updating notification action', 500);
  }
};
export const deleteNotification = async (req, res) => {
  try {
    const Notification = getNotification();
    if (!Notification) return errorResponse(res, 'Server error: Model not initialized', 500);

    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return errorResponse(res, 'Notification not found', 404);

    await notification.destroy();
    return successResponse(res, { id }, 'Notification deleted successfully');
  } catch (error) {
    logger.error('Error in deleteNotification:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error deleting notification', 500);
  }
};
