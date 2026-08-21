/**
 * sessionPackageWebhookFulfilment.test.mjs
 * ========================================
 * GLM-5.3 M4 and Kimi K3 M4, 2026-08-19 — the same absence found twice.
 *
 * The session-package rail was fulfilled ONLY by `verify-session`, which runs
 * when the browser reaches the success page. The webhook — the one path that
 * does not depend on the customer's browser — treated these events as
 * unrecognised:
 *
 *     if (!cartId) {
 *       logger.warn('checkout.session.completed with no cartId ... — ignoring');
 *       break;
 *     }
 *
 * So a buyer who closes the tab, loses the redirect, is behind an extension
 * that blocks it, or crashes has PAID and is never granted, and nothing
 * server-side reconciles it. The event is 200-acked, so Stripe never retries.
 * This is the "legacy mount silently acked" defect class surviving inside the
 * unified handler.
 *
 * The fix is small because both pieces already existed and were simply never
 * wired together: `isSessionPackageCheckoutSession` (the detector) and
 * `fulfillSessionPackageCheckoutSession` (idempotent on
 * `Order.idempotencyKey`). Idempotency is what makes it safe to call from both
 * paths without coordinating with the redirect.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentEvent: null,
  mockStripeClient: { webhooks: { constructEvent: vi.fn() } },
  mockFulfillSessionPackage: vi.fn(),
  mockGrantSessionsForCart: vi.fn(),
  mockSendNotification: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() { return mocks.mockStripeClient; }) }));
vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => true, isTwilioEnabled: () => false }));
vi.mock('../../utils/logger.mjs', () => ({ default: mocks.mockLogger }));
vi.mock('../../models/ShoppingCart.mjs', () => ({ default: { findByPk: vi.fn(), findOne: vi.fn() } }));
vi.mock('../../models/CartItem.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn(), update: vi.fn(), increment: vi.fn() } }));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: {} }));
vi.mock('../../models/GalleryVisitor.mjs', () => ({ default: { findByPk: vi.fn(), increment: vi.fn() } }));
vi.mock('../../models/GalleryDonation.mjs', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../../models/PrintOrder.mjs', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../../models/Lead.mjs', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../models/LeadActivity.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../models/Order.mjs', () => ({
  default: { findOrCreate: vi.fn(), findOne: vi.fn(), update: vi.fn() },
}));
vi.mock('../../services/roleService.mjs', () => ({ upgradeToClient: vi.fn() }));
vi.mock('../../services/notificationService.mjs', () => ({ sendNotification: mocks.mockSendNotification }));
vi.mock('../../services/CommissionService.mjs', () => ({ createCommissionForPurchase: vi.fn() }));
vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: { recordLedgerEntry: vi.fn() },
}));
vi.mock('../../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: mocks.mockGrantSessionsForCart,
  getStorefrontSessionCredits: (i) => Number(i?.sessions || i?.totalSessions || 0),
}));
vi.mock('../../services/cartCheckoutFulfillmentService.mjs', () => ({ isPhysicalCartItem: () => false }));
vi.mock('../../services/sessions/session.service.mjs', () => ({
  default: { allocateSessionsFromOrder: vi.fn() },
}));
vi.mock('../../utils/paymentIdempotency.mjs', () => ({ claimIdempotentRecord: vi.fn() }));
vi.mock('../../services/galleryVipFulfillmentService.mjs', () => ({ fulfillGalleryVipSession: vi.fn() }));
vi.mock('../../database.mjs', () => ({ default: { transaction: vi.fn() } }));
// The real detector is loaded (see below), which drags the service's own model
// imports in. Stub the two this test does not otherwise touch so the module
// graph resolves without a live Sequelize instance.
vi.mock('../../models/CustomPackage.mjs', () => ({ default: { findByPk: vi.fn(), findOne: vi.fn() } }));
vi.mock('../../services/sessionBillingPolicy.mjs', () => ({ isNonDeductingClient: () => false }));

// The detector is REAL — only the fulfiller is mocked. Mocking the detector too
// would let the test pass against a webhook that recognises nothing.
vi.mock('../../services/sessionPackageCheckoutFulfillmentService.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fulfillSessionPackageCheckoutSession: mocks.mockFulfillSessionPackage,
  };
});

process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';

const { default: stripeWebhookRouter } = await import('../../webhooks/stripeWebhook.mjs');

const post = () => {
  const app = express();
  app.use('/api/webhook/stripe', stripeWebhookRouter);
  return request(app)
    .post('/api/webhook/stripe')
    .set('stripe-signature', 'sig_unit')
    .set('content-type', 'application/json')
    .send(Buffer.from('{}'));
};

const packageSession = (over = {}) => ({
  id: 'cs_test_pkg_1',
  payment_status: 'paid',
  client_reference_id: '3',
  payment_intent: 'pi_pkg_1',
  amount_total: 840000,
  metadata: {
    source: 'session_package_checkout',
    packageId: '7',
    sessions: '48',
  },
  ...over,
});

const adminNotifications = () => mocks.mockSendNotification.mock.calls
  .map(([arg]) => arg)
  .filter((a) => a?.type === 'ADMIN_NOTIFICATION');

describe('session-package checkouts are fulfilled by the webhook, not only by the browser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockFulfillSessionPackage.mockResolvedValue({
      alreadyProcessed: false,
      sessionsAdded: 48,
      userId: 3,
      orderId: 91,
    });
  });

  it('fulfils a paid session package with no cartId', async () => {
    mocks.currentEvent = { type: 'checkout.session.completed', data: { object: packageSession() } };

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.mockFulfillSessionPackage).toHaveBeenCalledTimes(1);
  });

  it('does NOT route it through the cart grant path', async () => {
    mocks.currentEvent = { type: 'checkout.session.completed', data: { object: packageSession() } };

    await post();

    expect(mocks.mockGrantSessionsForCart).not.toHaveBeenCalled();
  });

  it('acks quietly when the redirect already fulfilled it', async () => {
    mocks.mockFulfillSessionPackage.mockResolvedValue({
      alreadyProcessed: true, sessionsAdded: 48, userId: 3, orderId: 91,
    });
    mocks.currentEvent = { type: 'checkout.session.completed', data: { object: packageSession() } };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminNotifications()).toHaveLength(0);
  });

  it('does not claim a session package when the metadata says cart', async () => {
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: {
        object: packageSession({
          metadata: { cartId: '42', userId: '3', totalSessions: '8', source: 'genesis_checkout' },
        }),
      },
    };

    await post();

    expect(mocks.mockFulfillSessionPackage).not.toHaveBeenCalled();
  });

  it('leaves an unrecognised session alone', async () => {
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: { object: packageSession({ metadata: {} }) },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.mockFulfillSessionPackage).not.toHaveBeenCalled();
  });

  describe('when fulfilment fails on money already captured', () => {
    beforeEach(() => {
      mocks.mockFulfillSessionPackage.mockRejectedValue(
        Object.assign(new Error('db down'), { code: 'SESSION_PACKAGE_DB_ERROR' }),
      );
      mocks.currentEvent = { type: 'checkout.session.completed', data: { object: packageSession() } };
    });

    it('raises an admin alert', async () => {
      await post();
      expect(adminNotifications().length).toBeGreaterThan(0);
    });

    it('returns 5xx so Stripe redelivers — the fulfiller is idempotent', async () => {
      const response = await post();
      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it('does not fall through to the cart path on failure', async () => {
      await post();
      expect(mocks.mockGrantSessionsForCart).not.toHaveBeenCalled();
    });
  });
});

/**
 * GLM-5.3 L1 — three paid dead ends on the cart rail that only logged.
 *
 * A cart named by a paid session can be missing, ownerless, or named by
 * unusable metadata. Each `break`s with a 200, which is CORRECT (a redelivery
 * cannot conjure a missing cart), but each did so in silence while the money
 * was already captured. Every sibling rail alerts; this one did not.
 *
 * Behavioural, not source-text: mutation proved this round that a source guard
 * cannot tell `if (x)` from `if (false && x)`.
 */
describe('paid dead ends on the cart rail are never silent', () => {
  const cartSession = (over = {}) => ({
    id: 'cs_test_cart_1',
    payment_status: 'paid',
    amount_total: 506000,
    metadata: { cartId: '42', userId: '3', totalSessions: '8', source: 'genesis_checkout' },
    ...over,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
  });

  it('alerts when the paid cart no longer exists', async () => {
    mocks.currentEvent = { type: 'checkout.session.completed', data: { object: cartSession() } };

    const response = await post();

    expect(response.status).toBe(200);
    const admin = adminNotifications();
    expect(admin.length).toBeGreaterThan(0);
    expect(admin[0].data?.actionRequired).toBe('MANUAL_FULFIL_OR_REFUND');
  });

  it('alerts when the cart id in metadata is unusable', async () => {
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: { object: cartSession({ metadata: { cartId: 'not-a-number', userId: '3' } }) },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminNotifications().length).toBeGreaterThan(0);
  });

  it('alerts when the paid cart has no owner', async () => {
    // Cart row exists but carries no userId — nothing can be granted to anyone.
    const ShoppingCart = (await import('../../models/ShoppingCart.mjs')).default;
    ShoppingCart.findByPk.mockResolvedValue({ id: 42, userId: null });

    mocks.currentEvent = { type: 'checkout.session.completed', data: { object: cartSession() } };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminNotifications().length).toBeGreaterThan(0);
  });

  it('does NOT alert when the cart resolves normally', async () => {
    const ShoppingCart = (await import('../../models/ShoppingCart.mjs')).default;
    ShoppingCart.findByPk.mockResolvedValue({ id: 42, userId: 3 });
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: true, sessionsAdded: 8, alreadyProcessed: false,
    });

    mocks.currentEvent = { type: 'checkout.session.completed', data: { object: cartSession() } };
    await post();

    const deadEnd = adminNotifications()
      .filter((a) => a?.data?.type === 'payment_unfulfilled_dead_end');
    expect(deadEnd).toHaveLength(0);
  });
});

/**
 * Kimi K3 F3 — the gallery rails 200-acked captured money in silence.
 *
 * fulfillPrintOrder alerts on a paid session it cannot fulfil ("never leave a
 * captured order invisible"). Its two siblings in the same file, on the same
 * event, returned after a logger.error and nothing else. The convention had
 * reached ACH, session packages and print, and skipped these two.
 *
 * Returning 200 is correct — a redelivery cannot conjure a missing visitor — so
 * the alert was what was missing, not a retry.
 */
describe('gallery rails never 200-ack captured money in silence', () => {
  const gallerySession = (metadata) => ({
    id: 'cs_test_gallery_1',
    payment_status: 'paid',
    amount_total: 5000,
    metadata,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
  });

  it('alerts when a paid credits session carries no visitorId', async () => {
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: { object: gallerySession({ type: 'gallery_credits', credits: '10' }) },
    };

    const response = await post();

    expect(response.status).toBe(200);
    const alerts = adminNotifications()
      .filter((a) => a?.data?.type === 'gallery_payment_unfulfilled');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].data?.actionRequired).toBe('MANUAL_FULFIL_OR_REFUND');
  });

  it('alerts when the credits visitor cannot be found', async () => {
    const GalleryVisitor = (await import('../../models/GalleryVisitor.mjs')).default;
    GalleryVisitor.findByPk.mockResolvedValue(null);

    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: { object: gallerySession({ type: 'gallery_credits', visitorId: '7', credits: '10' }) },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminNotifications()
      .filter((a) => a?.data?.type === 'gallery_payment_unfulfilled').length).toBeGreaterThan(0);
  });

  it('alerts when a paid donation session is missing visitor/event metadata', async () => {
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: { object: gallerySession({ type: 'gallery_donation', amount: '50' }) },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminNotifications()
      .filter((a) => a?.data?.type === 'gallery_payment_unfulfilled').length).toBeGreaterThan(0);
  });

  it('names the rail so the alert is actionable', async () => {
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: { object: gallerySession({ type: 'gallery_donation', amount: '50' }) },
    };

    await post();

    const alert = adminNotifications()
      .find((a) => a?.data?.type === 'gallery_payment_unfulfilled');
    expect(String(alert?.data?.rail)).toMatch(/Donation/i);
  });
});
