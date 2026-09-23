/**
 * palettes/emberRealm.ts
 * ======================
 *
 * cinematic ember, ember realm.
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
 * CINEMATIC EMBER THEME — "Obsidian Ember"
 * Warm cinematic dark theme. Charcoal blacks with amber/rose gold accents.
 * Inspired by luxury cinema lobbies and fireside lounges.
 * Background: #1A0F0A (deep warm black)
 * Primary accent: #F59E0B (amber gold)
 * Secondary: #E11D48 (rose)
 */
export const cinematicEmber = {
  id: 'cinematic-ember' as const,
  name: 'Obsidian Ember',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'elegant' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#1A0F0A',
    stardust: '#2D1810',
    void: '#0D0705',

    primary: '#F59E0B',
    primaryBlue: '#D97706',
    primaryDeep: '#B45309',
    primaryLight: '#FBBF24',
    primaryNeon: '#FCD34D',

    secondary: '#E11D48',
    secondaryLight: '#FB7185',
    secondaryDeep: '#BE123C',

    accent: '#C6A84B',
    accentLight: '#D4B85A',
    accentWarm: '#B8860B',

    wingPurple: '#E11D48',
    wingPurpleLight: '#FB7185',
    wingPurpleDeep: '#BE123C',

    white: '#FFF5EB',
    silver: '#F5E6D3',
    muted: 'rgba(245, 230, 211, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #1A0F0A, #F59E0B)',
    secondary: 'linear-gradient(135deg, #2D1810, #E11D48)',
    cosmic: 'linear-gradient(135deg, #1A0F0A, #D97706)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(245,158,11,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(225,29,72,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #2D1810 0%, #1A0F0A 70%)',
    card: 'rgba(45, 24, 16, 0.7)',
    accent: 'linear-gradient(135deg, #1A0F0A, #C6A84B)',
    stellar: 'linear-gradient(45deg, #F59E0B 0%, #E11D48 100%)',
    swanCosmic: 'linear-gradient(135deg, #F59E0B, #E11D48)',
    glass: 'linear-gradient(135deg, rgba(45, 24, 16, 0.7), rgba(245, 158, 11, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(245, 158, 11, 0.25)',
    secondary: '0 0 25px rgba(225, 29, 72, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(245, 158, 11, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(26, 15, 10, 0.5)',
    button: '0 4px 20px rgba(245, 158, 11, 0.3)',
  },
  borders: {
    subtle: 'rgba(245, 158, 11, 0.1)',
    elegant: 'rgba(245, 158, 11, 0.25)',
    prominent: 'rgba(245, 158, 11, 0.4)',
    glass: '1px solid rgba(245, 158, 11, 0.2)',
    card: '1px solid rgba(245, 158, 11, 0.15)',
    focus: '2px solid #E11D48',
    glow: '1px solid rgba(225, 29, 72, 0.2)',
  },
  background: {
    primary: '#1A0F0A',
    secondary: '#2D1810',
    surface: 'rgba(45, 24, 16, 0.6)',
    elevated: 'rgba(45, 24, 16, 0.5)',
  },
  text: {
    primary: '#FFF5EB',
    secondary: 'rgba(245, 230, 211, 0.85)',
    muted: 'rgba(245, 230, 211, 0.55)',
    heading: '#FFF5EB',
    subheading: 'rgba(245, 230, 211, 0.9)',
    body: 'rgba(245, 230, 211, 0.85)',
    label: 'rgba(245, 230, 211, 0.65)',
    accent: '#F59E0B',
  },
};

/**
 * EMBER REALM THEME — "Ember Realm"
 * Warrior Forge aesthetic. Deep crimson-black backgrounds with orange fire
 * and red accents. Inspired by forges, volcanic landscapes, and battle arenas.
 * Background: #120808 (deep crimson-black)
 * Primary accent: #FF6B2C (fire orange / gaming)
 * Secondary: #DC2626 (crimson red)
 * Gold accent: #C6A84B
 */
export const emberRealm = {
  id: 'ember-realm' as const,
  name: 'Ember Realm',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'intense' as const,
    cardStyle: 'elegant' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#120808',
    stardust: '#1E0E0E',
    void: '#080404',

    primary: '#FF6B2C',
    primaryBlue: '#E05A20',
    primaryDeep: '#C04A18',
    primaryLight: '#FF9966',
    primaryNeon: '#FF6B2C',

    secondary: '#DC2626',
    secondaryLight: '#EF4444',
    secondaryDeep: '#B91C1C',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#DC2626',
    wingPurpleLight: '#EF4444',
    wingPurpleDeep: '#B91C1C',

    white: '#FFF0E0',
    silver: '#F0D8C0',
    muted: 'rgba(255, 240, 224, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #FF6B2C, #DC2626)',
    secondary: 'linear-gradient(135deg, #1E0E0E, #DC2626)',
    cosmic: 'linear-gradient(135deg, #FF6B2C, #DC2626)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(255,107,44,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(220,38,38,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #1E0E0E 0%, #120808 70%)',
    card: 'rgba(30, 14, 14, 0.7)',
    accent: 'linear-gradient(135deg, #120808, #C6A84B)',
    stellar: 'linear-gradient(45deg, #FF6B2C 0%, #DC2626 100%)',
    swanCosmic: 'linear-gradient(135deg, #FF6B2C, #DC2626)',
    glass: 'linear-gradient(135deg, rgba(30, 14, 14, 0.7), rgba(255, 107, 44, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(255, 107, 44, 0.3)',
    secondary: '0 0 25px rgba(220, 38, 38, 0.25)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(255, 107, 44, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(18, 8, 8, 0.6)',
    button: '0 4px 20px rgba(255, 107, 44, 0.35)',
  },
  borders: {
    subtle: 'rgba(255, 107, 44, 0.1)',
    elegant: 'rgba(255, 107, 44, 0.25)',
    prominent: 'rgba(220, 38, 38, 0.4)',
    glass: '1px solid rgba(255, 107, 44, 0.2)',
    card: '1px solid rgba(255, 107, 44, 0.15)',
    focus: '2px solid #DC2626',
    glow: '1px solid rgba(220, 38, 38, 0.25)',
  },
  background: {
    primary: '#120808',
    secondary: '#1E0E0E',
    surface: 'rgba(30, 14, 14, 0.6)',
    elevated: 'rgba(30, 14, 14, 0.5)',
  },
  text: {
    primary: '#FFF0E0',
    secondary: 'rgba(255, 240, 224, 0.85)',
    muted: 'rgba(255, 240, 224, 0.55)',
    heading: '#FFF0E0',
    subheading: 'rgba(255, 240, 224, 0.9)',
    body: 'rgba(255, 240, 224, 0.85)',
    label: 'rgba(255, 240, 224, 0.65)',
    accent: '#FF6B2C',
  },
};
