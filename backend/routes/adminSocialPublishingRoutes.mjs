/**
 * ROUTES: Admin Social Media Publishing
 * =====================================
 * Prefix: /api/admin/social-publishing
 * Auth: protect + adminOnly
 *
 * Owns social account connection, compliance checks, publish/schedule calls,
 * and planning helper endpoints for the admin Marketing command center.
 * Native SwanStudios provider adapters are primary; Postiz is optional.
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import nativePublisher, { PROVIDER_CAPABILITIES } from '../services/nativeSocialPublishingService.mjs';
import { checkCompliance } from '../services/complianceCheck.mjs';
import {
  getAutoPostTemplates,
  getBestTimes,
  getCalendarSuggestions,
} from '../services/socialPublishingPlanningService.mjs';
import { isSocialPublishingStorageUnavailableError } from '../services/socialPublishingStorageErrors.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const SUPPORTED_PLATFORMS = PROVIDER_CAPABILITIES.map(provider => provider.id);
const PROVIDER_BY_ID = new Map(PROVIDER_CAPABILITIES.map(provider => [provider.id, provider]));
const STORAGE_UNAVAILABLE_MESSAGE = 'Native social publishing storage is unavailable.';

const getAdminSafeConnectError = (err) => {
  const message = String(err?.message || '');
  if (message.startsWith('Native credential encryption is not configured.')) return message;
  if (message.startsWith('Bluesky session failed:')) return message;
  return 'Failed to initiate connection';
};

const getSchedulerStatus = () => ({
  enabled: process.env.MARKETING_PUBLISHER_WORKER_ENABLED !== 'false',
  intervalMs: Number(process.env.MARKETING_PUBLISHER_WORKER_INTERVAL_MS || 60000),
});

const buildStorageUnavailableStatus = () => ({
  ok: false,
  reason: 'storage_unavailable',
  message: STORAGE_UNAVAILABLE_MESSAGE,
});

const buildStorageUnavailableResponse = data => ({
  success: true,
  degraded: true,
  data,
  storage: buildStorageUnavailableStatus(),
  message: STORAGE_UNAVAILABLE_MESSAGE,
});

const buildStorageUnavailableHealth = () => buildStorageUnavailableResponse({
  mode: 'native',
  configured: false,
  accountCount: 0,
  providers: PROVIDER_CAPABILITIES,
  scheduler: getSchedulerStatus(),
  storage: buildStorageUnavailableStatus(),
});

router.use(protect, adminOnly);

router.get('/health', async (_req, res) => {
  try {
    const health = await nativePublisher.getHealth();
    return res.json({ success: true, data: health });
  } catch (err) {
    if (isSocialPublishingStorageUnavailableError(err)) {
      return res.json(buildStorageUnavailableHealth());
    }
    logger.error('Social publishing health check failed:', err.message);
    return res.status(500).json({ success: false, message: 'Health check failed' });
  }
});

router.get('/accounts', async (_req, res) => {
  try {
    return res.json({ success: true, data: await nativePublisher.listAccounts() });
  } catch (err) {
    if (isSocialPublishingStorageUnavailableError(err)) {
      return res.json(buildStorageUnavailableResponse([]));
    }
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

  try {
    if (platform === 'bluesky' && req.body?.identifier && req.body?.appPassword) {
      const account = await nativePublisher.connectBluesky(req.body, { userId: req.user?.id });
      logger.info(`[AUDIT] Admin ${req.user.id} connected native Bluesky account ${account.profile || account.id}`);
      return res.status(201).json({ success: true, data: account });
    }

    const provider = PROVIDER_BY_ID.get(platform);
    return res.status(platform === 'bluesky' ? 200 : 501).json({
      success: platform === 'bluesky',
      data: {
        platform,
        provider,
        connectionType: provider.connectionType,
        message: platform === 'bluesky'
          ? 'Submit identifier and appPassword to connect Bluesky natively.'
          : provider.notes,
      },
      message: provider.notes,
    });
  } catch (err) {
    logger.error(`Failed to connect ${platform}:`, err.message);
    return res.status(500).json({ success: false, message: getAdminSafeConnectError(err) });
  }
});

router.delete('/accounts/:integrationId', async (req, res) => {
  try {
    const deleted = await nativePublisher.deleteAccount(req.params.integrationId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Social account not found' });
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
    const result = await nativePublisher.publish({
      content: finalContent,
      platformIds,
      mediaUrl,
      scheduledAt,
      compliance,
    }, { userId: req.user?.id });

    logger.info(
      `[AUDIT] Admin ${req.user.id} ${scheduledAt ? 'scheduled' : 'published'} social post ` +
      `to ${platformIds.length} platform(s)${compliance.warnings.length ? ' with compliance warnings' : ''}`,
    );

    return res.json({
      success: true,
      data: result.data || result,
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
    return res.json({ success: true, data: await nativePublisher.getHistory(limit) });
  } catch (err) {
    if (isSocialPublishingStorageUnavailableError(err)) {
      return res.json(buildStorageUnavailableResponse([]));
    }
    logger.error('Failed to fetch post history:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

router.get('/posts/:postId', async (req, res) => {
  try {
    const job = await nativePublisher.getJob(req.params.postId);
    if (!job) return res.status(404).json({ success: false, message: 'Social post job not found' });
    return res.json({ success: true, data: job });
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
