/**
 * ROUTES: Admin Social Media Publishing
 * =====================================
 * Prefix: /api/admin/social-publishing
 * Auth: protect + adminOnly
 *
 * Owns social account connection, compliance checks, publish/schedule calls,
 * and planning helper endpoints for the admin Marketing command center.
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import postiz from '../services/postizClient.mjs';
import { checkCompliance } from '../services/complianceCheck.mjs';
import {
  getAutoPostTemplates,
  getBestTimes,
  getCalendarSuggestions,
} from '../services/socialPublishingPlanningService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const POSTIZ_PLATFORMS = ['instagram', 'facebook', 'youtube', 'bluesky', 'tiktok'];
const DIRECT_API_PLATFORMS = ['nextdoor'];
const SUPPORTED_PLATFORMS = [...POSTIZ_PLATFORMS, ...DIRECT_API_PLATFORMS];
const NEXTDOOR_DIRECT_API_MESSAGE =
  'Nextdoor uses its direct partner API, not Postiz OAuth. Set NEXTDOOR_API_URL and NEXTDOOR_API_KEY after developer approval to enable publishing.';

router.use(protect, adminOnly);

const sendPostizResult = (res, result, fallbackStatus = 502) => {
  if (!result.success) {
    return res.status(fallbackStatus).json({ success: false, message: result.error });
  }
  return res.json({ success: true, data: result.data });
};

router.get('/health', async (_req, res) => {
  try {
    const health = await postiz.checkHealth();
    return res.json({ success: true, data: health });
  } catch (err) {
    logger.error('Social publishing health check failed:', err.message);
    return res.status(500).json({ success: false, message: 'Health check failed' });
  }
});

router.get('/accounts', async (_req, res) => {
  try {
    const result = await postiz.listConnectedAccounts();
    return sendPostizResult(res, result);
  } catch (err) {
    logger.error('Failed to list social accounts:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to list accounts' });
  }
});

router.post('/connect/:platform', async (req, res) => {
  const { platform } = req.params;

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({
      success: false,
      message: `Platform "${platform}" not supported. Use: ${SUPPORTED_PLATFORMS.join(', ')}`,
    });
  }

  if (DIRECT_API_PLATFORMS.includes(platform)) {
    return res.status(501).json({ success: false, message: NEXTDOOR_DIRECT_API_MESSAGE });
  }

  try {
    const result = await postiz.getOAuthUrl(platform);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    logger.info(`[AUDIT] Admin ${req.user.id} initiated ${platform} OAuth connection`);
    return res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error(`Failed to get OAuth URL for ${platform}:`, err.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate connection' });
  }
});

router.delete('/accounts/:integrationId', async (req, res) => {
  try {
    const result = await postiz.disconnectAccount(req.params.integrationId);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    logger.info(`[AUDIT] Admin ${req.user.id} disconnected integration ${req.params.integrationId}`);
    return res.json({ success: true, message: 'Account disconnected' });
  } catch (err) {
    logger.error('Failed to disconnect account:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to disconnect' });
  }
});

router.post('/compliance-check', (req, res) => {
  const { content, isAIGenerated } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, message: 'content is required' });
  }

  const result = checkCompliance(content, !!isAIGenerated);
  return res.json({ success: true, data: result });
});

router.post('/publish', async (req, res) => {
  const { content, platformIds, mediaUrl, scheduledAt, isAIGenerated } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, message: 'content is required' });
  }
  if (!platformIds || !Array.isArray(platformIds) || platformIds.length === 0) {
    return res.status(400).json({ success: false, message: 'platformIds array is required' });
  }

  const compliance = checkCompliance(content, !!isAIGenerated);
  const finalContent = compliance.autoTags.length > 0
    ? `${content}\n\n${compliance.autoTags.join(' ')}`
    : content;

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
      `to ${platformIds.length} platform(s)${compliance.warnings.length ? ' with compliance warnings' : ''}`,
    );

    return res.json({
      success: true,
      data: result.data,
      compliance: {
        warnings: compliance.warnings,
        autoTags: compliance.autoTags,
      },
    });
  } catch (err) {
    logger.error('Failed to publish social post:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to publish' });
  }
});

router.get('/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  try {
    const result = await postiz.getPostHistory(limit);
    return sendPostizResult(res, result);
  } catch (err) {
    logger.error('Failed to fetch post history:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

router.get('/posts/:postId', async (req, res) => {
  try {
    const result = await postiz.getPostStatus(req.params.postId);
    return sendPostizResult(res, result);
  } catch (err) {
    logger.error('Failed to fetch post status:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
});

router.get('/calendar-suggestions', (_req, res) => {
  try {
    return res.json({ success: true, data: getCalendarSuggestions() });
  } catch (err) {
    logger.error('Calendar suggestions error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate suggestions' });
  }
});

router.get('/best-times', (_req, res) => {
  try {
    return res.json({ success: true, data: getBestTimes() });
  } catch (err) {
    logger.error('Best times error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load best times' });
  }
});

router.get('/auto-post-templates', async (_req, res) => {
  try {
    return res.json({ success: true, data: await getAutoPostTemplates() });
  } catch (err) {
    logger.error('Auto-post templates error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
});

export default router;
