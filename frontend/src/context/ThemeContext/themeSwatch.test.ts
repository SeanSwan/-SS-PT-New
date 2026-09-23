/**
 * themeSwatch.test.ts
 * ===================
 *
 * The gate for the header theme lens, authored from the failure artefact it must reject:
 *
 *   "fifteen themes render one identical blue swatch, so the lens cannot tell them
 *    apart and misreports the active theme."
 *
 * The pre-existing `UniversalThemeContext.themeCycle.test.ts` asserts cycle length,
 * cycle uniqueness and `metadata.description === theme.name` — every one of which
 * passed while the bug was live, because none of them look at the swatch. These do.
 */

import { describe, expect, it } from 'vitest';
import { themes, themeCycle, type ThemeId } from './UniversalThemeContext';
import {
  contrastRatio,
  getThemeSwatch,
  getThemeSwatchSignature,
  gradientMidpoint,
  isLightBackground,
  readableOn,
} from './themeSwatch';
import { compositeOver, parseHexColor } from './themeColorMath';

const themeIds = Object.keys(themes) as ThemeId[];

/** `#RRGGBB` → `rgba(r, g, b, a)`, so a hex token can be composited at a given alpha. */
const toAlpha = (hex: string, alpha: number): string => {
  const rgb = parseHexColor(hex);
  return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})` : hex;
};

describe('header theme lens swatch contract', () => {
  it('registers every theme in the cycle', () => {
    expect(themeIds.length).toBeGreaterThan(0);
    expect(themeCycle).toEqual(themeIds);
  });

  /**
   * THE load-bearing assertion. This is the line the old hardcoded switch blocks
   * fail: 15 themes fell through to `default` and shared one signature.
   */
  it('gives every theme a swatch no other theme shares', () => {
    const bySignature = new Map<string, ThemeId[]>();

    for (const themeId of themeIds) {
      const signature = getThemeSwatchSignature(themeId);
      const existing = bySignature.get(signature);
      if (existing) {
        existing.push(themeId);
      } else {
        bySignature.set(signature, [themeId]);
      }
    }

    const collisions = [...bySignature.values()].filter((group) => group.length > 1);

    expect(
      collisions,
      `themes sharing one swatch: ${collisions.map((g) => g.join(' = ')).join(' ; ')}`
    ).toEqual([]);
    expect(bySignature.size).toBe(themeIds.length);
  });

  it('gives every theme a distinct fill (no theme cloned onto another palette)', () => {
    const byFill = new Map<string, ThemeId[]>();

    for (const themeId of themeIds) {
      const fill = getThemeSwatch(themeId).fill;
      byFill.set(fill, [...(byFill.get(fill) ?? []), themeId]);
    }

    const clones = [...byFill.values()].filter((group) => group.length > 1);

    expect(clones, `themes sharing one gradient: ${clones.map((g) => g.join(' = ')).join(' ; ')}`).toEqual(
      []
    );
  });

  it('derives each swatch from that theme\'s own palette', () => {
    for (const themeId of themeIds) {
      const theme = themes[themeId];
      const swatch = getThemeSwatch(themeId);

      expect(swatch.fill).toContain(theme.background.primary);
      expect(swatch.fill).toContain(theme.colors.primary);
      expect(swatch.border).toContain(theme.colors.primary);
      expect(swatch.glow).toContain(theme.colors.primary);
    }
  });

  it('keeps the glyph readable on the gradient it sits on (WCAG 1.4.11, 3:1)', () => {
    for (const themeId of themeIds) {
      const theme = themes[themeId];
      const swatch = getThemeSwatch(themeId);
      const midpoint = gradientMidpoint(theme.background.primary, theme.colors.primary);

      expect(
        contrastRatio(swatch.icon, midpoint),
        `${themeId}: icon ${swatch.icon} on midpoint ${midpoint}`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  /**
   * HY4 round 2 (LOW #6) argued this assertion used the wrong backdrop: that the lens
   * sits on `--bg-elevated`/glass rather than `theme.background.primary`, so the gate
   * could pass while the ring was invisible on the real header.
   *
   * Checked against the source rather than accepted. The premise does not hold:
   *  - the ring is `outline: 2px solid …; outline-offset: 3px` (ThemeLensButton.styles.ts:99-102),
   *    so it is painted on the HEADER, not on the button's own fill;
   *  - the header paints `color-mix(in srgb, var(--bg-base) 85%, transparent)` over a
   *    `backdrop-filter: blur(...)` (components/Header/header.tsx:54-61);
   *  - `--bg-base` is defined as `theme.background.primary` (utils/theme/themeUtils.ts:166).
   * For an opaque page, 85% of the page over the page is the page, so
   * `theme.background.primary` IS the header's colour and was already the right token.
   *
   * What the finding DOES surface is a real limit of any token-level gate, now
   * recorded instead of assumed: the header is sticky, so page CONTENT (hero imagery,
   * gradients) can sit behind its 85%-translucent, blurred surface. No palette token
   * describes that backdrop. The true rendered contrast is therefore **UNVERIFIED**
   * here, and closing it would need pixel sampling in a real browser, not a token.
   */
  it('keeps the focus ring visible against the header surface it is painted on (3:1)', () => {
    for (const themeId of themeIds) {
      const theme = themes[themeId];
      const swatch = getThemeSwatch(themeId);

      // --bg-base === theme.background.primary (themeUtils.ts:166), which is what the
      // header paints. Asserted as a composite too, so a change to the header's
      // opacity is covered by this gate rather than silently drifting.
      const headerSurface = theme.background.primary;
      const headerAt85 = compositeOver(
        toAlpha(headerSurface, 0.85),
        theme.background.primary
      );

      for (const [label, backdrop] of [
        ['header (opaque)', headerSurface],
        ['header (85% over page)', headerAt85],
      ] as const) {
        expect(
          contrastRatio(swatch.focusRing, backdrop),
          `${themeId}: focus ring ${swatch.focusRing} on ${label} ${backdrop}`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('squares off light themes and circles dark ones', () => {
    for (const themeId of themeIds) {
      const theme = themes[themeId];
      const swatch = getThemeSwatch(themeId);
      const light = isLightBackground(theme.background.primary);

      expect(swatch.isLight).toBe(light);
      expect(swatch.radius).toBe(light ? '12px' : '50%');
    }
  });

  it('shows orbiting particles exactly when the theme declares a border glow', () => {
    for (const themeId of themeIds) {
      const theme = themes[themeId];
      const swatch = getThemeSwatch(themeId);

      if (theme.effects.borderGlow) {
        expect(swatch.particles, themeId).not.toBeNull();
        expect(swatch.particles?.primary).toBe(theme.colors.accent);
        expect(swatch.particles?.secondary).toBe(theme.colors.secondary);
      } else {
        expect(swatch.particles, themeId).toBeNull();
      }
    }
  });

  it('gives the theme that regressed the most a swatch of its own', () => {
    // Enchanted Forest and Solar Gold are the pair a user is most likely to reach for
    // by name; under the old switch blocks both rendered crystalline-default.
    const enchanted = getThemeSwatchSignature('enchanted-forest');
    const solar = getThemeSwatchSignature('solar-gold');
    const crystalline = getThemeSwatchSignature('crystalline-default');

    expect(enchanted).not.toBe(solar);
    expect(enchanted).not.toBe(crystalline);
    expect(solar).not.toBe(crystalline);
  });
});

describe('readableOn', () => {
  it('picks dark text on a light background and light text on a dark one', () => {
    expect(readableOn('#FFFFFF')).toBe('#030712');
    expect(readableOn('#000000')).toBe('#FFFFFF');
  });

  it('falls back to light text when a colour cannot be parsed', () => {
    expect(readableOn('not-a-colour')).toBe('#FFFFFF');
  });
});
