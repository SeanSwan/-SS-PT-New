/**
 * Regression: role escalation via POST /api/cart/add
 *
 * GLM security audit (docs/ai-workflow/AI-HANDOFF/GLM-SECURITY-AUDIT-money-2026-08-15.md)
 * Finding 2 — a `user`-role account was promoted to `client` at ADD-TO-CART time,
 * with no payment, keyed on a display-name substring ('Gold'/'Platinum'/'Rhodium'/
 * 'Silver'). The item could be removed immediately afterward; the role change
 * persisted.
 *
 * Role promotion belongs on the payment-success path only, keyed on real granted
 * sessions — which `SessionGrantService.buildUserPurchaseUpdate` already does
 * (`sessionsToAdd > 0 && user.role === 'user'`). This suite locks BOTH halves:
 * the cart path must never write a role, and the paid path must keep doing so.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userUpdateMock = vi.hoisted(() => vi.fn());
const userUpsertMock = vi.hoisted(() => vi.fn());
const userQueryMock = vi.hoisted(() => vi.fn());
const userFindByPkMock = vi.hoisted(() => vi.fn());
// Instance-level write seams. The original code swallowed its own errors
// (`catch (roleUpgradeError) { /* don't fail the request */ }`), so a
// reintroduction copying that shape as `user.role='client'; await user.save()`
// would TypeError on a method-less mock, get swallowed, still return 200, and
// leave User.update uncalled — passing a test that only watches User.update.
// Give the instance real spies so every write shape is observable.
const userInstanceSaveMock = vi.hoisted(() => vi.fn());
const userInstanceUpdateMock = vi.hoisted(() => vi.fn());
const userInstanceSetMock = vi.hoisted(() => vi.fn());
const shoppingCartFindOrCreateMock = vi.hoisted(() => vi.fn());
const cartItemFindAllMock = vi.hoisted(() => vi.fn());
const cartItemFindOneMock = vi.hoisted(() => vi.fn());
const cartItemCreateMock = vi.hoisted(() => vi.fn());
const storefrontFindByPkMock = vi.hoisted(() => vi.fn());
const describeStorefrontTableMock = vi.hoisted(() => vi.fn());
const updateCartTotalsMock = vi.hoisted(() => vi.fn());

// Authenticated as a plain `user` — the role the exploit escalates FROM.
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 501, role: 'user' };
    next();
  },
}));

vi.mock('../../middleware/moneyPathRateLimits.mjs', () => ({
  cartMutationLimiter: (_req, _res, next) => next(),
}));

// Invitation gate satisfied — this test is about the role write, not the gate.
vi.mock('../../services/store/priceVisibilityService.mjs', () => ({
  isPriceAccessGranted: vi.fn(async () => true),
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => ({ findOrCreate: shoppingCartFindOrCreateMock }),
  getCartItem: () => ({
    associations: { storefrontItem: true },
    findAll: cartItemFindAllMock,
    findOne: cartItemFindOneMock,
    create: cartItemCreateMock,
  }),
  getStorefrontItem: () => ({
    findByPk: storefrontFindByPkMock,
    getTableName: () => 'storefront_items',
    sequelize: {
      getQueryInterface: () => ({ describeTable: describeStorefrontTableMock }),
    },
  }),
  getProductVariant: () => {
    throw new Error("Model 'ProductVariant' not found in cache");
  },
  getUser: () => ({
    update: userUpdateMock,
    upsert: userUpsertMock,
    query: userQueryMock,
    findByPk: userFindByPkMock,
  }),
}));

vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => false }));

vi.mock('../../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: vi.fn(),
}));

vi.mock('../../utils/cartHelpers.mjs', () => ({
  // Named export too: cartRoutes takes MAX_CART_ITEM_QUANTITY as a NAMED import
  // (it is not on the default object — a default destructure binds undefined and
  // silently kills the ceiling; see cartQuantityCeilingBinding.test.mjs).
  MAX_CART_ITEM_QUANTITY: 99,
  default: {
    MAX_CART_ITEM_QUANTITY: 99,
    calculateCartTotals: vi.fn(() => ({ total: 0, totalSessions: 0 })),
    getCartTotalsWithFallback: vi.fn(({ total }) => ({
      total: Number(total) || 0,
      totalSessions: 8,
    })),
    updateCartTotals: updateCartTotalsMock,
  },
}));

const { default: cartRoutes } = await import('../../routes/cartRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/cart', cartRoutes);

// Every package name the vulnerable substring match keyed on.
const ESCALATING_PACKAGE_NAMES = [
  'Gold Swan Elite Package',
  'Platinum Swan Package',
  'Rhodium Swan Package',
  'Silver Swan Package',
];

describe('POST /api/cart/add must not escalate user -> client (GLM audit F2)', () => {
  beforeEach(() => {
    userUpdateMock.mockReset();
    userUpsertMock.mockReset();
    userQueryMock.mockReset();
    userInstanceSaveMock.mockReset();
    userInstanceUpdateMock.mockReset();
    userInstanceSetMock.mockReset();
    userFindByPkMock.mockReset();
    shoppingCartFindOrCreateMock.mockReset();
    cartItemFindAllMock.mockReset();
    cartItemFindOneMock.mockReset();
    cartItemCreateMock.mockReset();
    storefrontFindByPkMock.mockReset();
    describeStorefrontTableMock.mockReset();
    updateCartTotalsMock.mockReset();

    userFindByPkMock.mockResolvedValue({
      id: 501,
      role: 'user',
      save: userInstanceSaveMock,
      update: userInstanceUpdateMock,
      set: userInstanceSetMock,
    });
    shoppingCartFindOrCreateMock.mockResolvedValue([
      { id: 901, status: 'active', userId: 501 },
      false,
    ]);
    cartItemFindOneMock.mockResolvedValue(null);
    cartItemCreateMock.mockResolvedValue({ id: 1001, cartId: 901, quantity: 1 });
    describeStorefrontTableMock.mockResolvedValue({
      id: {}, name: {}, price: {}, sessions: {}, totalSessions: {},
    });
    updateCartTotalsMock.mockResolvedValue({ success: true, total: 8400 });
  });

  it.each(ESCALATING_PACKAGE_NAMES)(
    'writes no role for "%s" added to the cart without payment',
    async (packageName) => {
      const item = {
        id: 7,
        name: packageName,
        price: 8400,
        totalCost: 8400,
        sessions: 48,
        isActive: true,
        isSpecialOffer: false,
        stockQuantity: null,
      };
      storefrontFindByPkMock.mockResolvedValue(item);
      cartItemFindAllMock.mockResolvedValue([
        { id: 1001, quantity: 1, price: 8400, storefrontItem: item },
      ]);

      const response = await request(app)
        .post('/api/cart/add')
        .send({ storefrontItemId: 7, quantity: 1 });

      expect(response.status).toBe(200);

      // The actual vulnerability: a role write on an unpaid cart mutation.
      // Every write seam, not just User.update — a reintroduction that used
      // user.save(), user.update(), upsert or raw SQL would otherwise slip past.
      expect(userUpdateMock).not.toHaveBeenCalled();
      expect(userUpsertMock).not.toHaveBeenCalled();
      expect(userQueryMock).not.toHaveBeenCalled();
      expect(userInstanceSaveMock).not.toHaveBeenCalled();
      expect(userInstanceUpdateMock).not.toHaveBeenCalled();
      expect(userInstanceSetMock).not.toHaveBeenCalled();

      // And nothing may tell the frontend an upgrade happened.
      expect(response.body.userRoleUpgrade).toBeFalsy();
    }
  );

  it('carries no name-substring role-promotion logic in the cart route source', () => {
    const cartRouteSource = readFileSync(
      resolve(process.cwd(), 'routes/cartRoutes.mjs'),
      'utf8'
    );

    // Strip comments first: the route intentionally documents the removed
    // vulnerability, and that prose must not satisfy or trip these assertions.
    const code = cartRouteSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    // No role write of any shape reaches the User model from a cart mutation.
    expect(code).not.toMatch(/\.update\(\s*\{[^}]*\brole\b\s*:/);
    expect(code).not.toContain("role: 'client'");
    expect(code).not.toContain('checkUserRoleUpgrade');

    // The User model is no longer even reachable from this route.
    expect(code).not.toContain('getUser');

    // And no display-name tier matching remains.
    for (const tier of ['Gold', 'Platinum', 'Rhodium', 'Silver']) {
      expect(code).not.toContain(tier);
    }
  });

  it('keeps role promotion on the payment-success path, keyed on granted sessions', () => {
    const grantSource = readFileSync(
      resolve(process.cwd(), 'services/SessionGrantService.mjs'),
      'utf8'
    );

    // Promotion survives, and remains gated on real sessions actually granted
    // rather than on any display-name match.
    expect(grantSource).toContain("sessionsToAdd > 0 && user.role === 'user'");
    expect(grantSource).toContain("userPurchaseUpdate.role = 'client'");
  });
});
