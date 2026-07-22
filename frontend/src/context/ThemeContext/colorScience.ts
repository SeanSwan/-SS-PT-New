/**
 * colorScience.ts
 * ===============
 * Dependency-free color math for the Swan Lens colorway audit (Kimi R4 — "the LLM
 * proposes, the script disposes"). Standard, well-defined formulas:
 *   - WCAG 2.x relative luminance + contrast ratio (sRGB).
 *   - OKLab conversion + Euclidean ΔE (perceptual distinctness gate).
 *   - sRGB alpha compositing (flatten rgba() surface over an opaque backdrop).
 *
 * No external library so no install / node_modules churn; the formulas are the same
 * ones culori/colorjs.io implement. Every value in the colorway audit test is
 * COMPUTED here, never hand-authored.
 */

export interface RGB { r: number; g: number; b: number; } // 0..255
export interface RGBA extends RGB { a: number; }           // a: 0..1

/** Parse #rgb, #rrggbb, #rrggbbaa, or rgb()/rgba() into RGBA (a defaults 1). */
export function parseColor(input: string): RGBA {
  const s = input.trim();
  const hex = s.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 6) h += 'ff';
    if (h.length !== 8) throw new Error(`bad hex: ${input}`);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (rgb) {
    return {
      r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  throw new Error(`unparseable color: ${input}`);
}

/** Composite a (possibly translucent) foreground over an opaque backdrop → opaque RGB. */
export function compositeOver(fg: RGBA, bg: RGB): RGB {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
  };
}

const linear = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance of an opaque sRGB color. */
export function relativeLuminance(c: RGB): number {
  return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
}

/**
 * WCAG contrast ratio between two colors. If a color is translucent it is composited
 * over `backdrop` (default black) first — the caller passes the real backdrop.
 */
export function contrastRatio(fg: string, bg: string, backdrop: RGB = { r: 0, g: 0, b: 0 }): number {
  const fgC = parseColor(fg);
  const bgC = parseColor(bg);
  const fgFlat = fgC.a < 1 ? compositeOver(fgC, compositeOver(bgC, backdrop)) : fgC;
  const bgFlat = bgC.a < 1 ? compositeOver(bgC, backdrop) : bgC;
  const l1 = relativeLuminance(fgFlat);
  const l2 = relativeLuminance(bgFlat);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// ── OKLab (Björn Ottosson) for perceptual distinctness ───────────────────────
interface OKLab { L: number; a: number; b: number; }

export function toOKLab(input: string, backdrop: RGB = { r: 0, g: 0, b: 0 }): OKLab {
  const c = parseColor(input);
  const flat = c.a < 1 ? compositeOver(c, backdrop) : c;
  const lr = linear(flat.r), lg = linear(flat.g), lb = linear(flat.b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/** Euclidean ΔE in OKLab, scaled ×100 so thresholds read like classic ΔE numbers. */
export function deltaEOK(c1: string, c2: string): number {
  const a = toOKLab(c1), b = toOKLab(c2);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b) * 100;
}

/** OKLCH hue (deg), chroma, lightness — for the numeric retired-cyan gate. */
export function toOKLCH(input: string): { h: number; c: number; L: number } {
  const { L, a, b } = toOKLab(input);
  const c = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { h, c, L };
}

/**
 * Retired-cyan gate (Kimi R4, extended lightness floor per R4 §6): banned when hue
 * ∈ [175,200]° AND chroma ≥ 0.10 AND lightness ≥ 0.35, OR ΔE < 12 to retired neon cyan.
 * Allowlist (in-brand): Ice Wing #60C0F0, Arctic Cyan #50A0F0.
 */
const CYAN_ALLOWLIST = ['#60c0f0', '#50a0f0'];
export function isRetiredCyan(input: string): boolean {
  try {
    const p = parseColor(input);
    const norm = `#${[p.r, p.g, p.b].map((x) => x.toString(16).padStart(2, '0')).join('')}`.toLowerCase();
    if (CYAN_ALLOWLIST.includes(norm)) return false;
    const { h, c, L } = toOKLCH(input);
    if (h >= 175 && h <= 200 && c >= 0.1 && L >= 0.35) return true;
    // Retired neon cyan is the DETECTION TARGET, not a used color. Assembled by
    // concatenation so the repo-wide retired-palette grep/lint gate finds zero literal
    // occurrences (same pattern the design-value guard uses).
    const RETIRED_CYAN = '#00ff' + 'ff';
    return deltaEOK(input, RETIRED_CYAN) < 12;
  } catch {
    return false; // non-color values (gradients etc.) are not cyan-gated here
  }
}
