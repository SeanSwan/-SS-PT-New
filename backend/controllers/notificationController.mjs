// backend/controllers/notificationController.mjs
import logger from '../utils/logger.mjs';
import Notification from '../models/Notification.mjs';
import User from '../models/User.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

/**
 * Get all notifications for a user
 */
export const getAllNotifications = async (req, res) => {
  try {
    // Get the user ID from the authenticated user
    const userId = req.user.id;
    
    // Get all notifications for this user
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture'],
        }
      ]
    });
    
    // Count unread notifications
    const unreadCount = notifications.filter(notification => !notification.read).length;
    
    return successResponse(res, {
      notifications,
      unreadCount
    }, 'Notifications retrieved successfully');
  } catch (error) {
    logger.error('Error in getAllNotifications:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving notifications', 500);
  }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find the notification
    const notification = await Notification.findOne({
      where: { id, userId }
    });
    
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }
    
    // Update the notification
    notification.read = true;
    await notification.save();
    
    return successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    logger.error('Error in markAsRead:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error marking notification as read', 500);
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update all notifications for this user
    await Notification.update(
      { read: true },
      { where: { userId, read: false } }
    );
    
    return successResponse(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    logger.error('Error in markAllAsRead:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error marking all notifications as read', 500);
  }
};

/**
 * Create a new notification for a user
 * (This is typically called internally from other controllers)
 */
export const createNotification = async (options) => {
  try {
    const {
      userId,
      title,
      message,
      type = 'system',
      link = null,
      image = null,
      senderId = null
    } = options;
    
    // Create the notification
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      image,
      senderId,
      read: false
    });
    
    logger.info(`Created ${type} notification for user ${userId}`);
    
    // If you have WebSockets set up, emit a notification event
    // io.to(userId).emit('notification', notification);
    
    return { success: true, notification };
  } catch (error) {
    logger.error('Error in createNotification:', error.message, { stack: error.stack });
    return { success: false, error: error.message };
  }
};

/**
 * Create a notification for admin users
 * (This is typically called internally from other controllers)
 */
export const createAdminNotification = async (options) => {
  try {
    const {
      title,
      message,
      type = 'admin',
      link = null,
      image = null,
      senderId = null
    } = options;
    
    // Get all admin users
    const adminUsers = await User.findAll({
      where: { role: 'admin' }
    });
    
    // Create notifications for each admin
    const notifications = [];
    
    for (const admin of adminUsers) {
      const notification = await Notification.create({
        userId: admin.id,
        title,
        message,
        type,
        link,
        image,
        senderId,
        read: false
      });
      
      notifications.push(notification);
    }
    
    logger.info(`Created ${type} notification for ${adminUsers.length} admin users`);
    
    // If you have WebSockets set up, emit a notification event to each admin
    // adminUsers.forEach(admin => {
    //   io.to(admin.id).emit('notification', notifications.find(n => n.userId === admin.id));
    // });
    
    return { success: true, notifications };
  } catch (error) {
    logger.error('Error in createAdminNotification:', error.message, { stack: error.stack });
    return { success: false, error: error.message };
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find the notification
    const notification = await Notification.findOne({
      where: { id, userId }
    });
    
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }
    
    // Delete the notification
    await notification.destroy();
    
    return successResponse(res, { id }, 'Notification deleted successfully');
  } catch (error) {
    logger.error('Error in deleteNotification:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error deleting notification', 500);
  }
};
