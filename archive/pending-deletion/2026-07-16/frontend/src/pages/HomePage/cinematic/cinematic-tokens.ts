/**
 * cinematic-tokens.ts — Design tokens for Preset F (Enchanted Apex) and F-Alt (Crystalline Swan).
 *
 * Each variant receives a CinematicTokens object that controls palette, typography,
 * surface styles, and motion intensity. Section components are parameterized by these
 * tokens so the same structure renders differently per variant.
 */

// ─── Token Types ─────────────────────────────────────────────────────

export type MotionIntensity = 'high' | 'medium-high' | 'low';

export interface CinematicPalette {
  /** Deep background (hero, section bgs) */
  bg: string;
  /** Elevated surface (cards, panels) */
  surface: string;
  /** Luxury/gold accent */
  accent: string;
  /** Gaming/action accent */
  gaming: string;
  /** Secondary accent */
  secondary: string;
  /** Tertiary */
  tertiary: string;
  /** Primary text on dark bg */
  textPrimary: string;
  /** Secondary/muted text */
  textSecondary: string;
  /** Text on accent surfaces */
  textOnAccent: string;
  /** Border/divider */
  border: string;
  /** Glassmorphism backdrop */
  glass: string;
  /** Glassmorphism border */
  glassBorder: string;
}

export interface CinematicTypography {
  /** Headings: Plus Jakarta Sans */
  headingFamily: string;
  /** Drama/italic accents: Cormorant Garamond */
  dramaFamily: string;
  /** Body text: Source Sans 3 */
  bodyFamily: string;
  /** Monospace/data: Fira Code */
  monoFamily: string;
  /** Heading font weight */
  headingWeight: number;
  /** Body font weight */
  bodyWeight: number;
}

export interface CinematicSurface {
  /** Card border-radius */
  cardRadius: string;
  /** Button border-radius */
  buttonRadius: string;
  /** Section border-radius (for contained sections) */
  sectionRadius: string;
  /** Card shadow */
  cardShadow: string;
  /** Elevated card shadow */
  elevatedShadow: string;
  /** Noise overlay opacity (0-1) */
  noiseOpacity: number;
}

export type VariantId = 'A' | 'B' | 'C' | 'obsidian-bloom' | 'frozen-canopy' | 'ember-realm' | 'twilight-lagoon' | 'nebula-crown';

export interface CinematicTokens {
  id: VariantId;
  name: string;
  palette: CinematicPalette;
  typography: CinematicTypography;
  surface: CinematicSurface;
  motion: MotionIntensity;
}

// ─── Shared Typography ───────────────────────────────────────────────

const sharedTypography: CinematicTypography = {
  headingFamily: "'Plus Jakarta Sans', 'Source Sans 3', sans-serif",
  dramaFamily: "'Cormorant Garamond', Georgia, serif",
  bodyFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif",
  monoFamily: "'Fira Code', 'Courier New', monospace",
  headingWeight: 700,
  bodyWeight: 400,
};

// ─── Preset F: Enchanted Apex ────────────────────────────────────────

export const enchantedApexTokens: CinematicTokens = {
  id: 'A',
  name: 'Enchanted Apex',
  palette: {
    bg: '#0B1A0F',           // Forest Throne
    surface: '#2A1F14',       // Ancient Bark
    accent: '#C6A84B',        // Gilded Fern (luxury)
    gaming: '#39FF6B',        // Biolume Green (gaming)
    secondary: '#8B6914',     // Warm gold
    tertiary: '#1A3D1A',      // Deep forest
    textPrimary: '#FAF5E8',   // Ivory Parchment
    textSecondary: 'rgba(250, 245, 232, 0.7)',
    textOnAccent: '#0B1A0F',
    border: 'rgba(198, 168, 75, 0.2)',
    glass: 'rgba(11, 26, 15, 0.75)',
    glassBorder: 'rgba(198, 168, 75, 0.15)',
  },
  typography: sharedTypography,
  surface: {
    cardRadius: '2rem',
    buttonRadius: '1.5rem',
    sectionRadius: '3rem',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(57, 255, 107, 0.03)',
    elevatedShadow: '0 16px 64px rgba(0, 0, 0, 0.6), 0 0 120px rgba(198, 168, 75, 0.05)',
    noiseOpacity: 0.05,
  },
  motion: 'high',
};

// ─── Preset F-Alt: Crystalline Swan ──────────────────────────────────

export const crystallineSwanTokens: CinematicTokens = {
  id: 'B',
  name: 'Crystalline Swan',
  palette: {
    bg: '#002060',            // Midnight Sapphire
    surface: '#003080',        // Royal Depth
    accent: '#C6A84B',         // Gilded Fern (luxury)
    gaming: '#60C0F0',         // Ice Wing (gaming)
    secondary: '#50A0F0',      // Arctic Cyan
    tertiary: '#4070C0',       // Swan Lavender
    textPrimary: '#E0ECF4',    // Frost White
    textSecondary: 'rgba(224, 236, 244, 0.7)',
    textOnAccent: '#002060',
    border: 'rgba(96, 192, 240, 0.2)',
    glass: 'rgba(0, 32, 96, 0.75)',
    glassBorder: 'rgba(96, 192, 240, 0.15)',
  },
  typography: sharedTypography,
  surface: {
    cardRadius: '2rem',
    buttonRadius: '1.5rem',
    sectionRadius: '3rem',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(96, 192, 240, 0.03)',
    elevatedShadow: '0 16px 64px rgba(0, 0, 0, 0.6), 0 0 120px rgba(198, 168, 75, 0.05)',
    noiseOpacity: 0.05,
  },
  motion: 'medium-high',
};

// ─── Variant C: Hybrid (F-Alt palette, low motion) ──────────────────

export const hybridTokens: CinematicTokens = {
  id: 'C',
  name: 'Hybrid Editorial',
  palette: {
    // Same palette as Crystalline Swan
    ...crystallineSwanTokens.palette,
  },
  typography: {
    ...sharedTypography,
    headingWeight: 800, // Tighter, more editorial
  },
  surface: {
    cardRadius: '1.5rem',      // Slightly tighter — editorial feel
    buttonRadius: '1rem',
    sectionRadius: '2rem',
    cardShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
    elevatedShadow: '0 8px 48px rgba(0, 0, 0, 0.4)',
    noiseOpacity: 0.03,        // Subtler noise
  },
  motion: 'low',
};

// ─── Design 1: Obsidian Bloom — Dark Gothic Garden ──────────────────

export const obsidianBloomTokens: CinematicTokens = {
  id: 'obsidian-bloom',
  name: 'Obsidian Bloom',
  palette: {
    bg: '#0A0A0A',
    surface: '#1A1218',
    accent: '#C6A84B',
    gaming: '#8B1A4A',
    secondary: '#DC2626',
    tertiary: '#2A1520',
    textPrimary: '#FAF0E6',
    textSecondary: 'rgba(250, 240, 230, 0.65)',
    textOnAccent: '#0A0A0A',
    border: 'rgba(198, 168, 75, 0.15)',
    glass: 'rgba(10, 10, 10, 0.85)',
    glassBorder: 'rgba(139, 26, 74, 0.2)',
  },
  typography: {
    ...sharedTypography,
    dramaFamily: "'Cormorant Garamond', Georgia, serif",
    headingWeight: 300,
  },
  surface: {
    cardRadius: '0',
    buttonRadius: '0',
    sectionRadius: '0',
    cardShadow: '0 2px 20px rgba(0, 0, 0, 0.6)',
    elevatedShadow: '0 8px 40px rgba(139, 26, 74, 0.15)',
    noiseOpacity: 0.04,
  },
  motion: 'medium-high',
};

// ─── Design 2: Frozen Canopy — Arctic Enchanted Forest ──────────────

export const frozenCanopyTokens: CinematicTokens = {
  id: 'frozen-canopy',
  name: 'Frozen Canopy',
  palette: {
    bg: '#001030',
    surface: '#001848',
    accent: '#C6A84B',
    gaming: '#60C0F0',
    secondary: '#00FFA3',
    tertiary: '#002060',
    textPrimary: '#E0F0FF',
    textSecondary: 'rgba(224, 240, 255, 0.65)',
    textOnAccent: '#001030',
    border: 'rgba(96, 192, 240, 0.2)',
    glass: 'rgba(0, 16, 48, 0.8)',
    glassBorder: 'rgba(96, 192, 240, 0.15)',
  },
  typography: sharedTypography,
  surface: {
    cardRadius: '2rem',
    buttonRadius: '1.5rem',
    sectionRadius: '3rem',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(96, 192, 240, 0.05)',
    elevatedShadow: '0 16px 64px rgba(0, 0, 0, 0.6), 0 0 100px rgba(0, 255, 163, 0.05)',
    noiseOpacity: 0.03,
  },
  motion: 'medium-high',
};

// ─── Design 3: Ember Realm — Warrior Forge ──────────────────────────

export const emberRealmTokens: CinematicTokens = {
  id: 'ember-realm',
  name: 'Ember Realm',
  palette: {
    bg: '#120808',
    surface: '#1E0E0E',
    accent: '#C6A84B',
    gaming: '#FF6B2C',
    secondary: '#DC2626',
    tertiary: '#FFB800',
    textPrimary: '#FFF0E0',
    textSecondary: 'rgba(255, 240, 224, 0.65)',
    textOnAccent: '#120808',
    border: 'rgba(255, 107, 44, 0.2)',
    glass: 'rgba(18, 8, 8, 0.85)',
    glassBorder: 'rgba(255, 107, 44, 0.15)',
  },
  typography: {
    ...sharedTypography,
    headingWeight: 800,
  },
  surface: {
    cardRadius: '0.5rem',
    buttonRadius: '0.5rem',
    sectionRadius: '0',
    cardShadow: '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 107, 44, 0.05)',
    elevatedShadow: '0 8px 48px rgba(0, 0, 0, 0.6), 0 0 80px rgba(255, 107, 44, 0.1)',
    noiseOpacity: 0.06,
  },
  motion: 'high',
};

// ─── Design 4: Twilight Lagoon — Bioluminescent Depths ──────────────

export const twilightLagoonTokens: CinematicTokens = {
  id: 'twilight-lagoon',
  name: 'Twilight Lagoon',
  palette: {
    bg: '#060618',
    surface: '#0A0A2E',
    accent: '#C6A84B',
    gaming: '#00FFB2',
    secondary: '#0066FF',
    tertiary: '#00E5FF',
    textPrimary: '#E0FFFC',
    textSecondary: 'rgba(224, 255, 252, 0.6)',
    textOnAccent: '#060618',
    border: 'rgba(0, 255, 178, 0.15)',
    glass: 'rgba(6, 6, 24, 0.82)',
    glassBorder: 'rgba(0, 255, 178, 0.12)',
  },
  typography: sharedTypography,
  surface: {
    cardRadius: '3rem',
    buttonRadius: '3rem',
    sectionRadius: '3rem',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 50px rgba(0, 255, 178, 0.04)',
    elevatedShadow: '0 16px 64px rgba(0, 0, 0, 0.6), 0 0 80px rgba(0, 229, 255, 0.06)',
    noiseOpacity: 0.03,
  },
  motion: 'medium-high',
};

// ─── Design 5: Nebula Crown — Cosmic Throne ─────────────────────────

export const nebulaCrownTokens: CinematicTokens = {
  id: 'nebula-crown',
  name: 'Nebula Crown',
  palette: {
    bg: '#0A0020',
    surface: '#120030',
    accent: '#C6A84B',
    gaming: '#9333EA',
    secondary: '#EC4899',
    tertiary: '#6366F1',
    textPrimary: '#F0E6FF',
    textSecondary: 'rgba(240, 230, 255, 0.6)',
    textOnAccent: '#0A0020',
    border: 'rgba(147, 51, 234, 0.2)',
    glass: 'rgba(10, 0, 32, 0.82)',
    glassBorder: 'rgba(147, 51, 234, 0.15)',
  },
  typography: {
    ...sharedTypography,
    headingWeight: 600,
  },
  surface: {
    cardRadius: '1.5rem',
    buttonRadius: '2rem',
    sectionRadius: '2rem',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(147, 51, 234, 0.05)',
    elevatedShadow: '0 16px 64px rgba(0, 0, 0, 0.6), 0 0 100px rgba(236, 72, 153, 0.06)',
    noiseOpacity: 0.04,
  },
  motion: 'medium-high',
};

// ─── Variant Map ─────────────────────────────────────────────────────

export const VARIANT_TOKENS: Record<'A' | 'B' | 'C', CinematicTokens> = {
  A: enchantedApexTokens,
  B: crystallineSwanTokens,
  C: hybridTokens,
};

export const NEW_VARIANT_TOKENS: Record<string, CinematicTokens> = {
  'obsidian-bloom': obsidianBloomTokens,
  'frozen-canopy': frozenCanopyTokens,
  'ember-realm': emberRealmTokens,
  'twilight-lagoon': twilightLagoonTokens,
  'nebula-crown': nebulaCrownTokens,
};

export default VARIANT_TOKENS;
