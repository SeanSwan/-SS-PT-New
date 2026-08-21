/**
 * achPaymentIntentLifecycle.test.mjs
 * ==================================
 * Three findings from the 2026-08-19 Kimi K3 / GLM-5.3 hostile review, all on
 * the ACH PaymentIntent branches of the webhook.
 *
 * 1. (Kimi M2 / GLM M1) `payment_intent.succeeded` was hardened with a metadata
 *    fallback, safe-integer parsing and an orphan alert. Its two siblings —
 *    `processing` and `payment_failed` — were left on the ORIGINAL combined
 *    `{ id: parseInt(...), paymentId: pi.id }` lookup: no fallback, no
 *    safe-integer guard, and no signal when the update matches zero rows. A
 *    failed ACH payment on a stale-metadata order sits `pending` forever and
 *    nobody learns. Fix-shaped propagation that never happened.
 *
 * 2. (Kimi M2) The metadata fallback on `succeeded` completes the order and
 *    allocates sessions with NO check that the money received covers the order
 *    total. Matching on paymentId is a STRONG match; matching on id alone is a
 *    WEAK one, and the weak match was given the same authority as the strong
 *    one. The ACH route persists orders with `paymentId: null` on its
 *    `incomplete` path, so weakly-matched orders are a real population.
 *
 * 3. (Kimi L5) `payment_intent.canceled` had no handler at all: a PI canceled
 *    after creation leaves its order `pending` with nothing to move it.
 *
 * The amount check below is a COVERAGE check, not equality. On this rail both
 * `Order.totalAmount` and the PI `amount` are `totalWithFee` (achPaymentRoutes
 * 276 and 320) — verified before the comparison was written, because the
 * previous amount guard in this workstream compared two numbers that were not
 * the same quantity and refused honest payments for it.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentEvent: null,
  mockStripeClient: { webhooks: { constructEvent: vi.fn() } },
  mockOrderFindOne: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockOrderFindOrCreate: vi.fn(),
  mockSendNotification: vi.fn(),
  mockAllocateSessionsFromOrder: vi.fn(),
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
  default: {
    findOrCreate: mocks.mockOrderFindOrCreate,
    findOne: mocks.mockOrderFindOne,
    update: mocks.mockOrderUpdate,
  },
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
vi.mock('../../services/cartCheckoutFulfillmentService.mjs', () => ({ isPhysicalCartItem: () => false }));
vi.mock('../../services/sessions/session.service.mjs', () => ({
  default: { allocateSessionsFromOrder: mocks.mockAllocateSessionsFromOrder },
}));
vi.mock('../../utils/paymentIdempotency.mjs', () => ({ claimIdempotentRecord: vi.fn() }));
vi.mock('../../services/galleryVipFulfillmentService.mjs', () => ({ fulfillGalleryVipSession: vi.fn() }));
vi.mock('../../database.mjs', () => ({ default: { transaction: vi.fn() } }));

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

const achIntent = (over = {}) => ({
  id: 'pi_ach_1',
  amount: 840000,
  amount_received: 840000,
  currency: 'usd',
  metadata: { source: 'swanstudios_ach', orderId: '91', orderNumber: 'SS-ACH-1' },
  ...over,
});

const adminNotifications = () => mocks.mockSendNotification.mock.calls
  .map(([arg]) => arg)
  .filter((a) => a?.type === 'ADMIN_NOTIFICATION');

const orderRow = (over = {}) => ({
  id: 91,
  userId: 3,
  orderNumber: 'SS-ACH-1',
  totalAmount: 8400,
  status: 'pending',
  paymentId: 'pi_ach_1',
  paymentAppliedAt: null,
  completedAt: null,
  cartId: null,
  update: vi.fn().mockResolvedValue(true),
  ...over,
});

describe('ACH payment_intent lifecycle — every state is visible', () => {
  beforeEach(() => {
    // resetAllMocks, not clearAllMocks: `clear` empties call history but LEAVES
    // queued mockResolvedValueOnce values, so a two-step lookup staged in one
    // test bled into the next and made unrelated assertions pass or fail at
    // random. Every implementation below is re-established after the reset.
    vi.resetAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockOrderUpdate.mockResolvedValue([1]);
    mocks.mockOrderFindOne.mockResolvedValue(orderRow());
    mocks.mockAllocateSessionsFromOrder.mockResolvedValue({ allocated: 48, totalSessions: 48 });
  });

  describe('processing', () => {
    it('finds the order by payment instrument, not by the stale combined key', async () => {
      mocks.currentEvent = { type: 'payment_intent.processing', data: { object: achIntent() } };

      const response = await post();

      expect(response.status).toBe(200);
      expect(mocks.mockOrderFindOne).toHaveBeenCalled();
      const { where } = mocks.mockOrderFindOne.mock.calls[0][0];
      expect(where).toMatchObject({ paymentId: 'pi_ach_1' });
      expect(where).not.toHaveProperty('id');
    });

    it('falls back to the metadata order id when the paymentId match misses', async () => {
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: 'pi_STALE' }));

      mocks.currentEvent = { type: 'payment_intent.processing', data: { object: achIntent() } };
      await post();

      expect(mocks.mockOrderFindOne).toHaveBeenCalledTimes(2);
      expect(mocks.mockOrderFindOne.mock.calls[1][0].where).toMatchObject({ id: 91 });
    });

    it('does NOT query on a non-safe-integer metadata order id', async () => {
      mocks.mockOrderFindOne.mockResolvedValueOnce(null);
      mocks.currentEvent = {
        type: 'payment_intent.processing',
        data: {
          object: achIntent({
            metadata: { source: 'swanstudios_ach', orderId: '99999999999999999999' },
          }),
        },
      };

      await post();

      expect(mocks.mockOrderFindOne).toHaveBeenCalledTimes(1);
    });

    it('is not silent when NOTHING matches', async () => {
      mocks.mockOrderFindOne.mockResolvedValue(null);
      mocks.currentEvent = { type: 'payment_intent.processing', data: { object: achIntent() } };

      const response = await post();

      expect(response.status).toBe(200);
      expect(mocks.mockLogger.error).toHaveBeenCalled();
    });

    it('does NOT downgrade a completed order to processing', async () => {
      // Stripe redelivers, and ACH settles over days: a `processing` event can
      // legitimately arrive AFTER `succeeded`. Without the status guard this
      // rewrites a completed, fulfilled order back to `processing`, which then
      // reads as unfulfilled to every admin surface and reconciliation query.
      // Caught by mutation — the guard existed with nothing asserting it.
      const row = orderRow({ status: 'completed', paymentAppliedAt: new Date() });
      mocks.mockOrderFindOne.mockResolvedValue(row);
      mocks.currentEvent = { type: 'payment_intent.processing', data: { object: achIntent() } };

      await post();

      expect(row.update).not.toHaveBeenCalled();
    });

    it('does not rewrite an order that is already processing', async () => {
      const row = orderRow({ status: 'processing' });
      mocks.mockOrderFindOne.mockResolvedValue(row);
      mocks.currentEvent = { type: 'payment_intent.processing', data: { object: achIntent() } };

      await post();

      expect(row.update).not.toHaveBeenCalled();
    });

    it('marks the matched order processing', async () => {
      const row = orderRow();
      mocks.mockOrderFindOne.mockResolvedValue(row);
      mocks.currentEvent = { type: 'payment_intent.processing', data: { object: achIntent() } };

      await post();

      expect(row.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing' }));
    });
  });

  describe('payment_failed', () => {
    it('uses the same two-step lookup as succeeded', async () => {
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: 'pi_STALE' }));

      mocks.currentEvent = { type: 'payment_intent.payment_failed', data: { object: achIntent() } };
      await post();

      expect(mocks.mockOrderFindOne).toHaveBeenCalledTimes(2);
      expect(mocks.mockOrderFindOne.mock.calls[1][0].where).toMatchObject({ id: 91 });
    });

    it('ALERTS when a failed ACH payment matches no order — the customer thinks they paid', async () => {
      mocks.mockOrderFindOne.mockResolvedValue(null);
      mocks.currentEvent = { type: 'payment_intent.payment_failed', data: { object: achIntent() } };

      await post();

      expect(adminNotifications().length).toBeGreaterThan(0);
    });

    it('marks the matched order failed', async () => {
      const row = orderRow();
      mocks.mockOrderFindOne.mockResolvedValue(row);
      mocks.currentEvent = { type: 'payment_intent.payment_failed', data: { object: achIntent() } };

      await post();

      expect(row.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    });

    it('never allocates sessions on a failure', async () => {
      mocks.currentEvent = { type: 'payment_intent.payment_failed', data: { object: achIntent() } };
      await post();
      expect(mocks.mockAllocateSessionsFromOrder).not.toHaveBeenCalled();
    });
  });

  describe('canceled (Kimi L5 — the state with no handler)', () => {
    // Terminal state is `failed`, NOT `cancelled`. Order.status is a Postgres
    // ENUM of ('pending','pending_payment','processing','completed','refunded',
    // 'failed') — models/Order.mjs:32. Writing 'cancelled' throws
    // `invalid input value for enum` at runtime, and adding the value is
    // production DDL, which this workstream defers deliberately. The
    // cancellation is distinguished in the log and paymentReference instead.
    it('moves the order off pending instead of stranding it', async () => {
      const row = orderRow();
      mocks.mockOrderFindOne.mockResolvedValue(row);
      mocks.currentEvent = { type: 'payment_intent.canceled', data: { object: achIntent() } };

      const response = await post();

      expect(response.status).toBe(200);
      expect(row.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    });

    it('uses only enum-legal status values — a bad value throws in Postgres', async () => {
      const LEGAL = ['pending', 'pending_payment', 'processing', 'completed', 'refunded', 'failed'];
      const row = orderRow();
      mocks.mockOrderFindOne.mockResolvedValue(row);
      mocks.currentEvent = { type: 'payment_intent.canceled', data: { object: achIntent() } };

      await post();

      for (const [patch] of row.update.mock.calls) {
        if (patch?.status !== undefined) expect(LEGAL).toContain(patch.status);
      }
    });

    it('never allocates sessions on a cancellation', async () => {
      mocks.currentEvent = { type: 'payment_intent.canceled', data: { object: achIntent() } };
      await post();
      expect(mocks.mockAllocateSessionsFromOrder).not.toHaveBeenCalled();
    });

    it('does not cancel an order whose payment already applied', async () => {
      const row = orderRow({ paymentAppliedAt: new Date(), status: 'completed' });
      mocks.mockOrderFindOne.mockResolvedValue(row);
      mocks.currentEvent = { type: 'payment_intent.canceled', data: { object: achIntent() } };

      await post();

      expect(row.update).not.toHaveBeenCalled();
    });
  });

  describe('succeeded — a weak match does not get strong-match authority', () => {
    it('allocates on a strong (paymentId) match', async () => {
      mocks.mockOrderFindOne.mockResolvedValue(orderRow());
      mocks.currentEvent = { type: 'payment_intent.succeeded', data: { object: achIntent() } };

      await post();

      expect(mocks.mockAllocateSessionsFromOrder).toHaveBeenCalledWith(91, 3);
    });

    it('allocates on a metadata match when the money covers the order total', async () => {
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: null }));
      mocks.currentEvent = { type: 'payment_intent.succeeded', data: { object: achIntent() } };

      await post();

      expect(mocks.mockAllocateSessionsFromOrder).toHaveBeenCalledWith(91, 3);
    });

    it('REFUSES to allocate when a metadata-matched order costs more than was received', async () => {
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: null, totalAmount: 8400 }));
      mocks.currentEvent = {
        type: 'payment_intent.succeeded',
        data: { object: achIntent({ amount: 6000, amount_received: 6000 }) },
      };

      await post();

      expect(mocks.mockAllocateSessionsFromOrder).not.toHaveBeenCalled();
    });

    it('ALERTS on that refusal rather than dropping it', async () => {
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: null, totalAmount: 8400 }));
      mocks.currentEvent = {
        type: 'payment_intent.succeeded',
        data: { object: achIntent({ amount: 6000, amount_received: 6000 }) },
      };

      await post();

      expect(adminNotifications().length).toBeGreaterThan(0);
    });

    it('refuses when the received amount is UNKNOWN on a weak match — fail closed', async () => {
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: null }));
      mocks.currentEvent = {
        type: 'payment_intent.succeeded',
        data: { object: achIntent({ amount: undefined, amount_received: undefined }) },
      };

      await post();

      expect(mocks.mockAllocateSessionsFromOrder).not.toHaveBeenCalled();
    });

    it('refuses when amount_received is ABSENT but amount is present', async () => {
      // The mutation that exposed this: the old receivedCents fell back to
      // `pi.amount`, the INTENDED figure, and treated it as money received. The
      // sole consumer is the weak-match coverage check, whose whole premise is
      // that this intent may not belong to this order. The earlier
      // "amount UNKNOWN" test set BOTH fields undefined, so it could not tell
      // the two implementations apart (Kimi K3 F5, 2026-08-20).
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: null, totalAmount: 8400 }));
      mocks.currentEvent = {
        type: 'payment_intent.succeeded',
        data: { object: achIntent({ amount: 840000, amount_received: undefined }) },
      };

      await post();

      expect(mocks.mockAllocateSessionsFromOrder).not.toHaveBeenCalled();
    });

    it('alerts on that refusal too', async () => {
      mocks.mockOrderFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(orderRow({ paymentId: null, totalAmount: 8400 }));
      mocks.currentEvent = {
        type: 'payment_intent.succeeded',
        data: { object: achIntent({ amount: 840000, amount_received: undefined }) },
      };

      await post();

      expect(adminNotifications().length).toBeGreaterThan(0);
    });

    it('a STRONG match still allocates without needing amount_received', async () => {
      // Coverage is only demanded of the weak (metadata-only) match. A paymentId
      // match means Stripe itself linked this intent to this order.
      mocks.mockOrderFindOne.mockResolvedValue(orderRow());
      mocks.currentEvent = {
        type: 'payment_intent.succeeded',
        data: { object: achIntent({ amount_received: undefined }) },
      };

      await post();

      expect(mocks.mockAllocateSessionsFromOrder).toHaveBeenCalledWith(91, 3);
    });

    it('does not re-allocate an order that was already applied', async () => {
      mocks.mockOrderFindOne.mockResolvedValue(orderRow({ paymentAppliedAt: new Date() }));
      mocks.currentEvent = { type: 'payment_intent.succeeded', data: { object: achIntent() } };

      await post();

      expect(mocks.mockAllocateSessionsFromOrder).not.toHaveBeenCalled();
    });
  });
});
