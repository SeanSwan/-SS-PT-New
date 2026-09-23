/**
 * Access-Token Revocation Registry (E-06, hostile review fixing pass)
 * ===================================================================
 * generateAccessToken() embeds `tokenId: uuidv4()` with a docstring that
 * always promised "unique identifier for token revocation" — but no
 * registry existed, so logout() could only revoke the REFRESH token and a
 * stolen access token stayed valid until its own expiry (default 24h).
 *
 * Backend selection:
 *   REDIS_URL set   -> real Redis (shared across instances — the only
 *                      correct posture for multi-instance deploys)
 *   REDIS_URL unset -> per-process in-memory Map. Fine for dev and
 *                      single-instance; loudly warned about otherwise.
 *
 * FAILURE POSTURE: fail OPEN. An unavailable registry must not take down
 * every authenticated request — the token's own expiry remains the
 * backstop, exactly as it was before this service existed. Errors are
 * logged, never thrown into the request path. Writes are best-effort for
 * the same reason (a failed revoke during logout leaves the pre-existing
 * behaviour: token lives out its TTL).
 *
 * Entries self-expire at the token's own exp — the registry never grows
 * past the number of tokens revoked within one TTL window.
 */

import Redis from 'ioredis';
import logger from '../utils/logger.mjs';

const KEY_PREFIX = 'swan:revoked-at:';
const DEFAULT_TTL_SEC = 24 * 60 * 60; // matches the JWT_EXPIRES_IN default

let redisClient = null;
let redisReady = false;
let backend = 'memory';
let initPromise = null;

// tokenId -> expiresAtMs (in-memory backend)
const memoryStore = new Map();

async function init() {
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 600)),
      });
      client.on('error', (err) => {
        redisReady = false;
        logger.warn('[TokenRevocation] Redis error — revocation checks fail open until it recovers', { error: err.message });
      });
      client.on('ready', () => { redisReady = true; });
      await client.connect();
      redisClient = client;
      redisReady = true;
      backend = 'redis';
      logger.info('[TokenRevocation] Redis revocation registry active (shared across instances)');
      return;
    } catch (err) {
      logger.warn('[TokenRevocation] Redis unavailable — falling back to per-process registry', { error: err.message });
      try { redisClient?.disconnect(); } catch { /* best-effort */ }
      redisClient = null;
      redisReady = false;
    }
  } else {
    logger.warn('[TokenRevocation] REDIS_URL not set — access-token revocation is PER-PROCESS. Set REDIS_URL for multi-instance deployments.');
  }
  backend = 'memory';
}

function ensureInit() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

function ttlSecondsFromExp(expSec) {
  if (Number.isFinite(expSec)) {
    const remaining = Math.floor(expSec - Date.now() / 1000);
    return Math.max(1, remaining);
  }
  return DEFAULT_TTL_SEC;
}

/**
 * Revoke an access token by its tokenId until the token's own expiry.
 * Best-effort: returns false (and logs) if the store write failed.
 *
 * @param {string} tokenId - JWT tokenId claim
 * @param {number} [expSec] - JWT exp claim (seconds); defaults to 24h TTL
 * @returns {Promise<boolean>} true when the revocation was durably recorded
 */
export async function revokeAccessToken(tokenId, expSec) {
  if (!tokenId || typeof tokenId !== 'string') return false;
  try {
    await ensureInit();
    const ttlSec = ttlSecondsFromExp(expSec);

    if (backend === 'redis' && redisClient && redisReady) {
      await redisClient.set(KEY_PREFIX + tokenId, '1', 'EX', ttlSec);
      return true;
    }

    memoryStore.set(tokenId, Date.now() + ttlSec * 1000);
    return true;
  } catch (err) {
    logger.warn('[TokenRevocation] Revoke failed (best-effort) — token will live out its TTL', { error: err.message });
    return false;
  }
}

/**
 * Is this access token revoked? FAIL-OPEN: returns false on any store error.
 * @param {string} tokenId
 * @returns {Promise<boolean>}
 */
export async function isAccessTokenRevoked(tokenId) {
  if (!tokenId || typeof tokenId !== 'string') return false;
  try {
    await ensureInit();

    if (backend === 'redis' && redisClient && redisReady) {
      const hit = await redisClient.get(KEY_PREFIX + tokenId);
      return hit !== null;
    }

    const expiresAt = memoryStore.get(tokenId);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt) {
      memoryStore.delete(tokenId);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('[TokenRevocation] Revocation check failed open', { error: err.message });
    return false;
  }
}

/** Diagnostics / tests: which backend is active ('redis' | 'memory'). */
export function tokenRevocationBackend() {
  return backend;
}

export default { revokeAccessToken, isAccessTokenRevoked, tokenRevocationBackend };
