/**
 * SOCIAL CONTROLLER - COMPREHENSIVE SOCIAL FEATURES & USER INTERACTIONS
 * ====================================================================
 * Production-ready controller for social following, interactions,
 * and community features within the gamification system
 */

import { Op } from 'sequelize';
import db from '../database.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';

const socialController = {
  /**
   * FOLLOW USER
   * ==========
   * POST /api/v1/gamification/users/:userId/follow
   */
  followUser: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { UserFollow, User, Notification } = models;
      
      const { userId: targetUserId } = req.params;
      const followerId = req.user.id;

      // Validation
      if (targetUserId === followerId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot follow yourself'
        });
      }

      // Check if target user exists
      const targetUser = await User.findByPk(targetUserId, { transaction });
      if (!targetUser) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already following
      const existingFollow = await UserFollow.findOne({
        where: {
          followerId,
          followingId: targetUserId
        },
        transaction
      });

      if (existingFollow) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Already following this user'
        });
      }

      // Create follow relationship
      const follow = await UserFollow.create({
        followerId,
        followingId: targetUserId,
        status: 'active',
        followedAt: new Date()
      }, { transaction });

      // Create notification for the followed user
      if (Notification) {
        await Notification.create({
          userId: targetUserId,
          senderId: followerId,
          type: 'new_follower',
          title: 'New Follower',
          message: `${req.user.firstName || 'Someone'} started following you!`,
          metadata: {
            followerId,
            followId: follow.id
          }
        }, { transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Successfully followed user',
        follow
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error following user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to follow user',
        error: error.message
      });
    }
  },

  /**
   * UNFOLLOW USER
   * ============
   * DELETE /api/v1/gamification/users/:userId/unfollow
   */
  unfollowUser: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { UserFollow } = models;
      
      const { userId: targetUserId } = req.params;
      const followerId = req.user.id;

      // Find and remove follow relationship
      const follow = await UserFollow.findOne({
        where: {
          followerId,
          followingId: targetUserId
        },
        transaction
      });

      if (!follow) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Not following this user'
        });
      }

      await follow.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Successfully unfollowed user'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error unfollowing user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to unfollow user',
        error: error.message
      });
    }
  },

  /**
   * GET USER FOLLOWERS
   * =================
   * GET /api/v1/gamification/users/:userId/followers
   */
  getUserFollowers: async (req, res) => {
    try {
      const models = await getModels();
      const { UserFollow, User } = models;
      
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const followers = await UserFollow.findAndCountAll({
        where: {
          followingId: userId,
          status: 'active'
        },
        include: [{
          model: User,
          as: 'follower',
          attributes: [
            'id', 'firstName', 'lastName', 'username', 'photo',
            'points', 'level', 'tier', 'badgesPrimary'
          ],
          include: [{
            model: Achievement,
            as: 'primaryBadge',
            attributes: ['id', 'name', 'icon', 'badgeImageUrl'],
            required: false
          }]
        }],
        order: [['followedAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      return res.status(200).json({
        success: true,
        followers: followers.rows,
        pagination: {
          total: followers.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(followers.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching followers:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch followers',
        error: error.message
      });
    }
  },

  /**
   * GET USER FOLLOWING
   * =================
   * GET /api/v1/gamification/users/:userId/following
   */
  getUserFollowing: async (req, res) => {
    try {
      const models = await getModels();
      const { UserFollow, User, Achievement } = models;
      
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const following = await UserFollow.findAndCountAll({
        where: {
          followerId: userId,
          status: 'active'
        },
        include: [{
          model: User,
          as: 'followedUser',
          attributes: [
            'id', 'firstName', 'lastName', 'username', 'photo',
            'points', 'level', 'tier', 'badgesPrimary'
          ],
          include: [{
            model: Achievement,
            as: 'primaryBadge',
            attributes: ['id', 'name', 'icon', 'badgeImageUrl'],
            required: false
          }]
        }],
        order: [['followedAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      return res.status(200).json({
        success: true,
        following: following.rows,
        pagination: {
          total: following.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(following.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching following:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch following',
        error: error.message
      });
    }
  },

  /**
   * GET FOLLOW STATUS
   * ================
   * GET /api/v1/gamification/users/:userId/follow-status
   */
  getFollowStatus: async (req, res) => {
    try {
      const models = await getModels();
      const { UserFollow } = models;
      
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user.id;

      if (targetUserId === currentUserId) {
        return res.status(200).json({
          success: true,
          status: {
            isFollowing: false,
            isFollowedBy: false,
            isSelf: true
          }
        });
      }

      // Check if current user follows target user
      const isFollowing = await UserFollow.findOne({
        where: {
          followerId: currentUserId,
          followingId: targetUserId,
          status: 'active'
        }
      });

      // Check if target user follows current user
      const isFollowedBy = await UserFollow.findOne({
        where: {
          followerId: targetUserId,
          followingId: currentUserId,
          status: 'active'
        }
      });

      return res.status(200).json({
        success: true,
        status: {
          isFollowing: !!isFollowing,
          isFollowedBy: !!isFollowedBy,
          isSelf: false,
          mutualFollow: !!isFollowing && !!isFollowedBy
        }
      });
    } catch (error) {
      console.error('Error checking follow status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check follow status',
        error: error.message
      });
    }
  },

  /**
   * GET USER SOCIAL STATS
   * ====================
   * GET /api/v1/gamification/users/:userId/social-stats
   */
  getUserSocialStats: async (req, res) => {
    try {
      const models = await getModels();
      const { UserFollow, ChallengeParticipant, Challenge } = models;
      
      const { userId } = req.params;

      // Get follower count
      const followersCount = await UserFollow.count({
        where: {
          followingId: userId,
          status: 'active'
        }
      });

      // Get following count
      const followingCount = await UserFollow.count({
        where: {
          followerId: userId,
          status: 'active'
        }
      });

      // Get mutual follows count
      const mutualFollows = await UserFollow.findAll({
        where: {
          followerId: userId,
          status: 'active'
        },
        include: [{
          model: UserFollow,
          as: 'mutualConnection',
          where: {
            followerId: db.col('UserFollow.followingId'),
            followingId: userId,
            status: 'active'
          },
          required: true
        }]
      });

      // Get challenge social stats
      const challengeStats = await ChallengeParticipant.findAll({
        where: { userId },
        include: [{
          model: Challenge,
          as: 'challenge',
          attributes: ['id', 'title', 'currentParticipants']
        }]
      });

      const activeChallengesWithOthers = challengeStats.filter(cp => 
        cp.challenge && cp.challenge.currentParticipants > 1 && !cp.isCompleted
      ).length;

      // Recent social activity (simplified - could be expanded)
      const recentActivity = {
        newFollowersThisWeek: await this.getNewFollowersCount(userId, 7),
        challengesJoinedThisWeek: await this.getChallengesJoinedCount(userId, 7)
      };

      return res.status(200).json({
        success: true,
        stats: {
          followers: followersCount,
          following: followingCount,
          mutualFollows: mutualFollows.length,
          activeChallengesWithOthers,
          socialScore: this.calculateSocialScore({
            followers: followersCount,
            following: followingCount,
            mutualFollows: mutualFollows.length,
            activeChallengesWithOthers
          }),
          recentActivity
        }
      });
    } catch (error) {
      console.error('Error fetching social stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch social statistics',
        error: error.message
      });
    }
  },

  /**
   * DISCOVER USERS - RECOMMENDATION SYSTEM
   * =====================================
   * GET /api/v1/gamification/discover-users
   */
  discoverUsers: async (req, res) => {
    try {
      const models = await getModels();
      const { User, UserFollow, Challenge, ChallengeParticipant, Achievement } = models;
      
      const { 
        page = 1, 
        limit = 20,
        level,
        tier,
        interests,
        mutualFollows = false
      } = req.query;

      const currentUserId = req.user.id;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause for filtering
      let whereClause = {
        id: { [Op.ne]: currentUserId }
      };

      if (level) whereClause.level = level;
      if (tier) whereClause.tier = tier;

      // Get users already followed by current user
      const alreadyFollowing = await UserFollow.findAll({
        where: { followerId: currentUserId, status: 'active' },
        attributes: ['followingId']
      });

      const followingIds = alreadyFollowing.map(f => f.followingId);
      if (followingIds.length > 0) {
        whereClause.id[Op.notIn] = followingIds;
      }

      let includeClause = [
        {
          model: Achievement,
          as: 'primaryBadge',
          attributes: ['id', 'name', 'icon', 'badgeImageUrl'],
          required: false
        }
      ];

      // If looking for mutual follows, modify the query
      if (mutualFollows === 'true') {
        // Find users who follow people that the current user follows
        const mutualFollowCandidates = await db.query(`
          SELECT DISTINCT uf2."followingId" as userId
          FROM "user_follows" uf1
          JOIN "user_follows" uf2 ON uf1."followingId" = uf2."followerId"
          WHERE uf1."followerId" = :currentUserId
          AND uf2."followingId" != :currentUserId
          AND uf2."status" = 'active'
          AND uf1."status" = 'active'
        `, {
          replacements: { currentUserId },
          type: db.QueryTypes.SELECT
        });

        const candidateIds = mutualFollowCandidates.map(c => c.userId);
        if (candidateIds.length > 0) {
          whereClause.id = { [Op.and]: [whereClause.id, { [Op.in]: candidateIds }] };
        } else {
          // No mutual follow candidates found
          return res.status(200).json({
            success: true,
            users: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            },
            recommendations: []
          });
        }
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'level', 'tier', 'badgesPrimary', 'streakDays',
          'totalWorkouts', 'createdAt'
        ],
        include: includeClause,
        order: [
          ['points', 'DESC'],
          ['level', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // Generate recommendations for each user
      const usersWithRecommendations = await Promise.all(
        users.rows.map(async (user) => {
          const recommendationReason = await this.generateRecommendationReason(
            currentUserId, 
            user.id, 
            models
          );
          
          return {
            ...user.toJSON(),
            recommendationReason
          };
        })
      );

      return res.status(200).json({
        success: true,
        users: usersWithRecommendations,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(users.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error discovering users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to discover users',
        error: error.message
      });
    }
  },

  /**
   * GET SOCIAL FEED - USER ACTIVITY FEED
   * ===================================
   * GET /api/v1/gamification/social-feed
   */
  getSocialFeed: async (req, res) => {
    try {
      const models = await getModels();
      const { UserFollow, User, ChallengeParticipant, Challenge, Achievement, UserAchievement } = models;
      
      const { page = 1, limit = 20, type = 'all' } = req.query;
      const currentUserId = req.user.id;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get users that current user follows
      const following = await UserFollow.findAll({
        where: { followerId: currentUserId, status: 'active' },
        attributes: ['followingId']
      });

      const followingIds = following.map(f => f.followingId);
      followingIds.push(currentUserId); // Include own activities

      if (followingIds.length === 0) {
        return res.status(200).json({
          success: true,
          feed: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0
          }
        });
      }

      // Collect different types of activities
      let activities = [];

      // Challenge completions
      if (type === 'all' || type === 'challenges') {
        const challengeCompletions = await ChallengeParticipant.findAll({
          where: {
            userId: { [Op.in]: followingIds },
            isCompleted: true,
            completedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
            },
            {
              model: Challenge,
              as: 'challenge',
              attributes: ['id', 'title', 'category', 'xpReward']
            }
          ],
          order: [['completedAt', 'DESC']],
          limit: parseInt(limit)
        });

        activities = activities.concat(
          challengeCompletions.map(cc => ({
            type: 'challenge_completed',
            user: cc.user,
            data: {
              challenge: cc.challenge,
              completedAt: cc.completedAt,
              progress: cc.progress
            },
            timestamp: cc.completedAt,
            priority: 3
          }))
        );
      }

      // Achievement unlocks
      if (type === 'all' || type === 'achievements') {
        const achievementUnlocks = await UserAchievement.findAll({
          where: {
            userId: { [Op.in]: followingIds },
            isCompleted: true,
            earnedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
            },
            {
              model: Achievement,
              as: 'achievement',
              attributes: ['id', 'name', 'description', 'icon', 'tier', 'pointValue']
            }
          ],
          order: [['earnedAt', 'DESC']],
          limit: parseInt(limit)
        });

        activities = activities.concat(
          achievementUnlocks.map(au => ({
            type: 'achievement_unlocked',
            user: au.user,
            data: {
              achievement: au.achievement,
              earnedAt: au.earnedAt,
              pointsAwarded: au.pointsAwarded
            },
            timestamp: au.earnedAt,
            priority: 4
          }))
        );
      }

      // New followers
      if (type === 'all' || type === 'follows') {
        const newFollows = await UserFollow.findAll({
          where: {
            followingId: { [Op.in]: followingIds },
            status: 'active',
            followedAt: { [Op.gte]: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // Last 3 days
          },
          include: [
            {
              model: User,
              as: 'follower',
              attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
            },
            {
              model: User,
              as: 'followedUser',
              attributes: ['id', 'firstName', 'lastName', 'username']
            }
          ],
          order: [['followedAt', 'DESC']],
          limit: parseInt(limit)
        });

        activities = activities.concat(
          newFollows.map(nf => ({
            type: 'new_follower',
            user: nf.followedUser,
            data: {
              follower: nf.follower,
              followedAt: nf.followedAt
            },
            timestamp: nf.followedAt,
            priority: 1
          }))
        );
      }

      // Sort activities by priority and timestamp
      activities.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      // Paginate results
      const paginatedActivities = activities.slice(offset, offset + parseInt(limit));

      return res.status(200).json({
        success: true,
        feed: paginatedActivities,
        pagination: {
          total: activities.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(activities.length / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching social feed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch social feed',
        error: error.message
      });
    }
  },

  // Helper methods

  getNewFollowersCount: async (userId, days) => {
    try {
      const models = await getModels();
      const { UserFollow } = models;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await UserFollow.count({
        where: {
          followingId: userId,
          status: 'active',
          followedAt: { [Op.gte]: startDate }
        }
      });
    } catch (error) {
      return 0;
    }
  },

  getChallengesJoinedCount: async (userId, days) => {
    try {
      const models = await getModels();
      const { ChallengeParticipant } = models;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await ChallengeParticipant.count({
        where: {
          userId,
          joinedAt: { [Op.gte]: startDate }
        }
      });
    } catch (error) {
      return 0;
    }
  },

  calculateSocialScore: (stats) => {
    const { followers, following, mutualFollows, activeChallengesWithOthers } = stats;
    
    // Simple scoring algorithm - can be made more sophisticated
    let score = 0;
    
    // Follower score (with diminishing returns)
    score += Math.min(followers * 2, 100);
    
    // Following score (encourage engagement)
    score += Math.min(following * 1.5, 75);
    
    // Mutual follows bonus (higher value)
    score += mutualFollows * 5;
    
    // Active participation bonus
    score += activeChallengesWithOthers * 10;
    
    // Normalize to 0-100 scale
    return Math.min(Math.round(score), 100);
  },

  generateRecommendationReason: async (currentUserId, targetUserId, models) => {
    try {
      const { User, ChallengeParticipant, Achievement, UserAchievement } = models;
      
      // Get both users
      const [currentUser, targetUser] = await Promise.all([
        User.findByPk(currentUserId),
        User.findByPk(targetUserId)
      ]);

      if (!currentUser || !targetUser) return 'Similar fitness journey';

      // Check level similarity
      if (Math.abs(currentUser.level - targetUser.level) <= 2) {
        return `Similar level (Level ${targetUser.level})`;
      }

      // Check tier match
      if (currentUser.tier === targetUser.tier) {
        return `Same tier (${targetUser.tier})`;
      }

      // Check common challenges
      const commonChallenges = await db.query(`
        SELECT COUNT(*) as common_count
        FROM "challenge_participants" cp1
        JOIN "challenge_participants" cp2 ON cp1."challengeId" = cp2."challengeId"
        WHERE cp1."userId" = :currentUserId 
        AND cp2."userId" = :targetUserId
      `, {
        replacements: { currentUserId, targetUserId },
        type: db.QueryTypes.SELECT
      });

      if (commonChallenges[0]?.common_count > 0) {
        return `${commonChallenges[0].common_count} common challenges`;
      }

      // Check achievement similarity
      const bothUsersAchievements = await UserAchievement.findAll({
        where: {
          userId: { [Op.in]: [currentUserId, targetUserId] },
          isCompleted: true
        },
        include: [{
          model: Achievement,
          as: 'achievement',
          attributes: ['category']
        }]
      });

      const currentUserCategories = new Set();
      const targetUserCategories = new Set();

      bothUsersAchievements.forEach(ua => {
        if (ua.userId === currentUserId) {
          currentUserCategories.add(ua.achievement.category);
        } else {
          targetUserCategories.add(ua.achievement.category);
        }
      });

      const commonCategories = [...currentUserCategories].filter(cat => 
        targetUserCategories.has(cat)
      );

      if (commonCategories.length > 0) {
        return `Similar interests in ${commonCategories[0]}`;
      }

      // Default recommendation
      return 'Recommended for you';
    } catch (error) {
      return 'Recommended for you';
    }
  }
};

export default socialController;
