/**
 * palettes/crystallineDark.ts
 * ===========================
 *
 * crystalline dark, crystalline mono.
 *
 * Pure data. Split out of themePalettes.ts, which held all 18 base literals in one
 * 1,596-line table and carried a RULE 4 EXEMPTION to do it. The exemption is gone;
 * the split is mechanical (see tmp/theme-lens-harness/split-palettes.mjs) and the
 * resolved `themes` object is proven byte-identical by the palette drift check.
 *
 * Do not reformat these literals: the values are the visual source of truth and a
 * diff here should be a deliberate colour decision, not incidental churn.
 */

import { fonts } from './fonts';

/**
 * VOID CRYSTAL THEME — "Void Crystal"
 * Sci-fi neon command center. Near-black backgrounds, aggressive neon glow,
 * vivid cyan primary, purple secondary. Maximum dramatic intensity.
 * Background: #030712 (near-black)
 * Primary accent: #22D3EE (vivid cyan)
 * Secondary accent: #A78BFA (vivid purple)
 * Gold accent: #F59E0B (amber)
 */
export const crystallineDark = {
  id: 'crystalline-dark' as const,
  name: 'Crystalline Dark',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0D1117',
    stardust: '#161B22',
    void: '#010409',

    primary: '#60C0F0',
    primaryBlue: '#50A0F0',
    primaryDeep: '#002060',
    primaryLight: '#7DD3FC',
    primaryNeon: '#60C0F0',

    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDeep: '#6D28D9',

    accent: '#C6A84B',
    accentLight: '#D4B85C',
    accentWarm: '#B8972E',

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#6D28D9',

    white: '#E6EDF3',
    silver: '#E6EDF3',
    muted: 'rgba(230, 237, 243, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    secondary: 'linear-gradient(135deg, #161B22, #8B5CF6)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(96,192,240,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #161B22 0%, #0D1117 70%)',
    card: 'rgba(22, 27, 34, 0.7)',
    accent: 'linear-gradient(135deg, #0D1117, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    glass: 'linear-gradient(135deg, rgba(22, 27, 34, 0.7), rgba(96, 192, 240, 0.03))',
  },
  shadows: {
    primary: '0 0 20px rgba(96, 192, 240, 0.2)',
    secondary: '0 0 20px rgba(139, 92, 246, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(96, 192, 240, 0.1)',
    accent: '0 0 20px rgba(198, 168, 75, 0.3)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(13, 17, 23, 0.5)',
    button: '0 4px 20px rgba(139, 92, 246, 0.25)',
  },
  borders: {
    subtle: 'rgba(48, 54, 61, 0.6)',
    elegant: 'rgba(96, 192, 240, 0.2)',
    prominent: 'rgba(96, 192, 240, 0.4)',
    glass: '1px solid rgba(48, 54, 61, 0.6)',
    card: '1px solid rgba(48, 54, 61, 0.6)',
    focus: '2px solid #8B5CF6',
    glow: '1px solid rgba(139, 92, 246, 0.2)',
  },
  background: {
    primary: '#0D1117',
    secondary: '#161B22',
    surface: 'rgba(22, 27, 34, 0.8)',
    elevated: '#1A1F2E',
  },
  text: {
    primary: '#E6EDF3',
    secondary: 'rgba(230, 237, 243, 0.8)',
    muted: 'rgba(230, 237, 243, 0.6)',
    heading: '#E6EDF3',
    subheading: 'rgba(230, 237, 243, 0.9)',
    body: 'rgba(230, 237, 243, 0.85)',
    label: 'rgba(230, 237, 243, 0.65)',
    accent: '#60C0F0',
  },
};

/**
 * MONOCHROME THEME — "Monochrome"
 * Minimalist black & white dark mode. Pure black backgrounds, white text,
 * NO color, NO glow, NO glassmorphism. Clean, editorial, typographic.
 * Background: #000000 (pure black)
 * Primary accent: #FFFFFF (pure white)
 * No color accents — grayscale only
 */
export const crystallineMono = {
  id: 'crystalline-mono' as const,
  name: 'Monochrome',
  fonts: {
    heading: '"Cormorant Garamond", Georgia, serif',
    drama: '"Cormorant Garamond", Georgia, serif',
    data: '"Source Sans 3", "Source Sans Pro", sans-serif',
    ui: '"Inter", "Source Sans 3", sans-serif',
  },
  effects: {
    glassmorphism: false,
    glowIntensity: 'none' as const,
    cardStyle: 'solid' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#000000',
    stardust: '#0a0a0a',
    void: '#000000',

    primary: '#FFFFFF',
    primaryBlue: '#CCCCCC',
    primaryDeep: '#AAAAAA',
    primaryLight: '#FFFFFF',
    primaryNeon: '#FFFFFF',

    secondary: '#888888',
    secondaryLight: '#AAAAAA',
    secondaryDeep: '#666666',

    accent: '#CCCCCC',
    accentLight: '#E0E0E0',
    accentWarm: '#999999',

    wingPurple: '#CCCCCC',
    wingPurpleLight: '#E0E0E0',
    wingPurpleDeep: '#AAAAAA',

    white: '#FFFFFF',
    silver: '#E0E0E0',
    muted: 'rgba(255, 255, 255, 0.5)',
    error: '#FF4444',
    success: '#AAAAAA',
    warning: '#999999',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #000000, #1a1a1a)',
    secondary: 'linear-gradient(135deg, #0a0a0a, #141414)',
    cosmic: 'linear-gradient(135deg, #000000, #111111)',
    hero: 'linear-gradient(180deg, #000000 0%, #111111 100%)',
    card: 'linear-gradient(145deg, #0a0a0a, #141414)',
    accent: 'linear-gradient(135deg, #000000, #333333)',
    stellar: 'linear-gradient(45deg, #FFFFFF 0%, #888888 100%)',
    swanCosmic: 'linear-gradient(135deg, #FFFFFF, #666666)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
  },
  shadows: {
    primary: '0 2px 8px rgba(255,255,255,0.06)',
    secondary: '0 2px 6px rgba(255,255,255,0.04)',
    cosmic: '0 4px 16px rgba(0,0,0,0.5)',
    accent: '0 2px 8px rgba(255,255,255,0.08)',
    elevation: '0 4px 16px rgba(0,0,0,0.5)',
    glow: 'none',
    glass: '0 1px 4px rgba(255,255,255,0.04)',
    button: '0 2px 8px rgba(255,255,255,0.1)',
  },
  borders: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    elegant: 'rgba(255, 255, 255, 0.15)',
    prominent: 'rgba(255, 255, 255, 0.25)',
    glass: '1px solid rgba(255,255,255,0.06)',
    card: '1px solid rgba(255,255,255,0.1)',
    focus: '2px solid #FFFFFF',
    glow: '1px solid rgba(255, 255, 255, 0.1)',
  },
  background: {
    primary: '#000000',
    secondary: '#0a0a0a',
    surface: 'rgba(255, 255, 255, 0.05)',
    elevated: 'rgba(255, 255, 255, 0.03)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#AAAAAA',
    muted: '#666666',
    heading: '#FFFFFF',
    subheading: '#CCCCCC',
    body: '#BBBBBB',
    label: '#888888',
    accent: '#FFFFFF',
  },
};
