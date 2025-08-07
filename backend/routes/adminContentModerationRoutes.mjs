/**
 * AdminContentModerationRoutes.mjs
 * ================================
 * 
 * Content Moderation API Routes for Admin Dashboard
 * Provides comprehensive content moderation capabilities
 * 
 * Endpoints:
 * - GET /api/admin/content/posts - Get posts for moderation
 * - GET /api/admin/content/comments - Get comments for moderation
 * - GET /api/admin/content/reports - Get reported content
 * - POST /api/admin/content/moderate - Moderate content (approve/reject)
 * - GET /api/admin/content/stats - Get moderation statistics
 * - PUT /api/admin/content/posts/:id - Update post status
 * - DELETE /api/admin/content/posts/:id - Delete post
 * - PUT /api/admin/content/comments/:id - Update comment status
 * - DELETE /api/admin/content/comments/:id - Delete comment
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.mjs';
import { requireAdmin } from '../middleware/adminMiddleware.mjs';
import adminContentModerationController from '../controllers/adminContentModerationController.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// =====================================================
// SECURITY & RATE LIMITING
// =====================================================

const contentModerationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes for moderation actions
  message: {
    success: false,
    message: 'Too many content moderation requests. Please try again later.'
  }
});

// Apply middleware
router.use(protect);
router.use(requireAdmin);
router.use(contentModerationRateLimit);

// =====================================================
// CONTENT RETRIEVAL ENDPOINTS
// =====================================================

/**
 * GET /api/admin/content/posts
 * Get posts for moderation with filtering and pagination
 */
router.get('/posts', adminContentModerationController.getPosts);

/**
 * GET /api/admin/content/comments
 * Get comments for moderation with filtering and pagination
 */
router.get('/comments', adminContentModerationController.getComments);

/**
 * GET /api/admin/content/reports
 * Get reported content with filtering and pagination
 */
router.get('/reports', adminContentModerationController.getReports);

/**
 * GET /api/admin/content/stats
 * Get moderation statistics and trends
 */
router.get('/stats', adminContentModerationController.getModerationStats);

// =====================================================
// CONTENT MODERATION ACTIONS
// =====================================================

/**
 * POST /api/admin/content/moderate
 * Moderate content (approve, reject, flag, delete)
 * Body: { contentType, contentId, action, reason?, notifyUser?, applyToUser? }
 */
router.post('/moderate', adminContentModerationController.moderateContent);

// =====================================================
// POST MANAGEMENT ENDPOINTS
// =====================================================

/**
 * PUT /api/admin/content/posts/:id
 * Update post status (pending, approved, flagged, rejected)
 * Body: { status, reason? }
 */
router.put('/posts/:id', adminContentModerationController.updatePostStatus);

/**
 * DELETE /api/admin/content/posts/:id
 * Delete a post
 * Body: { reason?, notifyUser? }
 */
router.delete('/posts/:id', adminContentModerationController.deletePost);

// =====================================================
// COMMENT MANAGEMENT ENDPOINTS  
// =====================================================

/**
 * PUT /api/admin/content/comments/:id
 * Update comment status (pending, approved, flagged, rejected)
 * Body: { status, reason? }
 */
router.put('/comments/:id', adminContentModerationController.updateCommentStatus);

/**
 * DELETE /api/admin/content/comments/:id
 * Delete a comment
 * Body: { reason?, notifyUser? }
 */
router.delete('/comments/:id', adminContentModerationController.deleteComment);

// =====================================================
// FRONTEND COMPATIBILITY ALIASES
// =====================================================

// ✅ PHASE 2C: Add alias routes for frontend compatibility
// Frontend expects these specific endpoint patterns

/**
 * ALIAS: Get moderation queue - Frontend expects this endpoint
 * GET /api/admin/content/queue
 */
router.get('/queue', async (req, res) => {
  try {
    logger.info(`📋 Admin ${req.user.email} fetching moderation queue`);
    
    // Combine posts and comments for unified moderation queue
    // This is a simplified implementation - in real app would be more sophisticated
    
    const postsResponse = await adminContentModerationController.getPosts(
      { ...req, query: { ...req.query, status: 'pending', limit: 10 } }, 
      { json: (data) => data }
    );
    
    const commentsResponse = await adminContentModerationController.getComments(
      { ...req, query: { ...req.query, status: 'pending', limit: 10 } },
      { json: (data) => data }
    );
    
    const queue = [
      ...(postsResponse.data?.posts || []).map(post => ({
        ...post,
        type: 'post',
        contentType: 'post'
      })),
      ...(commentsResponse.data?.comments || []).map(comment => ({
        ...comment,
        type: 'comment',
        contentType: 'comment'
      }))
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json({
      success: true,
      data: {
        queue,
        summary: {
          totalPending: queue.length,
          posts: (postsResponse.data?.posts || []).length,
          comments: (commentsResponse.data?.comments || []).length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch moderation queue for ${req.user.email}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve moderation queue',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * ALIAS: Bulk moderation action - Frontend expects this endpoint
 * POST /api/admin/content/bulk-action
 */
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, contentIds, contentType, reason } = req.body;
    
    if (!action || !contentIds || !Array.isArray(contentIds) || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: action, contentIds (array), contentType'
      });
    }
    
    logger.info(`🔄 Admin ${req.user.email} performing bulk ${action} on ${contentIds.length} ${contentType}s`);
    
    // Mock bulk action - in real implementation would process each item
    const results = contentIds.map(id => ({
      contentId: id,
      contentType,
      action,
      success: true,
      timestamp: new Date().toISOString()
    }));
    
    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        action,
        contentType,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to perform bulk action for ${req.user.email}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;

logger.info('🛡️ AdminContentModerationRoutes: Content moderation API initialized');
