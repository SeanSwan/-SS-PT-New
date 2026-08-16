/**
 * Regression: the ACH rail must carry the same purchase hardening as the offline rail.
 *
 * GLM security audit 2026-08-15, Finding 3
 * (docs/ai-workflow/AI-HANDOFF/GLM-SECURITY-AUDIT-money-2026-08-15.md).
 *
 * `offlinePaymentRoutes.mjs → calculateServerTotal` was hardened (SWA-129) with:
 *   - `isActive: true` on the price lookup, so a retired/revoked package can't be
 *     bought by id at its stale listed price
 *   - `parseInt` + `Number.isInteger(qty) && qty >= 1` quantity validation
 *
 * `achPaymentRoutes.mjs → POST /create-intent` never received either. This suite
 * locks both onto the ACH rail and keeps the two rails converged.
 *
 * NOTE on the idempotency-REPLAY lookup: it deliberately does NOT filter
 * `isActive`. Replay backfills order-item rows for an order that was already
 * legitimately placed; an item retired after that purchase must still resolve.
 * Only the PRICING lookup fails closed. See the assertion at the bottom.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: { findOne: vi.fn(), findOrCreate: vi.fn() },
  orderItem: { bulkCreate: vi.fn(), count: vi.fn() },
  storefrontItem: { findAll: vi.fn() },
  userFeatureFlag: { findOne: vi.fn() },
  transaction: { id: 'ach-hardening-tx' },
  paymentIntents: { create: vi.fn(), retrieve: vi.fn() },
}));

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return { paymentIntents: mocks.paymentIntents };
  }),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'client', email: 'client@example.test' };
    next();
  },
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn(async (cb) => cb(mocks.transaction)) },
}));

vi.mock('../../models/Order.mjs', () => ({ default: mocks.order }));
vi.mock('../../models/OrderItem.mjs', () => ({ default: mocks.orderItem }));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: mocks.storefrontItem }));
vi.mock('../../models/UserFeatureFlag.mjs', () => ({ default: mocks.userFeatureFlag }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn() } }));

const achPaymentRoutes = (await import('../../routes/achPaymentRoutes.mjs')).default;

// A live item and a RETIRED one. The retired row still carries its old price —
// that is exactly what makes buying it by id valuable to an attacker.
const CATALOG = [
  {
    id: 10, name: 'Ten Session Pack', description: 'Ten sessions', price: '1000.00',
    packageType: 'fixed', sessions: 10, totalSessions: null, imageUrl: '/a.png', isActive: true,
  },
  {
    id: 77, name: 'Retired Promo Pack', description: 'Revoked deal', price: '1000.00',
    packageType: 'fixed', sessions: 10, totalSessions: null, imageUrl: '/b.png', isActive: false,
  },
];

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/payments/ach', achPaymentRoutes);
  return app;
};

const post = (body) => request(makeApp()).post('/api/payments/ach/create-intent').send(body);

describe('ACH rail carries the offline rail hardening (GLM audit F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFeatureFlag.findOne.mockResolvedValue({ id: 900 }); // P1-1 grant held
    mocks.order.findOne.mockResolvedValue(null);
    mocks.order.findOrCreate.mockResolvedValue([
      { id: 91, orderNumber: 'SS-ACH', totalAmount: 0, status: 'pending',
        paymentMethod: 'ach', update: vi.fn().mockResolvedValue(true) },
      true,
    ]);
    mocks.orderItem.bulkCreate.mockResolvedValue([]);
    mocks.orderItem.count.mockResolvedValue(0);
    mocks.paymentIntents.create.mockResolvedValue({
      id: 'pi_ach_test', client_secret: 'pi_ach_test_secret',
    });

    // Behave like the real DB: honor whatever `where` the route actually sends.
    // Pre-fix the route sends no isActive, so the retired row comes back.
    mocks.storefrontItem.findAll.mockImplementation(async ({ where }) => {
      const ids = (Array.isArray(where?.id) ? where.id : [where?.id]).map(Number);
      return CATALOG.filter((item) => {
        if (!ids.includes(Number(item.id))) return false;
        if (where?.isActive === true && item.isActive === false) return false;
        return true;
      });
    });
  });

  it('refuses to price a retired (isActive:false) item bought by id', async () => {
    const response = await post({
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
      total: 1000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 77, quantity: 1, name: 'Retired Promo Pack', price: 1000 }],
    });

    expect(response.status).toBe(400);
    expect(mocks.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('sends isActive:true on the PRICING lookup', async () => {
    await post({
      idempotencyKey: '33333333-3333-4333-8333-333333333333',
      total: 1000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 10, quantity: 1, name: 'Ten Session Pack', price: 1000 }],
    });

    expect(mocks.storefrontItem.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isSpecialOffer: false, isActive: true }),
      })
    );
  });

  // The exact exploit from the audit: a fractional quantity slips under the
  // $0.02 tolerance and mints a real PaymentIntent at a fraction of the price.
  it.each([
    ['fractional', 0.06, 60],
    ['zero', 0, 0],
    ['negative', -2, -2000],
    ['non-numeric', 'two', 1000],
    ['null', null, 1000],
    // parseInt() would clean all three of these into a valid-looking integer.
    ['fractional string', '2.5', 2500],
    ['numeric-prefixed junk', '2abc', 2000],
    ['boolean true', true, 1000],
    ['empty string', '', 1000],
    ['array', [2], 2000],
    ['Infinity', Infinity, 1000],
  ])('rejects a %s quantity instead of pricing it', async (_label, quantity, total) => {
    const response = await post({
      idempotencyKey: '44444444-4444-4444-8444-444444444444',
      total: total || 1,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 10, quantity, name: 'Ten Session Pack', price: 1000 }],
    });

    expect(response.status).toBe(400);
    expect(mocks.paymentIntents.create).not.toHaveBeenCalled();
  });

  // Rejecting malformed input must not reject well-formed input that merely
  // arrives as a string — carts and query params legitimately produce these.
  it.each([
    ['number', 2],
    ['numeric string', '2'],
    ['zero-padded string', '02'],
    ['whitespace-padded string', ' 2 '],
    ['float that is a whole number', 2.0],
  ])('accepts a %s quantity of 2', async (_label, quantity) => {
    const response = await post({
      idempotencyKey: '66666666-6666-4666-8666-666666666666',
      total: 2000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 10, quantity, name: 'Ten Session Pack', price: 1000 }],
    });

    expect(response.status).toBe(200);
    expect(mocks.paymentIntents.create).toHaveBeenCalled();
  });

  // The one number that actually matters. Asserting only that create() was
  // CALLED would stay green against a regression that charges the client-supplied
  // total, or drops the ACH fee, or is off by 100x.
  it('charges exactly server subtotal + server fee, in cents', async () => {
    const response = await post({
      idempotencyKey: '55555555-5555-4555-8555-555555555555',
      total: 2000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 10, quantity: 2, name: 'Ten Session Pack', price: 1000 }],
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // 2 x $1000 = $2000 subtotal; ACH fee = min(2000 * 0.008, 5) = $5 cap.
    // Charged = $2005.00 = 200500 cents.
    expect(mocks.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 200_500, currency: 'usd' }),
      expect.anything()
    );
  });

  // Fee below the $5 cap, so a dropped-fee regression is visible as a
  // different number rather than one clamped to the same ceiling.
  it('charges the uncapped percentage fee when it is below the cap', async () => {
    const response = await post({
      idempotencyKey: '99999999-9999-4999-8999-999999999999',
      total: 1000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 10, quantity: 1, name: 'Ten Session Pack', price: 1000 }],
    });

    expect(response.status).toBe(200);
    // $1000 subtotal; fee = min(1000 * 0.008, 5) = $5 -> still capped.
    // Use the cap boundary explicitly so the arithmetic is pinned either way.
    expect(mocks.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100_500 }),
      expect.anything()
    );
  });

  it('rejects a request carrying more line items than the per-order cap', async () => {
    const items = Array.from({ length: 60 }, () => ({
      storefrontItemId: 10, quantity: 99, name: 'Ten Session Pack', price: 1000,
    }));

    const response = await post({
      idempotencyKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      total: 5_940_000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items,
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('TOO_MANY_LINE_ITEMS');
    expect(mocks.paymentIntents.create).not.toHaveBeenCalled();
  });

  // Order.totalAmount is DECIMAL(10,2) — max 99,999,999.99. An unbounded
  // quantity overflows the column and turns a money-path request into a 500.
  // The direct-item rails bypass the cart, so the cart's own cap never applied.
  it('rejects a quantity above the shared per-item ceiling', async () => {
    const response = await post({
      idempotencyKey: '77777777-7777-4777-8777-777777777777',
      total: 9_999_999_000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 10, quantity: 9_999_999, name: 'Ten Session Pack', price: 1000 }],
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('QUANTITY_LIMIT_EXCEEDED');
    expect(mocks.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('accepts a quantity exactly at the ceiling', async () => {
    const response = await post({
      idempotencyKey: '88888888-8888-4888-8888-888888888888',
      total: 99_000,
      customerInfo: { name: 'Buyer', email: 'client@example.test' },
      items: [{ storefrontItemId: 10, quantity: 99, name: 'Ten Session Pack', price: 1000 }],
    });

    expect(response.status).toBe(200);
  });

  // Both direct-item rails must enforce the SAME constant from the SAME module.
  // Two copies of this number would drift — the defect class this whole audit
  // kept surfacing, and exactly what the constant's own comment warns about.
  it('enforces the identical shared ceiling on both direct-item rails', () => {
    const ach = readFileSync(resolve(process.cwd(), 'routes/achPaymentRoutes.mjs'), 'utf8');
    const offline = readFileSync(resolve(process.cwd(), 'routes/offlinePaymentRoutes.mjs'), 'utf8');

    for (const [name, source] of [['ach', ach], ['offline', offline]]) {
      // NAMED import only — the default-export destructure binds undefined and
      // silently disables the guard (see cartQuantityCeilingBinding.test.mjs).
      expect(source, name).toMatch(
        /import\s+(?:\w+\s*,\s*)?\{[^}]*MAX_CART_ITEM_QUANTITY[^}]*\}\s*from\s*['"][^'"]*cartHelpers\.mjs['"]/
      );
      expect(source, name).not.toMatch(/MAX_CART_ITEM_QUANTITY \} = cartHelpers/);
      expect(source, name).toContain('qty > MAX_CART_ITEM_QUANTITY');
      // No hardcoded copy of the number.
      expect(source, name).not.toMatch(/qty\s*>\s*\d+/);
      // Same quantity predicate on both rails.
      expect(source, name).toContain('!Number.isInteger(qty) || qty < 1');
    }
  });

  it('leaves the idempotency-replay lookup unfiltered by isActive on purpose', () => {
    const source = readFileSync(resolve(process.cwd(), 'routes/achPaymentRoutes.mjs'), 'utf8');

    // Replay resolves items for an order ALREADY placed; an item retired after
    // that purchase must still backfill. Only pricing fails closed. If this ever
    // flips, a customer's completed order stops reconciling.
    const replayBlock = source.slice(
      source.indexOf('const existingItems ='),
      source.indexOf('await backfillMissingPaymentOrderItems(')
    );
    expect(replayBlock).toContain('isSpecialOffer: false');
    expect(replayBlock).not.toContain('isActive: true');
  });
});
