/**
 * FILE: CheckoutView.apiContract.test.ts
 * PURPOSE: Guard the live checkout route's payment API and redirect contract.
 * LAST VALIDATED: 2026-06-09 during checkout onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './CheckoutView.tsx'), 'utf8');

describe('CheckoutView API contract', () => {
  it('keeps checkout creation on the v2 payment API and Stripe redirect handoff', () => {
    expect(source).toContain("api.get('/api/v2/payments/health')");
    expect(source).toContain("api.post('/api/v2/payments/create-checkout-session'");
    expect(source).toContain('window.location.href = checkoutUrl');
    expect(source).toContain("source: 'swan_checkout'");
    expect(source).not.toContain('console.error');
  });
});
