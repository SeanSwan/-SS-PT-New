/**
 * UniversalThemePremiumThemes.ts
 * =============================
 *
 * Ten premium dark-first colorways for the universal SwanStudios theme changer.
 * The schema mirrors UniversalThemeContext themes so every dashboard can consume
 * the same CSS variable bridge without per-surface palette branches.
 */

import { NEW_COLORWAY_SPECS } from './newColorwaySpecs';

const fonts = {
  heading: '"Plus Jakarta Sans", "Sora", sans-serif',
  drama: '"Cormorant Garamond", Georgia, serif',
  data: '"Fira Code", "Cascadia Code", monospace',
  ui: '"Sora", "Plus Jakarta Sans", sans-serif',
};

/**
 * Colorway family — the curated-tray grouping used by the Swan Lens Color tab.
 * (Kimi round 2/3 — "curate the tray; archive the rest".) Absent = 'heritage'.
 */
export type ColorwayFamily =
  | 'apex-darks'
  | 'jewel-gradients'
  | 'frost-glass'
  | 'heritage'
  | 'archive';

/** Visual character of a colorway — drives the specimen swatch treatment. */
export type ColorwayVariety = 'gradient-forward' | 'clean-flat' | 'light-glass';

type PremiumThemeSpec = {
  id: string;
  name: string;
  bg: string;
  bg2: string;
  surface: string;
  elevated: string;
  primary: string;
  primaryBlue: string;
  primaryDeep: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  secondaryDeep: string;
  accent: string;
  accentLight: string;
  accentWarm: string;
  text: string;
  textSecondary: string;
  muted: string;
  danger?: string;
  success?: string;
  warning?: string;

  // ── Depth + interaction token layer (Kimi round-3 SEND-BACK fix) ──────────────
  // ALL optional and backward-compatible: when absent, makePremiumTheme() derives
  // the same values it always has, so the existing 38 colorways are byte-unchanged.
  // When present, they let a colorway be genuinely gradient-forward / glassy /
  // glowing (Sean's "some with gradients, some flat, some light-glass") without a
  // downstream hardcoded hex (house-rule #6).

  /** Curated-tray family. Absent → 'heritage'. */
  family?: ColorwayFamily;
  /** Visual character. Absent → 'clean-flat'. */
  variety?: ColorwayVariety;

  /** Signature gradient endpoints. Absent → derived from primaryDeep→primary. */
  gradientFrom?: string;
  gradientTo?: string;
  /** Signature gradient angle in deg. Absent → 135. */
  gradientAngle?: number;

  /** Glass surface tuning (variety: 'light-glass'). Absent → no glass, flat surface. */
  glassBlur?: number;     // px, capped at 12 by the consumer
  glassOpacity?: number;  // 0..1 opacity of the frosted surface fill

  /** Dual-Button Glow per-theme (blue bg→purple glow, purple bg→cyan glow).
   *  Absent → derived from secondary / accent, matching legacy behavior. */
  glowPrimary?: string;
  glowSecondary?: string;

  /** Focus ring color. Absent → derived from primary. */
  focusRing?: string;
  /** Hairline divider (family separators / card edges). Absent → alpha(primary,0.12). */
  borderSubtle?: string;

  /** Label color on a `primary`-filled control (Kimi R4 — the most-viewed contrast
   *  pair; must hit ≥4.5 vs `primary`). Absent → derived (white/near-black by primary
   *  luminance). */
  onPrimary?: string;
  /** Label color on an `accent`-filled control. Absent → derived by accent luminance. */
  onAccent?: string;

  /** Categorical chart series (Victory). Absent → [primary, accent, secondaryLight]. */
  chart1?: string;
  chart2?: string;
  chart3?: string;
};

const alpha = (hex: string, amount: number) => {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${amount})`;
};

/**
 * Semantic role bindings (Kimi R4 — data with roles is a system, not a paint aisle):
 *  - glowPrimary   → glow on `primary`-filled interactive controls (must be in-family).
 *  - glowSecondary → glow on `secondary`/`primaryBlue`-filled controls (in-family).
 *  - gradientFrom/To/Angle → the ONE signature surface only (primary CTA fill / hero
 *    sheen), never every surface.
 *  - borderSubtle  → hairline separators + glass rims, never decorative boxes.
 *  - onPrimary/onAccent → label color on primary/accent-filled controls (≥4.5 contrast).
 * Consumers must honor these roles; the specimen swatch + button tone read from them.
 */

/** Pick black/white label for a fill by WCAG relative luminance (>0.5 → dark text). */
const onColorFor = (hex: string): string => {
  const n = hex.replace('#', '');
  if (n.length !== 6) return '#FFFFFF';
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(parseInt(n.slice(0, 2), 16));
  const g = lin(parseInt(n.slice(2, 4), 16));
  const b = lin(parseInt(n.slice(4, 6), 16));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.45 ? '#0A0A0F' : '#FFFFFF';
};

const makePremiumTheme = (spec: PremiumThemeSpec) => {
  // Depth/interaction tokens: use the explicit field when present, else derive the
  // legacy value so every pre-existing colorway renders exactly as before.
  const gradientAngle = spec.gradientAngle ?? 135;
  const gradientFrom = spec.gradientFrom ?? spec.primaryDeep;
  const gradientTo = spec.gradientTo ?? spec.primary;
  const glowPrimary = spec.glowPrimary ?? alpha(spec.secondary, 0.48);
  const glowSecondary = spec.glowSecondary ?? alpha(spec.accent, 0.28);
  const focusRing = spec.focusRing ?? spec.primary;
  const borderSubtle = spec.borderSubtle ?? alpha(spec.primary, 0.12);
  const onPrimary = spec.onPrimary ?? onColorFor(spec.primary);
  const onAccent = spec.onAccent ?? onColorFor(spec.accent);
  const chartSeries = [
    spec.chart1 ?? spec.primary,
    spec.chart2 ?? spec.accent,
    spec.chart3 ?? spec.secondaryLight,
  ];

  return {
  id: spec.id,
  name: spec.name,
  family: spec.family ?? ('heritage' as ColorwayFamily),
  variety: spec.variety ?? ('clean-flat' as ColorwayVariety),
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'subtle' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
    glassBlur: spec.glassBlur ?? 0,
    glassOpacity: spec.glassOpacity ?? 1,
  },
  colors: {
    deepSpace: spec.bg,
    stardust: spec.bg2,
    void: '#030407',
    primary: spec.primary,
    primaryBlue: spec.primaryBlue,
    primaryDeep: spec.primaryDeep,
    primaryLight: spec.primaryLight,
    primaryNeon: spec.primary,
    secondary: spec.secondary,
    secondaryLight: spec.secondaryLight,
    secondaryDeep: spec.secondaryDeep,
    accent: spec.accent,
    accentLight: spec.accentLight,
    accentWarm: spec.accentWarm,
    wingPurple: spec.secondary,
    wingPurpleLight: spec.secondaryLight,
    wingPurpleDeep: spec.secondaryDeep,
    white: spec.text,
    silver: spec.textSecondary,
    muted: spec.muted,
    error: spec.danger || '#FB7185',
    success: spec.success || '#4ADE80',
    warning: spec.warning || '#FBBF24',
  },
  gradients: {
    primary: `linear-gradient(135deg, ${spec.primaryDeep}, ${spec.primary})`,
    secondary: `linear-gradient(135deg, ${spec.bg2}, ${spec.secondary})`,
    cosmic: `linear-gradient(135deg, ${spec.secondary}, ${spec.primary})`,
    hero: `radial-gradient(ellipse at 18% 24%, ${alpha(spec.primary, 0.18)} 0%, transparent 48%), radial-gradient(ellipse at 86% 72%, ${alpha(spec.accent, 0.14)} 0%, transparent 50%), radial-gradient(ellipse at center, ${spec.bg2} 0%, ${spec.bg} 72%)`,
    card: `linear-gradient(135deg, ${alpha(spec.primaryDeep, 0.28)}, ${alpha(spec.primary, 0.08)})`,
    accent: `linear-gradient(135deg, ${spec.bg}, ${spec.accent})`,
    stellar: `linear-gradient(45deg, ${spec.primary} 0%, ${spec.accent} 100%)`,
    swanCosmic: `linear-gradient(135deg, ${spec.primary}, ${spec.secondary})`,
    glass: `linear-gradient(135deg, ${alpha(spec.primaryDeep, 0.22)}, ${alpha(spec.primary, 0.08)})`,
    // Signature gradient — the one deliberate colorway gradient (family: jewel-gradients).
    signature: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`,
  },
  shadows: {
    primary: `0 0 24px ${alpha(spec.primary, 0.24)}`,
    secondary: `0 0 22px ${alpha(spec.secondary, 0.22)}`,
    cosmic: `0 18px 48px rgba(0, 0, 0, 0.58), 0 0 52px ${alpha(spec.primary, 0.12)}`,
    accent: `0 0 20px ${alpha(spec.accent, 0.28)}`,
    elevation: '0 18px 42px rgba(0, 0, 0, 0.56)',
    glow: '0 0 20px currentColor',
    glass: `0 10px 34px ${alpha(spec.bg, 0.54)}`,
    button: `0 8px 24px ${alpha(spec.primary, 0.22)}`,
    // Dual-Button Glow tokens (blue bg→purple glow, purple bg→cyan glow).
    glowPrimary: `0 0 22px ${glowPrimary}`,
    glowSecondary: `0 0 22px ${glowSecondary}`,
  },
  borders: {
    subtle: borderSubtle,
    elegant: alpha(spec.primary, 0.18),
    prominent: alpha(spec.primary, 0.34),
    glass: `1px solid ${alpha(spec.primary, 0.14)}`,
    card: `1px solid ${alpha(spec.primary, 0.12)}`,
    focus: `2px solid ${focusRing}`,
    glow: `1px solid ${alpha(spec.secondary, 0.2)}`,
  },
  chart: chartSeries,
  background: {
    primary: spec.bg,
    secondary: spec.bg2,
    surface: spec.surface,
    elevated: spec.elevated,
  },
  text: {
    primary: spec.text,
    secondary: spec.textSecondary,
    muted: spec.muted,
    heading: spec.text,
    subheading: spec.textSecondary,
    body: spec.textSecondary,
    label: spec.muted,
    accent: spec.primary,
    onPrimary,
    onAccent,
  },
  };
};

export const premiumThemeAdditions = {
  'ruby-forge': makePremiumTheme({
    id: 'ruby-forge', name: 'Ruby Forge', bg: '#10070A', bg2: '#1C0B10', surface: 'rgba(38, 12, 20, 0.82)', elevated: '#32111B',
    primary: '#FB7185', primaryBlue: '#F43F5E', primaryDeep: '#9F1239', primaryLight: '#FDA4AF',
    secondary: '#BE123C', secondaryLight: '#FB7185', secondaryDeep: '#7F1D1D', accent: '#FBBF24', accentLight: '#FDE68A', accentWarm: '#D97706',
    text: '#FFF1F3', textSecondary: 'rgba(255, 241, 243, 0.84)', muted: 'rgba(255, 241, 243, 0.62)',
  }),
  'emerald-vault': makePremiumTheme({
    id: 'emerald-vault', name: 'Emerald Vault', bg: '#04110D', bg2: '#08231B', surface: 'rgba(9, 45, 34, 0.78)', elevated: '#0B3A2B',
    primary: '#34D399', primaryBlue: '#10B981', primaryDeep: '#047857', primaryLight: '#A7F3D0',
    secondary: '#065F46', secondaryLight: '#34D399', secondaryDeep: '#064E3B', accent: '#D6B85A', accentLight: '#F3D675', accentWarm: '#B8942F',
    text: '#ECFDF5', textSecondary: 'rgba(236, 253, 245, 0.84)', muted: 'rgba(236, 253, 245, 0.62)',
  }),
  'solar-gold': makePremiumTheme({
    id: 'solar-gold', name: 'Solar Gold', bg: '#120C05', bg2: '#221408', surface: 'rgba(54, 32, 10, 0.8)', elevated: '#3A240D',
    primary: '#F6C453', primaryBlue: '#F59E0B', primaryDeep: '#B45309', primaryLight: '#FDE68A',
    secondary: '#9A3412', secondaryLight: '#FB923C', secondaryDeep: '#7C2D12', accent: '#F97316', accentLight: '#FDBA74', accentWarm: '#C2410C',
    text: '#FFF7ED', textSecondary: 'rgba(255, 247, 237, 0.84)', muted: 'rgba(255, 247, 237, 0.62)',
  }),
  'amethyst-night': makePremiumTheme({
    id: 'amethyst-night', name: 'Amethyst Night', bg: '#100A1F', bg2: '#1D1233', surface: 'rgba(38, 24, 68, 0.78)', elevated: '#2B1A4D',
    primary: '#C084FC', primaryBlue: '#A855F7', primaryDeep: '#7C3AED', primaryLight: '#E9D5FF',
    secondary: '#67E8F9', secondaryLight: '#A5F3FC', secondaryDeep: '#0E7490', accent: '#F0ABFC', accentLight: '#F5D0FE', accentWarm: '#D946EF',
    text: '#F7F0FF', textSecondary: 'rgba(247, 240, 255, 0.84)', muted: 'rgba(247, 240, 255, 0.62)',
  }),
  'rose-quartz': makePremiumTheme({
    id: 'rose-quartz', name: 'Rose Quartz', bg: '#160A12', bg2: '#26101F', surface: 'rgba(56, 20, 44, 0.78)', elevated: '#3A1830',
    primary: '#FB7185', primaryBlue: '#F472B6', primaryDeep: '#BE185D', primaryLight: '#FBCFE8',
    secondary: '#A21CAF', secondaryLight: '#F0ABFC', secondaryDeep: '#701A75', accent: '#F9A8D4', accentLight: '#FCE7F3', accentWarm: '#DB2777',
    text: '#FFF1F7', textSecondary: 'rgba(255, 241, 247, 0.84)', muted: 'rgba(255, 241, 247, 0.62)',
  }),
  'copper-patina': makePremiumTheme({
    id: 'copper-patina', name: 'Copper Patina', bg: '#120B06', bg2: '#24150C', surface: 'rgba(50, 31, 17, 0.8)', elevated: '#392313',
    primary: '#D97706', primaryBlue: '#F59E0B', primaryDeep: '#92400E', primaryLight: '#FCD34D',
    secondary: '#0F766E', secondaryLight: '#5EEAD4', secondaryDeep: '#134E4A', accent: '#34D399', accentLight: '#99F6E4', accentWarm: '#B45309',
    text: '#FFF7ED', textSecondary: 'rgba(255, 247, 237, 0.84)', muted: 'rgba(255, 247, 237, 0.62)',
  }),
  'aqua-abyss': makePremiumTheme({
    id: 'aqua-abyss', name: 'Aqua Abyss', bg: '#031018', bg2: '#082334', surface: 'rgba(8, 45, 66, 0.78)', elevated: '#0B3B56',
    primary: '#22D3EE', primaryBlue: '#06B6D4', primaryDeep: '#0E7490', primaryLight: '#A5F3FC',
    secondary: '#2563EB', secondaryLight: '#93C5FD', secondaryDeep: '#1E3A8A', accent: '#A3E635', accentLight: '#D9F99D', accentWarm: '#65A30D',
    text: '#ECFEFF', textSecondary: 'rgba(236, 254, 255, 0.84)', muted: 'rgba(236, 254, 255, 0.62)',
  }),
  'graphite-luxe': makePremiumTheme({
    id: 'graphite-luxe', name: 'Graphite Luxe', bg: '#09090B', bg2: '#121318', surface: 'rgba(28, 30, 36, 0.84)', elevated: '#20232A',
    primary: '#D1D5DB', primaryBlue: '#9CA3AF', primaryDeep: '#4B5563', primaryLight: '#F3F4F6',
    secondary: '#6B7280', secondaryLight: '#D1D5DB', secondaryDeep: '#374151', accent: '#C6A84B', accentLight: '#E5CF7A', accentWarm: '#A4872F',
    text: '#F9FAFB', textSecondary: 'rgba(249, 250, 251, 0.82)', muted: 'rgba(209, 213, 219, 0.62)',
  }),
  'pearl-noir': makePremiumTheme({
    id: 'pearl-noir', name: 'Pearl Noir', bg: '#070608', bg2: '#171218', surface: 'rgba(35, 28, 37, 0.82)', elevated: '#2A222D',
    primary: '#F5E7D3', primaryBlue: '#E7D4BA', primaryDeep: '#8B735C', primaryLight: '#FFF7ED',
    secondary: '#A78BFA', secondaryLight: '#DDD6FE', secondaryDeep: '#6D28D9', accent: '#EAB308', accentLight: '#FDE68A', accentWarm: '#A16207',
    text: '#FFF8F0', textSecondary: 'rgba(255, 248, 240, 0.84)', muted: 'rgba(245, 231, 211, 0.62)',
  }),
  'circuit-lime': makePremiumTheme({
    id: 'circuit-lime', name: 'Circuit Lime', bg: '#071104', bg2: '#102008', surface: 'rgba(25, 50, 12, 0.78)', elevated: '#1D340D',
    primary: '#A3E635', primaryBlue: '#84CC16', primaryDeep: '#4D7C0F', primaryLight: '#D9F99D',
    secondary: '#22C55E', secondaryLight: '#86EFAC', secondaryDeep: '#166534', accent: '#38BDF8', accentLight: '#BAE6FD', accentWarm: '#0284C7',
    text: '#F7FEE7', textSecondary: 'rgba(247, 254, 231, 0.84)', muted: 'rgba(247, 254, 231, 0.62)',
  }),

  /* === 2026-07-03 identity wave — ten more colorways, each committed to a
     single strong mood: blossom, ultraviolet, dusk, steel, vaporwave, wine,
     grid-neon, orchid, jade, and tropic gold. Dark-first per THEME-CHANGER-COMPAT. === */
  'sakura-midnight': makePremiumTheme({
    id: 'sakura-midnight', name: 'Sakura Midnight', bg: '#140812', bg2: '#241020', surface: 'rgba(52, 22, 46, 0.78)', elevated: '#3A1B33',
    primary: '#F9A8C7', primaryBlue: '#F472B6', primaryDeep: '#9D2463', primaryLight: '#FCE0EC',
    secondary: '#B786C9', secondaryLight: '#E3C5EE', secondaryDeep: '#6B3A7E', accent: '#E8E3EA', accentLight: '#F8F5F9', accentWarm: '#C4A8CE',
    text: '#FFF2F8', textSecondary: 'rgba(255, 242, 248, 0.84)', muted: 'rgba(255, 242, 248, 0.62)',
  }),
  'indigo-pulse': makePremiumTheme({
    id: 'indigo-pulse', name: 'Indigo Pulse', bg: '#0A0A1E', bg2: '#131238', surface: 'rgba(28, 26, 82, 0.78)', elevated: '#232059',
    primary: '#818CF8', primaryBlue: '#6366F1', primaryDeep: '#4338CA', primaryLight: '#C7D2FE',
    secondary: '#A78BFA', secondaryLight: '#DDD6FE', secondaryDeep: '#5B21B6', accent: '#38BDF8', accentLight: '#BAE6FD', accentWarm: '#0369A1',
    text: '#EEF2FF', textSecondary: 'rgba(238, 242, 255, 0.84)', muted: 'rgba(238, 242, 255, 0.62)',
  }),
  'sunset-mirage': makePremiumTheme({
    id: 'sunset-mirage', name: 'Sunset Mirage', bg: '#160B08', bg2: '#2A130C', surface: 'rgba(64, 26, 16, 0.78)', elevated: '#421E12',
    primary: '#FB923C', primaryBlue: '#F97316', primaryDeep: '#C2410C', primaryLight: '#FED7AA',
    secondary: '#E879A9', secondaryLight: '#F9C2D9', secondaryDeep: '#9D2463', accent: '#FBBF24', accentLight: '#FDE68A', accentWarm: '#B45309',
    text: '#FFF4EC', textSecondary: 'rgba(255, 244, 236, 0.84)', muted: 'rgba(255, 244, 236, 0.62)',
  }),
  'steel-tempest': makePremiumTheme({
    id: 'steel-tempest', name: 'Steel Tempest', bg: '#0B0E12', bg2: '#151B23', surface: 'rgba(32, 42, 54, 0.8)', elevated: '#232E3C',
    primary: '#7DA7C7', primaryBlue: '#5B8AAE', primaryDeep: '#39586F', primaryLight: '#B8D2E4',
    secondary: '#8B9BAB', secondaryLight: '#C4CFD9', secondaryDeep: '#4A5866', accent: '#D6DEE6', accentLight: '#F0F4F7', accentWarm: '#93A6B5',
    text: '#F2F6F9', textSecondary: 'rgba(242, 246, 249, 0.84)', muted: 'rgba(242, 246, 249, 0.62)',
  }),
  'vapor-dream': makePremiumTheme({
    id: 'vapor-dream', name: 'Vapor Dream', bg: '#120919', bg2: '#20112D', surface: 'rgba(46, 24, 64, 0.78)', elevated: '#331D47',
    primary: '#F0ABFC', primaryBlue: '#E879F9', primaryDeep: '#A21CAF', primaryLight: '#FAE0FE',
    secondary: '#67E8F9', secondaryLight: '#BAF5FD', secondaryDeep: '#0E7490', accent: '#FDA4AF', accentLight: '#FECDD3', accentWarm: '#E11D48',
    text: '#FDF4FF', textSecondary: 'rgba(253, 244, 255, 0.84)', muted: 'rgba(253, 244, 255, 0.62)',
  }),
  'burgundy-noir': makePremiumTheme({
    id: 'burgundy-noir', name: 'Burgundy Noir', bg: '#120608', bg2: '#220B10', surface: 'rgba(52, 16, 24, 0.8)', elevated: '#3C1420',
    primary: '#C2637A', primaryBlue: '#A8455E', primaryDeep: '#6E2438', primaryLight: '#E5AFBE',
    secondary: '#D4A56E', secondaryLight: '#EBCDA5', secondaryDeep: '#8A6134', accent: '#E8C39A', accentLight: '#F5E0C8', accentWarm: '#B07D45',
    text: '#FBF0F2', textSecondary: 'rgba(251, 240, 242, 0.84)', muted: 'rgba(251, 240, 242, 0.62)',
  }),
  'tron-grid': makePremiumTheme({
    id: 'tron-grid', name: 'Tron Grid', bg: '#04070C', bg2: '#081120', surface: 'rgba(10, 26, 46, 0.8)', elevated: '#0C1F38',
    primary: '#5CE1FF', primaryBlue: '#22C8F0', primaryDeep: '#0E7490', primaryLight: '#BDF1FF',
    secondary: '#3B82F6', secondaryLight: '#93C5FD', secondaryDeep: '#1D4ED8', accent: '#F8FAFC', accentLight: '#FFFFFF', accentWarm: '#94A3B8',
    text: '#EDFBFF', textSecondary: 'rgba(237, 251, 255, 0.84)', muted: 'rgba(237, 251, 255, 0.62)',
  }),
  'orchid-veil': makePremiumTheme({
    id: 'orchid-veil', name: 'Orchid Veil', bg: '#100714', bg2: '#1E0F26', surface: 'rgba(44, 22, 58, 0.78)', elevated: '#331C42',
    primary: '#D8A7E8', primaryBlue: '#C77DDE', primaryDeep: '#8E44AD', primaryLight: '#EDD3F5',
    secondary: '#9D8CD8', secondaryLight: '#CDC4EC', secondaryDeep: '#5B4A9E', accent: '#F5D8C0', accentLight: '#FBECDF', accentWarm: '#D8A374',
    text: '#FAF2FD', textSecondary: 'rgba(250, 242, 253, 0.84)', muted: 'rgba(250, 242, 253, 0.62)',
  }),
  'deep-jade': makePremiumTheme({
    id: 'deep-jade', name: 'Deep Jade', bg: '#051009', bg2: '#0A2013', surface: 'rgba(14, 44, 27, 0.78)', elevated: '#11361F',
    primary: '#4FD1A1', primaryBlue: '#2EB584', primaryDeep: '#177452', primaryLight: '#A8EBD1',
    secondary: '#8FD6B8', secondaryLight: '#C9EEDD', secondaryDeep: '#3D8A67', accent: '#E9E3C8', accentLight: '#F7F4E5', accentWarm: '#BBAE7A',
    text: '#EFFCF5', textSecondary: 'rgba(239, 252, 245, 0.84)', muted: 'rgba(239, 252, 245, 0.62)',
  }),
  'midnight-mango': makePremiumTheme({
    id: 'midnight-mango', name: 'Midnight Mango', bg: '#130D05', bg2: '#251A09', surface: 'rgba(56, 39, 13, 0.78)', elevated: '#3D2C10',
    primary: '#FFC94D', primaryBlue: '#F5A623', primaryDeep: '#B27310', primaryLight: '#FFE4A3',
    secondary: '#FF8B67', secondaryLight: '#FFC3B0', secondaryDeep: '#C2410C', accent: '#7FE0C3', accentLight: '#C2F2E3', accentWarm: '#2E9E7E',
    text: '#FFF9EC', textSecondary: 'rgba(255, 249, 236, 0.84)', muted: 'rgba(255, 249, 236, 0.62)',
  }),

  /* === 2026-07-22 finishing pass — FOUR curated, code-verified colorways (Kimi's
     "fewer/deeper" steer). Each clears the ΔE≥7 distinctness gate against all 22 kept
     colorways + is non-cyan + passes the full WCAG contrast matrix — proven by
     newColorwaySpecs.audit.test.ts. Authored FROM NEW_COLORWAY_SPECS (single source of
     truth) so the picker and the audit test never drift. === */
  'crimson-vault': makePremiumTheme(NEW_COLORWAY_SPECS[0]),
  'verdant-signal': makePremiumTheme(NEW_COLORWAY_SPECS[1]),
  'indigo-rite': makePremiumTheme(NEW_COLORWAY_SPECS[2]),
  'violet-ember': makePremiumTheme(NEW_COLORWAY_SPECS[3]),
} as const;
