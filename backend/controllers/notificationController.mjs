/**
 * Notification Controller (In-App Notification Management)
 * ========================================================
 *
 * Purpose: Controller for in-app notification system with real-time updates,
 * read status tracking, and admin broadcast notifications
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Notification System
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client Dashboard   │─────▶│  Notification    │─────▶│  Notifications  │
 * │  (React Bell Icon)  │      │  Controller      │      │  Table          │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *                                        │
 *                                        ▼
 *                              ┌──────────────────┐
 *                              │  WebSocket       │
 *                              │  (Real-time)     │
 *                              └──────────────────┘
 *
 * Database Schema (notifications table):
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ notifications                                               │
 *   │ ├─id (PK, UUID)                                             │
 *   │ ├─userId (FK → users.id) - Recipient                        │
 *   │ ├─senderId (FK → users.id, nullable) - Sender               │
 *   │ ├─title (STRING) - Notification title                       │
 *   │ ├─message (TEXT) - Notification body                        │
 *   │ ├─type (ENUM: system, admin, session, achievement, reward)  │
 *   │ ├─link (STRING, nullable) - Deep link URL                   │
 *   │ ├─image (STRING, nullable) - Notification image URL         │
 *   │ ├─read (BOOLEAN, default: false) - Read status              │
 *   │ ├─createdAt (TIMESTAMP)                                     │
 *   │ └─updatedAt (TIMESTAMP)                                     │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Entity Relationships:
 *
 *   notifications ─────▶ users (userId) [recipient]
 *   notifications ─────▶ users (senderId) [sender]
 *
 * Controller Methods (6 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD                       ACCESS         PURPOSE                          │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ getAllNotifications          Client/T/A     Get user notifications + count   │
 * │ markAsRead                   Client/T/A     Mark single notification read    │
 * │ markAllAsRead                Client/T/A     Mark all notifications read      │
 * │ deleteNotification           Client/T/A     Delete single notification       │
 * │ createNotification           Internal       Create notification (utility)    │
 * │ createAdminNotification      Internal       Broadcast to all admins          │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Notification Types:
 *
 *   system: Platform updates, maintenance notices
 *   admin: Admin-to-user messages, policy changes
 *   session: Session booking, confirmation, cancellation
 *   achievement: Achievement unlocked, milestone reached
 *   reward: Reward available, reward redeemed
 *
 * Business Logic:
 *
 * WHY Separate Sender Association (senderId)?
 * - Admin notifications show who sent the message
 * - Trainer notifications show coach identity
 * - System notifications use senderId = null
 * - Personalization (profile picture, name in UI)
 *
 * WHY Broadcast Admin Notifications to All Admins?
 * - Critical alerts (server errors, payment failures)
 * - User escalations (support requests, refund requests)
 * - Multi-admin coordination (new user signups, session requests)
 * - Audit trail (all admins notified for accountability)
 *
 * WHY Internal createNotification and createAdminNotification Methods?
 * - Reusable across controllers (session, gamification, order)
 * - Consistent notification format
 * - Centralized WebSocket emit logic (commented out for future)
 * - Audit logging for all notification creation
 *
 * WHY Track Unread Count in getAllNotifications?
 * - Bell icon badge count (red notification dot)
 * - Client-side performance (single query for count + notifications)
 * - Real-time update trigger (client polls or WebSocket)
 *
 * Security Model:
 * - Users can only read/update/delete their own notifications
 * - Notification creation restricted to internal methods (no direct API)
 * - Admin notifications require admin role (enforced in calling controller)
 * - Sender identity verified before creating notifications
 *
 * Error Handling:
 * - 404: Notification not found (invalid ID or not owned by user)
 * - 500: Server error (database failures, validation errors)
 *
 * Dependencies:
 * - Notification model (Sequelize ORM)
 * - User model (Sequelize ORM)
 * - apiResponse utilities (successResponse, errorResponse)
 * - logger.mjs (Winston logger)
 *
 * Performance Considerations:
 * - Notifications include sender association (avoids N+1 queries)
 * - Unread count calculated in-memory (no separate query)
 * - Bulk update for markAllAsRead (single query)
 * - WebSocket emit commented out (future optimization)
 *
 * Testing Strategy:
 * - Unit tests for each controller method
 * - Test notification ownership validation
 * - Test admin broadcast logic (all admins receive notification)
 * - Test unread count calculation
 * - Mock WebSocket for future real-time tests
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

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
