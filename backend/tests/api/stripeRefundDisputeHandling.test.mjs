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
  // Downstream side effects of processCompletedOrder. Declared as real spies so the
  // "leaks nothing" assertions test something — asserting `not.toHaveBeenCalled()` on
  // an undeclared mock passes against `undefined` and proves nothing.
  mockUpgradeToClient: vi.fn(),
  mockCreateCommissionForPurchase: vi.fn(),
  mockRecordLedgerEntry: vi.fn(),
  mockOrderFindOrCreate: vi.fn(),
  mockUserFindByPk: vi.fn(),
}));

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() { return mocks.mockStripeClient; }) }));
vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => true, isTwilioEnabled: () => false }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../models/ShoppingCart.mjs', () => ({ default: { findByPk: mocks.mockCartFindByPk, findOne: vi.fn() } }));
vi.mock('../../models/CartItem.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({
  default: { findByPk: mocks.mockUserFindByPk, update: mocks.mockUserUpdate, increment: mocks.mockUserIncrement },
}));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: {} }));
vi.mock('../../models/GalleryVisitor.mjs', () => ({ default: { findByPk: vi.fn(), increment: vi.fn() } }));
vi.mock('../../models/Lead.mjs', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../models/LeadActivity.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../models/Order.mjs', () => ({
  default: { findOrCreate: mocks.mockOrderFindOrCreate, findOne: mocks.mockOrderFindOne, update: mocks.mockOrderUpdate },
}));
vi.mock('../../services/roleService.mjs', () => ({ upgradeToClient: mocks.mockUpgradeToClient }));
vi.mock('../../services/notificationService.mjs', () => ({ sendNotification: mocks.mockSendNotification }));
vi.mock('../../services/CommissionService.mjs', () => ({ createCommissionForPurchase: mocks.mockCreateCommissionForPurchase }));
vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: { recordLedgerEntry: mocks.mockRecordLedgerEntry },
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
/**
 * Round 5 — the round-4 fixes shipped with source-level assertions only. A fix
 * without a behavioural test is a claim, not a guarantee; these are the executions.
 */
describe('partial refunds are not full refunds', () => {
  const orderUpdate = vi.fn();

  const chargeWith = ({ total, cumulative, latest }) => ({
    id: 'ch_p1',
    payment_intent: 'pi_p1',
    amount: total,
    amount_refunded: cumulative,
    refunds: { data: [{ amount: latest }] },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    orderUpdate.mockResolvedValue(true);
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockOrderFindOne.mockResolvedValue({
      id: 91, userId: 3, orderNumber: 'SS-P1', cartId: 42,
      totalAmount: 8400, status: 'completed', update: orderUpdate,
    });
  });

  it('does NOT mark the order refunded on a partial refund', async () => {
    // $10 refunded on an $8,400 charge. The old code used the cumulative figure and
    // flipped status on the first cent.
    mocks.currentEvent = {
      type: 'charge.refunded',
      data: { object: chargeWith({ total: 840000, cumulative: 1000, latest: 1000 }) },
    };

    await post();

    const statusWrites = orderUpdate.mock.calls
      .filter(([v]) => v && v.status === 'refunded');
    expect(statusWrites, 'a partial refund must not mark the order refunded').toHaveLength(0);
  });

  it('reports the LATEST refund delta, not the cumulative total', async () => {
    // Second partial: $10 more on top of an earlier $10.
    mocks.currentEvent = {
      type: 'charge.refunded',
      data: { object: chargeWith({ total: 840000, cumulative: 2000, latest: 1000 }) },
    };

    await post();

    const alert = adminNotifications()[0];
    expect(alert.data.amount).toBe(10);            // this event
    expect(alert.data.cumulativeRefunded).toBe(20); // running total, separately
    expect(alert.data.fullyRefunded).toBe(false);
    expect(alert.title).toMatch(/PARTIAL/);
  });

  it('DOES mark the order refunded once the cumulative total reaches the charge', async () => {
    mocks.currentEvent = {
      type: 'charge.refunded',
      data: { object: chargeWith({ total: 840000, cumulative: 840000, latest: 838000 }) },
    };

    await post();

    const statusWrites = orderUpdate.mock.calls
      .filter(([v]) => v && v.status === 'refunded');
    expect(statusWrites).toHaveLength(1);
    expect(adminNotifications()[0].data.fullyRefunded).toBe(true);
  });
});

describe('the payment intent is persisted so refunds can find the order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockCartFindByPk.mockResolvedValue({ id: 42, userId: 3 });
    mocks.mockGrantSessionsForCart.mockResolvedValue({
      granted: true, sessionsAdded: 10, alreadyProcessed: false,
    });
    mocks.mockOrderUpdate.mockResolvedValue([1]);
    mocks.mockOrderFindOne.mockResolvedValue(null);
  });

  it('writes stripePaymentIntentId on checkout.session.completed, only when NULL', async () => {
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_done_1',
          payment_status: 'paid',
          payment_intent: 'pi_done_1',
          amount_total: 840000,
          metadata: { cartId: '42', userId: '3' },
        },
      },
    };

    await post();

    const piWrite = mocks.mockOrderUpdate.mock.calls
      .find(([values]) => values && values.stripePaymentIntentId === 'pi_done_1');

    expect(piWrite, 'the PI must be persisted or card refunds can never match').toBeDefined();
    // Conditional on NULL so a Stripe redelivery is a no-op and never overwrites.
    expect(piWrite[1].where).toMatchObject({ cartId: 42, stripePaymentIntentId: null });
  });
});

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


/**
 * GLM-5.3 H1 / Kimi K3 C1, 2026-08-19 — the most damaging finding of the review.
 *
 * The adoption guard REFUSED the session grant and returned normally. The webhook did
 * not inspect the result, so it carried straight on into processCompletedOrder and
 * leaked every downstream side effect around the very grant it had just blocked:
 *
 *   - `upgradeToClient(userId)` — role promoted to `client` with ZERO sessions granted,
 *     violating the one invariant this whole workstream exists to protect.
 *   - `createOrderRecord` — a `completed` Order booked at the MUTATED live-cart total
 *     ($5,060) against what was actually paid ($60).
 *   - `createCommissionForPurchase` — trainer commission on money never collected.
 *   - gamification points and a "New Purchase" admin notification.
 *
 * So the fix stopped the grant and leaked everything else — strictly worse than not
 * having guarded at all, because the money side effects fired without the sessions.
 *
 * The handler now terminates the case before any of that runs. These tests assert the
 * WHOLE downstream chain is dead, not merely that sessions were not granted.
 */
describe('an unfulfillable payment leaks NO downstream side effects', () => {
  const unfulfillableResult = {
    granted: false,
    sessionsAdded: 0,
    alreadyProcessed: false,
    unfulfillable: true,
    reason: 'ADOPTION_UNVERIFIABLE',
    alertContext: { cartId: 42, userId: 3, amountTotalCents: 6000, cartTotalCents: 506000 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    // The cart MUST carry items and the user MUST resolve, or processCompletedOrder
    // returns early and the downstream assertions below pass whether or not the
    // short-circuit exists. Confirmed by mutation: with a bare `{id,userId}` cart,
    // disabling the guard failed only 1 of 7 cases — the other six could not reach
    // the code they claimed to protect. This mock reproduces GLM H1's exact scenario:
    // a sweeper-released cart MUTATED to $5,060 of sessions against a $60 payment.
    mocks.mockCartFindByPk.mockResolvedValue({
      id: 42,
      userId: 3,
      cartItems: [{
        id: 9,
        storefrontItemId: 11,
        quantity: 1,
        price: 5060,
        storefrontItem: { id: 11, name: 'Rhodium Swan Package', sessions: 48, packageType: 'fixed' },
      }],
    });
    mocks.mockUserFindByPk.mockResolvedValue({ id: 3, role: 'user', email: 'buyer@example.test', firstName: 'A', lastName: 'B' });
    mocks.mockGrantSessionsForCart.mockResolvedValue(unfulfillableResult);
    mocks.mockOrderFindOne.mockResolvedValue(null);
    mocks.mockOrderUpdate.mockResolvedValue([1]);
    // Must resolve a real tuple, or createOrderRecord throws on destructure and the
    // chain dies before upgradeToClient/commission/gamification — leaving those
    // assertions unreachable (proven by mutation).
    mocks.mockOrderFindOrCreate.mockResolvedValue([
      { id: 91, orderNumber: 'SS-LEAK', totalAmount: 5060, status: 'completed', update: vi.fn().mockResolvedValue(true) },
      true,
    ]);
    mocks.currentEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_orphan_A',
          payment_status: 'paid',
          payment_intent: 'pi_orphan',
          amount_total: 6000,
          metadata: { cartId: '42', userId: '3' },
        },
      },
    };
  });

  it('acknowledges 200 — the condition is terminal, retrying cannot fix it', async () => {
    const response = await post();
    expect(response.status).toBe(200);
  });

  it('RAISES an admin alert — captured money must never be silent', async () => {
    await post();

    const alerts = adminNotifications();
    expect(alerts.length, 'captured-but-unfulfilled must alert').toBeGreaterThan(0);
    expect(JSON.stringify(alerts)).toMatch(/not fulfilled|MANUAL_FULFIL_OR_REFUND/i);
  });

  it('does NOT promote the user — the invariant this workstream exists to protect', async () => {
    await post();
    expect(mocks.mockUpgradeToClient).not.toHaveBeenCalled();
  });

  it('does NOT pay trainer commission on money that was never collected', async () => {
    await post();
    expect(mocks.mockCreateCommissionForPurchase).not.toHaveBeenCalled();
  });

  it('does NOT book a completed order at the mutated cart total', async () => {
    await post();
    expect(mocks.mockOrderFindOrCreate).not.toHaveBeenCalled();
  });

  it('does NOT award gamification points', async () => {
    await post();
    expect(mocks.mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it('does NOT send a "New Purchase" notification for an unfulfilled payment', async () => {
    await post();

    const purchase = adminNotifications().filter((a) => /new purchase/i.test(a?.title ?? ''));
    expect(purchase).toHaveLength(0);
  });
});
