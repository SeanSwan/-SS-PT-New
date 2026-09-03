/**
 * stripeWebhookRedelivery.test.mjs
 * ================================
 * Blueprint v3 F8. The claim "the webhook cannot double-grant" rested entirely on
 * a CODE COMMENT — `stripeWebhook.mjs` says "FinancialTransaction-keyed idempotent"
 * and the repo believed it. Two sibling suites named "idempotency truth" turn out
 * to `readFileSync` the handler and assert `toContain('ON CONFLICT')`, which proves
 * a string is present in a file, not that a second delivery grants nothing.
 *
 * Stripe redelivers on any non-2xx, on timeouts, and on manual replay from the
 * dashboard. If redelivery double-granted, a customer who paid once would receive
 * sessions twice, and the only thing standing between that and the ledger was a
 * comment nobody had executed.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT — this is the whole design:
 *   REAL: the router, the handler, and `SessionGrantService` itself. The
 *         idempotency decision is made by production code at
 *         `SessionGrantService.mjs:206` (`cart.sessionsGranted === true`).
 *   FAKE: the persistence beneath it. The cart is a stateful object whose
 *         `.update()` mutates its own fields the way a Sequelize row would, so
 *         the flag the service writes on delivery 1 is the flag it reads on
 *         delivery 2.
 *
 * Mocking `grantSessionsForCart` itself would have been easier and worthless: the
 * test would then assert that a mock returns what the mock was told to return.
 *
 * The write being counted is `user.increment('availableSessions')`, the single
 * point where a paying customer's balance actually moves.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  // The control switch. When false, the cart refuses to persist `sessionsGranted`,
  // which is exactly what a missed idempotency lookup looks like to the service.
  idempotencyPersists: true,
  grants: [],
  mockStripeClient: { webhooks: { constructEvent: vi.fn() } },
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  cart: null,
  user: null,
  achOrder: null,
  allocations: [],
  achIdempotencyPersists: true,
}));

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() { return mocks.mockStripeClient; }) }));
vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => true, isTwilioEnabled: () => false }));
vi.mock('../../utils/logger.mjs', () => ({ default: mocks.mockLogger }));

// ── Persistence layer: fake, but stateful ────────────────────────────────────
vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(async () => ({
      commit: vi.fn(), rollback: vi.fn(), LOCK: { UPDATE: 'UPDATE' },
    })),
  },
}));
vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => ({ findOne: vi.fn(async () => mocks.cart) }),
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => ({ findByPk: vi.fn(async () => mocks.user) }),
}));

// ── Collaborators the grant service calls but this test is not about ─────────
vi.mock('../../services/cartCheckoutFulfillmentService.mjs', () => ({
  createCartOrderIfPossible: vi.fn(async () => ({ productItemsFulfilled: 0, orderId: null })),
  loadOptionalFulfillmentModels: vi.fn(async () => ({ ProductVariant: null, Order: null, OrderItem: null })),
  isPhysicalCartItem: () => false,
}));
vi.mock('../../services/sessionBillingPolicy.mjs', () => ({ isNonDeductingClient: () => false }));
vi.mock('../../services/cartCheckoutSnapshotService.mjs', () => ({
  // Returns the cart's items, because the real hydrator does and the service
  // ASSIGNS its return value over cart.cartItems. Stubbing it to undefined
  // silently zeroed the session credits and granted nothing - the failure looked
  // exactly like working idempotency, which is how it nearly passed as a green.
  hydrateCartCheckoutItems: vi.fn(async ({ cart }) => cart.cartItems),
  readCartCheckoutSnapshot: () => null,
}));

// ── The webhook module graph ─────────────────────────────────────────────────
vi.mock('../../models/ShoppingCart.mjs', () => ({ default: { findByPk: vi.fn(async () => mocks.cart), findOne: vi.fn(async () => mocks.cart) } }));
vi.mock('../../models/CartItem.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn(async () => mocks.user) } }));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: {} }));
vi.mock('../../models/GalleryVisitor.mjs', () => ({ default: { findByPk: vi.fn(), increment: vi.fn() } }));
vi.mock('../../models/GalleryDonation.mjs', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../../models/PrintOrder.mjs', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../../models/Lead.mjs', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../models/LeadActivity.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../models/Order.mjs', () => ({ default: { findOrCreate: vi.fn(), findOne: vi.fn(async () => mocks.achOrder), update: vi.fn() } }));
vi.mock('../../models/CustomPackage.mjs', () => ({ default: { findByPk: vi.fn(), findOne: vi.fn() } }));
vi.mock('../../services/roleService.mjs', () => ({ upgradeToClient: vi.fn() }));
vi.mock('../../services/notificationService.mjs', () => ({ sendNotification: vi.fn() }));
// Must return a PROMISE: the caller chains .catch() on it directly, so a bare
// vi.fn() returning undefined throws where production would have swallowed a
// non-fatal commission error.
vi.mock('../../services/CommissionService.mjs', () => ({ createCommissionForPurchase: vi.fn(async () => {}) }));
vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({ default: { recordLedgerEntry: vi.fn() } }));
vi.mock('../../services/sessions/session.service.mjs', () => ({
  default: {
    allocateSessionsFromOrder: vi.fn(async (orderId, userId) => {
      mocks.allocations.push({ orderId, userId });
      return { allocated: 4, totalSessions: 4 };
    }),
  },
}));
// Returns { record, created } because the real helper does and the caller
// DESTRUCTURES it. Returning undefined threw inside the post-grant follow-up,
// which the handler catches into a 500 - a redelivery-storm shape that had
// nothing to do with idempotency.
vi.mock('../../utils/paymentIdempotency.mjs', () => ({
  claimIdempotentRecord: vi.fn(async () => ({
    record: { id: 1, update: vi.fn(async () => {}) },
    created: true,
  })),
}));
vi.mock('../../services/galleryVipFulfillmentService.mjs', () => ({ fulfillGalleryVipSession: vi.fn() }));
vi.mock('../../services/sessionPackageCheckoutFulfillmentService.mjs', () => ({
  isSessionPackageCheckoutSession: () => false,
  fulfillSessionPackageCheckoutSession: vi.fn(),
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';

const { default: stripeWebhookRouter } = await import('../../webhooks/stripeWebhook.mjs');

const CART_ID = 77;
const USER_ID = 42;
const SESSIONS_IN_PACKAGE = 8;
const CHECKOUT_SESSION_ID = 'cs_test_redelivery_1';

function seedWorld() {
  mocks.grants = [];
  mocks.user = {
    id: USER_ID,
    role: 'user',
    availableSessions: 0,
    stripeCustomerId: 'cus_existing',
    increment: vi.fn(async (field, opts) => { mocks.grants.push({ field, by: opts?.by }); }),
    update: vi.fn(async () => {}),
  };
  mocks.cart = {
    id: CART_ID,
    userId: USER_ID,
    status: 'active',
    // The idempotency key. Production reads it at SessionGrantService.mjs:206.
    sessionsGranted: false,
    // The cart already owns this checkout session, which is the ordinary healthy
    // shape: v2PaymentRoutes writes the id back when it claims the cart. Leaving
    // it null routes into the ADOPTION branch instead, which refuses to grant
    // unless the charged amount matches cart.total — a different code path with a
    // different failure mode, and not the one redelivery is about.
    checkoutSessionId: CHECKOUT_SESSION_ID,
    total: 1400,
    cartItems: [{
      id: 1,
      quantity: 1,
      price: 1400,
      storefrontItem: { id: 9, name: 'Test package', sessions: SESSIONS_IN_PACKAGE },
    }],
    user: mocks.user,
    update: vi.fn(async (fields) => {
      const applied = mocks.idempotencyPersists ? fields : { ...fields, sessionsGranted: false };
      Object.assign(mocks.cart, applied);
    }),
  };
}

const paidEvent = () => ({
  id: 'evt_redelivery_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: CHECKOUT_SESSION_ID,
      payment_status: 'paid',
      amount_total: 140000,
      customer: 'cus_existing',
      metadata: { cartId: String(CART_ID) },
    },
  },
});

const deliver = () => {
  const app = express();
  app.use('/api/webhook/stripe', stripeWebhookRouter);
  return request(app)
    .post('/api/webhook/stripe')
    .set('stripe-signature', 'sig_unit')
    .set('content-type', 'application/json')
    .send(Buffer.from('{}'));
};

describe('Stripe webhook redelivery of the same paid event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.idempotencyPersists = true;
    seedWorld();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => paidEvent());
  });

  it('grants exactly once across two identical deliveries', async () => {
    const first = await deliver();
    const second = await deliver();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // The handler emits only { received: true } and does NOT surface
    // alreadyProcessed to Stripe. Asserted as the code is, not as the spec guessed.
    expect(second.body).toEqual({ received: true });

    expect(mocks.grants).toHaveLength(1);
    expect(mocks.grants[0]).toEqual({ field: 'availableSessions', by: SESSIONS_IN_PACKAGE });
  });

  it('acknowledges the redelivery so Stripe stops retrying', async () => {
    await deliver();
    const second = await deliver();
    // A non-2xx here would make Stripe retry a correctly-fulfilled event forever,
    // and sustained failures get an endpoint disabled — which kills fulfilment for
    // every customer, not only this one.
    expect(second.status).toBeGreaterThanOrEqual(200);
    expect(second.status).toBeLessThan(300);
  });

  it('flips the idempotency key on the first delivery', async () => {
    expect(mocks.cart.sessionsGranted).toBe(false);
    await deliver();
    expect(mocks.cart.sessionsGranted).toBe(true);
  });

  it('still grants once when the event arrives three times', async () => {
    await deliver();
    await deliver();
    await deliver();
    expect(mocks.grants).toHaveLength(1);
  });

  // THE CONTROL, executed rather than described. With the idempotency key unable
  // to persist, the same two deliveries MUST double-grant. If this ever reports a
  // single grant, the assertions above are measuring something other than
  // idempotency and their green means nothing.
  it('CONTROL: double-grants when the idempotency key cannot persist', async () => {
    mocks.idempotencyPersists = false;

    await deliver();
    await deliver();

    expect(mocks.grants).toHaveLength(2);
    expect(mocks.cart.sessionsGranted).toBe(false);
  });
});


/**
 * The ACH rail keys idempotency on a DIFFERENT field: `order.paymentAppliedAt`,
 * not the cart flag. Two rails, two keys — so proving one says nothing about the
 * other, and the ACH one is the rail where a redelivery would double-ALLOCATE
 * sessions against an order that was already paid.
 *
 * Matched by `paymentId` on purpose: that is the STRONG match, which skips the
 * weak-match coverage check. The coverage check is a separate protection with its
 * own tests; routing through it here would prove that guard, not this one.
 */
describe('ACH payment_intent.succeeded redelivery', () => {
  const ORDER_ID = 501;

  function seedAchOrder() {
    mocks.allocations = [];
    mocks.achOrder = {
      id: ORDER_ID,
      userId: USER_ID,
      orderNumber: 'SS-ACH-501',
      status: 'pending',
      totalAmount: 1400,
      completedAt: null,
      paymentId: 'pi_ach_redelivery',
      // The ACH idempotency key.
      paymentAppliedAt: null,
      update: vi.fn(async (fields) => {
        const applied = mocks.achIdempotencyPersists
          ? fields
          : { ...fields, paymentAppliedAt: null };
        Object.assign(mocks.achOrder, applied);
      }),
    };
  }

  const achEvent = () => ({
    id: 'evt_ach_1',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_ach_redelivery',
        amount_received: 140000,
        metadata: {
          source: 'swanstudios_ach',
          orderId: String(ORDER_ID),
          orderNumber: 'SS-ACH-501',
        },
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.achIdempotencyPersists = true;
    seedAchOrder();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => achEvent());
  });

  it('allocates sessions exactly once across two identical deliveries', async () => {
    const first = await deliver();
    const second = await deliver();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.allocations).toHaveLength(1);
    expect(mocks.allocations[0]).toEqual({ orderId: ORDER_ID, userId: USER_ID });
  });

  it('stamps paymentAppliedAt on the first delivery', async () => {
    expect(mocks.achOrder.paymentAppliedAt).toBeNull();
    await deliver();
    expect(mocks.achOrder.paymentAppliedAt).toBeInstanceOf(Date);
  });

  // The ACH twin of the cart control.
  it('CONTROL: double-allocates when paymentAppliedAt cannot persist', async () => {
    mocks.achIdempotencyPersists = false;

    await deliver();
    await deliver();

    expect(mocks.allocations).toHaveLength(2);
  });
});
