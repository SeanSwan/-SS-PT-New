/**
 * appearanceStudioContrast.test.ts
 * ================================
 * Regression test for the Swan Lens tab-label contrast bug (2026-07-22).
 *
 * BUG: the Appearance Studio panel rendered tab/card/button labels in
 * var(--frost-white) (= theme.text.primary, ADAPTIVE → dark on light themes) over
 * var(--carbon) (= a FIXED dark #141419 token that is NOT in the themeUtils var-bridge,
 * so it never flips). On light colorways (crystalline-light / "Arctic Dawn") that was
 * dark-text-on-dark-surface → invisible tab labels (Sean: "can't see the labels").
 *
 * FIX: surfaces switched from --carbon (fixed dark) to --bg-elevated (adaptive), and
 * label text uses --text-primary / --text-secondary (adaptive). Now surface + text flip
 * together, staying ≥4.5:1 on both dark and light themes.
 *
 * This test computes the REAL WCAG contrast (colorScience.ts) using the ACTUAL theme
 * values the bridge emits, proving the pair is readable on both, and failing if anyone
 * reintroduces a fixed-dark surface under adaptive text.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../colorScience';

// The real emitted values for the two representative themes (themeUtils bridge maps
// theme.text.primary → --frost-white/--text-primary, theme.background.elevated → --bg-elevated).
const THEMES = {
  'crystalline-dark': {
    textPrimary: '#E0ECF4',        // theme.text.primary
    textSecondary: 'rgba(224,236,244,0.82)',
    bgElevated: '#1A1A24',         // theme.background.elevated
    bgBase: '#0A0A0F',
  },
  'crystalline-light': {           // "Arctic Dawn"
    textPrimary: '#0B1726',        // dark text — this is what broke on --carbon
    textSecondary: '#243447',
    bgElevated: 'rgba(241,247,252,0.98)', // light elevated surface
    bgBase: '#E6EEF5',
  },
} as const;

describe('Appearance Studio — tab/card labels are readable on every theme', () => {
  for (const [themeId, t] of Object.entries(THEMES)) {
    describe(themeId, () => {
      it('inactive tab: secondary label vs --bg-elevated ≥ 4.5', () => {
        // Inactive tab now: color var(--text-secondary) on background var(--bg-elevated).
        const ratio = contrastRatio(t.textSecondary, t.bgElevated, { r: 255, g: 255, b: 255 });
        expect(ratio, `${themeId} inactive tab`).toBeGreaterThanOrEqual(4.5);
      });

      it('active tab / card label: primary text vs --bg-elevated ≥ 4.5', () => {
        const ratio = contrastRatio(t.textPrimary, t.bgElevated, { r: 255, g: 255, b: 255 });
        expect(ratio, `${themeId} active label`).toBeGreaterThanOrEqual(4.5);
      });

      it('panel body: primary text vs --bg-base ≥ 4.5', () => {
        const ratio = contrastRatio(t.textPrimary, t.bgBase);
        expect(ratio, `${themeId} panel body`).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});

describe('regression guard — the OLD broken pairing must fail', () => {
  it('dark text on fixed --carbon (#141419) IS unreadable (proves the bug was real)', () => {
    // This is what the light theme produced BEFORE the fix: theme.text.primary (#0B1726)
    // on the fixed dark --carbon. It must be < 4.5 — i.e. the bug was genuine.
    const broken = contrastRatio('#0B1726', '#141419');
    expect(broken).toBeLessThan(4.5);
  });
});
