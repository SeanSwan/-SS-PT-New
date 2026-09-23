/**
 * palettes/frozenRealm.ts
 * =======================
 *
 * frozen aurora, frozen canopy.
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
 * FROZEN AURORA THEME — "Frozen Aurora"
 * Cool cinematic light theme. Icy whites with northern lights accents.
 * Inspired by Scandinavian design + aurora borealis.
 * Background: #F0F4F8 (ice mist)
 * Primary accent: #6366F1 (indigo aurora)
 * Secondary: #14B8A6 (teal aurora)
 */
export const frozenAurora = {
  id: 'frozen-aurora' as const,
  name: 'Frozen Aurora',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'subtle' as const,
    cardStyle: 'frosted' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#F0F4F8',
    stardust: '#E2E8F0',
    void: '#F8FAFC',

    primary: '#6366F1',
    primaryBlue: '#818CF8',
    primaryDeep: '#4F46E5',
    primaryLight: '#A5B4FC',
    primaryNeon: '#6366F1',

    secondary: '#14B8A6',
    secondaryLight: '#2DD4BF',
    secondaryDeep: '#0D9488',

    accent: '#C6A84B',
    accentLight: '#D4B85A',
    accentWarm: '#B8860B',

    wingPurple: '#6366F1',
    wingPurpleLight: '#818CF8',
    wingPurpleDeep: '#4F46E5',

    white: '#1E293B',
    silver: '#334155',
    muted: 'rgba(30, 41, 59, 0.45)',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #F0F4F8, #6366F1)',
    secondary: 'linear-gradient(135deg, #E2E8F0, #14B8A6)',
    cosmic: 'linear-gradient(135deg, #F0F4F8, #818CF8)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(20,184,166,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #E2E8F0 0%, #F0F4F8 70%)',
    card: 'rgba(255, 255, 255, 0.7)',
    accent: 'linear-gradient(135deg, #F0F4F8, #C6A84B)',
    stellar: 'linear-gradient(45deg, #6366F1 0%, #14B8A6 100%)',
    swanCosmic: 'linear-gradient(135deg, #6366F1, #14B8A6)',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(99, 102, 241, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(99, 102, 241, 0.15)',
    secondary: '0 0 25px rgba(20, 184, 166, 0.12)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 60px rgba(99, 102, 241, 0.08)',
    accent: '0 0 20px rgba(198, 168, 75, 0.2)',
    elevation: '0 10px 30px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(0, 0, 0, 0.06)',
    button: '0 4px 20px rgba(99, 102, 241, 0.2)',
  },
  borders: {
    subtle: 'rgba(99, 102, 241, 0.1)',
    elegant: 'rgba(99, 102, 241, 0.2)',
    prominent: 'rgba(99, 102, 241, 0.35)',
    glass: '1px solid rgba(99, 102, 241, 0.15)',
    card: '1px solid rgba(99, 102, 241, 0.1)',
    focus: '2px solid #6366F1',
    glow: '1px solid rgba(99, 102, 241, 0.15)',
  },
  background: {
    primary: '#F0F4F8',
    secondary: '#E2E8F0',
    surface: 'rgba(255, 255, 255, 0.6)',
    elevated: 'rgba(255, 255, 255, 0.8)',
  },
  text: {
    primary: '#1E293B',
    secondary: 'rgba(30, 41, 59, 0.75)',
    muted: 'rgba(30, 41, 59, 0.45)',
    heading: '#0F172A',
    subheading: '#1E293B',
    body: 'rgba(30, 41, 59, 0.75)',
    label: 'rgba(30, 41, 59, 0.55)',
    accent: '#6366F1',
  },
};

/**
 * FROZEN CANOPY THEME — "Frozen Canopy"
 * Arctic Enchanted Forest aesthetic. Deep navy-blue backgrounds with ice cyan
 * and emerald green accents. Inspired by frozen northern forests and starlight.
 * Background: #001030 (deep arctic navy)
 * Primary accent: #60C0F0 (ice cyan / gaming)
 * Secondary: #00FFA3 (emerald green)
 * Gold accent: #C6A84B
 */
export const frozenCanopy = {
  id: 'frozen-canopy' as const,
  name: 'Frozen Canopy',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'frosted' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#001030',
    stardust: '#001848',
    void: '#000818',

    primary: '#60C0F0',
    primaryBlue: '#4AA8D8',
    primaryDeep: '#3890C0',
    primaryLight: '#80D4FF',
    primaryNeon: '#60C0F0',

    secondary: '#00FFA3',
    secondaryLight: '#66FFc8',
    secondaryDeep: '#00CC82',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#00FFA3',
    wingPurpleLight: '#66FFC8',
    wingPurpleDeep: '#00CC82',

    white: '#E0F0FF',
    silver: '#C8E0F4',
    muted: 'rgba(224, 240, 255, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #60C0F0, #00FFA3)',
    secondary: 'linear-gradient(135deg, #001848, #00FFA3)',
    cosmic: 'linear-gradient(135deg, #60C0F0, #00FFA3)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(96,192,240,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,255,163,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #001848 0%, #001030 70%)',
    card: 'rgba(0, 24, 72, 0.7)',
    accent: 'linear-gradient(135deg, #001030, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #00FFA3 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #00FFA3)',
    glass: 'linear-gradient(135deg, rgba(0, 24, 72, 0.7), rgba(96, 192, 240, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(96, 192, 240, 0.25)',
    secondary: '0 0 25px rgba(0, 255, 163, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(96, 192, 240, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(0, 16, 48, 0.5)',
    button: '0 4px 20px rgba(96, 192, 240, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.25)',
    prominent: 'rgba(0, 255, 163, 0.4)',
    glass: '1px solid rgba(96, 192, 240, 0.2)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #00FFA3',
    glow: '1px solid rgba(0, 255, 163, 0.2)',
  },
  background: {
    primary: '#001030',
    secondary: '#001848',
    surface: 'rgba(0, 24, 72, 0.6)',
    elevated: 'rgba(0, 24, 72, 0.5)',
  },
  text: {
    primary: '#E0F0FF',
    secondary: 'rgba(224, 240, 255, 0.85)',
    muted: 'rgba(224, 240, 255, 0.55)',
    heading: '#E0F0FF',
    subheading: 'rgba(224, 240, 255, 0.9)',
    body: 'rgba(224, 240, 255, 0.85)',
    label: 'rgba(224, 240, 255, 0.65)',
    accent: '#60C0F0',
  },
};
