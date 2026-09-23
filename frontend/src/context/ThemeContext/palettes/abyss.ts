/**
 * palettes/abyss.ts
 * =================
 *
 * void crystal, deep ocean.
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
 * VOID CRYSTAL THEME — Pure black, maximum contrast, neon accents glow intensely
 */
export const voidCrystal = {
  id: 'void-crystal' as const,
  name: 'Void Crystal',
  fonts,
  effects: { glassmorphism: true, glowIntensity: 'intense' as const, cardStyle: 'neon' as const, borderGlow: true },
  colors: {
    deepSpace: '#000000', stardust: '#0A0A0A', void: '#000000',
    primary: '#60C0F0', primaryBlue: '#50A0F0', primaryDeep: '#002060', primaryLight: '#7DD3FC', primaryNeon: '#60C0F0',
    secondary: '#8B5CF6', secondaryLight: '#A78BFA', secondaryDeep: '#6D28D9',
    accent: '#C6A84B', accentLight: '#D4B85C', accentWarm: '#B8972E',
    wingPurple: '#8B5CF6', wingPurpleLight: '#A78BFA', wingPurpleDeep: '#6D28D9',
    white: '#FFFFFF', silver: '#E6EDF3', muted: 'rgba(255, 255, 255, 0.5)',
    error: '#F87171', success: '#4ADE80', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)', secondary: 'linear-gradient(135deg, #0A0A0A, #8B5CF6)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)', hero: 'radial-gradient(ellipse at 30% 40%, rgba(96,192,240,0.1) 0%, transparent 50%), radial-gradient(ellipse at center, #0A0A0A 0%, #000000 70%)',
    card: 'rgba(10, 10, 10, 0.8)', accent: 'linear-gradient(135deg, #000000, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #C6A84B 100%)', swanCosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    glass: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8), rgba(96, 192, 240, 0.03))',
  },
  shadows: {
    primary: '0 0 30px rgba(96, 192, 240, 0.35)', secondary: '0 0 25px rgba(139, 92, 246, 0.3)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.9), 0 0 60px rgba(96, 192, 240, 0.2)', accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.95)', glow: '0 0 30px currentColor',
    glass: '0 8px 32px rgba(0, 0, 0, 0.8)', button: '0 4px 20px rgba(139, 92, 246, 0.35)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)', elegant: 'rgba(96, 192, 240, 0.25)', prominent: 'rgba(96, 192, 240, 0.45)',
    glass: '1px solid rgba(96, 192, 240, 0.15)', card: '1px solid rgba(96, 192, 240, 0.12)',
    focus: '2px solid #8B5CF6', glow: '1px solid rgba(139, 92, 246, 0.25)',
  },
  background: { primary: '#000000', secondary: '#0A0A0A', surface: 'rgba(10, 10, 10, 0.8)', elevated: '#111111' },
  text: {
    primary: '#FFFFFF', secondary: 'rgba(255, 255, 255, 0.85)', muted: 'rgba(255, 255, 255, 0.6)',
    heading: '#FFFFFF', subheading: 'rgba(255, 255, 255, 0.95)', body: 'rgba(255, 255, 255, 0.9)',
    label: 'rgba(255, 255, 255, 0.7)', accent: '#60C0F0',
  },
};

/**
 * DEEP OCEAN THEME — Navy-black with teal accents (developer portfolio inspired)
 */
export const deepOcean = {
  id: 'deep-ocean' as const,
  name: 'Deep Ocean',
  fonts,
  effects: { glassmorphism: true, glowIntensity: 'subtle' as const, cardStyle: 'glass' as const, borderGlow: true },
  colors: {
    deepSpace: '#0A192F', stardust: '#112240', void: '#020C1B',
    primary: '#64FFDA', primaryBlue: '#50D8B8', primaryDeep: '#0A192F', primaryLight: '#8AFFE8', primaryNeon: '#64FFDA',
    secondary: '#8892B0', secondaryLight: '#A8B2D1', secondaryDeep: '#495670',
    accent: '#C6A84B', accentLight: '#D4B85C', accentWarm: '#B8972E',
    wingPurple: '#8892B0', wingPurpleLight: '#A8B2D1', wingPurpleDeep: '#495670',
    white: '#CCD6F6', silver: '#8892B0', muted: 'rgba(204, 214, 246, 0.5)',
    error: '#F87171', success: '#64FFDA', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #64FFDA, #8892B0)', secondary: 'linear-gradient(135deg, #112240, #64FFDA)',
    cosmic: 'linear-gradient(135deg, #64FFDA, #0A192F)', hero: 'radial-gradient(ellipse at 30% 40%, rgba(100,255,218,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #112240 0%, #0A192F 70%)',
    card: 'rgba(17, 34, 64, 0.7)', accent: 'linear-gradient(135deg, #0A192F, #64FFDA)',
    stellar: 'linear-gradient(45deg, #64FFDA 0%, #C6A84B 100%)', swanCosmic: 'linear-gradient(135deg, #64FFDA, #8892B0)',
    glass: 'linear-gradient(135deg, rgba(17, 34, 64, 0.7), rgba(100, 255, 218, 0.03))',
  },
  shadows: {
    primary: '0 0 20px rgba(100, 255, 218, 0.15)', secondary: '0 0 20px rgba(136, 146, 176, 0.15)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(100, 255, 218, 0.1)', accent: '0 0 20px rgba(198, 168, 75, 0.3)',
    elevation: '0 15px 35px rgba(2, 12, 27, 0.7)', glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(10, 25, 47, 0.5)', button: '0 4px 20px rgba(100, 255, 218, 0.2)',
  },
  borders: {
    subtle: 'rgba(100, 255, 218, 0.08)', elegant: 'rgba(100, 255, 218, 0.15)', prominent: 'rgba(100, 255, 218, 0.3)',
    glass: '1px solid rgba(100, 255, 218, 0.1)', card: '1px solid rgba(100, 255, 218, 0.08)',
    focus: '2px solid #64FFDA', glow: '1px solid rgba(100, 255, 218, 0.15)',
  },
  background: { primary: '#0A192F', secondary: '#112240', surface: 'rgba(17, 34, 64, 0.7)', elevated: '#172A45' },
  text: {
    primary: '#CCD6F6', secondary: 'rgba(204, 214, 246, 0.8)', muted: 'rgba(136, 146, 176, 0.8)',
    heading: '#CCD6F6', subheading: '#A8B2D1', body: 'rgba(204, 214, 246, 0.85)',
    label: 'rgba(136, 146, 176, 0.8)', accent: '#64FFDA',
  },
};
