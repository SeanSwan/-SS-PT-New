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

export interface CinematicTokens {
  id: 'A' | 'B' | 'C';
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

// ─── Variant Map ─────────────────────────────────────────────────────

export const VARIANT_TOKENS: Record<'A' | 'B' | 'C', CinematicTokens> = {
  A: enchantedApexTokens,
  B: crystallineSwanTokens,
  C: hybridTokens,
};

export default VARIANT_TOKENS;
