/**
 * derivePreviewStyle.test.ts
 * ==========================
 * Proves EVERY registered style lens renders a DISTINCT preview (Sean: "a lot of the
 * styles look the same"). Before this, only 5 sentinel lenses had preview styling and
 * the other ~24 shared one identical skeleton. Now the preview is derived from each
 * lens's manifest, so no two lenses collapse to the same visual fingerprint.
 */
import { describe, it, expect } from 'vitest';
import { derivePreviewStyle, canvasBackground } from './derivePreviewStyle';
import { SWAN_STYLE_LENS_REGISTRY } from '../../../adapters/style-lens-swan';

const LENSES = SWAN_STYLE_LENS_REGISTRY.available();

const fingerprintOf = (lens: (typeof LENSES)[number]) => {
  const d = derivePreviewStyle(lens);
  return [d.railWidth, d.panelRadius, d.canvasKind, d.accentToken, d.cardsColumns, d.mono, d.skew].join('|');
};

describe('derivePreviewStyle — every lens is visually distinct', () => {
  it('registry has the full lens set (>25)', () => {
    expect(LENSES.length).toBeGreaterThan(25);
  });

  it('is deterministic — same lens → same fingerprint', () => {
    for (const lens of LENSES) {
      expect(fingerprintOf(lens)).toBe(fingerprintOf(lens));
    }
  });

  it('no two lenses collapse to an identical preview fingerprint', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const lens of LENSES) {
      const fp = fingerprintOf(lens);
      if (seen.has(fp)) collisions.push(`${lens.id} ≡ ${seen.get(fp)}`);
      else seen.set(fp, lens.id);
    }
    expect(collisions, `collisions: ${collisions.join(', ')}`).toEqual([]);
  });

  it('produces valid, token-based canvas backgrounds (no raw retired palette)', () => {
    for (const lens of LENSES) {
      const d = derivePreviewStyle(lens);
      const bg = canvasBackground(d.canvasKind, d.accentToken);
      expect(bg).toContain('var(--preview-bg'); // token-driven
      expect(bg.toLowerCase()).not.toMatch(/#0a0a1a|#00ffff|#7851a9/); // no retired literals
    }
  });

  it('rail width, radius, skew stay in sane preview bounds', () => {
    for (const lens of LENSES) {
      const d = derivePreviewStyle(lens);
      expect(d.railWidth).toBeGreaterThanOrEqual(44);
      expect(d.railWidth).toBeLessThanOrEqual(92);
      expect(d.panelRadius).toBeGreaterThanOrEqual(0);
      expect(d.panelRadius).toBeLessThanOrEqual(30);
      expect(Math.abs(d.skew)).toBeLessThanOrEqual(1);
    }
  });
});
