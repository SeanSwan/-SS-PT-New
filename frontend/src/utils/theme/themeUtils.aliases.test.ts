import { describe, expect, it } from 'vitest';
import { themes, themeCycle, type ThemeId } from '../../context/ThemeContext/UniversalThemeContext';
import { generateCSSVariables } from './themeUtils';

const requiredDashboardAliases = [
  'surface-primary',
  'surface-secondary',
  'surface-accent',
  'surface-elevated',
  'bg-card',
  'shadow-ambient',
  'button-primary',
  'button-primary-bg',
  'btn-primary-bg',
  'button-primary-text',
  'button-secondary-bg',
  'button-secondary-text',
  'button-text',
  'text-on-accent',
  'button-text-on-accent',
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

const requiredSessionDetailAliases = [
  'schedule-command-panel-bg',
  'schedule-command-panel-border',
  'schedule-command-panel-inset',
  'schedule-command-panel-shadow',
  'schedule-command-card-bg',
  'schedule-command-card-border',
  'schedule-command-risk-high-border',
  'schedule-command-risk-high-bg',
  'schedule-command-risk-medium-border',
  'schedule-command-risk-medium-bg',
  'schedule-command-risk-low-border',
  'schedule-command-risk-low-bg',
  'schedule-command-attention-bg',
  'schedule-command-attention-border',
  'schedule-command-proposal-bg',
  'schedule-command-proposal-border',
  'schedule-command-action-border',
  'schedule-command-action-bg',
  'schedule-command-action-glow',
  'schedule-command-action-border-hover',
  'schedule-series-bg',
  'schedule-series-border',
  'schedule-notification-bg',
  'schedule-notification-border',
  'schedule-notification-accent',
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
      const css = generateCSSVariables(themeId as ThemeId, themes);

      for (const alias of requiredDashboardAliases) {
        expect(cssValue(css, alias), `${themeId} missing --${alias}`).not.toBe('');
      }
    }
  });

  it('keeps filled button text aliases AA-readable for every theme', () => {
    for (const themeId of themeCycle) {
      const css = generateCSSVariables(themeId as ThemeId, themes);

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

  it('keeps legacy button text aliases tied to the computed primary button text', () => {
    for (const themeId of themeCycle) {
      const css = generateCSSVariables(themeId as ThemeId, themes);

      expect(cssValue(css, 'button-text'), `${themeId} legacy --button-text`).toBe(cssValue(css, 'button-primary-text'));
      expect(cssValue(css, 'text-on-accent'), `${themeId} legacy --text-on-accent`).toBe(cssValue(css, 'button-primary-text'));
      expect(cssValue(css, 'button-text-on-accent'), `${themeId} legacy --button-text-on-accent`).toBe(cssValue(css, 'button-primary-text'));
    }
  });

  it('emits theme-owned session detail modal aliases for every theme', () => {
    for (const themeId of themeCycle) {
      const css = generateCSSVariables(themeId as ThemeId, themes);

      for (const alias of requiredSessionDetailAliases) {
        expect(cssValue(css, alias), `${themeId} missing --${alias}`).not.toBe('');
      }
    }
  });

  it('ties premium session detail modal modules to the selected non-blue theme', () => {
    const rubyCss = generateCSSVariables('ruby-forge', themes);
    const emeraldCss = generateCSSVariables('emerald-vault', themes);

    expect(cssValue(rubyCss, 'schedule-command-panel-bg')).toContain('#32111B');
    expect(cssValue(rubyCss, 'schedule-command-action-bg')).toContain('#9F1239');
    expect(cssValue(rubyCss, 'schedule-command-action-bg')).toContain('#BE123C');
    expect(cssValue(rubyCss, 'schedule-notification-accent')).toBe('#FB7185');
    expect(cssValue(emeraldCss, 'schedule-command-panel-bg')).toContain('#0B3A2B');
    expect(cssValue(emeraldCss, 'schedule-command-action-bg')).toContain('#047857');
    expect(cssValue(emeraldCss, 'schedule-command-action-bg')).toContain('#065F46');
  });
});
