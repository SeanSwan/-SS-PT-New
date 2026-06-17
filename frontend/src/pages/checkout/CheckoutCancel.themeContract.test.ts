/**
 * FILE: CheckoutCancel.themeContract.test.ts
 * PURPOSE: Guard the checkout cancel recovery page against retired theme and inline style regressions.
 * LAST VALIDATED: 2026-06-09 during checkout onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './CheckoutCancel.tsx'), 'utf8');

describe('CheckoutCancel theme contract', () => {
  it('keeps the cancel recovery page on extracted Crystalline Swan styles', () => {
    expect(source).toContain("from './CheckoutCancel.styles'");
    expect(source).not.toMatch(/\bGenesis\b|\bGalaxy\b|galaxy/i);
    expect(source).not.toContain('keyframes');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(source).not.toContain('style={{');
    expect(source).not.toMatch(/ð|â|console\.error/);
  });

  it('does not fabricate a flat tax estimate after Stripe checkout is cancelled', () => {
    expect(source).not.toContain('subtotal * 0.08');
    expect(source).toContain('taxLabel');
    expect(source).toContain('calculateCheckoutTotals');
  });
});
