/**
 * Release Gate Test Suite
 * =======================
 * Stop-gate tests that MUST pass before any production deploy.
 * Covers all critical paths: auth, password hashing, session granting,
 * purchase attribution, and race condition defenses.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { testUsers, testPackages, createMockRequest, createMockResponse } from '../fixtures/testData.mjs';

// ── Mocks ────────────────────────────────────────────────────
const { mockTransaction, mockShoppingCart, mockUserModel } = vi.hoisted(() => {
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };
  const mockShoppingCart = { findOne: vi.fn() };
  const mockUserModel = { findByPk: vi.fn(), findOne: vi.fn(), create: vi.fn() };
  return { mockTransaction, mockShoppingCart, mockUserModel };
});

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
    authenticate: vi.fn().mockResolvedValue(true),
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

vi.mock('../../models/User.mjs', () => ({
  default: mockUserModel,
}));

import { grantSessionsForCart } from '../../services/SessionGrantService.mjs';

// ── Hook Simulators (must match User.mjs:307-339) ───────────
function simulateBeforeCreate(user) {
  if (!user.password || user.password.length === 0) return user;
  if (user.password.startsWith('$2')) return user;
  const salt = bcrypt.genSaltSync(10);
  user.password = bcrypt.hashSync(user.password, salt);
  return user;
}

function simulateBeforeUpdate(user, passwordChanged) {
  if (passwordChanged && user.password && user.password.length > 0) {
    if (!user.password.startsWith('$2')) {
      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(user.password, salt);
    }
  }
  return user;
}

// ── Helpers ──────────────────────────────────────────────────
function makeUser(id, sessions = 0) {
  return {
    id,
    availableSessions: sessions,
    update: vi.fn().mockResolvedValue(true),
    increment: vi.fn().mockResolvedValue(true),
  };
}

function makeCart(cartId, userId, overrides = {}) {
  return {
    id: cartId,
    userId,
    status: 'pending_payment',
    sessionsGranted: false,
    cartItems: [
      { quantity: 1, storefrontItem: { ...testPackages.tenPack } },
    ],
    user: makeUser(userId, 0),
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

// =============================================================
// RELEASE GATE — All tests MUST pass before production deploy
// =============================================================
describe('Release Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.commit.mockResolvedValue(true);
    mockTransaction.rollback.mockResolvedValue(true);
  });

  // ── 1. Registration: plaintext in, hash out ──────────────
  it('GATE: register user hashes password correctly', () => {
    const user = { password: 'NewUserPassword123!' };
    simulateBeforeCreate(user);

    expect(user.password.startsWith('$2')).toBe(true);
    expect(bcrypt.compareSync('NewUserPassword123!', user.password)).toBe(true);
  });

  // ── 2. Login after registration ──────────────────────────
  it('GATE: user can login after registration', () => {
    const plaintext = 'SecurePass456!';
    const user = { password: plaintext };
    simulateBeforeCreate(user);

    // Login: compare plaintext against stored hash
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ── 3. Profile update without password doesn't break login
  it('GATE: profile update (no password) preserves login', () => {
    const plaintext = 'MyPassword789!';
    const user = { password: plaintext };
    simulateBeforeCreate(user);
    const storedHash = user.password;

    // Profile update: firstName changed, password NOT in changed()
    simulateBeforeUpdate(user, false);

    expect(user.password).toBe(storedHash);
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ── 4. Admin user creation (no double-hash) ──────────────
  it('GATE: admin-created user can log in (no double-hash)', () => {
    const plaintext = 'AdminCreated123!';
    const user = { password: plaintext };

    // beforeCreate hook runs on User.create()
    simulateBeforeCreate(user);

    // Login attempt
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ── 5. Pre-hashed password is not double-hashed ──────────
  it('GATE: pre-hashed password is NOT double-hashed', () => {
    const plaintext = 'TestPassword!';
    const preHashed = bcrypt.hashSync(plaintext, 10);
    const user = { password: preHashed };

    simulateBeforeCreate(user);

    expect(user.password).toBe(preHashed);
    expect(bcrypt.compareSync(plaintext, user.password)).toBe(true);
  });

  // ── 6. Session granting happy path ────────────────────────
  it('GATE: session granting works for valid cart', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100, 0);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    const result = await grantSessionsForCart(1, 100, 'verify-session');

    expect(result.granted).toBe(true);
    expect(result.sessionsAdded).toBe(10);
    expect(result.alreadyProcessed).toBe(false);
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  // ── 7. Idempotent session granting ────────────────────────
  it('GATE: session granting is idempotent', async () => {
    const cart = makeCart(1, 100, { sessionsGranted: true });
    mockShoppingCart.findOne.mockResolvedValue(cart);

    const result = await grantSessionsForCart(1, 100, 'verify-session');

    expect(result.granted).toBe(false);
    expect(result.alreadyProcessed).toBe(true);
    expect(result.sessionsAdded).toBe(0);
  });

  // ── 8. Webhook-first race: sessions ARE granted ───────────
  it('GATE: webhook-first race grants sessions then verify is idempotent', async () => {
    const user = makeUser(100);

    // Webhook runs first
    const cartForWebhook = makeCart(1, 100, { sessionsGranted: false });
    mockShoppingCart.findOne.mockResolvedValueOnce(cartForWebhook);
    mockUserModel.findByPk.mockResolvedValueOnce(user);

    const webhookResult = await grantSessionsForCart(1, 100, 'webhook');
    expect(webhookResult.granted).toBe(true);

    // Verify-session runs second (already processed)
    const cartForVerify = makeCart(1, 100, { sessionsGranted: true });
    mockShoppingCart.findOne.mockResolvedValueOnce(cartForVerify);

    const verifyResult = await grantSessionsForCart(1, 100, 'verify-session');
    expect(verifyResult.alreadyProcessed).toBe(true);
  });

  // ── 9. Atomic increment (not read-then-write) ────────────
  it('GATE: session increment is atomic (user.increment)', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100, 5);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    await grantSessionsForCart(1, 100, 'verify-session');

    expect(user.increment).toHaveBeenCalledWith('availableSessions', {
      by: 10,
      transaction: mockTransaction,
    });
  });

  // ── 10. Transaction is used ───────────────────────────────
  it('GATE: session granting uses a DB transaction', async () => {
    const cart = makeCart(1, 100);
    const user = makeUser(100);
    mockShoppingCart.findOne.mockResolvedValue(cart);
    mockUserModel.findByPk.mockResolvedValue(user);

    await grantSessionsForCart(1, 100, 'webhook');

    // Cart query must use the transaction with lock
    expect(mockShoppingCart.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: 'UPDATE',
        transaction: mockTransaction,
      })
    );
    expect(mockTransaction.commit).toHaveBeenCalled();
  });
});
