/**
 * FILE: VaultCard.themeContract.test.ts
 * PURPOSE: Guard Ascension tier cards against embedded style, mojibake, and clipped-layout regressions.
 * LAST VALIDATED: 2026-06-09 during subscription onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './VaultCard.tsx'), 'utf8');

describe('VaultCard theme contract', () => {
  it('keeps canonical tier-card rendering on extracted resilient styles', () => {
    expect(source).toContain("from './VaultCard.styles'");
    expect(source).not.toContain('styled');
    expect(source).not.toContain('keyframes');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(source).not.toContain('style={{');
    expect(source).not.toMatch(/\u00e2|\u00c2|\u00ef|console\.error/);
    expect(source).toContain('one-time - pay what you can');
    expect(source).toContain('Get Started - Free');
  });
});
