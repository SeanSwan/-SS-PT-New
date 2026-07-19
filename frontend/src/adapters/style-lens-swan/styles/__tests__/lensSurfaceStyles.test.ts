/**
 * Slice 3 / C6 — lensSurfaceStyles source invariants + fallback contrast (KIMI-SWAN-LENS-SLICE3 §4.1).
 * Retired-hex literals concatenated so the grep gate finds none (§3.D).
 */
import { describe, expect, it } from 'vitest';
import { lensSurfaceCss } from '../lensSurfaceStyles';

const RETIRED = new RegExp(['#0a0a' + '1a', '#00ff' + 'ff', '#7851' + 'a9'].join('|'), 'i');

const lum = (hex: string): number => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('C6 lensSurfaceStyles — source invariants', () => {
  it('emits ZERO --world-* declarations (Rule 67 / Lane A)', () => {
    expect(lensSurfaceCss).not.toMatch(/--world-[a-z0-9-]+\s*:/);
  });
  it('contains no z-index property and no !important', () => {
    expect(lensSurfaceCss).not.toMatch(/z-index\s*:/);
    expect(lensSurfaceCss).not.toMatch(/!important/);
  });
  it('contains no retired-palette literals', () => {
    expect(RETIRED.test(lensSurfaceCss)).toBe(false);
  });
  it('scopes EVERY rule to [data-style-lens-shell] — no bare global focus/selection', () => {
    const selectors = lensSurfaceCss.replace(/@media[^{]+\{/g, '').match(/[^{}]+(?=\{)/g) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) {
      if (s.trim().length === 0) continue;
      expect(s).toContain('[data-style-lens-shell]');
    }
  });
  it('declares the S1-A shadow base verbatim at --lens-elev-3', () => {
    expect(lensSurfaceCss).toContain('--lens-elev-3: 0 8px 24px rgba(10, 10, 15, 0.55);');
  });
  it('harmonizes forced-colors with the SAME value as the S1-C rule', () => {
    const block = lensSurfaceCss.match(/@media \(forced-colors: active\) \{([\s\S]*?)\n\}/);
    expect(block?.[1]).toContain('outline: 2px solid Highlight;');
  });
});

describe('C6 fallback contrast (house bar)', () => {
  it('selection pair #60c0f0 on #0a0a0f >= 4.5', () => {
    expect(ratio('#60c0f0', '#0a0a0f')).toBeGreaterThanOrEqual(4.5); // ≈ 9.7
  });
  it('focus ring #60c0f0 vs --bg-surface #141419 >= 3.0', () => {
    expect(ratio('#60c0f0', '#141419')).toBeGreaterThanOrEqual(3.0); // ≈ 9.0
  });
});
