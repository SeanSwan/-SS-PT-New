/**
 * Backend Test Setup
 * Phase 3: Operations-Ready Test Suite
 *
 * Initializes test environment with mocked services
 */
import { vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.OPERATION_SIGNING_KEY = 'test-operation-signing-key-0123456789abcdef';  // S1: required, no fallback
process.env.JWT_EXPIRES_IN = '1h';
process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_unit';

// Mock logger to prevent console noise during tests.
// Phase 5 Slice 5.5 — also re-export redactString / redactValue from the
// real logger so loggerRedaction.test.mjs can exercise them. The redactor
// has no console side-effect (pure functions) so it's safe to use the real impl.
vi.mock('../utils/logger.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    redactString: actual.redactString,
    redactValue: actual.redactValue,
  };
});

// Mock email service.
//
// PATH CORRECTED 2026-07-29 (hostile round 28): this pointed at
// '../services/emailService.mjs', which DOES NOT EXIST. The real module is
// backend/emailService.mjs (imported by services/notificationService.mjs and
// utils/notification.mjs). vi.mock on a path nothing imports is silently inert, so
// this block was dead for its entire life and setup.mjs was advertising a safety
// net it did not provide.
//
// Nothing leaked in practice: the real sendEmail fails closed when the transporter
// is unconfigured (emailService.mjs:44 -> { success: false }), which is why no test
// noticed. But "no creds in CI" is the only thing that was stopping a real send —
// if SMTP credentials ever reach a test environment, an unmocked path sends real
// mail to whatever address a fixture happens to contain. The mock is the guard;
// it now actually applies.
vi.mock('../emailService.mjs', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Stripe (for payment tests)
vi.mock('stripe', () => {
  return {
    default: vi.fn(function MockStripe() {
      return {
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/test',
              payment_status: 'unpaid',
            }),
            retrieve: vi.fn().mockResolvedValue({
              id: 'cs_test_123',
              payment_status: 'paid',
              amount_total: 175000,
              customer_details: { email: 'test@example.com' },
            }),
          },
        },
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_test_123', metadata: { cartId: '1' } } },
          }),
        },
      };
    }),
  };
});

// Global test utilities
global.testUtils = {
  // Generate a test JWT token
  generateTestToken: (userId, role = 'client') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
};

console.log('[Test Setup] Backend test environment initialized');
