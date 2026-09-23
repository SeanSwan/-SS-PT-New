/**
 * Theme Context Index
 * Export all theme-related components and utilities
 */

export { 
  UniversalThemeProvider, 
  useUniversalTheme, 
  useStyledTheme,
  getGlowButtonVariant,
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
  themes,
  themeCycle
} from './UniversalThemeContext';

export { default as UniversalThemeToggle } from './UniversalThemeToggle';
export { default as ThemeLensButton } from './ThemeLensButton';
export { default as ThemeLensPopover } from './ThemeLensPopover';

// The lens swatch. Exported from the barrel so a second consumer (a preview
// elsewhere in the app) cannot re-derive it and drift, which is exactly how the
// old hand-maintained switch blocks went wrong.
export { getThemeSwatch, getThemeSwatchSignature } from './themeSwatch';
export type { ThemeSwatch } from './themeSwatch';

export {
  getThemeDescription,
  getThemeIconKey,
  themeIconKeys,
  themeToggleMetadata
} from './themeToggleMetadata';

// Storage keys + system-preference helpers. The inline pre-paint bootstrap in
// index.html hardcodes these same strings, and themePrePaint.test.ts fails if
// the two ever drift.
export {
  THEME_STORAGE_KEY,
  FOLLOW_SYSTEM_STORAGE_KEY,
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME
} from './UniversalThemeContext';

export type { ThemeId } from './UniversalThemeContext';
