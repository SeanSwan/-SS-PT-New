/**
 * ENHANCED MESSAGING SYSTEM - 7-STAR SOCIAL MEDIA EXPERIENCE
 * ===========================================================
 * Advanced real-time messaging with rich media, AI features,
 * group conversations, and comprehensive message management.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

// CONVERSATION MODEL
// ==================
const Conversation = db.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // CONVERSATION DETAILS
  // ====================
  title: {
    type: DataTypes.STRING(200),
    allowNull: true // Null for direct messages, set for group chats
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('direct', 'group', 'community', 'broadcast', 'support'),
    defaultValue: 'direct',
    allowNull: false
  },
  
  // VISUAL IDENTITY
  // ===============
  avatar: {
    type: DataTypes.STRING,
    allowNull: true // Group conversation avatar
  },
  theme: {
    type: DataTypes.JSON, // Conversation theme/colors
    defaultValue: {}
  },
  
  // CREATOR & OWNERSHIP
  // ===================
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  admins: {
    type: DataTypes.JSON, // Array of admin user IDs
    defaultValue: []
  },
  
  // CONVERSATION SETTINGS
  // =====================
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  requiresApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // For joining group conversations
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: true // Null = unlimited
  },
  allowFileSharing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allowVoiceMessages: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allowVideoMessages: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // MODERATION & SAFETY
  // ===================
  moderationLevel: {
    type: DataTypes.ENUM('none', 'basic', 'strict'),
    defaultValue: 'basic'
  },
  autoModeration: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  wordFilters: {
    type: DataTypes.JSON, // Custom word filters for this conversation
    defaultValue: []
  },
  
  // ACTIVITY & ENGAGEMENT
  // =====================
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  messageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  participantCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // AI FEATURES
  // ===========
  aiSummaryEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  aiTranslationEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  aiModerationEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // SPECIAL FEATURES
  // ================
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  muteUntil: {
    type: DataTypes.DATE,
    allowNull: true
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
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Conversations',
  timestamps: true,
  indexes: [
    { fields: ['createdBy'], name: 'conversations_creator_idx' },
    { fields: ['type'], name: 'conversations_type_idx' },
    { fields: ['lastActivity'], name: 'conversations_activity_idx' },
    { fields: ['isArchived'], name: 'conversations_archived_idx' },
    { fields: ['isPinned'], name: 'conversations_pinned_idx' }
  ]
});

// MESSAGE MODEL
// =============
const Message = db.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // MESSAGE RELATIONSHIPS
  // =====================
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Conversations',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  replyToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  
  // MESSAGE CONTENT
  // ===============
  content: {
    type: DataTypes.TEXT,
    allowNull: true // Can be null for media-only messages
  },
  contentType: {
    type: DataTypes.ENUM(
      'text', 'rich_text', 'media', 'voice', 'video', 'file', 
      'location', 'contact', 'poll', 'workout_share', 'achievement_share',
      'system', 'reaction_only'
    ),
    defaultValue: 'text'
  },
  
  // RICH MEDIA SUPPORT
  // ==================
  mediaItems: {
    type: DataTypes.JSON, // Array of media objects
    defaultValue: []
    // Format: [{ type: 'image|video|audio|file', url: '', metadata: {} }]
  },
  mediaProcessingStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'completed'
  },
  
  // MESSAGE METADATA
  // ================
  metadata: {
    type: DataTypes.JSON, // Additional message metadata
    defaultValue: {}
  },
  editHistory: {
    type: DataTypes.JSON, // History of message edits
    defaultValue: []
  },
  
  // DELIVERY & READ STATUS
  // ======================
  deliveredTo: {
    type: DataTypes.JSON, // Array of user IDs who received the message
    defaultValue: []
  },
  readBy: {
    type: DataTypes.JSON, // Array of objects: {userId, readAt}
    defaultValue: []
  },
  
  // REACTIONS & ENGAGEMENT
  // ======================
  reactions: {
    type: DataTypes.JSON, // Emoji reactions with user IDs
    defaultValue: {}
    // Format: { "👍": ["user1", "user2"], "❤️": ["user3"] }
  },
  mentionedUsers: {
    type: DataTypes.JSON, // Array of mentioned user IDs
    defaultValue: []
  },
  
  // AI FEATURES
  // ===========
  aiSentiment: {
    type: DataTypes.ENUM('positive', 'neutral', 'negative'),
    allowNull: true
  },
  aiSummary: {
    type: DataTypes.TEXT,
    allowNull: true // AI-generated summary for long messages
  },
  aiTranslations: {
    type: DataTypes.JSON, // Translations in different languages
    defaultValue: {}
  },
  aiModerationFlags: {
    type: DataTypes.JSON, // AI moderation results
    defaultValue: []
  },
  
  // MODERATION & SAFETY
  // ===================
  isModerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  moderationAction: {
    type: DataTypes.ENUM('none', 'flagged', 'hidden', 'deleted'),
    defaultValue: 'none'
  },
  reportCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // MESSAGE STATUS
  // ==============
  status: {
    type: DataTypes.ENUM('sending', 'sent', 'delivered', 'read', 'failed', 'deleted'),
    defaultValue: 'sent'
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isForwarded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  originalMessageId: {
    type: DataTypes.UUID,
    allowNull: true, // For forwarded messages
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  
  // SCHEDULING & AUTOMATION
  // =======================
  isScheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true // For disappearing messages
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
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Messages',
  timestamps: true,
  paranoid: true, // Soft delete support
  indexes: [
    { fields: ['conversationId'], name: 'messages_conversation_idx' },
    { fields: ['senderId'], name: 'messages_sender_idx' },
    { fields: ['createdAt'], name: 'messages_created_idx' },
    { fields: ['status'], name: 'messages_status_idx' },
    { fields: ['contentType'], name: 'messages_content_type_idx' },
    { fields: ['replyToId'], name: 'messages_reply_to_idx' },
    { 
      fields: ['conversationId', 'createdAt'], 
      name: 'messages_conversation_timeline_idx' 
    },
    {
      fields: ['senderId', 'conversationId', 'createdAt'],
      name: 'messages_sender_conversation_idx'
    }
  ],
  hooks: {
    beforeCreate: async (message) => {
      // Process mentions
      if (message.content) {
        const mentions = extractMentions(message.content);
        message.mentionedUsers = mentions;
      }
      
      // AI content analysis
      if (message.content && message.contentType === 'text') {
        message.aiSentiment = await analyzeMessageSentiment(message.content);
        message.aiModerationFlags = await moderateMessageContent(message.content);
      }
    },
    afterCreate: async (message) => {
      // Update conversation last activity
      await updateConversationActivity(message.conversationId);
      
      // Send real-time notifications
      await sendMessageNotifications(message);
      
      // Send push notifications to offline users
      await sendPushNotifications(message);
    },
    afterUpdate: async (message) => {
      if (message.changed('content')) {
        message.isEdited = true;
        message.editedAt = new Date();
        
        // Add to edit history
        const editHistory = message.editHistory || [];
        editHistory.push({
          editedAt: new Date(),
          previousContent: message._previousDataValues.content
        });
        message.editHistory = editHistory;
      }
    }
  }
});

// CONVERSATION PARTICIPANT MODEL
// ==============================
const ConversationParticipant = db.define('ConversationParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // RELATIONSHIPS
  // =============
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Conversations',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  
  // PARTICIPANT STATUS & ROLE
  // =========================
  status: {
    type: DataTypes.ENUM('active', 'left', 'removed', 'banned'),
    defaultValue: 'active'
  },
  role: {
    type: DataTypes.ENUM('participant', 'moderator', 'admin'),
    defaultValue: 'participant'
  },
  
  // PARTICIPATION DETAILS
  // =====================
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  invitedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // READING & ACTIVITY
  // ==================
  lastReadMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  lastReadAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastActive: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // NOTIFICATION SETTINGS
  // =====================
  notificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  pushNotificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  mentionNotificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  muteUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // PARTICIPANT PREFERENCES
  // =======================
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true // Custom nickname in this conversation
  },
  customTheme: {
    type: DataTypes.JSON, // User's custom theme for this conversation
    defaultValue: {}
  },
  
  // ACTIVITY METRICS
  // ================
  messagesSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mediaShared: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reactionsGiven: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // TIMESTAMPS
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ConversationParticipants',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['conversationId', 'userId'],
      name: 'unique_conversation_participant'
    },
    { fields: ['conversationId'], name: 'conversation_participants_conversation_idx' },
    { fields: ['userId'], name: 'conversation_participants_user_idx' },
    { fields: ['status'], name: 'conversation_participants_status_idx' },
    { fields: ['lastActive'], name: 'conversation_participants_activity_idx' }
  ]
});

// ===================
// CLASS METHODS
// ===================

/**
 * Create a direct conversation between two users
 */
Conversation.createDirectConversation = async function(user1Id, user2Id) {
  // Check if conversation already exists
  const existingConversation = await this.findOne({
    where: { type: 'direct' },
    include: [{
      model: ConversationParticipant,
      where: {
        userId: { [db.Sequelize.Op.in]: [user1Id, user2Id] }
      },
      having: db.Sequelize.literal('COUNT(*) = 2')
    }]
  });
  
  if (existingConversation) {
    return existingConversation;
  }
  
  // Create new conversation
  const conversation = await this.create({
    type: 'direct',
    createdBy: user1Id,
    participantCount: 2
  });
  
  // Add participants
  await Promise.all([
    ConversationParticipant.create({
      conversationId: conversation.id,
      userId: user1Id
    }),
    ConversationParticipant.create({
      conversationId: conversation.id,
      userId: user2Id
    })
  ]);
  
  return conversation;
};

/**
 * Create a group conversation
 */
Conversation.createGroupConversation = async function(creatorId, title, participantIds, options = {}) {
  const conversation = await this.create({
    type: 'group',
    title,
    description: options.description,
    createdBy: creatorId,
    admins: [creatorId],
    maxParticipants: options.maxParticipants,
    isPrivate: options.isPrivate !== false,
    participantCount: participantIds.length + 1
  });
  
  // Add creator as admin
  await ConversationParticipant.create({
    conversationId: conversation.id,
    userId: creatorId,
    role: 'admin'
  });
  
  // Add other participants
  await Promise.all(
    participantIds.map(userId => 
      ConversationParticipant.create({
        conversationId: conversation.id,
        userId,
        invitedBy: creatorId
      })
    )
  );
  
  return conversation;
};

/**
 * Send a message
 */
Message.sendMessage = async function(senderId, conversationId, content, options = {}) {
  // Verify sender is participant
  const participant = await ConversationParticipant.findOne({
    where: { 
      conversationId, 
      userId: senderId, 
      status: 'active' 
    }
  });
  
  if (!participant) {
    throw new Error('User is not a participant in this conversation');
  }
  
  const message = await this.create({
    conversationId,
    senderId,
    content,
    contentType: options.contentType || 'text',
    mediaItems: options.mediaItems || [],
    replyToId: options.replyToId,
    metadata: options.metadata || {}
  });
  
  // Update participant activity
  await participant.update({
    lastActive: new Date(),
    messagesSent: participant.messagesSent + 1
  });
  
  return message;
};

/**
 * Get conversation messages with pagination
 */
Message.getConversationMessages = async function(conversationId, userId, options = {}) {
  const { limit = 50, offset = 0, before = null, after = null } = options;
  
  // Verify user is participant
  const participant = await ConversationParticipant.findOne({
    where: { conversationId, userId, status: 'active' }
  });
  
  if (!participant) {
    throw new Error('User is not a participant in this conversation');
  }
  
  const whereClause = { conversationId };
  
  if (before) {
    whereClause.createdAt = { [db.Sequelize.Op.lt]: before };
  }
  if (after) {
    whereClause.createdAt = { [db.Sequelize.Op.gt]: after };
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      },
      {
        model: Message,
        as: 'replyTo',
        attributes: ['id', 'content', 'senderId'],
        include: [{
          model: db.models.User,
          as: 'sender',
          attributes: ['firstName', 'lastName', 'username']
        }]
      }
    ]
  });
};

/**
 * Mark messages as read
 */
Message.markAsRead = async function(conversationId, userId, messageId = null) {
  const participant = await ConversationParticipant.findOne({
    where: { conversationId, userId, status: 'active' }
  });
  
  if (!participant) {
    throw new Error('User is not a participant in this conversation');
  }
  
  // If no specific message, mark all as read up to latest
  const targetMessage = messageId ? 
    await this.findByPk(messageId) :
    await this.findOne({
      where: { conversationId },
      order: [['createdAt', 'DESC']]
    });
  
  if (targetMessage) {
    await participant.update({
      lastReadMessageId: targetMessage.id,
      lastReadAt: new Date()
    });
    
    // Update message read status
    const readBy = targetMessage.readBy || [];
    if (!readBy.find(r => r.userId === userId)) {
      readBy.push({ userId, readAt: new Date() });
      await targetMessage.update({ readBy });
    }
  }
};

// ===================
// HELPER FUNCTIONS
// ===================

function extractMentions(content) {
  // Extract @username mentions from message content
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

async function analyzeMessageSentiment(content) {
  // Placeholder for AI sentiment analysis
  // Would integrate with sentiment analysis service
  return 'neutral';
}

async function moderateMessageContent(content) {
  // Placeholder for AI content moderation
  // Would integrate with content moderation service
  return [];
}

async function updateConversationActivity(conversationId) {
  await Conversation.update(
    { lastActivity: new Date() },
    { where: { id: conversationId } }
  );
}

async function sendMessageNotifications(message) {
  // Send real-time notifications via WebSocket
  // This would integrate with the real-time notification system
}

async function sendPushNotifications(message) {
  // Send push notifications to mobile devices
  // This would integrate with push notification service
}

export { Conversation, Message, ConversationParticipant };
