/**
 * verifySessionRefusalBehaviour.test.mjs
 * ======================================
 * BEHAVIOURAL cover for the verify-session refusal branch, because the source
 * assertions in grantRefusalCallerContract.test.mjs cannot see the difference
 * between
 *
 *     if (result?.unfulfillable) {
 *     if (false && result?.unfulfillable) {
 *
 * Both contain the text. Mutation proved it: disabling the guard left that
 * suite fully green. A source guard can prove a branch EXISTS; only an executed
 * request can prove it FIRES. This is the fifth time in this workstream a test
 * passed against effectively-deleted code, so this one drives the real router.
 *
 * What it protects (GLM-5.3 H1 + my own sweep, 2026-08-20): grantSessionsForCart
 * can return `unfulfillable: true, sessionsAdded: 0`, which carries
 * `alreadyProcessed: false` and therefore used to fall straight into the
 * success branch — telling a paying customer "Order verified and completed
 * successfully" while granting nothing, and recording a verified conversion on
 * the way past.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGrantSessionsForCart: vi.fn(),
  mockSendNotification: vi.fn(),
  // captureVerifiedCheckoutLead is a LOCAL function in the route file, not an
  // import — mocking it intercepts nothing and asserting on that mock passes
  // vacuously. captureLeadFromCheckout is what it calls, and that IS an
  // import, so it is the honest observable for "a conversion was recorded".
  mockCaptureLeadFromCheckout: vi.fn(),
  mockCartFindOne: vi.fn(),
  mockSessionsRetrieve: vi.fn(),
  mockReceiptSummary: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const passthrough = (_req, _res, next) => next();

vi.mock('stripe', () => ({
  default: vi.fn(function Stripe() {
    return { checkout: { sessions: { retrieve: mocks.mockSessionsRetrieve } } };
  }),
}));
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { id: 3, email: 'buyer@example.test' }; next(); },
}));
vi.mock('../../middleware/moneyPathRateLimits.mjs', () => ({
  checkoutSessionLimiter: passthrough,
  paymentVerifyLimiter: passthrough,
}));
vi.mock('../../utils/logger.mjs', () => ({ default: mocks.mockLogger }));
vi.mock('../../services/notificationService.mjs', () => ({ sendNotification: mocks.mockSendNotification }));
vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => ({ findOne: mocks.mockCartFindOne, update: vi.fn() }),
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getProductVariant: () => ({}),
  getUser: () => ({ findByPk: vi.fn() }),
}));
vi.mock('../../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: mocks.mockGrantSessionsForCart,
  getStorefrontSessionCredits: (i) => Number(i?.sessions || 0),
}));
vi.mock('../../services/checkoutReceiptSummaryService.mjs', () => ({
  getCheckoutReceiptSummary: mocks.mockReceiptSummary,
}));
vi.mock('../../services/leadCaptureService.mjs', () => ({
  captureLeadFromCheckout: mocks.mockCaptureLeadFromCheckout,
}));
vi.mock('../../services/leadCaptureShared.mjs', () => ({
  deriveChannel: () => ({ channel: 'direct' }),
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_unit';

const { default: v2PaymentRouter } = await import('../../routes/v2PaymentRoutes.mjs');

const post = (body = { sessionId: 'cs_test_1' }) => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/payments', v2PaymentRouter);
  return request(app).post('/api/v2/payments/verify-session').send(body);
};

const paidSession = (over = {}) => ({
  id: 'cs_test_1',
  payment_status: 'paid',
  amount_total: 506000,
  customer_details: { email: 'buyer@example.test' },
  metadata: { cartId: '42', userId: '3' },
  ...over,
});

describe('verify-session refuses out loud when the grant is unfulfillable', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockSessionsRetrieve.mockResolvedValue(paidSession());
    mocks.mockCartFindOne.mockResolvedValue({ id: 42, userId: 3, checkoutSessionId: 'cs_test_1' });
    mocks.mockReceiptSummary.mockResolvedValue({});
    mocks.mockCaptureLeadFromCheckout.mockResolvedValue({ error: null });
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: false,
      unfulfillable: true,
      reason: 'ADOPTION_UNVERIFIABLE',
    });
  });

  it('does NOT answer 200 success', async () => {
    const response = await post();

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('never tells the customer the order completed', async () => {
    const response = await post();

    expect(JSON.stringify(response.body)).not.toMatch(/completed successfully/i);
  });

  it('tells them a human will review it, and that they were not double-charged', async () => {
    const response = await post();

    expect(response.body.error?.requiresSupportReview).toBe(true);
    expect(response.body.message).toMatch(/review/i);
  });

  it('carries the refusal reason for support', async () => {
    const response = await post();
    expect(response.body.error?.reason).toBe('ADOPTION_UNVERIFIABLE');
  });

  it('raises an admin alert — this rail has no other signal on the money', async () => {
    await post();

    const admin = mocks.mockSendNotification.mock.calls
      .map(([a]) => a)
      .filter((a) => a?.type === 'ADMIN_NOTIFICATION');

    expect(admin.length).toBeGreaterThan(0);
    expect(admin[0].data?.actionRequired).toBe('MANUAL_FULFIL_OR_REFUND');
  });

  it('does NOT record a verified conversion for a refusal', async () => {
    await post();
    expect(mocks.mockCaptureLeadFromCheckout).not.toHaveBeenCalled();
  });

  it('still answers 409 when the alert transport is down', async () => {
    // A failed notification must not become a 500 the client retries.
    mocks.mockSendNotification.mockRejectedValue(new Error('smtp down'));

    const response = await post();

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('handles the other terminal reason the same way', async () => {
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: false,
      unfulfillable: true,
      reason: 'SESSION_DOES_NOT_OWN_CART',
    });

    const response = await post();

    expect(response.status).toBe(409);
    expect(response.body.error?.reason).toBe('SESSION_DOES_NOT_OWN_CART');
  });
});

describe('a healthy grant is unaffected', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockSessionsRetrieve.mockResolvedValue(paidSession());
    mocks.mockCartFindOne.mockResolvedValue({ id: 42, userId: 3, checkoutSessionId: 'cs_test_1' });
    mocks.mockReceiptSummary.mockResolvedValue({});
    mocks.mockCaptureLeadFromCheckout.mockResolvedValue({ error: null });
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: true,
      sessionsAdded: 48,
      alreadyProcessed: false,
    });
  });

  it('answers 200 success and reports the sessions added', async () => {
    const response = await post();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.sessionsAdded).toBe(48);
  });

  it('records the verified conversion', async () => {
    await post();
    expect(mocks.mockCaptureLeadFromCheckout).toHaveBeenCalled();
  });

  it('raises no admin alert on a healthy grant', async () => {
    await post();

    const admin = mocks.mockSendNotification.mock.calls
      .map(([a]) => a)
      .filter((a) => a?.type === 'ADMIN_NOTIFICATION');

    expect(admin).toHaveLength(0);
  });
});
