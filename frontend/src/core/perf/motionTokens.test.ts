// frontend/src/core/perf/motionTokens.test.ts
//
// P4 tests — one numerical authority, consistent units.
// Named cases come from 09-tests.md (P2 amendment) "P4" row.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CSS_MOTION_TOKENS,
  MOTION_DURATION_MS,
  MOTION_EASING,
  MOTION_SECONDS,
  MOTION_SECTION_REVEAL,
  MOTION_STAGGER,
  msToSeconds,
  motionTokenCssBlock,
  SECTION_REVEAL_SECONDS,
  STAGGER_CHILDREN_SECONDS,
  toCubicBezier,
} from './motionTokens';
import { animationVariants } from '../../utils/motion-helpers';
import { CINEMATIC_EASE, staggerContainer, sectionReveal } from '../../pages/HomePage/components/shared/HomeAnimations';

const TOKENS_CSS_PATH = resolve(__dirname, '../../styles/tokens.css');

describe('motionTokens — single authority', () => {
  it('CSS values derive from numeric values', () => {
    const css = readFileSync(TOKENS_CSS_PATH, 'utf8');

    // Every projected token must appear in the stylesheet with exactly the value
    // the TypeScript authority produces.
    for (const [name, value] of Object.entries(CSS_MOTION_TOKENS)) {
      expect(css).toContain(`${name}: ${value};`);
    }

    // And the easing projection must be a cubic-bezier string, not a name.
    expect(CSS_MOTION_TOKENS['--ease-out-quint']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(CSS_MOTION_TOKENS['--ease-in-quad']).toBe('cubic-bezier(0.55, 0.085, 0.68, 0.53)');
  });

  it('the stylesheet declares no independent duration for these tokens', () => {
    const css = readFileSync(TOKENS_CSS_PATH, 'utf8');

    // Guard against a duplicate being re-added alongside the projection.
    for (const name of Object.keys(CSS_MOTION_TOKENS)) {
      const occurrences = css.split(`${name}:`).length - 1;
      expect(occurrences, `${name} declared ${occurrences} times`).toBe(1);
    }
  });

  it('Framer seconds derive from milliseconds', () => {
    // Framer receives seconds; the division happens once, in msToSeconds.
    expect(MOTION_SECONDS.response).toBe(0.2);
    expect(MOTION_SECONDS.narrative).toBe(0.72);
    expect(MOTION_SECONDS.responseFast).toBe(0.12);
    expect(MOTION_SECONDS.responseSlow).toBe(0.32);
    expect(MOTION_SECONDS.ambient).toBe(12);

    expect(msToSeconds(1000)).toBe(1);
    expect(msToSeconds(0)).toBe(0);
  });

  it('easing tuples survive projection exactly', () => {
    // The tuple denotes that exact curve; no polynomial substitution.
    expect(toCubicBezier(MOTION_EASING.outQuint)).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect([...MOTION_EASING.outQuint]).toEqual([0.16, 1, 0.3, 1]);
    expect([...MOTION_EASING.inQuad]).toEqual([0.55, 0.085, 0.68, 0.53]);
  });
});

describe('motionTokens — stagger', () => {
  it('stagger is sixty milliseconds', () => {
    expect(MOTION_STAGGER.intervalMs).toBe(60);
    expect(STAGGER_CHILDREN_SECONDS).toBe(0.06);
    expect(MOTION_STAGGER.maxGroupSize).toBe(5);
  });

  it('both shipped stagger containers agree with the authority', () => {
    // Before A4 these disagreed: HomeAnimations had 0.12, motion-helpers 0.1.
    expect(staggerContainer.visible.transition.staggerChildren).toBe(0.06);
    expect(animationVariants.staggerContainer.visible.transition.staggerChildren).toBe(0.06);
    expect(animationVariants.staggerContainer.visible.transition.delayChildren).toBe(0);
  });

  it('stagger interval stays within the enforced ceiling', () => {
    // The budget test asserts <=80ms; the token must satisfy it by construction.
    expect(MOTION_STAGGER.intervalMs).toBeLessThanOrEqual(80);
  });
});

describe('motionTokens — narrative value stays out of helper defaults', () => {
  it('narrative value does not become helper default', () => {
    // The 720ms narrative value is explicit to the signature. Every shared
    // helper variant must use the 200ms response value instead.
    const helperDurations = Object.values(animationVariants)
      .map((variant) => variant.visible?.transition?.duration)
      .filter((duration): duration is number => typeof duration === 'number');

    expect(helperDurations.length).toBeGreaterThan(0);
    for (const duration of helperDurations) {
      expect(duration).toBe(0.2);
      expect(duration).not.toBe(0.72);
    }

    expect(MOTION_DURATION_MS.narrative).toBe(720);
    expect(MOTION_SECONDS.narrative).toBe(0.72);
  });

  it('reveal uses canonical cubic bezier', () => {
    expect(CINEMATIC_EASE).toEqual(MOTION_EASING.outQuint);
    // Identity with the authority, not merely equal contents.
    expect(CINEMATIC_EASE).toBe(MOTION_EASING.outQuint);
  });
});

describe('motionTokens — section reveal budget', () => {
  it('section reveal honours 200ms and the 12px translation cap', () => {
    expect(MOTION_SECTION_REVEAL.durationMs).toBe(200);
    expect(MOTION_SECTION_REVEAL.maxTranslationPx).toBe(12);

    expect(sectionReveal.visible.transition.duration).toBe(0.2);
    expect(sectionReveal.hidden.y).toBe(12);
    expect(SECTION_REVEAL_SECONDS).toBe(0.2);
  });

  it('serialises a usable CSS declaration block', () => {
    const block = motionTokenCssBlock();

    expect(block).toContain('--motion-response: 200ms;');
    expect(block).toContain('--ease-out-quint: cubic-bezier(0.16, 1, 0.3, 1);');
    expect(block.endsWith(';')).toBe(true);
  });

  it('the token object is frozen against mutation', () => {
    expect(Object.isFrozen(MOTION_DURATION_MS)).toBe(true);
    expect(Object.isFrozen(MOTION_EASING)).toBe(true);
    expect(Object.isFrozen(MOTION_STAGGER)).toBe(true);
    expect(Object.isFrozen(CSS_MOTION_TOKENS)).toBe(true);
  });
});
