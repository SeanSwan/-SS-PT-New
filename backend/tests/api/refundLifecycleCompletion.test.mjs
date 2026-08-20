/**
 * REGRESSION: the refund/dispute lifecycle must be observable end-to-end.
 * ======================================================================
 *
 * PURPOSE
 *   The money path detects when a reversal STARTS (`charge.refunded`,
 *   `charge.dispute.created`) but was blind to every subsequent transition. This
 *   suite locks the closing half of that lifecycle.
 *
 * WHY THIS EXISTS — the three blind spots, in business terms
 *
 *   1. `charge.dispute.closed` — A dispute is opened and flagged. Weeks later it is
 *      WON or LOST and **nothing fires**. A lost dispute means the money is gone
 *      permanently while the customer keeps every granted session, and the only
 *      signal anyone ever received was the *opening* alert. A won dispute means the
 *      flag should be cleared and nobody is told to clear it.
 *
 *   2. `charge.refund.updated` — A refund can FAIL after being issued (bank rejects
 *      it, card closed). Stripe reports that here. Without it an order sits marked
 *      `refunded` while the customer was never actually repaid — the books say one
 *      thing and the bank says another.
 *
 *   3. `charge.refund.created` — the per-refund event. `charge.refunded` fires on the
 *      charge and carries a CUMULATIVE total; this fires once per individual refund.
 *      Needed to reconcile a sequence of partials without inferring deltas.
 *
 * SCOPE — deliberately DETECTION ONLY.
 *   Whether a reversal claws back sessions or demotes a role is an unmade owner
 *   decision (consumption-freeze vs revoke). Every case here asserts that NOTHING is
 *   revoked and NO role is written. When the policy lands it hangs off this handler;
 *   the observability is already in place and proven.
 *
 * FAIL-OPEN CONTRACT
 *   Alert transport failures are swallowed. A 500 here makes Stripe retry, and
 *   sustained failures get the endpoint disabled — which would kill fulfilment for
 *   ALL sales. Acknowledging is always correct; losing an alert is survivable,
 *   losing the webhook endpoint is not.
 *
 * RELATED
 *   webhooks/stripeWebhook.mjs -> handleChargeReversal
 *   tests/api/stripeRefundDisputeHandling.test.mjs (the opening half)
 *   SWA-168 slice 1 · work order MONEY-PATH-WORK-ORDER-2026-08-19.md
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
}));

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() { return mocks.mockStripeClient; }) }));
vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => true, isTwilioEnabled: () => false }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../models/ShoppingCart.mjs', () => ({ default: { findByPk: vi.fn(), findOne: vi.fn(), update: vi.fn() } }));
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
  grantSessionsForCart: vi.fn(),
  getStorefrontSessionCredits: (i) => Number(i?.sessions || i?.totalSessions || 0),
}));

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

const adminAlerts = () => mocks.mockSendNotification.mock.calls
  .map(([a]) => a)
  .filter((a) => a?.type === 'ADMIN_NOTIFICATION');

const orderUpdate = vi.fn();

describe('refund/dispute lifecycle — the closing half is observable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderUpdate.mockResolvedValue(true);
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockOrderFindOne.mockResolvedValue({
      id: 91, userId: 3, orderNumber: 'SS-LC-1', cartId: 42,
      totalAmount: 8400, status: 'completed', update: orderUpdate,
    });
    mocks.mockOrderUpdate.mockResolvedValue([1]);
  });

  // ── charge.dispute.closed ────────────────────────────────────────────────
  // The single most expensive blind spot: money already gone, sessions still live,
  // and the only signal ever sent was the OPENING alert weeks earlier.
  it('alerts when a dispute is LOST, naming the outcome', async () => {
    mocks.currentEvent = {
      type: 'charge.dispute.closed',
      data: { object: { id: 'dp_1', charge: 'ch_1', payment_intent: 'pi_1', amount: 840000, status: 'lost', reason: 'fraudulent' } },
    };

    const response = await post();

    expect(response.status).toBe(200);
    const alerts = adminAlerts();
    expect(alerts.length, 'a closed dispute must alert').toBeGreaterThan(0);
    expect(JSON.stringify(alerts)).toMatch(/lost/i);
  });

  it('alerts when a dispute is WON so the flag can be cleared', async () => {
    mocks.currentEvent = {
      type: 'charge.dispute.closed',
      data: { object: { id: 'dp_2', charge: 'ch_1', payment_intent: 'pi_1', amount: 840000, status: 'won' } },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(JSON.stringify(adminAlerts())).toMatch(/won/i);
  });

  // A won dispute means the money was NOT lost — marking the order refunded would
  // be actively wrong bookkeeping.
  //
  // NOTE ON THIS PAYLOAD: it deliberately carries `amount_refunded` equal to `amount`,
  // which a real Stripe dispute object does NOT. That is the point. Without it the
  // status guard is unreachable — `amount_refunded` defaults to 0, `0 >= amount` is
  // false, and the flip cannot happen for unrelated reasons, so the test passes even
  // with the guard deleted (confirmed by mutation). Feeding a charge-shaped payload
  // makes the event-type guard the ONLY thing preventing the write, which is exactly
  // what this asserts — and it is the defensive case that matters if Stripe ever
  // widens the object or an upstream handler forwards the wrong shape.
  it('never marks the order refunded on a WON dispute, even on a charge-shaped payload', async () => {
    mocks.currentEvent = {
      type: 'charge.dispute.closed',
      data: {
        object: {
          id: 'dp_3', charge: 'ch_1', payment_intent: 'pi_1',
          amount: 840000, amount_refunded: 840000, status: 'won',
        },
      },
    };

    await post();

    expect(orderUpdate.mock.calls.filter(([v]) => v?.status === 'refunded')).toHaveLength(0);
  });

  it('never marks the order refunded on a refund.updated carrying a full cumulative total', async () => {
    mocks.currentEvent = {
      type: 'charge.refund.updated',
      data: {
        object: {
          id: 're_9', charge: 'ch_1', payment_intent: 'pi_1',
          amount: 840000, amount_refunded: 840000, status: 'failed',
        },
      },
    };

    await post();

    // A FAILED refund especially must never be booked as a completed refund.
    expect(orderUpdate.mock.calls.filter(([v]) => v?.status === 'refunded')).toHaveLength(0);
  });

  // ── charge.refund.updated ────────────────────────────────────────────────
  // A refund that FAILS after issuance leaves the books saying "refunded" while the
  // customer was never repaid.
  it('alerts when an issued refund subsequently FAILS', async () => {
    mocks.currentEvent = {
      type: 'charge.refund.updated',
      data: { object: { id: 're_1', charge: 'ch_1', payment_intent: 'pi_1', amount: 840000, status: 'failed', failure_reason: 'expired_or_canceled_card' } },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminAlerts().length, 'a failed refund must alert').toBeGreaterThan(0);
    expect(JSON.stringify(adminAlerts())).toMatch(/fail/i);
  });

  // ── charge.refund.created ────────────────────────────────────────────────
  it('records an individual refund being created', async () => {
    mocks.currentEvent = {
      type: 'charge.refund.created',
      data: { object: { id: 're_2', charge: 'ch_1', payment_intent: 'pi_1', amount: 1000, status: 'succeeded' } },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminAlerts().length).toBeGreaterThan(0);
  });

  // ── invariants across the whole lifecycle ────────────────────────────────

  // The scope boundary. Policy is unmade; this handler must not pre-empt it.
  it.each([
    ['charge.dispute.closed', { id: 'dp_4', charge: 'ch_1', payment_intent: 'pi_1', amount: 840000, status: 'lost' }],
    ['charge.refund.updated', { id: 're_3', charge: 'ch_1', payment_intent: 'pi_1', amount: 840000, status: 'failed' }],
    ['charge.refund.created', { id: 're_4', charge: 'ch_1', payment_intent: 'pi_1', amount: 1000, status: 'succeeded' }],
  ])('%s revokes no sessions and writes no role', async (type, object) => {
    mocks.currentEvent = { type, data: { object } };

    await post();

    expect(mocks.mockUserIncrement).not.toHaveBeenCalled();
    expect(
      mocks.mockUserUpdate.mock.calls.filter(([v]) => v && Object.prototype.hasOwnProperty.call(v, 'role'))
    ).toHaveLength(0);
  });

  // Silent fall-through on a money event is the defect this whole lane exists to kill.
  it.each([
    'charge.dispute.closed',
    'charge.refund.updated',
    'charge.refund.created',
  ])('%s still alerts when NO order matches the charge', async (type) => {
    mocks.mockOrderFindOne.mockResolvedValue(null);
    mocks.currentEvent = {
      type,
      data: { object: { id: 'x_1', charge: 'ch_orphan', payment_intent: 'pi_orphan', amount: 5000, status: 'lost' } },
    };

    const response = await post();

    expect(response.status).toBe(200);
    expect(adminAlerts().length, 'an unmatched reversal must never fall through silently').toBeGreaterThan(0);
  });

  // A down mail transport must not turn a webhook into a Stripe retry storm.
  it.each([
    'charge.dispute.closed',
    'charge.refund.updated',
    'charge.refund.created',
  ])('%s acknowledges 200 even if the alert transport is down', async (type) => {
    mocks.mockSendNotification.mockRejectedValue(new Error('smtp down'));
    mocks.currentEvent = {
      type,
      data: { object: { id: 'y_1', charge: 'ch_1', payment_intent: 'pi_1', amount: 5000, status: 'lost' } },
    };

    const response = await post();

    expect(response.status).toBe(200);
  });
});
