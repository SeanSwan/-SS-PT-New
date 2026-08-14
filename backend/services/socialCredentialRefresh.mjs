/**
 * SERVICE: social credential refresh
 * ==================================
 * Everything to do with rotating an expired provider session, split out of
 * socialPublishFanOut so both files stay under the 300-line rule. The fan-out
 * decides WHETHER to refresh and what a failure means for the post; this module
 * owns the mechanics of doing it safely when more than one publish wants to.
 *
 * The rule that shapes this file: AT Protocol refresh tokens are SINGLE USE.
 * Two publishes to one account in the same window will both present the same
 * refreshJwt unless something stops them, and the loser of that race cannot
 * tell "this account is dead" apart from "someone refreshed it a millisecond
 * ago". Getting that distinction wrong demotes a healthy account and blocks
 * every later publish, so both defences here exist for it:
 *
 *  - in-process single-flight, which covers concurrency inside one instance,
 *  - a re-read of stored credentials on failure, which covers the second
 *    instance that single-flight cannot see.
 *
 * @module socialCredentialRefresh
 */

import logger from '../utils/logger.mjs';

const getPlain = row => (row?.get ? row.get({ plain: true }) : row);
const toBuffer = value => (Buffer.isBuffer(value) ? value : Buffer.from(value || ''));

/**
 * An auth-class failure means the stored credential no longer works, and no
 * retry of the same credential will change that.
 *
 * Deliberately narrow: a rate limit or a network blip is not a broken
 * connection, and treating those as auth failures would make Sean reconnect a
 * working account for no reason.
 */
export const AUTH_FAILURE = /\b(401|403)\b|expiredtoken|invalidtoken|authentication|unauthorized|invalid_?grant/i;

/** A refresh is worth attempting only for an auth failure we can actually act on. */
export const canRefresh = (err, adapter, credentials) => AUTH_FAILURE.test(err?.message || '')
  && typeof adapter?.refreshSession === 'function'
  && Boolean(credentials?.refreshJwt);

export function createCredentialRefresher({ AccountModel, decryptCredentials, encryptCredentials }) {
  /**
   * Store rotated credentials. Best-effort ON PURPOSE: at this point we already
   * hold a working access token in memory, so a storage failure must not lose
   * the post. The cost of not persisting is that the next publish refreshes
   * again, which is harmless; the cost of throwing here would be a post that
   * never went out because of a bookkeeping problem.
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
   * Re-read an account's stored credentials.
   *
   * The point is to find out whether SOMEONE ELSE rotated the token while we
   * were failing to. Returns null when nothing usable is stored or the store is
   * unavailable — a read problem must never masquerade as a rotation.
   */
  const readStoredCredentials = async (accountId) => {
    try {
      const row = await AccountModel.findByPk(accountId);
      if (!row) return null;
      const account = getPlain(row);
      if (!account.credentialCipher) return null;
      return decryptCredentials({
        cipher: toBuffer(account.credentialCipher),
        iv: toBuffer(account.credentialIv),
        tag: toBuffer(account.credentialTag),
        keyId: account.credentialKeyId,
      });
    } catch {
      return null;
    }
  };

  const performRefresh = async (account, credentials, adapter) => {
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
      // A failed refresh is only conclusive if the credential we presented is
      // still the stored one. Another process — a second Render instance, which
      // the single-flight map below cannot see — may have rotated it a moment
      // ago, in which case this failure means "you used a superseded token",
      // not "this account is dead". Demoting on that would be a false alarm.
      const stored = await readStoredCredentials(account.id);
      if (stored?.refreshJwt && stored.refreshJwt !== credentials.refreshJwt) {
        logger.info(`[social-publish] account ${account.id} was refreshed elsewhere; using the stored credentials`);
        return stored;
      }
      throw reconnect(err.message);
    }
    if (!session?.accessJwt) throw reconnect('refresh returned no access token');

    // Merge field-by-field rather than spreading the whole session: a provider
    // that omits an optional field (handle, did) would otherwise overwrite a
    // good stored value with undefined. The rotated refreshJwt is the one that
    // matters — AT Protocol issues a NEW one, and keeping the old leaves the
    // account unable to refresh at the next expiry.
    const rotated = { ...credentials };
    for (const field of ['accessJwt', 'refreshJwt', 'serviceUrl', 'did', 'handle']) {
      if (session[field]) rotated[field] = session[field];
    }

    await persistCredentials(account.id, rotated);
    return rotated;
  };

  /**
   * One refresh per account at a time; everyone waiting shares its result.
   *
   * Keyed by account id and cleared on settle, so this serializes concurrent
   * refreshes for one account without holding a lock across unrelated ones.
   */
  const refreshInFlight = new Map();

  /**
   * Refresh a provider session and hand back usable credentials.
   *
   * Throws a `reconnectRequired` error when the refresh itself fails, because
   * "your connection expired, reconnect it" is a different problem for Sean
   * than "the post did not go out" — reporting the former as the latter sends
   * him hunting for a publishing bug that does not exist.
   */
  const refreshCredentials = async (account, credentials, adapter) => {
    const key = String(account.id);
    const existing = refreshInFlight.get(key);
    // Someone is already refreshing this exact account: their result is the one
    // that will be stored, so waiting for it beats racing it against a token
    // that only one of us can spend.
    if (existing) return existing;

    const attempt = performRefresh(account, credentials, adapter);
    refreshInFlight.set(key, attempt);
    try {
      return await attempt;
    } finally {
      refreshInFlight.delete(key);
    }
  };

  return { refreshCredentials, persistCredentials, readStoredCredentials };
}
