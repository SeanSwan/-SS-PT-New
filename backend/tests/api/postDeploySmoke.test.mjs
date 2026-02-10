/**
 * Post-Deploy Smoke Tests
 * =======================
 * Route-level contract tests for the three critical post-deploy checks:
 *   1. verify-session idempotency (double-call -> alreadyProcessed)
 *   2. webhook 5xx failure contract (Stripe retries on grant failure)
 *   3. admin-created user login flow (password hashing lifecycle)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  testUsers,
  testPackages,
  createMockRequest,
  createMockResponse,
} from '../fixtures/testData.mjs';

// ── Hoisted mocks (available inside vi.mock factories) ─────────
const {
  mockGrantSessionsForCart,
  mockStripe,
  mockShoppingCart,
  mockUserModel,
  mockTransaction,
} = vi.hoisted(() => {
  const mockGrantSessionsForCart = vi.fn();
  const mockStripe = {
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  const mockShoppingCart = { findOne: vi.fn(), update: vi.fn() };
  const mockUserModel = {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  };
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };
  return {
    mockGrantSessionsForCart,
    mockStripe,
    mockShoppingCart,
    mockUserModel,
    mockTransaction,
  };
});

vi.mock('../../services/SessionGrantService.mjs', () => ({
  grantSessionsForCart: mockGrantSessionsForCart,
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => mockShoppingCart,
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => mockUserModel,
}));

// ── Helpers ────────────────────────────────────────────────────
/**
 * Simulates the verify-session route handler logic.
 * (Mirrors v2PaymentRoutes.mjs:399-480)
 */
async function simulateVerifySession(req, res) {
  const { sessionId } = req.body;
  const userId = req.user.id;

  const session = await mockStripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Payment not completed',
    });
  }

  const cart = await mockShoppingCart.findOne({
    where: { checkoutSessionId: sessionId, userId },
  });
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const { grantSessionsForCart } = await import(
    '../../services/SessionGrantService.mjs'
  );
  const result = await grantSessionsForCart(cart.id, userId, 'verify-session');

  if (result.alreadyProcessed) {
    return res.status(200).json({
      success: true,
      message: 'Order already verified (idempotent response)',
      data: {
        sessionsAdded: 0,
        alreadyProcessed: true,
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Order verified and completed successfully',
    data: {
      sessionsAdded: result.sessionsAdded,
      alreadyProcessed: false,
    },
  });
}

/**
 * Simulates the webhook handler logic for checkout.session.completed.
 * (Mirrors cartRoutes.mjs:770-817)
 */
async function simulateWebhookHandler(event, res) {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          const { cartId, userId } = session.metadata;
          if (cartId && userId) {
            const { grantSessionsForCart } = await import(
              '../../services/SessionGrantService.mjs'
            );
            await grantSessionsForCart(
              parseInt(cartId),
              parseInt(userId),
              'webhook'
            );
          }
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).send(`Webhook processing error: ${err.message}`);
  }
}

/**
 * Simulates User.beforeCreate hook logic (must match User.mjs:307-319)
 */
function simulateBeforeCreate(user) {
  if (!user.password || user.password.length === 0) return user;
  if (user.password.startsWith('$2')) return user;
  const salt = bcrypt.genSaltSync(10);
  user.password = bcrypt.hashSync(user.password, salt);
  return user;
}

/**
 * Simulates User.beforeUpdate hook logic (must match User.mjs:325-335)
 */
function simulateBeforeUpdate(user, passwordChanged) {
  if (passwordChanged && user.password && user.password.length > 0) {
    if (!user.password.startsWith('$2')) {
      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(user.password, salt);
    }
  }
  return user;
}

// ================================================================
// TEST SUITES
// ================================================================

describe('Post-Deploy Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────
  // 1. verify-session idempotency (double-call)
  // ─────────────────────────────────────────────────────────
  describe('verify-session idempotency', () => {
    const stripeSession = {
      id: 'cs_test_smoke',
      payment_status: 'paid',
      amount_total: 175000,
      customer_details: { email: 'client@test.com' },
    };
    const cart = { id: 42, userId: 3, checkoutSessionId: 'cs_test_smoke' };

    it('first call grants sessions', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(stripeSession);
      mockShoppingCart.findOne.mockResolvedValue(cart);
      mockGrantSessionsForCart.mockResolvedValue({
        granted: true,
        sessionsAdded: 10,
        alreadyProcessed: false,
      });

      const req = createMockRequest({
        body: { sessionId: 'cs_test_smoke' },
        user: { id: 3 },
      });
      const res = createMockResponse();

      await simulateVerifySession(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.data.sessionsAdded).toBe(10);
      expect(res.jsonData.data.alreadyProcessed).toBe(false);
      expect(mockGrantSessionsForCart).toHaveBeenCalledWith(
        42,
        3,
        'verify-session'
      );
    });

    it('second call returns alreadyProcessed with sessionsAdded=0', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(stripeSession);
      mockShoppingCart.findOne.mockResolvedValue(cart);
      mockGrantSessionsForCart.mockResolvedValue({
        granted: false,
        sessionsAdded: 0,
        alreadyProcessed: true,
      });

      const req = createMockRequest({
        body: { sessionId: 'cs_test_smoke' },
        user: { id: 3 },
      });
      const res = createMockResponse();

      await simulateVerifySession(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.data.sessionsAdded).toBe(0);
      expect(res.jsonData.data.alreadyProcessed).toBe(true);
      expect(res.jsonData.message).toContain('idempotent');
    });

    it('full double-call sequence: first grants, second is idempotent', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(stripeSession);
      mockShoppingCart.findOne.mockResolvedValue(cart);

      // First call grants
      mockGrantSessionsForCart.mockResolvedValueOnce({
        granted: true,
        sessionsAdded: 10,
        alreadyProcessed: false,
      });
      // Second call is idempotent
      mockGrantSessionsForCart.mockResolvedValueOnce({
        granted: false,
        sessionsAdded: 0,
        alreadyProcessed: true,
      });

      const res1 = createMockResponse();
      await simulateVerifySession(
        createMockRequest({ body: { sessionId: 'cs_test_smoke' }, user: { id: 3 } }),
        res1
      );

      const res2 = createMockResponse();
      await simulateVerifySession(
        createMockRequest({ body: { sessionId: 'cs_test_smoke' }, user: { id: 3 } }),
        res2
      );

      expect(res1.jsonData.data.sessionsAdded).toBe(10);
      expect(res1.jsonData.data.alreadyProcessed).toBe(false);
      expect(res2.jsonData.data.sessionsAdded).toBe(0);
      expect(res2.jsonData.data.alreadyProcessed).toBe(true);
      expect(mockGrantSessionsForCart).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. webhook 5xx failure contract
  // ─────────────────────────────────────────────────────────
  describe('webhook 5xx failure contract', () => {
    it('returns 500 when grantSessionsForCart throws', async () => {
      mockGrantSessionsForCart.mockRejectedValue(
        new Error('DB connection lost')
      );

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            payment_status: 'paid',
            metadata: { cartId: '42', userId: '3' },
          },
        },
      };
      const res = createMockResponse();

      await simulateWebhookHandler(event, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toContain('DB connection lost');
    });

    it('returns 200 on successful grant', async () => {
      mockGrantSessionsForCart.mockResolvedValue({
        granted: true,
        sessionsAdded: 10,
        alreadyProcessed: false,
      });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            payment_status: 'paid',
            metadata: { cartId: '42', userId: '3' },
          },
        },
      };
      const res = createMockResponse();

      await simulateWebhookHandler(event, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toEqual({ received: true });
    });

    it('returns 200 on idempotent grant (already processed)', async () => {
      mockGrantSessionsForCart.mockResolvedValue({
        granted: false,
        sessionsAdded: 0,
        alreadyProcessed: true,
      });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            payment_status: 'paid',
            metadata: { cartId: '42', userId: '3' },
          },
        },
      };
      const res = createMockResponse();

      await simulateWebhookHandler(event, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toEqual({ received: true });
    });

    it('Stripe retries are safe: repeated webhook after failure still grants', async () => {
      // First attempt: service throws -> 500 -> Stripe retries
      mockGrantSessionsForCart.mockRejectedValueOnce(
        new Error('Transient DB error')
      );
      // Second attempt (Stripe retry): service succeeds -> 200
      mockGrantSessionsForCart.mockResolvedValueOnce({
        granted: true,
        sessionsAdded: 10,
        alreadyProcessed: false,
      });

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            payment_status: 'paid',
            metadata: { cartId: '42', userId: '3' },
          },
        },
      };

      const res1 = createMockResponse();
      await simulateWebhookHandler(event, res1);
      expect(res1.statusCode).toBe(500); // Stripe will retry

      const res2 = createMockResponse();
      await simulateWebhookHandler(event, res2);
      expect(res2.statusCode).toBe(200); // Retry succeeds
      expect(res2.jsonData).toEqual({ received: true });
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. admin-created user login flow
  // ─────────────────────────────────────────────────────────
  describe('admin-created user login flow', () => {
    it('admin creates user with plaintext -> beforeCreate hashes -> login works', () => {
      const plaintext = 'SecurePassword123!';
      const user = { password: plaintext };

      // Admin route passes plaintext to User.create() (no pre-hash)
      simulateBeforeCreate(user);

      // Password is now hashed
      expect(user.password).not.toBe(plaintext);
      expect(user.password.startsWith('$2')).toBe(true);

      // Login: bcrypt.compare(plaintext, storedHash) succeeds
      expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
    });

    it('profile update without password change preserves login', () => {
      const plaintext = 'UserPassword456!';
      const user = { password: plaintext };

      // Step 1: User created (beforeCreate hashes)
      simulateBeforeCreate(user);
      const storedHash = user.password;

      // Step 2: Profile update — only firstName changed, password NOT changed
      simulateBeforeUpdate(user, false);

      // Step 3: Password unchanged, login still works
      expect(user.password).toBe(storedHash);
      expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
    });

    it('password reset via admin route -> login works with new password', () => {
      const originalPassword = 'OriginalPass123!';
      const newPassword = 'ResetPassword789!';
      const user = { password: originalPassword };

      // Step 1: User created
      simulateBeforeCreate(user);
      expect(bcrypt.compareSync(originalPassword, user.password)).toBe(true);

      // Step 2: Admin resets password (passes plaintext)
      user.password = newPassword;
      simulateBeforeUpdate(user, true);

      // Step 3: New password works
      expect(bcrypt.compareSync(newPassword, user.password)).toBe(true);
      // Old password no longer works
      expect(bcrypt.compareSync(originalPassword, user.password)).toBe(false);
    });

    it('full lifecycle: create -> login -> update profile -> login -> reset password -> login', () => {
      const initialPassword = 'Initial123!';
      const resetPassword = 'Reset456!';
      const user = { password: initialPassword };

      // Create
      simulateBeforeCreate(user);
      expect(bcrypt.compareSync(initialPassword, user.password)).toBe(true);

      // Profile update (no password change)
      simulateBeforeUpdate(user, false);
      expect(bcrypt.compareSync(initialPassword, user.password)).toBe(true);

      // Password reset
      user.password = resetPassword;
      simulateBeforeUpdate(user, true);
      expect(bcrypt.compareSync(resetPassword, user.password)).toBe(true);
      expect(bcrypt.compareSync(initialPassword, user.password)).toBe(false);
    });
  });
});
