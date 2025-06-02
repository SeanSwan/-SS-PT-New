/**
 * ENHANCED SOCIAL CONNECTION MODEL - 7-STAR SOCIAL MEDIA EXPERIENCE
 * ==================================================================
 * Advanced friendship and following system with privacy controls,
 * social circles, influence metrics, and AI-powered recommendations.
 * 
 * Supports both friendship (mutual) and following (one-way) relationships
 * with sophisticated privacy and interaction management.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

const SocialConnection = db.define('SocialConnection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // CONNECTION PARTICIPANTS
  // =======================
  followerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  followingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // CONNECTION TYPE & STATUS
  // ========================
  connectionType: {
    type: DataTypes.ENUM('follow', 'friend_request', 'friendship', 'family', 'trainer_client', 'business'),
    defaultValue: 'follow',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined', 'blocked', 'muted', 'unfollowed'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // MUTUAL CONNECTION STATUS
  // ========================
  isMutual: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // True when both users follow each other
  },
  mutualSince: {
    type: DataTypes.DATE,
    allowNull: true // When mutual connection was established
  },
  
  // PRIVACY & INTERACTION SETTINGS
  // ==============================
  privacyLevel: {
    type: DataTypes.ENUM('public', 'friends', 'close_friends', 'family', 'private'),
    defaultValue: 'friends'
  },
  canSeeProfile: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  canSeePosts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  canSeeWorkouts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  canSeeProgress: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  canMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  canTag: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  canInvite: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // NOTIFICATION PREFERENCES
  // ========================
  notifyOnPost: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notifyOnAchievement: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notifyOnWorkout: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notifyOnLive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // SOCIAL CIRCLES & CATEGORIZATION
  // ===============================
  socialCircles: {
    type: DataTypes.JSON, // Array of circle names: ['gym_buddies', 'close_friends', 'work_colleagues']
    defaultValue: []
  },
  connectionSource: {
    type: DataTypes.ENUM(
      'manual', 'contacts', 'recommendations', 'mutual_friends', 
      'location', 'gym', 'challenge', 'trainer_referral', 'ai_suggested'
    ),
    defaultValue: 'manual'
  },
  
  // INTERACTION METRICS
  // ===================
  interactionScore: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.0 // AI-calculated interaction strength
  },
  lastInteraction: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalInteractions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mutualConnectionsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // ENGAGEMENT STATISTICS
  // =====================
  likesGiven: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likesReceived: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  commentsExchanged: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  messagesExchanged: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  workoutsShared: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  challengesCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // AI & RECOMMENDATIONS
  // ====================
  aiCompatibilityScore: {
    type: DataTypes.DECIMAL(5, 3), // 0-10 scale
    defaultValue: 0.0
  },
  aiRecommendationStrength: {
    type: DataTypes.DECIMAL(5, 3),
    defaultValue: 0.0
  },
  sharedInterests: {
    type: DataTypes.JSON, // AI-detected shared interests
    defaultValue: []
  },
  
  // LOCATION & CONTEXT
  // ==================
  connectionLocation: {
    type: DataTypes.JSON, // Where connection was made
    defaultValue: null
  },
  connectionContext: {
    type: DataTypes.JSON, // Event, challenge, gym, etc.
    defaultValue: null
  },
  
  // SPECIAL RELATIONSHIP DATA
  // =========================
  isInfluencer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Is the following user an influencer?
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Is this a verified connection?
  },
  isProfessional: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Professional relationship (trainer, nutritionist)
  },
  professionalRole: {
    type: DataTypes.ENUM('trainer', 'nutritionist', 'coach', 'therapist', 'other'),
    allowNull: true
  },
  
  // COLLABORATION & SHARED ACTIVITIES
  // =================================
  sharedChallenges: {
    type: DataTypes.JSON, // Active shared challenges
    defaultValue: []
  },
  sharedWorkoutPlans: {
    type: DataTypes.JSON, // Shared workout plans
    defaultValue: []
  },
  collaborationHistory: {
    type: DataTypes.JSON, // History of shared activities
    defaultValue: []
  },
  
  // MODERATION & SAFETY
  // ===================
  reportCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  moderationFlags: {
    type: DataTypes.JSON, // Safety flags and reports
    defaultValue: []
  },
  restrictionLevel: {
    type: DataTypes.ENUM('none', 'limited', 'restricted', 'blocked'),
    defaultValue: 'none'
  },
  
  // TIMESTAMPS & LIFECYCLE
  // ======================
  connectedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  disconnectedAt: {
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
  tableName: 'SocialConnections',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['followerId', 'followingId'],
      name: 'unique_social_connection'
    },
    { fields: ['followerId'], name: 'social_connections_follower_idx' },
    { fields: ['followingId'], name: 'social_connections_following_idx' },
    { fields: ['status'], name: 'social_connections_status_idx' },
    { fields: ['connectionType'], name: 'social_connections_type_idx' },
    { fields: ['isMutual'], name: 'social_connections_mutual_idx' },
    { fields: ['interactionScore'], name: 'social_connections_interaction_idx' },
    { fields: ['aiCompatibilityScore'], name: 'social_connections_ai_score_idx' },
    { fields: ['lastInteraction'], name: 'social_connections_last_interaction_idx' },
    { 
      fields: ['followerId', 'status', 'connectionType'], 
      name: 'social_connections_follower_status_idx' 
    },
    {
      fields: ['followingId', 'status', 'isMutual'],
      name: 'social_connections_following_mutual_idx'
    }
  ],
  hooks: {
    beforeCreate: async (connection) => {
      // Prevent self-following
      if (connection.followerId === connection.followingId) {
        throw new Error('Users cannot connect to themselves');
      }
      
      // Check for existing connection
      const existing = await SocialConnection.findOne({
        where: {
          followerId: connection.followerId,
          followingId: connection.followingId
        }
      });
      
      if (existing) {
        throw new Error('Connection already exists');
      }
    },
    afterCreate: async (connection) => {
      // Check for mutual connection
      await checkAndUpdateMutualStatus(connection);
      
      // Calculate initial AI compatibility
      connection.aiCompatibilityScore = await calculateCompatibilityScore(
        connection.followerId, 
        connection.followingId
      );
      
      // Send notification
      await sendConnectionNotification(connection);
    },
    afterUpdate: async (connection) => {
      if (connection.changed('status') && connection.status === 'accepted') {
        await checkAndUpdateMutualStatus(connection);
      }
    }
  }
});

// ===================
// CLASS METHODS
// ===================

/**
 * Send a follow request or follow directly
 */
SocialConnection.follow = async function(followerId, followingId, options = {}) {
  const { connectionType = 'follow', requiresApproval = false } = options;
  
  // Check user privacy settings
  const targetUser = await db.models.User.findByPk(followingId);
  const needsApproval = requiresApproval || targetUser?.privacySettings?.requireFollowApproval;
  
  return this.create({
    followerId,
    followingId,
    connectionType,
    status: needsApproval ? 'pending' : 'accepted',
    connectionSource: options.source || 'manual',
    connectionLocation: options.location,
    connectionContext: options.context
  });
};

/**
 * Send a friend request (requires mutual acceptance)
 */
SocialConnection.sendFriendRequest = async function(requesterId, recipientId, options = {}) {
  return this.create({
    followerId: requesterId,
    followingId: recipientId,
    connectionType: 'friend_request',
    status: 'pending',
    connectionSource: options.source || 'manual',
    connectionLocation: options.location,
    connectionContext: options.context
  });
};

/**
 * Get user's social network with detailed metrics
 */
SocialConnection.getUserNetwork = async function(userId, options = {}) {
  const { 
    type = 'all', // 'followers', 'following', 'friends', 'all'
    includeMetrics = true,
    limit = 100,
    offset = 0 
  } = options;
  
  let whereClause = {};
  
  switch (type) {
    case 'followers':
      whereClause.followingId = userId;
      whereClause.status = 'accepted';
      break;
    case 'following':
      whereClause.followerId = userId;
      whereClause.status = 'accepted';
      break;
    case 'friends':
      whereClause = {
        [db.Sequelize.Op.or]: [
          { followerId: userId, isMutual: true },
          { followingId: userId, isMutual: true }
        ],
        status: 'accepted'
      };
      break;
    default:
      whereClause = {
        [db.Sequelize.Op.or]: [
          { followerId: userId },
          { followingId: userId }
        ],
        status: 'accepted'
      };
  }
  
  const include = [
    {
      model: db.models.User,
      as: 'follower',
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
    },
    {
      model: db.models.User,
      as: 'following',
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
    }
  ];
  
  return this.findAll({
    where: whereClause,
    include,
    limit,
    offset,
    order: [
      ['interactionScore', 'DESC'],
      ['lastInteraction', 'DESC']
    ]
  });
};

/**
 * Get AI-powered connection recommendations
 */
SocialConnection.getRecommendations = async function(userId, options = {}) {
  const { limit = 20, type = 'follow' } = options;
  
  // Get user's existing connections
  const existingConnections = await this.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        { followerId: userId },
        { followingId: userId }
      ]
    },
    attributes: ['followerId', 'followingId']
  });
  
  const connectedUserIds = new Set();
  existingConnections.forEach(conn => {
    connectedUserIds.add(conn.followerId);
    connectedUserIds.add(conn.followingId);
  });
  
  // AI-powered recommendation logic would go here
  // For now, return users with similar interests/activities
  const recommendations = await db.models.User.findAll({
    where: {
      id: { 
        [db.Sequelize.Op.notIn]: Array.from(connectedUserIds).concat([userId])
      },
      isActive: true
    },
    limit,
    order: db.Sequelize.random() // Placeholder for AI scoring
  });
  
  return recommendations.map(user => ({
    user,
    recommendationScore: Math.random() * 10, // Placeholder
    reasons: ['mutual_friends', 'similar_interests'], // Placeholder
    sharedConnections: 0 // Placeholder
  }));
};

/**
 * Get social analytics for user
 */
SocialConnection.getAnalytics = async function(userId, timeframe = '30d') {
  const timeframeMaps = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = timeframeMaps[timeframe] || 30;
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  // Get follower/following counts
  const [followers, following, newFollowers, mutualFriends] = await Promise.all([
    this.count({
      where: { followingId: userId, status: 'accepted' }
    }),
    this.count({
      where: { followerId: userId, status: 'accepted' }
    }),
    this.count({
      where: { 
        followingId: userId, 
        status: 'accepted',
        connectedAt: { [db.Sequelize.Op.gte]: cutoffDate }
      }
    }),
    this.count({
      where: {
        [db.Sequelize.Op.or]: [
          { followerId: userId },
          { followingId: userId }
        ],
        isMutual: true,
        status: 'accepted'
      }
    })
  ]);
  
  return {
    followers,
    following,
    mutualFriends,
    newFollowers,
    followerGrowthRate: followers > 0 ? (newFollowers / followers) * 100 : 0,
    engagementMetrics: await getEngagementMetrics(userId, timeframe)
  };
};

// ===================
// HELPER FUNCTIONS
// ===================

async function checkAndUpdateMutualStatus(connection) {
  // Check if reverse connection exists and is accepted
  const reverseConnection = await SocialConnection.findOne({
    where: {
      followerId: connection.followingId,
      followingId: connection.followerId,
      status: 'accepted'
    }
  });
  
  if (reverseConnection && connection.status === 'accepted') {
    // Update both connections to mutual
    const now = new Date();
    await Promise.all([
      connection.update({ 
        isMutual: true, 
        mutualSince: now 
      }),
      reverseConnection.update({ 
        isMutual: true, 
        mutualSince: now 
      })
    ]);
  }
}

async function calculateCompatibilityScore(userId1, userId2) {
  // Placeholder for AI compatibility calculation
  // Would analyze shared interests, activity patterns, mutual friends, etc.
  return Math.random() * 10;
}

async function sendConnectionNotification(connection) {
  // Placeholder for notification system
  // Would send real-time notification to the target user
}

async function getEngagementMetrics(userId, timeframe) {
  // Placeholder for engagement metrics calculation
  return {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    averageEngagement: 0
  };
}

export default SocialConnection;
