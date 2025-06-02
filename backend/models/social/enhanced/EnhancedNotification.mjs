/**
 * ENHANCED NOTIFICATION SYSTEM - 7-STAR SOCIAL MEDIA EXPERIENCE
 * ==============================================================
 * Advanced notification management with real-time delivery,
 * AI-powered prioritization, and comprehensive customization.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

const EnhancedNotification = db.define('EnhancedNotification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // NOTIFICATION RELATIONSHIPS
  // ===========================
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: true, // Null for system notifications
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // NOTIFICATION CONTENT
  // ====================
  type: {
    type: DataTypes.ENUM(
      // Social notifications
      'like', 'comment', 'share', 'mention', 'follow', 'friend_request',
      'friend_accepted', 'message', 'reaction',
      
      // Fitness notifications
      'workout_completed', 'achievement_earned', 'milestone_reached',
      'challenge_invitation', 'challenge_update', 'streak_reminder',
      'workout_reminder', 'goal_progress',
      
      // Community notifications
      'community_invitation', 'community_post', 'community_event',
      'community_challenge', 'role_change', 'community_mention',
      
      // System notifications
      'welcome', 'feature_update', 'security_alert', 'policy_update',
      'maintenance', 'promotional', 'newsletter',
      
      // AI-powered notifications
      'ai_recommendation', 'ai_insight', 'ai_tip', 'ai_summary',
      
      // E-commerce notifications
      'order_update', 'payment_reminder', 'product_recommendation',
      
      // Real-time notifications
      'live_stream_start', 'live_chat', 'typing_indicator'
    ),
    allowNull: false
  },
  
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  richContent: {
    type: DataTypes.JSON, // Rich notification content (HTML, markdown, etc.)
    defaultValue: null
  },
  
  // VISUAL & MEDIA
  // ==============
  icon: {
    type: DataTypes.STRING,
    allowNull: true // Icon URL or emoji
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true // Notification image URL
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true // Hex color for notification theme
  },
  
  // PRIORITY & IMPORTANCE
  // =====================
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent', 'critical'),
    defaultValue: 'normal'
  },
  category: {
    type: DataTypes.ENUM('social', 'fitness', 'community', 'system', 'commercial', 'personal'),
    defaultValue: 'social'
  },
  aiPriorityScore: {
    type: DataTypes.DECIMAL(5, 3),
    defaultValue: 5.0 // AI-calculated priority (0-10)
  },
  
  // DELIVERY CHANNELS
  // =================
  channels: {
    type: DataTypes.JSON, // Which channels to send through
    defaultValue: {
      inApp: true,
      push: false,
      email: false,
      sms: false,
      websocket: true
    }
  },
  
  // DELIVERY STATUS
  // ===============
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  deliveryAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastDeliveryAttempt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // RELATED ENTITIES
  // ================
  relatedEntityType: {
    type: DataTypes.ENUM(
      'post', 'comment', 'user', 'workout', 'achievement', 'challenge',
      'community', 'message', 'order', 'product', 'event'
    ),
    allowNull: true
  },
  relatedEntityId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  // ACTION & NAVIGATION
  // ===================
  actionType: {
    type: DataTypes.ENUM('none', 'navigate', 'modal', 'external_link', 'api_call'),
    defaultValue: 'none'
  },
  actionData: {
    type: DataTypes.JSON, // Action-specific data (URL, API endpoint, etc.)
    defaultValue: null
  },
  primaryAction: {
    type: DataTypes.JSON, // Primary action button
    defaultValue: null
    // Format: { text: 'View Post', action: 'navigate', data: '/posts/123' }
  },
  secondaryAction: {
    type: DataTypes.JSON, // Secondary action button
    defaultValue: null
  },
  
  // GROUPING & AGGREGATION
  // ======================
  groupId: {
    type: DataTypes.UUID,
    allowNull: true // For grouping related notifications
  },
  aggregateCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1 // Number of similar notifications aggregated
  },
  aggregateData: {
    type: DataTypes.JSON, // Data for aggregated notifications
    defaultValue: null
  },
  
  // SCHEDULING & TIMING
  // ===================
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true // For scheduled notifications
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true // When notification becomes irrelevant
  },
  reminderAt: {
    type: DataTypes.DATE,
    allowNull: true // For reminder notifications
  },
  
  // PERSONALIZATION & AI
  // ====================
  isPersonalized: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  personalizationData: {
    type: DataTypes.JSON, // AI personalization metadata
    defaultValue: {}
  },
  contextData: {
    type: DataTypes.JSON, // Context when notification was created
    defaultValue: {}
  },
  
  // USER INTERACTION
  // ================
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isInteracted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // User took some action
  },
  isDismissed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  interactionType: {
    type: DataTypes.ENUM('none', 'clicked', 'action_taken', 'dismissed', 'snoozed'),
    defaultValue: 'none'
  },
  interactionData: {
    type: DataTypes.JSON, // Interaction details
    defaultValue: {}
  },
  
  // ANALYTICS & TRACKING
  // ====================
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0 // How many times notification was shown
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  deviceInfo: {
    type: DataTypes.JSON, // Device where notification was sent
    defaultValue: {}
  },
  analyticsData: {
    type: DataTypes.JSON, // Additional analytics data
    defaultValue: {}
  },
  
  // MODERATION & SAFETY
  // ===================
  isSpam: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reportCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  moderationFlags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // TEMPLATES & LOCALIZATION
  // =========================
  templateId: {
    type: DataTypes.STRING(100),
    allowNull: true // Reference to notification template
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en'
  },
  translations: {
    type: DataTypes.JSON, // Translations for different languages
    defaultValue: {}
  },
  
  // TIMESTAMPS
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'EnhancedNotifications',
  timestamps: true,
  paranoid: true, // Soft delete support
  indexes: [
    { fields: ['userId'], name: 'enhanced_notifications_user_idx' },
    { fields: ['senderId'], name: 'enhanced_notifications_sender_idx' },
    { fields: ['type'], name: 'enhanced_notifications_type_idx' },
    { fields: ['status'], name: 'enhanced_notifications_status_idx' },
    { fields: ['priority'], name: 'enhanced_notifications_priority_idx' },
    { fields: ['category'], name: 'enhanced_notifications_category_idx' },
    { fields: ['isRead'], name: 'enhanced_notifications_read_idx' },
    { fields: ['scheduledFor'], name: 'enhanced_notifications_scheduled_idx' },
    { fields: ['expiresAt'], name: 'enhanced_notifications_expires_idx' },
    { fields: ['groupId'], name: 'enhanced_notifications_group_idx' },
    { fields: ['aiPriorityScore'], name: 'enhanced_notifications_ai_priority_idx' },
    { 
      fields: ['userId', 'isRead', 'priority'], 
      name: 'enhanced_notifications_user_unread_idx' 
    },
    {
      fields: ['userId', 'category', 'createdAt'],
      name: 'enhanced_notifications_user_category_idx'
    },
    {
      fields: ['relatedEntityType', 'relatedEntityId'],
      name: 'enhanced_notifications_entity_idx'
    }
  ],
  hooks: {
    beforeCreate: async (notification) => {
      // Generate AI priority score
      notification.aiPriorityScore = await calculateAIPriority(notification);
      
      // Check for aggregation opportunities
      await checkAggregationOpportunity(notification);
      
      // Apply personalization
      if (notification.isPersonalized) {
        await personalizeNotification(notification);
      }
    },
    afterCreate: async (notification) => {
      // Schedule delivery
      await scheduleNotificationDelivery(notification);
      
      // Update user notification counts
      await updateUserNotificationCounts(notification.userId);
    },
    afterUpdate: async (notification) => {
      if (notification.changed('isRead') && notification.isRead) {
        notification.readAt = new Date();
        await updateUserNotificationCounts(notification.userId);
      }
    }
  }
});

// NOTIFICATION PREFERENCES MODEL
// ===============================
const NotificationPreference = db.define('NotificationPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // CHANNEL PREFERENCES
  // ===================
  inAppNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  pushNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  smsNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // TYPE-SPECIFIC PREFERENCES
  // =========================
  socialNotifications: {
    type: DataTypes.JSON,
    defaultValue: {
      likes: true,
      comments: true,
      shares: true,
      mentions: true,
      follows: true,
      friend_requests: true,
      messages: true
    }
  },
  fitnessNotifications: {
    type: DataTypes.JSON,
    defaultValue: {
      workout_reminders: true,
      achievements: true,
      milestones: true,
      challenges: true,
      streak_reminders: true,
      goal_progress: true
    }
  },
  communityNotifications: {
    type: DataTypes.JSON,
    defaultValue: {
      invitations: true,
      posts: false,
      events: true,
      challenges: true,
      mentions: true,
      role_changes: true
    }
  },
  systemNotifications: {
    type: DataTypes.JSON,
    defaultValue: {
      updates: true,
      security: true,
      maintenance: false,
      promotional: false,
      newsletter: true
    }
  },
  
  // TIMING PREFERENCES
  // ==================
  quietHoursEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  quietHoursStart: {
    type: DataTypes.TIME,
    defaultValue: '22:00'
  },
  quietHoursEnd: {
    type: DataTypes.TIME,
    defaultValue: '08:00'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC'
  },
  
  // FREQUENCY PREFERENCES
  // =====================
  digestEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  digestFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    defaultValue: 'weekly'
  },
  digestTime: {
    type: DataTypes.TIME,
    defaultValue: '09:00'
  },
  
  // AI & PERSONALIZATION
  // ====================
  aiPersonalizationEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  smartPriorityEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  adaptiveTiming: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // DEVICE PREFERENCES
  // ==================
  devicePreferences: {
    type: DataTypes.JSON,
    defaultValue: {
      mobile: { push: true, inApp: true },
      desktop: { push: false, inApp: true },
      email: { enabled: true, frequency: 'daily' }
    }
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'NotificationPreferences',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId'], name: 'notification_preferences_user_idx' },
    { fields: ['digestEnabled'], name: 'notification_preferences_digest_idx' },
    { fields: ['aiPersonalizationEnabled'], name: 'notification_preferences_ai_idx' }
  ]
});

// =====================
// CLASS METHODS
// =====================

/**
 * Create and send a notification
 */
EnhancedNotification.createAndSend = async function(notificationData) {
  // Check user preferences
  const preferences = await NotificationPreference.findOne({
    where: { userId: notificationData.userId }
  });
  
  if (!preferences || !shouldSendNotification(notificationData.type, preferences)) {
    return null;
  }
  
  // Apply user's channel preferences
  const channels = applyChannelPreferences(notificationData.channels, preferences);
  
  const notification = await this.create({
    ...notificationData,
    channels,
    status: 'pending'
  });
  
  return notification;
};

/**
 * Get user's notifications with advanced filtering
 */
EnhancedNotification.getUserNotifications = async function(userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    category = null,
    unreadOnly = false,
    type = null,
    priority = null,
    since = null
  } = options;
  
  const whereClause = { userId };
  
  if (category) whereClause.category = category;
  if (unreadOnly) whereClause.isRead = false;
  if (type) whereClause.type = type;
  if (priority) whereClause.priority = priority;
  if (since) whereClause.createdAt = { [db.Sequelize.Op.gte]: since };
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [
      ['priority', 'DESC'],
      ['aiPriorityScore', 'DESC'],
      ['createdAt', 'DESC']
    ],
    include: [
      {
        model: db.models.User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
};

/**
 * Mark notifications as read
 */
EnhancedNotification.markAsRead = async function(userId, notificationIds) {
  const notifications = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  
  return this.update(
    { 
      isRead: true,
      readAt: new Date(),
      status: 'read'
    },
    {
      where: {
        userId,
        id: { [db.Sequelize.Op.in]: notifications },
        isRead: false
      }
    }
  );
};

/**
 * Get notification analytics
 */
EnhancedNotification.getAnalytics = async function(userId, timeframe = '30d') {
  const timeframeMaps = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = timeframeMaps[timeframe] || 30;
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  const [total, unread, byCategory, byType] = await Promise.all([
    this.count({ where: { userId, createdAt: { [db.Sequelize.Op.gte]: cutoffDate } } }),
    this.count({ where: { userId, isRead: false } }),
    this.findAll({
      where: { userId, createdAt: { [db.Sequelize.Op.gte]: cutoffDate } },
      attributes: [
        'category',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['category']
    }),
    this.findAll({
      where: { userId, createdAt: { [db.Sequelize.Op.gte]: cutoffDate } },
      attributes: [
        'type',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['type']
    })
  ]);
  
  return {
    totalNotifications: total,
    unreadCount: unread,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item.dataValues.count;
      return acc;
    }, {}),
    byType: byType.reduce((acc, item) => {
      acc[item.type] = item.dataValues.count;
      return acc;
    }, {})
  };
};

/**
 * Clean up old notifications
 */
EnhancedNotification.cleanup = async function(options = {}) {
  const { olderThanDays = 90, keepUnread = true } = options;
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  const whereClause = {
    createdAt: { [db.Sequelize.Op.lt]: cutoffDate }
  };
  
  if (keepUnread) {
    whereClause.isRead = true;
  }
  
  return this.destroy({ where: whereClause });
};

// ===================
// HELPER FUNCTIONS
// ===================

async function calculateAIPriority(notification) {
  // AI algorithm to calculate notification priority
  // Would consider user behavior, notification type, timing, etc.
  const basePriority = {
    'critical': 10,
    'urgent': 8,
    'high': 6,
    'normal': 5,
    'low': 3
  };
  
  return basePriority[notification.priority] || 5;
}

async function checkAggregationOpportunity(notification) {
  // Check if this notification can be aggregated with recent similar ones
  // This would help reduce notification spam
}

async function personalizeNotification(notification) {
  // Apply AI personalization to notification content and timing
  // Would consider user preferences, behavior patterns, etc.
}

async function scheduleNotificationDelivery(notification) {
  // Schedule notification for delivery through appropriate channels
  // Would integrate with push notification services, email services, etc.
}

async function updateUserNotificationCounts(userId) {
  // Update user's unread notification count
  // This would typically update a cached count for quick access
}

function shouldSendNotification(type, preferences) {
  // Check if user wants to receive this type of notification
  const categoryMap = {
    'like': 'socialNotifications',
    'comment': 'socialNotifications',
    'share': 'socialNotifications',
    'mention': 'socialNotifications',
    'follow': 'socialNotifications',
    'friend_request': 'socialNotifications',
    'message': 'socialNotifications',
    'workout_completed': 'fitnessNotifications',
    'achievement_earned': 'fitnessNotifications',
    'challenge_invitation': 'fitnessNotifications',
    'community_invitation': 'communityNotifications',
    'community_post': 'communityNotifications',
    'feature_update': 'systemNotifications'
  };
  
  const category = categoryMap[type];
  if (!category) return true;
  
  const typeKey = type.replace('_', '');
  return preferences[category][typeKey] !== false;
}

function applyChannelPreferences(channels, preferences) {
  // Apply user's channel preferences to notification channels
  return {
    inApp: channels.inApp && preferences.inAppNotifications,
    push: channels.push && preferences.pushNotifications,
    email: channels.email && preferences.emailNotifications,
    sms: channels.sms && preferences.smsNotifications,
    websocket: channels.websocket && preferences.inAppNotifications
  };
}

export { EnhancedNotification, NotificationPreference };
