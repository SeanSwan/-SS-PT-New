import { User, WorkoutSession, MeasurementMilestone, Goal, Like, Comment, sequelize } from '../models/index.cjs';
import { Op } from 'sequelize';

/**
 * =============================================================================
 * 📱 Feed Controller
 * =============================================================================
 *
 * Purpose:
 * Aggregates social feed data for the user dashboard.
 *
 * =============================================================================
 */

const feedController = {
  /**
   * @description Get the activity feed for the current user.
   * @route GET /api/feed
   * @access Private
   */
  async getFeed(req, res) {
    try {
      const userId = req.user.id;
      const limit = 20;
      const offset = parseInt(req.query.offset) || 0;

      // 1. Fetch Workouts
      const workouts = await WorkoutSession.findAll({
        where: { status: 'completed' }, // In a real app, filter by friends/public visibility
        limit,
        order: [['completedAt', 'DESC']],
        include: { model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture'] }
      });

      // 2. Fetch Milestones
      const milestones = await MeasurementMilestone.findAll({
        limit,
        order: [['createdAt', 'DESC']],
        include: { model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture'] }
      });

      // 3. Fetch Goals (Newly created or completed)
      const goals = await Goal.findAll({
        where: { 
           // In a real app, filter by friends/public visibility
        },
        limit,
        order: [['createdAt', 'DESC']],
        include: { model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture'] }
      });

      // 4. Combine and Sort
      let feedItems = [
        ...workouts.map(w => ({
          id: `workout-${w.id}`,
          type: 'workout',
          user: w.User,
          title: `completed a workout`,
          content: w.notes || 'Crushed a session!',
          timestamp: w.completedAt
        })),
        ...milestones.map(m => ({
          id: `milestone-${m.id}`,
          type: 'milestone',
          user: m.User,
          title: `achieved ${m.title}`,
          content: m.celebrationMessage,
          timestamp: m.createdAt
        })),
        // Add goals mapping here if needed
      ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);

      // 5. Aggregate Likes
      const itemIds = feedItems.map(item => item.id);
      const likes = await Like.findAll({
        where: { feedItemId: { [Op.in]: itemIds } },
        attributes: ['feedItemId', [sequelize.fn('COUNT', sequelize.col('id')), 'likeCount']],
        group: ['feedItemId']
      });
      const comments = await Comment.findAll({
        where: { feedItemId: { [Op.in]: itemIds } },
        attributes: ['feedItemId', [sequelize.fn('COUNT', sequelize.col('id')), 'commentCount']],
        group: ['feedItemId']
      });

      const userLikes = await Like.findAll({
        where: { feedItemId: { [Op.in]: itemIds }, userId: req.user.id }
      });

      const likesMap = new Map(likes.map(l => [l.feedItemId, l.get('likeCount')]));
      const commentsMap = new Map(comments.map(c => [c.feedItemId, c.get('commentCount')]));
      const userLikesSet = new Set(userLikes.map(l => l.feedItemId));

      feedItems = feedItems.map(item => ({
        ...item,
        likeCount: parseInt(likesMap.get(item.id) || '0', 10),
        commentCount: parseInt(commentsMap.get(item.id) || '0', 10),
        isLiked: userLikesSet.has(item.id)
      }));

      res.status(200).json(feedItems);
    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ message: 'Server error while fetching feed.' });
    }
  }
  ,
  /**
   * @description Toggle a like on a feed item.
   * @route POST /api/feed/like
   * @access Private
   */
  async toggleLike(req, res) {
    const { feedItemId } = req.body;
    const userId = req.user.id;

    try {
      const existingLike = await Like.findOne({ where: { userId, feedItemId } });

      if (existingLike) {
        await existingLike.destroy();
        res.status(200).json({ liked: false, message: 'Item unliked.' });
      } else {
        await Like.create({ userId, feedItemId });
        res.status(200).json({ liked: true, message: 'Item liked.' });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({ message: 'Server error while toggling like.' });
    }
  },

  /**
   * @description Get comments for a specific feed item.
   * @route GET /api/feed/:feedItemId/comments
   * @access Private
   */
  async getCommentsForFeedItem(req, res) {
    const { feedItemId } = req.params;
    try {
      const comments = await Comment.findAll({
        where: { feedItemId },
        include: {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'profilePicture']
        },
        order: [['createdAt', 'ASC']]
      });
      res.status(200).json(comments);
    } catch (error) {
      console.error(`Error fetching comments for ${feedItemId}:`, error);
      res.status(500).json({ message: 'Server error while fetching comments.' });
    }
  },

  /**
   * @description Create a new comment on a feed item.
   * @route POST /api/feed/:feedItemId/comments
   * @access Private
   */
  async createComment(req, res) {
    const { feedItemId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Comment content cannot be empty.' });
    }

    try {
      const newComment = await Comment.create({ userId, feedItemId, content });
      const commentWithUser = await Comment.findByPk(newComment.id, { include: { model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture'] } });
      res.status(201).json(commentWithUser);
    } catch (error) {
      console.error(`Error creating comment for ${feedItemId}:`, error);
      res.status(500).json({ message: 'Server error while creating comment.' });
    }
  },
};

export default feedController;