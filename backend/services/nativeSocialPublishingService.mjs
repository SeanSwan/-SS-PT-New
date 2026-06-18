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

export const PROVIDER_CAPABILITIES = [
  {
    id: 'bluesky',
    name: 'Bluesky',
    native: true,
    implementationStatus: 'available',
    connectionType: 'app_password',
    notes: 'Uses AT Protocol app-password login and com.atproto.repo.createRecord.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    native: true,
    implementationStatus: 'oauth_required',
    connectionType: 'google_oauth',
    notes: 'Requires Google OAuth client and YouTube Data API quota.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    native: true,
    implementationStatus: 'oauth_required',
    connectionType: 'meta_oauth',
    notes: 'Requires Meta app review and Page publishing permissions.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    native: true,
    implementationStatus: 'oauth_required',
    connectionType: 'meta_oauth',
    notes: 'Requires Instagram professional account and Meta publishing permissions.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    native: true,
    implementationStatus: 'approval_required',
    connectionType: 'tiktok_oauth',
    notes: 'Direct Post requires TikTok Content Posting API approval.',
  },
  {
    id: 'nextdoor',
    name: 'Nextdoor',
    native: true,
    implementationStatus: 'partner_required',
    connectionType: 'partner_api',
    notes: 'Publish API requires Nextdoor developer/partner approval.',
  },
];

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

  const loadAccounts = async (ids) => Promise.all(ids.map(async (id) => {
    const row = await AccountModel.findByPk(id);
    if (!row) throw new Error(`Social account ${id} not found`);
    const account = getPlain(row);
    if (account.status !== 'connected') throw new Error(`Social account ${id} is not connected`);
    return account;
  }));

  const publishToAccounts = async ({ content, accountIds, mediaUrl, jobId = null }) => {
    const accounts = await loadAccounts(accountIds);
    const results = [];

    for (const account of accounts) {
      const adapter = providerAdapters[account.provider];
      if (!adapter?.publish) {
        const error = `${account.provider} native publishing is not enabled yet`;
        await AttemptModel.create({ jobId, accountId: account.id, provider: account.provider, status: 'failed', error });
        results.push({ provider: account.provider, accountId: account.id, status: 'failed', error });
        continue;
      }

      try {
        const credentials = decryptCredentials({
          cipher: toBuffer(account.credentialCipher),
          iv: toBuffer(account.credentialIv),
          tag: toBuffer(account.credentialTag),
          keyId: account.credentialKeyId,
        });
        const result = await adapter.publish({ account, credentials, content, mediaUrl });
        await AttemptModel.create({
          jobId,
          accountId: account.id,
          provider: account.provider,
          status: 'published',
          providerPostId: result.providerPostId || null,
          response: result.raw || result,
        });
        results.push({ accountId: account.id, ...result });
      } catch (err) {
        await AttemptModel.create({ jobId, accountId: account.id, provider: account.provider, status: 'failed', error: err.message });
        results.push({ provider: account.provider, accountId: account.id, status: 'failed', error: err.message });
      }
    }

    const failures = results.filter(result => result.status !== 'published');
    return {
      status: failures.length === 0 ? 'published' : failures.length === results.length ? 'failed' : 'partial_failed',
      results,
    };
  };

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

    return publishToAccounts({ content, accountIds, mediaUrl: payload.mediaUrl });
  };

  const getHistory = async (limit = 20) => {
    const rows = await JobModel.findAll({ limit, order: [['scheduledAt', 'DESC']] });
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
  };
}
export default createNativeSocialPublishingService();
