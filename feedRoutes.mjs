import express from 'express';
import feedController from '../controllers/feedController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// @route   GET /api/feed
// @desc    Get the user's activity feed
// @access  Private
router.get('/', protect, feedController.getFeed);

// @route   POST /api/feed/like
// @desc    Toggle a like on a feed item
// @access  Private
router.post('/like', protect, feedController.toggleLike);

// @route   GET /api/feed/:feedItemId/comments
// @desc    Get all comments for a feed item
// @access  Private
router.get('/:feedItemId/comments', protect, feedController.getCommentsForFeedItem);

// @route   POST /api/feed/:feedItemId/comments
// @desc    Create a new comment on a feed item
// @access  Private
router.post('/:feedItemId/comments', protect, feedController.createComment);

export default router;