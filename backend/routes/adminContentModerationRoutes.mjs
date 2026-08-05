/**
 * Admin Content Moderation Routes (Social Content Moderation API)
 * ================================================================
 *
 * Purpose: REST API for admin moderation of user-generated social content
 * with rate limiting, bulk actions, and frontend compatibility aliases
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Content Moderation System
 *
 * Base Path: /api/admin/content
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Dashboard    │─────▶│  Content Mod     │─────▶│  Content Mod    │
 * │  (React)            │      │  Routes          │      │  Controller     │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *
 * API Endpoints (11 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                         ACCESS         PURPOSE              │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /posts                           Admin          Get posts for review │
 * │ GET     /comments                        Admin          Get comments         │
 * │ GET     /reports                         Admin          Get reported content │
 * │ PATCH   /reports/:id/resolve             Admin          Resolve a report     │
 * │ PATCH   /reports/:id/dismiss             Admin          Dismiss a report     │
 * │ GET     /stats                           Admin          Get stats            │
 * │ POST    /moderate                        Admin          Moderate content     │
 * │ PUT     /posts/:id                       Admin          Update post status   │
 * │ DELETE  /posts/:id                       Admin          Delete post          │
 * │ PUT     /comments/:id                    Admin          Update comment status│
 * │ DELETE  /comments/:id                    Admin          Delete comment       │
 * │ GET     /queue                           Admin          Unified queue (alias)│
 * │ POST    /bulk-action                     Admin          Bulk moderation      │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Middleware Strategy:
 *
 *   Global middleware (router.use):
 *   - protect (JWT authentication)
 *   - requireAdmin (admin role check)
 *   - contentModerationRateLimit (200 requests / 15 minutes)
 *
 * Business Logic:
 *
 * WHY Aggressive Rate Limiting (200 requests / 15 minutes)?
 * - Prevents admin account abuse (compromised admin credentials)
 * - Prevents accidental bulk deletion (rapid DELETE requests)
 * - Reasonable for admin workflow (5-10 moderations per minute max)
 * - Higher than client rate limits (admin needs more capacity)
 *
 * WHY Frontend Compatibility Aliases (/queue, /bulk-action)?
 * - Frontend expects unified moderation queue (posts + comments combined)
 * - Bulk action endpoint simplifies frontend logic (single API call)
 * - Backwards compatibility with legacy frontend code
 * - Reduces frontend complexity (no manual data merging)
 *
 * WHY Global Middleware on All Routes?
 * - All content moderation requires authentication
 * - All content moderation requires admin role
 * - Simplified route definitions (no per-route middleware repetition)
 * - Centralized rate limiting configuration
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.mjs';
import { requireAdmin } from '../middleware/adminMiddleware.mjs';
import adminContentModerationController from '../controllers/adminContentModerationController.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';
const BULK_ACTIONS = new Set(['approve', 'reject', 'flag', 'hide', 'delete']);
const BULK_CONTENT_TYPES = new Set(['post', 'comment']);
const MAX_BULK_CONTENT_IDS = 50;

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR
  });
}

function isValidContentId(contentId) {
  const value = String(contentId || '').trim();
  return value.length > 0 && value.length <= 80;
}

function createResponseCapture() {
  const capture = {
    statusCode: 200,
    payload: null
  };

  return {
    capture,
    status(code) {
      capture.statusCode = code;
      return this;
    },
    json(payload) {
      capture.payload = payload;
      return payload;
    }
  };
}

async function moderateBulkItem(req, { contentId, contentType, action, reason }) {
  const itemReq = Object.create(req);
  itemReq.body = {
    contentType,
    contentId,
    action,
    reason,
    notifyUser: false,
    applyToUser: false
  };

  const responseCapture = createResponseCapture();
  await adminContentModerationController.moderateContent(itemReq, responseCapture);

  const payload = responseCapture.capture.payload || {
    success: false,
    message: 'Moderation handler returned no response'
  };

  return {
    contentId,
    contentType,
    action,
    success: Boolean(payload.success),
    statusCode: responseCapture.capture.statusCode,
    message: payload.message || null,
    data: payload.data || null
  };
}

async function getModerationQueueSegment(req, handler, query) {
  const queueReq = Object.create(req);
  queueReq.query = {
    ...req.query,
    ...query
  };

  const responseCapture = createResponseCapture();
  await handler.call(adminContentModerationController, queueReq, responseCapture);

  const payload = responseCapture.capture.payload;
  if (!payload?.success) {
    throw new Error(payload?.message || 'Moderation queue segment failed');
  }

  return payload.data || {};
}

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

// =====================================================
// REPORT LIFECYCLE ACTIONS (SWA-138 S2)
// =====================================================

/**
 * PATCH /api/admin/content/reports/:id/resolve
 * Resolve a report via PostReport.resolve() (sets status/resolvedAt/resolvedBy).
 * Body: { actionTaken, adminNotes? } — actionTaken must be a PostReport action enum value.
 */
router.patch('/reports/:id/resolve', adminContentModerationController.resolveReport);

/**
 * PATCH /api/admin/content/reports/:id/dismiss
 * Dismiss a report via PostReport.dismiss() (status=dismissed, actionTaken=no-action).
 * Body: { adminNotes? }
 */
router.patch('/reports/:id/dismiss', adminContentModerationController.dismissReport);

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
    
    const postsData = await getModerationQueueSegment(
      req,
      adminContentModerationController.getPosts,
      { status: 'pending', limit: 10 }
    );

    const commentsData = await getModerationQueueSegment(
      req,
      adminContentModerationController.getComments,
      { status: 'pending', limit: 10 }
    );

    const posts = postsData.posts || [];
    const comments = commentsData.comments || [];
    
    const queue = [
      ...posts.map(post => ({
        ...post,
        type: 'post',
        contentType: 'post'
      })),
      ...comments.map(comment => ({
        ...comment,
        type: 'comment',
        contentType: 'comment'
      }))
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    res.json({
      success: true,
      data: {
        queue,
        summary: {
          totalPending: queue.length,
          posts: posts.length,
          comments: comments.length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch moderation queue for ${req.user.email}:`, error);

    return sendInternalError(res, 'Failed to retrieve moderation queue');
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

    if (
      !BULK_ACTIONS.has(action)
      || !BULK_CONTENT_TYPES.has(contentType)
      || contentIds.length === 0
      || contentIds.length > MAX_BULK_CONTENT_IDS
      || !contentIds.every(isValidContentId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk moderation payload'
      });
    }
    
    logger.info(`🔄 Admin ${req.user.email} performing bulk ${action} on ${contentIds.length} ${contentType}s`);
    
    const results = [];
    for (const contentId of contentIds) {
      results.push(await moderateBulkItem(req, { contentId, contentType, action, reason }));
    }
    
    res.json({
      success: results.every(result => result.success),
      message: `Bulk ${action} processed ${results.length} ${contentType} item(s)`,
      data: {
        action,
        contentType,
        processed: results.length,
        successful: results.filter(result => result.success).length,
        failed: results.filter(result => !result.success).length,
        results
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to perform bulk action for ${req.user.email}:`, error);

    return sendInternalError(res, 'Failed to perform bulk action');
  }
});

export default router;

logger.info('🛡️ AdminContentModerationRoutes: Content moderation API initialized');
