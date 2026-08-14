/**
 * SERVICE: Native Social Publishing
 * SwanStudios-owned social publishing foundation. Postiz can remain optional,
 * but publishing no longer depends on a paid aggregator service.
 */

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
import { createSocialJobScheduler } from './socialJobScheduler.mjs';
import { createSocialImmediatePublish } from './socialImmediatePublish.mjs';

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

  // Scheduling and reaping share the atomic-claim idiom and are both driven by
  // the worker rather than by a request, so they live together in their own
  // module — same 300-line rule, same injected models.
  const { runDueJobs, reapStuckJobs } = createSocialJobScheduler({
    JobModel,
    AttemptModel,
    publishToAccounts,
  });


  // The request-driven publish paths live in their own module (300-line rule),
  // sharing this fan-out so an immediate post goes through exactly the same
  // provider path as a scheduled one.
  const { publish } = createSocialImmediatePublish({
    JobModel,
    publishToAccounts,
    serializeJob,
  });

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


  return {
    getHealth,
    listAccounts,
    connectBluesky,
    deleteAccount,
    publish,
    getHistory,
    getJob,
    runDueJobs,
    reapStuckJobs,
    retryJob,
  };
}
export default createNativeSocialPublishingService();
