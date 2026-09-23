/**
 * palettes/chromatic.ts
 * =====================
 *
 * cyberpunk edgerunners, nebula crown, carbon fiber.
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
 * CYBERPUNK EDGERUNNERS THEME — "Cyberpunk Edgerunners"
 * Aggressive neon dark theme. Near-black bg with neon yellow + hot pink.
 * Inspired by Night City aesthetics — sharp edges, glassmorphism, high contrast.
 * Background: #0D0D0D (near-black)
 * Primary accent: #F7FF00 (neon yellow)
 * Secondary: #FF2D6A (hot pink)
 * Cyan accent: #00F0FF
 */
export const cyberpunkEdgerunners = {
  id: 'cyberpunk-edgerunners' as const,
  name: 'Cyberpunk Cyan',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'intense' as const,
    cardStyle: 'neon' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A0A14',
    stardust: '#12122A',
    void: '#050510',

    primary: '#60C0F0',
    primaryBlue: '#60C0F0',
    primaryDeep: '#50A0F0',
    primaryLight: '#8ED8F8',
    primaryNeon: '#60C0F0',

    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDeep: '#6D28D9',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#6D28D9',

    white: '#E0F7FF',
    silver: '#C8E6F0',
    muted: 'rgba(224, 247, 255, 0.55)',
    error: '#FF4444',
    success: '#00FF88',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    secondary: 'linear-gradient(135deg, #12122A, #60C0F0)',
    cosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(96,192,240,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #12122A 0%, #0A0A14 70%)',
    card: 'rgba(18, 18, 42, 0.7)',
    accent: 'linear-gradient(135deg, #0A0A14, #60C0F0)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #8B5CF6 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    glass: 'linear-gradient(135deg, rgba(18, 18, 42, 0.7), rgba(96, 192, 240, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(96, 192, 240, 0.3)',
    secondary: '0 0 25px rgba(139, 92, 246, 0.25)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(96, 192, 240, 0.15)',
    accent: '0 0 20px rgba(96, 192, 240, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(10, 10, 20, 0.6)',
    button: '0 4px 20px rgba(96, 192, 240, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.25)',
    prominent: 'rgba(96, 192, 240, 0.45)',
    glass: '1px solid rgba(96, 192, 240, 0.2)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #60C0F0',
    glow: '1px solid rgba(139, 92, 246, 0.25)',
  },
  background: {
    primary: '#0A0A14',
    secondary: '#12122A',
    surface: 'rgba(18, 18, 42, 0.6)',
    elevated: 'rgba(18, 18, 42, 0.5)',
  },
  text: {
    primary: '#E0F7FF',
    secondary: 'rgba(224, 247, 255, 0.85)',
    muted: 'rgba(224, 247, 255, 0.55)',
    heading: '#E0F7FF',
    subheading: 'rgba(224, 247, 255, 0.9)',
    body: 'rgba(224, 247, 255, 0.85)',
    label: 'rgba(224, 247, 255, 0.65)',
    accent: '#60C0F0',
  },
};

/**
 * NEBULA CROWN THEME — "Nebula Crown"
 * Cosmic Throne aesthetic. Deep purple-black backgrounds with vivid purple,
 * pink, and indigo accents. Inspired by nebulae, crowns, and cosmic royalty.
 * Background: #0A0020 (deep cosmic purple)
 * Primary accent: #9333EA (vivid purple / gaming)
 * Secondary: #EC4899 (cosmic pink)
 * Tertiary: #6366F1 (indigo)
 */
export const nebulaCrown = {
  id: 'nebula-crown' as const,
  name: 'Nebula Crown',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'intense' as const,
    cardStyle: 'neon' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A0020',
    stardust: '#120030',
    void: '#050010',

    primary: '#9333EA',
    primaryBlue: '#7E22CE',
    primaryDeep: '#6B21A8',
    primaryLight: '#A855F7',
    primaryNeon: '#9333EA',

    secondary: '#EC4899',
    secondaryLight: '#F472B6',
    secondaryDeep: '#DB2777',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#EC4899',
    wingPurpleLight: '#F472B6',
    wingPurpleDeep: '#DB2777',

    white: '#F0E6FF',
    silver: '#E0D0F8',
    muted: 'rgba(240, 230, 255, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #9333EA, #EC4899)',
    secondary: 'linear-gradient(135deg, #120030, #6366F1)',
    cosmic: 'linear-gradient(135deg, #9333EA, #6366F1)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(147,51,234,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(236,72,153,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #120030 0%, #0A0020 70%)',
    card: 'rgba(18, 0, 48, 0.7)',
    accent: 'linear-gradient(135deg, #0A0020, #C6A84B)',
    stellar: 'linear-gradient(45deg, #9333EA 0%, #EC4899 100%)',
    swanCosmic: 'linear-gradient(135deg, #9333EA, #6366F1)',
    glass: 'linear-gradient(135deg, rgba(18, 0, 48, 0.7), rgba(147, 51, 234, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(147, 51, 234, 0.3)',
    secondary: '0 0 25px rgba(236, 72, 153, 0.25)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(147, 51, 234, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(10, 0, 32, 0.6)',
    button: '0 4px 20px rgba(147, 51, 234, 0.35)',
  },
  borders: {
    subtle: 'rgba(147, 51, 234, 0.1)',
    elegant: 'rgba(147, 51, 234, 0.25)',
    prominent: 'rgba(236, 72, 153, 0.4)',
    glass: '1px solid rgba(147, 51, 234, 0.2)',
    card: '1px solid rgba(147, 51, 234, 0.15)',
    focus: '2px solid #EC4899',
    glow: '1px solid rgba(236, 72, 153, 0.25)',
  },
  background: {
    primary: '#0A0020',
    secondary: '#120030',
    surface: 'rgba(18, 0, 48, 0.6)',
    elevated: 'rgba(18, 0, 48, 0.5)',
  },
  text: {
    primary: '#F0E6FF',
    secondary: 'rgba(240, 230, 255, 0.85)',
    muted: 'rgba(240, 230, 255, 0.55)',
    heading: '#F0E6FF',
    subheading: 'rgba(240, 230, 255, 0.9)',
    body: 'rgba(240, 230, 255, 0.85)',
    label: 'rgba(240, 230, 255, 0.65)',
    accent: '#9333EA',
  },
};

/**
 * CARBON FIBER THEME — Dark carbon with subtle texture feel and platinum controls.
 */
export const carbonFiber = {
  id: 'carbon-fiber' as const,
  name: 'Carbon Fiber',
  fonts,
  effects: { glassmorphism: false, glowIntensity: 'subtle' as const, cardStyle: 'solid' as const, borderGlow: false },
  colors: {
    deepSpace: '#121212', stardust: '#1E1E1E', void: '#0A0A0A',
    primary: '#D8DEE6', primaryBlue: '#A7B0BC', primaryDeep: '#596574', primaryLight: '#F4F7FA', primaryNeon: '#E5EAF0',
    secondary: '#A7B0BC', secondaryLight: '#D8DEE6', secondaryDeep: '#596574',
    accent: '#C6A84B', accentLight: '#D4B85C', accentWarm: '#B8972E',
    wingPurple: '#A7B0BC', wingPurpleLight: '#D8DEE6', wingPurpleDeep: '#596574',
    white: '#F4F7FA', silver: '#D8DEE6', muted: 'rgba(216, 222, 230, 0.62)',
    error: '#F87171', success: '#4ADE80', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #596574, #D8DEE6)', secondary: 'linear-gradient(135deg, #101010, #596574)',
    cosmic: 'linear-gradient(135deg, #A7B0BC, #F4F7FA)', hero: 'radial-gradient(ellipse at 30% 40%, rgba(216,222,230,0.08) 0%, transparent 50%), radial-gradient(ellipse at center, #1E1E1E 0%, #121212 70%)',
    card: 'rgba(30, 30, 30, 0.8)', accent: 'linear-gradient(135deg, #121212, #C6A84B)',
    stellar: 'linear-gradient(45deg, #D8DEE6 0%, #C6A84B 100%)', swanCosmic: 'linear-gradient(135deg, #D8DEE6, #A7B0BC)',
    glass: 'linear-gradient(135deg, rgba(30, 30, 30, 0.8), rgba(216, 222, 230, 0.04))',
  },
  shadows: {
    primary: '0 0 15px rgba(216, 222, 230, 0.14)', secondary: '0 0 15px rgba(167, 176, 188, 0.12)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(216, 222, 230, 0.08)', accent: '0 0 15px rgba(198, 168, 75, 0.2)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.6)', glow: '0 0 15px currentColor',
    glass: '0 8px 32px rgba(18, 18, 18, 0.5)', button: '0 4px 15px rgba(216, 222, 230, 0.14)',
  },
  borders: {
    subtle: 'rgba(192, 192, 192, 0.1)', elegant: 'rgba(192, 192, 192, 0.2)', prominent: 'rgba(192, 192, 192, 0.35)',
    glass: '1px solid rgba(192, 192, 192, 0.12)', card: '1px solid rgba(192, 192, 192, 0.1)',
    focus: '2px solid #D8DEE6', glow: '1px solid rgba(216, 222, 230, 0.16)',
  },
  background: { primary: '#121212', secondary: '#1E1E1E', surface: 'rgba(30, 30, 30, 0.8)', elevated: '#262626' },
  text: {
    primary: '#F4F7FA', secondary: 'rgba(244, 247, 250, 0.82)', muted: 'rgba(216, 222, 230, 0.62)',
    heading: '#F4F7FA', subheading: 'rgba(244, 247, 250, 0.9)', body: 'rgba(244, 247, 250, 0.85)',
    label: 'rgba(216, 222, 230, 0.68)', accent: '#D8DEE6',
  },
};
