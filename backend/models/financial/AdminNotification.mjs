/**
 * AdminNotification Model - SwanStudios Real-Time Notification System
 * ===================================================================
 * Real-time business intelligence notifications for admin dashboard
 * 
 * Features:
 * - Real-time financial alerts
 * - Business milestone notifications
 * - System health monitoring
 * - Action-required tracking
 * - Priority-based organization
 * - Auto-expiration for cleanup
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../../database.mjs';

class AdminNotification extends Model {
  /**
   * Get formatted amount if applicable
   */
  getFormattedAmount() {
    if (!this.amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(this.amount);
  }

  /**
   * Get priority color for UI
   */
  getPriorityColor() {
    const colorMap = {
      'low': '#6b7280',
      'medium': '#3b82f6',
      'high': '#f59e0b',
      'critical': '#ef4444'
    };
    return colorMap[this.priority] || colorMap.medium;
  }

  /**
   * Get type icon for UI
   */
  getTypeIcon() {
    const iconMap = {
      'purchase': '💰',
      'new_user': '👤',
      'payment_failed': '❌',
      'high_value_purchase': '💎',
      'refund_request': '↩️',
      'system_alert': '⚠️',
      'revenue_milestone': '🎯',
      'security_alert': '🔒',
      'performance_alert': '📊'
    };
    return iconMap[this.type] || '📢';
  }

  /**
   * Get time since creation
   */
  getTimeAgo() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffInSeconds = Math.floor((now - created) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  /**
   * Check if notification is expired
   */
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Check if notification is recent (within 24 hours)
   */
  isRecent() {
    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours() - 24);
    return new Date(this.createdAt) > dayAgo;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(adminUserId) {
    this.isRead = true;
    this.readAt = new Date();
    this.readBy = adminUserId;
    return await this.save();
  }

  /**
   * Mark action as taken
   */
  async markActionTaken(adminUserId, notes = null) {
    this.actionTaken = true;
    this.actionNotes = notes;
    this.readBy = adminUserId;
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
    }
    return await this.save();
  }

  /**
   * Parse metadata safely
   */
  getParsedMetadata() {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Static method to create purchase notification
   */
  static async createPurchaseNotification(transactionData) {
    const { userId, userName, amount, packages, sessionCount } = transactionData;
    
    const priority = amount >= 500 ? 'high' : amount >= 200 ? 'medium' : 'low';
    const type = amount >= 500 ? 'high_value_purchase' : 'purchase';
    
    return await this.create({
      type,
      title: `New ${type === 'high_value_purchase' ? 'High-Value ' : ''}Purchase`,
      message: `${userName} purchased ${packages.join(', ')}${sessionCount ? ` (${sessionCount} sessions)` : ''} for ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}`,
      userId,
      amount,
      priority,
      metadata: JSON.stringify({
        packages,
        sessionCount,
        source: 'payment_webhook'
      }),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
  }

  /**
   * Static method to create system alert
   */
  static async createSystemAlert(title, message, priority = 'medium', metadata = {}) {
    return await this.create({
      type: 'system_alert',
      title,
      message,
      priority,
      actionRequired: priority === 'critical',
      metadata: JSON.stringify(metadata),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }

  /**
   * Static method to create revenue milestone notification
   */
  static async createRevenueMilestone(milestone, currentAmount, period = 'daily') {
    return await this.create({
      type: 'revenue_milestone',
      title: `Revenue Milestone Reached!`,
      message: `${period.charAt(0).toUpperCase() + period.slice(1)} revenue exceeded $${milestone.toLocaleString()} (currently $${currentAmount.toLocaleString()})`,
      amount: currentAmount,
      priority: 'medium',
      metadata: JSON.stringify({
        milestone,
        period,
        achievedAt: new Date().toISOString()
      }),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
  }

  /**
   * Static method to create new user notification
   */
  static async createNewUserNotification(userData) {
    const { userId, userName, email, userType } = userData;
    
    return await this.create({
      type: 'new_user',
      title: 'New User Registration',
      message: `${userName} (${email}) registered as ${userType}`,
      userId,
      priority: 'low',
      metadata: JSON.stringify({
        email,
        userType,
        registrationSource: 'web'
      }),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    });
  }

  /**
   * Static method to create payment failure notification
   */
  static async createPaymentFailureNotification(transactionData) {
    const { userId, userName, amount, failureReason } = transactionData;
    
    return await this.create({
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Payment of $${amount} from ${userName} failed: ${failureReason}`,
      userId,
      amount,
      priority: amount >= 200 ? 'high' : 'medium',
      actionRequired: true,
      metadata: JSON.stringify({
        failureReason,
        requiresFollowUp: amount >= 100
      }),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }

  /**
   * Static method to get unread notifications
   */
  static async getUnreadNotifications(limit = 50) {
    return await this.findAll({
      where: {
        isRead: false,
        expiresAt: {
          [sequelize.Op.or]: [
            null,
            { [sequelize.Op.gt]: new Date() }
          ]
        }
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit
    });
  }

  /**
   * Static method to get notifications by type
   */
  static async getNotificationsByType(type, limit = 20) {
    return await this.findAll({
      where: { type },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  /**
   * Static method to get high priority notifications
   */
  static async getHighPriorityNotifications() {
    return await this.findAll({
      where: {
        priority: ['high', 'critical'],
        isRead: false,
        expiresAt: {
          [sequelize.Op.or]: [
            null,
            { [sequelize.Op.gt]: new Date() }
          ]
        }
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
  }

  /**
   * Static method to get notifications requiring action
   */
  static async getActionRequiredNotifications() {
    return await this.findAll({
      where: {
        actionRequired: true,
        actionTaken: false,
        expiresAt: {
          [sequelize.Op.or]: [
            null,
            { [sequelize.Op.gt]: new Date() }
          ]
        }
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
  }

  /**
   * Static method to cleanup expired notifications
   */
  static async cleanupExpiredNotifications() {
    const deleted = await this.destroy({
      where: {
        expiresAt: {
          [sequelize.Op.lt]: new Date()
        }
      }
    });
    
    console.log(`Cleaned up ${deleted} expired notifications`);
    return deleted;
  }

  /**
   * Static method to get notification summary
   */
  static async getNotificationSummary() {
    const total = await this.count();
    const unread = await this.count({ where: { isRead: false } });
    const highPriority = await this.count({ 
      where: { 
        priority: ['high', 'critical'],
        isRead: false 
      } 
    });
    const actionRequired = await this.count({ 
      where: { 
        actionRequired: true,
        actionTaken: false 
      } 
    });

    return {
      total,
      unread,
      highPriority,
      actionRequired
    };
  }
}

AdminNotification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM(
      'purchase',
      'new_user',
      'payment_failed',
      'high_value_purchase',
      'refund_request',
      'system_alert',
      'revenue_milestone',
      'security_alert',
      'performance_alert'
    ),
    allowNull: false,
    comment: 'Type of notification'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Notification title'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Notification message content'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Related user if applicable'
  },
  transactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'financial_transactions',
      key: 'id'
    },
    comment: 'Related transaction if applicable'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Associated amount for financial notifications'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
    comment: 'Notification priority level'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether notification has been read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When notification was read'
  },
  readBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin user who read the notification'
  },
  actionRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this notification requires action'
  },
  actionTaken: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether action has been taken'
  },
  actionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes about action taken'
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON metadata for the notification'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When notification expires (auto-cleanup)'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'AdminNotification',
  tableName: 'admin_notifications',
  timestamps: true,
  indexes: [
    {
      fields: ['type'],
      name: 'admin_notifications_type_idx'
    },
    {
      fields: ['isRead'],
      name: 'admin_notifications_read_idx'
    },
    {
      fields: ['priority'],
      name: 'admin_notifications_priority_idx'
    },
    {
      fields: ['createdAt'],
      name: 'admin_notifications_created_idx'
    },
    {
      fields: ['actionRequired', 'actionTaken'],
      name: 'admin_notifications_action_idx'
    },
    {
      fields: ['expiresAt'],
      name: 'admin_notifications_expires_idx'
    }
  ]
});

export default AdminNotification;