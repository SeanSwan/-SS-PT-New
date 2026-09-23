/**
 * themeSwatch.ts
 * ==============
 *
 * ONE derivation of the header theme-lens swatch from the theme palette.
 *
 * Why this module exists: the swatch used to be styled by eight hand-written
 * `switch ($currentTheme)` blocks inside UniversalThemeToggle.tsx, each carrying
 * the same 13 cases plus a `default`. With 28 registered themes, 15 of them fell
 * through to `default` and rendered crystalline-default's identical blue gradient
 * — the lens could not tell Enchanted Forest from Solar Gold from Carbon Fiber,
 * and it misreported the active theme to the user.
 *
 * The swatch is now a pure function of `themes[themeId]`, so registering a theme
 * styles it automatically and the failure cannot recur silently.
 *
 * Depends only on UniversalThemeContext (same as utils/theme/themeUtils.ts) to keep
 * the module graph acyclic.
 */

import { themes, type ThemeId } from './UniversalThemeContext';
import {
  gradientMidpoint,
  isLightBackground,
  readableOn,
} from './themeColorMath';

// Re-exported so consumers have one import for swatch concerns.
export {
  contrastRatio,
  gradientMidpoint,
  isLightBackground,
  parseHexColor,
  readableOn,
  relativeLuminance,
} from './themeColorMath';

// ===================== SWATCH =====================

export interface ThemeSwatchParticles {
  primary: string;
  secondary: string;
}

export interface ThemeSwatch {
  /** CSS `background` for the lens button. */
  fill: string;
  /** CSS `border` for the lens button. */
  border: string;
  /** CSS `color` for the glyph, contrast-checked against the gradient midpoint. */
  icon: string;
  /** Resting box-shadow. */
  glow: string;
  /** Hover box-shadow. */
  hoverGlow: string;
  /** Focus-visible ring colour, contrast-checked against the theme background. */
  focusRing: string;
  /** Corner radius — light themes use a squircle, dark themes a circle. */
  radius: string;
  /** Orbiting particles, or null when the theme declares no border glow. */
  particles: ThemeSwatchParticles | null;
  /** True when the theme's own background is light. */
  isLight: boolean;
}

/**
 * Derive the header lens swatch for a theme.
 *
 * Every value comes from the palette or from the theme's own `effects` flags —
 * there is no per-theme id list to forget to update.
 */
export const getThemeSwatch = (themeId: ThemeId): ThemeSwatch => {
  const theme = themes[themeId];
  const { colors, background, effects } = theme;

  const from = background.primary;
  const to = colors.primary;
  const isLight = isLightBackground(from);
  const glowAmount = effects.glowIntensity === 'intense'
    ? 0.55
    : effects.glowIntensity === 'medium'
      ? 0.45
      : 0.4;

  return {
    fill: `linear-gradient(135deg, ${from}, ${to})`,
    border: `2px solid color-mix(in srgb, ${to} 42%, transparent)`,
    // Measured against the gradient midpoint, not an end stop: that is where the
    // glyph is drawn, so that is the background it has to survive.
    icon: readableOn(gradientMidpoint(from, to)),
    glow: `0 0 ${Math.round(20 * (glowAmount / 0.4))}px color-mix(in srgb, ${to} ${Math.round(
      glowAmount * 100
    )}%, transparent), 0 0 40px color-mix(in srgb, ${colors.secondary} 20%, transparent)`,
    hoverGlow: `0 0 30px color-mix(in srgb, ${to} ${Math.round(
      Math.min(glowAmount + 0.2, 0.75) * 100
    )}%, transparent), 0 0 60px color-mix(in srgb, ${colors.secondary} 30%, transparent)`,
    focusRing: isLight ? colors.primaryDeep : colors.accent,
    radius: isLight ? '12px' : '50%',
    particles: effects.borderGlow
      ? { primary: colors.accent, secondary: colors.secondary }
      : null,
    isLight,
  };
};

/**
 * Stable identity of a swatch. Two themes with the same signature are
 * indistinguishable in the header — the regression this module exists to prevent.
 */
export const getThemeSwatchSignature = (themeId: ThemeId): string => {
  const swatch = getThemeSwatch(themeId);
  return [swatch.fill, swatch.border, swatch.icon, swatch.glow, swatch.radius].join(' | ');
};
