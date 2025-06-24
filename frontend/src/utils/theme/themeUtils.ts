/**
 * themeUtils.ts
 * ============
 * 
 * Universal Theme Utilities for SwanStudios Platform
 * Designed by The Swan Alchemist following Master Prompt v28.6
 * 
 * Features:
 * - CSS Custom Properties generation for all themes
 * - Theme-aware styled-component helpers
 * - Performance-optimized theme switching
 * - Cross-component theme consistency
 * 
 * INTEGRATION PHILOSOPHY:
 * - BLUE/CYAN = PRIMARY hierarchy
 * - PURPLE = SECONDARY hierarchy  
 * - Seamless theme switching without flicker
 * - Video background compatibility
 */

import { ThemeId, themes } from '../../context/ThemeContext/UniversalThemeContext';

// === CSS CUSTOM PROPERTIES GENERATION ===

/**
 * Generates CSS custom properties for a given theme
 * This enables instant theme switching via CSS variables
 */
export const generateCSSVariables = (themeId: ThemeId): string => {
  const theme = themes[themeId];
  
  return `
    /* === FOUNDATION COLORS === */
    --color-deep-space: ${theme.colors.deepSpace};
    --color-stardust: ${theme.colors.stardust};
    --color-void: ${theme.colors.void};
    
    /* === PRIMARY HIERARCHY (Blue/Cyan) === */
    --color-primary: ${theme.colors.primary};
    --color-primary-blue: ${theme.colors.primaryBlue};
    --color-primary-deep: ${theme.colors.primaryDeep};
    --color-primary-light: ${theme.colors.primaryLight};
    --color-primary-neon: ${theme.colors.primaryNeon};
    
    /* === SECONDARY HIERARCHY (Purple) === */
    --color-secondary: ${theme.colors.secondary};
    --color-secondary-light: ${theme.colors.secondaryLight};
    --color-secondary-deep: ${theme.colors.secondaryDeep};
    
    /* === ACCENT COLORS === */
    --color-accent: ${theme.colors.accent};
    --color-accent-light: ${theme.colors.accentLight};
    --color-accent-warm: ${theme.colors.accentWarm};
    
    /* === SUPPORT COLORS === */
    --color-white: ${theme.colors.white};
    --color-silver: ${theme.colors.silver};
    --color-muted: ${theme.colors.muted};
    --color-error: ${theme.colors.error};
    --color-success: ${theme.colors.success};
    --color-warning: ${theme.colors.warning};
    
    /* === GRADIENTS === */
    --gradient-primary: ${theme.gradients.primary};
    --gradient-secondary: ${theme.gradients.secondary};
    --gradient-cosmic: ${theme.gradients.cosmic};
    --gradient-hero: ${theme.gradients.hero};
    --gradient-card: ${theme.gradients.card};
    --gradient-accent: ${theme.gradients.accent};
    --gradient-stellar: ${theme.gradients.stellar};
    --gradient-swan-cosmic: ${theme.gradients.swanCosmic};
    
    /* === SHADOWS === */
    --shadow-primary: ${theme.shadows.primary};
    --shadow-secondary: ${theme.shadows.secondary};
    --shadow-cosmic: ${theme.shadows.cosmic};
    --shadow-accent: ${theme.shadows.accent};
    --shadow-elevation: ${theme.shadows.elevation};
    --shadow-glow: ${theme.shadows.glow};
    
    /* === BORDERS === */
    --border-subtle: ${theme.borders.subtle};
    --border-elegant: ${theme.borders.elegant};
    --border-prominent: ${theme.borders.prominent};
    
    /* === BACKGROUNDS === */
    --bg-primary: ${theme.background.primary};
    --bg-secondary: ${theme.background.secondary};
    --bg-surface: ${theme.background.surface};
    --bg-elevated: ${theme.background.elevated};
    
    /* === TEXT === */
    --text-primary: ${theme.text.primary};
    --text-secondary: ${theme.text.secondary};
    --text-muted: ${theme.text.muted};
  `;
};

/**
 * Injects CSS custom properties into the document
 * Call this when theme changes to update all CSS variables
 */
export const injectThemeVariables = (themeId: ThemeId): void => {
  const cssVariables = generateCSSVariables(themeId);
  
  // Remove existing theme variables
  let themeStyleElement = document.getElementById('theme-variables');
  if (themeStyleElement) {
    themeStyleElement.remove();
  }
  
  // Create new style element with theme variables
  themeStyleElement = document.createElement('style');
  themeStyleElement.id = 'theme-variables';
  themeStyleElement.textContent = `
    :root {
      ${cssVariables}
    }
  `;
  
  document.head.appendChild(themeStyleElement);
  
  // Also set data attribute for theme-aware CSS selectors
  document.documentElement.setAttribute('data-theme', themeId);
};

// === STYLED-COMPONENTS HELPERS ===

/**
 * Theme-aware styled-component helper
 * Use this to create components that automatically adapt to theme changes
 */
export const themeColors = {
  primary: ({ theme }: { theme: any }) => theme.colors.primary,
  primaryBlue: ({ theme }: { theme: any }) => theme.colors.primaryBlue,
  secondary: ({ theme }: { theme: any }) => theme.colors.secondary,
  accent: ({ theme }: { theme: any }) => theme.colors.accent,
  background: {
    primary: ({ theme }: { theme: any }) => theme.background.primary,
    secondary: ({ theme }: { theme: any }) => theme.background.secondary,
    surface: ({ theme }: { theme: any }) => theme.background.surface,
    elevated: ({ theme }: { theme: any }) => theme.background.elevated,
  },
  text: {
    primary: ({ theme }: { theme: any }) => theme.text.primary,
    secondary: ({ theme }: { theme: any }) => theme.text.secondary,
    muted: ({ theme }: { theme: any }) => theme.text.muted,
  },
  gradients: {
    primary: ({ theme }: { theme: any }) => theme.gradients.primary,
    secondary: ({ theme }: { theme: any }) => theme.gradients.secondary,
    cosmic: ({ theme }: { theme: any }) => theme.gradients.cosmic,
    stellar: ({ theme }: { theme: any }) => theme.gradients.stellar,
    swanCosmic: ({ theme }: { theme: any }) => theme.gradients.swanCosmic,
  },
  shadows: {
    primary: ({ theme }: { theme: any }) => theme.shadows.primary,
    secondary: ({ theme }: { theme: any }) => theme.shadows.secondary,
    cosmic: ({ theme }: { theme: any }) => theme.shadows.cosmic,
    accent: ({ theme }: { theme: any }) => theme.shadows.accent,
    elevation: ({ theme }: { theme: any }) => theme.shadows.elevation,
  },
  borders: {
    subtle: ({ theme }: { theme: any }) => theme.borders.subtle,
    elegant: ({ theme }: { theme: any }) => theme.borders.elegant,
    prominent: ({ theme }: { theme: any }) => theme.borders.prominent,
  }
};

// === CSS VARIABLE HELPERS ===

/**
 * Get CSS variable value
 * Use this for accessing theme variables in regular CSS or components
 */
export const cssVar = (variable: string): string => `var(--${variable})`;

/**
 * Common theme CSS variables for easy access
 */
export const cssVars = {
  // Colors
  primary: 'var(--color-primary)',
  primaryBlue: 'var(--color-primary-blue)',
  secondary: 'var(--color-secondary)',
  accent: 'var(--color-accent)',
  
  // Backgrounds
  bgPrimary: 'var(--bg-primary)',
  bgSecondary: 'var(--bg-secondary)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  
  // Text
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  
  // Gradients
  gradientPrimary: 'var(--gradient-primary)',
  gradientSecondary: 'var(--gradient-secondary)',
  gradientCosmic: 'var(--gradient-cosmic)',
  gradientStellar: 'var(--gradient-stellar)',
  
  // Shadows
  shadowPrimary: 'var(--shadow-primary)',
  shadowSecondary: 'var(--shadow-secondary)',
  shadowCosmic: 'var(--shadow-cosmic)',
  shadowAccent: 'var(--shadow-accent)',
  shadowElevation: 'var(--shadow-elevation)',
  
  // Borders
  borderSubtle: 'var(--border-subtle)',
  borderElegant: 'var(--border-elegant)',
  borderProminent: 'var(--border-prominent)',
};

// === ANIMATION HELPERS ===

/**
 * Theme-aware animation configurations
 * Provides different animation intensities based on theme and user preferences
 */
export const getAnimationConfig = (themeId: ThemeId) => {
  const baseConfig = {
    duration: '0.3s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    reducedMotion: 'prefers-reduced-motion: reduce',
  };
  
  switch (themeId) {
    case 'swan-galaxy':
      return {
        ...baseConfig,
        duration: '0.4s',
        intensity: 'enhanced',
        glow: true,
      };
    case 'admin-command':
      return {
        ...baseConfig,
        duration: '0.3s',
        intensity: 'standard',
        glow: false,
      };
    case 'dark-galaxy':
      return {
        ...baseConfig,
        duration: '0.2s',
        intensity: 'minimal',
        glow: false,
      };
    default:
      return baseConfig;
  }
};

// === COMPONENT THEME MAPPING ===

/**
 * Maps GlowButton variants to Universal Theme
 */
export const getGlowButtonVariant = (themeId: ThemeId): string => {
  switch (themeId) {
    case 'swan-galaxy':
      return 'primary'; // Blue/cyan cosmic
    case 'admin-command':
      return 'primary'; // Professional blue
    case 'dark-galaxy':
      return 'cosmic'; // Minimalist white/cyan
    default:
      return 'primary';
  }
};

/**
 * Get theme-appropriate icon color
 */
export const getIconColor = (themeId: ThemeId, type: 'primary' | 'secondary' | 'accent' = 'primary'): string => {
  const theme = themes[themeId];
  
  switch (type) {
    case 'primary':
      return theme.colors.primary;
    case 'secondary':
      return theme.colors.secondary;
    case 'accent':
      return theme.colors.accent;
    default:
      return theme.colors.primary;
  }
};

// === PERFORMANCE UTILITIES ===

/**
 * Optimized theme switching with RAF
 * Ensures smooth transitions without layout thrashing
 */
export const switchThemeOptimized = (themeId: ThemeId, callback?: () => void): void => {
  requestAnimationFrame(() => {
    injectThemeVariables(themeId);
    
    if (callback) {
      requestAnimationFrame(callback);
    }
  });
};

/**
 * Debounced theme switching for rapid theme changes
 */
let themeChangeTimeout: NodeJS.Timeout;
export const switchThemeDebounced = (themeId: ThemeId, delay: number = 100): void => {
  clearTimeout(themeChangeTimeout);
  themeChangeTimeout = setTimeout(() => {
    switchThemeOptimized(themeId);
  }, delay);
};

// === ACCESSIBILITY HELPERS ===

/**
 * Get contrast-appropriate colors based on theme
 */
export const getContrastColor = (themeId: ThemeId, background: 'light' | 'dark' = 'dark'): string => {
  const theme = themes[themeId];
  
  if (background === 'light') {
    return theme.colors.void; // Dark text on light background
  }
  
  return theme.text.primary; // Light text on dark background
};

/**
 * Check if current theme supports high contrast
 */
export const supportsHighContrast = (themeId: ThemeId): boolean => {
  return themeId === 'dark-galaxy'; // Dark Galaxy theme has best contrast
};

export default {
  generateCSSVariables,
  injectThemeVariables,
  themeColors,
  cssVar,
  cssVars,
  getAnimationConfig,
  getGlowButtonVariant,
  getIconColor,
  switchThemeOptimized,
  switchThemeDebounced,
  getContrastColor,
  supportsHighContrast,
};
