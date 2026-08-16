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
    mockOrderFindOne: vi.fn(),
    mockOrderUpdate: vi.fn(),
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
  isTwilioEnabled: () => false,
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
    findOne: mocks.mockOrderFindOne,
    update: mocks.mockOrderUpdate,
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
    // Production reality: the session grant (createCartOrderIfPossible) already wrote
    // THE order for this cart inside its transaction, with paymentAppliedAt still NULL.
    // The webhook must reuse that row and claim the one-time side effects on it.
    mocks.mockOrderFindOne.mockResolvedValue({ id: 99 });
    mocks.mockOrderUpdate.mockResolvedValue([1]);
  });

  it('delegates completed cart fulfillment to SessionGrantService', async () => {
    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(
      42, 3, 'webhook',
      // objectContaining, not an exact literal: the options bag gained
      // amountTotalCents (2026-08-16) so the adoption branch can refuse a grant
      // whose charged amount disagrees with the cart. The invariant this asserts
      // is the cart/user/caller/session delegation, not the bag's exact shape.
      expect.objectContaining({ checkoutSessionId: 'cs_test_cart_42' }),
    );
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
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(
      42, 3, 'webhook',
      // objectContaining, not an exact literal: the options bag gained
      // amountTotalCents (2026-08-16) so the adoption branch can refuse a grant
      // whose charged amount disagrees with the cart. The invariant this asserts
      // is the cart/user/caller/session delegation, not the bag's exact shape.
      expect.objectContaining({ checkoutSessionId: 'cs_test_cart_42' }),
    );
  });

  it('reuses the grant-created order instead of writing a SECOND completed order', async () => {
    // Regression: the grant writes the order under 'cart-fulfillment:<id>' while this
    // webhook used to claim under 'stripe-webhook-cart:<id>'. The keys never matched, so
    // a second status:'completed' row was created for the same cart with the same
    // totalAmount, and Order.sum(totalAmount where status='completed') double-counted
    // EVERY cart sale in the revenue + admin dashboards (live since 2026-06-13).
    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);
    // The duplicate writer must NOT run when the grant already made the order.
    expect(mocks.mockOrderFindOrCreate).not.toHaveBeenCalled();
    // ...and the side effects still fire exactly once, claimed atomically on that row.
    expect(mocks.mockOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ paymentAppliedAt: expect.any(Date) }),
      expect.objectContaining({ where: { id: 99, paymentAppliedAt: null } }),
    );
    expect(mocks.mockCreateCommissionForPurchase).toHaveBeenCalledTimes(1);
  });

  it('fulfils a merch-only cart (0 session credits) instead of 500-looping forever', async () => {
    // Regression: a cart of ONLY physical products carries zero session credits. The old
    // `totalSessionsAdded <= 0` throw fired on that legitimate shape — and because the
    // grant had already committed, every Stripe retry re-threw, 500-looping the event.
    // Sustained failures make Stripe DISABLE the endpoint, which would kill server-side
    // fulfillment for ALL sales (training packages included).
    mocks.mockShoppingCart.findByPk.mockResolvedValue(makeCart({
      cartItems: [{
        id: 1,
        quantity: 1,
        price: 40,
        storefrontItemId: 77,
        storefrontItem: { id: 77, name: 'Swan Tee', itemKind: 'physical_product' },
      }],
    }));
    mocks.mockGrantSessionsForCart.mockResolvedValueOnce({
      granted: true,
      sessionsAdded: 0,
      alreadyProcessed: false,
    });

    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);
    // No sessions sold -> no commission, but the order/fulfillment must still complete.
    expect(mocks.mockCreateCommissionForPurchase).not.toHaveBeenCalled();
  });

  it('falls back to creating an order when the grant did not write one', async () => {
    mocks.mockOrderFindOne.mockResolvedValueOnce(null);

    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);
    expect(mocks.mockOrderFindOrCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockCreateCommissionForPurchase).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the order side-effect claim cannot be made', async () => {
    mocks.mockOrderUpdate.mockRejectedValueOnce(new Error('order claim timeout'));

    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(500);
    expect(response.text).toContain('Webhook processing error');
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(
      42, 3, 'webhook',
      // objectContaining, not an exact literal: the options bag gained
      // amountTotalCents (2026-08-16) so the adoption branch can refuse a grant
      // whose charged amount disagrees with the cart. The invariant this asserts
      // is the cart/user/caller/session delegation, not the bag's exact shape.
      expect.objectContaining({ checkoutSessionId: 'cs_test_cart_42' }),
    );
  });

  it('does not replay one-time side effects when the order already exists', async () => {
    const emit = vi.fn();
    global.io = { to: vi.fn(() => ({ emit })) };
    mocks.mockGrantSessionsForCart.mockResolvedValueOnce({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: true,
    });
    // A prior delivery already claimed the side effects: the conditional update
    // (paymentAppliedAt: null -> now) matches 0 rows, so this delivery must not replay.
    mocks.mockOrderUpdate.mockResolvedValueOnce([0]);

    const response = await request(buildApp())
      .post('/api/webhook/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);
    expect(mocks.mockGrantSessionsForCart).toHaveBeenCalledWith(
      42, 3, 'webhook',
      // objectContaining, not an exact literal: the options bag gained
      // amountTotalCents (2026-08-16) so the adoption branch can refuse a grant
      // whose charged amount disagrees with the cart. The invariant this asserts
      // is the cart/user/caller/session delegation, not the bag's exact shape.
      expect.objectContaining({ checkoutSessionId: 'cs_test_cart_42' }),
    );
    expect(mocks.mockSendNotification).not.toHaveBeenCalled();
    expect(mocks.mockCreateCommissionForPurchase).not.toHaveBeenCalled();
    expect(mocks.mockRecordLedgerEntry).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
