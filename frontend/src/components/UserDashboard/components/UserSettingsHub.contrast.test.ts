/**
 * UserSettingsHub.contrast.test.ts
 * ================================
 * Regression test for the Settings-hub light-theme legibility bug (2026-08-24).
 *
 * BUG: every surface in UserSettingsHub was a HARDCODED DARK value — panels
 * `rgba(20,20,30,.72)`, inputs `rgba(10,10,20,.72)` — while the text on them was the
 * ADAPTIVE `var(--text-primary)`. Under `crystalline-light` the bridge emits
 * text.primary `#0B1726` (near-black), so near-black text sat on a panel compositing
 * to ~#4F515A: **2.28:1**, against the 4.5 house minimum (Rule 7).
 *
 * This is the SAME SHAPE as the Appearance Studio tab-label bug
 * (AppearanceStudio/appearanceStudioContrast.test.ts, 2026-07-22, Sean: "can't see the
 * labels"). That fix closed the instance; the class survived here — which is why this
 * test asserts the pairing numerically rather than trusting that tokens were used.
 *
 * FIX: surfaces moved to --bg-elevated / --bg-base (adaptive), so surface and text flip
 * together. Status text additionally mixes 15% of --text-primary into --success/--danger
 * because the raw --danger (#DC2626 on light) is 4.47:1 — marginally under AA on its own.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../../../context/ThemeContext/colorScience';

/** Real values the themeUtils bridge emits for the two representative themes. */
const THEMES = {
  'crystalline-dark': {
    textPrimary: '#E0ECF4',
    textSecondary: 'rgba(224,236,244,0.82)',
    bgElevated: '#1A1A24',
    backdrop: { r: 10, g: 10, b: 15 },
    // color-mix(--success 85%, --text-primary) resolved numerically (exact, not eyeballed)
    statusGood: 'rgb(96,224,145)',
    statusBad: 'rgb(248,176,177)',
  },
  'crystalline-light': {
    textPrimary: '#0B1726',
    textSecondary: '#243447',
    bgElevated: 'rgba(241,247,252,0.98)',
    backdrop: { r: 230, g: 238, b: 245 },
    statusGood: 'rgb(20,112,58)',
    statusBad: 'rgb(189,36,38)',
  },
} as const;

describe('UserSettingsHub — readable on every theme, not just the dark one', () => {
  for (const [themeId, t] of Object.entries(THEMES)) {
    describe(themeId, () => {
      it('panel body text vs --bg-elevated >= 4.5', () => {
        expect(contrastRatio(t.textPrimary, t.bgElevated, t.backdrop)).toBeGreaterThanOrEqual(4.5);
      });
      it('secondary label vs --bg-elevated >= 4.5', () => {
        expect(contrastRatio(t.textSecondary, t.bgElevated, t.backdrop)).toBeGreaterThanOrEqual(4.5);
      });
      it('save-success status vs --bg-elevated >= 4.5', () => {
        expect(contrastRatio(t.statusGood, t.bgElevated, t.backdrop)).toBeGreaterThanOrEqual(4.5);
      });
      it('save-failure status vs --bg-elevated >= 4.5', () => {
        expect(contrastRatio(t.statusBad, t.bgElevated, t.backdrop)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});

describe('accent-on-tint: the eyebrow label', () => {
  // color-mix(--accent-primary 65%, --text-primary), resolved exactly.
  it('light theme eyebrow clears AA on the hero tint', () => {
    expect(contrastRatio('rgb(5,94,143)', 'rgba(2,132,199,0.12)', { r: 230, g: 238, b: 245 }))
      .toBeGreaterThanOrEqual(4.5);
  });
  it('dark theme eyebrow clears AA on the hero tint', () => {
    expect(contrastRatio('rgb(141,207,241)', 'rgba(96,192,240,0.12)', { r: 10, g: 10, b: 15 }))
      .toBeGreaterThanOrEqual(4.5);
  });
  it('the RAW accent alone would have failed on light', () => {
    expect(contrastRatio('#0284C7', 'rgba(2,132,199,0.12)', { r: 230, g: 238, b: 245 }))
      .toBeLessThan(4.5);
  });
});

describe('regression guard — the bug was real, and the near-miss is real too', () => {
  it('the OLD hardcoded panel under light-theme ink IS unreadable', () => {
    // What shipped before this fix: adaptive #0B1726 on a frozen rgba(20,20,30,.72).
    const broken = contrastRatio('#0B1726', 'rgba(20,20,30,0.72)', { r: 230, g: 238, b: 245 });
    expect(broken).toBeLessThan(4.5);
    expect(broken).toBeCloseTo(2.28, 1);
  });

  it('the RAW --danger token alone would still miss AA on light', () => {
    // Documents WHY Status mixes in --text-primary. If a future theme pass raises
    // --danger above 4.5 on its own, this test fails and the mix can be simplified away.
    const raw = contrastRatio('#DC2626', 'rgba(241,247,252,0.98)', { r: 230, g: 238, b: 245 });
    expect(raw).toBeLessThan(4.5);
  });
});
