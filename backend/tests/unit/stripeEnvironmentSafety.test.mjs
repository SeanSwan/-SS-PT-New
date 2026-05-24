import { describe, expect, it } from 'vitest';

import {
  getLiveStripeLocalBlockDetails,
  getStripeSecretKeyMode,
  isTruthyEnvFlag,
  shouldBlockLiveStripeInLocal,
} from '../../utils/stripeEnvironmentSafety.mjs';

describe('stripeEnvironmentSafety', () => {
  it('classifies Stripe secret key mode without exposing key values', () => {
    expect(getStripeSecretKeyMode('')).toBe('missing');
    expect(getStripeSecretKeyMode('sk_test_unit')).toBe('test');
    expect(getStripeSecretKeyMode('rk_test_unit')).toBe('test');
    expect(getStripeSecretKeyMode('sk_live_unit')).toBe('live');
    expect(getStripeSecretKeyMode('rk_live_unit')).toBe('live');
    expect(getStripeSecretKeyMode('not_a_real_key')).toBe('unknown');
  });

  it('accepts explicit true-like override flags only', () => {
    expect(isTruthyEnvFlag('true')).toBe(true);
    expect(isTruthyEnvFlag('1')).toBe(true);
    expect(isTruthyEnvFlag('yes')).toBe(true);
    expect(isTruthyEnvFlag('false')).toBe(false);
    expect(isTruthyEnvFlag('')).toBe(false);
  });

  it('blocks live Stripe keys outside production unless explicitly overridden', () => {
    expect(shouldBlockLiveStripeInLocal({
      secretKey: 'sk_live_unit',
      nodeEnv: 'development',
      allowLiveLocal: '',
    })).toBe(true);

    expect(shouldBlockLiveStripeInLocal({
      secretKey: 'sk_live_unit',
      nodeEnv: 'production',
      allowLiveLocal: '',
    })).toBe(false);

    expect(shouldBlockLiveStripeInLocal({
      secretKey: 'sk_live_unit',
      nodeEnv: 'development',
      allowLiveLocal: 'true',
    })).toBe(false);

    expect(shouldBlockLiveStripeInLocal({
      secretKey: 'sk_test_unit',
      nodeEnv: 'development',
      allowLiveLocal: '',
    })).toBe(false);
  });

  it('returns an operator-readable remediation message', () => {
    expect(getLiveStripeLocalBlockDetails()).toContain('Use sk_test_/pk_test_ sandbox keys');
    expect(getLiveStripeLocalBlockDetails()).toContain('restart npm run dev');
  });
});
