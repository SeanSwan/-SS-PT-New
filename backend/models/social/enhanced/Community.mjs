/**
 * COMMUNITY MODEL - 7-STAR SOCIAL MEDIA EXPERIENCE
 * =================================================
 * Advanced community and group management system for SwanStudios.
 * Supports fitness groups, challenges, professional communities,
 * and AI-powered community recommendations.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

const Community = db.define('Community', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // BASIC COMMUNITY INFO
  // ====================
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 5000]
    }
  },
  shortDescription: {
    type: DataTypes.STRING(300),
    allowNull: true // For preview/card displays
  },
  
  // VISUAL IDENTITY
  // ===============
  photo: {
    type: DataTypes.STRING,
    allowNull: true // Community profile picture
  },
  bannerImage: {
    type: DataTypes.STRING,
    allowNull: true // Cover/banner image
  },
  theme: {
    type: DataTypes.JSON, // Color scheme and styling preferences
    defaultValue: {}
  },
  
  // COMMUNITY CATEGORIZATION
  // ========================
  category: {
    type: DataTypes.ENUM(
      'fitness', 'nutrition', 'weight_loss', 'muscle_building', 'cardio',
      'yoga', 'crossfit', 'running', 'cycling', 'swimming', 'dancing',
      'mental_health', 'motivation', 'challenges', 'competitions',
      'professionals', 'beginners', 'advanced', 'local', 'virtual'
    ),
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON, // Searchable tags
    defaultValue: []
  },
  
  // COMMUNITY MANAGEMENT
  // ====================
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  moderators: {
    type: DataTypes.JSON, // Array of moderator user IDs
    defaultValue: []
  },
  admins: {
    type: DataTypes.JSON, // Array of admin user IDs
    defaultValue: []
  },
  
  // MEMBERSHIP & ACCESS
  // ===================
  membershipType: {
    type: DataTypes.ENUM('open', 'approval_required', 'invite_only', 'premium'),
    defaultValue: 'open'
  },
  maxMembers: {
    type: DataTypes.INTEGER,
    allowNull: true // Null = unlimited
  },
  currentMembers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Official/verified communities
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Premium communities with special features
  },
  
  // ACTIVITY & ENGAGEMENT
  // =====================
  activityLevel: {
    type: DataTypes.ENUM('very_low', 'low', 'moderate', 'high', 'very_high'),
    defaultValue: 'moderate'
  },
  totalPosts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalComments: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  engagementScore: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.0
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // COMMUNITY FEATURES
  // ==================
  features: {
    type: DataTypes.JSON, // Enabled features for this community
    defaultValue: {
      posts: true,
      challenges: true,
      events: true,
      polls: true,
      media_sharing: true,
      live_streams: true,
      leaderboards: true,
      achievements: true,
      mentorship: false,
      marketplace: false
    }
  },
  
  // COMMUNITY RULES & GUIDELINES
  // ============================
  rules: {
    type: DataTypes.JSON, // Community rules and guidelines
    defaultValue: []
  },
  welcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: true // Message shown to new members
  },
  guidelines: {
    type: DataTypes.TEXT,
    allowNull: true // Detailed community guidelines
  },
  
  // LOCATION & MEETING INFO
  // =======================
  isLocationBased: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  location: {
    type: DataTypes.JSON, // Geographic location data
    defaultValue: null
  },
  meetingInfo: {
    type: DataTypes.JSON, // Regular meeting times, locations
    defaultValue: null
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // CHALLENGE & COMPETITION DATA
  // ============================
  activeChallenges: {
    type: DataTypes.JSON, // Current active challenges
    defaultValue: []
  },
  challengeHistory: {
    type: DataTypes.JSON, // Completed challenges
    defaultValue: []
  },
  leaderboard: {
    type: DataTypes.JSON, // Community leaderboard data
    defaultValue: {}
  },
  
  // AI & PERSONALIZATION
  // ====================
  aiRecommendationScore: {
    type: DataTypes.DECIMAL(5, 3),
    defaultValue: 0.0
  },
  targetAudience: {
    type: DataTypes.JSON, // AI-defined target audience characteristics
    defaultValue: {}
  },
  contentPreferences: {
    type: DataTypes.JSON, // Community content preferences
    defaultValue: {}
  },
  
  // MONETIZATION & BUSINESS
  // =======================
  isCommercial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  subscriptionRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  subscriptionPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  sponsorInfo: {
    type: DataTypes.JSON, // Sponsor/partner information
    defaultValue: null
  },
  
  // PRIVACY & MODERATION
  // ====================
  privacyLevel: {
    type: DataTypes.ENUM('public', 'private', 'hidden'),
    defaultValue: 'public'
  },
  contentModeration: {
    type: DataTypes.ENUM('none', 'basic', 'strict', 'custom'),
    defaultValue: 'basic'
  },
  moderationSettings: {
    type: DataTypes.JSON, // Custom moderation rules
    defaultValue: {}
  },
  reportCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // ANALYTICS & INSIGHTS
  // ====================
  analyticsData: {
    type: DataTypes.JSON, // Detailed community analytics
    defaultValue: {}
  },
  growthMetrics: {
    type: DataTypes.JSON, // Growth tracking data
    defaultValue: {}
  },
  engagementMetrics: {
    type: DataTypes.JSON, // Engagement analysis
    defaultValue: {}
  },
  
  // STATUS & LIFECYCLE
  // ==================
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'archived', 'suspended', 'deleted'),
    defaultValue: 'active'
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Featured on discovery pages
  },
  trending: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Currently trending
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
  tableName: 'Communities',
  timestamps: true,
  indexes: [
    { fields: ['createdBy'], name: 'communities_creator_idx' },
    { fields: ['category'], name: 'communities_category_idx' },
    { fields: ['membershipType'], name: 'communities_membership_idx' },
    { fields: ['status'], name: 'communities_status_idx' },
    { fields: ['featured'], name: 'communities_featured_idx' },
    { fields: ['trending'], name: 'communities_trending_idx' },
    { fields: ['engagementScore'], name: 'communities_engagement_idx' },
    { fields: ['currentMembers'], name: 'communities_members_idx' },
    { fields: ['lastActivity'], name: 'communities_activity_idx' },
    { fields: ['isLocationBased'], name: 'communities_location_based_idx' },
    { 
      fields: ['category', 'engagementScore'], 
      name: 'communities_category_engagement_idx' 
    },
    {
      fields: ['status', 'privacyLevel', 'currentMembers'],
      name: 'communities_discovery_idx'
    }
  ],
  hooks: {
    beforeCreate: async (community) => {
      // Ensure creator is added as admin
      if (!community.admins.includes(community.createdBy)) {
        community.admins.push(community.createdBy);
      }
    },
    afterCreate: async (community) => {
      // Create initial community membership for creator
      await db.models.CommunityMembership.create({
        userId: community.createdBy,
        communityId: community.id,
        role: 'admin',
        status: 'active',
        joinedAt: new Date()
      });
      
      // Send notifications to interested users
      await notifyInterestedUsers(community);
    },
    afterUpdate: async (community) => {
      if (community.changed('currentMembers')) {
        // Update engagement score based on member activity
        await updateCommunityEngagement(community.id);
      }
    }
  }
});

// ==================
// CLASS METHODS
// ==================

/**
 * Create a new community with full setup
 */
Community.createCommunity = async function(creatorId, communityData, options = {}) {
  const community = await this.create({
    ...communityData,
    createdBy: creatorId,
    admins: [creatorId],
    currentMembers: 1,
    lastActivity: new Date()
  });
  
  // Setup initial community features
  await setupCommunityFeatures(community.id, options.features);
  
  return community;
};

/**
 * Get trending communities with AI-powered recommendations
 */
Community.getTrendingCommunities = async function(userId = null, options = {}) {
  const { limit = 20, category = null, timeframe = '7d' } = options;
  
  const whereClause = {
    status: 'active',
    privacyLevel: 'public'
  };
  
  if (category) {
    whereClause.category = category;
  }
  
  // Calculate trending score based on recent activity
  const trendingScore = db.Sequelize.literal(`
    (current_members * 0.3 + total_posts * 0.2 + engagement_score * 0.5) *
    CASE 
      WHEN last_activity > NOW() - INTERVAL '24 hours' THEN 2.0
      WHEN last_activity > NOW() - INTERVAL '7 days' THEN 1.5
      ELSE 1.0
    END
  `);
  
  const communities = await this.findAll({
    where: whereClause,
    limit,
    order: [[trendingScore, 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      }
    ]
  });
  
  // Add AI personalization if user provided
  if (userId) {
    return await addPersonalizationData(communities, userId);
  }
  
  return communities;
};

/**
 * Get personalized community recommendations for user
 */
Community.getRecommendations = async function(userId, options = {}) {
  const { limit = 10, excludeJoined = true } = options;
  
  // Get user's current communities if excluding joined
  let joinedCommunityIds = [];
  if (excludeJoined) {
    const memberships = await db.models.CommunityMembership.findAll({
      where: { userId, status: 'active' },
      attributes: ['communityId']
    });
    joinedCommunityIds = memberships.map(m => m.communityId);
  }
  
  const whereClause = {
    status: 'active',
    privacyLevel: ['public', 'private'] // Exclude hidden communities
  };
  
  if (joinedCommunityIds.length > 0) {
    whereClause.id = { [db.Sequelize.Op.notIn]: joinedCommunityIds };
  }
  
  // Get user's interests and activity patterns for AI matching
  const userProfile = await getUserInterests(userId);
  
  const communities = await this.findAll({
    where: whereClause,
    limit: limit * 2, // Get more for filtering
    order: [
      ['engagementScore', 'DESC'],
      ['currentMembers', 'DESC']
    ],
    include: [
      {
        model: db.models.User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
  
  // Apply AI scoring and filter to limit
  const scoredCommunities = await Promise.all(
    communities.map(async (community) => {
      const aiScore = await calculateCommunityMatch(userProfile, community);
      return {
        ...community.toJSON(),
        aiRecommendationScore: aiScore,
        matchReasons: getMatchReasons(userProfile, community)
      };
    })
  );
  
  return scoredCommunities
    .sort((a, b) => b.aiRecommendationScore - a.aiRecommendationScore)
    .slice(0, limit);
};

/**
 * Search communities with advanced filtering
 */
Community.searchCommunities = async function(searchQuery, filters = {}, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const { 
    category, 
    membershipType, 
    minMembers, 
    maxMembers, 
    isLocationBased, 
    location 
  } = filters;
  
  const whereClause = {
    status: 'active',
    [db.Sequelize.Op.or]: [
      { name: { [db.Sequelize.Op.iLike]: `%${searchQuery}%` } },
      { description: { [db.Sequelize.Op.iLike]: `%${searchQuery}%` } },
      { tags: { [db.Sequelize.Op.contains]: [searchQuery] } }
    ]
  };
  
  if (category) whereClause.category = category;
  if (membershipType) whereClause.membershipType = membershipType;
  if (minMembers) whereClause.currentMembers = { [db.Sequelize.Op.gte]: minMembers };
  if (maxMembers) whereClause.currentMembers = { [db.Sequelize.Op.lte]: maxMembers };
  if (isLocationBased !== undefined) whereClause.isLocationBased = isLocationBased;
  
  return this.findAll({
    where: whereClause,
    limit,
    offset,
    order: [
      ['engagementScore', 'DESC'],
      ['currentMembers', 'DESC']
    ],
    include: [
      {
        model: db.models.User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      }
    ]
  });
};

/**
 * Get community analytics
 */
Community.getAnalytics = async function(communityId, timeframe = '30d') {
  const community = await this.findByPk(communityId);
  if (!community) throw new Error('Community not found');
  
  const timeframeMaps = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = timeframeMaps[timeframe] || 30;
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  // Get membership growth
  const newMembers = await db.models.CommunityMembership.count({
    where: {
      communityId,
      joinedAt: { [db.Sequelize.Op.gte]: cutoffDate }
    }
  });
  
  // Get activity metrics
  const posts = await db.models.EnhancedSocialPost.count({
    where: {
      communityId,
      publishedAt: { [db.Sequelize.Op.gte]: cutoffDate }
    }
  });
  
  return {
    membershipGrowth: newMembers,
    postsInPeriod: posts,
    currentMembers: community.currentMembers,
    engagementScore: community.engagementScore,
    activityLevel: community.activityLevel,
    // Additional analytics would be calculated here
  };
};

// ===================
// HELPER FUNCTIONS
// ===================

async function setupCommunityFeatures(communityId, features = {}) {
  // Setup initial community features and configurations
  // This would initialize various community subsystems
}

async function notifyInterestedUsers(community) {
  // Notify users who might be interested in this new community
  // Based on their interests, followed topics, etc.
}

async function updateCommunityEngagement(communityId) {
  // Calculate and update community engagement score
  // Based on recent activity, member participation, etc.
}

async function getUserInterests(userId) {
  // Get user's interests, activity patterns, and preferences
  // For AI-powered community matching
  return {
    categories: [],
    activityLevel: 'moderate',
    goals: [],
    location: null
  };
}

async function calculateCommunityMatch(userProfile, community) {
  // AI algorithm to calculate how well a community matches a user
  // Would consider interests, activity patterns, goals, etc.
  return Math.random() * 10; // Placeholder
}

function getMatchReasons(userProfile, community) {
  // Return reasons why this community was recommended
  return ['shared_interests', 'activity_level_match'];
}

async function addPersonalizationData(communities, userId) {
  // Add personalization data to community results
  return communities;
}

export default Community;
