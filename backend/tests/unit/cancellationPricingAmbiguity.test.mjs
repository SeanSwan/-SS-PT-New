/**
 * getClientPackagePricing — ambiguous-package handling
 *
 * SWA-212 / Kimi K3: the cancellation charge derives from a single
 * `pricePerSession` with no knowledge of the cancelled session's duration.
 * SwanStudios sells two rates ($175/60min, $110/30min), so picking the wrong
 * package is a $65 error in either direction.
 *
 * Duration-aware SELECTION turns out not to be implementable: StorefrontItem has
 * no duration field (packageType, name, sessions, price, months, sessionsPerWeek,
 * totalSessions — nothing records 30 vs 60 minutes). That is a schema gap, not a
 * parameter gap, and is recorded on SWA-212.
 *
 * UPDATE: duration-aware REFUSAL was since implemented — see
 * cancellationPricingDuration.test.mjs. The helper still cannot SELECT the right package,
 * but it can now prove that a given package does NOT apply and fall back instead of
 * offering a rate that is wrong by $65. Selection remains blocked on the schema.
 *
 * What IS implementable is refusing to guess. When the source order contains more
 * than one session package at DIFFERENT per-session rates, the helper cannot know
 * which one covers this session — so it must report isFallback rather than
 * silently taking the first match and having every downstream consumer trust it
 * as verified truth.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const { getClientPackagePricing } = await import('../../utils/cancellationPricing.mjs');

const item = (overrides) => ({
  id: 1,
  name: 'Package',
  price: '1750.00',
  sessions: 10,
  packageType: 'fixed',
  isActive: true,
  ...overrides
});

// Multi-ORDER variant. The helper historically read only the most recent
// completed order, so rate differences ACROSS orders were invisible to the
// ambiguity guard - and the 'full' override then replaced a correct operator
// figure with the wrong one.
const modelsReturningOrders = (orders) => ({
  Order: {
    findOne: vi.fn().mockResolvedValue(
      orders.length === 0 ? null : { orderItems: orders[0].map((storefrontItem) => ({ storefrontItem })) }
    ),
    findAll: vi.fn().mockResolvedValue(
      orders.map((items) => ({ orderItems: items.map((storefrontItem) => ({ storefrontItem })) }))
    )
  },
  OrderItem: {},
  StorefrontItem: {}
});

const modelsReturning = (storefrontItems) => ({
  Order: {
    findAll: vi.fn().mockResolvedValue(
      storefrontItems === null
        ? []
        : [{ orderItems: storefrontItems.map((storefrontItem) => ({ storefrontItem })) }]
    )
  },
  OrderItem: {},
  StorefrontItem: {}
});

describe('getClientPackagePricing ambiguity handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a single session package to its per-session rate', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([
      item({ id: 1, name: 'Signature 60 10-Pack', price: '1750.00', sessions: 10 })
    ]));

    expect(result.isFallback).toBe(false);
    expect(result.pricePerSession).toBe(175);
  });

  it('reports fallback when the order holds packages at DIFFERENT per-session rates', async () => {
    // A $110/session pack and a $175/session pack in the same order. Whichever the
    // old first-match picked was trusted as verified truth by every consumer.
    const result = await getClientPackagePricing(301, modelsReturning([
      item({ id: 1, name: 'Express 30 10-Pack', price: '1100.00', sessions: 10 }),
      item({ id: 2, name: 'Signature 60 10-Pack', price: '1750.00', sessions: 10 })
    ]));

    expect(result.isFallback).toBe(true);
  });

  it('still resolves when several packages agree on the rate', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([
      item({ id: 1, name: 'Signature 60 10-Pack', price: '1750.00', sessions: 10 }),
      item({ id: 2, name: 'Signature 60 20-Pack', price: '3500.00', sessions: 20 })
    ]));

    expect(result.isFallback).toBe(false);
    expect(result.pricePerSession).toBe(175);
  });

  it('reports fallback when the client has no completed order', async () => {
    const result = await getClientPackagePricing(301, modelsReturning(null));
    expect(result.isFallback).toBe(true);
  });
});

describe('getClientPackagePricing across MULTIPLE orders', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('reports fallback when different orders carry different per-session rates', async () => {
    // March: $175/60min pack. June: $110/30min pack. A 60-minute session is
    // cancelled. Reading only the newest order yields 110 and the full-charge
    // override would replace a correct $175 with $110 - worse than not deriving.
    const result = await getClientPackagePricing(301, modelsReturningOrders([
      [item({ id: 2, name: 'Express 30 10-Pack', price: '1100.00', sessions: 10 })],
      [item({ id: 1, name: 'Signature 60 10-Pack', price: '1750.00', sessions: 10 })]
    ]));

    expect(result.isFallback).toBe(true);
  });

  it('still resolves when every order agrees on the rate', async () => {
    const result = await getClientPackagePricing(301, modelsReturningOrders([
      [item({ id: 2, name: 'Signature 60 20-Pack', price: '3500.00', sessions: 20 })],
      [item({ id: 1, name: 'Signature 60 10-Pack', price: '1750.00', sessions: 10 })]
    ]));

    expect(result.isFallback).toBe(false);
    expect(result.pricePerSession).toBe(175);
  });
});

describe('getClientPackagePricing must never treat a non-session item as a session rate', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does NOT return a program full price as a per-session rate', async () => {
    // A client buys the $8,400 12-month program. It carries sessions: 0 (totals are
    // derived elsewhere), so it is excluded from sessionPackages — and the old
    // `|| storefrontItems[0]` fallback then computed parseFloat(price) = 8400 and
    // returned it as pricePerSession with isFallback: false. Downstream,
    // applyServerDerivedChargeAmount trusts non-fallback payloads and would record
    // an $8,400 cancellation charge as "server-derived".
    const result = await getClientPackagePricing(301, modelsReturning([
      item({ id: 9, name: '12-Month Program', price: '33600.00', sessions: 0, packageType: 'monthly' })
    ]));

    expect(result.isFallback).toBe(true);
    expect(result.pricePerSession).not.toBe(33600);
  });

  it('does NOT return a one-time purchase price as a per-session rate', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([
      item({ id: 8, name: 'Assessment', price: '250.00', sessions: 1, packageType: 'one-time' })
    ]));

    expect(result.isFallback).toBe(true);
    expect(result.pricePerSession).not.toBe(250);
  });

  it('ignores a non-session item sitting alongside a real package', async () => {
    const result = await getClientPackagePricing(301, modelsReturning([
      item({ id: 8, name: 'Assessment', price: '250.00', sessions: 1, packageType: 'one-time' }),
      item({ id: 1, name: 'Signature 60 10-Pack', price: '1750.00', sessions: 10 })
    ]));

    expect(result.isFallback).toBe(false);
    expect(result.pricePerSession).toBe(175);
  });
});
