/**
 * SCU S5 — Coach context cache.
 *
 * Exit T25: after a role or target change the cache must serve a NEW
 * authorized scope only — old aliases/data are never reused. The key binds
 * actor + target + role + access version + capability + private-mode flag;
 * forget and logout invalidate. Denied data never enters the payload, so the
 * boundary caches only ok/empty envelopes (asserted at the boundary; here the
 * cache API itself is exercised).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  coachContextCacheKey,
  getCachedCoachContext,
  setCachedCoachContext,
  invalidateCoachContextCache,
  clearCoachContextCache,
  coachContextCacheKeys,
} from '../../services/ai/coachContextCache.mjs';

const SCOPE = { actorId: 7, targetClientId: 42, role: 'trainer', accessVersion: 'v1', capability: 'coach_chat', privateMode: false };

beforeEach(() => {
  clearCoachContextCache();
});

describe('S5 coach context cache', () => {
  it('T25: a target change misses the old scope entirely', () => {
    const keyA = coachContextCacheKey(SCOPE);
    const keyB = coachContextCacheKey({ ...SCOPE, targetClientId: 55 });
    expect(keyA).not.toBe(keyB);
    setCachedCoachContext(keyA, { state: 'cached', findings: { recent_workout: { state: 'ok', payload: [{ title: 'A data' }] } } });
    expect(getCachedCoachContext(keyA)?.findings.recent_workout.payload[0].title).toBe('A data');
    // New target scope: nothing is reused from the old scope.
    expect(getCachedCoachContext(keyB)).toBeNull();
  });

  it('T25: a role change produces a different authorized scope', () => {
    const keyTrainer = coachContextCacheKey(SCOPE);
    const keyAdmin = coachContextCacheKey({ ...SCOPE, role: 'admin' });
    expect(keyTrainer).not.toBe(keyAdmin);
    setCachedCoachContext(keyTrainer, { state: 'cached', findings: {} });
    expect(getCachedCoachContext(keyAdmin)).toBeNull();
  });

  it('private-mode flag is part of the key (private scope never serves shared cache)', () => {
    const shared = coachContextCacheKey(SCOPE);
    const priv = coachContextCacheKey({ ...SCOPE, privateMode: true });
    expect(shared).not.toBe(priv);
    setCachedCoachContext(shared, { state: 'cached', findings: { x: { state: 'ok' } } });
    expect(getCachedCoachContext(priv)).toBeNull();
  });

  it('capability change misses (different capability = different budget scope)', () => {
    const a = coachContextCacheKey(SCOPE);
    const b = coachContextCacheKey({ ...SCOPE, capability: 'day_brief' });
    expect(a).not.toBe(b);
  });

  it('target switch invalidates only that actor/target scope', () => {
    const keyA = coachContextCacheKey(SCOPE);
    const keyOtherActor = coachContextCacheKey({ ...SCOPE, actorId: 9, targetClientId: 77 });
    setCachedCoachContext(keyA, { state: 'cached', findings: {} });
    setCachedCoachContext(keyOtherActor, { state: 'cached', findings: {} });
    const removed = invalidateCoachContextCache({ actorId: 7, targetClientId: 42 });
    expect(removed).toBe(1);
    expect(getCachedCoachContext(keyA)).toBeNull();
    expect(getCachedCoachContext(keyOtherActor)).not.toBeNull();
  });

  it('forget invalidates everything for the actor; logout (empty spec) clears all', () => {
    const k1 = coachContextCacheKey(SCOPE);
    const k2 = coachContextCacheKey({ ...SCOPE, targetClientId: 55 });
    const k3 = coachContextCacheKey({ ...SCOPE, actorId: 9 });
    setCachedCoachContext(k1, { state: 'cached', findings: {} });
    setCachedCoachContext(k2, { state: 'cached', findings: {} });
    setCachedCoachContext(k3, { state: 'cached', findings: {} });
    const removedActor = invalidateCoachContextCache({ actorId: 7 });
    expect(removedActor).toBe(2);
    expect(getCachedCoachContext(k1)).toBeNull();
    expect(getCachedCoachContext(k2)).toBeNull();
    expect(getCachedCoachContext(k3)).not.toBeNull();
    const removedAll = clearCoachContextCache();
    expect(removedAll).toBe(1);
    expect(coachContextCacheKeys()).toEqual([]);
  });

  it('role switch invalidation keys on the role dimension only', () => {
    const trainer = coachContextCacheKey(SCOPE);
    const admin = coachContextCacheKey({ ...SCOPE, role: 'admin' });
    setCachedCoachContext(trainer, { state: 'cached', findings: {} });
    setCachedCoachContext(admin, { state: 'cached', findings: {} });
    invalidateCoachContextCache({ actorId: 7, role: 'trainer' });
    expect(getCachedCoachContext(trainer)).toBeNull();
    expect(getCachedCoachContext(admin)).not.toBeNull();
  });

  it('stores only envelope-shaped entries (guards against raw PII leaking in)', () => {
    const key = coachContextCacheKey(SCOPE);
    setCachedCoachContext(key, { notAnEnvelope: true });
    expect(getCachedCoachContext(key)).toBeNull();
    setCachedCoachContext(key, { state: 'ok', findings: {} });
    expect(getCachedCoachContext(key)?.state).toBe('ok');
  });

  it('evicts oldest entries beyond the max-size cap', () => {
    for (let i = 0; i < 300; i += 1) {
      const key = coachContextCacheKey({ ...SCOPE, targetClientId: i, role: `r${i % 3}` });
      setCachedCoachContext(key, { state: 'cached', findings: {} }, { maxSize: 256 });
    }
    expect(coachContextCacheKeys().length).toBeLessThanOrEqual(256);
  });
});
