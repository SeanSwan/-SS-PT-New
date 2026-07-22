/**
 * Launch Control — pure resolver contract. This precedence gates billing/dashboard surfaces, so the "no
 * override → exact env baseline" guarantee and the anonymous-safety of role/percent rollouts are locked here.
 */
import { describe, expect, it } from 'vitest';
import {
  APPROVED_FEATURE_FLAGS,
  envBaseline,
  isApprovedFeatureFlag,
  resolveFlagValue,
  stableBucket,
} from '../../services/launchControlResolve.mjs';

const DESIGN_SURFACE_LAW = "Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio.";

describe('Launch Control registry — features only', () => {
  it('contains exactly the three approved feature switches', () => {
    expect([...APPROVED_FEATURE_FLAGS].sort(), DESIGN_SURFACE_LAW).toEqual([
      'dashboardV2Finance',
      'postSaveHandoff',
      'prismCapture',
    ]);
    expect(isApprovedFeatureFlag('homeVNext'), DESIGN_SURFACE_LAW).toBe(false);
    expect(isApprovedFeatureFlag('dashboardV2'), DESIGN_SURFACE_LAW).toBe(false);
  });
});

describe('envBaseline — features only', () => {
  it('exposes exactly the three approved feature switches', () => {
    expect(Object.keys(envBaseline()).sort()).toEqual([
      'dashboardV2Finance',
      'postSaveHandoff',
      'prismCapture',
    ]);
  });
});

describe('resolveFlagValue — no override = exact env baseline (zero behavior change)', () => {
  it('returns the env baseline unchanged when there is no override row', () => {
    expect(resolveFlagValue(true, null, null)).toBe(true);
    expect(resolveFlagValue(false, null, null)).toBe(false);
    expect(resolveFlagValue(false, undefined, { id: 1, role: 'admin' })).toBe(false);
  });
});

describe('force override wins for everyone (incl. anonymous)', () => {
  it('force ON overrides an env-false baseline', () => {
    expect(resolveFlagValue(false, { flag: 'x', value: true, mode: 'force' }, null)).toBe(true);
  });
  it('force OFF overrides an env-true baseline', () => {
    expect(resolveFlagValue(true, { flag: 'x', value: false, mode: 'force' }, { id: 5, role: 'client' })).toBe(false);
  });
});

describe('rollout — schedule', () => {
  it('is false before starts_at, applies after', () => {
    const future = new Date(Date.now() + 3600e3).toISOString();
    const past = new Date(Date.now() - 3600e3).toISOString();
    expect(resolveFlagValue(false, { flag: 'x', value: true, mode: 'rollout', starts_at: future }, { id: 1, role: 'admin' })).toBe(false);
    expect(resolveFlagValue(false, { flag: 'x', value: true, mode: 'rollout', starts_at: past }, { id: 1, role: 'admin' })).toBe(true);
  });
});

describe('rollout — role targeting (anonymous-safe)', () => {
  const row = { flag: 'dashboardV2', value: true, mode: 'rollout', roles: ['admin', 'trainer'] };
  it('true only for a matching role', () => {
    expect(resolveFlagValue(false, row, { id: 1, role: 'trainer' })).toBe(true);
    expect(resolveFlagValue(false, row, { id: 2, role: 'client' })).toBe(false);
  });
  it('false for anonymous (no user)', () => {
    expect(resolveFlagValue(false, row, null)).toBe(false);
    expect(resolveFlagValue(false, row, undefined)).toBe(false);
  });
});

describe('rollout — percentage (stable + anonymous-safe)', () => {
  it('anonymous is always false (cannot be bucketed)', () => {
    expect(resolveFlagValue(false, { flag: 'x', value: true, mode: 'rollout', pct: 50 }, null)).toBe(false);
  });
  it('same user+flag is deterministic across calls', () => {
    const row = { flag: 'storeV4', value: true, mode: 'rollout', pct: 50 };
    const a = resolveFlagValue(false, row, { id: 42, role: 'client' });
    const b = resolveFlagValue(false, row, { id: 42, role: 'client' });
    expect(a).toBe(b);
  });
  it('0% never includes; ~100% includes any bucketed user', () => {
    // pct is validated 1..99 at write time, but the resolver must handle the bounds sanely.
    expect(resolveFlagValue(false, { flag: 'x', value: true, mode: 'rollout', pct: 0 }, { id: 7 })).toBe(false);
    expect(resolveFlagValue(false, { flag: 'x', value: true, mode: 'rollout', pct: 100 }, { id: 7 })).toBe(true);
  });
});

describe('rollout — roles + percentage COMPOSE (F4: pct must not be dropped when roles set)', () => {
  const base = { flag: 'dashboardV2', value: true, mode: 'rollout', roles: ['trainer'] };
  it('requires the role AND the bucket — "N% of trainers", not "100% of trainers"', () => {
    expect(resolveFlagValue(false, { ...base, pct: 100 }, { id: 1, role: 'trainer' })).toBe(true);   // role ok + pct 100 → in
    expect(resolveFlagValue(false, { ...base, pct: 0 }, { id: 1, role: 'trainer' })).toBe(false);     // role ok but pct 0 → out (pct honored)
    expect(resolveFlagValue(false, { ...base, pct: 100 }, { id: 1, role: 'client' })).toBe(false);    // wrong role → out regardless of pct
    expect(resolveFlagValue(false, { ...base, pct: 100 }, null)).toBe(false);                          // anonymous → out
  });
});

describe('stableBucket', () => {
  it('is in [0,99] and deterministic', () => {
    for (const id of [1, 42, 9999, 'abc']) {
      const v = stableBucket(id, 'flag');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(100);
      expect(stableBucket(id, 'flag')).toBe(v);
    }
  });
  it('spreads across buckets (not all identical)', () => {
    const buckets = new Set(Array.from({ length: 200 }, (_, i) => stableBucket(i, 'dashboardV2')));
    expect(buckets.size).toBeGreaterThan(20);
  });
});
