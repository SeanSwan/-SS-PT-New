/**
 * redisPendingOperationStore — the P0's acceptance tests (blueprint 0.4)
 * =====================================================================
 * THE test this slice exists for: an approval minted on instance A confirms on
 * instance B. Two store objects share one backend — exactly the multi-instance
 * shape (the store layer holds NO per-process state; that property, not any
 * mock fidelity, is what the test proves).
 *
 * VERIFICATION HONESTY. These tests drive the store through a hand-written
 * fake implementing ONLY the eight commands the store uses, with real-Redis
 * semantics stated per command (PX expiry, DEL 1/0, set-of-strings). A fake
 * cannot prove ioredis wiring or server behavior — `ioredis-mock` was already
 * rejected in S2 as unfaithful, and no Redis server is reachable in this
 * environment. What remains open, and closes at deploy time with
 * APPROVAL_STORE=redis on a real REDIS_URL, is exactly:
 *   installRedisPendingOperationStore() connect/ping + live command dialect.
 * The store's LOGIC — atomic consumption, index counting, TTL discipline,
 * cross-instance reads — is fully exercised here.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  prepareDestructiveOperation,
  verifyAndRetrieveOperation,
} from '../../services/ai/destructiveOperations.mjs';
import {
  setPendingOperationStore,
  resetPendingOperationStore,
} from '../../services/ai/pendingOperationStore.mjs';
import { createRedisPendingOperationStore } from '../../services/ai/redisPendingOperationStore.mjs';

/**
 * Minimal Redis fake — real semantics for exactly the commands the store uses:
 * get → string|null · set(k,v,'PX',ttl) → 'OK' · del → 0|1 · exists → 0|1
 * sadd/srem → added/removed count · smembers → string[] · pexpire → 0|1
 * PX expiry is honored by timestamp on read paths (get/exists/smembers).
 */
function fakeRedis() {
  const strings = new Map(); // key -> { value, expiresAt|null }
  const sets = new Map();    // key -> { members:Set, expiresAt|null }
  const live = (entry) => entry && (entry.expiresAt === null || entry.expiresAt > Date.now());
  return {
    async get(k) { const e = strings.get(k); if (!live(e)) { strings.delete(k); return null; } return e.value; },
    async set(k, v, px, ttl) {
      strings.set(k, { value: v, expiresAt: px === 'PX' ? Date.now() + Number(ttl) : null });
      return 'OK';
    },
    async del(k) { const e = strings.get(k); strings.delete(k); return live(e) ? 1 : 0; },
    async exists(k) { const e = strings.get(k); if (!live(e)) { strings.delete(k); return 0; } return 1; },
    async sadd(k, m) {
      const s = sets.get(k) ?? { members: new Set(), expiresAt: null };
      const before = s.members.size; s.members.add(String(m)); sets.set(k, s);
      return s.members.size - before;
    },
    async srem(k, m) { const s = sets.get(k); if (!s) return 0; return s.members.delete(String(m)) ? 1 : 0; },
    async smembers(k) { const s = sets.get(k); if (!s || !live(s)) { sets.delete(k); return []; } return [...s.members]; },
    async pexpire(k, ttl) { const s = sets.get(k); if (!s) return 0; s.expiresAt = Date.now() + Number(ttl); return 1; },
  };
}

const OWNER = 7001;

function mintArgs(overrides = {}) {
  return {
    type: 'DELETE',
    endpoint: '/api/sessions/:id',
    commandType: 'cancel_session',
    commandParams: { id: 184 },
    userId: OWNER,
    description: 'Cancel session 184',
    affectedRecords: [{ id: 184 }],
    ...overrides,
  };
}

afterEach(() => resetPendingOperationStore());

describe('redis approval store — the P0 acceptance (0.4)', () => {
  it('THE P0 TEST: minted on instance A, confirmed on instance B', async () => {
    const backend = fakeRedis();
    const instanceA = createRedisPendingOperationStore(backend);
    const instanceB = createRedisPendingOperationStore(backend);

    setPendingOperationStore(instanceA);
    const pending = await prepareDestructiveOperation(mintArgs());

    // "Deploy": a different process object, same Redis.
    setPendingOperationStore(instanceB);
    const result = await verifyAndRetrieveOperation(pending.operationId, OWNER);

    expect(result.verified).toBe(true);
    expect(result.operation.description).toBe('Cancel session 184');
  });

  it('two racing confirms: exactly one wins (delete-return atomicity)', async () => {
    const backend = fakeRedis();
    setPendingOperationStore(createRedisPendingOperationStore(backend));
    const pending = await prepareDestructiveOperation(mintArgs());

    const [r1, r2] = await Promise.all([
      verifyAndRetrieveOperation(pending.operationId, OWNER),
      verifyAndRetrieveOperation(pending.operationId, OWNER),
    ]);
    const wins = [r1, r2].filter((r) => r.verified);
    expect(wins).toHaveLength(1);
  });

  it('per-user cap counts from the index, and TTL-reaped ops stop counting', async () => {
    const backend = fakeRedis();
    const store = createRedisPendingOperationStore(backend);
    setPendingOperationStore(store);

    for (let i = 0; i < 5; i += 1) {
      await prepareDestructiveOperation(mintArgs({ commandParams: { id: 900 + i } }));
    }
    expect(await store.countForUser(OWNER)).toBe(5);
    await expect(prepareDestructiveOperation(mintArgs({ commandParams: { id: 999 } })))
      .rejects.toThrow(/Too many pending/i);

    // Simulate the TTL reaping one op key (the index entry outlives it briefly).
    const ids = await backend.smembers('swan:approval:user:' + OWNER);
    await backend.del('swan:approval:op:' + ids[0]);
    expect(await store.countForUser(OWNER)).toBe(4);
    // ...and the dead index entry was pruned opportunistically.
    expect((await backend.smembers('swan:approval:user:' + OWNER)).length).toBe(4);
  });

  it('cross-user confirm neither succeeds NOR consumes the op on the shared backend', async () => {
    const backend = fakeRedis();
    setPendingOperationStore(createRedisPendingOperationStore(backend));
    const pending = await prepareDestructiveOperation(mintArgs());

    const stolen = await verifyAndRetrieveOperation(pending.operationId, 6666);
    expect(stolen.verified).toBe(false);

    const owner = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(owner.verified).toBe(true);
  });

  it('store-level tamper on the shared backend is rejected by the HMAC (description is signed now)', async () => {
    const backend = fakeRedis();
    setPendingOperationStore(createRedisPendingOperationStore(backend));
    const pending = await prepareDestructiveOperation(mintArgs());

    // Tamper with the field the human READS, directly in "Redis".
    const key = 'swan:approval:op:' + pending.operationId;
    const stored = JSON.parse(await backend.get(key));
    stored.description = 'Cancel ALL sessions';
    await backend.set(key, JSON.stringify(stored), 'PX', 60000);

    const result = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
  });

  it('delete() cleans the per-user index alongside the op', async () => {
    const backend = fakeRedis();
    const store = createRedisPendingOperationStore(backend);
    setPendingOperationStore(store);
    const pending = await prepareDestructiveOperation(mintArgs());

    expect(await store.delete(pending.operationId)).toBe(true);
    expect(await store.delete(pending.operationId)).toBe(false); // consumed once
    expect(await store.countForUser(OWNER)).toBe(0);
  });
});
