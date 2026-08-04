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
 * - Midnight Sapphire #002060 â€” Primary foundation
 * - Ice Wing #60C0F0 â€” PRIMARY accent
 * - Arctic Cyan #50A0F0 â€” Secondary accent
 * - Gilded Fern #C6A84B â€” Gold luxury accent
 * - Swan Lavender #4070C0 â€” Tertiary
 */

import type { CrystallineTheme, ThemeId } from '../../context/ThemeContext/UniversalThemeContext';

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

/**
 * Hex â†’ "R, G, B" triplet for the tokens.css RGB-derivation bridge.
 * Returns null for non-hex inputs (rgba strings, gradients) so callers
 * can fail soft to the static brand value in tokens.css.
 */
const hexToRgbTriplet = (hex: string | undefined): string | null => {
  if (!hex) return null;
  const rgb = parseHexColor(hex);
  return rgb ? `${rgb[0]}, ${rgb[1]}, ${rgb[2]}` : null;
};

/**
 * Brand-token RGB bridge (theme-changer compatibility).
 * tokens.css derives --wing-purple, --midnight-sapphire, every solid brand
 * token AND their alpha variants from these --*-rgb triplets. Overriding the
 * triplets per theme re-themes the whole brand-token family at once, so
 * surfaces written against brand names (checkout, cart, dashboards) follow
 * the theme changer instead of staying pinned to static Crystalline values.
 * Non-hex theme fields emit nothing â†’ static tokens.css value stays (fail-soft).
 */
const generateBrandRgbBridge = (theme: CrystallineTheme): string => {
  const mappings: Array<[string, string | undefined]> = [
    ['--midnight-sapphire-rgb', theme.background.secondary],
    ['--royal-depth-rgb', theme.colors.secondaryDeep],
    ['--swan-lavender-rgb', theme.colors.secondary],
    ['--ice-wing-rgb', theme.colors.primary],
    ['--ice-wing-text-rgb', theme.colors.primaryLight],
    ['--arctic-cyan-rgb', theme.colors.primaryBlue],
    ['--wing-purple-rgb', (theme.colors as { wingPurple?: string }).wingPurple ?? theme.colors.secondary],
    ['--gilded-fern-rgb', theme.colors.accent],
    ['--frost-white-rgb', theme.text.primary],
  ];

  return mappings
    .map(([name, value]) => {
      const triplet = hexToRgbTriplet(value);
      return triplet ? `${name}: ${triplet};` : '';
    })
    .filter(Boolean)
    .join('\n    ');
};
// === CSS CUSTOM PROPERTIES GENERATION ===

/**
 * Generates CSS custom properties for a given theme
 * This enables instant theme switching via CSS variables
 */
export const generateCSSVariables = (
  themeId: ThemeId,
  themes: Readonly<Record<ThemeId, CrystallineTheme>>,
): string => {
  const theme = themes[themeId] || themes['crystalline-default'];
  const buttonPrimaryBg = theme.colors.primary;
  const buttonPrimaryText = getReadableAccentText(buttonPrimaryBg);
  const buttonSecondaryText = getReadableAccentText(theme.colors.secondary);
  const commandPrimary = theme.colors.primary;
  const commandPrimaryDeep = theme.colors.primaryDeep || theme.colors.primary;
  const appCanvas = '#0A0A0F';
  const commandPrimaryLight = theme.colors.primaryLight || theme.colors.primary;
  const commandSecondary = theme.colors.secondary;
  const actionPrimary = theme.colors.primary;
  const actionSecondary = theme.colors.secondary;
  const counterAccent = theme.colors.accent;
  const dataAccent = theme.colors.primaryBlue || theme.colors.primaryLight || theme.colors.primary;
  const surfaceTint = theme.colors.secondaryDeep || theme.background.secondary;
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

    --app-canvas: ${appCanvas};
    /* === SEMANTIC VARIABLES (Social Master Strategy Â§3.1) === */
    --bg-base: ${theme.background.primary};
    /* === CONTRAST ROLE SYSTEM === */
    --action-primary: ${actionPrimary};
    --action-secondary: ${actionSecondary};
    --counter-accent: ${counterAccent};
    --data-accent: ${dataAccent};
    --surface-tint: ${surfaceTint};

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
    --info: ${dataAccent};

    /* === DASHBOARD VARIABLE BRIDGE (AI Village consensus 2026-03-22) === */
    /* These variables unify all 3 dashboards with the 14-theme changer */
    --brand-primary: ${theme.colors.primaryDeep || theme.colors.primary};
    --brand-secondary: ${theme.colors.secondaryDeep || theme.colors.secondary};
    --brand-tertiary: ${theme.colors.secondary};
    --accent-cyan: ${dataAccent};
    --accent-purple: ${theme.colors.secondary};
    --data-cyan: ${dataAccent};
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
    --accent-glow: ${actionSecondary};
    --primary: ${theme.colors.primaryDeep || theme.colors.primary};
    --tertiary: ${theme.colors.secondary};
    --arctic-cyan: ${dataAccent};
    --cyan-glow: ${dataAccent};

    /* === UNIVERSAL MASTER SCHEDULE SESSION DETAIL === */
    --schedule-command-panel-bg: linear-gradient(135deg, color-mix(in srgb, ${theme.background.elevated} 84%, ${commandPrimary} 16%), color-mix(in srgb, ${theme.background.surface} 86%, ${commandSecondary} 10%));
    --schedule-command-panel-border: color-mix(in srgb, ${commandPrimary} 24%, transparent);
    --schedule-command-panel-inset: color-mix(in srgb, ${commandPrimaryLight} 10%, transparent);
    --schedule-command-panel-shadow: color-mix(in srgb, ${commandPrimaryDeep} 24%, transparent);
    --schedule-command-card-bg: color-mix(in srgb, ${theme.background.primary} 70%, ${theme.background.elevated} 30%);
    --schedule-command-card-border: color-mix(in srgb, ${commandPrimary} 16%, transparent);
    --schedule-command-risk-high-border: color-mix(in srgb, ${theme.colors.warning} 50%, transparent);
    --schedule-command-risk-high-bg: color-mix(in srgb, ${theme.colors.warning} 16%, transparent);
    --schedule-command-risk-medium-border: color-mix(in srgb, ${commandPrimary} 45%, transparent);
    --schedule-command-risk-medium-bg: color-mix(in srgb, ${commandPrimary} 14%, transparent);
    --schedule-command-risk-low-border: color-mix(in srgb, ${commandSecondary} 45%, transparent);
    --schedule-command-risk-low-bg: color-mix(in srgb, ${commandSecondary} 14%, transparent);
    --schedule-command-attention-bg: color-mix(in srgb, ${theme.colors.warning} 12%, transparent);
    --schedule-command-attention-border: color-mix(in srgb, ${theme.colors.warning} 28%, transparent);
    --schedule-command-proposal-bg: color-mix(in srgb, ${commandSecondary} 10%, transparent);
    --schedule-command-proposal-border: color-mix(in srgb, ${commandSecondary} 28%, transparent);
    --schedule-command-action-border: color-mix(in srgb, ${commandSecondary} 55%, transparent);
    --schedule-command-action-bg: linear-gradient(135deg, ${commandPrimaryDeep}, ${commandSecondary});
    --schedule-command-action-glow: color-mix(in srgb, ${commandSecondary} 22%, transparent);
    --schedule-command-action-border-hover: color-mix(in srgb, ${commandPrimary} 72%, transparent);
    --schedule-series-bg: color-mix(in srgb, ${commandPrimary} 12%, transparent);
    --schedule-series-border: color-mix(in srgb, ${commandPrimary} 35%, transparent);
    --schedule-notification-bg: color-mix(in srgb, ${commandPrimary} 10%, transparent);
    --schedule-notification-border: color-mix(in srgb, ${commandPrimary} 30%, transparent);
    --schedule-notification-accent: ${commandPrimary};

    /* === BRAND-TOKEN RGB BRIDGE (theme-changer compat, 2026-07-03) === */
    /* Re-points the tokens.css --*-rgb roots at the active theme so the
       whole brand-token family (solids + alpha variants) follows the theme. */
    ${generateBrandRgbBridge(theme)}

    /* === PREVIOUSLY-UNDEFINED SEMANTIC ALIASES (theme-changer compat) === */
    /* These names are consumed across mounted surfaces but were never
       injected anywhere â€” they always rendered their static fallbacks.
       Mapping them here makes those surfaces theme-responsive. */
    --error: ${theme.colors.error};
    --error-accent: ${theme.colors.error};
    --danger-text: ${theme.colors.error};
    --status-danger: ${theme.colors.error};
    --status-error: ${theme.colors.error};
    --status-success: ${theme.colors.success};
    --status-warning: ${theme.colors.warning};
    --feedback-success: ${theme.colors.success};
    --feedback-warning: ${theme.colors.warning};
    --feedback-danger: ${theme.colors.error};
    --surface-base: ${theme.background.primary};
    --surface-dark: ${theme.background.secondary};
    --surface-muted: ${theme.background.surface};
    --card-bg: ${theme.background.elevated};
    --input-bg: ${theme.background.surface};
    --accent-tertiary: ${theme.colors.secondaryLight || theme.colors.secondary};
    --glow-accent: ${(theme.colors as { wingPurple?: string }).wingPurple ?? theme.colors.secondary};
    --focus-ring: ${actionSecondary};
    --primary-cyan: ${dataAccent};
    --chart-primary: ${dataAccent};
    --border-accent: color-mix(in srgb, ${theme.colors.primary} 40%, transparent);
    --border-accent-soft: color-mix(in srgb, ${theme.colors.primary} 18%, transparent);
    --glass-bg: color-mix(in srgb, ${theme.background.secondary} 55%, transparent);
    --glass-border: color-mix(in srgb, ${theme.colors.primary} 16%, transparent);
    --shadow-strong: ${theme.shadows.elevation};
    --achievement-text: ${theme.text.primary};
    --achievement-accent: ${theme.colors.accent};
    --achievement-border: color-mix(in srgb, ${theme.colors.accent} 35%, transparent);
  `;
};

/**
 * Injects CSS custom properties into the document
 * Call this when theme changes to update all CSS variables
 */
export const injectThemeVariables = (
  themeId: ThemeId,
  themes: Readonly<Record<ThemeId, CrystallineTheme>>,
): void => {
  const cssVariables = generateCSSVariables(themeId, themes);

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
