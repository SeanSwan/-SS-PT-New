/**
 * palettes/obsidian.ts
 * ====================
 *
 * obsidian black, obsidian bloom, obsidian aurora.
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
 * OBSIDIAN BLACK THEME — "Obsidian Black"
 * Pure black background with minimal accents. Workout logger dark aesthetic —
 * mostly black/dark with subtle Wing Purple accents and Ice Wing for data only.
 * Background: #0A0A0F (Obsidian Black from CLAUDE.md)
 * Card surface: #141419 (Carbon)
 * Elevated: #1A1A24 (Graphite)
 * Primary accent: #8B5CF6 (Wing Purple) — minimal usage
 * Data accent: #60C0F0 (Ice Wing) — charts/data only
 */
export const obsidianBlack = {
  id: 'obsidian-black' as const,
  name: 'Obsidian Black',
  fonts,
  effects: {
    glassmorphism: false,
    glowIntensity: 'subtle' as const,
    cardStyle: 'solid' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#0A0A0F',
    stardust: '#141419',
    void: '#050508',

    // Midnight Sapphire as primary button color per CLAUDE.md
    primary: '#002060',
    primaryBlue: '#003080',
    primaryDeep: '#001840',
    primaryLight: '#004090',
    primaryNeon: '#002060',

    // Wing Purple as secondary accent
    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDeep: '#7C3AED',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#7C3AED',

    // Ice Wing for gaming/data accents
    iceWing: '#60C0F0',

    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.5)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    // Cosmic Nebula gradient for premium CTAs
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    secondary: 'linear-gradient(135deg, #141419, #1A1A24)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(96,192,240,0.03) 0%, transparent 50%), radial-gradient(ellipse at center, #141419 0%, #0A0A0F 70%)',
    card: 'linear-gradient(135deg, #141419, #1A1A24)',
    accent: 'linear-gradient(135deg, #0A0A0F, #C6A84B)',
    stellar: 'linear-gradient(45deg, #8B5CF6 0%, #60C0F0 100%)',
    swanCosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    glass: 'linear-gradient(135deg, rgba(20, 20, 25, 0.9), rgba(139, 92, 246, 0.03))',
  },
  shadows: {
    // Wing Purple glow on blue buttons per dual-button glow system
    primary: '0 0 20px rgba(139, 92, 246, 0.15)',
    secondary: '0 0 15px rgba(96, 192, 240, 0.1)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.08)',
    accent: '0 0 15px rgba(198, 168, 75, 0.3)',
    elevation: '0 10px 30px rgba(0, 0, 0, 0.7)',
    glow: '0 0 15px currentColor',
    glass: '0 4px 16px rgba(0, 0, 0, 0.5)',
    button: '0 4px 16px rgba(139, 92, 246, 0.25)',
  },
  borders: {
    subtle: 'rgba(139, 92, 246, 0.08)',
    elegant: 'rgba(139, 92, 246, 0.15)',
    prominent: 'rgba(139, 92, 246, 0.25)',
    glass: '1px solid rgba(139, 92, 246, 0.12)',
    card: '1px solid rgba(139, 92, 246, 0.1)',
    focus: '2px solid #60C0F0',
    glow: '1px solid rgba(139, 92, 246, 0.15)',
  },
  background: {
    primary: '#0A0A0F',
    secondary: '#141419',
    // Graphite for surfaces and elevated panels/modals
    surface: '#1A1A24',
    elevated: '#1A1A24',
  },
  text: {
    primary: '#E0ECF4',
    secondary: '#94a3b8',
    muted: 'rgba(148, 163, 184, 0.6)',
    heading: '#E0ECF4',
    subheading: 'rgba(224, 236, 244, 0.9)',
    body: '#94a3b8',
    label: 'rgba(148, 163, 184, 0.7)',
    accent: '#8B5CF6',
  },
};

/**
 * OBSIDIAN BLOOM THEME — "Obsidian Bloom"
 * Dark Gothic Garden aesthetic. Deep violet-black backgrounds with hot pink
 * and purple accents. Inspired by midnight botanical gardens and dark florals.
 * Background: #0A0014 (deep violet-black)
 * Primary accent: #FF1493 (hot pink / gaming)
 * Secondary: #9333EA (vivid purple)
 * Gold accent: #C6A84B
 */
export const obsidianBloom = {
  id: 'obsidian-bloom' as const,
  name: 'Obsidian Bloom',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'elegant' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A0014',
    stardust: '#150020',
    void: '#050008',

    primary: '#FF1493',
    primaryBlue: '#E0117A',
    primaryDeep: '#C00062',
    primaryLight: '#FF69B4',
    primaryNeon: '#FF1493',

    secondary: '#9333EA',
    secondaryLight: '#A855F7',
    secondaryDeep: '#7E22CE',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#9333EA',
    wingPurpleLight: '#A855F7',
    wingPurpleDeep: '#7E22CE',

    white: '#F5E6FF',
    silver: '#E8D0F8',
    muted: 'rgba(245, 230, 255, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #9333EA, #FF1493)',
    secondary: 'linear-gradient(135deg, #150020, #9333EA)',
    cosmic: 'linear-gradient(135deg, #9333EA, #FF1493)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(255,20,147,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(147,51,234,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #150020 0%, #0A0014 70%)',
    card: 'rgba(21, 0, 32, 0.7)',
    accent: 'linear-gradient(135deg, #0A0014, #C6A84B)',
    stellar: 'linear-gradient(45deg, #FF1493 0%, #9333EA 100%)',
    swanCosmic: 'linear-gradient(135deg, #FF1493, #9333EA)',
    glass: 'linear-gradient(135deg, rgba(21, 0, 32, 0.7), rgba(255, 20, 147, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(255, 20, 147, 0.25)',
    secondary: '0 0 25px rgba(147, 51, 234, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(255, 20, 147, 0.12)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(10, 0, 20, 0.6)',
    button: '0 4px 20px rgba(255, 20, 147, 0.3)',
  },
  borders: {
    subtle: 'rgba(255, 20, 147, 0.1)',
    elegant: 'rgba(255, 20, 147, 0.25)',
    prominent: 'rgba(255, 20, 147, 0.4)',
    glass: '1px solid rgba(147, 51, 234, 0.2)',
    card: '1px solid rgba(255, 20, 147, 0.15)',
    focus: '2px solid #9333EA',
    glow: '1px solid rgba(147, 51, 234, 0.25)',
  },
  background: {
    primary: '#0A0014',
    secondary: '#150020',
    surface: 'rgba(21, 0, 32, 0.6)',
    elevated: 'rgba(21, 0, 32, 0.5)',
  },
  text: {
    primary: '#F5E6FF',
    secondary: 'rgba(245, 230, 255, 0.85)',
    muted: 'rgba(245, 230, 255, 0.55)',
    heading: '#F5E6FF',
    subheading: 'rgba(245, 230, 255, 0.9)',
    body: 'rgba(245, 230, 255, 0.85)',
    label: 'rgba(245, 230, 255, 0.65)',
    accent: '#FF1493',
  },
};

/**
 * OBSIDIAN AURORA THEME — Near-black with shifting aurora gradient accents
 */
export const obsidianAurora = {
  id: 'obsidian-aurora' as const,
  name: 'Obsidian Aurora',
  fonts,
  effects: { glassmorphism: true, glowIntensity: 'medium' as const, cardStyle: 'glass' as const, borderGlow: true },
  colors: {
    deepSpace: '#0F0F1A', stardust: '#161625', void: '#08080F',
    primary: '#7DD3FC', primaryBlue: '#38BDF8', primaryDeep: '#0369A1', primaryLight: '#BAE6FD', primaryNeon: '#7DD3FC',
    secondary: '#C084FC', secondaryLight: '#D8B4FE', secondaryDeep: '#9333EA',
    accent: '#86EFAC', accentLight: '#BBF7D0', accentWarm: '#4ADE80',
    wingPurple: '#C084FC', wingPurpleLight: '#D8B4FE', wingPurpleDeep: '#9333EA',
    white: '#F0F0FF', silver: '#D8D8F0', muted: 'rgba(240, 240, 255, 0.5)',
    error: '#F87171', success: '#86EFAC', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #C084FC, #7DD3FC, #86EFAC)', secondary: 'linear-gradient(135deg, #161625, #C084FC)',
    cosmic: 'linear-gradient(135deg, #C084FC, #7DD3FC)', hero: 'radial-gradient(ellipse at 20% 30%, rgba(192,132,252,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(125,211,252,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #161625 0%, #0F0F1A 70%)',
    card: 'rgba(22, 22, 37, 0.7)', accent: 'linear-gradient(135deg, #0F0F1A, #86EFAC)',
    stellar: 'linear-gradient(45deg, #C084FC 0%, #7DD3FC 50%, #86EFAC 100%)', swanCosmic: 'linear-gradient(135deg, #C084FC, #7DD3FC)',
    glass: 'linear-gradient(135deg, rgba(22, 22, 37, 0.7), rgba(192, 132, 252, 0.03))',
  },
  shadows: {
    primary: '0 0 20px rgba(125, 211, 252, 0.2)', secondary: '0 0 20px rgba(192, 132, 252, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(192, 132, 252, 0.1)', accent: '0 0 20px rgba(134, 239, 172, 0.3)',
    elevation: '0 15px 35px rgba(8, 8, 15, 0.7)', glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(15, 15, 26, 0.5)', button: '0 4px 20px rgba(192, 132, 252, 0.25)',
  },
  borders: {
    subtle: 'rgba(192, 132, 252, 0.08)', elegant: 'rgba(192, 132, 252, 0.15)', prominent: 'rgba(192, 132, 252, 0.3)',
    glass: '1px solid rgba(192, 132, 252, 0.1)', card: '1px solid rgba(192, 132, 252, 0.08)',
    focus: '2px solid #C084FC', glow: '1px solid rgba(125, 211, 252, 0.15)',
  },
  background: { primary: '#0F0F1A', secondary: '#161625', surface: 'rgba(22, 22, 37, 0.7)', elevated: '#1E1E33' },
  text: {
    primary: '#F0F0FF', secondary: 'rgba(240, 240, 255, 0.8)', muted: 'rgba(216, 216, 240, 0.6)',
    heading: '#F0F0FF', subheading: 'rgba(240, 240, 255, 0.9)', body: 'rgba(240, 240, 255, 0.85)',
    label: 'rgba(216, 216, 240, 0.65)', accent: '#7DD3FC',
  },
};
