/**
 * themeColorMath.ts
 * =================
 *
 * Pure colour maths for the theme system. Imports nothing, so both the palette
 * (UniversalThemeContext) and the swatch (themeSwatch) can depend on it without
 * creating an import cycle.
 *
 * The two text constants match utils/theme/themeUtils.ts so the whole theme system
 * agrees on the dark/light-on-accent convention.
 */

export const DARK_TEXT_ON_ACCENT = '#030712';
export const LIGHT_TEXT_ON_ACCENT = '#FFFFFF';

/** Luminance above this reads as a light surface. */
export const LIGHT_BACKGROUND_THRESHOLD = 0.35;

export type Rgb = [number, number, number];

export const parseHexColor = (hex: string): Rgb | null => {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(clean)) return null;

  const full = clean.length === 3
    ? clean.split('').map((char) => `${char}${char}`).join('')
    : clean;
  const value = Number.parseInt(full, 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

const channelToLinear = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = (color: string): number | null => {
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 0;
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

/** RGBA with channels 0-255 and alpha 0-1. */
export type Rgba = [number, number, number, number];

/**
 * Parse a hex colour OR an `rgb()`/`rgba()` string.
 *
 * `parseHexColor` deliberately handles only hex, which is why contrast could not be
 * asserted for this palette set: 27 of the 28 themes express their text tokens as
 * `rgba(...)`. Measuring them needs a parser that accepts what the data actually
 * contains, not one that accepts what is convenient.
 */
export const parseColor = (color: string): Rgba | null => {
  const hex = parseHexColor(color);
  if (hex) return [hex[0], hex[1], hex[2], 1];

  const match = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;

  const parts = match[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.length > 4 || parts.some((n) => Number.isNaN(n))) return null;

  const [r, g, b] = parts;
  const a = parts.length === 4 ? parts[3] : 1;
  if (r > 255 || g > 255 || b > 255 || a < 0 || a > 1) return null;
  return [r, g, b, a];
};

/**
 * Composite `top` over `bottom`, as the browser paints it.
 *
 * This is the missing half of every "does the text contrast?" question in this
 * codebase. `--text-secondary` is `rgba(248, 250, 252, 0.85)` and `--bg-elevated` is
 * `rgba(0, 48, 128, 0.4)` — two translucent layers over an opaque page. Contrast
 * measured against either token in isolation is a number for a colour nobody sees.
 *
 * Returns hex, so the result can be fed straight back into `contrastRatio`.
 */
export const compositeOver = (top: string, bottom: string): string => {
  const t = parseColor(top);
  const b = parseColor(bottom);
  if (!t || !b) return top;

  const alpha = t[3] + b[3] * (1 - t[3]);
  if (alpha === 0) return '#000000';
  const mix = (i: 0 | 1 | 2) => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / alpha;
  return toHex([mix(0), mix(1), mix(2)]);
};

/**
 * Contrast ratio of `foreground` as actually rendered over `backdrop`.
 * `backdrop` must already be opaque (composite it first) — `relativeLuminance`
 * takes hex only, and a translucent backdrop has no single luminance.
 */
export const compositedContrast = (foreground: string, backdrop: string): number =>
  contrastRatio(compositeOver(foreground, backdrop), backdrop);

/** Midpoint of a linear gradient — where a glyph drawn on it actually sits. */
export const gradientMidpoint = (from: string, to: string): string => {
  const a = parseHexColor(from);
  const b = parseHexColor(to);
  if (!a || !b) return to;
  return toHex([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
};

/** Pick a readable text tone for a background. */
export const readableOn = (background: string): string => {
  const dark = contrastRatio(DARK_TEXT_ON_ACCENT, background);
  const light = contrastRatio(LIGHT_TEXT_ON_ACCENT, background);
  if (dark === 0 && light === 0) return LIGHT_TEXT_ON_ACCENT;
  return dark >= light ? DARK_TEXT_ON_ACCENT : LIGHT_TEXT_ON_ACCENT;
};

export const isLightBackground = (background: string): boolean => {
  const luminance = relativeLuminance(background);
  return luminance !== null && luminance > LIGHT_BACKGROUND_THRESHOLD;
};
