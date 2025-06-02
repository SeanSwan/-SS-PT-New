/**
 * SOCIAL ANALYTICS & INSIGHTS MODELS - 7-STAR SOCIAL MEDIA
 * =========================================================
 * Advanced analytics system for tracking user engagement, content performance,
 * community metrics, and providing actionable insights for users and creators.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

// SOCIAL ANALYTICS MODEL
// ======================
const SocialAnalytics = db.define('SocialAnalytics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // ANALYTICS TARGET
  // ================
  entityType: {
    type: DataTypes.ENUM(
      'user', 'post', 'community', 'event', 'product', 'live_stream',
      'story', 'challenge', 'workout', 'brand', 'hashtag', 'location'
    ),
    allowNull: false
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true, // User who owns this entity
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // TIME PERIOD
  // ===========
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  period: {
    type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly'),
    allowNull: false,
    defaultValue: 'daily'
  },
  
  // ENGAGEMENT METRICS
  // ==================
  impressions: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  reach: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  views: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  uniqueViews: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  comments: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  shares: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  saves: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  clicks: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  
  // ENGAGEMENT RATIOS
  // =================
  engagementRate: {
    type: DataTypes.DECIMAL(8, 6), // Percentage (0-100)
    defaultValue: 0.0
  },
  clickThroughRate: {
    type: DataTypes.DECIMAL(8, 6),
    defaultValue: 0.0
  },
  saveRate: {
    type: DataTypes.DECIMAL(8, 6),
    defaultValue: 0.0
  },
  shareRate: {
    type: DataTypes.DECIMAL(8, 6),
    defaultValue: 0.0
  },
  commentRate: {
    type: DataTypes.DECIMAL(8, 6),
    defaultValue: 0.0
  },
  
  // TIME-BASED METRICS
  // ==================
  averageWatchTime: {
    type: DataTypes.INTEGER, // Seconds
    defaultValue: 0
  },
  totalWatchTime: {
    type: DataTypes.BIGINT, // Total seconds watched
    defaultValue: 0
  },
  bounceRate: {
    type: DataTypes.DECIMAL(5, 2), // Percentage
    defaultValue: 0.0
  },
  sessionDuration: {
    type: DataTypes.INTEGER, // Average session duration in seconds
    defaultValue: 0
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
  followerGrowthRate: {
    type: DataTypes.DECIMAL(8, 4), // Percentage
    defaultValue: 0.0
  },
  
  // CONVERSION METRICS
  // ==================
  conversions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  conversionRate: {
    type: DataTypes.DECIMAL(8, 6),
    defaultValue: 0.0
  },
  revenue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  revenuePerView: {
    type: DataTypes.DECIMAL(8, 4),
    defaultValue: 0.0
  },
  
  // DEMOGRAPHIC BREAKDOWN
  // =====================
  ageGroups: {
    type: DataTypes.JSON, // Age group distribution
    defaultValue: {}
    // Format: { "18-24": 25, "25-34": 40, "35-44": 20, "45+": 15 }
  },
  genderDistribution: {
    type: DataTypes.JSON, // Gender distribution
    defaultValue: {}
    // Format: { "male": 45, "female": 50, "other": 5 }
  },
  topCountries: {
    type: DataTypes.JSON, // Top countries by audience
    defaultValue: []
    // Format: [{ "country": "US", "percentage": 40 }, ...]
  },
  topCities: {
    type: DataTypes.JSON, // Top cities by audience
    defaultValue: []
  },
  
  // DEVICE & PLATFORM METRICS
  // ==========================
  deviceBreakdown: {
    type: DataTypes.JSON, // Device usage breakdown
    defaultValue: {}
    // Format: { "mobile": 70, "desktop": 25, "tablet": 5 }
  },
  platformBreakdown: {
    type: DataTypes.JSON, // Platform usage breakdown
    defaultValue: {}
    // Format: { "ios": 45, "android": 35, "web": 20 }
  },
  
  // CONTENT PERFORMANCE
  // ===================
  topPerformingContent: {
    type: DataTypes.JSON, // Best performing content IDs
    defaultValue: []
  },
  contentCategoryPerformance: {
    type: DataTypes.JSON, // Performance by content category
    defaultValue: {}
  },
  hashtagPerformance: {
    type: DataTypes.JSON, // Hashtag performance data
    defaultValue: {}
  },
  
  // TIMING INSIGHTS
  // ===============
  peakHours: {
    type: DataTypes.JSON, // Peak engagement hours
    defaultValue: {}
    // Format: { "hour": engagement_score }
  },
  peakDays: {
    type: DataTypes.JSON, // Peak engagement days
    defaultValue: {}
    // Format: { "monday": score, "tuesday": score, ... }
  },
  optimalPostingTimes: {
    type: DataTypes.JSON, // Recommended posting times
    defaultValue: []
  },
  
  // COMPARISON METRICS
  // ==================
  previousPeriodComparison: {
    type: DataTypes.JSON, // Comparison with previous period
    defaultValue: {}
    // Format: { "metric": { "current": 100, "previous": 80, "change": 25 } }
  },
  competitorComparison: {
    type: DataTypes.JSON, // Comparison with competitors
    defaultValue: {}
  },
  industryBenchmarks: {
    type: DataTypes.JSON, // Industry benchmark comparisons
    defaultValue: {}
  },
  
  // AI INSIGHTS
  // ===========
  aiInsights: {
    type: DataTypes.JSON, // AI-generated insights
    defaultValue: []
    // Format: [{ "type": "insight_type", "message": "insight_text", "confidence": 0.85 }]
  },
  growthPredictions: {
    type: DataTypes.JSON, // Growth forecasts
    defaultValue: {}
  },
  anomalies: {
    type: DataTypes.JSON, // Detected anomalies
    defaultValue: []
  },
  recommendations: {
    type: DataTypes.JSON, // AI recommendations
    defaultValue: []
  },
  
  // SENTIMENT ANALYSIS
  // ==================
  sentimentScore: {
    type: DataTypes.DECIMAL(3, 2), // -1 to 1
    defaultValue: 0.0
  },
  sentimentDistribution: {
    type: DataTypes.JSON, // Sentiment breakdown
    defaultValue: { "positive": 0, "neutral": 0, "negative": 0 }
  },
  emotionAnalysis: {
    type: DataTypes.JSON, // Emotion detection results
    defaultValue: {}
  },
  
  // QUALITY METRICS
  // ===============
  qualityScore: {
    type: DataTypes.DECIMAL(3, 2), // 0-10 content quality score
    defaultValue: 0.0
  },
  authenticityScore: {
    type: DataTypes.DECIMAL(3, 2), // 0-10 authenticity score
    defaultValue: 0.0
  },
  viralityPotential: {
    type: DataTypes.DECIMAL(3, 2), // 0-10 virality prediction
    defaultValue: 0.0
  },
  
  // METADATA
  // ========
  dataCompleteness: {
    type: DataTypes.DECIMAL(3, 2), // 0-100% data completeness
    defaultValue: 100.0
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  computationTime: {
    type: DataTypes.INTEGER, // Time to compute analytics in ms
    defaultValue: 0
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SocialAnalytics',
  timestamps: false, // Using custom createdAt
  indexes: [
    { fields: ['entityType', 'entityId'], name: 'social_analytics_entity_idx' },
    { fields: ['ownerId'], name: 'social_analytics_owner_idx' },
    { fields: ['date'], name: 'social_analytics_date_idx' },
    { fields: ['period'], name: 'social_analytics_period_idx' },
    { fields: ['engagementRate'], name: 'social_analytics_engagement_idx' },
    { fields: ['reach'], name: 'social_analytics_reach_idx' },
    { fields: ['revenue'], name: 'social_analytics_revenue_idx' },
    {
      unique: true,
      fields: ['entityType', 'entityId', 'date', 'period'],
      name: 'unique_social_analytics_period'
    }
  ]
});

// ANALYTICS DASHBOARD MODEL
// ==========================
const AnalyticsDashboard = db.define('AnalyticsDashboard', {
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
  
  // DASHBOARD CONFIGURATION
  // =======================
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dashboardType: {
    type: DataTypes.ENUM('personal', 'creator', 'business', 'community', 'custom'),
    defaultValue: 'personal'
  },
  
  // WIDGET CONFIGURATION
  // ====================
  widgets: {
    type: DataTypes.JSON, // Dashboard widget configuration
    defaultValue: []
    /* Format:
    [{
      "id": "widget_1",
      "type": "engagement_overview",
      "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
      "config": { "timeframe": "30d", "metrics": ["likes", "comments"] }
    }]
    */
  },
  layout: {
    type: DataTypes.JSON, // Layout configuration
    defaultValue: { "columns": 12, "rowHeight": 30 }
  },
  
  // FILTERS & SETTINGS
  // ==================
  defaultTimeframe: {
    type: DataTypes.ENUM('24h', '7d', '30d', '90d', '1y', 'custom'),
    defaultValue: '30d'
  },
  defaultMetrics: {
    type: DataTypes.JSON, // Default metrics to show
    defaultValue: ['impressions', 'reach', 'engagement_rate']
  },
  filters: {
    type: DataTypes.JSON, // Dashboard filters
    defaultValue: {}
  },
  
  // SHARING & PERMISSIONS
  // =====================
  isShared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sharedWith: {
    type: DataTypes.JSON, // Users with access
    defaultValue: []
  },
  shareSettings: {
    type: DataTypes.JSON, // Sharing configuration
    defaultValue: {}
  },
  
  // AUTOMATION
  // ==========
  autoRefresh: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  refreshInterval: {
    type: DataTypes.INTEGER, // Minutes
    defaultValue: 60
  },
  scheduledReports: {
    type: DataTypes.JSON, // Scheduled report configuration
    defaultValue: []
  },
  
  // ALERTS & NOTIFICATIONS
  // ======================
  alerts: {
    type: DataTypes.JSON, // Alert configurations
    defaultValue: []
    /* Format:
    [{
      "metric": "engagement_rate",
      "condition": "below",
      "threshold": 2.0,
      "notification": "email"
    }]
    */
  },
  lastAlertCheck: {
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
  tableName: 'AnalyticsDashboards',
  timestamps: true,
  indexes: [
    { fields: ['userId'], name: 'analytics_dashboards_user_idx' },
    { fields: ['dashboardType'], name: 'analytics_dashboards_type_idx' },
    { fields: ['isDefault'], name: 'analytics_dashboards_default_idx' },
    { fields: ['isShared'], name: 'analytics_dashboards_shared_idx' }
  ]
});

// INSIGHT MODEL
// =============
const Insight = db.define('Insight', {
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
  
  // INSIGHT DETAILS
  // ===============
  type: {
    type: DataTypes.ENUM(
      'performance_change', 'audience_growth', 'engagement_spike',
      'content_recommendation', 'timing_optimization', 'competitor_insight',
      'trend_analysis', 'anomaly_detection', 'goal_progress', 'opportunity'
    ),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('growth', 'engagement', 'audience', 'content', 'monetization', 'trends'),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  
  // INSIGHT CONTENT
  // ===============
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  summary: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  // DATA & EVIDENCE
  // ===============
  dataPoints: {
    type: DataTypes.JSON, // Supporting data points
    defaultValue: {}
  },
  metrics: {
    type: DataTypes.JSON, // Relevant metrics
    defaultValue: {}
  },
  timeframe: {
    type: DataTypes.JSON, // Time period for insight
    defaultValue: {}
  },
  
  // AI METADATA
  // ===========
  aiConfidence: {
    type: DataTypes.DECIMAL(3, 2), // 0-1 AI confidence
    allowNull: false
  },
  algorithm: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  modelVersion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  
  // ACTIONABLE RECOMMENDATIONS
  // ===========================
  recommendations: {
    type: DataTypes.JSON, // Action recommendations
    defaultValue: []
    /* Format:
    [{
      "action": "Post more video content",
      "reason": "Videos get 3x more engagement",
      "impact": "high",
      "effort": "medium"
    }]
    */
  },
  potentialImpact: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'very_high'),
    defaultValue: 'medium'
  },
  implementationEffort: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  
  // USER INTERACTION
  // ================
  status: {
    type: DataTypes.ENUM('new', 'viewed', 'acknowledged', 'implemented', 'dismissed'),
    defaultValue: 'new'
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  implementedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // FEEDBACK
  // ========
  userRating: {
    type: DataTypes.INTEGER, // 1-5 user rating
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isHelpful: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  
  // EXPIRATION
  // ==========
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isExpired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // RELATED ENTITIES
  // ================
  relatedEntityType: {
    type: DataTypes.ENUM('post', 'campaign', 'audience_segment', 'content_category'),
    allowNull: true
  },
  relatedEntityId: {
    type: DataTypes.UUID,
    allowNull: true
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
  tableName: 'Insights',
  timestamps: true,
  indexes: [
    { fields: ['userId'], name: 'insights_user_idx' },
    { fields: ['type'], name: 'insights_type_idx' },
    { fields: ['category'], name: 'insights_category_idx' },
    { fields: ['priority'], name: 'insights_priority_idx' },
    { fields: ['status'], name: 'insights_status_idx' },
    { fields: ['aiConfidence'], name: 'insights_confidence_idx' },
    { fields: ['generatedAt'], name: 'insights_generated_idx' },
    { fields: ['expiresAt'], name: 'insights_expires_idx' },
    {
      fields: ['userId', 'status', 'priority'],
      name: 'insights_user_active_idx'
    }
  ]
});

// PERFORMANCE BENCHMARK MODEL
// ============================
const PerformanceBenchmark = db.define('PerformanceBenchmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // BENCHMARK SCOPE
  // ===============
  category: {
    type: DataTypes.STRING(100),
    allowNull: false // e.g., "fitness_influencer", "yoga_instructor"
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  followerRange: {
    type: DataTypes.STRING(50),
    allowNull: false // e.g., "1k-10k", "10k-100k", "100k+"
  },
  
  // GEOGRAPHIC SCOPE
  // ================
  region: {
    type: DataTypes.STRING(100),
    defaultValue: 'global'
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // BENCHMARK METRICS
  // =================
  avgEngagementRate: {
    type: DataTypes.DECIMAL(8, 6),
    allowNull: false
  },
  avgReach: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  avgImpressions: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  avgPostsPerWeek: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.0
  },
  avgFollowerGrowth: {
    type: DataTypes.DECIMAL(8, 4), // Monthly percentage
    defaultValue: 0.0
  },
  
  // PERCENTILE DISTRIBUTIONS
  // =========================
  engagementPercentiles: {
    type: DataTypes.JSON, // Engagement rate percentiles
    defaultValue: {}
    // Format: { "p25": 1.5, "p50": 3.2, "p75": 6.8, "p90": 12.4 }
  },
  reachPercentiles: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  followerGrowthPercentiles: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  
  // SAMPLE SIZE & VALIDITY
  // ======================
  sampleSize: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  confidenceLevel: {
    type: DataTypes.DECIMAL(3, 2), // 0-100
    defaultValue: 95.0
  },
  marginOfError: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.05
  },
  
  // TEMPORAL DATA
  // =============
  period: {
    type: DataTypes.ENUM('weekly', 'monthly', 'quarterly'),
    defaultValue: 'monthly'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // COMPUTATION METADATA
  // ====================
  algorithm: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  computedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'PerformanceBenchmarks',
  timestamps: false, // Using custom timestamps
  indexes: [
    { fields: ['category'], name: 'performance_benchmarks_category_idx' },
    { fields: ['followerRange'], name: 'performance_benchmarks_followers_idx' },
    { fields: ['region'], name: 'performance_benchmarks_region_idx' },
    { fields: ['period'], name: 'performance_benchmarks_period_idx' },
    { fields: ['startDate', 'endDate'], name: 'performance_benchmarks_date_range_idx' },
    {
      unique: true,
      fields: ['category', 'followerRange', 'region', 'startDate', 'endDate'],
      name: 'unique_performance_benchmark'
    }
  ]
});

// =====================
// CLASS METHODS
// =====================

/**
 * Record analytics data
 */
SocialAnalytics.recordMetrics = async function(entityType, entityId, metricsData, period = 'daily') {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Check if record exists for today
  const existingRecord = await this.findOne({
    where: { entityType, entityId, date, period }
  });
  
  if (existingRecord) {
    // Update existing record
    return existingRecord.update(metricsData);
  } else {
    // Create new record
    return this.create({
      entityType,
      entityId,
      date,
      period,
      ...metricsData
    });
  }
};

/**
 * Get analytics summary for entity
 */
SocialAnalytics.getSummary = async function(entityType, entityId, timeframe = '30d') {
  const timeframeMaps = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = timeframeMaps[timeframe] || 30;
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  
  const analytics = await this.findAll({
    where: {
      entityType,
      entityId,
      date: { [db.Sequelize.Op.gte]: cutoffDate },
      period: 'daily'
    },
    order: [['date', 'ASC']]
  });
  
  // Calculate summary metrics
  const summary = analytics.reduce((acc, record) => {
    acc.totalImpressions += record.impressions || 0;
    acc.totalReach += record.reach || 0;
    acc.totalLikes += record.likes || 0;
    acc.totalComments += record.comments || 0;
    acc.totalShares += record.shares || 0;
    acc.totalRevenue += parseFloat(record.revenue || 0);
    
    // Track daily averages
    acc.dailyData.push({
      date: record.date,
      impressions: record.impressions,
      reach: record.reach,
      engagementRate: record.engagementRate
    });
    
    return acc;
  }, {
    totalImpressions: 0,
    totalReach: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalRevenue: 0,
    dailyData: []
  });
  
  // Calculate averages
  const days = analytics.length || 1;
  summary.avgImpressions = Math.round(summary.totalImpressions / days);
  summary.avgReach = Math.round(summary.totalReach / days);
  summary.avgEngagementRate = analytics.reduce((sum, r) => sum + (r.engagementRate || 0), 0) / days;
  
  return summary;
};

/**
 * Generate insights for user
 */
Insight.generateForUser = async function(userId, options = {}) {
  const { forceRefresh = false, limit = 10 } = options;
  
  // Get recent analytics for user's content
  const userAnalytics = await SocialAnalytics.findAll({
    where: {
      ownerId: userId,
      date: { [db.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    order: [['date', 'DESC']],
    limit: 100
  });
  
  // Generate insights using AI analysis
  const insights = await generateAIInsights(userId, userAnalytics);
  
  // Save insights to database
  const savedInsights = await Promise.all(
    insights.slice(0, limit).map(insight => 
      this.create({
        ...insight,
        userId,
        generatedAt: new Date()
      })
    )
  );
  
  return savedInsights;
};

/**
 * Get user's dashboard
 */
AnalyticsDashboard.getUserDashboard = async function(userId, dashboardType = 'personal') {
  let dashboard = await this.findOne({
    where: { userId, dashboardType, isDefault: true }
  });
  
  if (!dashboard) {
    // Create default dashboard
    dashboard = await this.create({
      userId,
      name: `${dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)} Dashboard`,
      dashboardType,
      isDefault: true,
      widgets: getDefaultWidgets(dashboardType)
    });
  }
  
  return dashboard;
};

/**
 * Compare performance against benchmarks
 */
PerformanceBenchmark.compareUserPerformance = async function(userId, category, followerRange) {
  const benchmark = await this.findOne({
    where: { category, followerRange },
    order: [['computedAt', 'DESC']]
  });
  
  if (!benchmark) {
    return null;
  }
  
  // Get user's recent performance
  const userMetrics = await SocialAnalytics.getSummary('user', userId, '30d');
  
  // Calculate percentile ranking
  const userEngagement = userMetrics.avgEngagementRate || 0;
  const percentile = calculatePercentile(userEngagement, benchmark.engagementPercentiles);
  
  return {
    benchmark: benchmark.toJSON(),
    userMetrics,
    percentileRanking: percentile,
    comparison: {
      engagementRate: {
        user: userEngagement,
        benchmark: benchmark.avgEngagementRate,
        percentile,
        status: getPerformanceStatus(percentile)
      }
    }
  };
};

// ===================
// HELPER FUNCTIONS
// ===================

async function generateAIInsights(userId, analyticsData) {
  // AI insight generation algorithm
  // This would integrate with machine learning models
  // Placeholder implementation
  const insights = [
    {
      type: 'engagement_spike',
      category: 'engagement',
      priority: 'high',
      title: 'Your engagement rate increased by 45% this week',
      description: 'Video content performed exceptionally well, driving higher engagement rates.',
      aiConfidence: 0.89,
      algorithm: 'trend_analysis_v1',
      modelVersion: '1.0',
      recommendations: [
        {
          action: 'Post more video content',
          reason: 'Videos get 3x more engagement',
          impact: 'high',
          effort: 'medium'
        }
      ]
    }
  ];
  
  return insights;
}

function getDefaultWidgets(dashboardType) {
  const widgets = {
    personal: [
      { id: 'engagement_overview', type: 'engagement_metrics', position: { x: 0, y: 0, w: 6, h: 4 } },
      { id: 'follower_growth', type: 'growth_chart', position: { x: 6, y: 0, w: 6, h: 4 } },
      { id: 'top_posts', type: 'content_performance', position: { x: 0, y: 4, w: 12, h: 6 } }
    ],
    creator: [
      { id: 'revenue_overview', type: 'revenue_metrics', position: { x: 0, y: 0, w: 4, h: 4 } },
      { id: 'audience_insights', type: 'audience_demographics', position: { x: 4, y: 0, w: 8, h: 4 } },
      { id: 'content_performance', type: 'content_analytics', position: { x: 0, y: 4, w: 12, h: 8 } }
    ]
  };
  
  return widgets[dashboardType] || widgets.personal;
}

function calculatePercentile(value, percentiles) {
  if (!percentiles || Object.keys(percentiles).length === 0) return 50;
  
  const sortedPercentiles = Object.entries(percentiles)
    .map(([p, v]) => [parseInt(p.replace('p', '')), v])
    .sort((a, b) => a[0] - b[0]);
  
  for (let i = 0; i < sortedPercentiles.length; i++) {
    if (value <= sortedPercentiles[i][1]) {
      return sortedPercentiles[i][0];
    }
  }
  
  return 95; // Above 95th percentile
}

function getPerformanceStatus(percentile) {
  if (percentile >= 90) return 'excellent';
  if (percentile >= 75) return 'above_average';
  if (percentile >= 50) return 'average';
  if (percentile >= 25) return 'below_average';
  return 'needs_improvement';
}

export { SocialAnalytics, AnalyticsDashboard, Insight, PerformanceBenchmark };
