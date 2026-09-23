/**
 * themeAccessors.ts
 * =================
 *
 * Pure theme lookups — no React, no context. Split out of
 * UniversalThemeContext.tsx to keep that module inside Rule 4's 300-line cap.
 *
 * Kept free of any import from UniversalThemeContext on purpose: `useStyledTheme`
 * stays behind in the provider module because it needs the hook, and importing it
 * back the other way would make the two modules circular.
 */

import { themes, type ThemeId } from './themePalettes';

export const getThemeColors = (themeId: ThemeId) => themes[themeId].colors;
export const getThemeGradients = (themeId: ThemeId) => themes[themeId].gradients;
export const getThemeShadows = (themeId: ThemeId) => themes[themeId].shadows;

/**
 * Maps universal themes to GlowButton variants.
 *
 * NOTE: a second, already-diverged copy of this function lives in
 * `utils/theme/themeUtils.ts`. Both have zero call sites. Recorded as a known open
 * item rather than deleted here, because deleting one of two identical-looking
 * functions is how you delete the wrong one.
 */
export const getGlowButtonVariant = (themeId: ThemeId): string => {
  switch (themeId) {
    case 'crystalline-default':
      return 'primary'; // Ice-wing blue glow
    case 'crystalline-light':
      return 'primary'; // Arctic cyan on frost
    case 'crystalline-dark':
      return 'cosmic'; // Deep ice glow
    case 'crystalline-mono':
      return 'ghost'; // Thin white border, no gradient
    case 'obsidian-black':
      return 'cosmic'; // Subtle purple glow
    default:
      return 'primary';
  }
};
