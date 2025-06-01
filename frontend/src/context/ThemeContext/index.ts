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
  themes
} from './UniversalThemeContext';

export { default as UniversalThemeToggle } from './UniversalThemeToggle';

export type { ThemeId } from './UniversalThemeContext';