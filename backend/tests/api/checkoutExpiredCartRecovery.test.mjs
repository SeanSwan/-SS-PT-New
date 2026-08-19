/**
 * Regression: an expired Stripe Checkout session must RELEASE the cart.
 *
 * Found 2026-08-16 by BOTH Kimi K3 (MEDIUM-3) and GLM-5.3 (E4) in a full-family
 * review. Two live, signature-verified Stripe webhook handlers exist:
 *
 *   canonical  webhooks/stripeWebhook.mjs   -> /webhooks/stripe, /api/webhook/stripe
 *   legacy     routes/cartRoutes.mjs        -> /api/cart/webhook
 *
 * They had DIVERGED on `checkout.session.expired`. Legacy reset the cart:
 *     { status:'active', paymentStatus:'cancelled', checkoutSessionExpired:true,
 *       checkoutSessionId:null, paymentIntentId:null }
 * Canonical only set `checkoutSessionExpired = true`, leaving the cart in
 * `pending_payment` with a dead session id.
 *
 * A cart stuck in `pending_payment` fails every subsequent `POST /cart/add` with
 * 409 CART_CHECKOUT_IN_PROGRESS, and `/cancel-checkout` cannot help because it
 * requires the very session id the customer no longer has. A customer who simply
 * lets a Stripe session time out is locked out of their own cart indefinitely —
 * and which behaviour they get depends on which URL the Stripe dashboard points at.
 *
 * The conditional `where` is load-bearing: it must only release a cart that is
 * still pending on THIS session, so a webhook arriving after the customer already
 * paid (or already recovered the cart) cannot clobber newer state.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentEvent: null,
  mockStripeClient: { webhooks: { constructEvent: vi.fn() } },
  mockCartUpdate: vi.fn(),
  mockCartFindByPk: vi.fn(),
}));

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() { return mocks.mockStripeClient; }) }));
vi.mock('../../utils/apiKeyChecker.mjs', () => ({ isStripeEnabled: () => true, isTwilioEnabled: () => false }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../models/ShoppingCart.mjs', () => ({
  default: { findByPk: mocks.mockCartFindByPk, update: mocks.mockCartUpdate, findOne: vi.fn() },
}));
vi.mock('../../models/CartItem.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: vi.fn(), update: vi.fn(), increment: vi.fn() } }));
vi.mock('../../models/StorefrontItem.mjs', () => ({ default: {} }));
vi.mock('../../models/GalleryVisitor.mjs', () => ({ default: { findByPk: vi.fn(), increment: vi.fn() } }));
vi.mock('../../models/Lead.mjs', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../models/LeadActivity.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../models/Order.mjs', () => ({ default: { findOrCreate: vi.fn(), findOne: vi.fn(), update: vi.fn() } }));
vi.mock('../../services/roleService.mjs', () => ({ upgradeToClient: vi.fn() }));
vi.mock('../../services/notificationService.mjs', () => ({ sendNotification: vi.fn() }));
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

describe('canonical webhook releases the cart on checkout.session.expired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockStripeClient.webhooks.constructEvent.mockImplementation(() => mocks.currentEvent);
    mocks.mockCartUpdate.mockResolvedValue([1]);
    mocks.currentEvent = {
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_expired_1', metadata: { cartId: '42', userId: '3' } } },
    };
  });

  it('returns the cart to active so the customer is not locked out', async () => {
    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.mockCartUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        checkoutSessionExpired: true,
        checkoutSessionId: null,
      }),
      expect.anything()
    );
  });

  // Without this the release could clobber a cart that has since been paid or
  // recovered — the webhook can arrive arbitrarily late.
  it('only releases a cart still pending on THIS session', async () => {
    await post();

    const [, options] = mocks.mockCartUpdate.mock.calls[0];
    expect(options.where).toMatchObject({
      id: 42,
      status: 'pending_payment',
      checkoutSessionId: 'cs_expired_1',
    });
  });

  it('parses the cart id rather than trusting the raw metadata string', async () => {
    mocks.currentEvent.data.object.metadata.cartId = 'not-a-number';

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.mockCartUpdate).not.toHaveBeenCalled();
  });

  it('ignores an expired event with no cartId', async () => {
    mocks.currentEvent.data.object.metadata = {};

    const response = await post();

    expect(response.status).toBe(200);
    expect(mocks.mockCartUpdate).not.toHaveBeenCalled();
  });

  it('keeps ONE implementation, so the two mounts cannot diverge again', () => {
    // 2026-08-16: this used to assert BOTH files carried an equivalent expired-case
    // reset. They no longer both carry one — /api/cart/webhook delegates to the
    // canonical handler by identity, which makes divergence structurally impossible
    // rather than merely asserted. Verify the canonical implementation, and that the
    // legacy mount has no competing copy.
    const canonical = readFileSync(resolve(process.cwd(), 'webhooks/stripeWebhook.mjs'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    const start = canonical.indexOf("case 'checkout.session.expired'");
    expect(start, 'canonical must handle checkout.session.expired').toBeGreaterThan(-1);
    const nextCase = canonical.indexOf("case '", start + 10);
    const scoped = canonical.slice(start, nextCase > -1 ? nextCase : start + 2000);

    expect(scoped).toContain("status: 'active'");
    expect(scoped).toContain('checkoutSessionId: null');
    expect(scoped).toContain("status: 'pending_payment'");
    expect(scoped).toContain('checkoutSessionId: session.id');

    const legacy = readFileSync(resolve(process.cwd(), 'routes/cartRoutes.mjs'), 'utf8');
    expect(legacy).toContain('stripeWebhookHandler');
    expect(legacy).not.toContain("case 'checkout.session.expired'");
  });
});
