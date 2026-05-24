/**
 * stripeWebhookSessionGrant.test.mjs
 * =================================
 * Guards the canonical Stripe dashboard webhook path. Duplicate Stripe
 * deliveries must flow through SessionGrantService's transaction/row-lock
 * idempotency contract rather than the legacy manual fulfillment path.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockStripeClient = {
    webhooks: {
      constructEvent: vi.fn(),
    },
  };

  return {
    currentEvent: null,
    mockStripeClient,
    mockShoppingCart: {
      findByPk: vi.fn(),
    },
    mockUser: {
      findByPk: vi.fn(),
      increment: vi.fn(),
      update: vi.fn(),
    },
    mockGrantSessionsForCart: vi.fn(),
    mockUpgradeToClient: vi.fn(),
    mockSendNotification: vi.fn(),
    mockCreateCommissionForPurchase: vi.fn(),
    mockRecordLedgerEntry: vi.fn(),
    mockOrderFindOrCreate: vi.fn(),
  };
});

vi.mock('stripe', () => {
  function Stripe() {
    return mocks.mockStripeClient;
  }

  return {
    default: vi.fn(Stripe),
  };
});

vi.mock('../utils/apiKeyChecker.mjs', () => ({
  isStripeEnabled: () => true,
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/ShoppingCart.mjs', () => ({
  default: mocks.mockShoppingCart,
}));

vi.mock('../models/CartItem.mjs', () => ({
  default: {},
}));

vi.mock('../models/User.mjs', () => ({
  default: mocks.mockUser,
}));

vi.mock('../models/StorefrontItem.mjs', () => ({
  default: {},
}));

vi.mock('../models/GalleryVisitor.mjs', () => ({
  default: {
    findByPk: vi.fn(),
    increment: vi.fn(),
  },
}));

vi.mock('../models/Lead.mjs', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('../models/LeadActivity.mjs', () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock('../models/Order.mjs', () => ({
  default: {
    findOrCreate: mocks.mockOrderFindOrCreate,
  },
}));

vi.mock('../services/roleService.mjs', () => ({
  upgradeToClient: mocks.mockUpgradeToClient,
}));

vi.mock('../services/notificationService.mjs', () => ({
  sendNotification: mocks.mockSendNotification,
}));

vi.mock('../services/CommissionService.mjs', () => ({
  createCommissionForPurchase: mocks.mockCreateCommissionForPurchase,
}));

vi.mock('../services/gamification/GamificationPointsService.mjs', () => ({
  default: {
    recordLedgerEntry: mocks.mockRecordLedgerEntry,
  },
}));

vi.mock('../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: mocks.mockGrantSessionsForCart,
  getStorefrontSessionCredits: (storefrontItem) => Number(storefrontItem?.sessions || storefrontItem?.totalSessions || 0),
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';

const { default: stripeWebhookRouter } = await import('../webhooks/stripeWebhook.mjs');

function buildApp() {
  const app = express();
  app.use('/api/webhook/stripe', stripeWebhookRouter);
  return app;
}

function makeSession(overrides = {}) {
  return {
    id: 'cs_test_cart_42',
    payment_status: 'paid',
    customer: 'cus_test_123',
    metadata: {
      cartId: '42',
      userId: '3',
    },
    ...overrides,
  };
}

function makeCart(overrides = {}) {
  return {
    id: 42,
    userId: 3,
    sessionsGranted: false,
    status: 'pending_payment',
    paymentStatus: 'pending',
    fulfillmentAttempts: 0,
    cartItems: [
      {
        id: 9,
        storefrontItemId: 11,
        quantity: 1,
        price: 500,
        storefrontItem: {
          id: 11,
          name: 'Ten Session Pack',
          sessions: 10,
          packageType: 'fixed',
        },
      },
    ],
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    id: 3,
    firstName: 'Test',
    lastName: 'Client',
    stripeCustomerId: null,
    update: vi.fn().mockResolvedValue(true),
    reload: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('canonical Stripe webhook session grants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.io;
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: { object: makeSession() },
    };
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockShoppingCart.findByPk.mockResolvedValue(makeCart());
    mocks.mockUser.findByPk.mockResolvedValue(makeUser());
    mocks.mockUser.increment.mockResolvedValue([1]);
    mocks.mockUser.update.mockResolvedValue([1]);
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: true,
      sessionsAdded: 10,
      alreadyProcessed: false,
    });
    mocks.mockUpgradeToClient.mockResolvedValue(true);
    mocks.mockSendNotification.mockResolvedValue(true);
    mocks.mockCreateCommissionForPurchase.mockResolvedValue(true);
    mocks.mockRecordLedgerEntry.mockResolvedValue(true);
    mocks.mockOrderFindOrCreate.mockResolvedValue([{ id: 99 }, true]);
  });

  it('delegates completed cart fulfillment to SessionGrantService', async () => {
    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(42, 3, 'webhook');
    expect(mocks.mockUser.increment).not.toHaveBeenCalled();
  });

  it('returns 500 when SessionGrantService rejects so Stripe retries', async () => {
    mocks.mockGrantSessionsForCart.mockRejectedValueOnce(new Error('row lock timeout'));

    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(500);
    expect(response.text).toContain('Webhook processing error');
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(42, 3, 'webhook');
  });

  it('returns 500 when the order idempotency record cannot be claimed', async () => {
    mocks.mockOrderFindOrCreate.mockRejectedValueOnce(new Error('order claim timeout'));

    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(500);
    expect(response.text).toContain('Webhook processing error');
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(42, 3, 'webhook');
  });

  it('does not replay one-time side effects when the order already exists', async () => {
    const emit = vi.fn();
    global.io = { to: vi.fn(() => ({ emit })) };
    mocks.mockGrantSessionsForCart.mockResolvedValueOnce({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: true,
    });
    mocks.mockOrderFindOrCreate.mockResolvedValueOnce([{ id: 99 }, false]);

    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(42, 3, 'webhook');
    expect(mocks.mockSendNotification).not.toHaveBeenCalled();
    expect(mocks.mockCreateCommissionForPurchase).not.toHaveBeenCalled();
    expect(mocks.mockRecordLedgerEntry).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
