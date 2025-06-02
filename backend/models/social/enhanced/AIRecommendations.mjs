/**
 * AI-POWERED RECOMMENDATION ENGINE MODELS - 7-STAR SOCIAL MEDIA
 * ==============================================================
 * Advanced AI recommendation system for personalized content discovery,
 * user matching, product suggestions, and intelligent feed curation.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

// USER PREFERENCE MODEL
// =====================
const UserPreferences = db.define('UserPreferences', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // CONTENT PREFERENCES
  // ===================
  contentCategories: {
    type: DataTypes.JSON, // Preferred content categories with weights
    defaultValue: {}
    // Format: { "fitness": 0.8, "nutrition": 0.6, "motivation": 0.7 }
  },
  fitnessInterests: {
    type: DataTypes.JSON, // Specific fitness interests
    defaultValue: []
    // Format: ["yoga", "weightlifting", "cardio", "dance"]
  },
  skillLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    defaultValue: 'beginner'
  },
  fitnessGoals: {
    type: DataTypes.JSON, // User's fitness goals
    defaultValue: []
    // Format: ["weight_loss", "muscle_gain", "endurance", "flexibility"]
  },
  
  // SOCIAL PREFERENCES
  // ==================
  preferredCreators: {
    type: DataTypes.JSON, // Favorite creator types
    defaultValue: []
  },
  communityTypes: {
    type: DataTypes.JSON, // Preferred community types
    defaultValue: []
  },
  interactionStyle: {
    type: DataTypes.ENUM('passive', 'moderate', 'active', 'highly_active'),
    defaultValue: 'moderate'
  },
  privacyLevel: {
    type: DataTypes.ENUM('open', 'selective', 'private'),
    defaultValue: 'selective'
  },
  
  // CONTENT CONSUMPTION PATTERNS
  // =============================
  preferredContentTypes: {
    type: DataTypes.JSON, // Video, image, text preferences
    defaultValue: {
      video: 0.7,
      image: 0.8,
      text: 0.5,
      live_stream: 0.6,
      audio: 0.4
    }
  },
  contentLength: {
    type: DataTypes.ENUM('short', 'medium', 'long', 'mixed'),
    defaultValue: 'mixed'
  },
  viewingTimes: {
    type: DataTypes.JSON, // Preferred times for content consumption
    defaultValue: {}
    // Format: { "morning": 0.8, "afternoon": 0.6, "evening": 0.9 }
  },
  
  // PRODUCT & SHOPPING PREFERENCES
  // ===============================
  productCategories: {
    type: DataTypes.JSON, // Preferred product categories
    defaultValue: {}
  },
  priceRange: {
    type: DataTypes.JSON, // Price preferences by category
    defaultValue: {}
    // Format: { "supplements": { "min": 10, "max": 100 } }
  },
  brandPreferences: {
    type: DataTypes.JSON, // Preferred brands and their weights
    defaultValue: {}
  },
  shoppingBehavior: {
    type: DataTypes.ENUM('impulse', 'research_heavy', 'deal_seeker', 'brand_loyal'),
    defaultValue: 'research_heavy'
  },
  
  // EVENT & ACTIVITY PREFERENCES
  // =============================
  eventTypes: {
    type: DataTypes.JSON, // Preferred event types
    defaultValue: []
  },
  eventLocations: {
    type: DataTypes.ENUM('local', 'virtual', 'travel', 'mixed'),
    defaultValue: 'mixed'
  },
  groupSize: {
    type: DataTypes.ENUM('small', 'medium', 'large', 'any'),
    defaultValue: 'any'
  },
  timeCommitment: {
    type: DataTypes.ENUM('short', 'medium', 'long', 'flexible'),
    defaultValue: 'flexible'
  },
  
  // AI LEARNING PREFERENCES
  // ========================
  allowAILearning: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  personalizationLevel: {
    type: DataTypes.ENUM('minimal', 'moderate', 'aggressive'),
    defaultValue: 'moderate'
  },
  feedbackFrequency: {
    type: DataTypes.ENUM('never', 'occasional', 'frequent'),
    defaultValue: 'occasional'
  },
  
  // NOTIFICATION PREFERENCES
  // ========================
  recommendationNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  weeklyDigest: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  trendingAlerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // LOCATION & TIMING
  // =================
  location: {
    type: DataTypes.JSON, // User's location preferences
    defaultValue: null
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC'
  },
  activeHours: {
    type: DataTypes.JSON, // When user is typically active
    defaultValue: {}
  },
  
  // METADATA
  // ========
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  profileCompleteness: {
    type: DataTypes.DECIMAL(3, 2), // 0-100% profile completeness
    defaultValue: 0.0
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
  tableName: 'UserPreferences',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId'], name: 'user_preferences_user_idx' },
    { fields: ['skillLevel'], name: 'user_preferences_skill_level_idx' },
    { fields: ['interactionStyle'], name: 'user_preferences_interaction_idx' },
    { fields: ['personalizationLevel'], name: 'user_preferences_personalization_idx' },
    { fields: ['profileCompleteness'], name: 'user_preferences_completeness_idx' }
  ]
});

// USER INTERACTION TRACKING MODEL
// ================================
const UserInteraction = db.define('UserInteraction', {
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
  
  // INTERACTION DETAILS
  // ===================
  interactionType: {
    type: DataTypes.ENUM(
      'view', 'like', 'comment', 'share', 'save', 'click', 'follow',
      'unfollow', 'join', 'leave', 'purchase', 'add_to_cart',
      'search', 'filter', 'scroll', 'hover', 'play', 'pause',
      'skip', 'complete', 'download', 'subscribe', 'unsubscribe'
    ),
    allowNull: false
  },
  
  // TARGET ENTITY
  // =============
  targetType: {
    type: DataTypes.ENUM(
      'post', 'user', 'community', 'product', 'event', 'video',
      'article', 'workout', 'challenge', 'course', 'brand',
      'live_stream', 'story', 'reel', 'comment'
    ),
    allowNull: false
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  
  // INTERACTION CONTEXT
  // ===================
  context: {
    type: DataTypes.JSON, // Additional context about the interaction
    defaultValue: {}
    // Format: { "source": "feed", "position": 3, "recommendation_id": "uuid" }
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in seconds (for views, etc.)
    allowNull: true
  },
  engagementDepth: {
    type: DataTypes.ENUM('surface', 'moderate', 'deep'),
    defaultValue: 'surface'
  },
  
  // DEVICE & LOCATION
  // =================
  deviceType: {
    type: DataTypes.ENUM('mobile', 'tablet', 'desktop', 'smart_tv'),
    allowNull: true
  },
  platform: {
    type: DataTypes.ENUM('web', 'ios', 'android', 'api'),
    allowNull: true
  },
  location: {
    type: DataTypes.JSON, // Geographic location if available
    defaultValue: null
  },
  
  // TEMPORAL DATA
  // =============
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: true // Session identifier
  },
  
  // AI METADATA
  // ===========
  aiWeight: {
    type: DataTypes.DECIMAL(3, 2), // AI-calculated importance weight
    defaultValue: 1.0
  },
  sentimentScore: {
    type: DataTypes.DECIMAL(3, 2), // Sentiment analysis (-1 to 1)
    allowNull: true
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'UserInteractions',
  timestamps: false, // Using custom timestamp
  indexes: [
    { fields: ['userId'], name: 'user_interactions_user_idx' },
    { fields: ['interactionType'], name: 'user_interactions_type_idx' },
    { fields: ['targetType'], name: 'user_interactions_target_type_idx' },
    { fields: ['targetId'], name: 'user_interactions_target_id_idx' },
    { fields: ['timestamp'], name: 'user_interactions_timestamp_idx' },
    { fields: ['sessionId'], name: 'user_interactions_session_idx' },
    { fields: ['deviceType'], name: 'user_interactions_device_idx' },
    {
      fields: ['userId', 'timestamp'],
      name: 'user_interactions_user_timeline_idx'
    },
    {
      fields: ['targetType', 'targetId', 'interactionType'],
      name: 'user_interactions_target_interaction_idx'
    }
  ]
});

// RECOMMENDATION MODEL
// ====================
const Recommendation = db.define('Recommendation', {
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
  
  // RECOMMENDATION DETAILS
  // ======================
  recommendationType: {
    type: DataTypes.ENUM(
      'content', 'user', 'product', 'event', 'community',
      'challenge', 'workout', 'course', 'creator', 'brand'
    ),
    allowNull: false
  },
  
  // TARGET ENTITY
  // =============
  targetType: {
    type: DataTypes.ENUM(
      'post', 'user', 'community', 'product', 'event', 'video',
      'workout', 'challenge', 'course', 'brand', 'live_stream'
    ),
    allowNull: false
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  
  // AI SCORING
  // ==========
  confidenceScore: {
    type: DataTypes.DECIMAL(5, 4), // 0-1 confidence in recommendation
    allowNull: false
  },
  relevanceScore: {
    type: DataTypes.DECIMAL(5, 4), // 0-1 relevance to user
    allowNull: false
  },
  diversityScore: {
    type: DataTypes.DECIMAL(5, 4), // 0-1 diversity factor
    defaultValue: 0.5
  },
  noveltyScore: {
    type: DataTypes.DECIMAL(5, 4), // 0-1 novelty factor
    defaultValue: 0.5
  },
  overallScore: {
    type: DataTypes.DECIMAL(5, 4), // Combined final score
    allowNull: false
  },
  
  // RECOMMENDATION ALGORITHM
  // ========================
  algorithm: {
    type: DataTypes.ENUM(
      'collaborative_filtering', 'content_based', 'hybrid',
      'deep_learning', 'matrix_factorization', 'clustering',
      'popularity_based', 'knowledge_based'
    ),
    allowNull: false
  },
  modelVersion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  
  // RECOMMENDATION REASONS
  // ======================
  reasons: {
    type: DataTypes.JSON, // Why this was recommended
    defaultValue: []
    // Format: ["similar_users_liked", "matches_your_interests", "trending_in_your_area"]
  },
  similarUsers: {
    type: DataTypes.JSON, // Similar users who liked this
    defaultValue: []
  },
  
  // CONTEXTUAL FACTORS
  // ==================
  context: {
    type: DataTypes.JSON, // Context when recommendation was generated
    defaultValue: {}
  },
  timeOfDay: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  dayOfWeek: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  season: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // DELIVERY & TRACKING
  // ===================
  status: {
    type: DataTypes.ENUM('pending', 'delivered', 'viewed', 'interacted', 'dismissed', 'expired'),
    defaultValue: 'pending'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  interactedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // PERFORMANCE METRICS
  // ===================
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  clickThroughRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.0
  },
  conversionRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.0
  },
  
  // FEEDBACK
  // ========
  userFeedback: {
    type: DataTypes.ENUM('positive', 'negative', 'neutral'),
    allowNull: true
  },
  feedbackReason: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  feedbackAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // EXPIRATION
  // ==========
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // RECOMMENDATION SET
  // ==================
  batchId: {
    type: DataTypes.UUID,
    allowNull: true // For grouping recommendations generated together
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true // Position in recommendation list
  },
  
  generatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
  tableName: 'Recommendations',
  timestamps: true,
  indexes: [
    { fields: ['userId'], name: 'recommendations_user_idx' },
    { fields: ['recommendationType'], name: 'recommendations_type_idx' },
    { fields: ['targetType'], name: 'recommendations_target_type_idx' },
    { fields: ['targetId'], name: 'recommendations_target_id_idx' },
    { fields: ['status'], name: 'recommendations_status_idx' },
    { fields: ['overallScore'], name: 'recommendations_score_idx' },
    { fields: ['algorithm'], name: 'recommendations_algorithm_idx' },
    { fields: ['generatedAt'], name: 'recommendations_generated_idx' },
    { fields: ['expiresAt'], name: 'recommendations_expires_idx' },
    { fields: ['batchId'], name: 'recommendations_batch_idx' },
    {
      fields: ['userId', 'status', 'overallScore'],
      name: 'recommendations_user_active_idx'
    },
    {
      fields: ['targetType', 'targetId', 'overallScore'],
      name: 'recommendations_target_performance_idx'
    }
  ]
});

// CONTENT SIMILARITY MODEL
// =========================
const ContentSimilarity = db.define('ContentSimilarity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // SOURCE CONTENT
  // ==============
  sourceType: {
    type: DataTypes.ENUM(
      'post', 'product', 'event', 'workout', 'challenge',
      'course', 'video', 'article', 'user', 'community'
    ),
    allowNull: false
  },
  sourceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  
  // SIMILAR CONTENT
  // ===============
  similarType: {
    type: DataTypes.ENUM(
      'post', 'product', 'event', 'workout', 'challenge',
      'course', 'video', 'article', 'user', 'community'
    ),
    allowNull: false
  },
  similarId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  
  // SIMILARITY METRICS
  // ==================
  similarityScore: {
    type: DataTypes.DECIMAL(5, 4), // 0-1 overall similarity
    allowNull: false
  },
  contentSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Content-based similarity
    defaultValue: 0.0
  },
  behavioralSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // User behavior similarity
    defaultValue: 0.0
  },
  semanticSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Semantic meaning similarity
    defaultValue: 0.0
  },
  visualSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Visual similarity (for media)
    defaultValue: 0.0
  },
  
  // SIMILARITY FEATURES
  // ===================
  sharedFeatures: {
    type: DataTypes.JSON, // Common features/attributes
    defaultValue: []
  },
  sharedTags: {
    type: DataTypes.JSON, // Common tags
    defaultValue: []
  },
  sharedCategories: {
    type: DataTypes.JSON, // Common categories
    defaultValue: []
  },
  
  // ALGORITHM METADATA
  // ==================
  algorithm: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  modelVersion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  computedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // VALIDATION
  // ==========
  isValidated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  validationScore: {
    type: DataTypes.DECIMAL(3, 2), // Human validation score
    allowNull: true
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ContentSimilarities',
  timestamps: false, // Using custom computedAt
  indexes: [
    { fields: ['sourceType', 'sourceId'], name: 'content_similarities_source_idx' },
    { fields: ['similarType', 'similarId'], name: 'content_similarities_similar_idx' },
    { fields: ['similarityScore'], name: 'content_similarities_score_idx' },
    { fields: ['algorithm'], name: 'content_similarities_algorithm_idx' },
    { fields: ['computedAt'], name: 'content_similarities_computed_idx' },
    {
      unique: true,
      fields: ['sourceType', 'sourceId', 'similarType', 'similarId'],
      name: 'unique_content_similarity'
    }
  ]
});

// USER SIMILARITY MODEL
// =====================
const UserSimilarity = db.define('UserSimilarity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  user1Id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  user2Id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // SIMILARITY SCORES
  // =================
  overallSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // 0-1 overall similarity
    allowNull: false
  },
  interestSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Interest overlap
    defaultValue: 0.0
  },
  behaviorSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Behavioral patterns
    defaultValue: 0.0
  },
  demographicSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Demographics
    defaultValue: 0.0
  },
  activitySimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Activity patterns
    defaultValue: 0.0
  },
  contentSimilarity: {
    type: DataTypes.DECIMAL(5, 4), // Content preferences
    defaultValue: 0.0
  },
  
  // SHARED ATTRIBUTES
  // =================
  sharedInterests: {
    type: DataTypes.JSON, // Common interests
    defaultValue: []
  },
  sharedCommunities: {
    type: DataTypes.JSON, // Common communities
    defaultValue: []
  },
  sharedConnections: {
    type: DataTypes.JSON, // Mutual connections
    defaultValue: []
  },
  sharedActivities: {
    type: DataTypes.JSON, // Common activities
    defaultValue: []
  },
  
  // ALGORITHM DATA
  // ==============
  algorithm: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  confidence: {
    type: DataTypes.DECIMAL(3, 2), // Confidence in similarity score
    defaultValue: 0.5
  },
  
  // TEMPORAL DATA
  // =============
  computedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // VALIDATION
  // ==========
  isValidated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  validationSource: {
    type: DataTypes.ENUM('user_feedback', 'interaction_data', 'manual_review'),
    allowNull: true
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'UserSimilarities',
  timestamps: false, // Using custom timestamps
  indexes: [
    { fields: ['user1Id'], name: 'user_similarities_user1_idx' },
    { fields: ['user2Id'], name: 'user_similarities_user2_idx' },
    { fields: ['overallSimilarity'], name: 'user_similarities_score_idx' },
    { fields: ['algorithm'], name: 'user_similarities_algorithm_idx' },
    { fields: ['computedAt'], name: 'user_similarities_computed_idx' },
    {
      unique: true,
      fields: ['user1Id', 'user2Id'],
      name: 'unique_user_similarity'
    }
  ]
});

// =====================
// CLASS METHODS
// =====================

/**
 * Track user interaction
 */
UserInteraction.trackInteraction = async function(userId, interactionData) {
  const interaction = await this.create({
    userId,
    ...interactionData,
    timestamp: new Date()
  });
  
  // Update user preferences based on interaction
  await updateUserPreferencesFromInteraction(userId, interaction);
  
  return interaction;
};

/**
 * Generate recommendations for user
 */
Recommendation.generateForUser = async function(userId, options = {}) {
  const { 
    type = 'content', 
    limit = 20, 
    algorithm = 'hybrid',
    context = {} 
  } = options;
  
  // Get user preferences and recent interactions
  const [preferences, recentInteractions] = await Promise.all([
    UserPreferences.findOne({ where: { userId } }),
    UserInteraction.findAll({
      where: { 
        userId,
        timestamp: { [db.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      limit: 100,
      order: [['timestamp', 'DESC']]
    })
  ]);
  
  // Generate recommendations using AI algorithm
  const recommendations = await generateRecommendations(
    userId, 
    preferences, 
    recentInteractions, 
    { type, limit, algorithm, context }
  );
  
  // Save recommendations to database
  const batchId = DataTypes.UUIDV4();
  const savedRecommendations = await Promise.all(
    recommendations.map((rec, index) => 
      this.create({
        ...rec,
        userId,
        batchId,
        position: index,
        generatedAt: new Date()
      })
    )
  );
  
  return savedRecommendations;
};

/**
 * Get personalized feed
 */
Recommendation.getPersonalizedFeed = async function(userId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  
  return this.findAll({
    where: {
      userId,
      recommendationType: 'content',
      status: ['pending', 'delivered'],
      expiresAt: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.gt]: new Date() }] }
    },
    limit,
    offset,
    order: [['overallScore', 'DESC'], ['generatedAt', 'DESC']]
  });
};

/**
 * Provide feedback on recommendation
 */
Recommendation.provideFeedback = async function(recommendationId, feedback, reason = null) {
  const recommendation = await this.findByPk(recommendationId);
  if (!recommendation) {
    throw new Error('Recommendation not found');
  }
  
  return recommendation.update({
    userFeedback: feedback,
    feedbackReason: reason,
    feedbackAt: new Date(),
    status: feedback === 'positive' ? 'interacted' : 'dismissed'
  });
};

/**
 * Find similar users
 */
UserSimilarity.findSimilarUsers = async function(userId, options = {}) {
  const { limit = 20, minSimilarity = 0.5 } = options;
  
  return this.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        { 
          user1Id: userId,
          overallSimilarity: { [db.Sequelize.Op.gte]: minSimilarity }
        },
        { 
          user2Id: userId,
          overallSimilarity: { [db.Sequelize.Op.gte]: minSimilarity }
        }
      ]
    },
    limit,
    order: [['overallSimilarity', 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'user1',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      },
      {
        model: db.models.User,
        as: 'user2',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
};

/**
 * Find similar content
 */
ContentSimilarity.findSimilarContent = async function(contentType, contentId, options = {}) {
  const { limit = 10, minSimilarity = 0.3 } = options;
  
  return this.findAll({
    where: {
      sourceType: contentType,
      sourceId: contentId,
      similarityScore: { [db.Sequelize.Op.gte]: minSimilarity }
    },
    limit,
    order: [['similarityScore', 'DESC']]
  });
};

// ===================
// HELPER FUNCTIONS
// ===================

async function updateUserPreferencesFromInteraction(userId, interaction) {
  // Update user preferences based on interaction patterns
  // This would be a complex AI algorithm that learns from user behavior
}

async function generateRecommendations(userId, preferences, interactions, options) {
  // AI recommendation generation algorithm
  // This would integrate with machine learning models
  // Placeholder implementation
  return [
    {
      recommendationType: options.type,
      targetType: 'post',
      targetId: DataTypes.UUIDV4(),
      confidenceScore: 0.85,
      relevanceScore: 0.90,
      overallScore: 0.87,
      algorithm: options.algorithm,
      modelVersion: '1.0',
      reasons: ['matches_your_interests', 'popular_with_similar_users']
    }
  ];
}

export { UserPreferences, UserInteraction, Recommendation, ContentSimilarity, UserSimilarity };
