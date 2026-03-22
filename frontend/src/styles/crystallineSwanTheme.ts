/**
 * Crystalline Swan Theme — Centralized Token System
 * ==================================================
 * Single source of truth for the Enchanted Apex: Crystalline Swan palette.
 * Import this instead of defining local CS objects in each component.
 *
 * Usage:
 *   import { CS } from '../../styles/crystallineSwanTheme';
 *   background: ${CS.glassBg};
 *   color: rgba(${CS.rgbWingPurple}, 0.4);
 */

export const CS = {
  // ── Core Palette ──
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  wingPurple: '#8B5CF6',
  abyssalNavy: '#001840',

  // ── RGB values for dynamic alpha transparency ──
  rgbMidnightSapphire: '0, 32, 96',
  rgbRoyalDepth: '0, 48, 128',
  rgbWingPurple: '139, 92, 246',
  rgbIceWing: '96, 192, 240',
  rgbArcticCyan: '80, 160, 240',
  rgbFrostWhite: '224, 236, 244',
  rgbGildedFern: '198, 168, 75',

  // ── Surfaces ──
  glassBg: 'rgba(0, 32, 96, 0.92)',
  headerBg: 'rgba(0, 32, 96, 0.85)',
  inputBg: 'rgba(0, 24, 64, 0.8)',

  // ── Text (WCAG AA compliant on dark surfaces) ──
  textPrimary: '#E0ECF4',
  textSecondary: 'rgba(224, 236, 244, 0.85)',
  textMuted: 'rgba(224, 236, 244, 0.65)',
  textDisabled: 'rgba(224, 236, 244, 0.4)',

  // ── Borders ──
  borderSubtle: 'rgba(139, 92, 246, 0.2)',
  borderActive: 'rgba(139, 92, 246, 0.5)',
  borderGlass: 'rgba(96, 192, 240, 0.12)',

  // ── Semantic ──
  errorBg: 'rgba(153, 27, 27, 0.3)',
  errorBorder: 'rgba(248, 113, 113, 0.35)',
  errorText: '#fca5a5',

  // ── Interactive ──
  hoverBg: 'rgba(139, 92, 246, 0.12)',
  activePillBg: 'rgba(139, 92, 246, 0.2)',
  userBubbleBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(96, 192, 240, 0.08))',
  assistantBubbleBg: 'rgba(0, 32, 96, 0.5)',
  // ── Obsidian Black Variant Tokens ──
  obsidianBlack: '#0A0A0F',
  carbon: '#141419',
  graphite: '#1A1A24',
  rgbObsidianBlack: '10, 10, 15',
  rgbCarbon: '20, 20, 25',
  rgbGraphite: '26, 26, 36',
} as const;

// ── Typography ──
export const FONTS = {
  heading: "'Plus Jakarta Sans', sans-serif",
  drama: "'Cormorant Garamond', serif",
  data: "'Fira Code', monospace",
  ui: "'Sora', sans-serif",
} as const;

export type CrystallineSwanTheme = typeof CS;
