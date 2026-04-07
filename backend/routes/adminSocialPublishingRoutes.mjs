/**
 * ┌─── ROUTES: Admin Social Media Publishing ──────────────────┐
 * │ PREFIX: /api/admin/social-publishing                        │
 * │ AUTH: protect + adminOnly                                   │
 * │ PURPOSE: Connect social accounts via Postiz, compose posts, │
 * │          run FTC/FDA compliance checks, publish/schedule.   │
 * └────────────────────────────────────────────────────────────┘
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import postiz from '../services/postizClient.mjs';
import { checkCompliance } from '../services/complianceCheck.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// All routes require admin auth
router.use(protect, adminOnly);

// ── Health Check ─────────────────────────────────────────────
// GET /api/admin/social-publishing/health
router.get('/health', async (_req, res) => {
  try {
    const health = await postiz.checkHealth();
    res.json({ success: true, data: health });
  } catch (err) {
    logger.error('Social publishing health check failed:', err.message);
    res.status(500).json({ success: false, message: 'Health check failed' });
  }
});

// ── Connected Accounts ───────────────────────────────────────
// GET /api/admin/social-publishing/accounts
router.get('/accounts', async (_req, res) => {
  try {
    const result = await postiz.listConnectedAccounts();
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error('Failed to list social accounts:', err.message);
    res.status(500).json({ success: false, message: 'Failed to list accounts' });
  }
});

// ── Connect Platform (OAuth) ─────────────────────────────────
// POST /api/admin/social-publishing/connect/:platform
router.post('/connect/:platform', async (req, res) => {
  const { platform } = req.params;
  const allowed = ['instagram', 'facebook', 'youtube', 'bluesky', 'tiktok'];

  if (!allowed.includes(platform)) {
    return res.status(400).json({
      success: false,
      message: `Platform "${platform}" not supported. Use: ${allowed.join(', ')}`,
    });
  }

  try {
    const result = await postiz.getOAuthUrl(platform);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    logger.info(`[AUDIT] Admin ${req.user.id} initiated ${platform} OAuth connection`);
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error(`Failed to get OAuth URL for ${platform}:`, err.message);
    res.status(500).json({ success: false, message: 'Failed to initiate connection' });
  }
});

// ── Disconnect Platform ──────────────────────────────────────
// DELETE /api/admin/social-publishing/accounts/:integrationId
router.delete('/accounts/:integrationId', async (req, res) => {
  try {
    const result = await postiz.disconnectAccount(req.params.integrationId);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    logger.info(`[AUDIT] Admin ${req.user.id} disconnected integration ${req.params.integrationId}`);
    res.json({ success: true, message: 'Account disconnected' });
  } catch (err) {
    logger.error('Failed to disconnect account:', err.message);
    res.status(500).json({ success: false, message: 'Failed to disconnect' });
  }
});

// ── Compliance Check (preview before publish) ────────────────
// POST /api/admin/social-publishing/compliance-check
router.post('/compliance-check', (req, res) => {
  const { content, isAIGenerated } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, message: 'content is required' });
  }

  const result = checkCompliance(content, !!isAIGenerated);
  res.json({ success: true, data: result });
});

// ── Publish / Schedule Post ──────────────────────────────────
// POST /api/admin/social-publishing/publish
router.post('/publish', async (req, res) => {
  const { content, platformIds, mediaUrl, scheduledAt, isAIGenerated } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, message: 'content is required' });
  }
  if (!platformIds || !Array.isArray(platformIds) || platformIds.length === 0) {
    return res.status(400).json({ success: false, message: 'platformIds array is required' });
  }

  // Run compliance check
  const compliance = checkCompliance(content, !!isAIGenerated);

  // Auto-append compliance tags if needed
  let finalContent = content;
  if (compliance.autoTags.length > 0) {
    finalContent = content + '\n\n' + compliance.autoTags.join(' ');
  }

  try {
    const result = await postiz.publishPost({
      content: finalContent,
      platformIds,
      mediaUrl,
      scheduledAt,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }

    logger.info(
      `[AUDIT] Admin ${req.user.id} ${scheduledAt ? 'scheduled' : 'published'} social post ` +
      `to ${platformIds.length} platform(s)${compliance.warnings.length ? ' (with compliance warnings)' : ''}`
    );

    res.json({
      success: true,
      data: result.data,
      compliance: {
        warnings: compliance.warnings,
        autoTags: compliance.autoTags,
      },
    });
  } catch (err) {
    logger.error('Failed to publish social post:', err.message);
    res.status(500).json({ success: false, message: 'Failed to publish' });
  }
});

// ── Post History ─────────────────────────────────────────────
// GET /api/admin/social-publishing/history
router.get('/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const result = await postiz.getPostHistory(limit);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error('Failed to fetch post history:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// ── Post Status ──────────────────────────────────────────────
// GET /api/admin/social-publishing/posts/:postId
router.get('/posts/:postId', async (req, res) => {
  try {
    const result = await postiz.getPostStatus(req.params.postId);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error('Failed to fetch post status:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
});

export default router;
