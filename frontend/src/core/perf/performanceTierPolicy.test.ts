// frontend/src/core/perf/performanceTierPolicy.test.ts
//
// P1 tests — the pure resolution contract.
// Named cases come from 09-tests.md (P2 amendment) "P1" row.

import { describe, expect, it } from 'vitest';

import {
  applyOverride,
  asCanonicalTier,
  INITIAL_CAPABILITY_STATE,
  isLatchedFailure,
  isMotionSuppressed,
  lowerTier,
  mayAttemptEnhancement,
  resolveCapability,
  resolveTier,
  toLegacyHomeTier,
  toLegacyProviderTier,
  type CapabilitySnapshot,
} from './performanceTierPolicy';

const base: CapabilitySnapshot = { reducedMotion: false };

describe('performanceTierPolicy — resolution', () => {
  it('reduced preference overrides all capabilities', () => {
    // 16 cores and a fast network still lose to the user's stated preference.
    expect(
      resolveTier({
        reducedMotion: true,
        cores: 16,
        memoryGiB: 32,
        saveData: false,
        effectiveType: '4g',
      }),
    ).toBe('reduced');
  });

  it('low cores or memory select lean', () => {
    expect(resolveTier({ ...base, cores: 2 })).toBe('lean');
    expect(resolveTier({ ...base, cores: 3 })).toBe('lean');
    expect(resolveTier({ ...base, memoryGiB: 2 })).toBe('lean');
    expect(resolveTier({ ...base, memoryGiB: 3.5 })).toBe('lean');
  });

  it('saveData and 2g select lean with eight cores', () => {
    expect(resolveTier({ ...base, cores: 8, saveData: true })).toBe('lean');
    expect(resolveTier({ ...base, cores: 8, effectiveType: '2g' })).toBe('lean');
  });

  it('3g selects lean', () => {
    // The shipped provider only checked 2g/slow-2g; the contract adds 3g.
    expect(resolveTier({ ...base, cores: 8, effectiveType: '3g' })).toBe('lean');
    expect(resolveTier({ ...base, cores: 8, effectiveType: 'slow-2g' })).toBe('lean');
  });

  it('unknown inputs select lean after detection', () => {
    // Nothing measurable at all: we cannot justify full.
    const state = resolveCapability(base);
    expect(state).toEqual({ phase: 'ready', tier: 'lean' });
  });

  it('invalid values are unknown', () => {
    // Non-finite / non-positive numerics must not be read as "lots of headroom".
    expect(resolveTier({ ...base, cores: 0 })).toBe('lean');
    expect(resolveTier({ ...base, cores: -8 })).toBe('lean');
    expect(resolveTier({ ...base, cores: Number.NaN })).toBe('lean');
    expect(resolveTier({ ...base, cores: 8.5 })).toBe('lean'); // non-integer -> unknown
    expect(resolveTier({ ...base, memoryGiB: 0 })).toBe('lean');
    expect(resolveTier({ ...base, memoryGiB: Number.POSITIVE_INFINITY })).toBe('lean');
    // Positive fractional memory is valid per contract.
    expect(resolveTier({ ...base, cores: 8, memoryGiB: 7.5 })).toBe('full');
    // Unknown connection strings are neutral, not slow.
    expect(resolveTier({ ...base, cores: 8, effectiveType: 'unknown' })).toBe('full');
  });

  it('eligible eight-core device selects full', () => {
    expect(resolveTier({ ...base, cores: 8 })).toBe('full');
    expect(resolveTier({ ...base, cores: 16, memoryGiB: 16 })).toBe('full');
  });
});

describe('performanceTierPolicy — phase and the F05 bootstrap latch', () => {
  it('initial state is pending, not a resolved reduced tier', () => {
    expect(INITIAL_CAPABILITY_STATE.phase).toBe('pending');
    expect(INITIAL_CAPABILITY_STATE.tier).toBe('reduced');
  });

  it('pending suppresses motion but never latches disablement', () => {
    // This is the regression guard for Astra's F05. P1's composition of
    // "return reduced before detection" + "disablement does not restart" would
    // make the second assertion fail.
    const pending = INITIAL_CAPABILITY_STATE;

    expect(isMotionSuppressed(pending)).toBe(true);
    expect(mayAttemptEnhancement(pending)).toBe(false);
    expect(isLatchedFailure(pending)).toBe(false);
  });

  it('a resolved full state admits the enhancement', () => {
    const ready = resolveCapability({ ...base, cores: 8 });
    expect(mayAttemptEnhancement(ready)).toBe(true);
    expect(isMotionSuppressed(ready)).toBe(false);
    expect(isLatchedFailure(ready)).toBe(false);
  });

  it('a resolved non-full state is the only latch', () => {
    const lean = resolveCapability({ ...base, cores: 2 });
    const reduced = resolveCapability({ ...base, reducedMotion: true });

    expect(isLatchedFailure(lean)).toBe(true);
    expect(isLatchedFailure(reduced)).toBe(true);
  });
});

describe('performanceTierPolicy — override cannot elevate', () => {
  it('forceTier applies the lower of requested and detected', () => {
    const detectedFull = resolveCapability({ ...base, cores: 8 });

    // Requesting reduced restricts.
    expect(applyOverride(detectedFull, 'reduced').tier).toBe('reduced');
    // Requesting full changes nothing.
    expect(applyOverride(detectedFull, 'full').tier).toBe('full');
    // Requesting lean restricts partially.
    expect(applyOverride(detectedFull, 'lean').tier).toBe('lean');
  });

  it('forceTier cannot elevate a restricted device', () => {
    const detectedLean = resolveCapability({ ...base, cores: 2 });

    // This is the key safety property: a debug override must not grant
    // eligibility the hardware did not.
    expect(applyOverride(detectedLean, 'full').tier).toBe('lean');
    expect(mayAttemptEnhancement(applyOverride(detectedLean, 'full'))).toBe(false);
  });

  it('an override cannot resolve a pending state', () => {
    const pending = INITIAL_CAPABILITY_STATE;
    const forced = applyOverride(pending, 'full');

    expect(forced.phase).toBe('pending');
    expect(mayAttemptEnhancement(forced)).toBe(false);
  });

  it('no override returns the same state object', () => {
    const state = resolveCapability({ ...base, cores: 8 });
    expect(applyOverride(state, undefined)).toBe(state);
  });

  it('lowerTier is order-correct and idempotent', () => {
    expect(lowerTier('full', 'lean')).toBe('lean');
    expect(lowerTier('lean', 'reduced')).toBe('reduced');
    expect(lowerTier('reduced', 'full')).toBe('reduced');
    expect(lowerTier('full', 'full')).toBe('full');
  });
});

describe('performanceTierPolicy — legacy vocabulary adapters', () => {
  it('maps canonical tiers to both shipped vocabularies', () => {
    expect(toLegacyProviderTier('full')).toBe('enhanced');
    expect(toLegacyProviderTier('lean')).toBe('standard');
    expect(toLegacyProviderTier('reduced')).toBe('minimal');

    expect(toLegacyHomeTier('full')).toBe('full');
    expect(toLegacyHomeTier('lean')).toBe('balanced');
    expect(toLegacyHomeTier('reduced')).toBe('essential');
  });

  it('narrows arbitrary values to canonical tiers only', () => {
    expect(asCanonicalTier('full')).toBe('full');
    expect(asCanonicalTier('balanced')).toBeUndefined();
    expect(asCanonicalTier('enhanced')).toBeUndefined();
    expect(asCanonicalTier(null)).toBeUndefined();
  });
});
