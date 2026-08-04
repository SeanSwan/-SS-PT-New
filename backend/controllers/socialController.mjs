/**
 * SOCIAL CONTROLLER - COMPREHENSIVE SOCIAL FEATURES & USER INTERACTIONS
 * ====================================================================
 * Production-ready controller for social following, interactions,
 * and community features within the gamification system
 */

import { Op } from 'sequelize';
import {
  directoryAttributes,
  directoryLimit,
  directoryOffset,
  directoryTotal,
  isKnownTier,
  isStaffViewer,
  scopeToMembers,
} from '../utils/memberDirectoryAccess.mjs';
import db from '../database.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';

const INTERNAL_ERROR = 'Internal server error';

const sendSocialError = (res, status, message, error = INTERNAL_ERROR) =>
  res.status(status).json({
    success: false,
    message,
    error
  });

const parsePositiveInteger = (value, fallback = null) => {
  const stringValue = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(stringValue)) return fallback;

  return Number(stringValue);
};

const parseBoundedPositiveInteger = (value, fallback, max) =>
  Math.min(parsePositiveInteger(value, fallback), max);

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
      
      const targetUserId = parsePositiveInteger(req.params.userId);
      const followerId = parsePositiveInteger(req.user?.id);

      if (!targetUserId || !followerId) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

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
        status: 'accepted', // UserFollow enum is pending|accepted|blocked|muted — 'active' never existed (live-DB verified 2026-08-04)
        followedAt: new Date()
      }, { transaction });

      await transaction.commit();

      // Notify the followed user AFTER commit — best-effort, never fails the
      // follow. 'new_follower' is not in Notification.mjs's type allowlist and
      // the old in-transaction create rolled the whole follow back with a 500
      // (trust triple 2026-07-06). The model also has no metadata column, so
      // use the relatedEntity pattern it actually defines.
      if (Notification) {
        try {
          await Notification.create({
            userId: targetUserId,
            senderId: followerId,
            type: 'system',
            title: 'New Follower',
            message: `${req.user.firstName || 'Someone'} started following you!`,
            relatedEntityType: 'follow',
            relatedEntityId: follow.id
          });
        } catch (notificationError) {
          console.error('Follow succeeded but follower notification failed:', notificationError?.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully followed user',
        follow
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error following user:', error);
      return sendSocialError(res, 500, 'Failed to follow user');
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
      
      const targetUserId = parsePositiveInteger(req.params.userId);
      const followerId = parsePositiveInteger(req.user?.id);

      if (!targetUserId || !followerId) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

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
      return sendSocialError(res, 500, 'Failed to unfollow user');
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
      
      const userId = parsePositiveInteger(req.params.userId);
      const { page = 1, limit = 20 } = req.query;
      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);

      if (!userId) return res.status(400).json({ success: false, message: 'Invalid user id' });

      // Same directory policy as /discover-users and /leaderboard: surnames are
      // staff-only and members cannot page. Without this a member could walk any
      // account's follower graph — including an admin's — harvesting full legal
      // names one page at a time.
      const offset = directoryOffset(req.user, (normalizedPage - 1) * normalizedLimit);
      const effectiveLimit = directoryLimit(req.user, normalizedLimit);

      const followers = await UserFollow.findAndCountAll({
        where: {
          followingId: userId,
          status: 'accepted'
        },
        include: [{
          model: User,
          as: 'follower',
          attributes: directoryAttributes(req.user, ['points', 'level', 'tier']),
          include: []
        }],
        order: [['followedAt', 'DESC']],
        limit: effectiveLimit,
        offset,
        distinct: true
      });

      return res.status(200).json({
        success: true,
        followers: followers.rows,
        pagination: {
          // An exact follower count for an arbitrary account is an oracle, and
          // echoing the REQUESTED page while the offset is pinned to 0 returned
          // page 1's rows labelled "page 5".
          total: directoryTotal(req.user, followers.count, followers.rows.length),
          page: isStaffViewer(req.user) ? normalizedPage : 1,
          limit: effectiveLimit,
          pages: isStaffViewer(req.user) ? Math.ceil(followers.count / normalizedLimit) : 1
        }
      });
    } catch (error) {
      console.error('Error fetching followers:', error);
      return sendSocialError(res, 500, 'Failed to fetch followers');
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
      
      const userId = parsePositiveInteger(req.params.userId);
      const { page = 1, limit = 20 } = req.query;
      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);

      if (!userId) return res.status(400).json({ success: false, message: 'Invalid user id' });

      const offset = (normalizedPage - 1) * normalizedLimit;

      const following = await UserFollow.findAndCountAll({
        where: {
          followerId: userId,
          status: 'accepted'
        },
        include: [{
          model: User,
          as: 'followedUser',
          attributes: directoryAttributes(req.user, ['points', 'level', 'tier']),
          include: []
        }],
        order: [['followedAt', 'DESC']],
        limit: directoryLimit(req.user, normalizedLimit),
        offset: directoryOffset(req.user, offset),
        distinct: true
      });

      return res.status(200).json({
        success: true,
        following: following.rows,
        pagination: {
          total: directoryTotal(req.user, following.count, following.rows.length),
          page: isStaffViewer(req.user) ? normalizedPage : 1,
          limit: directoryLimit(req.user, normalizedLimit),
          pages: isStaffViewer(req.user) ? Math.ceil(following.count / normalizedLimit) : 1
        }
      });
    } catch (error) {
      console.error('Error fetching following:', error);
      return sendSocialError(res, 500, 'Failed to fetch following');
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
      
      const targetUserId = parsePositiveInteger(req.params.userId);
      const currentUserId = parsePositiveInteger(req.user?.id);

      if (!targetUserId || !currentUserId) {
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

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
          status: 'accepted'
        }
      });

      // Check if target user follows current user
      const isFollowedBy = await UserFollow.findOne({
        where: {
          followerId: targetUserId,
          followingId: currentUserId,
          status: 'accepted'
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
      return sendSocialError(res, 500, 'Failed to check follow status');
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
      
      const userId = parsePositiveInteger(req.params.userId);

      if (!userId) return res.status(400).json({ success: false, message: 'Invalid user id' });

      // Get follower count
      const followersCount = await UserFollow.count({
        where: {
          followingId: userId,
          status: 'accepted'
        }
      });

      // Get following count
      const followingCount = await UserFollow.count({
        where: {
          followerId: userId,
          status: 'accepted'
        }
      });

      // Get mutual follows count
      const mutualFollows = await UserFollow.findAll({
        where: {
          followerId: userId,
          status: 'accepted'
        },
        include: [{
          model: UserFollow,
          as: 'mutualConnection',
          where: {
            followerId: db.col('UserFollow.followingId'),
            followingId: userId,
            status: 'accepted'
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
      return sendSocialError(res, 500, 'Failed to fetch social statistics');
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

      const currentUserId = parsePositiveInteger(req.user?.id);
      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);
      const rawOffset = (normalizedPage - 1) * normalizedLimit;

      if (!currentUserId) return res.status(400).json({ success: false, message: 'Invalid user id' });

      // SECURITY: this is a member-facing DIRECTORY over the Users table, open
      // to any authenticated account. It previously shipped surnames with no
      // role filter, unbounded paging, an unvalidated tier filter and the full
      // population count — i.e. every defect that was closed one route above on
      // /leaderboard, still wide open here. Both now share one policy module so
      // the next directory endpoint cannot re-open it by hand-rolling its own.
      const offset = directoryOffset(req.user, rawOffset);
      const effectiveLimit = directoryLimit(req.user, normalizedLimit);

      // Build where clause for filtering
      const whereClause = scopeToMembers(req.user, {
        id: { [Op.ne]: currentUserId }
      });

      // `level` is the surviving partition key now that offset is pinned to 0:
      // ?level=1,2,3... are disjoint slices that compose with tier. Validated
      // as a bounded integer (it is an INTEGER column, so a non-numeric value
      // also threw a Postgres cast error straight into the 500 handler).
      // Uses the file's sanctioned helper (raw parseInt is banned here by
      // socialControllerSecurity.test.mjs — it returns NaN/partial parses).
      const parsedLevel = parsePositiveInteger(level);
      if (parsedLevel && parsedLevel <= 1000) {
        whereClause.level = parsedLevel;
      }
      // Unvalidated `tier` partitions the table into independently-walkable
      // slices; allowlisted against the values the system can actually store.
      if (tier && isKnownTier(tier)) whereClause.tier = tier;

      // Get users already followed by current user
      const alreadyFollowing = await UserFollow.findAll({
        where: { followerId: currentUserId, status: 'accepted' },
        attributes: ['followingId']
      });

      const followingIds = alreadyFollowing.map(f => f.followingId);
      if (followingIds.length > 0) {
        whereClause.id[Op.notIn] = followingIds;
      }

      const includeClause = [];

      // If looking for mutual follows, modify the query
      if (mutualFollows === 'true') {
        // Find users who follow people that the current user follows
        const mutualFollowCandidates = await db.query(`
          SELECT DISTINCT uf2."followingId" as "userId"
          FROM "user_follows" uf1
          JOIN "user_follows" uf2 ON uf1."followingId" = uf2."followerId"
          WHERE uf1."followerId" = :currentUserId
          AND uf2."followingId" != :currentUserId
          AND uf2."status" = 'accepted'
          AND uf1."status" = 'accepted'
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
              page: normalizedPage,
              limit: normalizedLimit,
              pages: 0
            },
            recommendations: []
          });
        }
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        attributes: directoryAttributes(req.user, [
          'points', 'level', 'tier', 'streakDays',
          'totalWorkouts', 'createdAt'
        ]),
        include: includeClause,
        order: [
          ['points', 'DESC'],
          ['level', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: effectiveLimit,
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
          // Members are told the size of what they received, never the
          // population — with `tier`/`level` set that is an exact per-slice
          // headcount, and it hands an enumerator the page count to walk.
          total: directoryTotal(req.user, users.count, usersWithRecommendations.length),
          page: isStaffViewer(req.user) ? normalizedPage : 1,
          limit: effectiveLimit,
          pages: isStaffViewer(req.user) ? Math.ceil(users.count / normalizedLimit) : 1
        }
      });
    } catch (error) {
      console.error('Error discovering users:', error);
      return sendSocialError(res, 500, 'Failed to discover users');
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
      const currentUserId = parsePositiveInteger(req.user?.id);
      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);
      const offset = (normalizedPage - 1) * normalizedLimit;

      if (!currentUserId) return res.status(400).json({ success: false, message: 'Invalid user id' });

      // Get users that current user follows
      const following = await UserFollow.findAll({
        where: { followerId: currentUserId, status: 'accepted' },
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
            page: normalizedPage,
            limit: normalizedLimit,
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
              attributes: directoryAttributes(req.user)
            },
            {
              model: Challenge,
              as: 'challenge',
              attributes: ['id', 'title', 'category', 'xpReward']
            }
          ],
          order: [['completedAt', 'DESC']],
          limit: normalizedLimit
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
              attributes: directoryAttributes(req.user)
            },
            {
              model: Achievement,
              as: 'achievement'
            }
          ],
          order: [['earnedAt', 'DESC']],
          limit: normalizedLimit
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
            status: 'accepted', // UserFollow enum is pending|accepted|blocked|muted — 'active' never existed (live-DB verified 2026-08-04)
            followedAt: { [Op.gte]: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // Last 3 days
          },
          include: [
            {
              model: User,
              as: 'follower',
              attributes: directoryAttributes(req.user)
            },
            {
              model: User,
              as: 'followedUser',
              attributes: directoryAttributes(req.user).filter((a) => a !== 'photo')
            }
          ],
          order: [['followedAt', 'DESC']],
          limit: normalizedLimit
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
      const paginatedActivities = activities.slice(offset, offset + normalizedLimit);

      return res.status(200).json({
        success: true,
        feed: paginatedActivities,
        pagination: {
          total: activities.length,
          page: normalizedPage,
          limit: normalizedLimit,
          pages: Math.ceil(activities.length / normalizedLimit)
        }
      });
    } catch (error) {
      console.error('Error fetching social feed:', error);
      return sendSocialError(res, 500, 'Failed to fetch social feed');
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
          status: 'accepted', // UserFollow enum is pending|accepted|blocked|muted — 'active' never existed (live-DB verified 2026-08-04)
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
