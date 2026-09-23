/**
 * palettes/atelier.ts
 * ===================
 *
 * twilight lagoon, enchanted forest.
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
 * TWILIGHT LAGOON THEME — "Twilight Lagoon"
 * Bioluminescent Depths aesthetic. Ultra-deep navy backgrounds with aqua green
 * and electric blue accents. Inspired by deep-sea bioluminescence and underwater caves.
 * Background: #060618 (ultra-deep navy)
 * Primary accent: #00FFB2 (bioluminescent green / gaming)
 * Secondary: #0066FF (electric blue)
 * Tertiary: #60C0F0 (bright cyan)
 */
export const twilightLagoon = {
  id: 'twilight-lagoon' as const,
  name: 'Twilight Lagoon',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#060618',
    stardust: '#0A0A2E',
    void: '#030310',

    primary: '#00FFB2',
    primaryBlue: '#00DDA0',
    primaryDeep: '#00BB88',
    primaryLight: '#66FFCF',
    primaryNeon: '#00FFB2',

    secondary: '#0066FF',
    secondaryLight: '#3388FF',
    secondaryDeep: '#0044CC',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#0066FF',
    wingPurpleLight: '#3388FF',
    wingPurpleDeep: '#0044CC',

    white: '#E0FFFC',
    silver: '#C0F0EC',
    muted: 'rgba(224, 255, 252, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #00FFB2, #0066FF)',
    secondary: 'linear-gradient(135deg, #0A0A2E, #0066FF)',
    cosmic: 'linear-gradient(135deg, #00FFB2, #60C0F0)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(0,255,178,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,102,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #0A0A2E 0%, #060618 70%)',
    card: 'rgba(10, 10, 46, 0.7)',
    accent: 'linear-gradient(135deg, #060618, #60C0F0)',
    stellar: 'linear-gradient(45deg, #00FFB2 0%, #0066FF 100%)',
    swanCosmic: 'linear-gradient(135deg, #00FFB2, #60C0F0)',
    glass: 'linear-gradient(135deg, rgba(10, 10, 46, 0.7), rgba(0, 255, 178, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(0, 255, 178, 0.25)',
    secondary: '0 0 25px rgba(0, 102, 255, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(0, 255, 178, 0.12)',
    accent: '0 0 20px rgba(0, 229, 255, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(6, 6, 24, 0.6)',
    button: '0 4px 20px rgba(0, 255, 178, 0.3)',
  },
  borders: {
    subtle: 'rgba(0, 255, 178, 0.1)',
    elegant: 'rgba(0, 255, 178, 0.25)',
    prominent: 'rgba(0, 102, 255, 0.4)',
    glass: '1px solid rgba(0, 255, 178, 0.18)',
    card: '1px solid rgba(0, 255, 178, 0.15)',
    focus: '2px solid #0066FF',
    glow: '1px solid rgba(0, 102, 255, 0.2)',
  },
  background: {
    primary: '#060618',
    secondary: '#0A0A2E',
    surface: 'rgba(10, 10, 46, 0.6)',
    elevated: 'rgba(10, 10, 46, 0.5)',
  },
  text: {
    primary: '#E0FFFC',
    secondary: 'rgba(224, 255, 252, 0.85)',
    muted: 'rgba(224, 255, 252, 0.55)',
    heading: '#E0FFFC',
    subheading: 'rgba(224, 255, 252, 0.9)',
    body: 'rgba(224, 255, 252, 0.85)',
    label: 'rgba(224, 255, 252, 0.65)',
    accent: '#00FFB2',
  },
};

/**
 * ENCHANTED FOREST THEME — "Enchanted Forest"
 * Deep forest greens with golden sunlight filtering through canopy.
 * Organic, earthy, natural — inspired by ancient enchanted woodlands.
 * Background: #0A1A0A (deep forest black-green)
 * Primary accent: #4ADE80 (emerald glow)
 * Secondary: #A3E635 (lime canopy light)
 * Gold accent: #C6A84B (sunlight through leaves)
 */
export const enchantedForest = {
  id: 'enchanted-forest' as const,
  name: 'Enchanted Forest',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A1A0A',
    stardust: '#0F2A10',
    void: '#050D05',
    primary: '#4ADE80',
    primaryBlue: '#22C55E',
    primaryDeep: '#16A34A',
    primaryLight: '#86EFAC',
    primaryNeon: '#4ADE80',
    secondary: '#A3E635',
    secondaryLight: '#BEF264',
    secondaryDeep: '#84CC16',
    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',
    wingPurple: '#A3E635',
    wingPurpleLight: '#BEF264',
    wingPurpleDeep: '#84CC16',
    white: '#E8F5E0',
    silver: '#D4ECD0',
    muted: 'rgba(232, 245, 224, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #16A34A, #4ADE80)',
    secondary: 'linear-gradient(135deg, #0F2A10, #A3E635)',
    cosmic: 'linear-gradient(135deg, #16A34A, #A3E635)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(74,222,128,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(163,230,53,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #0F2A10 0%, #0A1A0A 70%)',
    card: 'rgba(15, 42, 16, 0.7)',
    accent: 'linear-gradient(135deg, #0A1A0A, #C6A84B)',
    stellar: 'linear-gradient(45deg, #4ADE80 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #4ADE80, #A3E635)',
    glass: 'linear-gradient(135deg, rgba(15, 42, 16, 0.7), rgba(74, 222, 128, 0.05))',
  },
  shadows: {
    primary: '0 0 25px rgba(74, 222, 128, 0.25)',
    secondary: '0 0 20px rgba(163, 230, 53, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(74, 222, 128, 0.12)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(10, 26, 10, 0.5)',
    button: '0 4px 20px rgba(74, 222, 128, 0.3)',
  },
  borders: {
    subtle: 'rgba(74, 222, 128, 0.1)',
    elegant: 'rgba(74, 222, 128, 0.25)',
    prominent: 'rgba(74, 222, 128, 0.4)',
    glass: '1px solid rgba(74, 222, 128, 0.2)',
    card: '1px solid rgba(74, 222, 128, 0.15)',
    focus: '2px solid #A3E635',
    glow: '1px solid rgba(163, 230, 53, 0.2)',
  },
  background: {
    primary: '#0A1A0A',
    secondary: '#0F2A10',
    surface: 'rgba(15, 42, 16, 0.6)',
    elevated: 'rgba(15, 42, 16, 0.5)',
  },
  text: {
    primary: '#E8F5E0',
    secondary: 'rgba(232, 245, 224, 0.85)',
    muted: 'rgba(232, 245, 224, 0.55)',
    heading: '#E8F5E0',
    subheading: 'rgba(232, 245, 224, 0.9)',
    body: 'rgba(232, 245, 224, 0.85)',
    label: 'rgba(232, 245, 224, 0.65)',
    accent: '#4ADE80',
  },
};
