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
  encryptCredentials,
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

/**
 * Store rotated credentials. Best-effort ON PURPOSE: at this point we already
 * hold a working access token in memory, so a storage failure must not lose the
 * post. The cost of not persisting is that the next publish refreshes again,
 * which is harmless; the cost of throwing here would be a post that never went
 * out because of a bookkeeping problem.
 */
const persistCredentials = async (accountId, credentials) => {
  if (typeof encryptCredentials !== 'function') return;
  try {
    const encrypted = encryptCredentials(credentials);
    const row = await AccountModel.findByPk(accountId);
    if (row) {
      await row.update({
        credentialCipher: encrypted.cipher,
        credentialIv: encrypted.iv,
        credentialTag: encrypted.tag,
        credentialKeyId: encrypted.keyId,
      });
    }
  } catch (err) {
    logger.error(`[social-publish] failed to persist refreshed credentials for account ${accountId}: ${err.message}`);
  }
};

/**
 * Refresh a provider session and hand back usable credentials.
 *
 * Throws a `reconnectRequired` error when the refresh itself fails, because
 * "your connection expired, reconnect it" is a different problem for Sean than
 * "the post did not go out" — reporting the former as the latter sends him
 * hunting for a publishing bug that does not exist.
 */
const refreshCredentials = async (account, credentials, adapter) => {
  const reconnect = (detail) => {
    const err = new Error(
      `${account.provider} session expired and could not be refreshed — reconnect the account${detail ? ` (${detail})` : ''}`,
    );
    err.reconnectRequired = true;
    return err;
  };

  let session;
  try {
    session = await adapter.refreshSession({
      refreshJwt: credentials.refreshJwt,
      serviceUrl: credentials.serviceUrl,
    });
  } catch (err) {
    throw reconnect(err.message);
  }
  if (!session?.accessJwt) throw reconnect('refresh returned no access token');

  // Merge field-by-field rather than spreading the whole session: a provider
  // that omits an optional field (handle, did) would otherwise overwrite a good
  // stored value with undefined. The rotated refreshJwt is the one that matters
  // — AT Protocol issues a NEW one, and keeping the old leaves the account
  // unable to refresh at the next expiry.
  const rotated = { ...credentials };
  for (const field of ['accessJwt', 'refreshJwt', 'serviceUrl', 'did', 'handle']) {
    if (session[field]) rotated[field] = session[field];
  }

  await persistCredentials(account.id, rotated);
  return rotated;
};

/** A refresh is worth attempting only for an auth failure we can actually act on. */
const canRefresh = (err, adapter, credentials) => AUTH_FAILURE.test(err?.message || '')
  && typeof adapter.refreshSession === 'function'
  && Boolean(credentials?.refreshJwt);

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
      // One refresh-and-retry, and only one. `refreshBlueskySession` existed
      // with zero call sites, so an expired token simply killed the account.
      // The retry lives OUTSIDE this inner catch, so a credential that still
      // 401s after refreshing falls through to the outer catch and is demoted
      // rather than looping against the provider.
      let result;
      try {
        result = await adapter.publish({ account, credentials, content, mediaUrl });
      } catch (err) {
        if (!canRefresh(err, adapter, credentials)) throw err;
        const rotated = await refreshCredentials(account, credentials, adapter);
        result = await adapter.publish({ account, credentials: rotated, content, mediaUrl });
      }
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
      // `reconnectRequired` is set when a refresh was tried and failed, which
      // is conclusive: the stored credential cannot be recovered.
      if (err.reconnectRequired || AUTH_FAILURE.test(err.message || '')) {
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
