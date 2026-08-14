/**
 * ============================================================================
 * FILE: preKeyFetchRateLimit.test.mjs
 * PURPOSE: Prove GET /api/encryption/keys/:userId cannot be looped to drain a
 *          target's one-time prekey pool — and that the limit does NOT punish a
 *          user who legitimately messages many people.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-14
 * ============================================================================
 *
 * THE THREAT
 * `keyStoreService.mjs::fetchKeyBundle` marks one of the target's one-time
 * prekeys `isUsed` on EVERY call. Unlimited, any authenticated account drains
 * another user's pool. Severity is LOW by design — Signal degrades to the signed
 * prekey and messaging still works, the loss is that first message's extra
 * forward secrecy — but it is a real unbounded write driven by an attacker.
 *
 * WHY THE PER-PAIR TEST IS THE IMPORTANT ONE
 * A limiter keyed on the actor ALONE would stop the attack and break the product:
 * a user opening a large group chat fetches many bundles at once, and would be
 * throttled for talking to too many people. A limiter keyed on IP would throttle
 * a whole gym behind one NAT while an attacker just rotates egress. Only the
 * (actor, target) pair separates "drain one victim" from "message many friends",
 * so the third test below is what actually pins the design — the 429 test alone
 * would pass on both the correct limiter and a badly-scoped one.
 *
 * Distinct id pairs per test: the limiter's memory store is module-level and
 * shared across requests in this process, so reusing a pair would leak counts
 * between tests and make later assertions depend on earlier ones.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchKeyBundle: vi.fn(),
  getPreKeyCount: vi.fn(async () => 100),
  isE2EEEnabled: vi.fn(async () => true),
  uploadKeyBundle: vi.fn(),
  deactivateE2EE: vi.fn(),
  generateSafetyNumber: vi.fn(),
}));

vi.mock('../../services/encryption/keyStoreService.mjs', () => mocks);
vi.mock('../../services/encryption/encryptionService.mjs', () => ({
  isEncryptionEnabled: () => true,
}));

let currentUser = { id: 1001, role: 'client' };
vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authenticateToken: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

const encryptionRoutes = (await import('../../routes/encryptionRoutes.mjs')).default;

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/encryption', encryptionRoutes);
  return a;
}

const fetchBundle = (targetId) => request(app()).get(`/api/encryption/keys/${targetId}`);

const LIMIT = 20; // preKeyFetchLimiter max, per (actor, target), per hour

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchKeyBundle.mockResolvedValue({
    identityPublicKey: 'ipk', signedPreKeyId: 1, signedPreKeyPublic: 'spk',
    signedPreKeySignature: 'sig', registrationId: 7, deviceId: 1,
    oneTimePreKey: { preKeyId: 3, publicKey: 'otpk' },
  });
});

describe('prekey pool cannot be drained by looping the bundle endpoint', () => {
  it('CONTROL — a normal fetch succeeds and reaches the service', async () => {
    // Without this, every assertion below would also pass against a route that
    // is simply broken, or a limiter set to zero.
    currentUser = { id: 2001, role: 'client' };
    const res = await fetchBundle(3001);

    expect(res.status).toBe(200);
    expect(mocks.fetchKeyBundle).toHaveBeenCalledWith(3001);
  });

  it('the burst that would drain a pool is cut off with 429', async () => {
    currentUser = { id: 2002, role: 'client' };
    const target = 3002;

    const statuses = [];
    for (let i = 0; i < LIMIT + 3; i += 1) {
      statuses.push((await fetchBundle(target)).status);
    }

    expect(statuses.slice(0, LIMIT).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(LIMIT).every((s) => s === 429)).toBe(true);
  });

  it('a throttled attacker stops CONSUMING prekeys, not just stops getting 200s', async () => {
    // The point of the limit is the write, not the response code. If the limiter
    // sat AFTER the handler, the pool would still drain while the caller saw 429.
    currentUser = { id: 2003, role: 'client' };
    const target = 3003;

    for (let i = 0; i < LIMIT; i += 1) await fetchBundle(target);
    const callsBefore = mocks.fetchKeyBundle.mock.calls.length;

    const blocked = await fetchBundle(target);

    expect(blocked.status).toBe(429);
    expect(mocks.fetchKeyBundle.mock.calls.length).toBe(callsBefore);
  });

  it('THE DESIGN TEST — exhausting one target does not throttle a different target', async () => {
    // A limiter keyed on the actor alone would fail here, and would mean a user
    // opening a large group chat gets locked out for talking to too many people.
    currentUser = { id: 2004, role: 'client' };

    for (let i = 0; i < LIMIT + 1; i += 1) await fetchBundle(3004);
    expect((await fetchBundle(3004)).status).toBe(429);

    const otherTarget = await fetchBundle(3005);
    expect(otherTarget.status).toBe(200);
  });

  it('a different actor is not punished for the first actor\'s burst', async () => {
    // The mirror of the above: keying that collapsed the actor would let one
    // abusive account deny the endpoint to everyone else fetching that target.
    const target = 3006;
    currentUser = { id: 2005, role: 'client' };
    for (let i = 0; i < LIMIT + 1; i += 1) await fetchBundle(target);
    expect((await fetchBundle(target)).status).toBe(429);

    currentUser = { id: 2006, role: 'client' };
    expect((await fetchBundle(target)).status).toBe(200);
  });

  it('the limiter runs AFTER auth, so it cannot be primed by an unauthenticated flood', async () => {
    // keyGenerator prefers req.user.id; protect is mounted before the limiter on
    // this route. This pins the ordering — if the limiter were moved ahead of
    // protect, the key would fall back to IP and the pair-scoping would be lost.
    const routeSource = (await import('node:fs')).readFileSync(
      new URL('../../routes/encryptionRoutes.mjs', import.meta.url), 'utf8',
    );
    expect(routeSource).toMatch(/router\.get\(\s*'\/keys\/:userId',\s*protect,\s*preKeyFetchLimiter/);
  });
});
