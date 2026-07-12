/**
 * sessionPackagePurchaseCatalogTruth.test.mjs
 * ===========================================
 * Locks direct session-package checkout creation to the active StorefrontItem
 * catalog so this legacy-compatible API cannot sell stale hardcoded packages.
 */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  mockStorefrontItem: {
    findAll: vi.fn(),
    findOne: vi.fn(),
  },
  mockUser: {
    findByPk: vi.fn(),
  },
  mockUserFeatureFlag: {
    findOne: vi.fn(),
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return {
      checkout: {
        sessions: {
          create: mocks.checkoutCreate,
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    };
  }),
}));

vi.mock('../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => true,
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 3, role: 'client' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/User.mjs', () => ({
  default: mocks.mockUser,
}));

vi.mock('../models/StorefrontItem.mjs', () => ({
  default: mocks.mockStorefrontItem,
}));

// P1-1 price privacy: list strips prices / purchase refuses without the
// store-prices grant. Mocked so the real gate logic runs against a grant row.
vi.mock('../models/UserFeatureFlag.mjs', () => ({
  default: mocks.mockUserFeatureFlag,
}));

vi.mock('../services/sessionPackageCheckoutFulfillmentService.mjs', () => ({
  SESSION_PACKAGE_CHECKOUT_SOURCE: 'session_package_checkout',
  SessionPackageFulfillmentError: class SessionPackageFulfillmentError extends Error {},
  isSessionPackageCheckoutSession: vi.fn(),
  fulfillSessionPackageCheckoutSession: vi.fn(),
}));

vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_catalogtruth');
vi.stubEnv('JWT_SECRET', 'catalog-truth-test-secret');
const { default: sessionPackageRoutes } = await import('../routes/sessionPackageRoutes.mjs');

// The public list route identifies callers via soft Bearer-token auth (P1-1)
const grantedBearer = `Bearer ${jwt.sign({ id: 3, tokenType: 'access' }, 'catalog-truth-test-secret')}`;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/session-packages', sessionPackageRoutes);
  return app;
}

function makeStorefrontPackage(overrides = {}) {
  return {
    id: 10,
    name: 'SwanStudios 10-Pack',
    description: '10 personal training sessions (60 min each).',
    price: '1750.00',
    sessions: 10,
    totalSessions: 10,
    ...overrides,
  };
}

describe('direct session-package purchase catalog truth', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Caller id 3 holds the store-prices grant (P1-1)
    mocks.mockUser.findByPk.mockResolvedValue({ id: 3, role: 'client' });
    mocks.mockUserFeatureFlag.findOne.mockResolvedValue({ id: 900 });
    mocks.mockStorefrontItem.findAll.mockResolvedValue([]);
    mocks.mockStorefrontItem.findOne.mockResolvedValue(makeStorefrontPackage());
    mocks.checkoutCreate.mockResolvedValue({
      id: 'cs_test_catalog',
      url: 'https://checkout.stripe.test/session',
    });
  });

  it('lists only active storefront packages that can be purchased for paid sessions', async () => {
    mocks.mockStorefrontItem.findAll.mockResolvedValue([
      makeStorefrontPackage({ id: 10, name: 'SwanStudios 10-Pack' }),
      makeStorefrontPackage({
        id: 11,
        name: 'Zero Session Draft',
        sessions: 0,
        totalSessions: 0,
      }),
      makeStorefrontPackage({
        id: 12,
        name: 'Unpriced Draft',
        price: '0.00',
      }),
    ]);

    const response = await request(buildApp())
      .get('/api/session-packages')
      .set('Authorization', grantedBearer);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 10,
        name: 'SwanStudios 10-Pack',
        sessions: 10,
        price: 1750,
      }),
    ]);
    expect(mocks.mockStorefrontItem.findAll).toHaveBeenCalledWith(expect.objectContaining({
      // HR-007-F3: hidden per-client specials are excluded from the public list.
      where: { isActive: true, isSpecialOffer: false },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    }));
  });

  it('creates checkout sessions from active StorefrontItem pricing and session counts', async () => {
    const response = await request(buildApp())
      .post('/api/session-packages/purchase')
      .send({ packageId: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      checkoutUrl: 'https://checkout.stripe.test/session',
    });
    expect(mocks.mockStorefrontItem.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 10,
        isActive: true,
        isSpecialOffer: false,
      },
    }));
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [
        expect.objectContaining({
          price_data: expect.objectContaining({
            unit_amount: 175000,
            product_data: expect.objectContaining({
              name: 'SwanStudios 10-Pack',
            }),
          }),
        }),
      ],
      metadata: {
        source: 'session_package_checkout',
        packageId: '10',
        sessions: '10',
      },
    }), expect.objectContaining({
      idempotencyKey: expect.any(String),
    }));
  });

  it('strips prices from the list for callers without the store-prices grant (P1-1)', async () => {
    mocks.mockUserFeatureFlag.findOne.mockResolvedValue(null);
    mocks.mockStorefrontItem.findAll.mockResolvedValue([makeStorefrontPackage()]);

    const response = await request(buildApp()).get('/api/session-packages');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 10,
        name: 'SwanStudios 10-Pack',
        sessions: 10,
        price: null,
      }),
    ]);
  });

  it('refuses purchase for callers without the store-prices grant (P1-1, fail closed)', async () => {
    mocks.mockUserFeatureFlag.findOne.mockResolvedValue(null);

    const response = await request(buildApp())
      .post('/api/session-packages/purchase')
      .send({ packageId: 10 });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PRICE_ACCESS_REQUIRED');
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });
});
