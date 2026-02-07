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
process.env.JWT_EXPIRES_IN = '1h';

// Mock logger to prevent console noise during tests
vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}));

// Mock email service
vi.mock('../services/emailService.mjs', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Stripe (for payment tests)
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
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
    })),
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
