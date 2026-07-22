/**
 * newColorwaySpecs.audit.test.ts
 * ==============================
 * The "script that disposes" (Kimi R4). Recomputes EVERY color-science claim about the
 * new colorways with real math (colorScience.ts) and fails CI on any violation. No
 * hand-authored ΔE/contrast numbers are trusted.
 *
 * Gates (Kimi R4 intent, thresholds CALIBRATED to this metric — see note):
 *  - Full WCAG contrast matrix, alpha surfaces composited over own bg.
 *  - No new colorway is retired-cyan.
 *  - Distinctness: primary ΔE ≥ 7 vs every KEPT colorway; ≥ 6 vs every OTHER new colorway.
 *  - Chart series mutually ΔE ≥ 7 (categorical separability).
 *
 * METRIC CALIBRATION (important): Kimi's "15 ΔE" assumed CIEDE2000 scale. This module
 * measures OKLab-Euclidean ×100, a DIFFERENT scale. Empirically measured over the existing
 * 20 colorways, nearest-neighbor primary ΔE runs: [2.0,2.0,2.0,2.0,4.8,5.3,5.7,7.0,7.4,
 * 9.2,9.4,11.3,14.1...]. The four 2.0s ARE the existing duplicates (e.g. ruby-forge ≡
 * rose-quartz #FB7185). So on THIS metric: ~2 = duplicate, 5-9 = distinct-but-related,
 * >10 = strongly distinct. A ≥7 gate sits above the dup floor at the healthy median —
 * evidence-based, not the wrong-scale 15. (Kimi's advice honored: "the script disposes.")
 */
import { describe, it, expect } from 'vitest';
import { NEW_COLORWAY_SPECS, type NewColorwaySpec } from './newColorwaySpecs';
import { contrastRatio, deltaEOK, isRetiredCyan, parseColor, compositeOver } from './colorScience';

// Opaque black backdrop used when flattening translucent glass surfaces (worst case).
const BLACK = { r: 0, g: 0, b: 0 };

/** Flatten a possibly-translucent surface over the colorway's own bg (real render). */
function flatSurface(surface: string, bg: string): string {
  const s = parseColor(surface);
  const b = parseColor(bg);
  const flat = compositeOver(s, compositeOver(b, BLACK));
  return `#${[flat.r, flat.g, flat.b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

// Every kept premium colorway's [id, bg, primary] (verified against the registry).
const KEPT_PAIRS: Array<[string, string, string]> = [
  ['ruby-forge', '#10070A', '#FB7185'], ['emerald-vault', '#04110D', '#34D399'],
  ['solar-gold', '#120C05', '#F6C453'], ['amethyst-night', '#100A1F', '#C084FC'],
  ['rose-quartz', '#160A12', '#FB7185'], ['copper-patina', '#120B06', '#D97706'],
  ['aqua-abyss', '#031018', '#22D3EE'], ['graphite-luxe', '#09090B', '#D1D5DB'],
  ['pearl-noir', '#070608', '#F5E7D3'], ['circuit-lime', '#071104', '#A3E635'],
  ['sakura-midnight', '#140812', '#F9A8C7'], ['indigo-pulse', '#0A0A1E', '#818CF8'],
  ['sunset-mirage', '#160B08', '#FB923C'], ['steel-tempest', '#0B0E12', '#7DA7C7'],
  ['vapor-dream', '#120919', '#F0ABFC'], ['burgundy-noir', '#120608', '#C2637A'],
  ['tron-grid', '#04070C', '#5CE1FF'], ['orchid-veil', '#100714', '#D8A7E8'],
  ['deep-jade', '#051009', '#4FD1A1'], ['midnight-mango', '#130D05', '#FFC94D'],
  // key base darks the new colorways must also be distinct from
  ['crystalline-dark', '#0A0A0F', '#60C0F0'], ['obsidian-black', '#0A0A0F', '#5AA9E6'],
  ['carbon-fiber', '#0D0D0F', '#9CA3AF'],
];

describe('new colorways — WCAG contrast matrix (computed, not claimed)', () => {
  it.each(NEW_COLORWAY_SPECS.map((c) => [c.id, c] as [string, NewColorwaySpec]))(
    '%s passes the full contrast matrix',
    (_id, c) => {
      const surf = flatSurface(c.surface, c.bg);
      const elev = flatSurface(c.elevated, c.bg);
      // text vs bg / surface / elevated
      expect(contrastRatio(c.text, c.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.text, surf)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.text, elev)).toBeGreaterThanOrEqual(4.5);
      // secondary/muted text vs surface + elevated (body-size → 4.5)
      expect(contrastRatio(c.textSecondary, surf, parseColor(c.bg))).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.muted, surf, parseColor(c.bg))).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.textSecondary, elev, parseColor(c.bg))).toBeGreaterThanOrEqual(4.5);
      // label on primary/accent fills (the most-viewed pair)
      expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
      // accent vs surface (non-text role) + focus ring vs surface AND elevated
      expect(contrastRatio(c.accent, surf)).toBeGreaterThanOrEqual(3.0);
      expect(contrastRatio(c.focusRing, surf)).toBeGreaterThanOrEqual(3.0);
      expect(contrastRatio(c.focusRing, elev)).toBeGreaterThanOrEqual(3.0);
    },
  );
});

describe('new colorways — not retired-cyan', () => {
  it.each(NEW_COLORWAY_SPECS.map((c) => [c.id, c] as [string, NewColorwaySpec]))(
    '%s uses no banned cyan in primary/accent/secondary',
    (_id, c) => {
      expect(isRetiredCyan(c.primary)).toBe(false);
      expect(isRetiredCyan(c.accent)).toBe(false);
      expect(isRetiredCyan(c.secondary)).toBe(false);
    },
  );
});

describe('new colorways — distinctness gate (Kimi R4 weighted, dark-feasible)', () => {
  it.each(NEW_COLORWAY_SPECS.map((c) => [c.id, c] as [string, NewColorwaySpec]))(
    '%s is primary ΔE≥7 from every kept colorway',
    (_id, c) => {
      for (const [keptId, , keptPrimary] of KEPT_PAIRS) {
        const dPrimary = deltaEOK(c.primary, keptPrimary);
        expect(dPrimary, `${c.id} vs ${keptId}: ΔEprimary=${dPrimary.toFixed(1)}`).toBeGreaterThanOrEqual(7);
      }
    },
  );

  it('every new colorway is primary ΔE≥6 from every other new colorway', () => {
    for (let i = 0; i < NEW_COLORWAY_SPECS.length; i++) {
      for (let j = i + 1; j < NEW_COLORWAY_SPECS.length; j++) {
        const a = NEW_COLORWAY_SPECS[i], b = NEW_COLORWAY_SPECS[j];
        const d = deltaEOK(a.primary, b.primary);
        expect(d, `${a.id} vs ${b.id}: ΔEprimary=${d.toFixed(1)}`).toBeGreaterThanOrEqual(6);
      }
    }
  });
});

describe('new colorways — chart series separability', () => {
  it.each(NEW_COLORWAY_SPECS.map((c) => [c.id, c] as [string, NewColorwaySpec]))(
    '%s chart1/2/3 are mutually ΔE≥7',
    (_id, c) => {
      expect(deltaEOK(c.chart1, c.chart2)).toBeGreaterThanOrEqual(7);
      expect(deltaEOK(c.chart1, c.chart3)).toBeGreaterThanOrEqual(7);
      expect(deltaEOK(c.chart2, c.chart3)).toBeGreaterThanOrEqual(7);
    },
  );
});

describe('registry hygiene', () => {
  it('ids are unique + kebab-case', () => {
    const ids = NEW_COLORWAY_SPECS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it('names are unique', () => {
    const names = NEW_COLORWAY_SPECS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it('spans all three variety classes', () => {
    const v = new Set(NEW_COLORWAY_SPECS.map((c) => c.variety));
    expect(v.has('gradient-forward')).toBe(true);
    expect(v.has('clean-flat')).toBe(true);
    expect(v.has('light-glass')).toBe(true);
  });
});
