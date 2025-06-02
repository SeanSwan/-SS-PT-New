/**
 * ENHANCED SOCIAL POST MODEL - 7-STAR SOCIAL MEDIA EXPERIENCE
 * ===========================================================
 * Revolutionary social posting system with AI integration, rich media,
 * advanced engagement features, and comprehensive content management.
 * 
 * Aligned with SwanStudios Master Prompt v28 for award-winning social platform.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

const EnhancedSocialPost = db.define('EnhancedSocialPost', {
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
  
  // CONTENT MANAGEMENT
  // ==================
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 10000] // Rich content support
    }
  },
  contentType: {
    type: DataTypes.ENUM(
      'text', 'rich_text', 'markdown', 'workout_summary', 
      'achievement_showcase', 'transformation_story', 'recipe_share',
      'challenge_update', 'live_stream', 'poll', 'question', 'tip'
    ),
    defaultValue: 'text',
    allowNull: false
  },
  
  // AI-ENHANCED CONTENT
  // ===================
  aiGeneratedTags: {
    type: DataTypes.JSON, // AI-suggested hashtags and categories
    defaultValue: []
  },
  aiContentScore: {
    type: DataTypes.DECIMAL(3, 2), // AI quality/engagement prediction (0-10)
    defaultValue: 0.0
  },
  aiModerationFlags: {
    type: DataTypes.JSON, // AI content moderation results
    defaultValue: {}
  },
  aiPersonalizationData: {
    type: DataTypes.JSON, // Data for AI-powered feed personalization
    defaultValue: {}
  },
  
  // RICH MEDIA SUPPORT
  // ==================
  mediaItems: {
    type: DataTypes.JSON, // Array of media objects with metadata
    defaultValue: [],
    // Format: [{ type: 'image|video|audio', url: '', thumbnail: '', metadata: {} }]
  },
  mediaProcessingStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'completed'
  },
  
  // ADVANCED CATEGORIZATION
  // =======================
  category: {
    type: DataTypes.ENUM(
      'fitness', 'nutrition', 'mental_health', 'transformation', 
      'motivation', 'education', 'community', 'challenge', 
      'achievement', 'lifestyle', 'product_review', 'tips'
    ),
    defaultValue: 'fitness'
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true // More specific categorization
  },
  tags: {
    type: DataTypes.JSON, // User-defined hashtags and tags
    defaultValue: []
  },
  
  // PRIVACY & VISIBILITY
  // ====================
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'followers', 'private', 'subscribers_only'),
    defaultValue: 'friends',
    allowNull: false
  },
  allowComments: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allowSharing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allowAIAnalysis: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  viewsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  saveCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  engagementScore: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.0
  },
  
  // INTERACTIVE FEATURES
  // ====================
  isPoll: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pollData: {
    type: DataTypes.JSON, // Poll options, votes, expiry
    defaultValue: null
  },
  isLiveStream: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  liveStreamData: {
    type: DataTypes.JSON, // Stream URL, viewer count, chat settings
    defaultValue: null
  },
  
  // COMMUNITY FEATURES
  // ==================
  communityId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Communities',
      key: 'id'
    }
  },
  isPromoted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // MONETIZATION
  // ============
  isSponsored: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sponsorData: {
    type: DataTypes.JSON, // Sponsor info, disclosure requirements
    defaultValue: null
  },
  monetizationEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // CONTENT RELATIONSHIPS
  // =====================
  workoutSessionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'WorkoutSessions',
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
  achievementId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Achievements',
      key: 'id'
    }
  },
  originalPostId: { // For shares/reposts
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'EnhancedSocialPosts',
      key: 'id'
    }
  },
  
  // CONTENT MODERATION
  // ==================
  moderationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'flagged', 'removed', 'appealed'),
    defaultValue: 'approved'
  },
  moderationFlags: {
    type: DataTypes.JSON, // User reports, AI flags, manual review notes
    defaultValue: []
  },
  moderatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  moderatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // LOCATION & CONTEXT
  // ==================
  location: {
    type: DataTypes.JSON, // Geo-location data for fitness check-ins
    defaultValue: null
  },
  contextData: {
    type: DataTypes.JSON, // Additional context (weather, music, mood, etc.)
    defaultValue: {}
  },
  
  // ACCESSIBILITY
  // =============
  altText: {
    type: DataTypes.TEXT, // Alt text for images/media
    allowNull: true
  },
  audioDescription: {
    type: DataTypes.TEXT, // Audio descriptions for videos
    allowNull: true
  },
  captionsAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // ANALYTICS & INSIGHTS
  // ====================
  analyticsData: {
    type: DataTypes.JSON, // Detailed engagement analytics
    defaultValue: {}
  },
  reachMetrics: {
    type: DataTypes.JSON, // Reach, impressions, demographics
    defaultValue: {}
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
  autoDeleteAt: {
    type: DataTypes.DATE,
    allowNull: true // For temporary posts (stories-like feature)
  },
  
  // STATUS & LIFECYCLE
  // ==================
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived', 'deleted'),
    defaultValue: 'published'
  },
  publishedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastEditedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // STANDARD TIMESTAMPS
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
  tableName: 'EnhancedSocialPosts',
  timestamps: true,
  paranoid: true, // Soft delete support
  indexes: [
    { fields: ['userId'], name: 'enhanced_social_posts_user_idx' },
    { fields: ['category', 'subcategory'], name: 'enhanced_social_posts_category_idx' },
    { fields: ['visibility'], name: 'enhanced_social_posts_visibility_idx' },
    { fields: ['publishedAt'], name: 'enhanced_social_posts_published_idx' },
    { fields: ['engagementScore'], name: 'enhanced_social_posts_engagement_idx' },
    { fields: ['moderationStatus'], name: 'enhanced_social_posts_moderation_idx' },
    { fields: ['communityId'], name: 'enhanced_social_posts_community_idx' },
    { fields: ['scheduledFor'], name: 'enhanced_social_posts_scheduled_idx' },
    { fields: ['aiContentScore'], name: 'enhanced_social_posts_ai_score_idx' },
    { 
      fields: ['userId', 'publishedAt'], 
      name: 'enhanced_social_posts_user_timeline_idx' 
    },
    {
      fields: ['category', 'publishedAt', 'visibility'],
      name: 'enhanced_social_posts_category_feed_idx'
    }
  ],
  hooks: {
    beforeCreate: async (post) => {
      // Auto-generate AI tags and content analysis
      if (post.allowAIAnalysis) {
        // Placeholder for AI integration
        post.aiGeneratedTags = await generateAITags(post.content);
        post.aiContentScore = await calculateContentScore(post.content, post.mediaItems);
      }
    },
    afterCreate: async (post) => {
      // Trigger real-time notifications to followers
      await notifyFollowers(post.userId, post.id);
      
      // Update user engagement metrics
      await updateUserEngagementStats(post.userId, 'post_created');
    },
    beforeUpdate: async (post) => {
      if (post.changed('content') && post.allowAIAnalysis) {
        // Re-analyze content if changed
        post.aiGeneratedTags = await generateAITags(post.content);
        post.aiContentScore = await calculateContentScore(post.content, post.mediaItems);
        post.lastEditedAt = new Date();
      }
    }
  }
});

// =====================
// ADVANCED CLASS METHODS
// =====================

/**
 * Create a workout achievement post with AI enhancement
 */
EnhancedSocialPost.createWorkoutPost = async function(userId, workoutData, options = {}) {
  const content = options.content || generateWorkoutSummary(workoutData);
  
  return this.create({
    userId,
    content,
    contentType: 'workout_summary',
    category: 'fitness',
    workoutSessionId: workoutData.sessionId,
    visibility: options.visibility || 'friends',
    mediaItems: options.mediaItems || [],
    contextData: {
      workout: workoutData,
      timestamp: new Date(),
      mood: options.mood,
      location: options.location
    },
    allowAIAnalysis: true
  });
};

/**
 * Create an achievement showcase post
 */
EnhancedSocialPost.createAchievementPost = async function(userId, achievementData, options = {}) {
  return this.create({
    userId,
    content: options.content || `🎉 I just earned the "${achievementData.name}" achievement!`,
    contentType: 'achievement_showcase',
    category: 'achievement',
    achievementId: achievementData.id,
    visibility: 'public', // Achievements are typically public
    mediaItems: options.mediaItems || [],
    isPromoted: true, // Highlight achievements
    allowAIAnalysis: true
  });
};

/**
 * Create a poll post
 */
EnhancedSocialPost.createPoll = async function(userId, question, options, settings = {}) {
  const pollData = {
    question,
    options: options.map(opt => ({ text: opt, votes: 0, voters: [] })),
    totalVotes: 0,
    expiresAt: settings.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    allowMultiple: settings.allowMultiple || false,
    showResults: settings.showResults || 'after_vote'
  };
  
  return this.create({
    userId,
    content: question,
    contentType: 'poll',
    isPoll: true,
    pollData,
    category: settings.category || 'community',
    visibility: settings.visibility || 'public',
    allowComments: true,
    allowSharing: true
  });
};

/**
 * Get enhanced feed for user with AI personalization
 */
EnhancedSocialPost.getPersonalizedFeed = async function(userId, options = {}) {
  const { limit = 20, offset = 0, categories = [], onlyFollowing = false } = options;
  
  // Get user's AI personalization preferences
  const userPrefs = await getUserPersonalizationData(userId);
  
  // Build dynamic query based on AI recommendations
  const whereClause = {
    status: 'published',
    moderationStatus: 'approved',
    [db.Sequelize.Op.or]: [
      { visibility: 'public' },
      { 
        visibility: 'friends',
        userId: { [db.Sequelize.Op.in]: await getUserFriendIds(userId) }
      }
    ]
  };
  
  if (categories.length > 0) {
    whereClause.category = { [db.Sequelize.Op.in]: categories };
  }
  
  if (onlyFollowing) {
    whereClause.userId = { [db.Sequelize.Op.in]: await getUserFollowingIds(userId) };
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [
      // AI-enhanced ranking algorithm
      [db.Sequelize.literal('(engagement_score * ai_content_score * CASE WHEN is_promoted THEN 1.5 ELSE 1.0 END)'), 'DESC'],
      ['publishedAt', 'DESC']
    ],
    include: [
      {
        model: db.models.User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      },
      {
        model: db.models.Community,
        as: 'community',
        attributes: ['id', 'name', 'photo', 'isVerified']
      }
    ]
  });
};

/**
 * Get trending posts with advanced analytics
 */
EnhancedSocialPost.getTrendingPosts = async function(timeframe = '24h', options = {}) {
  const { limit = 50, category = null } = options;
  
  const timeframeMaps = {
    '1h': 1,
    '24h': 24,
    '7d': 168,
    '30d': 720
  };
  
  const hoursAgo = timeframeMaps[timeframe] || 24;
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  const whereClause = {
    status: 'published',
    moderationStatus: 'approved',
    visibility: 'public',
    publishedAt: { [db.Sequelize.Op.gte]: cutoffTime }
  };
  
  if (category) {
    whereClause.category = category;
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    order: [
      [db.Sequelize.literal('(likes_count + comments_count * 2 + shares_count * 3 + views_count * 0.1)'), 'DESC'],
      ['engagementScore', 'DESC']
    ],
    include: [
      {
        model: db.models.User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      }
    ]
  });
};

// =====================
// AI HELPER FUNCTIONS (Placeholders for integration)
// =====================

async function generateAITags(content) {
  // Placeholder for AI tag generation
  // Would integrate with OpenAI, Hugging Face, or custom ML models
  return [];
}

async function calculateContentScore(content, mediaItems) {
  // Placeholder for AI content quality scoring
  // Would analyze content quality, engagement potential, etc.
  return 5.0;
}

async function notifyFollowers(userId, postId) {
  // Placeholder for real-time notification system
  // Would integrate with WebSocket/Socket.IO for instant notifications
}

async function updateUserEngagementStats(userId, action) {
  // Placeholder for user analytics updates
  // Would update MongoDB analytics collections
}

async function getUserPersonalizationData(userId) {
  // Placeholder for AI personalization data retrieval
  return {};
}

async function getUserFriendIds(userId) {
  // Get user's friend IDs from Friendship model
  const friendships = await db.models.Friendship.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        { requesterId: userId, status: 'accepted' },
        { recipientId: userId, status: 'accepted' }
      ]
    }
  });
  
  return friendships.map(f => 
    f.requesterId === userId ? f.recipientId : f.requesterId
  );
}

async function getUserFollowingIds(userId) {
  // Get user's following IDs (would need enhanced following system)
  return getUserFriendIds(userId); // Temporary fallback
}

function generateWorkoutSummary(workoutData) {
  // Generate intelligent workout summary
  return `Just completed an amazing workout! 💪 ${workoutData.duration} minutes of pure dedication!`;
}

export default EnhancedSocialPost;
