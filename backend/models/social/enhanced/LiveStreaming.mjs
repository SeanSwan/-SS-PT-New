/**
 * LIVE STREAMING & REAL-TIME INTERACTION MODELS - 7-STAR SOCIAL MEDIA
 * =====================================================================
 * Advanced live streaming system with real-time chat, interactive features,
 * audience engagement tools, and comprehensive analytics.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

// LIVE STREAM MODEL
// =================
const LiveStream = db.define('LiveStream', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // STREAM OWNERSHIP
  // ================
  streamerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // STREAM DETAILS
  // ==============
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // STREAM CATEGORIZATION
  // =====================
  category: {
    type: DataTypes.ENUM(
      'workout', 'yoga', 'cardio', 'strength_training', 'dance',
      'nutrition', 'cooking', 'meditation', 'motivation', 'q_and_a',
      'challenge', 'competition', 'tutorial', 'review', 'lifestyle'
    ),
    allowNull: false
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // TECHNICAL STREAM DATA
  // =====================
  streamKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  streamUrl: {
    type: DataTypes.STRING,
    allowNull: true // Set when stream goes live
  },
  playbackUrl: {
    type: DataTypes.STRING,
    allowNull: true // For viewers
  },
  recordingUrl: {
    type: DataTypes.STRING,
    allowNull: true // Recording after stream ends
  },
  
  // STREAM STATUS & SCHEDULING
  // ==========================
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled', 'processing'),
    defaultValue: 'scheduled'
  },
  scheduledStartTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualStartTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in seconds
    defaultValue: 0
  },
  
  // AUDIENCE & PRIVACY
  // ==================
  visibility: {
    type: DataTypes.ENUM('public', 'followers', 'subscribers', 'private', 'community'),
    defaultValue: 'public'
  },
  maxViewers: {
    type: DataTypes.INTEGER,
    allowNull: true // Null = unlimited
  },
  currentViewers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  peakViewers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalViews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  uniqueViewers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // INTERACTIVE FEATURES
  // ====================
  chatEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  donationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pollsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  qnaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reactionOverlayEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // MONETIZATION
  // ============
  isMonetized: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  subscriptionRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ticketPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true // For paid live events
  },
  donationsReceived: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  revenue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  
  // STREAM QUALITY & SETTINGS
  // ==========================
  quality: {
    type: DataTypes.ENUM('360p', '480p', '720p', '1080p', '1440p', '4k'),
    defaultValue: '720p'
  },
  bitrate: {
    type: DataTypes.INTEGER,
    defaultValue: 2500 // kbps
  },
  frameRate: {
    type: DataTypes.INTEGER,
    defaultValue: 30 // fps
  },
  audioCodec: {
    type: DataTypes.STRING(50),
    defaultValue: 'AAC'
  },
  videoCodec: {
    type: DataTypes.STRING(50),
    defaultValue: 'H.264'
  },
  
  // ENGAGEMENT METRICS
  // ==================
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sharesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reactionsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  averageWatchTime: {
    type: DataTypes.INTEGER, // Seconds
    defaultValue: 0
  },
  engagementScore: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.0
  },
  
  // MODERATION & SAFETY
  // ===================
  moderatorsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  moderators: {
    type: DataTypes.JSON, // Array of moderator user IDs
    defaultValue: []
  },
  autoModerationEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  contentWarnings: {
    type: DataTypes.JSON, // Content warnings/labels
    defaultValue: []
  },
  
  // RECORDING & REPLAY
  // ==================
  recordingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  replayAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  replayViews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  highlightsGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // AI & ANALYTICS
  // ==============
  aiHighlights: {
    type: DataTypes.JSON, // AI-generated highlight timestamps
    defaultValue: []
  },
  aiTags: {
    type: DataTypes.JSON, // AI-generated tags
    defaultValue: []
  },
  sentimentAnalysis: {
    type: DataTypes.JSON, // Audience sentiment data
    defaultValue: {}
  },
  
  // RELATED CONTENT
  // ===============
  workoutPlanId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'WorkoutPlans',
      key: 'id'
    }
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Challenges',
      key: 'id'
    }
  },
  communityId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Communities',
      key: 'id'
    }
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
  tableName: 'LiveStreams',
  timestamps: true,
  indexes: [
    { fields: ['streamerId'], name: 'live_streams_streamer_idx' },
    { fields: ['status'], name: 'live_streams_status_idx' },
    { fields: ['category'], name: 'live_streams_category_idx' },
    { fields: ['scheduledStartTime'], name: 'live_streams_scheduled_idx' },
    { fields: ['visibility'], name: 'live_streams_visibility_idx' },
    { fields: ['currentViewers'], name: 'live_streams_viewers_idx' },
    { fields: ['engagementScore'], name: 'live_streams_engagement_idx' },
    { 
      fields: ['status', 'visibility', 'currentViewers'], 
      name: 'live_streams_discovery_idx' 
    }
  ]
});

// LIVE STREAM VIEWER MODEL
// =========================
const LiveStreamViewer = db.define('LiveStreamViewer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  streamId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'LiveStreams',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Null for anonymous viewers
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // VIEWING SESSION DATA
  // ====================
  sessionId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  watchTime: {
    type: DataTypes.INTEGER, // Total watch time in seconds
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // VIEWER INTERACTION
  // ==================
  messagesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reactionsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  donationAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  
  // DEVICE & LOCATION
  // =================
  deviceInfo: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.JSON,
    defaultValue: {}
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
  tableName: 'LiveStreamViewers',
  timestamps: true,
  indexes: [
    { fields: ['streamId'], name: 'live_stream_viewers_stream_idx' },
    { fields: ['userId'], name: 'live_stream_viewers_user_idx' },
    { fields: ['isActive'], name: 'live_stream_viewers_active_idx' },
    { fields: ['joinedAt'], name: 'live_stream_viewers_joined_idx' },
    {
      unique: true,
      fields: ['streamId', 'userId', 'sessionId'],
      name: 'unique_stream_viewer_session'
    }
  ]
});

// LIVE STREAM CHAT MODEL
// =======================
const LiveStreamChat = db.define('LiveStreamChat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  streamId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'LiveStreams',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Null for anonymous users
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // MESSAGE CONTENT
  // ===============
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 500] // Chat message length limit
    }
  },
  messageType: {
    type: DataTypes.ENUM('chat', 'donation', 'subscription', 'follow', 'system'),
    defaultValue: 'chat'
  },
  
  // SPECIAL MESSAGE DATA
  // ====================
  donationAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  emojis: {
    type: DataTypes.JSON, // Emoji reactions to this message
    defaultValue: {}
  },
  mentions: {
    type: DataTypes.JSON, // User mentions in message
    defaultValue: []
  },
  
  // MODERATION
  // ==========
  isModerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  moderatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  moderationReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // PINNING & HIGHLIGHTING
  // ======================
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isHighlighted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  highlightColor: {
    type: DataTypes.STRING(7),
    allowNull: true // Hex color
  },
  
  // TIMESTAMPS
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'LiveStreamChats',
  timestamps: false, // Using custom timestamp field
  indexes: [
    { fields: ['streamId'], name: 'live_stream_chats_stream_idx' },
    { fields: ['userId'], name: 'live_stream_chats_user_idx' },
    { fields: ['timestamp'], name: 'live_stream_chats_timestamp_idx' },
    { fields: ['messageType'], name: 'live_stream_chats_type_idx' },
    { fields: ['isPinned'], name: 'live_stream_chats_pinned_idx' },
    {
      fields: ['streamId', 'timestamp'],
      name: 'live_stream_chats_stream_timeline_idx'
    }
  ]
});

// LIVE STREAM POLL MODEL
// =======================
const LiveStreamPoll = db.define('LiveStreamPoll', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  streamId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'LiveStreams',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // POLL DETAILS
  // ============
  question: {
    type: DataTypes.STRING(300),
    allowNull: false
  },
  options: {
    type: DataTypes.JSON, // Array of poll options
    allowNull: false
    // Format: [{ id: 1, text: 'Option 1', votes: 0 }, ...]
  },
  
  // POLL SETTINGS
  // =============
  allowMultiple: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  showResults: {
    type: DataTypes.ENUM('always', 'after_vote', 'after_end'),
    defaultValue: 'after_vote'
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in seconds
    defaultValue: 300 // 5 minutes
  },
  
  // POLL STATUS
  // ===========
  status: {
    type: DataTypes.ENUM('active', 'ended', 'cancelled'),
    defaultValue: 'active'
  },
  totalVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // TIMESTAMPS
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
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
  tableName: 'LiveStreamPolls',
  timestamps: true,
  indexes: [
    { fields: ['streamId'], name: 'live_stream_polls_stream_idx' },
    { fields: ['status'], name: 'live_stream_polls_status_idx' },
    { fields: ['endsAt'], name: 'live_stream_polls_ends_idx' }
  ]
});

// LIVE STREAM POLL VOTE MODEL
// ============================
const LiveStreamPollVote = db.define('LiveStreamPollVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  pollId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'LiveStreamPolls',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Null for anonymous votes
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  optionId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: true // For anonymous voter tracking
  },
  
  votedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'LiveStreamPollVotes',
  timestamps: false,
  indexes: [
    { fields: ['pollId'], name: 'live_stream_poll_votes_poll_idx' },
    { fields: ['userId'], name: 'live_stream_poll_votes_user_idx' },
    {
      unique: true,
      fields: ['pollId', 'userId'],
      name: 'unique_poll_user_vote'
    }
  ]
});

// =====================
// CLASS METHODS
// =====================

/**
 * Start a live stream
 */
LiveStream.startStream = async function(streamerId, streamData) {
  const stream = await this.create({
    ...streamData,
    streamerId,
    status: 'scheduled',
    streamKey: generateStreamKey()
  });
  
  return stream;
};

/**
 * Go live
 */
LiveStream.prototype.goLive = async function() {
  return this.update({
    status: 'live',
    actualStartTime: new Date(),
    streamUrl: generateStreamUrl(this.streamKey),
    playbackUrl: generatePlaybackUrl(this.streamKey)
  });
};

/**
 * End stream
 */
LiveStream.prototype.endStream = async function() {
  const duration = this.actualStartTime ? 
    Math.floor((new Date() - this.actualStartTime) / 1000) : 0;
  
  return this.update({
    status: 'ended',
    endTime: new Date(),
    duration
  });
};

/**
 * Get trending live streams
 */
LiveStream.getTrendingStreams = async function(options = {}) {
  const { limit = 20, category = null } = options;
  
  const whereClause = {
    status: 'live',
    visibility: 'public'
  };
  
  if (category) {
    whereClause.category = category;
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    order: [
      ['currentViewers', 'DESC'],
      ['engagementScore', 'DESC']
    ],
    include: [
      {
        model: db.models.User,
        as: 'streamer',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      }
    ]
  });
};

/**
 * Join stream as viewer
 */
LiveStreamViewer.joinStream = async function(streamId, userId = null, deviceInfo = {}) {
  // Check if user is already viewing
  const existingViewer = await this.findOne({
    where: { streamId, userId, isActive: true }
  });
  
  if (existingViewer) {
    return existingViewer;
  }
  
  const viewer = await this.create({
    streamId,
    userId,
    deviceInfo,
    isActive: true
  });
  
  // Update stream viewer count
  await updateStreamViewerCount(streamId);
  
  return viewer;
};

/**
 * Send chat message
 */
LiveStreamChat.sendMessage = async function(streamId, userId, message, options = {}) {
  // Check if user can send messages (not banned, stream allows chat, etc.)
  const stream = await LiveStream.findByPk(streamId);
  if (!stream || !stream.chatEnabled) {
    throw new Error('Chat is not enabled for this stream');
  }
  
  const chatMessage = await this.create({
    streamId,
    userId,
    message,
    messageType: options.messageType || 'chat',
    donationAmount: options.donationAmount
  });
  
  // Send real-time message to all viewers
  await broadcastChatMessage(chatMessage);
  
  return chatMessage;
};

// ===================
// HELPER FUNCTIONS
// ===================

function generateStreamKey() {
  return 'sk_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function generateStreamUrl(streamKey) {
  return `rtmp://live.swanstudios.com/live/${streamKey}`;
}

function generatePlaybackUrl(streamKey) {
  return `https://cdn.swanstudios.com/live/${streamKey}/playlist.m3u8`;
}

async function updateStreamViewerCount(streamId) {
  const activeViewers = await LiveStreamViewer.count({
    where: { streamId, isActive: true }
  });
  
  const stream = await LiveStream.findByPk(streamId);
  if (stream) {
    await stream.update({
      currentViewers: activeViewers,
      peakViewers: Math.max(stream.peakViewers, activeViewers)
    });
  }
}

async function broadcastChatMessage(chatMessage) {
  // Broadcast message to all connected viewers via WebSocket
  // This would integrate with the real-time messaging system
}

export { LiveStream, LiveStreamViewer, LiveStreamChat, LiveStreamPoll, LiveStreamPollVote };
