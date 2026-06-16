/**
 * FILE: CheckoutView.themeContract.test.ts
 * PURPOSE: Guard the live checkout route against retired theme and inline color regressions.
 * LAST VALIDATED: 2026-06-09 during checkout onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(resolve(__dirname, './CheckoutView.tsx'), 'utf8');
const sectionSource = readFileSync(resolve(__dirname, './CheckoutView.sections.tsx'), 'utf8');
const navigationSource = readFileSync(resolve(__dirname, './CheckoutView.navigationStyles.ts'), 'utf8');
const runtimeSources = `${pageSource}\n${sectionSource}`;

describe('CheckoutView theme contract', () => {
  it('keeps the paid checkout route on the Crystalline Swan component contract', () => {
    expect(pageSource).toContain("from './CheckoutView.sections'");
    expect(sectionSource).toContain("from './CheckoutView.styles'");
    expect(runtimeSources).not.toMatch(/\bGenesis\b|\bGalaxy\b|galaxy/i);
    expect(runtimeSources).not.toContain('keyframes');
    expect(runtimeSources).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(runtimeSources).not.toMatch(/variant=\"(?:cosmic|emerald)\"/);
    expect(runtimeSources).not.toContain('style={{');
  });

  it('keeps the checkout back control safely above the 44px touch target floor', () => {
    expect(sectionSource).toContain("from './CheckoutView.styles'");
    expect(navigationSource).toContain('min-height: 48px');
    expect(navigationSource).toContain('min-width: 48px');
  });
});
