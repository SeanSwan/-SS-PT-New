import express from 'express';
import { SocialPost, SocialComment, SocialLike } from '../../models/social/index.mjs';
import { User } from '../../models/User.mjs';
import { authMiddleware } from '../../middleware/authMiddleware.mjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'social');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
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
    const friendships = await req.db.models.Friendship.findAll({
      where: {
        [req.db.Sequelize.Op.or]: [
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
        [req.db.Sequelize.Op.or]: [
          { userId: { [req.db.Sequelize.Op.in]: userIds } },
          { visibility: 'public' } 
        ]
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']], 
      include: [
        {
          model: User,
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
        [req.db.Sequelize.fn('COUNT', req.db.Sequelize.col('id')), 'count']
      ],
      where: { postId: { [req.db.Sequelize.Op.in]: postIds } },
      group: ['postId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const commentCountMap = {};
    commentsCount.forEach(item => {
      commentCountMap[item.postId] = parseInt(item.count);
    });
    
    // Check if current user has liked each post
    const userLikes = await SocialLike.findAll({
      where: {
        userId: req.user.id,
        targetType: 'post',
        targetId: { [req.db.Sequelize.Op.in]: postIds }
      },
      attributes: ['targetId']
    });
    
    // Create a set of liked post IDs for quick lookup
    const likedPostIds = new Set(userLikes.map(like => like.targetId));
    
    // Format posts with comment counts and like status
    const formattedPosts = posts.map(post => {
      const postObj = post.toJSON();
      
      // Add comment count
      postObj.commentsCount = commentCountMap[post.id] || 0;
      
      // Add if user has liked this post
      postObj.isLiked = likedPostIds.has(post.id);
      
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
            [req.db.Sequelize.Op.or]: [
              { userId: { [req.db.Sequelize.Op.in]: userIds } },
              { visibility: 'public' }
            ]
          }
        })
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
    const user = await User.findByPk(userId, {
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
      friendship = await req.db.models.Friendship.findOne({
        where: {
          [req.db.Sequelize.Op.or]: [
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
          model: User,
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
        [req.db.Sequelize.fn('COUNT', req.db.Sequelize.col('id')), 'count']
      ],
      where: { postId: { [req.db.Sequelize.Op.in]: postIds } },
      group: ['postId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const commentCountMap = {};
    commentsCount.forEach(item => {
      commentCountMap[item.postId] = parseInt(item.count);
    });
    
    // Check if current user has liked each post
    const userLikes = await SocialLike.findAll({
      where: {
        userId: req.user.id,
        targetType: 'post',
        targetId: { [req.db.Sequelize.Op.in]: postIds }
      },
      attributes: ['targetId']
    });
    
    // Create a set of liked post IDs for quick lookup
    const likedPostIds = new Set(userLikes.map(like => like.targetId));
    
    // Format posts with comment counts and like status
    const formattedPosts = posts.map(post => {
      const postObj = post.toJSON();
      
      // Add comment count
      postObj.commentsCount = commentCountMap[post.id] || 0;
      
      // Add if user has liked this post
      postObj.isLiked = likedPostIds.has(post.id);
      
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
    const { content, type = 'general', visibility = 'friends' } = req.body;
    
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
    
    // Add media URL if file was uploaded
    if (req.file) {
      postData.mediaUrl = `/uploads/social/${req.file.filename}`;
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
    
    // Fetch the full post with user data
    const fullPost = await SocialPost.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: fullPost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    
    // If there was an uploaded file, delete it
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
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
          model: User,
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
      const friendship = await req.db.models.Friendship.findOne({
        where: {
          [req.db.Sequelize.Op.or]: [
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
          model: User,
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
          model: User,
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
    
    // If post has a media file, delete it
    if (post.mediaUrl) {
      try {
        const filePath = path.join(process.cwd(), post.mediaUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkError) {
        console.error('Error deleting post media file:', unlinkError);
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
 * Like a post
 */
router.post('/:postId/like', async (req, res) => {
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
    
    // Check if user already liked this post
    const existingLike = await SocialLike.findOne({
      where: {
        userId: req.user.id,
        targetType: 'post',
        targetId: postId
      }
    });
    
    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'You have already liked this post'
      });
    }
    
    // Create the like
    await SocialLike.likePost(req.user.id, postId);
    
    return res.status(200).json({
      success: true,
      message: 'Post liked successfully'
    });
  } catch (error) {
    console.error('Error liking post:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to like post',
      error: error.message
    });
  }
});

/**
 * Unlike a post
 */
router.delete('/:postId/like', async (req, res) => {
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
    
    // Remove the like
    const result = await SocialLike.unlikePost(req.user.id, postId);
    
    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'You have not liked this post'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Post unliked successfully'
    });
  } catch (error) {
    console.error('Error unliking post:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unlike post',
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
    
    // Return the comment with user data
    const fullComment = await SocialComment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: fullComment
    });
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
