/**
 * FILE: TierCarousel.themeContract.test.ts
 * PURPOSE: Guard mobile subscription tier navigation against off-canvas purchase cards.
 * LAST VALIDATED: 2026-06-09 during subscription onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './TierCarousel.tsx'), 'utf8');

describe('TierCarousel theme contract', () => {
  it('uses measured card navigation and extracted accessible styles', () => {
    expect(source).toContain("from './TierCarousel.styles'");
    expect(source).not.toContain('styled');
    expect(source).not.toContain('scrollWidth / cardCount');
    expect(source).toContain('offsetLeft');
    expect(source).toContain('scrollTo({');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(source).not.toMatch(/[^\x00-\x7F]|console\.error/);
    expect(source).toContain('aria-label="Subscription tier cards"');
    expect(source).toContain('aria-label="Carousel position"');
  });
});
