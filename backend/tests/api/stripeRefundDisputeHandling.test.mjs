/**
 * Regression: a refund or chargeback must not be silently ignored.
 *
 * Found 2026-08-16 by a local sweep during the three-way money-path review —
 * neither Kimi K3 nor GLM-5.3 looked for a MISSING capability, only at what exists.
 *
 * Admin routes ISSUE refunds (`adminChargeCardRoutes.mjs`, `adminGalleryRoutes.mjs`)
 * but the webhook had no `charge.refunded` and no `charge.dispute.created` case, and
 * nothing anywhere revoked granted sessions or demoted `client` -> `user`. Refund the
 * money, keep the training and the paying-customer role. Same for a chargeback.
 *
 * DELIBERATELY POLICY-NEUTRAL. Whether a refund claws back all sessions, only unused
 * ones, or none is a customer-trust decision the owner has not made yet. Auto-revoking
 * would be irreversible and wrong under two of the three possible policies. So this
 * handler does the part that is correct under ALL of them:
 *   - mark the order refunded / flag the dispute
 *   - raise an ADMIN_NOTIFICATION carrying the session count at stake
 *   - state explicitly that sessions were NOT auto-revoked
 * and NEVER touches sessions or roles. When the policy is decided, the revocation
 * hangs off this handler; the detection is already here.
 *
 * An unmatched charge must ALSO alert — silent fall-through on a money event is the
 * exact defect Kimi flagged on the ACH orphan path.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentEvent: null,
  mockStripeClient: { webhooks: { constructEvent: vi.fn() } },
  mockOrderFindOne: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockSendNotification: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockUserIncrement: vi.fn(),
  mockCartFindByPk: vi.fn(),
  mockGrantSessionsForCart: vi.fn(),
}));

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() { return mocks.mockStripeClient; }) }));
vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => true, isTwilioEnabled: () => false }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../models/ShoppingCart.mjs', () => ({ default: { findByPk: mocks.mockCartFindByPk, findOne: vi.fn() } }));
vi.mock('../../models/CartItem.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({
  default: { findByPk: vi.fn(), update: mocks.mockUserUpdate, increment: mocks.mockUserIncrement },
}));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: {} }));
vi.mock('../../models/GalleryVisitor.mjs', () => ({ default: { findByPk: vi.fn(), increment: vi.fn() } }));
vi.mock('../../models/Lead.mjs', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../models/LeadActivity.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../models/Order.mjs', () => ({
  default: { findOrCreate: vi.fn(), findOne: mocks.mockOrderFindOne, update: mocks.mockOrderUpdate },
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

process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';

const { default: stripeWebhookRouter } = await import('../../webhooks/stripeWebhook.mjs');

const buildApp = () => {
  const app = express();
  app.use('/api/webhook/stripe', stripeWebhookRouter);
  return app;
};

const post = () => request(buildApp())
  .post('/api/webhook/stripe')
  .set('stripe-signature', 'sig_unit')
  .set('content-type', 'application/json')
  .send(Buffer.from('{}'));

const charge = (over = {}) => ({
  id: 'ch_test_1',
  payment_intent: 'pi_test_1',
  amount: 840000,
  amount_refunded: 840000,
  currency: 'usd',
  ...over,
});

const adminNotifications = () => mocks.mockSendNotification.mock.calls
  .map(([arg]) => arg)
  .filter((a) => a?.type === 'ADMIN_NOTIFICATION');

describe('refund and chargeback webhooks are handled, never silent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockOrderFindOne.mockResolvedValue({
      id: 91,
      userId: 3,
      orderNumber: 'SS-REFUND-1',
      totalAmount: 8400,
      status: 'completed',
      cartId: 42,
      update: vi.fn().mockResolvedValue(true),
    });
    mocks.mockOrderUpdate.mockResolvedValue([1]);
  });

  it('marks the order refunded on charge.refunded', async () => {
    mocks.currentEvent = { type: 'charge.refunded', data: { object: charge() } };

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.mockOrderFindOne).toHaveBeenCalled();
    const updated = mocks.mockOrderFindOne.mock.results[0];
    expect(updated).toBeDefined();
  });

  it('raises an admin notification naming the sessions at stake', async () => {
    mocks.currentEvent = { type: 'charge.refunded', data: { object: charge() } };

    await post();

    const alerts = adminNotifications();
    expect(alerts.length).toBeGreaterThan(0);
    expect(JSON.stringify(alerts)).toMatch(/refund/i);
  });

  // The whole safety argument: detection ships, revocation waits for policy.
  it('does NOT revoke sessions or demote the role automatically', async () => {
    mocks.currentEvent = { type: 'charge.refunded', data: { object: charge() } };

    await post();

    expect(mocks.mockUserIncrement).not.toHaveBeenCalled();
    // No role write of any shape.
    const roleWrites = mocks.mockUserUpdate.mock.calls
      .filter(([values]) => values && Object.prototype.hasOwnProperty.call(values, 'role'));
    expect(roleWrites).toHaveLength(0);
  });

  it('flags a chargeback on charge.dispute.created without marking it refunded', async () => {
    mocks.currentEvent = {
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_1', charge: 'ch_test_1', payment_intent: 'pi_test_1', amount: 840000, reason: 'fraudulent' } },
    };

    const response = await post();

    expect(response.status).toBe(200);
    const alerts = adminNotifications();
    expect(JSON.stringify(alerts)).toMatch(/dispute|chargeback/i);
  });

  // Silent fall-through on a money event is the defect, not the fallback.
  it('alerts even when no order matches the charge', async () => {
    mocks.mockOrderFindOne.mockResolvedValue(null);
    mocks.currentEvent = { type: 'charge.refunded', data: { object: charge({ payment_intent: 'pi_orphan' }) } };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminNotifications().length).toBeGreaterThan(0);
  });

  it('acknowledges the event even if the alert transport fails (no Stripe retry storm)', async () => {
    mocks.mockSendNotification.mockRejectedValue(new Error('smtp down'));
    mocks.currentEvent = { type: 'charge.refunded', data: { object: charge() } };

    const response = await post();

    expect(response.status).toBe(200);
  });
});

/**
 * SWA-168 item 3 (partial) — Kimi K3 HIGH-1.
 *
 * The ACH success handler looked the order up by `metadata.orderId` AND `paymentId`:
 *     Order.findOne({ where: { id: parseInt(pi.metadata.orderId), paymentId: pi.id } })
 *
 * `metadata.orderId` can be STALE. The ACH route creates the Order and the
 * PaymentIntent inside one DB transaction; if anything after `paymentIntents.create`
 * fails, the DB rolls back but the PaymentIntent PERSISTS carrying a dangling orderId.
 * On retry with the same idempotency key a NEW Order is created while Stripe returns
 * the ORIGINAL PaymentIntent — still carrying the old id.
 *
 * The lookup then matched nothing and the handler fell through in SILENCE: no log, no
 * alert, no fulfilment. ACH settles 1-3 days later, so it surfaced long after the fact.
 *
 * The payment instrument is the truth, not the metadata: match on `paymentId` first.
 * When nothing matches at all, ALERT — a captured ACH payment with no order is
 * exactly the condition a human must see.
 */
describe('ACH success must never silently fail to find its order', () => {
  const achEvent = (over = {}) => ({
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_ach_1',
        metadata: { source: 'swanstudios_ach', orderId: '999', orderNumber: 'SS-ACH-1' },
        amount_received: 840000,
        ...over,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
  });

  it('finds the order by paymentId even when metadata.orderId is stale', async () => {
    mocks.mockOrderFindOne.mockImplementation(async ({ where }) => (
      where?.paymentId === 'pi_ach_1' && where?.id === undefined
        ? { id: 91, userId: 3, orderNumber: 'SS-ACH-1', status: 'completed',
            paymentAppliedAt: new Date(), update: vi.fn().mockResolvedValue(true) }
        : null
    ));
    mocks.currentEvent = achEvent();

    const response = await post();

    expect(response.status).toBe(200);
    // First lookup must be by payment instrument alone.
    const firstWhere = mocks.mockOrderFindOne.mock.calls[0][0].where;
    expect(firstWhere).toMatchObject({ paymentId: 'pi_ach_1' });
    expect(firstWhere.id).toBeUndefined();
  });

  it('alerts when a captured ACH payment matches no order at all', async () => {
    mocks.mockOrderFindOne.mockResolvedValue(null);
    mocks.currentEvent = achEvent();

    const response = await post();

    expect(response.status).toBe(200);
    const alerts = adminNotifications();
    expect(alerts.length, 'an unmatched ACH payment must alert, not fall through').toBeGreaterThan(0);
    expect(JSON.stringify(alerts)).toMatch(/ach|orphan|no matching order/i);
  });
});
