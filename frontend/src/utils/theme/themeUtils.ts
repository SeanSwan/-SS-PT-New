/**
 * themeUtils.ts
 * ============
 *
 * Crystalline Swan Theme Utilities for SwanStudios Platform
 *
 * Features:
 * - CSS Custom Properties generation for all Crystalline Swan themes
 * - Theme-aware styled-component helpers
 * - Performance-optimized theme switching
 * - Cross-component theme consistency
 *
 * PALETTE:
 * - Midnight Sapphire #002060 — Primary foundation
 * - Ice Wing #60C0F0 — PRIMARY accent
 * - Arctic Cyan #50A0F0 — Secondary accent
 * - Gilded Fern #C6A84B — Gold luxury accent
 * - Swan Lavender #4070C0 — Tertiary
 */

import { ThemeId, themes } from '../../context/ThemeContext/UniversalThemeContext';

const DARK_TEXT_ON_ACCENT = '#030712';
const LIGHT_TEXT_ON_ACCENT = '#FFFFFF';

const parseHexColor = (hex: string): [number, number, number] | null => {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(clean)) return null;

  const full = clean.length === 3
    ? clean.split('').map((char) => `${char}${char}`).join('')
    : clean;
  const value = Number.parseInt(full, 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const relativeLuminance = (hex: string): number | null => {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;

  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground: string, background: string): number => {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg === null || bg === null) return 0;

  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
};

const getReadableAccentText = (background: string): string => {
  const darkContrast = contrastRatio(DARK_TEXT_ON_ACCENT, background);
  const lightContrast = contrastRatio(LIGHT_TEXT_ON_ACCENT, background);
  return darkContrast >= lightContrast ? DARK_TEXT_ON_ACCENT : LIGHT_TEXT_ON_ACCENT;
};
// === CSS CUSTOM PROPERTIES GENERATION ===

/**
 * Generates CSS custom properties for a given theme
 * This enables instant theme switching via CSS variables
 */
export const generateCSSVariables = (themeId: ThemeId): string => {
  const theme = themes[themeId] || themes['crystalline-default'];
  const buttonPrimaryBg = theme.colors.primary;
  const buttonPrimaryText = getReadableAccentText(buttonPrimaryBg);
  const buttonSecondaryText = getReadableAccentText(theme.colors.secondary);
  return `
    /* === FOUNDATION COLORS === */
    --color-deep-space: ${theme.colors.deepSpace};
    --color-stardust: ${theme.colors.stardust};
    --color-void: ${theme.colors.void};

    /* === PRIMARY HIERARCHY (Ice Wing / Arctic Cyan) === */
    --color-primary: ${theme.colors.primary};
    --color-primary-blue: ${theme.colors.primaryBlue};
    --color-primary-deep: ${theme.colors.primaryDeep};
    --color-primary-light: ${theme.colors.primaryLight};
    --color-primary-neon: ${theme.colors.primaryNeon};

    /* === SECONDARY HIERARCHY (Swan Lavender) === */
    --color-secondary: ${theme.colors.secondary};
    --color-secondary-light: ${theme.colors.secondaryLight};
    --color-secondary-deep: ${theme.colors.secondaryDeep};

    /* === ACCENT COLORS (Gilded Fern) === */
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
    --gradient-glass: ${theme.gradients.glass};

    /* === SHADOWS === */
    --shadow-primary: ${theme.shadows.primary};
    --shadow-secondary: ${theme.shadows.secondary};
    --shadow-cosmic: ${theme.shadows.cosmic};
    --shadow-accent: ${theme.shadows.accent};
    --shadow-elevation: ${theme.shadows.elevation};
    --shadow-glow: ${theme.shadows.glow};
    --shadow-glass: ${theme.shadows.glass};
    --shadow-button: ${theme.shadows.button};

    /* === BORDERS === */
    --border-subtle: ${theme.borders.subtle};
    --border-elegant: ${theme.borders.elegant};
    --border-prominent: ${theme.borders.prominent};
    --border-glass: ${theme.borders.glass};
    --border-card: ${theme.borders.card};
    --border-focus: ${theme.borders.focus};

    /* === BACKGROUNDS === */
    --bg-primary: ${theme.background.primary};
    --bg-secondary: ${theme.background.secondary};
    --bg-surface: ${theme.background.surface};
    --bg-elevated: ${theme.background.elevated};

    /* === TEXT === */
    --text-primary: ${theme.text.primary};
    --text-secondary: ${theme.text.secondary};
    --text-muted: ${theme.text.muted};
    --text-heading: ${theme.text.heading};
    --text-subheading: ${theme.text.subheading};
    --text-body: ${theme.text.body};
    --text-label: ${theme.text.label};
    --text-accent: ${theme.text.accent};

    /* === TYPOGRAPHY === */
    --font-heading: ${theme.fonts.heading};
    --font-drama: ${theme.fonts.drama};
    --font-data: ${theme.fonts.data};
    --font-ui: ${theme.fonts.ui};

    /* === SEMANTIC VARIABLES (Social Master Strategy §3.1) === */
    --bg-base: ${theme.background.primary};
    --bg-elevated: ${theme.background.elevated};
    --bg-glass: ${theme.gradients.glass};
    --bg-surface: ${theme.background.surface};
    --text-primary: ${theme.text.primary};
    --text-secondary: ${theme.text.secondary};
    --text-muted: ${theme.text.muted};
    --text-inverse: ${themeId === 'crystalline-light' ? '#E0ECF4' : themeId === 'crystalline-mono' ? '#000000' : '#0F172A'};
    --border-soft: ${theme.borders.subtle};
    --border-strong: ${theme.borders.prominent};
    --accent-primary: ${theme.colors.primary};
    --accent-secondary: ${theme.colors.secondary};
    --accent-gold: ${theme.colors.accent};
    --accent-luxury: ${theme.colors.accent};
    --accent-sapphire: ${theme.colors.primaryDeep || theme.colors.primary};
    --success: ${theme.colors.success};
    --warning: ${theme.colors.warning};
    --danger: ${theme.colors.error};
    --info: ${theme.colors.primary};

    /* === DASHBOARD VARIABLE BRIDGE (AI Village consensus 2026-03-22) === */
    /* These variables unify all 3 dashboards with the 14-theme changer */
    --brand-primary: ${theme.colors.primaryDeep || theme.colors.primary};
    --brand-secondary: ${theme.colors.secondaryDeep || theme.colors.secondary};
    --brand-tertiary: ${theme.colors.secondary};
    --accent-cyan: ${theme.colors.primary};
    --accent-purple: ${theme.colors.secondary};
    --data-cyan: ${theme.colors.primaryLight || theme.colors.primary};
    --gradient-cosmic-nebula: linear-gradient(135deg, ${theme.colors.secondary} 0%, ${theme.colors.primary} 100%);
    --gradient-vault-glass: linear-gradient(180deg, ${theme.background.elevated} 0%, ${theme.background.surface} 100%);

    /* === LEGACY DASHBOARD ALIASES === */
    /* Mounted dashboard surfaces still consume these aliases. Keep them mapped
       to active theme values so they never fall back to static blue/gold/purple. */
    --surface-primary: ${theme.background.secondary};
    --surface-secondary: ${theme.background.elevated};
    --surface-tertiary: ${theme.background.surface};
    --surface-accent: ${theme.background.secondary};
    --surface-elevated: ${theme.background.elevated};
    --bg-card: ${theme.background.elevated};
    --shadow-ambient: ${theme.shadows.elevation};
    --button-primary: ${buttonPrimaryBg};
    --button-primary-bg: ${buttonPrimaryBg};
    --btn-primary-bg: ${buttonPrimaryBg};
    --button-primary-text: ${buttonPrimaryText};
    --button-secondary-bg: ${theme.colors.secondary};
    --button-secondary-text: ${buttonSecondaryText};
    --button-text: ${buttonPrimaryText};
    --text-on-accent: ${buttonPrimaryText};
    --button-text-on-accent: ${buttonPrimaryText};
    --accent-purple: ${theme.colors.secondary};
    --accent-success: ${theme.colors.success};
    --accent-error: ${theme.colors.error};
    --accent-glow: ${theme.colors.primary};
    --primary: ${theme.colors.primaryDeep || theme.colors.primary};
    --tertiary: ${theme.colors.secondary};
    --arctic-cyan: ${theme.colors.primaryLight || theme.colors.primary};
    --cyan-glow: ${theme.colors.primaryNeon || theme.colors.primary};
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
  textHeading: 'var(--text-heading)',
  textAccent: 'var(--text-accent)',

  // Gradients
  gradientPrimary: 'var(--gradient-primary)',
  gradientSecondary: 'var(--gradient-secondary)',
  gradientCosmic: 'var(--gradient-cosmic)',
  gradientStellar: 'var(--gradient-stellar)',
  gradientGlass: 'var(--gradient-glass)',

  // Shadows
  shadowPrimary: 'var(--shadow-primary)',
  shadowSecondary: 'var(--shadow-secondary)',
  shadowCosmic: 'var(--shadow-cosmic)',
  shadowAccent: 'var(--shadow-accent)',
  shadowElevation: 'var(--shadow-elevation)',
  shadowGlass: 'var(--shadow-glass)',
  shadowButton: 'var(--shadow-button)',

  // Borders
  borderSubtle: 'var(--border-subtle)',
  borderElegant: 'var(--border-elegant)',
  borderProminent: 'var(--border-prominent)',
  borderGlass: 'var(--border-glass)',
  borderCard: 'var(--border-card)',
  borderFocus: 'var(--border-focus)',

  // Typography
  fontHeading: 'var(--font-heading)',
  fontDrama: 'var(--font-drama)',
  fontData: 'var(--font-data)',
  fontUi: 'var(--font-ui)',

  // Semantic (Social Master Strategy §3.1)
  bgBase: 'var(--bg-base)',
  bgGlass: 'var(--bg-glass)',
  textInverse: 'var(--text-inverse)',
  borderSoft: 'var(--border-soft)',
  borderStrong: 'var(--border-strong)',
  accentPrimary: 'var(--accent-primary)',
  accentSecondary: 'var(--accent-secondary)',
  accentGold: 'var(--accent-gold)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
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
    case 'crystalline-default':
      return {
        ...baseConfig,
        duration: '0.4s',
        intensity: 'enhanced',
        glow: true,
      };
    case 'crystalline-light':
      return {
        ...baseConfig,
        duration: '0.3s',
        intensity: 'standard',
        glow: false,
      };
    case 'crystalline-dark':
      return {
        ...baseConfig,
        duration: '0.35s',
        intensity: 'enhanced',
        glow: true,
      };
    case 'crystalline-mono':
      return {
        ...baseConfig,
        duration: '0.3s',
        intensity: 'minimal',
        glow: false,
      };
    case 'obsidian-black':
      return {
        ...baseConfig,
        duration: '0.3s',
        intensity: 'standard',
        glow: false,
      };
    case 'cinematic-ember':
      return {
        ...baseConfig,
        duration: '0.35s',
        intensity: 'enhanced',
        glow: true,
      };
    case 'frozen-aurora':
      return {
        ...baseConfig,
        duration: '0.3s',
        intensity: 'standard',
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
    case 'crystalline-default':
      return 'primary'; // Ice-wing blue
    case 'crystalline-light':
      return 'primary'; // Arctic cyan on frost
    case 'crystalline-dark':
      return 'cosmic'; // Deep ice glow
    case 'crystalline-mono':
      return 'ghost'; // Thin white border, no gradient
    default:
      return 'primary';
  }
};

/**
 * Get theme-appropriate icon color
 */
export const getIconColor = (themeId: ThemeId, type: 'primary' | 'secondary' | 'accent' = 'primary'): string => {
  const theme = themes[themeId] || themes['crystalline-default'];
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
    return theme.colors.void;
  }

  return theme.text.primary;
};

/**
 * Check if current theme supports high contrast
 */
export const supportsHighContrast = (themeId: ThemeId): boolean => {
  return themeId === 'crystalline-dark';
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
