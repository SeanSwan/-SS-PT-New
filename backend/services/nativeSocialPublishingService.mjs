/**
 * SERVICE: Native Social Publishing
 * SwanStudios-owned social publishing foundation. Postiz can remain optional,
 * but publishing no longer depends on a paid aggregator service.
 */

import { Op } from 'sequelize';
import SocialPublishingAccount from '../models/SocialPublishingAccount.mjs';
import SocialPublishingJob from '../models/SocialPublishingJob.mjs';
import SocialPublishingAttempt from '../models/SocialPublishingAttempt.mjs';
import {
  decryptSocialCredentials,
  encryptSocialCredentials,
  isSocialTokenCipherConfigured,
} from './socialTokenCipher.mjs';
import blueskyAdapter from './socialProviders/blueskyPublisher.mjs';
import { createSocialPublishFanOut } from './socialPublishFanOut.mjs';
import { createSocialJobRetry } from './socialJobRetry.mjs';
import logger from '../utils/logger.mjs';

export { PROVIDER_CAPABILITIES } from './socialProviderCapabilities.mjs';
import { PROVIDER_CAPABILITIES } from './socialProviderCapabilities.mjs';

const POSTIZ_OPTIONAL = {
  optional: true,
  configured: Boolean(process.env.POSTIZ_API_URL && process.env.POSTIZ_API_KEY),
  message: 'Postiz is optional. SwanStudios native publishing is the primary path.',
};

const getPlain = row => (row?.get ? row.get({ plain: true }) : row);
const toBuffer = value => (Buffer.isBuffer(value) ? value : Buffer.from(value || ''));

const serializeAccount = (row) => {
  const account = getPlain(row);
  return {
    id: String(account.id),
    platform: account.provider,
    provider: account.provider,
    name: account.displayName || account.handle || account.provider,
    profile: account.handle || null,
    status: account.status,
    native: true,
    capabilities: account.capabilities || {},
    disabled: account.status !== 'connected',
  };
};

const serializeJob = (row) => {
  const job = getPlain(row);
  return {
    id: String(job.id),
    content: job.content,
    status: job.status,
    scheduledAt: new Date(job.scheduledAt).toISOString(),
    platformAccountIds: job.platformAccountIds || [],
    platformResults: job.platformResults || [],
    publishedAt: job.publishedAt ? new Date(job.publishedAt).toISOString() : null,
    failedAt: job.failedAt ? new Date(job.failedAt).toISOString() : null,
    failureReason: job.failureReason || null,
  };
};

export function createNativeSocialPublishingService({
  AccountModel = SocialPublishingAccount,
  JobModel = SocialPublishingJob,
  AttemptModel = SocialPublishingAttempt,
  providerAdapters = { bluesky: blueskyAdapter },
  encryptCredentials = encryptSocialCredentials,
  decryptCredentials = decryptSocialCredentials,
  isCredentialStoreReady = isSocialTokenCipherConfigured,
} = {}) {
  const listAccounts = async () => {
    const rows = await AccountModel.findAll({ order: [['provider', 'ASC'], ['createdAt', 'ASC']] });
    return rows.map(serializeAccount);
  };

  const getHealth = async () => {
    const baseHealth = {
      mode: 'native',
      postiz: POSTIZ_OPTIONAL,
      encryption: isCredentialStoreReady(),
      providers: PROVIDER_CAPABILITIES,
      scheduler: {
        enabled: process.env.MARKETING_PUBLISHER_WORKER_ENABLED !== 'false',
        intervalMs: Number(process.env.MARKETING_PUBLISHER_WORKER_INTERVAL_MS || 60000),
      },
    };

    try {
      const accounts = await listAccounts();
      return {
        ...baseHealth,
        configured: true,
        accountCount: accounts.length,
        storage: { ok: true },
      };
    } catch {
      return {
        ...baseHealth,
        configured: false,
        accountCount: 0,
        storage: {
          ok: false,
          message: 'Social publishing account storage is unavailable',
        },
      };
    }
  };

  const connectBluesky = async (payload, { userId } = {}) => {
    const adapter = providerAdapters.bluesky;
    if (!adapter?.createSession) throw new Error('Bluesky adapter is not available');
    if (!isCredentialStoreReady()) {
      throw new Error(
        'Native credential encryption is not configured. Set SOCIAL_TOKEN_ENCRYPTION_KEY_ID and SOCIAL_TOKEN_ENCRYPTION_KEY_<ID> before connecting accounts.',
      );
    }

    const session = await adapter.createSession(payload);
    const encrypted = encryptCredentials({
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      serviceUrl: session.serviceUrl,
      did: session.did,
      handle: session.handle,
    });

    const row = await AccountModel.create({
      provider: 'bluesky',
      providerAccountId: session.did,
      handle: session.handle,
      displayName: session.handle,
      status: 'connected',
      capabilities: { text: true, media: false, scheduling: true },
      credentialCipher: encrypted.cipher,
      credentialIv: encrypted.iv,
      credentialTag: encrypted.tag,
      credentialKeyId: encrypted.keyId,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });
    return serializeAccount(row);
  };

  const deleteAccount = async (id) => {
    const row = await AccountModel.findByPk(id);
    if (!row) return false;
    await row.destroy();
    return true;
  };

  // The per-account publish loop lives in its own module (300-line rule). It is
  // constructed with the same injected models/adapters, so tests that inject
  // fakes into this service reach it unchanged.
  const { publishToAccounts } = createSocialPublishFanOut({
    AccountModel,
    AttemptModel,
    providerAdapters,
    decryptCredentials,
    // Needed so a refreshed session can be written back: the fan-out rotates
    // credentials on an auth failure, and an unstored refreshJwt leaves the
    // account unable to refresh at the next expiry.
    encryptCredentials,
  });

  // Retry lives in its own module (300-line rule) but shares this fan-out, so a
  // retry goes through exactly the same publish path as an original attempt.
  const { retryJob } = createSocialJobRetry({ JobModel, AttemptModel, publishToAccounts });


  const publish = async (payload, { userId, now = new Date(), source = 'dashboard' } = {}) => {
    const content = String(payload.content || '').trim();
    const accountIds = Array.isArray(payload.platformIds) ? payload.platformIds : [];
    if (!content) throw new Error('content is required');
    if (accountIds.length === 0) throw new Error('platformIds array is required');

    const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : now;
    if (Number.isNaN(scheduledAt.getTime())) throw new Error('scheduledAt must be a valid ISO date');

    if (scheduledAt.getTime() > now.getTime()) {
      const job = await JobModel.create({
        content,
        status: 'scheduled',
        scheduledAt,
        platformAccountIds: accountIds,
        media: payload.mediaUrl ? [{ url: payload.mediaUrl }] : [],
        complianceSnapshot: payload.compliance || {},
        source,
        createdBy: userId ?? null,
      });
      return { status: 'scheduled', jobId: String(job.id), data: serializeJob(job) };
    }

    // Immediate path. This MUST create a Job even though it publishes right now:
    // getHistory reads Jobs only, so without one an immediate post is invisible
    // forever, and every Attempt row it writes is orphaned because jobId
    // defaults to null.
    //
    // The status it is created in matters more than it looks. runDueJobs claims
    // `status: 'scheduled' AND scheduledAt <= now` — which is exactly the shape
    // of an immediate job — so creating it as 'scheduled' (the model default)
    // would let the 60s worker pick it up and publish it a SECOND time, to a
    // live account. It is created 'running' and moved to a terminal state below.
    const job = await JobModel.create({
      content,
      status: 'running',
      scheduledAt,
      platformAccountIds: accountIds,
      media: payload.mediaUrl ? [{ url: payload.mediaUrl }] : [],
      complianceSnapshot: payload.compliance || {},
      source,
      createdBy: userId ?? null,
    });

    let result;
    try {
      result = await publishToAccounts({ content, accountIds, mediaUrl: payload.mediaUrl, jobId: job.id });
    } catch (err) {
      // A throw out of the fan-out must still land the Job in a terminal state.
      // Otherwise this fix introduces a brand-new orphan class — a 'running' row
      // no reaper handles and no claim query will ever revisit.
      await job.update({
        status: 'failed',
        failedAt: new Date(),
        failureReason: err.message,
      }).catch(() => {});
      throw err;
    }

    await job.update({
      status: result.status,
      platformResults: result.results,
      publishedAt: result.status === 'published' ? now : null,
      failedAt: result.status !== 'published' ? now : null,
      failureReason: result.results.find(item => item.error)?.error || null,
    });

    return { ...result, jobId: String(job.id) };
  };

  const getHistory = async (limit = 20) => {
    // Ordered by creation, not by scheduledAt. Sorting a HISTORY view by
    // scheduledAt put a post scheduled for next week — which has not gone out at
    // all — above one published a minute ago. That was survivable while only
    // scheduled jobs existed here; now that immediate posts are recorded too, the
    // top row of "history" would routinely be something that never happened yet.
    // `id` is a tiebreak so the order is deterministic within a timestamp.
    const rows = await JobModel.findAll({ limit, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    return rows.map(serializeJob);
  };

  const getJob = async (id) => {
    const row = await JobModel.findByPk(id);
    return row ? serializeJob(row) : null;
  };

  const runDueJobs = async ({ now = new Date(), limit = 10 } = {}) => {
    const rows = await JobModel.findAll({
      where: { status: 'scheduled', scheduledAt: { [Op.lte]: now } },
      order: [['scheduledAt', 'ASC']],
      limit,
    });
    const processed = [];
    for (const row of rows) {
      const job = getPlain(row);
      await row.update({ status: 'running' });
      const result = await publishToAccounts({ content: job.content, accountIds: job.platformAccountIds || [], jobId: job.id });
      await row.update({
        status: result.status,
        platformResults: result.results,
        publishedAt: result.status === 'published' ? now : null,
        failedAt: result.status !== 'published' ? now : null,
        failureReason: result.results.find(item => item.error)?.error || null,
      });
      processed.push({ jobId: String(job.id), ...result });
    }
    return processed;
  };

  return {
    getHealth,
    listAccounts,
    connectBluesky,
    deleteAccount,
    publish,
    getHistory,
    getJob,
    runDueJobs,
    retryJob,
  };
}
export default createNativeSocialPublishingService();
