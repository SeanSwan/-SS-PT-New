import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let consoleLogSpy;
let consoleWarnSpy;

async function loadApiKeyChecker() {
  vi.resetModules();
  return import('../../utils/apiKeyChecker.mjs');
}

describe('apiKeyChecker Stripe server readiness', () => {
  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    consoleLogSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
  });

  it('allows backend Stripe clients when the secret key is valid but publishable key is absent', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_unit_secret');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');

    const { isStripeEnabled } = await loadApiKeyChecker();

    expect(isStripeEnabled()).toBe(true);
  });

  it('does not enable backend Stripe clients without a Stripe secret key', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_unit');
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_unit');

    const { isStripeEnabled } = await loadApiKeyChecker();

    expect(isStripeEnabled()).toBe(false);
  });
});
