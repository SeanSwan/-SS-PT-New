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
import {
  getAdminSafeConnectError,
  getSchedulerStatus,
  buildStorageUnavailableResponse,
  buildStorageUnavailableHealth,
  STORAGE_UNAVAILABLE_MESSAGE,
} from './adminSocialPublishingHelpers.mjs';

const router = express.Router();
const SUPPORTED_PLATFORMS = PROVIDER_CAPABILITIES.map(provider => provider.id);
const PROVIDER_BY_ID = new Map(PROVIDER_CAPABILITIES.map(provider => [provider.id, provider]));

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
  const override = req.body.complianceOverride === true;

  // Fail-closed gate. Gate on `blocked`, NOT on `compliant`: `compliant` is
  // `warnings.length === 0`, and the checker raises a warning even when it has
  // already remedied the issue by appending #ad — so gating on `compliant`
  // would refuse nearly every promotional post. `blocked` is only true for
  // problems no automatic remedy exists for (medical claims, testimonials).
  if (compliance.blocked && !override) {
    logger.warn(
      `[AUDIT] Admin ${req.user.id} publish REFUSED by compliance gate ` +
      `(${compliance.blockers.length} blocker(s))`,
    );
    return res.status(422).json({
      success: false,
      status: 'blocked',
      message: 'Content did not pass the compliance gate and was not published.',
      compliance: {
        blocked: true,
        blockers: compliance.blockers,
        warnings: compliance.warnings,
        autoTags: compliance.autoTags,
      },
    });
  }

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

    // The service already derives the truthful outcome; the route's only job is
    // to report it faithfully. `success` is DERIVED here rather than assigned so
    // it cannot drift from `status` again — that drift was the original bug: a
    // publish where every platform failed answered `success: true`, and the
    // frontend cleared the composer on it, destroying the draft.
    const status = result.status || 'published';
    const success = status === 'published' || status === 'scheduled';

    logger.info(
      `[AUDIT] Admin ${req.user.id} publish outcome=${status} ` +
      `platforms=${platformIds.length}` +
      `${override ? ' complianceOverride=true' : ''}` +
      `${compliance.warnings.length ? ` warnings=${compliance.warnings.length}` : ''}`,
    );

    // Business outcomes are DATA, not transport: `failed` and `partial_failed`
    // return 200 with the truth in the body. Non-2xx is reserved for 400/422/500.
    // The frontend's handler is a bare `catch {}` that reports any rejection as
    // "Network error", and axios rejects non-2xx — so a 502 here would replace
    // one lie with a differently-worded one.
    return res.json({
      success,
      status,
      data: result.data || result,
      compliance: {
        blocked: compliance.blocked,
        overridden: override && compliance.blocked,
        blockers: compliance.blockers,
        warnings: compliance.warnings,
        autoTags: compliance.autoTags,
      },
    });
  } catch (err) {
    logger.error('Failed to publish social post:', err.message);
    return res.status(500).json({ success: false, status: 'error', message: 'Failed to publish' });
  }
});

/**
 * Re-publish only the accounts of an existing job that have not already
 * succeeded. Recovery from a partial failure has to live here rather than in
 * "press Publish again", because a fresh publish targets every selected account
 * and would re-post to the ones that already went out.
 *
 * Same truthful contract as /publish: the outcome is data, `success` is derived
 * from `status`, and 200 covers every business outcome.
 */
router.post('/publish/:jobId/retry', async (req, res) => {
  try {
    const result = await nativePublisher.retryJob(req.params.jobId, { userId: req.user?.id });
    const status = result.status || 'failed';
    const success = status === 'published' || status === 'scheduled';

    logger.info(
      `[AUDIT] Admin ${req.user.id} retry job=${req.params.jobId} outcome=${status} ` +
      `accounts=${(result.retried || []).length}`,
    );

    return res.json({ success, status, data: result });
  } catch (err) {
    if (/not found/i.test(err.message || '')) {
      return res.status(404).json({ success: false, status: 'not_found', message: 'Social publishing job not found' });
    }
    // A job that is still publishing is not a server fault, and reporting it as
    // one tells Sean the retry is broken when the correct advice is "wait".
    // The message is surfaced verbatim because it names what to do next.
    if (err.conflict) {
      return res.status(409).json({ success: false, status: 'conflict', message: err.message });
    }
    logger.error('Failed to retry social post:', err.message);
    return res.status(500).json({ success: false, status: 'error', message: 'Failed to retry' });
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
