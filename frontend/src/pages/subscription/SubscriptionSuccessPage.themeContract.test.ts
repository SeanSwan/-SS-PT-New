/**
 * FILE: SubscriptionSuccessPage.themeContract.test.ts
 * PURPOSE: Guard the subscription success route against retired theme and inline color regressions.
 * LAST VALIDATED: 2026-06-09 during subscription onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './SubscriptionSuccessPage.tsx'), 'utf8');

describe('SubscriptionSuccessPage theme contract', () => {
  it('keeps the subscription success route on extracted Crystalline Swan styles', () => {
    expect(source).toContain("from './SubscriptionSuccessPage.styles'");
    expect(source).not.toMatch(/\bGenesis\b|\bGalaxy\b|galaxy/i);
    expect(source).not.toContain('keyframes');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(source).not.toContain('style={{');
    expect(source).not.toMatch(/\u00e2|console\.error/);
  });
});
