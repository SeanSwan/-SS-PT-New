/**
 * ============================================================================
 * FILE: stripeClientFactory.test.mjs
 * PURPOSE: Executed proof of the Phase-A Stripe factory contract — TWO getters,
 *          one per current effective api version, success-only memoisation,
 *          null-never-throw when unconfigured, and NO construction anywhere
 *          else in the runtime tree.
 *
 * WHAT THIS FILE CAN AND CANNOT SEE. tests/setup.mjs installs a GLOBAL
 * vi.mock('stripe') whose default is vi.fn(...) — so nothing here observes the
 * real SDK (its getApiField/_api do not exist on the stub; probed, not
 * assumed). These tests therefore assert the half that is OURS: what the
 * factory PASSES to the constructor, read off the mock's spy calls. Whether
 * Stripe honours { apiVersion } is Stripe's contract.
 *
 * CONTROLS (run them; a green that cannot fail proves nothing):
 *   M1: delete `{ apiVersion: version }` from get() -> the spy tests fail.
 *   M2: swap the two exported constants -> the distinct-instances test fails.
 *   L1: add `new Stripe('x')` to any route -> the inventory test AND eslint
 *       fail, each naming the file.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as factory from '../../utils/stripeClient.mjs';

const KEY = 'STRIPE_SECRET_KEY';
let originalKey;

const fresh = async () => {
  factory.__resetStripeClientForTests();
  return factory;
};
const stripeCtor = async () => (await import('stripe')).default;

describe('Phase-A Stripe factory', () => {
  beforeEach(() => { originalKey = process.env[KEY]; });
  afterEach(() => {
    if (originalKey === undefined) delete process.env[KEY];
    else process.env[KEY] = originalKey;
  });

  it('exports exactly the two current effective versions', async () => {
    const { STRIPE_API_VERSION, STRIPE_LEGACY_DEFAULT_API_VERSION } = await fresh();
    expect(STRIPE_API_VERSION).toBe('2023-10-16');
    expect(STRIPE_LEGACY_DEFAULT_API_VERSION).toBe('2025-02-24.acacia');
    expect(STRIPE_API_VERSION).not.toBe(STRIPE_LEGACY_DEFAULT_API_VERSION);
  });

  it('each getter PASSES its own pinned version to the constructor — never omits it', async () => {
    process.env[KEY] = 'sk_test_versionpin';
    const Stripe = await stripeCtor();
    Stripe.mockClear();
    const f = await fresh();

    f.getStripeClient();
    f.getLegacyDefaultStripeClient();

    expect(Stripe).toHaveBeenCalledTimes(2);
    // The seven pre-Phase-A gallery clients passed NO second argument at all —
    // that omission IS the defect this file exists to prevent, so assert the
    // options object exactly.
    expect(Stripe.mock.calls[0]).toEqual(['sk_test_versionpin', { apiVersion: f.STRIPE_API_VERSION }]);
    expect(Stripe.mock.calls[1]).toEqual(['sk_test_versionpin', { apiVersion: f.STRIPE_LEGACY_DEFAULT_API_VERSION }]);
  });

  it('the two getters return DIFFERENT instances, each memoised to itself', async () => {
    process.env[KEY] = 'sk_test_distinct';
    const f = await fresh();
    const money = f.getStripeClient();
    const legacy = f.getLegacyDefaultStripeClient();
    expect(money).not.toBeNull();
    expect(legacy).not.toBeNull();
    expect(money).not.toBe(legacy);
    expect(f.getStripeClient()).toBe(money);
    expect(f.getLegacyDefaultStripeClient()).toBe(legacy);
  });

  it('returns null — never throws — when the key is absent (both getters)', async () => {
    delete process.env[KEY];
    const f = await fresh();
    expect(() => f.getStripeClient()).not.toThrow();
    expect(f.getStripeClient()).toBeNull();
    expect(f.getLegacyDefaultStripeClient()).toBeNull();
  });

  it('rejects a key failing the sk_/rk_ shape check', async () => {
    process.env[KEY] = 'not-a-stripe-key';
    const f = await fresh();
    expect(f.getStripeClient()).toBeNull();
  });

  it('HEALS when the key arrives late — failure is never memoised', async () => {
    // Both hostile reviewers independently rejected failure-caching: a boot
    // race where the first money request beats the env var must not become a
    // permanent 503 until redeploy.
    delete process.env[KEY];
    const f = await fresh();
    expect(f.getStripeClient()).toBeNull();

    process.env[KEY] = 'sk_test_arrivedlate';
    const healed = f.getStripeClient();
    expect(healed).not.toBeNull();
    expect(f.getStripeClient()).toBe(healed);
  });

  it('INVENTORY: `new Stripe(` exists nowhere in the runtime tree except the factory', () => {
    // Flash F1 made permanent: the 19-site census was once a lexical count
    // nobody reconciled. This walks the actual tree, and the failure message
    // names the offender instead of leaving it hunted.
    const ROOTS = ['routes', 'services', 'webhooks', 'utils', 'controllers', 'core', 'jobs'];
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) {
          if (entry === 'node_modules') continue;
          walk(p);
        } else if (/\.(mjs|js)$/.test(entry)) {
          if (p.replace(/\\/g, '/') === 'utils/stripeClient.mjs') continue;
          const src = readFileSync(p, 'utf8');
          if (/new Stripe\(/.test(src)) offenders.push(p);
        }
      }
    };
    for (const r of ROOTS) walk(r);
    expect(offenders, `files constructing Stripe outside the factory:\n${offenders.join('\n')}`).toEqual([]);
  });
});
