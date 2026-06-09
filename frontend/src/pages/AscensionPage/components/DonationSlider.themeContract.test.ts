/**
 * FILE: DonationSlider.themeContract.test.ts
 * PURPOSE: Guard the canonical Guardian donation slider against embedded style and copy regressions.
 * LAST VALIDATED: 2026-06-09 during subscription onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './DonationSlider.tsx'), 'utf8');

describe('DonationSlider theme contract', () => {
  it('keeps Guardian donation controls on extracted accessible styles', () => {
    expect(source).toContain("from './DonationSlider.styles'");
    expect(source).not.toContain('styled');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(source).not.toContain('style={{');
    expect(source).not.toMatch(/[^\x00-\x7F]|console\.error/);
    expect(source).toContain('one-time donation -');
    expect(source).toContain('Suggested: $');
  });
});
