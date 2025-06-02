/**
 * CONTENT CREATOR & INFLUENCER SYSTEM - 7-STAR SOCIAL MEDIA
 * ==========================================================
 * Advanced creator economy with monetization, brand partnerships,
 * content management, analytics, and fan engagement tools.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

// CREATOR PROFILE MODEL
// =====================
const CreatorProfile = db.define('CreatorProfile', {
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
  
  // CREATOR STATUS & VERIFICATION
  // =============================
  creatorStatus: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'verified', 'featured'),
    defaultValue: 'pending'
  },
  verificationLevel: {
    type: DataTypes.ENUM('none', 'email', 'phone', 'identity', 'business', 'premium'),
    defaultValue: 'none'
  },
  verificationBadges: {
    type: DataTypes.JSON, // Array of verification badges
    defaultValue: []
  },
  
  // CREATOR PROFILE INFO
  // ====================
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 5000]
    }
  },
  tagline: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  websiteUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  
  // CREATOR CATEGORIZATION
  // ======================
  primaryCategory: {
    type: DataTypes.ENUM(
      'fitness_trainer', 'nutritionist', 'yoga_instructor', 'dance_instructor',
      'motivation_coach', 'lifestyle_influencer', 'product_reviewer',
      'transformation_coach', 'mental_health_advocate', 'wellness_expert'
    ),
    allowNull: false
  },
  secondaryCategories: {
    type: DataTypes.JSON, // Array of additional categories
    defaultValue: []
  },
  specializations: {
    type: DataTypes.JSON, // Specific areas of expertise
    defaultValue: []
  },
  targetAudience: {
    type: DataTypes.JSON, // Target audience demographics
    defaultValue: {}
  },
  
  // AUDIENCE METRICS
  // ================
  followersCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  subscribersCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalViews: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  averageEngagementRate: {
    type: DataTypes.DECIMAL(5, 4), // Percentage (0-100)
    defaultValue: 0.0
  },
  audienceGrowthRate: {
    type: DataTypes.DECIMAL(5, 2), // Monthly growth percentage
    defaultValue: 0.0
  },
  
  // CONTENT METRICS
  // ===============
  totalPosts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalLikes: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  totalComments: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  totalShares: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  avgPostPerformance: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.0
  },
  
  // MONETIZATION & EARNINGS
  // =======================
  monetizationEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  subscriptionEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  subscriptionPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalEarnings: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  monthlyEarnings: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  
  // BRAND PARTNERSHIPS
  // ==================
  partnershipsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  averageRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true // Per post/collaboration rate
  },
  activeBrandDeals: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  completedBrandDeals: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  brandPartnershipRating: {
    type: DataTypes.DECIMAL(3, 2), // 0-5 star rating
    defaultValue: 0.0
  },
  
  // CONTENT SCHEDULING & PLANNING
  // ==============================
  contentCalendar: {
    type: DataTypes.JSON, // Content planning data
    defaultValue: {}
  },
  postingSchedule: {
    type: DataTypes.JSON, // Optimal posting times
    defaultValue: {}
  },
  contentPillars: {
    type: DataTypes.JSON, // Main content themes
    defaultValue: []
  },
  
  // ENGAGEMENT TOOLS
  // ================
  fanClubEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  exclusiveContentEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  merchandiseEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  liveStreamingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // AI & ANALYTICS
  // ==============
  aiAnalyticsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  aiContentSuggestions: {
    type: DataTypes.JSON, // AI-generated content ideas
    defaultValue: []
  },
  aiAudienceInsights: {
    type: DataTypes.JSON, // AI audience analysis
    defaultValue: {}
  },
  performancePredictions: {
    type: DataTypes.JSON, // AI performance forecasts
    defaultValue: {}
  },
  
  // COLLABORATION PREFERENCES
  // =========================
  openToCollaborations: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  collaborationTypes: {
    type: DataTypes.JSON, // Types of collaborations accepted
    defaultValue: ['brand_partnerships', 'creator_collabs', 'sponsored_content']
  },
  preferredBrands: {
    type: DataTypes.JSON, // Preferred brand categories
    defaultValue: []
  },
  collaborationRates: {
    type: DataTypes.JSON, // Rate card for different services
    defaultValue: {}
  },
  
  // CREATOR TOOLS & FEATURES
  // =========================
  analyticsAccess: {
    type: DataTypes.ENUM('basic', 'advanced', 'premium'),
    defaultValue: 'basic'
  },
  creatorBadge: {
    type: DataTypes.STRING(50),
    allowNull: true // Special creator designation
  },
  priority: {
    type: DataTypes.ENUM('standard', 'rising', 'featured', 'top_creator'),
    defaultValue: 'standard'
  },
  
  // CONTACT & BUSINESS INFO
  // =======================
  businessEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  managementContact: {
    type: DataTypes.JSON, // Management/agency contact info
    defaultValue: null
  },
  mediaKit: {
    type: DataTypes.JSON, // Creator media kit data
    defaultValue: {}
  },
  
  // STATUS & LIFECYCLE
  // ==================
  onboardingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  joinedCreatorProgram: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
  tableName: 'CreatorProfiles',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId'], name: 'creator_profiles_user_idx' },
    { fields: ['creatorStatus'], name: 'creator_profiles_status_idx' },
    { fields: ['primaryCategory'], name: 'creator_profiles_category_idx' },
    { fields: ['followersCount'], name: 'creator_profiles_followers_idx' },
    { fields: ['averageEngagementRate'], name: 'creator_profiles_engagement_idx' },
    { fields: ['totalEarnings'], name: 'creator_profiles_earnings_idx' },
    { fields: ['priority'], name: 'creator_profiles_priority_idx' },
    { fields: ['verificationLevel'], name: 'creator_profiles_verification_idx' },
    {
      fields: ['creatorStatus', 'priority', 'followersCount'],
      name: 'creator_profiles_discovery_idx'
    }
  ]
});

// BRAND PARTNERSHIP MODEL
// ========================
const BrandPartnership = db.define('BrandPartnership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // PARTNERSHIP PARTICIPANTS
  // =========================
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  brandId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users', // Brands are also users with special accounts
      key: 'id'
    }
  },
  
  // CAMPAIGN DETAILS
  // ================
  campaignName: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  campaignDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  campaignObjectives: {
    type: DataTypes.JSON, // Campaign goals and KPIs
    defaultValue: []
  },
  
  // DELIVERABLES
  // ============
  deliverables: {
    type: DataTypes.JSON, // Required content deliverables
    allowNull: false
    // Format: [{ type: 'post', quantity: 3, requirements: {...} }]
  },
  contentGuidelines: {
    type: DataTypes.JSON, // Brand content guidelines
    defaultValue: {}
  },
  approvalRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // TIMELINE & SCHEDULING
  // =====================
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  deliveryDeadlines: {
    type: DataTypes.JSON, // Specific deadlines for deliverables
    defaultValue: []
  },
  
  // COMPENSATION
  // ============
  compensationType: {
    type: DataTypes.ENUM('fixed', 'performance', 'product', 'hybrid'),
    allowNull: false
  },
  totalCompensation: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  paymentSchedule: {
    type: DataTypes.JSON, // Payment milestones
    defaultValue: []
  },
  performanceBonuses: {
    type: DataTypes.JSON, // Performance-based incentives
    defaultValue: []
  },
  
  // PRODUCTS & SERVICES
  // ===================
  productsProvided: {
    type: DataTypes.JSON, // Products/services provided by brand
    defaultValue: []
  },
  exclusivityRequirements: {
    type: DataTypes.JSON, // Exclusivity clauses
    defaultValue: {}
  },
  
  // STATUS & TRACKING
  // =================
  status: {
    type: DataTypes.ENUM('draft', 'proposed', 'negotiating', 'active', 'completed', 'cancelled'),
    defaultValue: 'draft'
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'revision_requested', 'rejected'),
    defaultValue: 'pending'
  },
  completionPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.0
  },
  
  // PERFORMANCE METRICS
  // ===================
  targetMetrics: {
    type: DataTypes.JSON, // Expected performance metrics
    defaultValue: {}
  },
  actualMetrics: {
    type: DataTypes.JSON, // Actual performance achieved
    defaultValue: {}
  },
  roi: {
    type: DataTypes.DECIMAL(10, 4), // Return on investment
    allowNull: true
  },
  
  // LEGAL & COMPLIANCE
  // ==================
  contractSigned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  disclosureRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  complianceChecked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  legalTerms: {
    type: DataTypes.JSON, // Legal terms and conditions
    defaultValue: {}
  },
  
  // COMMUNICATION & NOTES
  // =====================
  communicationHistory: {
    type: DataTypes.JSON, // Communication logs
    defaultValue: []
  },
  internalNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  feedback: {
    type: DataTypes.JSON, // Feedback from both parties
    defaultValue: {}
  },
  
  // TIMESTAMPS
  proposedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
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
  tableName: 'BrandPartnerships',
  timestamps: true,
  indexes: [
    { fields: ['creatorId'], name: 'brand_partnerships_creator_idx' },
    { fields: ['brandId'], name: 'brand_partnerships_brand_idx' },
    { fields: ['status'], name: 'brand_partnerships_status_idx' },
    { fields: ['startDate', 'endDate'], name: 'brand_partnerships_timeline_idx' },
    { fields: ['totalCompensation'], name: 'brand_partnerships_compensation_idx' },
    {
      fields: ['creatorId', 'status', 'startDate'],
      name: 'brand_partnerships_creator_active_idx'
    }
  ]
});

// CREATOR SUBSCRIPTION MODEL
// ===========================
const CreatorSubscription = db.define('CreatorSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // SUBSCRIPTION RELATIONSHIP
  // ==========================
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  subscriberId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // SUBSCRIPTION TIER
  // =================
  tierName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tierLevel: {
    type: DataTypes.ENUM('basic', 'premium', 'vip', 'exclusive'),
    defaultValue: 'basic'
  },
  monthlyPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  // SUBSCRIPTION STATUS
  // ===================
  status: {
    type: DataTypes.ENUM('active', 'paused', 'cancelled', 'expired'),
    defaultValue: 'active'
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // SUBSCRIPTION BENEFITS
  // =====================
  benefits: {
    type: DataTypes.JSON, // List of subscriber benefits
    defaultValue: []
  },
  exclusiveContent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  prioritySupport: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // PAYMENT & BILLING
  // =================
  lastPaymentDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextPaymentDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  totalPaid: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // ENGAGEMENT TRACKING
  // ===================
  contentViewed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastActiveDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  engagementScore: {
    type: DataTypes.DECIMAL(5, 3),
    defaultValue: 0.0
  },
  
  // SUBSCRIPTION LIFECYCLE
  // ======================
  subscribedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.STRING(200),
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
  }
}, {
  tableName: 'CreatorSubscriptions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['creatorId', 'subscriberId'],
      name: 'unique_creator_subscription'
    },
    { fields: ['creatorId'], name: 'creator_subscriptions_creator_idx' },
    { fields: ['subscriberId'], name: 'creator_subscriptions_subscriber_idx' },
    { fields: ['status'], name: 'creator_subscriptions_status_idx' },
    { fields: ['nextPaymentDate'], name: 'creator_subscriptions_payment_idx' },
    { fields: ['tierLevel'], name: 'creator_subscriptions_tier_idx' }
  ]
});

// CREATOR ANALYTICS MODEL
// ========================
const CreatorAnalytics = db.define('CreatorAnalytics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // TIME PERIOD
  // ===========
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  period: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    allowNull: false
  },
  
  // AUDIENCE METRICS
  // ================
  newFollowers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unfollowers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  netFollowerGrowth: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  newSubscribers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  churnedSubscribers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // CONTENT METRICS
  // ===============
  postsPublished: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalViews: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  totalLikes: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  totalComments: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  totalShares: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  averageEngagementRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.0
  },
  
  // EARNINGS METRICS
  // ================
  subscriptionRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  brandPartnershipRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  donationsReceived: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  merchandiseRevenue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  
  // DEMOGRAPHIC DATA
  // ================
  audienceDemographics: {
    type: DataTypes.JSON, // Age, gender, location breakdown
    defaultValue: {}
  },
  topCountries: {
    type: DataTypes.JSON, // Top countries by audience
    defaultValue: []
  },
  deviceBreakdown: {
    type: DataTypes.JSON, // Mobile vs desktop usage
    defaultValue: {}
  },
  
  // PERFORMANCE INSIGHTS
  // ====================
  bestPerformingContent: {
    type: DataTypes.JSON, // Top performing posts
    defaultValue: []
  },
  optimalPostingTimes: {
    type: DataTypes.JSON, // Best times to post
    defaultValue: {}
  },
  audienceActivity: {
    type: DataTypes.JSON, // When audience is most active
    defaultValue: {}
  },
  
  // AI INSIGHTS
  // ===========
  aiInsights: {
    type: DataTypes.JSON, // AI-generated insights
    defaultValue: []
  },
  growthPredictions: {
    type: DataTypes.JSON, // AI growth forecasts
    defaultValue: {}
  },
  contentSuggestions: {
    type: DataTypes.JSON, // AI content recommendations
    defaultValue: []
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'CreatorAnalytics',
  timestamps: false, // Using custom createdAt
  indexes: [
    { fields: ['creatorId'], name: 'creator_analytics_creator_idx' },
    { fields: ['date'], name: 'creator_analytics_date_idx' },
    { fields: ['period'], name: 'creator_analytics_period_idx' },
    {
      unique: true,
      fields: ['creatorId', 'date', 'period'],
      name: 'unique_creator_analytics_period'
    }
  ]
});

// =====================
// CLASS METHODS
// =====================

/**
 * Apply to become a creator
 */
CreatorProfile.applyToJoin = async function(userId, applicationData) {
  const existingProfile = await this.findOne({ where: { userId } });
  if (existingProfile) {
    throw new Error('User already has a creator profile');
  }
  
  return this.create({
    ...applicationData,
    userId,
    creatorStatus: 'pending',
    onboardingCompleted: false
  });
};

/**
 * Get top creators by category
 */
CreatorProfile.getTopCreators = async function(options = {}) {
  const { 
    category = null, 
    limit = 50, 
    sortBy = 'followersCount',
    verifiedOnly = false 
  } = options;
  
  const whereClause = {
    creatorStatus: 'active'
  };
  
  if (category) {
    whereClause.primaryCategory = category;
  }
  
  if (verifiedOnly) {
    whereClause.verificationLevel = { 
      [db.Sequelize.Op.in]: ['identity', 'business', 'premium']
    };
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    order: [[sortBy, 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      }
    ]
  });
};

/**
 * Create brand partnership proposal
 */
BrandPartnership.createProposal = async function(creatorId, brandId, proposalData) {
  return this.create({
    ...proposalData,
    creatorId,
    brandId,
    status: 'proposed',
    proposedAt: new Date()
  });
};

/**
 * Get creator earnings summary
 */
CreatorAnalytics.getEarningsSummary = async function(creatorId, timeframe = '30d') {
  const timeframeMaps = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = timeframeMaps[timeframe] || 30;
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  const analytics = await this.findAll({
    where: {
      creatorId,
      date: { [db.Sequelize.Op.gte]: cutoffDate }
    },
    attributes: [
      [db.Sequelize.fn('SUM', db.Sequelize.col('subscriptionRevenue')), 'totalSubscriptionRevenue'],
      [db.Sequelize.fn('SUM', db.Sequelize.col('brandPartnershipRevenue')), 'totalBrandRevenue'],
      [db.Sequelize.fn('SUM', db.Sequelize.col('donationsReceived')), 'totalDonations'],
      [db.Sequelize.fn('SUM', db.Sequelize.col('totalRevenue')), 'totalEarnings'],
      [db.Sequelize.fn('AVG', db.Sequelize.col('averageEngagementRate')), 'avgEngagement']
    ]
  });
  
  return analytics[0];
};

export { CreatorProfile, BrandPartnership, CreatorSubscription, CreatorAnalytics };
