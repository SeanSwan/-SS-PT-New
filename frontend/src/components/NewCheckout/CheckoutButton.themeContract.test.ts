/**
 * FILE: CheckoutButton.themeContract.test.ts
 * PURPOSE: Guard the checkout payment CTA against retired theme and inline style regressions.
 * LAST VALIDATED: 2026-06-09 during checkout onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './CheckoutButton.tsx'), 'utf8');

describe('CheckoutButton theme contract', () => {
  it('keeps the payment CTA on extracted Crystalline Swan styles', () => {
    expect(source).toContain("from './CheckoutButton.styles'");
    expect(source).not.toMatch(/\bGenesis\b|\bGalaxy\b|galaxy/i);
    expect(source).not.toContain('keyframes');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(source).not.toContain('style={{');
    expect(source).not.toMatch(/color=\"/);
  });
});
