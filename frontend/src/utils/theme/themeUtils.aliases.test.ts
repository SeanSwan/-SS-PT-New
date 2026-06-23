import { describe, expect, it } from 'vitest';
import { themeCycle, type ThemeId } from '../../context/ThemeContext/UniversalThemeContext';
import { generateCSSVariables } from './themeUtils';

const requiredDashboardAliases = [
  'surface-primary',
  'surface-secondary',
  'bg-card',
  'button-primary',
  'button-primary-bg',
  'button-primary-text',
  'button-secondary-bg',
  'button-secondary-text',
  'accent-luxury',
  'accent-purple',
  'accent-success',
  'accent-error',
  'accent-glow',
  'primary',
  'tertiary',
  'arctic-cyan',
  'cyan-glow',
] as const;

function cssValue(css: string, name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1]?.trim() ?? '';
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map((char) => char + char).join('')
    : clean;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme CSS variable bridge aliases', () => {
  it('emits every dashboard alias used by mounted user-dashboard surfaces', () => {
    for (const themeId of themeCycle) {
      const css = generateCSSVariables(themeId as ThemeId);

      for (const alias of requiredDashboardAliases) {
        expect(cssValue(css, alias), `${themeId} missing --${alias}`).not.toBe('');
      }
    }
  });

  it('keeps filled button text aliases AA-readable for every theme', () => {
    for (const themeId of themeCycle) {
      const css = generateCSSVariables(themeId as ThemeId);

      expect(
        contrastRatio(cssValue(css, 'button-primary-text'), cssValue(css, 'button-primary-bg')),
        `${themeId} primary button contrast`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(cssValue(css, 'button-secondary-text'), cssValue(css, 'button-secondary-bg')),
        `${themeId} secondary button contrast`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not override broad legacy text aliases with one global button color', () => {
    for (const themeId of themeCycle) {
      const css = generateCSSVariables(themeId as ThemeId);

      expect(cssValue(css, 'button-text'), `${themeId} legacy --button-text`).toBe('');
      expect(cssValue(css, 'text-on-accent'), `${themeId} legacy --text-on-accent`).toBe('');
    }
  });
});