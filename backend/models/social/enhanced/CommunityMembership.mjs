/**
 * COMMUNITY MEMBERSHIP MODEL - 7-STAR SOCIAL MEDIA EXPERIENCE
 * ============================================================
 * Advanced community membership management with roles, permissions,
 * contribution tracking, and engagement analytics.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

const CommunityMembership = db.define('CommunityMembership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // RELATIONSHIP IDENTIFIERS
  // ========================
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  communityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Communities',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // MEMBERSHIP STATUS & ROLE
  // ========================
  status: {
    type: DataTypes.ENUM('pending', 'active', 'inactive', 'banned', 'left'),
    defaultValue: 'pending',
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('member', 'contributor', 'moderator', 'admin', 'owner'),
    defaultValue: 'member',
    allowNull: false
  },
  
  // PERMISSIONS & ACCESS
  // ====================
  permissions: {
    type: DataTypes.JSON, // Granular permissions for this member
    defaultValue: {
      can_post: true,
      can_comment: true,
      can_like: true,
      can_share: true,
      can_invite: true,
      can_create_events: false,
      can_moderate: false,
      can_manage_members: false,
      can_edit_community: false
    }
  },
  
  // MEMBERSHIP DETAILS
  // ==================
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
  invitationAcceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // CONTRIBUTION METRICS
  // ====================
  postsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likesGiven: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likesReceived: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sharesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // ENGAGEMENT & ACTIVITY
  // =====================
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  activityScore: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.0
  },
  engagementLevel: {
    type: DataTypes.ENUM('very_low', 'low', 'moderate', 'high', 'very_high'),
    defaultValue: 'moderate'
  },
  contributionScore: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0.0
  },
  
  // COMMUNITY-SPECIFIC DATA
  // =======================
  memberNumber: {
    type: DataTypes.INTEGER,
    allowNull: true // Sequential member number (1st member, 2nd member, etc.)
  },
  badges: {
    type: DataTypes.JSON, // Community-specific badges earned
    defaultValue: []
  },
  achievements: {
    type: DataTypes.JSON, // Community achievements
    defaultValue: []
  },
  specialRecognitions: {
    type: DataTypes.JSON, // Special recognitions from community
    defaultValue: []
  },
  
  // PREFERENCES & SETTINGS
  // ======================
  notificationSettings: {
    type: DataTypes.JSON, // Member's notification preferences for this community
    defaultValue: {
      new_posts: true,
      new_comments: true,
      mentions: true,
      challenges: true,
      events: true,
      announcements: true,
      weekly_digest: true
    }
  },
  privacySettings: {
    type: DataTypes.JSON, // Privacy settings within this community
    defaultValue: {
      show_profile: true,
      show_activity: true,
      allow_mentions: true,
      allow_direct_messages: true
    }
  },
  
  // CHALLENGES & COMPETITIONS
  // =========================
  challengesParticipated: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  challengesWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  currentChallenges: {
    type: DataTypes.JSON, // Active challenges this member is in
    defaultValue: []
  },
  
  // MENTORSHIP & RELATIONSHIPS
  // ==========================
  isMentor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mentees: {
    type: DataTypes.JSON, // Users this member mentors in this community
    defaultValue: []
  },
  mentors: {
    type: DataTypes.JSON, // Users who mentor this member
    defaultValue: []
  },
  
  // MODERATION & SAFETY
  // ===================
  warningsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  moderationHistory: {
    type: DataTypes.JSON, // History of moderation actions
    defaultValue: []
  },
  reportsMade: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reportsReceived: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // PREMIUM & SUBSCRIPTION
  // ======================
  subscriptionStatus: {
    type: DataTypes.ENUM('none', 'basic', 'premium', 'lifetime'),
    defaultValue: 'none'
  },
  subscriptionStartDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subscriptionEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // ANALYTICS & INSIGHTS
  // ====================
  analyticsData: {
    type: DataTypes.JSON, // Detailed analytics for this membership
    defaultValue: {}
  },
  weeklyStats: {
    type: DataTypes.JSON, // Weekly activity statistics
    defaultValue: {}
  },
  monthlyStats: {
    type: DataTypes.JSON, // Monthly activity statistics
    defaultValue: {}
  },
  
  // CUSTOM FIELDS
  // =============
  customFields: {
    type: DataTypes.JSON, // Community-specific custom fields
    defaultValue: {}
  },
  memberNotes: {
    type: DataTypes.TEXT, // Notes from moderators/admins about this member
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
  tableName: 'CommunityMemberships',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'communityId'],
      name: 'unique_community_membership'
    },
    { fields: ['userId'], name: 'community_memberships_user_idx' },
    { fields: ['communityId'], name: 'community_memberships_community_idx' },
    { fields: ['status'], name: 'community_memberships_status_idx' },
    { fields: ['role'], name: 'community_memberships_role_idx' },
    { fields: ['joinedAt'], name: 'community_memberships_joined_idx' },
    { fields: ['lastActivity'], name: 'community_memberships_activity_idx' },
    { fields: ['contributionScore'], name: 'community_memberships_contribution_idx' },
    { fields: ['engagementLevel'], name: 'community_memberships_engagement_idx' },
    { 
      fields: ['communityId', 'status', 'role'], 
      name: 'community_memberships_community_status_idx' 
    },
    {
      fields: ['communityId', 'contributionScore', 'status'],
      name: 'community_memberships_leaderboard_idx'
    }
  ],
  hooks: {
    beforeCreate: async (membership) => {
      // Set member number
      const memberCount = await CommunityMembership.count({
        where: { 
          communityId: membership.communityId,
          status: ['active', 'inactive'] // Don't count banned/left members
        }
      });
      membership.memberNumber = memberCount + 1;
    },
    afterCreate: async (membership) => {
      // Update community member count
      await updateCommunityMemberCount(membership.communityId);
      
      // Send welcome notification
      await sendWelcomeNotification(membership);
      
      // Award initial badges
      await awardInitialBadges(membership);
    },
    afterUpdate: async (membership) => {
      if (membership.changed('status')) {
        await updateCommunityMemberCount(membership.communityId);
        
        if (membership.status === 'left' || membership.status === 'banned') {
          membership.leftAt = new Date();
        }
      }
      
      // Update contribution score if activity metrics changed
      if (membership.changed(['postsCount', 'commentsCount', 'likesGiven', 'likesReceived'])) {
        await updateContributionScore(membership);
      }
    }
  }
});

// ==================
// CLASS METHODS
// ==================

/**
 * Join a community
 */
CommunityMembership.joinCommunity = async function(userId, communityId, options = {}) {
  const community = await db.models.Community.findByPk(communityId);
  if (!community) throw new Error('Community not found');
  
  // Check if user is already a member
  const existingMembership = await this.findOne({
    where: { userId, communityId }
  });
  
  if (existingMembership) {
    if (existingMembership.status === 'active') {
      throw new Error('User is already a member of this community');
    } else if (existingMembership.status === 'banned') {
      throw new Error('User is banned from this community');
    }
    // Reactivate if previously left
    return existingMembership.update({ 
      status: community.membershipType === 'approval_required' ? 'pending' : 'active',
      joinedAt: new Date(),
      leftAt: null
    });
  }
  
  const status = community.membershipType === 'approval_required' ? 'pending' : 'active';
  
  return this.create({
    userId,
    communityId,
    status,
    invitedBy: options.invitedBy,
    joinedAt: new Date(),
    lastActivity: new Date()
  });
};

/**
 * Leave a community
 */
CommunityMembership.leaveCommunity = async function(userId, communityId) {
  const membership = await this.findOne({
    where: { userId, communityId, status: 'active' }
  });
  
  if (!membership) {
    throw new Error('User is not an active member of this community');
  }
  
  return membership.update({
    status: 'left',
    leftAt: new Date()
  });
};

/**
 * Get community leaderboard
 */
CommunityMembership.getLeaderboard = async function(communityId, options = {}) {
  const { 
    limit = 50, 
    sortBy = 'contributionScore', 
    timeframe = 'all',
    role = null 
  } = options;
  
  const whereClause = {
    communityId,
    status: 'active'
  };
  
  if (role) {
    whereClause.role = role;
  }
  
  const orderField = sortBy === 'activity' ? 'activityScore' : 'contributionScore';
  
  return this.findAll({
    where: whereClause,
    limit,
    order: [[orderField, 'DESC']],
    include: [
      {
        model: db.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      }
    ]
  });
};

/**
 * Get member analytics
 */
CommunityMembership.getMemberAnalytics = async function(userId, communityId, timeframe = '30d') {
  const membership = await this.findOne({
    where: { userId, communityId }
  });
  
  if (!membership) throw new Error('Membership not found');
  
  const timeframeMaps = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = timeframeMaps[timeframe] || 30;
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  // Get activity in timeframe
  const posts = await db.models.EnhancedSocialPost.count({
    where: {
      userId,
      communityId,
      publishedAt: { [db.Sequelize.Op.gte]: cutoffDate }
    }
  });
  
  const comments = await db.models.SocialComment.count({
    where: {
      userId,
      createdAt: { [db.Sequelize.Op.gte]: cutoffDate }
    },
    include: [{
      model: db.models.EnhancedSocialPost,
      where: { communityId }
    }]
  });
  
  return {
    membership: membership.toJSON(),
    activityInPeriod: {
      posts,
      comments,
      // Additional metrics would be calculated here
    },
    rankInCommunity: await getMemberRank(userId, communityId),
    badges: membership.badges,
    achievements: membership.achievements
  };
};

/**
 * Update member role
 */
CommunityMembership.updateRole = async function(userId, communityId, newRole, updatedBy) {
  const membership = await this.findOne({
    where: { userId, communityId }
  });
  
  if (!membership) throw new Error('Membership not found');
  
  // Check permissions of the user making the change
  const updaterMembership = await this.findOne({
    where: { userId: updatedBy, communityId }
  });
  
  if (!canUpdateRole(updaterMembership.role, membership.role, newRole)) {
    throw new Error('Insufficient permissions to update role');
  }
  
  // Update permissions based on new role
  const newPermissions = getRolePermissions(newRole);
  
  return membership.update({
    role: newRole,
    permissions: newPermissions
  });
};

// ===================
// HELPER FUNCTIONS
// ===================

async function updateCommunityMemberCount(communityId) {
  const activeMembers = await CommunityMembership.count({
    where: { 
      communityId, 
      status: 'active'
    }
  });
  
  await db.models.Community.update(
    { currentMembers: activeMembers },
    { where: { id: communityId } }
  );
}

async function sendWelcomeNotification(membership) {
  // Send welcome notification to new member
  // This would integrate with the notification system
}

async function awardInitialBadges(membership) {
  // Award welcome badges to new members
  const welcomeBadges = ['new_member', 'welcome'];
  await membership.update({
    badges: welcomeBadges
  });
}

async function updateContributionScore(membership) {
  // Calculate contribution score based on activity
  const score = (
    membership.postsCount * 10 +
    membership.commentsCount * 5 +
    membership.likesGiven * 1 +
    membership.likesReceived * 2 +
    membership.sharesCount * 3
  );
  
  await membership.update({ contributionScore: score });
}

async function getMemberRank(userId, communityId) {
  // Get member's rank in community based on contribution score
  const higherRanked = await CommunityMembership.count({
    where: {
      communityId,
      status: 'active',
      contributionScore: {
        [db.Sequelize.Op.gt]: db.Sequelize.literal(`(
          SELECT contribution_score 
          FROM "CommunityMemberships" 
          WHERE user_id = '${userId}' AND community_id = '${communityId}'
        )`)
      }
    }
  });
  
  return higherRanked + 1;
}

function canUpdateRole(updaterRole, currentRole, newRole) {
  const roleHierarchy = {
    'member': 1,
    'contributor': 2,
    'moderator': 3,
    'admin': 4,
    'owner': 5
  };
  
  const updaterLevel = roleHierarchy[updaterRole] || 0;
  const currentLevel = roleHierarchy[currentRole] || 0;
  const newLevel = roleHierarchy[newRole] || 0;
  
  // Can only update roles below your own level
  return updaterLevel > currentLevel && updaterLevel > newLevel;
}

function getRolePermissions(role) {
  const rolePermissions = {
    'member': {
      can_post: true,
      can_comment: true,
      can_like: true,
      can_share: true,
      can_invite: false,
      can_create_events: false,
      can_moderate: false,
      can_manage_members: false,
      can_edit_community: false
    },
    'contributor': {
      can_post: true,
      can_comment: true,
      can_like: true,
      can_share: true,
      can_invite: true,
      can_create_events: true,
      can_moderate: false,
      can_manage_members: false,
      can_edit_community: false
    },
    'moderator': {
      can_post: true,
      can_comment: true,
      can_like: true,
      can_share: true,
      can_invite: true,
      can_create_events: true,
      can_moderate: true,
      can_manage_members: true,
      can_edit_community: false
    },
    'admin': {
      can_post: true,
      can_comment: true,
      can_like: true,
      can_share: true,
      can_invite: true,
      can_create_events: true,
      can_moderate: true,
      can_manage_members: true,
      can_edit_community: true
    },
    'owner': {
      can_post: true,
      can_comment: true,
      can_like: true,
      can_share: true,
      can_invite: true,
      can_create_events: true,
      can_moderate: true,
      can_manage_members: true,
      can_edit_community: true
    }
  };
  
  return rolePermissions[role] || rolePermissions['member'];
}

export default CommunityMembership;
