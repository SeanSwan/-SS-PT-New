import express from 'express';
import { SocialPost, SocialComment, SocialLike, Friendship } from '../../models/social/index.mjs';
import EnhancedSocialPost from '../../models/social/enhanced/EnhancedSocialPost.mjs';
import { getUser } from '../../models/index.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { gamificationEngine } from '../../services/gamification/GamificationEngine.mjs';
import GamificationPointsService from '../../services/gamification/GamificationPointsService.mjs';
import { checkBadgesForGamificationEvent } from '../../services/badgeGamificationBridge.mjs';
import { uploadPhoto, deletePhoto } from '../../services/photoStorageService.mjs';
import { cleanupSocialPostDeletionSideEffects } from '../../services/social/socialPostDeletionCleanupService.mjs';
import { getIO } from '../../socket/socketManager.mjs';
import { getSocialPointsFailure, sendSocialRouteError } from './socialRouteResponse.helpers.mjs';
import { attachWorkoutDataToPost, sanitizeWorkoutPostData } from './socialWorkoutData.mjs';
import { buildFeedVisibilityWhere, normalizePostType } from './feedPolicy.mjs';
import { assertGroupPostAccess, canPostInGroup, canViewGroupContent, getGroupWithMembership } from '../../services/social/groupAccessService.mjs';

const router = express.Router();

/**
 * SWA-129 (Kimi call 6): interaction access = the group gate (for group posts)
 * PLUS non-group visibility. assertGroupPostAccess returns ok:true for ANY
 * non-group post regardless of visibility, so the like/unreact/comment/report
 * handlers previously let a stranger interact with a `private` or `friends`-only
 * post by enumerating postId (privacy breach over minors' posts + existence
 * oracle + harassment/point-farm). This mirrors the single-post GET visibility
 * gate: private → owner only; friends → owner or an accepted friendship.
 */
async function assertPostInteractionAccess(post, user) {
  const groupGate = await assertGroupPostAccess(post, user);
  if (!groupGate.ok) return groupGate;
  if (post?.groupId) return { ok: true }; // group visibility already decided above
  const denied = { ok: false, status: 403, message: 'You do not have permission to interact with this post' };
  if (post?.visibility === 'private' && post.userId !== user?.id) return denied;
  if (post?.visibility === 'friends' && post.userId !== user?.id) {
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { requesterId: user?.id, recipientId: post.userId, status: 'accepted' },
          { requesterId: post.userId, recipientId: user?.id, status: 'accepted' },
        ],
      },
    });
    if (!friendship) return denied;
  }
  return { ok: true };
}

// Apply auth middleware to all routes
router.use(protect);

function isLegacySocialTableMissingError(error) {
  const message = String(error?.message || '');
  const isMissingRelation = error?.original?.code === '42P01' || /relation .* does not exist/i.test(message);
  if (!isMissingRelation) return false;
  return /SocialPosts|Friendships|SocialComments|SocialLikes/i.test(message);
}

async function getEnhancedFallbackFeed(userId, limit, offset) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 20;
  const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;

  const where = {
    status: 'published',
    moderationStatus: 'approved',
    [Op.or]: [
      { visibility: 'public' },
      { userId: String(userId) }
    ]
  };

  const [posts, total] = await Promise.all([
    EnhancedSocialPost.findAll({
      where,
      limit: safeLimit,
      offset: safeOffset,
      order: [['publishedAt', 'DESC'], ['createdAt', 'DESC']],
      raw: true
    }),
    EnhancedSocialPost.count({ where })
  ]);

  const numericUserIds = [...new Set(posts
    .map((post) => post.userId)
    .filter((id) => /^\d+$/.test(String(id)))
    .map((id) => Number(id)))];

  const users = numericUserIds.length > 0
    ? await getUser().findAll({
      where: { id: { [Op.in]: numericUserIds } },
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points'],
      raw: true
    })
    : [];

  const userMap = new Map(users.map((user) => [String(user.id), user]));

  const formattedPosts = posts.map((post) => {
    const mediaItems = Array.isArray(post.mediaItems) ? post.mediaItems : [];
    const firstMedia = mediaItems[0];

    return attachWorkoutDataToPost({
      id: post.id,
      userId: post.userId,
      content: post.content,
      type: post.contentType || 'general',
      visibility: post.visibility || 'public',
      mediaUrl: firstMedia?.url || null,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      isLiked: false,
      createdAt: post.publishedAt || post.createdAt,
      updatedAt: post.updatedAt,
      user: userMap.get(String(post.userId)) || null
    });
  });

  return {
    success: true,
    posts: formattedPosts,
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      total
    },
    fallback: 'enhanced_social_posts'
  };
}

// Social gamification point rules
const SOCIAL_POINT_RULES = {
  post_create_general: 10,
  post_create_workout: 25,
  post_create_transformation: 50,
  post_create_achievement: 30,
  // 2.5: milestone shares (progress-proof/chart moments) earn like achievements.
  post_create_milestone: 30,
  post_create_challenge: 20,
  post_create_creative: 20,
  post_create_dance: 20,
  post_create_music: 20,
  post_create_singing: 20,
  post_create_art: 20,
  post_create_gaming: 15,
  post_create_comedy: 15,
  post_like_received: 2,
  post_like_given: 1,
  comment_created: 5,
  comment_received: 3
};

export function buildSocialPointKey(userId, action, metadata = {}) {
  const parts = ['social', action, `user:${userId}`];
  // NOTE: reactionType is deliberately NOT part of the point idempotency key. Reactions
  // allow 3 types (swan/heart/thumbs_up) and each is a distinct SocialLike row, but the
  // point rules are flat per relationship (post_like_given:1, post_like_received:2). When
  // reactionType was in the key, one user cycling all three reactions on a post minted the
  // award THREE times — 3 pts to the reactor and 6 to the post owner, and removeReaction
  // never clawed it back — a repeatable, permanent leaderboard/balance farm. Keying per
  // (user, action, post) makes the same user earn exactly once per post.
  for (const key of ['postId', 'commentId', 'likedByUserId', 'commentedByUserId']) {
    if (metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '') {
      parts.push(`${key}:${metadata[key]}`);
    }
  }
  return parts.join(':');
}

/**
 * Award points for social actions with proper tracking
 * @param {string} userId - The user ID to award points to
 * @param {string} action - The social action performed
 * @param {Object} metadata - Additional context for the action
 * @returns {Object} Point award result
 */
async function awardSocialPoints(userId, action, metadata = {}) {
  try {
    const pointsToAward = SOCIAL_POINT_RULES[action];
    
    if (!pointsToAward) {
      console.log(`No points defined for social action: ${action}`);
      return { pointsAwarded: 0, success: false };
    }

    const result = await GamificationPointsService.recordLedgerEntry({
      userId,
      points: pointsToAward,
      transactionType: 'earn',
      source: 'social_engagement',
      sourceId: null,
      description: `Social Action: ${action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      metadata: {
        socialAction: action,
        ...metadata
      },
      awardedBy: userId,
      idempotencyKey: buildSocialPointKey(userId, action, metadata)
    });

    if (result.duplicate) {
      console.log(`[social-points] Duplicate point award skipped for user ${userId} and ${action}`);
      return { pointsAwarded: 0, newBalance: result.newBalance, success: true, duplicate: true, action };
    }

    const badgesEarned = await checkBadgesForGamificationEvent({
      userId,
      type: 'social_action',
      activityData: {
        socialAction: action,
        action,
        count: 1,
        ...metadata
      },
      logger: console
    });

    console.log(`[social-points] Awarded ${pointsToAward} points to user ${userId} for ${action}`);
    
    return {
      pointsAwarded: result.pointsAwarded,
      newBalance: result.newBalance,
      badgesEarned,
      success: true,
      action
    };
  } catch (error) {
    console.error(`[social-points] Error awarding social points for ${action}:`, error);
    return getSocialPointsFailure();
  }
}

/**
 * Award points to a user who receives engagement (likes/comments) on their posts
 * @param {string} postOwnerId - The user who owns the post
 * @param {string} action - The type of engagement received
 * @param {Object} metadata - Additional context
 */
async function awardEngagementReceivedPoints(postOwnerId, action, metadata = {}) {
  try {
    const result = await awardSocialPoints(postOwnerId, action, metadata);
    if (result.success) {
      console.log(`[social-points] Post owner ${postOwnerId} earned ${result.pointsAwarded} points for receiving ${action}`);
    }
    return result;
  } catch (error) {
    console.error('Error awarding engagement received points:', error);
    return { pointsAwarded: 0, success: false };
  }
}

// Set up multer with memory storage for R2 uploads (no local disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (supports video)
  },
  fileFilter: function(req, file, cb) {
    const imageTypes = /jpeg|jpg|png|gif|webp/;
    const videoTypes = /mp4|mov|webm|avi/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isImage = imageTypes.test(file.mimetype) || imageTypes.test(ext);
    const isVideo = videoTypes.test(file.mimetype) || videoTypes.test(ext) || file.mimetype.startsWith('video/');

    if (isImage || isVideo) {
      return cb(null, true);
    }
    cb(new Error('Only image and video files are allowed'));
  }
});

/**
 * Get social feed for current user
 */
router.get('/feed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const hashtagFilter = req.query.hashtag; // Filter by hashtag slug
    const categoryFilter = req.query.category; // Filter by broad category

    // If filtering by hashtag, get matching post IDs first
    let hashtagPostIds = null;
    if (hashtagFilter) {
      try {
        const Hashtag = (await import('../../models/social/Hashtag.mjs')).default;
        const PostHashtag = (await import('../../models/social/PostHashtag.mjs')).default;
        const tag = await Hashtag.findOne({ where: { slug: hashtagFilter.toLowerCase(), isBanned: false } });
        if (tag) {
          const joins = await PostHashtag.findAll({
            where: { hashtagId: tag.id },
            attributes: ['postId']
          });
          hashtagPostIds = joins.map(j => j.postId);
        } else {
          hashtagPostIds = [];
        }
      } catch (e) {
        console.warn('Hashtag filter failed (non-fatal):', e.message);
      }
    }

    // If filtering by category, get matching post IDs from hashtags in that category
    let categoryPostIds = null;
    if (categoryFilter && ['fitness', 'creative', 'community'].includes(categoryFilter)) {
      try {
        const Hashtag = (await import('../../models/social/Hashtag.mjs')).default;
        const PostHashtag = (await import('../../models/social/PostHashtag.mjs')).default;
        const tags = await Hashtag.findAll({
          where: { category: categoryFilter, isBanned: false },
          attributes: ['id']
        });
        if (tags.length > 0) {
          const joins = await PostHashtag.findAll({
            where: { hashtagId: { [Op.in]: tags.map(t => t.id) } },
            attributes: ['postId'],
            group: ['postId']
          });
          categoryPostIds = joins.map(j => j.postId);
        } else {
          categoryPostIds = [];
        }
      } catch (e) {
        console.warn('Category filter failed (non-fatal):', e.message);
      }
    }

    // Get the current user's friends
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, status: 'accepted' },
          { recipientId: req.user.id, status: 'accepted' }
        ]
      }
    });
    
    // Extract friend IDs
    const friendIds = friendships.map(f => 
      f.requesterId === req.user.id ? f.recipientId : f.requesterId
    );
    
    
    // Build where clause with optional hashtag/category filters.
    // Visibility policy (trust fix 2026-07-06): own posts at ANY visibility,
    // friends' posts only public/friends, strangers only public — friends'
    // PRIVATE posts must never leak into the feed (see feedPolicy.mjs).
    const feedWhere = {
      [Op.and]: [
        buildFeedVisibilityWhere(req.user.id, friendIds),
        { moderationStatus: { [Op.or]: ['approved', null] } },
        // Group posts live in their group's own feed, never the main feed.
        { groupId: null }
      ]
    };

    // Narrow by hashtag if filter provided
    if (hashtagPostIds !== null) {
      if (hashtagPostIds.length === 0) {
        return res.status(200).json({ success: true, posts: [], pagination: { limit, offset, total: 0 } });
      }
      feedWhere[Op.and].push({ id: { [Op.in]: hashtagPostIds } });
    }

    // Narrow by category if filter provided
    if (categoryPostIds !== null) {
      if (categoryPostIds.length === 0) {
        return res.status(200).json({ success: true, posts: [], pagination: { limit, offset, total: 0 } });
      }
      feedWhere[Op.and].push({ id: { [Op.in]: categoryPostIds } });
    }

    const posts = await SocialPost.findAll({
      where: feedWhere,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
        }
      ]
    });
    
    // Get post IDs for batch fetching of comments and likes
    const postIds = posts.map(post => post.id);
    
    // Batch fetch comments count
    const commentsCount = await SocialComment.findAll({
      attributes: [
        'postId', 
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { postId: { [Op.in]: postIds } },
      group: ['postId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const commentCountMap = {};
    commentsCount.forEach(item => {
      commentCountMap[item.postId] = parseInt(item.count);
    });
    
    // Get reaction counts and user reactions per post
    let reactionCountsMap = {};
    let userReactionsMap = {};
    try {
      reactionCountsMap = await SocialLike.getReactionCounts(postIds);
      userReactionsMap = await SocialLike.getUserReactions(req.user.id, postIds);
    } catch (err) {
      // Fallback: old-style like check if reaction methods unavailable
      console.log('Reaction methods not available, falling back to legacy:', err.message);
    }

    // Legacy fallback: check if user has liked each post
    const userLikes = await SocialLike.findAll({
      where: {
        userId: req.user.id,
        targetType: 'post',
        targetId: { [Op.in]: postIds }
      },
      attributes: ['targetId']
    });
    const likedPostIds = new Set(userLikes.map(like => like.targetId));

    // Format posts with comment counts, reaction status
    const formattedPosts = posts.map(post => {
      const postObj = post.toJSON();

      // Add comment count
      postObj.commentsCount = commentCountMap[post.id] || 0;

      // Legacy compat
      postObj.isLiked = likedPostIds.has(post.id);

      // Reaction breakdown
      postObj.reactionCounts = reactionCountsMap[post.id] || { thumbs_up: 0, heart: 0, swan: 0 };
      postObj.userReactions = userReactionsMap[post.id] || [];

      return attachWorkoutDataToPost(postObj);
    });

    return res.status(200).json({
      success: true,
      posts: formattedPosts,
      pagination: {
        limit,
        offset,
        total: await SocialPost.count({ where: feedWhere })
      }
    });
  } catch (error) {
    if (isLegacySocialTableMissingError(error)) {
      try {
        const fallback = await getEnhancedFallbackFeed(req.user.id, parseInt(req.query.limit), parseInt(req.query.offset));
        return res.status(200).json(fallback);
      } catch (fallbackError) {
        console.error('Enhanced social fallback failed:', fallbackError);
      }
    }

    console.error('Error fetching social feed:', error);
    return sendSocialRouteError(res, 500, 'Failed to fetch social feed');
  }
});

/**
 * Get trending/popular posts (sorted by engagement)
 * Used by Social Explore tab
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const timeframe = req.query.timeframe || '7d'; // 7d, 30d, all

    // Calculate date cutoff
    let dateCutoff = null;
    if (timeframe === '7d') dateCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    else if (timeframe === '30d') dateCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Try legacy SocialPost table first
    try {
      const where = { visibility: 'public', groupId: null };
      if (dateCutoff) where.createdAt = { [Op.gte]: dateCutoff };

      const posts = await SocialPost.findAndCountAll({
        where,
        order: [
          [sequelize.literal('"likesCount" + "commentsCount"'), 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit,
        offset,
      });

      const userIds = [...new Set(posts.rows.map(p => p.userId))].filter(Boolean);
      const User = getUser();
      const users = userIds.length > 0
        ? await User.findAll({
            where: { id: { [Op.in]: userIds } },
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role'],
            raw: true,
          })
        : [];
      const userMap = new Map(users.map(u => [u.id, u]));

      // Check if current user liked each post
      const postIds = posts.rows.map(p => p.id);
      const userLikes = postIds.length > 0
        ? await SocialLike.findAll({
            where: { postId: { [Op.in]: postIds }, userId: req.user.id },
            attributes: ['postId'],
            raw: true,
          })
        : [];
      const likedSet = new Set(userLikes.map(l => l.postId));

      return res.json({
        success: true,
        posts: posts.rows.map(p => attachWorkoutDataToPost({
          ...p.toJSON(),
          user: userMap.get(p.userId) || null,
          isLiked: likedSet.has(p.id),
        })),
        pagination: { total: posts.count, limit, offset },
      });
    } catch (err) {
      if (!isLegacySocialTableMissingError(err)) throw err;

      // Fallback to EnhancedSocialPost
      const where = {
        status: 'published',
        moderationStatus: 'approved',
        visibility: 'public',
      };
      if (dateCutoff) where.createdAt = { [Op.gte]: dateCutoff };

      const posts = await EnhancedSocialPost.findAll({
        where,
        order: [
          [sequelize.literal('"likesCount" + "commentsCount"'), 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit,
        offset,
        raw: true,
      });
      const total = await EnhancedSocialPost.count({ where });

      const userIds = [...new Set(posts.map(p => p.userId).filter(id => /^\d+$/.test(String(id))))].map(Number);
      const User = getUser();
      const users = userIds.length > 0
        ? await User.findAll({
            where: { id: { [Op.in]: userIds } },
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role'],
            raw: true,
          })
        : [];
      const userMap = new Map(users.map(u => [String(u.id), u]));

      return res.json({
        success: true,
        posts: posts.map(p => attachWorkoutDataToPost({
          id: p.id,
          userId: p.userId,
          content: p.content,
          type: p.contentType || 'general',
          visibility: p.visibility || 'public',
          mediaUrl: Array.isArray(p.mediaItems) && p.mediaItems[0]?.url || null,
          likesCount: p.likesCount || 0,
          commentsCount: p.commentsCount || 0,
          isLiked: false,
          createdAt: p.publishedAt || p.createdAt,
          updatedAt: p.updatedAt,
          user: userMap.get(String(p.userId)) || null,
        })),
        pagination: { total, limit, offset },
        fallback: 'enhanced_social_posts',
      });
    }
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    return sendSocialRouteError(res, 500, 'Failed to fetch trending posts');
  }
});

/**
 * Get user's posts
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // Check if user exists
    const user = await getUser().findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check friendship status
    let friendship = null;
    let isFriend = false;
    
    if (userId !== req.user.id) {
      friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { requesterId: req.user.id, recipientId: userId },
            { requesterId: userId, recipientId: req.user.id }
          ]
        }
      });
      
      isFriend = friendship && friendship.status === 'accepted';
    } else {
      // If looking at own profile, can see all posts
      isFriend = true;
    }
    
    // Determine which posts to show based on friendship status.
    // Group posts stay inside their group's feed — never on the profile wall.
    const whereClause = { userId, groupId: null };

    if (!isFriend) {
      // If not friends, only show public posts
      whereClause.visibility = 'public';
    }
    
    // Get posts
    const posts = await SocialPost.findAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
        }
      ]
    });
    
    // Get post IDs for batch fetching of comments and likes
    const postIds = posts.map(post => post.id);
    
    // Batch fetch comments count
    const commentsCount = await SocialComment.findAll({
      attributes: [
        'postId', 
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { postId: { [Op.in]: postIds } },
      group: ['postId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const commentCountMap = {};
    commentsCount.forEach(item => {
      commentCountMap[item.postId] = parseInt(item.count);
    });
    
    // Get reaction counts and user reactions per post
    let reactionCountsMap2 = {};
    let userReactionsMap2 = {};
    try {
      reactionCountsMap2 = await SocialLike.getReactionCounts(postIds);
      userReactionsMap2 = await SocialLike.getUserReactions(req.user.id, postIds);
    } catch (err) {
      console.log('Reaction methods fallback:', err.message);
    }

    const userLikes = await SocialLike.findAll({
      where: {
        userId: req.user.id,
        targetType: 'post',
        targetId: { [Op.in]: postIds }
      },
      attributes: ['targetId']
    });
    const likedPostIds = new Set(userLikes.map(like => like.targetId));

    // Format posts with comment counts and reaction status
    const formattedPosts = posts.map(post => {
      const postObj = post.toJSON();

      postObj.commentsCount = commentCountMap[post.id] || 0;
      postObj.isLiked = likedPostIds.has(post.id);
      postObj.reactionCounts = reactionCountsMap2[post.id] || { thumbs_up: 0, heart: 0, swan: 0 };
      postObj.userReactions = userReactionsMap2[post.id] || [];
      
      return attachWorkoutDataToPost(postObj);
    });
    
    return res.status(200).json({
      success: true,
      user,
      isFriend,
      posts: formattedPosts,
      pagination: {
        limit,
        offset,
        total: await SocialPost.count({ where: whereClause })
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return sendSocialRouteError(res, 500, 'Failed to fetch user posts');
  }
});

/**
 * Create a new post
 */
router.post('/', upload.single('media'), async (req, res) => {
  try {
    const { content, type = 'general' } = req.body;
    // Admin/trainer posts default to public so all users see them; regular users default to friends
    const isStaff = req.user.role === 'admin' || req.user.role === 'trainer';
    const visibility = req.body.visibility || (isStaff ? 'public' : 'friends');
    
    // Validate required fields
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Post content is required'
      });
    }

    // Group-scoped post? Validate membership BEFORE any write or upload.
    let groupPost = null;
    const groupIdRaw = req.body.groupId;
    if (groupIdRaw !== undefined && groupIdRaw !== null && String(groupIdRaw).trim() !== '') {
      const groupId = Number(groupIdRaw);
      if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: 'Valid group id required' });
      }
      const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
      if (!group || group.isArchived) {
        return res.status(404).json({ success: false, message: 'Group not found' });
      }
      if (!canPostInGroup(group, membership)) {
        return res.status(403).json({ success: false, message: 'Join this group to post in it' });
      }
      groupPost = group;
    }

    // Create post data. Type is normalized against the model enum — unknown
    // or composer-alias types (e.g. 'transformation') used to reach the ENUM
    // raw and 500 the live Home composer.
    const postData = {
      userId: req.user.id,
      content,
      type: normalizePostType(type, SocialPost.rawAttributes.type.values),
      visibility
    };

    // Group posts are scoped by the group's own privacy gates, not by the
    // author's friend graph — store them 'public' within that boundary.
    if (groupPost) {
      postData.groupId = groupPost.id;
      postData.visibility = 'public';
    }

    // Upload media to R2 BEFORE transaction (external service, not rollback-safe)
    let uploadedMediaKey = null;
    if (req.file) {
      try {
        const isVideo = req.file.mimetype.startsWith('video/');
        const result = await uploadPhoto(req.file.buffer, {
          userId: req.user.id,
          category: isVideo ? 'social-videos' : 'social-photos',
          originalFilename: req.file.originalname,
          contentType: req.file.mimetype,
        });
        postData.mediaUrl = result.url;
        postData.mediaType = isVideo ? 'video' : 'image';
        // Extract R2 key for cleanup on rollback
        try {
          const urlParts = new URL(result.url);
          uploadedMediaKey = urlParts.pathname.substring(1);
        } catch { uploadedMediaKey = result.url; }
      } catch (uploadErr) {
        console.error('R2 upload failed for social post:', uploadErr.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload media file',
        });
      }
    }

    // Add reference IDs if specified
    if (req.body.workoutSessionId) postData.workoutSessionId = req.body.workoutSessionId;
    if (req.body.achievementId) postData.achievementId = req.body.achievementId;
    if (req.body.userAchievementId) postData.userAchievementId = req.body.userAchievementId;
    if (req.body.challengeId) postData.challengeId = req.body.challengeId;

    const sanitizedWorkoutData = sanitizeWorkoutPostData(req.body.workoutData);
    if (sanitizedWorkoutData) {
      postData.metadata = {
        ...(postData.metadata || {}),
        workoutData: sanitizedWorkoutData
      };
    }

    // ── Transaction: post creation only ──
    // Hashtag linking deliberately runs AFTER commit (see below). 2026-06-11
    // incident: when the hashtag tables were missing in production, the failed
    // hashtag query POISONED this shared transaction; the inner catch swallowed
    // the error as "non-fatal", and Postgres silently turned the later COMMIT
    // into a ROLLBACK — every hashtagged post vanished while the API returned
    // 201 with post:null. A post must never die for its decoration.
    const transaction = await sequelize.transaction();
    let post = null;
    let linkedHashtags = [];

    try {
      post = await SocialPost.create(postData, { transaction });
      await transaction.commit();
    } catch (txError) {
      await transaction.rollback();

      // Clean up orphaned R2 media on transaction failure
      if (uploadedMediaKey) {
        try {
          await deletePhoto(uploadedMediaKey);
          console.log(`Cleaned up orphaned R2 media: ${uploadedMediaKey}`);
        } catch (cleanupErr) {
          console.error('CRITICAL: Failed to cleanup orphaned R2 file:', uploadedMediaKey, cleanupErr.message);
        }
      }

      throw txError;
    }

    // Hashtag linking AFTER commit — best-effort, own auto-commit queries.
    // A hashtag failure costs the tags, never the post.
    try {
      const { extractHashtags, processHashtags } = await import('./hashtags.mjs');
      const tagNames = extractHashtags(content);
      if (tagNames.length > 0) {
        linkedHashtags = await processHashtags(post.id, tagNames);
      }
    } catch (hashtagErr) {
      console.warn('Hashtag processing failed (non-fatal):', hashtagErr.message);
    }

    // Group activity pulse — best-effort, post already committed.
    if (groupPost) {
      try { await groupPost.update({ lastActivityAt: new Date() }); } catch { /* non-fatal */ }
    }

    // Award points AFTER commit (non-transactional, fire-and-forget safe).
    // Use the NORMALIZED, stored type — not the raw request `type`. The raw
    // value let 'transformation' (stored as 'milestone') mint post_create_
    // transformation=50pts per post; the point action must match what was saved.
    const storedType = post.type;
    const pointAction = `post_create_${storedType}`;
    const pointResult = await awardSocialPoints(req.user.id, pointAction, {
      postId: post.id,
      postType: storedType,
      hasMedia: !!req.file,
      visibility,
      hashtags: linkedHashtags.map(h => h.name)
    });

    // Fetch the full post with user data
    const fullPost = await SocialPost.findByPk(post.id, {
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
        }
      ]
    });

    // Honest-receipt guard: never report success for a post we cannot read
    // back. (The 2026-06-11 silent-rollback bug shipped 201 + post:null.)
    if (!fullPost) {
      console.error(`Post creation verification failed: post ${post.id} not readable after commit`);
      return sendSocialRouteError(res, 500, 'Failed to create post');
    }

    // Build response with optional points data
    const responseData = {
      success: true,
      message: 'Post created successfully',
      post: attachWorkoutDataToPost(fullPost.toJSON()),
      hashtags: linkedHashtags.map(h => ({ id: h.id, name: h.name, slug: h.slug }))
    };

    if (pointResult.success) {
      responseData.pointsAwarded = pointResult.pointsAwarded;
      responseData.newBalance = pointResult.newBalance;
      responseData.pointMessage = `You earned ${pointResult.pointsAwarded} points for creating a ${type} post!`;
    }

    // Broadcast to all connected clients for live activity ticker.
    // Only PUBLIC, non-group posts may be broadcast globally — the preview would
    // otherwise leak private/friends-only or private-group content (author name +
    // 80-char preview) to every connected socket, including unauthenticated ones.
    if (!groupPost && visibility === 'public') {
      try {
        const io = getIO();
        if (io) {
          io.emit('social:activity', {
            type: 'post_created',
            userId: req.user.id,
            userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            userPhoto: req.user.photo,
            postType: type,
            postId: fullPost.id,
            preview: content.substring(0, 80),
            timestamp: new Date().toISOString(),
          });
        }
      } catch (socketErr) {
        // Non-fatal: don't fail the response if socket broadcast fails
        console.warn('Socket broadcast failed:', socketErr.message);
      }
    }

    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating post:', error);

    return sendSocialRouteError(res, 500, 'Failed to create post');
  }
});

/**
 * Get a single post with comments
 */
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Find the post
    const post = await SocialPost.findByPk(postId, {
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Group posts are gated by their group's privacy, not the friend graph.
    if (post.groupId) {
      const { group, membership } = await getGroupWithMembership(post.groupId, req.user.id);
      if (!group || !canViewGroupContent(group, membership, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Join this group to view this post'
        });
      }
    }

    // Check if current user can view this post
    if (post.visibility === 'private' && post.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this post'
      });
    }
    
    if (post.visibility === 'friends' && post.userId !== req.user.id) {
      // Check if the current user is friends with the post owner
      const friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { requesterId: req.user.id, recipientId: post.userId, status: 'accepted' },
            { requesterId: post.userId, recipientId: req.user.id, status: 'accepted' }
          ]
        }
      });
      
      if (!friendship) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this post'
        });
      }
    }
    
    // Get comments for the post. BOUNDED: SocialComment grows without limit with
    // engagement, and this handler loaded EVERY row (+ a User join each) into one response.
    // A user could comment-bomb a post to force a linear heap/latency blow-up on every
    // subsequent view. Cap to the most recent N (house style: min(query, 100), default 50),
    // matching the bounded feed/list queries elsewhere in this file.
    const commentLimit = Math.min(parseInt(req.query.commentLimit, 10) || 50, 100);
    const comments = await SocialComment.findAll({
      where: { postId },
      order: [['createdAt', 'DESC']],
      limit: commentLimit,
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
        }
      ]
    });
    // Present oldest-first (the prior contract) within the bounded, most-recent window.
    comments.reverse();
    
    // Check if user has liked this post
    const userLike = await SocialLike.findOne({
      where: {
        userId: req.user.id,
        targetType: 'post',
        targetId: postId
      }
    });
    
    // Format response
    const postData = attachWorkoutDataToPost(post.toJSON());
    postData.comments = comments;
    postData.isLiked = !!userLike;
    
    return res.status(200).json({
      success: true,
      post: postData
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return sendSocialRouteError(res, 500, 'Failed to fetch post');
  }
});

/**
 * Update a post
 */
router.put('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, visibility } = req.body;
    
    // Find the post
    const post = await SocialPost.findByPk(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user is the owner of the post
    if (post.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this post'
      });
    }

    // 24-hour edit window — posts older than 24h cannot be edited (admin exempt)
    const postAgeMs = Date.now() - new Date(post.createdAt).getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (postAgeMs > TWENTY_FOUR_HOURS && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Posts can only be edited within 24 hours of creation'
      });
    }

    // Update fields
    if (content) post.content = content;
    if (visibility) post.visibility = visibility;
    post.isEdited = true;
    
    await post.save();
    
    // Fetch the updated post with user data
    const updatedPost = await SocialPost.findByPk(post.id, {
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return sendSocialRouteError(res, 500, 'Failed to update post');
  }
});

/**
 * Delete a post
 */
router.delete('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Find the post
    const post = await SocialPost.findByPk(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user is the owner of the post
    if (post.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this post'
      });
    }
    
    await cleanupSocialPostDeletionSideEffects(post);

    // Delete the post (and its associated comments due to CASCADE)
    await post.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return sendSocialRouteError(res, 500, 'Failed to delete post');
  }
});

/**
 * Report a post
 */
router.post('/:postId/report', async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason, description } = req.body;

    const VALID_REASONS = [
      'inappropriate-content', 'harassment', 'spam', 'misinformation',
      'hate-speech', 'violence', 'self-harm', 'impersonation',
      'copyright', 'other',
    ];

    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
      });
    }

    const post = await SocialPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Non-members can't report (or oracle the existence of) private group posts.
    const reportGate = await assertPostInteractionAccess(post, req.user);
    if (!reportGate.ok) return res.status(reportGate.status).json({ success: false, message: reportGate.message });

    // Cannot report your own post
    if (post.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot report your own post' });
    }

    // Check if PostReports table exists before inserting
    const [check] = await sequelize.query(
      `SELECT to_regclass('public."PostReports"') AS exists`
    );
    if (check?.[0]?.exists) {
      // Check for duplicate report from same user on same post
      const [existing] = await sequelize.query(
        `SELECT id FROM "PostReports" WHERE "reporterId" = :uid AND "contentType" = 'post' AND "contentId" = :pid AND "status" != 'dismissed' LIMIT 1`,
        { replacements: { uid: req.user.id, pid: postId } }
      );
      if (existing && existing.length > 0) {
        return res.status(409).json({ success: false, message: 'You have already reported this post' });
      }

      await sequelize.query(
        `INSERT INTO "PostReports" ("reporterId", "contentType", "contentId", "contentAuthorId", "reason", "description", "status", "createdAt", "updatedAt")
         VALUES (:reporterId, 'post', :contentId, :authorId, :reason, :description, 'pending', NOW(), NOW())`,
        {
          replacements: {
            reporterId: req.user.id,
            contentId: postId,
            authorId: post.userId,
            reason,
            description: description || null,
          },
        }
      );
    }

    return res.status(201).json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Error reporting post:', error);
    return sendSocialRouteError(res, 500, 'Failed to submit report');
  }
});

/**
 * Repost/share a post — creates a new post referencing the original
 */
router.post('/:postId/repost', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });

    const original = await SocialPost.findByPk(req.params.postId);
    if (!original) return res.status(404).json({ error: 'Post not found' });

    // Group posts stay inside their group boundary — reposting would copy the
    // content into a public, group-less post (private-content exfiltration).
    if (original.groupId) {
      return res.status(400).json({ error: 'Group posts cannot be reposted outside the group' });
    }

    // Don't repost your own post
    if (original.userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot repost your own post' });
    }

    // Don't repost a repost — repost the original
    const sourceId = original.isRepost && original.originalPostId
      ? original.originalPostId
      : original.id;

    // Defense-in-depth: if the resolved source is itself a group post (e.g. a
    // legacy repost row created before the group guard), block it too so the
    // group boundary can't be laundered through the repost chain.
    if (sourceId !== original.id) {
      const source = await SocialPost.findByPk(sourceId, { attributes: ['id', 'groupId'] });
      if (source?.groupId) {
        return res.status(400).json({ error: 'Group posts cannot be reposted outside the group' });
      }
    }

    // Check if already reposted
    const existing = await SocialPost.findOne({
      where: { userId: req.user.id, originalPostId: sourceId, isRepost: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'Already reposted' });
    }

    const commentary = (req.body.content || '').trim();
    const repost = await SocialPost.create({
      userId: req.user.id,
      content: commentary || original.content,
      type: original.type,
      visibility: 'public',
      isRepost: true,
      originalPostId: sourceId,
    });

    // Increment repost count on original
    await SocialPost.increment('repostCount', { where: { id: sourceId } });

    // Broadcast repost activity
    try {
      const io = getIO();
      io.emit('social:activity', {
        type: 'repost',
        userId: req.user.id,
        postId: repost.id,
        originalPostId: sourceId,
        timestamp: new Date().toISOString(),
      });
    } catch { /* best-effort websocket broadcast */ }

    res.status(201).json({ repost, originalPostId: sourceId });
  } catch (err) {
    console.error('[Social] POST /:postId/repost error:', err.message);
    res.status(500).json({ error: 'Failed to repost' });
  }
});

/**
 * React to a post (thumbs_up, heart, or swan)
 */
router.post('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const reactionType = req.body.reactionType || 'swan';

    // Validate reaction type
    if (!['thumbs_up', 'heart', 'swan'].includes(reactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reaction type. Must be thumbs_up, heart, or swan.'
      });
    }

    const post = await SocialPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Non-members must not react to (or point-farm on) private group posts.
    const reactGate = await assertPostInteractionAccess(post, req.user);
    if (!reactGate.ok) return res.status(reactGate.status).json({ success: false, message: reactGate.message });

    // Use reactToPost which handles dedup
    const { reaction, alreadyExists } = await SocialLike.reactToPost(req.user.id, postId, reactionType);

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: `You already reacted with ${reactionType}`
      });
    }

    // Award points
    const likeGivenResult = await awardSocialPoints(req.user.id, 'post_like_given', {
      postId,
      postOwnerId: post.userId,
      reactionType
    });

    let likeReceivedResult = { success: false };
    if (post.userId !== req.user.id) {
      likeReceivedResult = await awardEngagementReceivedPoints(post.userId, 'post_like_received', {
        postId,
        likedByUserId: req.user.id,
        reactionType
      });
    }

    const responseData = {
      success: true,
      message: `Reacted with ${reactionType}`,
      reactionType,
    };

    if (likeGivenResult.success) {
      responseData.pointsAwarded = likeGivenResult.pointsAwarded;
      responseData.pointMessage = `+${likeGivenResult.pointsAwarded} points for reacting!`;
    }
    if (likeReceivedResult.success) {
      responseData.ownerPointsAwarded = likeReceivedResult.pointsAwarded;
    }

    // Broadcast reaction to live activity ticker — only for PUBLIC, non-group posts.
    // Reacting to a private/friends post must not reveal that activity (or the
    // reactor's name) to every connected socket.
    if (!post.groupId && post.visibility === 'public') {
      try {
        const io = getIO();
        if (io) {
          io.emit('social:activity', {
            type: 'reaction_added',
            userId: req.user.id,
            userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            postId: parseInt(postId),
            reactionType,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (socketErr) { console.warn('Socket broadcast failed:', socketErr.message); }
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error reacting to post:', error);
    return sendSocialRouteError(res, 500, 'Failed to react to post');
  }
});

/**
 * Remove a reaction from a post
 */
router.delete('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const reactionType = req.query.reactionType || req.body?.reactionType || 'swan';

    const post = await SocialPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const unreactGate = await assertPostInteractionAccess(post, req.user);
    if (!unreactGate.ok) return res.status(unreactGate.status).json({ success: false, message: unreactGate.message });

    const result = await SocialLike.removeReaction(req.user.id, postId, reactionType);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: `No ${reactionType} reaction to remove`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Removed ${reactionType} reaction`
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return sendSocialRouteError(res, 500, 'Failed to remove reaction');
  }
});

/**
 * Add a comment to a post
 */
router.post('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    
    // Validate content
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }
    
    // Find the post
    const post = await SocialPost.findByPk(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Non-members must not comment into a private group's feed.
    const commentGate = await assertPostInteractionAccess(post, req.user);
    if (!commentGate.ok) return res.status(commentGate.status).json({ success: false, message: commentGate.message });

    // Create the comment
    const comment = await SocialComment.create({
      postId,
      userId: req.user.id,
      content,
      parentCommentId: req.body.parentCommentId || null
    });
    
    // Update post's comment count
    post.commentsCount += 1;
    await post.save();
    
    // Award points to the user who created the comment
    const commentCreatedResult = await awardSocialPoints(req.user.id, 'comment_created', {
      postId,
      commentId: comment.id,
      postOwnerId: post.userId
    });
    
    // Award points to the post owner for receiving a comment (but not if they commented on their own post)
    let commentReceivedResult = { success: false };
    if (post.userId !== req.user.id) {
      commentReceivedResult = await awardEngagementReceivedPoints(post.userId, 'comment_received', {
        postId,
        commentId: comment.id,
        commentedByUserId: req.user.id
      });
    }
    
    // Return the comment with user data
    const fullComment = await SocialComment.findByPk(comment.id, {
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role', 'clientSource', 'level', 'tier', 'points']
        }
      ]
    });
    
    const responseData = {
      success: true,
      message: 'Comment added successfully',
      comment: fullComment
    };
    
    // Add point information if points were awarded
    if (commentCreatedResult.success) {
      responseData.pointsAwarded = commentCreatedResult.pointsAwarded;
      responseData.pointMessage = `+${commentCreatedResult.pointsAwarded} points for commenting!`;
    }
    
    if (commentReceivedResult.success) {
      responseData.ownerPointsAwarded = commentReceivedResult.pointsAwarded;
    }
    
    // Broadcast comment to live activity ticker — only for PUBLIC, non-group posts.
    // A comment preview on a private/friends post must not leak to every socket.
    if (!post.groupId && post.visibility === 'public') {
      try {
        const io = getIO();
        if (io) {
          io.emit('social:activity', {
            type: 'comment_added',
            userId: req.user.id,
            userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            postId: parseInt(postId),
            preview: content.substring(0, 60),
            timestamp: new Date().toISOString(),
          });
        }
      } catch (socketErr) { console.warn('Socket broadcast failed:', socketErr.message); }
    }

    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Error adding comment:', error);
    return sendSocialRouteError(res, 500, 'Failed to add comment');
  }
});

/**
 * Delete a comment
 */
router.delete('/:postId/comments/:commentId', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    
    // Find the comment
    const comment = await SocialComment.findOne({
      where: { id: commentId, postId }
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Check if user is the comment owner or post owner or admin
    const post = await SocialPost.findByPk(postId);
    
    if (comment.userId !== req.user.id && post.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment'
      });
    }
    
    // Delete the comment
    await comment.destroy();
    
    // Update post's comment count
    if (post.commentsCount > 0) {
      post.commentsCount -= 1;
      await post.save();
    }
    
    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return sendSocialRouteError(res, 500, 'Failed to delete comment');
  }
});

export default router;
