/**
 * Social Goal Routes - Supporters, Comments, Likes, Milestones
 * =============================================================
 * Social engagement features for public goals.
 * All routes require authentication via protect middleware.
 *
 * Endpoints:
 * - POST   /api/goals/:goalId/supporters        (support a goal)
 * - DELETE /api/goals/:goalId/supporters        (unsupport)
 * - GET    /api/goals/:goalId/supporters        (list supporters)
 * - POST   /api/goals/:goalId/comments          (add comment)
 * - GET    /api/goals/:goalId/comments          (list comments)
 * - DELETE /api/goals/:goalId/comments/:commentId (delete own comment)
 * - POST   /api/goals/:goalId/likes             (like/react)
 * - DELETE /api/goals/:goalId/likes             (unlike)
 * - GET    /api/goals/:goalId/likes             (list likes)
 * - GET    /api/goals/:goalId/milestones        (list milestones)
 * - POST   /api/goals/:goalId/milestones        (add milestone - owner only)
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import getModels from '../models/associations.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
router.use(protect);

// ─── Helper: Ensure goal exists and is public (or owned by requester) ────────

async function getAccessibleGoal(goalId, userId, models) {
  const { Goal } = models;
  const goal = await Goal.findByPk(goalId);
  if (!goal) return { error: { status: 404, message: 'Goal not found' } };
  if (!goal.isPublic && String(goal.userId) !== String(userId)) {
    return { error: { status: 403, message: 'Goal is private' } };
  }
  return { goal };
}

// ─── SUPPORTERS ──────────────────────────────────────────────────────────────

router.post('/:goalId/supporters', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalSupporter } = models;
    const { goalId } = req.params;
    const supporterId = req.user.id;

    const { error } = await getAccessibleGoal(goalId, supporterId, models);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const [supporter, created] = await GoalSupporter.findOrCreate({
      where: { goalId, supporterId },
      defaults: { goalId, supporterId },
    });

    if (!created) {
      return res.status(409).json({ success: false, message: 'Already supporting this goal' });
    }

    // Increment Goal.supporterCount
    const { Goal } = models;
    await Goal.increment('supporterCount', { where: { id: goalId } });

    return res.status(201).json({ success: true, supporter });
  } catch (err) {
    logger.error('Error adding goal supporter', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to support goal' });
  }
});

router.delete('/:goalId/supporters', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalSupporter, Goal } = models;
    const { goalId } = req.params;

    const deleted = await GoalSupporter.destroy({
      where: { goalId, supporterId: req.user.id },
    });

    if (deleted) {
      await Goal.decrement('supporterCount', { where: { id: goalId } });
    }

    return res.json({ success: true, removed: deleted > 0 });
  } catch (err) {
    logger.error('Error removing goal supporter', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to unsupport goal' });
  }
});

router.get('/:goalId/supporters', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalSupporter, User } = models;
    const { goalId } = req.params;

    const { error } = await getAccessibleGoal(goalId, req.user.id, models);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const supporters = await GoalSupporter.findAll({
      where: { goalId },
      include: [{ model: User, as: 'supporter', attributes: ['id', 'firstName', 'lastName', 'username', 'photo'] }],
      order: [['createdAt', 'ASC']],
    });

    return res.json({ success: true, supporters, count: supporters.length });
  } catch (err) {
    logger.error('Error fetching goal supporters', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch supporters' });
  }
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────

router.post('/:goalId/comments', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalComment } = models;
    const { goalId } = req.params;
    const { content, commentType } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }
    if (content.length > 500) {
      return res.status(400).json({ success: false, message: 'Comment must be 500 characters or less' });
    }

    const { error } = await getAccessibleGoal(goalId, req.user.id, models);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    // Increment Goal.encouragementCount
    const { Goal } = models;
    await Goal.increment('encouragementCount', { where: { id: goalId } });

    const comment = await GoalComment.create({
      goalId,
      userId: req.user.id,
      content: content.trim(),
      commentType: commentType || 'general',
    });

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    logger.error('Error adding goal comment', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
});

router.get('/:goalId/comments', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalComment, User } = models;
    const { goalId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { error } = await getAccessibleGoal(goalId, req.user.id, models);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const { rows: comments, count } = await GoalComment.findAndCountAll({
      where: { goalId, isHidden: false },
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'username', 'photo'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.json({ success: true, comments, count, limit, offset });
  } catch (err) {
    logger.error('Error fetching goal comments', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
});

router.delete('/:goalId/comments/:commentId', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalComment } = models;
    const { commentId } = req.params;

    const comment = await GoalComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Only owner or admin can delete
    if (String(comment.userId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await comment.destroy();
    return res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    logger.error('Error deleting goal comment', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

// ─── LIKES ───────────────────────────────────────────────────────────────────

router.post('/:goalId/likes', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalLike } = models;
    const { goalId } = req.params;
    const { reactionType } = req.body;

    const { error } = await getAccessibleGoal(goalId, req.user.id, models);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const [like, created] = await GoalLike.findOrCreate({
      where: { goalId, userId: req.user.id, reactionType: reactionType || 'like' },
      defaults: { goalId, userId: req.user.id, reactionType: reactionType || 'like' },
    });

    if (!created) {
      return res.status(409).json({ success: false, message: 'Already reacted' });
    }

    return res.status(201).json({ success: true, like });
  } catch (err) {
    logger.error('Error adding goal like', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to react to goal' });
  }
});

router.delete('/:goalId/likes', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalLike } = models;
    const { goalId } = req.params;
    const { reactionType } = req.body;

    const deleted = await GoalLike.destroy({
      where: { goalId, userId: req.user.id, reactionType: reactionType || 'like' },
    });

    return res.json({ success: true, removed: deleted > 0 });
  } catch (err) {
    logger.error('Error removing goal like', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to remove reaction' });
  }
});

router.get('/:goalId/likes', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalLike, User } = models;
    const { goalId } = req.params;

    const { error } = await getAccessibleGoal(goalId, req.user.id, models);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const likes = await GoalLike.findAll({
      where: { goalId },
      include: [{ model: User, as: 'liker', attributes: ['id', 'firstName', 'lastName', 'username', 'photo'] }],
    });

    // Group by reaction type
    const grouped = {};
    for (const like of likes) {
      if (!grouped[like.reactionType]) grouped[like.reactionType] = [];
      grouped[like.reactionType].push(like);
    }

    return res.json({ success: true, likes, grouped, totalCount: likes.length });
  } catch (err) {
    logger.error('Error fetching goal likes', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch reactions' });
  }
});

// ─── MILESTONES ──────────────────────────────────────────────────────────────

router.get('/:goalId/milestones', async (req, res) => {
  try {
    const models = await getModels();
    const { GoalMilestone } = models;
    const { goalId } = req.params;

    const { error } = await getAccessibleGoal(goalId, req.user.id, models);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const milestones = await GoalMilestone.findAll({
      where: { goalId },
      order: [['sortOrder', 'ASC']],
    });

    return res.json({ success: true, milestones, count: milestones.length });
  } catch (err) {
    logger.error('Error fetching goal milestones', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch milestones' });
  }
});

router.post('/:goalId/milestones', async (req, res) => {
  try {
    const models = await getModels();
    const { Goal, GoalMilestone } = models;
    const { goalId } = req.params;
    const { title, description, targetValue, targetPercentage, xpReward, sortOrder } = req.body;

    // Owner only
    const goal = await Goal.findByPk(goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    if (String(goal.userId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only goal owner can add milestones' });
    }

    if (!title || !targetValue) {
      return res.status(400).json({ success: false, message: 'Title and targetValue are required' });
    }

    const milestone = await GoalMilestone.create({
      goalId,
      title,
      description,
      targetValue,
      targetPercentage,
      xpReward: xpReward || 25,
      sortOrder: sortOrder || 0,
    });

    return res.status(201).json({ success: true, milestone });
  } catch (err) {
    logger.error('Error adding goal milestone', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to add milestone' });
  }
});

export default router;
