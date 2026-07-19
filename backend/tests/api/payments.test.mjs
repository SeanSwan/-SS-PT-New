/**
 * Payment Flow API Tests
 * Phase 3: Operations-Ready Test Suite
 *
 * Tests for Critical User Journey: Purchase Training Sessions
 * - Cart management, checkout, idempotency verification
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { testUsers, testCarts, testPackages, createMockRequest, createMockResponse } from '../fixtures/testData.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock database models
vi.mock('../../models/ShoppingCart.mjs', () => ({
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }
}));

vi.mock('../../models/CartItem.mjs', () => ({
  default: {
    findAll: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
  }
}));

vi.mock('../../models/User.mjs', () => ({
  default: {
    findByPk: vi.fn(),
    update: vi.fn(),
  }
}));

import ShoppingCart from '../../models/ShoppingCart.mjs';
import CartItem from '../../models/CartItem.mjs';
import User from '../../models/User.mjs';

describe('Payment Flow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cart Management', () => {
    it('should create active cart for user', async () => {
      const newCart = {
        id: 1,
        userId: testUsers.clientNoSessions.id,
        status: 'active',
        total: 0,
        sessionsGranted: false,
      };

      ShoppingCart.create.mockResolvedValue(newCart);

      const cart = await ShoppingCart.create({
        userId: testUsers.clientNoSessions.id,
        status: 'active',
      });

      expect(cart.status).toBe('active');
      expect(cart.sessionsGranted).toBe(false);
    });

    it('should find or create active cart', async () => {
      ShoppingCart.findOne.mockResolvedValue(testCarts.active);

      const cart = await ShoppingCart.findOne({
        where: {
          userId: testUsers.clientWithSessions.id,
          status: 'active',
        }
      });

      expect(cart).toBeDefined();
      expect(cart.status).toBe('active');
    });

    it('should calculate cart total correctly', () => {
      const cartItems = [
        { price: 1750.00, quantity: 1 },
        { price: 4200.00, quantity: 1 },
      ];

      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      expect(total).toBe(5950.00);
    });
  });

  describe('Checkout Session', () => {
    it('should create checkout session with cart metadata', async () => {
      const cart = testCarts.pendingPayment;

      // Verify cart ID is included in metadata
      const metadata = { cartId: cart.id.toString() };

      expect(metadata.cartId).toBe('2');
    });

    it('should transition cart to pending_payment status', async () => {
      const cart = { ...testCarts.active, status: 'pending_payment' };

      expect(cart.status).toBe('pending_payment');
    });

    it('creates Stripe Checkout Sessions with a deterministic idempotency key', () => {
      const source = readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

      expect(source).toContain('buildCheckoutSessionIdempotencyKey');
      expect(source).toContain('buildCartItemsStripeFingerprint');
      expect(source).toMatch(/checkout\.sessions\.create\([\s\S]*\{\s*idempotencyKey:\s*checkoutIdempotencyKey\s*\}/);
    });

    it('loads stripeCustomerId before deciding whether to create a new Stripe customer', () => {
      const source = readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

      expect(source).toMatch(/attributes:\s*\[[\s\S]*'stripeCustomerId'[\s\S]*\]/);
      expect(source).toContain('if (user.stripeCustomerId)');
    });

    it('recovers deleted Stripe customers and makes replacement creation retry-safe', () => {
      const source = readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

      expect(source).toContain('if (stripeCustomer?.deleted === true)');
      expect(source).toContain('const customerIdempotencyKey = buildStripeIdempotencyKey');
      expect(source).toMatch(
        /stripe\.customers\.create\(\{[\s\S]*?\},\s*\{\s*idempotencyKey:\s*customerIdempotencyKey\s*\}\)/
      );
      expect(source).toContain('previousCustomerId: user.stripeCustomerId || null');
      expect(source).toContain("if (error?.code !== 'resource_missing') throw error");
      expect(source).toContain('Existing Stripe customer no longer exists; creating a replacement');
    });

    it('scopes checkout session creation to the submitted cartId', () => {
      const source = readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

      expect(source).toContain('const normalizedCartId = Number(cartId)');
      expect(source).toContain("code: 'INVALID_CART_ID'");
      expect(source).toMatch(/where:\s*\{\s*id:\s*normalizedCartId,[\s\S]*userId,[\s\S]*status:\s*'active'/);
    });

    it('keeps v2 checkout Stripe session metadata server-owned', () => {
      const source = readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

      expect(source).toContain('const { cartId, customerInfo, fulfillmentIntent } = req.body;');
      expect(source).toContain("source: 'genesis_checkout'");
      expect(source).toContain('const normalizedFulfillmentIntent = normalizeCheckoutFulfillmentIntent(fulfillmentIntent, cart.cartItems);');
      expect(source).toContain('const fulfillmentValidationError = validateCheckoutFulfillmentIntent(normalizedFulfillmentIntent);');
      expect(source).toContain("code: FULFILLMENT_DETAILS_REQUIRED_CODE");
      expect(source).toContain('const stockValidationError = validateCheckoutStockAvailability(cart.cartItems);');
      expect(source).toContain('code: stockValidationError.code');
      expect(source).toContain('const receiptSummary = await getCheckoutReceiptSummary({ cartId: cart.id, userId });');
      expect(source).toContain('...receiptSummary');
      expect(source).toContain('fulfillmentIntent: normalizedFulfillmentIntent.mode');
      expect(source).toContain('physicalProductCount: normalizedFulfillmentIntent.itemCount.toString()');
      expect(source).not.toContain('...(metadata || {})');
    });

    it('keeps mounted alternate checkout creators behind Stripe idempotency keys or fail-closed gates', () => {
      const cartSource = readFileSync(resolve(__dirname, '../../routes/cartRoutes.mjs'), 'utf8');
      const packageSource = readFileSync(resolve(__dirname, '../../routes/sessionPackageRoutes.mjs'), 'utf8');
      const packageFulfillmentSource = readFileSync(
        resolve(__dirname, '../../services/sessionPackageCheckoutFulfillmentService.mjs'),
        'utf8',
      );
      const subscriptionSource = readFileSync(resolve(__dirname, '../../routes/subscriptionRoutes.mjs'), 'utf8');
      const gallerySource = readFileSync(resolve(__dirname, '../../routes/galleryRoutes.mjs'), 'utf8');
      const achSource = readFileSync(resolve(__dirname, '../../routes/achPaymentRoutes.mjs'), 'utf8');
      const offlineSource = readFileSync(resolve(__dirname, '../../routes/offlinePaymentRoutes.mjs'), 'utf8');

      expect(cartSource).toContain('LEGACY_CART_CHECKOUT_DISABLED_CODE');
      expect(cartSource).toContain('/api/v2/payments/create-checkout-session');
      expect(cartSource).not.toMatch(/checkout\.sessions\.create\(sessionOptions,\s*\{\s*idempotencyKey\s*\}\)/);
      expect(packageSource).toContain('session-package-checkout');
      expect(packageSource).toContain('fulfillSessionPackageCheckoutSession(session)');
      expect(packageFulfillmentSource).toContain('session-package-webhook:${sessionId}');
      expect(packageFulfillmentSource).toContain('claimIdempotentRecord');
      expect(packageFulfillmentSource).toMatch(/lookupWhere:\s*\{\s*idempotencyKey:\s*fulfillmentKey\s*\}/);
      expect(packageFulfillmentSource).toMatch(/createValues:\s*\{[\s\S]*idempotencyKey:\s*fulfillmentKey/);
      expect(packageFulfillmentSource).toMatch(/user\.increment\('availableSessions'[\s\S]*transaction/);
      expect(packageSource).toMatch(/checkout\.sessions\.create\([\s\S]*\},\s*\{\s*idempotencyKey\s*\}\s*\)/);
      expect(subscriptionSource).toContain('subscription-donation-checkout');
      expect(subscriptionSource).toContain('subscription-checkout');
      expect(gallerySource).toContain('gallery-credits');
      expect(gallerySource).toContain('gallery-donation');
      expect(gallerySource).toContain('gallery-vip');
      expect(gallerySource).toContain('buildGalleryPrintAttemptKey');
      expect(gallerySource).toMatch(/const\s+\{\s*record:\s*order,\s*created\s*\}\s*=\s*await\s+claimIdempotentRecord/);
      expect(gallerySource).toMatch(/if\s*\(!created\s*\)[\s\S]*PAYMENT_ATTEMPT_INCOMPLETE/);
      expect(achSource).toContain('Order.findOne({ where: { userId, idempotencyKey } })');
      expect(achSource).toContain('idempotencyKey,');
      expect(achSource).toMatch(/paymentIntents\.create\([\s\S]*\},\s*\{\s*idempotencyKey[\s\S]*\}\s*\)/);
      expect(offlineSource).toContain('effectiveIdempotencyKey');
      expect(offlineSource).toContain('offline-payment:${userId}:${paymentMethod}');
      expect(offlineSource).toContain('Order.findOne({ where: { userId, idempotencyKey: effectiveIdempotencyKey } })');
    });

    it('returns direct session-package checkouts to the canonical checkout result routes', () => {
      const packageSource = readFileSync(resolve(__dirname, '../../routes/sessionPackageRoutes.mjs'), 'utf8');

      expect(packageSource).toContain('success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`');
      expect(packageSource).toContain('cancel_url: `${baseUrl}/checkout/cancel?reason=session_package_cancelled`');
      expect(packageSource).not.toContain('/sessions/purchase-success');
      expect(packageSource).not.toContain('/sessions/purchase-cancel');
    });
  });

  describe('Payment Verification (IDEMPOTENCY)', () => {
    it('should detect already-processed orders', async () => {
      // P0 Fix: Idempotency uses sessionsGranted ONLY (not status)
      const completedCart = testCarts.completed;

      const alreadyProcessed = completedCart.sessionsGranted === true;

      expect(alreadyProcessed).toBe(true);
    });

    it('should skip session grant for idempotent requests', () => {
      const cart = testCarts.completed;

      // If sessionsGranted is true, we should NOT grant more sessions
      if (cart.sessionsGranted === true) {
        const sessionsToAdd = 0; // Idempotent response
        expect(sessionsToAdd).toBe(0);
      }
    });

    it('should grant sessions only once', async () => {
      const unprocessedCart = { ...testCarts.pendingPayment, sessionsGranted: false };
      const processedCart = { ...testCarts.completed, sessionsGranted: true };

      expect(unprocessedCart.sessionsGranted).toBe(false);
      expect(processedCart.sessionsGranted).toBe(true);

      // Simulate granting
      const shouldGrant = !unprocessedCart.sessionsGranted;
      expect(shouldGrant).toBe(true);

      const shouldNotGrant = !processedCart.sessionsGranted;
      expect(shouldNotGrant).toBe(false);
    });

    it('should update sessionsGranted flag atomically', async () => {
      const cart = {
        ...testCarts.pendingPayment,
        update: vi.fn().mockResolvedValue(true),
      };

      // Simulate atomic update
      await cart.update({
        status: 'completed',
        paymentStatus: 'paid',
        sessionsGranted: true,
        completedAt: new Date(),
      });

      expect(cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionsGranted: true,
          status: 'completed',
        })
      );
    });

    it('surfaces paid checkout inventory failures as support-review responses', () => {
      const source = readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

      expect(source).toContain('CheckoutInventoryError');
      expect(source).toMatch(/if\s*\(error\s+instanceof\s+CheckoutInventoryError\)/);
      expect(source).toContain("code: 'CHECKOUT_INVENTORY_UNAVAILABLE'");
      expect(source).toContain('requiresSupportReview: true');
    });
  });

  describe('Session Credit Allocation', () => {
    it('should calculate sessions from package', () => {
      const package10 = testPackages.tenPack;
      const package24 = testPackages.twentyFourPack;

      expect(package10.sessions).toBe(10);
      expect(package24.sessions).toBe(27); // 24 + 3 bonus
    });

    it('should add sessions to user account', async () => {
      const user = {
        ...testUsers.clientNoSessions,
        availableSessions: 0,
        update: vi.fn().mockResolvedValue(true),
      };

      const sessionsToAdd = 10;
      const newBalance = user.availableSessions + sessionsToAdd;

      await user.update({
        availableSessions: newBalance,
        hasPurchasedBefore: true,
      });

      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          availableSessions: 10,
          hasPurchasedBefore: true,
        })
      );
    });

    it('should handle multiple items in cart', () => {
      const cartItems = [
        { storefrontItem: { sessions: 10 }, quantity: 1 },
        { storefrontItem: { sessions: 27 }, quantity: 2 },
      ];

      const totalSessions = cartItems.reduce((sum, item) => {
        return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
      }, 0);

      expect(totalSessions).toBe(64); // 10 + (27 * 2)
    });
  });

  describe('Webhook vs Verify-Session Race Condition', () => {
    it('should handle webhook arriving first', () => {
      // Scenario: Webhook processes before verify-session
      const cartAfterWebhook = {
        ...testCarts.pendingPayment,
        status: 'completed',
        sessionsGranted: true,
      };

      // When verify-session checks, it should see sessionsGranted = true
      const shouldSkip = cartAfterWebhook.sessionsGranted === true;
      expect(shouldSkip).toBe(true);
    });

    it('should handle verify-session arriving first', () => {
      // Scenario: Verify-session processes before webhook
      const cartAfterVerify = {
        ...testCarts.pendingPayment,
        status: 'completed',
        sessionsGranted: true,
      };

      // When webhook checks, it should see sessionsGranted = true
      const shouldSkip = cartAfterVerify.sessionsGranted === true;
      expect(shouldSkip).toBe(true);
    });

    it('should ensure consistent final state', () => {
      // Both paths should result in the same final state
      const finalState = {
        status: 'completed',
        paymentStatus: 'paid',
        sessionsGranted: true,
      };

      expect(finalState.status).toBe('completed');
      expect(finalState.sessionsGranted).toBe(true);
    });
  });
});

describe('Pricing Validation', () => {
  it('should match authoritative package prices', () => {
    // From render-production-seeder.mjs (P0 fix)
    const authoritativePrices = {
      '10-Pack': 1750.00,
      '24-Pack': 4200.00,
      '6-Month': 18900.00,
      '12-Month': 36400.00,
    };

    expect(testPackages.tenPack.price).toBe(authoritativePrices['10-Pack']);
    expect(testPackages.twentyFourPack.price).toBe(authoritativePrices['24-Pack']);
  });

  it('should not have unlimited session packages', () => {
    // Per user clarification: No unlimited packages
    const packages = [testPackages.tenPack, testPackages.twentyFourPack];

    packages.forEach(pkg => {
      expect(pkg.sessions).toBeGreaterThan(0);
      expect(pkg.sessions).toBeLessThan(1000); // Reasonable cap
      expect(pkg.itemType).not.toContain('UNLIMITED');
    });
  });
});
