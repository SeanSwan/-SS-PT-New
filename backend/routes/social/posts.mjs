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
import PointTransaction from '../../models/PointTransaction.mjs';
import { uploadPhoto, deletePhoto } from '../../services/photoStorageService.mjs';

const router = express.Router();

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
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role'],
      raw: true
    })
    : [];

  const userMap = new Map(users.map((user) => [String(user.id), user]));

  const formattedPosts = posts.map((post) => {
    const mediaItems = Array.isArray(post.mediaItems) ? post.mediaItems : [];
    const firstMedia = mediaItems[0];

    return {
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
    };
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

    // Get current user balance
    const lastTransaction = await PointTransaction.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    
    const currentBalance = lastTransaction ? lastTransaction.balance : 0;
    const newBalance = currentBalance + pointsToAward;

    // Create point transaction record
    await PointTransaction.create({
      userId,
      points: pointsToAward,
      balance: newBalance,
      transactionType: 'earn',
      source: 'social_engagement',
      description: `Social Action: ${action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      metadata: {
        socialAction: action,
        ...metadata
      }
    });

    console.log(`✅ Awarded ${pointsToAward} points to user ${userId} for ${action}`);
    
    return {
      pointsAwarded: pointsToAward,
      newBalance,
      success: true,
      action
    };
  } catch (error) {
    console.error(`❌ Error awarding social points for ${action}:`, error);
    return { pointsAwarded: 0, success: false, error: error.message };
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
      console.log(`🎉 Post owner ${postOwnerId} earned ${result.pointsAwarded} points for receiving ${action}`);
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
    
    // Include user's own posts and friends' posts, plus public posts
    const userIds = [req.user.id, ...friendIds];
    
    const posts = await SocialPost.findAll({
      where: {
        [Op.or]: [
          { userId: { [Op.in]: userIds } },
          { visibility: 'public' } 
        ]
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']], 
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
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

      return postObj;
    });

    return res.status(200).json({
      success: true,
      posts: formattedPosts,
      pagination: {
        limit,
        offset,
        total: await SocialPost.count({
          where: {
            [Op.or]: [
              { userId: { [Op.in]: userIds } },
              { visibility: 'public' }
            ]
          }
        })
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch social feed',
      error: error.message
    });
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
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
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
    
    // Determine which posts to show based on friendship status
    const whereClause = { userId };
    
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
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
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
      
      return postObj;
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user posts',
      error: error.message
    });
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
    
    // Create post data
    const postData = {
      userId: req.user.id,
      content,
      type,
      visibility
    };
    
    // Upload media to R2 if file was provided
    if (req.file) {
      try {
        const isVideo = req.file.mimetype.startsWith('video/');
        const result = await uploadPhoto(req.file.buffer, {
          userId: req.user.id,
          category: isVideo ? 'social-videos' : 'social',
          originalFilename: req.file.originalname,
          contentType: req.file.mimetype,
        });
        postData.mediaUrl = result.url;
        postData.mediaType = isVideo ? 'video' : 'image';
      } catch (uploadErr) {
        console.error('R2 upload failed for social post:', uploadErr.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload media file',
        });
      }
    }
    
    // Add reference IDs if specified
    if (req.body.workoutSessionId) {
      postData.workoutSessionId = req.body.workoutSessionId;
    }
    
    if (req.body.achievementId) {
      postData.achievementId = req.body.achievementId;
    }
    
    if (req.body.userAchievementId) {
      postData.userAchievementId = req.body.userAchievementId;
    }
    
    if (req.body.challengeId) {
      postData.challengeId = req.body.challengeId;
    }
    
    // Create the post
    const post = await SocialPost.create(postData);
    
    // Award points for post creation based on type
    const pointAction = `post_create_${type}`;
    const pointResult = await awardSocialPoints(req.user.id, pointAction, {
      postId: post.id,
      postType: type,
      hasMedia: !!req.file,
      visibility
    });
    
    // Fetch the full post with user data
    const fullPost = await SocialPost.findByPk(post.id, {
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ]
    });
    
    // Add point information to response
    const responseData = {
      success: true,
      message: 'Post created successfully',
      post: fullPost
    };
    
    if (pointResult.success) {
      responseData.pointsAwarded = pointResult.pointsAwarded;
      responseData.newBalance = pointResult.newBalance;
      responseData.pointMessage = `🎉 You earned ${pointResult.pointsAwarded} points for creating a ${type} post!`;
    }
    
    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating post:', error);
    
    // With memory storage, no temp file cleanup needed
    // R2 upload only happens on success path above
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
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
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
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
    
    // Get comments for the post
    const comments = await SocialComment.findAll({
      where: { postId },
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ]
    });
    
    // Check if user has liked this post
    const userLike = await SocialLike.findOne({
      where: {
        userId: req.user.id,
        targetType: 'post',
        targetId: postId
      }
    });
    
    // Format response
    const postData = post.toJSON();
    postData.comments = comments;
    postData.isLiked = !!userLike;
    
    return res.status(200).json({
      success: true,
      post: postData
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
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
    
    // Update fields
    if (content) post.content = content;
    if (visibility) post.visibility = visibility;
    
    await post.save();
    
    // Fetch the updated post with user data
    const updatedPost = await SocialPost.findByPk(post.id, {
      include: [
        {
          model: getUser(),
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
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
    return res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
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
    
    // Delete media from R2 (or local disk for legacy posts)
    if (post.mediaUrl) {
      try {
        // Extract R2 storage key from URL
        const storageKey = post.mediaUrl.startsWith('/api/serve-photo/')
          ? post.mediaUrl.replace('/api/serve-photo/', '')
          : post.mediaUrl;
        await deletePhoto(storageKey);
      } catch (unlinkError) {
        console.error('Error deleting post media:', unlinkError);
      }
    }
    
    // Delete the post (and its associated comments due to CASCADE)
    await post.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
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
      postOwnerId: post.userId
    });

    let likeReceivedResult = { success: false };
    if (post.userId !== req.user.id) {
      likeReceivedResult = await awardEngagementReceivedPoints(post.userId, 'post_like_received', {
        postId,
        likedByUserId: req.user.id
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

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error reacting to post:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to react to post',
      error: error.message
    });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: error.message
    });
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
    
    // Create the comment
    const comment = await SocialComment.create({
      postId,
      userId: req.user.id,
      content
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
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
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
    
    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
});

export default router;
