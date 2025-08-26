/**
 * 👥 USER FOLLOW MODEL - SOCIAL FOLLOWING SYSTEM
 * ==============================================
 * Social networking features for following users, friend connections,
 * and social challenges within the gamification system
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const UserFollow = db.define('UserFollow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Foreign Keys
  followerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  followingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // Relationship Status
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'blocked', 'muted'),
    allowNull: false,
    defaultValue: 'accepted'
  },
  
  // Relationship Type
  relationshipType: {
    type: DataTypes.ENUM('follow', 'friend', 'workout_buddy', 'training_partner', 'mentor', 'mentee'),
    allowNull: false,
    defaultValue: 'follow'
  },
  
  // Privacy & Sharing Settings
  shareWorkouts: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  shareAchievements: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  shareProgress: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  shareChallenges: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  shareGoals: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Interaction Settings
  allowDirectMessages: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  allowChallenges: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  allowWorkoutInvites: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  allowProgressComments: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  // Notification Settings
  notifyOnWorkout: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  notifyOnAchievement: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  notifyOnChallenge: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  notifyOnGoalUpdate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Engagement Metrics
  interactionCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  mutualWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  challengesTogether: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  encouragementsGiven: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  encouragementsReceived: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Connection Strength
  connectionStrength: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.00,
    validate: {
      min: 0,
      max: 10
    }
  },
  
  compatibilityScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 5.00,
    validate: {
      min: 0,
      max: 10
    }
  },
  
  // Timeline Tracking
  followedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  lastInteractionAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Special Occasions & Recognition
  anniversaryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  specialTags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  milestones: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Workout Buddy Features
  workoutSchedule: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  preferredWorkoutTimes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  commonInterests: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Group & Team Features
  joinedTeams: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  sharedChallenges: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  groupActivities: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Analytics & Insights
  engagementHistory: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  activityPattern: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  motivationImpact: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: -5,
      max: 5
    }
  },
  
  // Premium Features
  isPremiumConnection: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  premiumFeatures: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // Custom Notes & Memories
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  sharedMemories: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  favoriteWorkouts: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Timestamps
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_follows',
  timestamps: true,
  indexes: [
    {
      fields: ['followerId', 'followingId'],
      unique: true
    },
    {
      fields: ['followerId', 'status']
    },
    {
      fields: ['followingId', 'status']
    },
    {
      fields: ['relationshipType', 'status']
    },
    {
      fields: ['connectionStrength']
    },
    {
      fields: ['lastInteractionAt']
    },
    {
      fields: ['followedAt']
    }
  ],
  
  // Validation
  validate: {
    // Prevent self-following
    cannotFollowSelf() {
      if (this.followerId === this.followingId) {
        throw new Error('Users cannot follow themselves');
      }
    }
  },
  
  // Instance Methods
  instanceMethods: {
    // Check if relationship is mutual
    async isMutual() {
      const mutualFollow = await UserFollow.findOne({
        where: {
          followerId: this.followingId,
          followingId: this.followerId,
          status: 'accepted'
        }
      });
      return mutualFollow !== null;
    },
    
    // Accept follow request
    async acceptFollow() {
      if (this.status !== 'pending') {
        throw new Error('Only pending follows can be accepted');
      }
      
      this.status = 'accepted';
      this.acceptedAt = new Date();
      
      // If this creates a mutual connection, upgrade to friends
      if (await this.isMutual() && this.relationshipType === 'follow') {
        this.relationshipType = 'friend';
        
        // Update the reverse relationship too
        const mutualFollow = await UserFollow.findOne({
          where: {
            followerId: this.followingId,
            followingId: this.followerId
          }
        });
        
        if (mutualFollow && mutualFollow.relationshipType === 'follow') {
          mutualFollow.relationshipType = 'friend';
          await mutualFollow.save();
        }
      }
      
      await this.save();
      return this;
    },
    
    // Block user
    async blockUser() {
      this.status = 'blocked';
      this.allowDirectMessages = false;
      this.allowChallenges = false;
      this.allowWorkoutInvites = false;
      this.allowProgressComments = false;
      this.shareWorkouts = false;
      this.shareAchievements = false;
      this.shareProgress = false;
      this.shareChallenges = false;
      this.shareGoals = false;
      
      await this.save();
      return this;
    },
    
    // Update interaction metrics
    async recordInteraction(type) {
      this.interactionCount += 1;
      this.lastInteractionAt = new Date();
      
      // Track specific interaction types
      if (type === 'encouragement_given') {
        this.encouragementsGiven += 1;
      } else if (type === 'encouragement_received') {
        this.encouragementsReceived += 1;
      } else if (type === 'mutual_workout') {
        this.mutualWorkouts += 1;
      } else if (type === 'challenge_together') {
        this.challengesTogether += 1;
      }
      
      // Update engagement history
      if (!this.engagementHistory) this.engagementHistory = [];
      this.engagementHistory.push({
        date: new Date().toISOString(),
        type: type,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 100 interactions
      if (this.engagementHistory.length > 100) {
        this.engagementHistory = this.engagementHistory.slice(-100);
      }
      
      // Recalculate connection strength
      this.calculateConnectionStrength();
      
      await this.save();
      return this;
    },
    
    // Calculate connection strength based on interactions
    calculateConnectionStrength() {
      const baseStrength = 1.0;
      const interactionBonus = Math.min(this.interactionCount * 0.1, 3.0);
      const mutualWorkoutBonus = this.mutualWorkouts * 0.5;
      const challengeBonus = this.challengesTogether * 0.3;
      const encouragementBonus = (this.encouragementsGiven + this.encouragementsReceived) * 0.1;
      
      // Time decay factor (connections weaken without interaction)
      const daysSinceLastInteraction = this.lastInteractionAt ? 
        (new Date() - new Date(this.lastInteractionAt)) / (1000 * 60 * 60 * 24) : 365;
      const timeDecay = Math.max(0.1, 1 - (daysSinceLastInteraction * 0.01));
      
      this.connectionStrength = Math.min(10, 
        (baseStrength + interactionBonus + mutualWorkoutBonus + challengeBonus + encouragementBonus) * timeDecay
      );
      
      return this.connectionStrength;
    },
    
    // Get relationship summary
    getRelationshipSummary() {
      return {
        type: this.relationshipType,
        status: this.status,
        connectionStrength: this.connectionStrength,
        interactionCount: this.interactionCount,
        mutualWorkouts: this.mutualWorkouts,
        challengesTogether: this.challengesTogether,
        daysSinceFollowed: Math.ceil((new Date() - new Date(this.followedAt)) / (1000 * 60 * 60 * 24)),
        lastInteraction: this.lastInteractionAt,
        isMutual: this.isMutual()
      };
    }
  },
  
  // Class Methods
  classMethods: {
    // Get user's followers
    async getFollowers(userId, status = 'accepted') {
      return this.findAll({
        where: {
          followingId: userId,
          status: status
        },
        include: [{
          model: db.models.User,
          as: 'Follower',
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        }],
        order: [['connectionStrength', 'DESC']]
      });
    },
    
    // Get users that user is following
    async getFollowing(userId, status = 'accepted') {
      return this.findAll({
        where: {
          followerId: userId,
          status: status
        },
        include: [{
          model: db.models.User,
          as: 'Following',
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        }],
        order: [['connectionStrength', 'DESC']]
      });
    },
    
    // Get mutual friends
    async getMutualFriends(userId, otherUserId) {
      // Find users that both userId and otherUserId are following
      const userFollowing = await this.findAll({
        where: { followerId: userId, status: 'accepted' },
        attributes: ['followingId']
      });
      
      const otherUserFollowing = await this.findAll({
        where: { followerId: otherUserId, status: 'accepted' },
        attributes: ['followingId']
      });
      
      const userFollowingIds = userFollowing.map(f => f.followingId);
      const otherUserFollowingIds = otherUserFollowing.map(f => f.followingId);
      
      const mutualIds = userFollowingIds.filter(id => otherUserFollowingIds.includes(id));
      
      if (mutualIds.length === 0) return [];
      
      return db.models.User.findAll({
        where: { id: { [Op.in]: mutualIds } },
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      });
    },
    
    // Follow or unfollow user
    async toggleFollow(followerId, followingId, options = {}) {
      const existingFollow = await this.findOne({
        where: { followerId, followingId }
      });
      
      if (existingFollow) {
        if (existingFollow.status === 'blocked') {
          throw new Error('Cannot follow blocked user');
        }
        
        // Unfollow
        await existingFollow.destroy();
        return { action: 'unfollowed', follow: null };
      } else {
        // Create new follow
        const newFollow = await this.create({
          followerId,
          followingId,
          status: options.requiresApproval ? 'pending' : 'accepted',
          relationshipType: options.relationshipType || 'follow',
          ...options
        });
        
        return { action: 'followed', follow: newFollow };
      }
    },
    
    // Get friend suggestions based on mutual connections and interests
    async getFriendSuggestions(userId, limit = 10) {
      // This is a simplified version - in production you'd want more sophisticated algorithms
      const userFollowing = await this.findAll({
        where: { followerId: userId, status: 'accepted' },
        attributes: ['followingId']
      });
      
      const followingIds = userFollowing.map(f => f.followingId);
      
      if (followingIds.length === 0) {
        // If user doesn't follow anyone, suggest popular users
        return db.models.User.findAll({
          where: { id: { [Op.ne]: userId } },
          attributes: ['id', 'username', 'displayName', 'avatarUrl'],
          limit
        });
      }
      
      // Find users that user's friends follow but user doesn't
      const suggestions = await this.findAll({
        where: {
          followerId: { [Op.in]: followingIds },
          status: 'accepted',
          followingId: { 
            [Op.and]: [
              { [Op.ne]: userId },
              { [Op.notIn]: followingIds }
            ]
          }
        },
        attributes: [
          'followingId',
          [db.fn('COUNT', db.col('followingId')), 'mutualFriends']
        ],
        group: ['followingId'],
        order: [[db.fn('COUNT', db.col('followingId')), 'DESC']],
        limit,
        include: [{
          model: db.models.User,
          as: 'Following',
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        }]
      });
      
      return suggestions;
    },
    
    // Get social stats for user
    async getSocialStats(userId) {
      const followersCount = await this.count({
        where: { followingId: userId, status: 'accepted' }
      });
      
      const followingCount = await this.count({
        where: { followerId: userId, status: 'accepted' }
      });
      
      const friendsCount = await this.count({
        where: {
          followerId: userId,
          status: 'accepted',
          relationshipType: 'friend'
        }
      });
      
      const workoutBuddiesCount = await this.count({
        where: {
          followerId: userId,
          status: 'accepted',
          relationshipType: 'workout_buddy'
        }
      });
      
      return {
        followers: followersCount,
        following: followingCount,
        friends: friendsCount,
        workoutBuddies: workoutBuddiesCount,
        ratio: followingCount > 0 ? (followersCount / followingCount).toFixed(2) : 0
      };
    }
  }
});

// Model associations will be defined in associations.mjs

export default UserFollow;
