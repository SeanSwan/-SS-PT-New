/**
 * SERVICE: social publish fan-out
 * ===============================
 * The per-account publish loop, split out of nativeSocialPublishingService so
 * both files stay under the 300-line rule. This is the half that talks to real
 * platforms and decides what actually happened; the parent owns accounts, jobs
 * and scheduling.
 *
 * Every guard in here is a reproduced failure, not a precaution:
 *  - one unusable account must not abort the publish for every other platform,
 *  - a failed attempt-record must not rewrite the publish outcome, and
 *  - an auth rejection must demote the account so the UI stops claiming it is
 *    connected, while a rate limit must NOT (that is not a broken connection).
 *
 * @module socialPublishFanOut
 */

import logger from '../utils/logger.mjs';

const getPlain = row => (row?.get ? row.get({ plain: true }) : row);
const toBuffer = value => (Buffer.isBuffer(value) ? value : Buffer.from(value || ''));

export function createSocialPublishFanOut({
  AccountModel,
  AttemptModel,
  providerAdapters,
  decryptCredentials,
}) {
/**
 * A publish attempt against an account that is not connected is a per-account
 * failure, NOT a batch failure. This used to throw, and because the loads run
 * under Promise.all a single unusable account aborted the publish for EVERY
 * other platform before any of them was tried. That became far more reachable
 * once auth failures started demoting accounts to 'needs_reconnect' below, so
 * it is returned as an unavailable marker and recorded per-account instead.
 *
 * A genuinely missing id still throws: that is a malformed request, not a
 * degraded connection.
 */
const loadAccounts = async (ids) => Promise.all(ids.map(async (id) => {
  const row = await AccountModel.findByPk(id);
  if (!row) throw new Error(`Social account ${id} not found`);
  const account = getPlain(row);
  if (account.status !== 'connected') {
    return { ...account, unavailableReason: `Social account ${id} is not connected (status: ${account.status})` };
  }
  return account;
}));

/**
 * An auth-class failure means the stored credential no longer works, and no
 * retry of the same credential will change that. Record it on the account so
 * the UI can stop asserting "connected" — before this, SocialPublishingAccount
 * had no update path at all, so an expired token displayed as healthy forever
 * while every publish 401'd.
 *
 * Deliberately narrow: a rate limit or a network blip is not a broken
 * connection, and demoting on those would make Sean reconnect for no reason.
 */
const AUTH_FAILURE = /\b(401|403)\b|expiredtoken|invalidtoken|authentication|unauthorized|invalid_?grant/i;

const markAccountUnhealthy = async (accountId, reason) => {
  try {
    const row = await AccountModel.findByPk(accountId);
    if (row) await row.update({ status: 'needs_reconnect', lastError: reason });
  } catch {
    // Never let health bookkeeping turn a reported publish outcome into a 500.
  }
};

const publishToAccounts = async ({ content, accountIds, mediaUrl, jobId = null }) => {
  const accounts = await loadAccounts(accountIds);
  const results = [];

  // Recording an attempt must never abort the fan-out. These writes were
  // unguarded: a DB hiccup on the success-path write threw into the catch
  // below, whose own write then threw again and propagated out of the loop —
  // so the remaining platforms were never tried and a post that DID go out
  // surfaced as a 500. The attempt row is the record of the publish, not the
  // publish itself; losing the record must not rewrite the outcome.
  const recordAttempt = async (payload) => {
    try {
      await AttemptModel.create(payload);
    } catch (err) {
      logger.error(`[social-publish] failed to record attempt for account ${payload.accountId}: ${err.message}`);
    }
  };

  for (const account of accounts) {
    if (account.unavailableReason) {
      await recordAttempt({ jobId, accountId: account.id, provider: account.provider, status: 'failed', error: account.unavailableReason });
      results.push({ provider: account.provider, accountId: account.id, status: 'failed', error: account.unavailableReason });
      continue;
    }

    const adapter = providerAdapters[account.provider];
    if (!adapter?.publish) {
      const error = `${account.provider} native publishing is not enabled yet`;
      await recordAttempt({ jobId, accountId: account.id, provider: account.provider, status: 'failed', error });
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
      await recordAttempt({
        jobId,
        accountId: account.id,
        provider: account.provider,
        status: 'published',
        providerPostId: result.providerPostId || null,
        response: result.raw || result,
      });
      // Normalize the shape so every entry carries provider AND status even if
      // a future adapter forgets one — the per-platform report depends on both.
      results.push({ provider: account.provider, status: 'published', ...result, accountId: account.id });
    } catch (err) {
      await recordAttempt({ jobId, accountId: account.id, provider: account.provider, status: 'failed', error: err.message });
      results.push({ provider: account.provider, accountId: account.id, status: 'failed', error: err.message });
      if (AUTH_FAILURE.test(err.message || '')) {
        await markAccountUnhealthy(account.id, err.message);
      }
    }
  }

  const failures = results.filter(result => result.status !== 'published');
  return {
    status: failures.length === 0 ? 'published' : failures.length === results.length ? 'failed' : 'partial_failed',
    results,
  };
};
  return { loadAccounts, publishToAccounts, markAccountUnhealthy };
}
