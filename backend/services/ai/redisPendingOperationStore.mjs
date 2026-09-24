/**
 * redisPendingOperationStore.mjs — the durable half of the approval-store seam
 * ============================================================================
 * Implements the pendingOperationStore contract (get / set / delete /
 * countForUser, all async) on Redis, so a destructive approval minted on
 * instance A can be confirmed on instance B and survives a deploy — the
 * operational half of the standing P0 (the key half died in S1).
 *
 * Design decisions, each traceable to a review finding:
 *   - ATOMIC CONSUMPTION rides on DEL's return value (1/0). The lane checks
 *     ownership + HMAC first, then calls delete(); of N racing confirms that all
 *     passed the checks, exactly one DEL returns 1 and only that caller
 *     executes. GET-then-DEL never decides consumption (S2 handoff trap #2).
 *   - Ownership is checked BEFORE any consumption in the lane, so a wrong user
 *     can never grief-consume someone else's approval (GLM 2.4). The op key is
 *     random-UUID-addressed; the per-user SET is an INDEX for counting, not an
 *     authorization surface.
 *   - countForUser answers from the per-user index (SMEMBERS ≤5 ids + EXISTS),
 *     never a keyspace scan (flash FF24). Dead ids are pruned opportunistically.
 *   - The client uses its OWN logical database (APPROVAL_STORE_REDIS_DB,
 *     default 1) so approval keys never share a failure/flush domain with the
 *     session store on db 0 (flash FF24 coupling finding).
 *   - `enableOfflineQueue: false` — if Redis dies mid-flight the approval lane
 *     errors loudly and the user re-issues; silently queueing an approval write
 *     into an outage would be the quiet version of the original defect.
 *
 * The ioredis client is INJECTED (createRedisPendingOperationStore(client)) so
 * tests drive the store through a documented-semantics fake; a live-Redis pass
 * of the same suite is the deploy-time verification (see the test file header).
 */
import { setPendingOperationStore } from './pendingOperationStore.mjs';

const OP_PREFIX = 'swan:approval:op:';
const USER_PREFIX = 'swan:approval:user:';
// The index outlives the ops slightly so counting never misses a live op.
const INDEX_TTL_SLACK_MS = 10_000;

/**
 * Build a store from any ioredis-compatible client. Commands used (the fake in
 * the test file implements exactly these, with real-Redis semantics):
 *   get, set(key, val, 'PX', ttl), del, sadd, srem, smembers, exists, pexpire
 */
export function createRedisPendingOperationStore(redis) {
  return {
    kind: 'redis',
    durable: true,

    get: async (id) => {
      const raw = await redis.get(OP_PREFIX + id);
      return raw ? JSON.parse(raw) : undefined;
    },

    set: async (id, op, ttlMs) => {
      const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? Math.floor(ttlMs) : 120_000;
      await redis.set(OP_PREFIX + id, JSON.stringify(op), 'PX', ttl);
      if (op?.createdBy != null) {
        const userKey = USER_PREFIX + op.createdBy;
        await redis.sadd(userKey, id);
        await redis.pexpire(userKey, ttl + INDEX_TTL_SLACK_MS);
      }
    },

    delete: async (id) => {
      // Learn the owner for index cleanup BEFORE the atomic DEL. If the GET and
      // the DEL race another consumer, DEL's return still decides ownership of
      // the consumption — the index SREM is idempotent bookkeeping either way.
      const raw = await redis.get(OP_PREFIX + id);
      const removed = (await redis.del(OP_PREFIX + id)) === 1;
      if (raw) {
        try {
          const { createdBy } = JSON.parse(raw);
          if (createdBy != null) await redis.srem(USER_PREFIX + createdBy, id);
        } catch { /* index cleanup only — never let it mask the delete result */ }
      }
      return removed;
    },

    countForUser: async (userId) => {
      const userKey = USER_PREFIX + userId;
      const ids = await redis.smembers(userKey);
      if (!ids || ids.length === 0) return 0;
      let count = 0;
      for (const id of ids) {
        if ((await redis.exists(OP_PREFIX + id)) === 1) {
          count += 1;
        } else {
          // TTL already reaped the op; prune the index entry it left behind.
          await redis.srem(userKey, id);
        }
      }
      return count;
    },
    // No entries()/values(): Redis owns expiry via PX — the in-process sweep
    // detects the absence and stands down (capability check, not kind check).
  };
}

/**
 * Build the dedicated ioredis client and install the store as the active seam.
 * Called from core/startup.mjs when APPROVAL_STORE=redis; throws on any failure
 * so the boot gate can fail CLOSED (an operator who asked for redis must never
 * silently get the in-process store back).
 */
export async function installRedisPendingOperationStore() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not set');
  }
  const { default: Redis } = await import('ioredis');
  const db = Number.parseInt(process.env.APPROVAL_STORE_REDIS_DB ?? '1', 10);
  const client = new Redis(process.env.REDIS_URL, {
    db: Number.isFinite(db) ? db : 1,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 10_000,
  });
  // Surface connection problems at boot, not at the first mint.
  await client.connect();
  await client.ping();
  setPendingOperationStore(createRedisPendingOperationStore(client));
  return client;
}
