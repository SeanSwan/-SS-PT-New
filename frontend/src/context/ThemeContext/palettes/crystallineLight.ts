/**
 * palettes/crystallineLight.ts
 * ============================
 *
 * crystalline default, crystalline light.
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
 * CRYSTALLINE DEFAULT THEME — "Crystalline Swan"
 * Enhanced Enchanted Navy with aurora-effect hero, glass cards, and Ice Wing glow halos.
 * Background: #001545 (deeper navy)
 * Primary accent: #60C0F0 (Ice Wing)
 * Gold accent: #C6A84B (Gilded Fern) — more prominent
 */
export const crystallineDefault = {
  id: 'crystalline-default' as const,
  name: 'Crystalline Swan',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'subtle' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#001545',
    stardust: '#002060',
    void: '#000A20',

    primary: '#60C0F0',
    primaryBlue: '#50A0F0',
    primaryDeep: '#4070C0',
    primaryLight: '#90D4F8',
    primaryNeon: '#60C0F0',

    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#003080',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#7C3AED',

    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.7)',
    error: '#FF6B6B',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    secondary: 'linear-gradient(135deg, #002060, #4070C0)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #50A0F0)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(96,192,240,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(198,168,75,0.1) 0%, transparent 50%), radial-gradient(ellipse at center, #002060 0%, #001545 70%)',
    card: 'linear-gradient(135deg, rgba(0, 48, 128, 0.5), rgba(96, 192, 240, 0.08))',
    accent: 'linear-gradient(135deg, #001545, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #4070C0)',
    glass: 'linear-gradient(135deg, rgba(0, 32, 96, 0.5), rgba(96, 192, 240, 0.12))',
  },
  shadows: {
    primary: '0 0 25px rgba(96, 192, 240, 0.25)',
    secondary: '0 0 20px rgba(64, 112, 192, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(96, 192, 240, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(0, 21, 69, 0.4)',
    button: '0 4px 20px rgba(139, 92, 246, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.2)',
    prominent: 'rgba(80, 160, 240, 0.4)',
    glass: '1px solid rgba(96, 192, 240, 0.18)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #8B5CF6',
    glow: '1px solid rgba(139, 92, 246, 0.2)',
  },
  background: {
    primary: '#001545',
    secondary: '#002060',
    surface: 'rgba(0, 32, 96, 0.45)',
    elevated: 'rgba(0, 48, 128, 0.4)',
  },
  text: {
    primary: '#F8FAFC',
    secondary: 'rgba(248, 250, 252, 0.85)',
    muted: 'rgba(248, 250, 252, 0.6)',
    heading: '#F8FAFC',
    subheading: 'rgba(248, 250, 252, 0.9)',
    body: 'rgba(248, 250, 252, 0.85)',
    label: 'rgba(248, 250, 252, 0.7)',
    accent: '#60C0F0',
  },
};

/**
 * ARCTIC DAWN THEME — "Arctic Dawn"
 * Premium icy light theme with readable slate text and platinum glass.
 * Background: #E6EEF5 (blue-tinted platinum, not whiteout)
 * Primary accent: #0284C7 (controlled icy blue)
 * Legacy accent: #6D28D9 (Wing Purple nod to roots)
 * Gold accent: #C6A84B
 */
export const crystallineLight = {
  id: 'crystalline-light' as const,
  name: 'Arctic Dawn',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'subtle' as const,
    cardStyle: 'glass' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#E6EEF5',
    stardust: '#D6E4EF',
    void: '#0B1726',

    primary: '#0284C7',
    primaryBlue: '#0369A1',
    primaryDeep: '#075985',
    primaryLight: '#38BDF8',
    primaryNeon: '#0EA5E9',

    secondary: '#345B9A',
    secondaryLight: '#5F82C4',
    secondaryDeep: '#102A56',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#8A6A1F',

    wingPurple: '#6D28D9',
    wingPurpleLight: '#8B5CF6',
    wingPurpleDeep: '#4C1D95',

    white: '#F8FBFF',
    silver: '#E6EEF5',
    muted: 'rgba(15, 23, 42, 0.68)',
    error: '#DC2626',
    success: '#15803D',
    warning: '#A16207',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #075985, #0284C7)',
    secondary: 'linear-gradient(135deg, #D6E4EF, #F8FBFF)',
    cosmic: 'linear-gradient(135deg, #6D28D9, #075985)',
    hero: 'linear-gradient(135deg, #E6EEF5 0%, #D6E4EF 48%, #C9DCEB 100%)',
    card: 'linear-gradient(135deg, rgba(248, 251, 255, 0.96), rgba(214, 228, 239, 0.74))',
    accent: 'linear-gradient(135deg, #8A6A1F, #C6A84B)',
    stellar: 'linear-gradient(45deg, #075985 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #075985, #345B9A)',
    glass: 'linear-gradient(135deg, rgba(248, 251, 255, 0.94), rgba(214, 228, 239, 0.68))',
  },
  shadows: {
    primary: '0 3px 14px rgba(2, 132, 199, 0.16)',
    secondary: '0 2px 8px rgba(16, 42, 86, 0.1)',
    cosmic: '0 14px 42px rgba(16, 42, 86, 0.16), 0 2px 10px rgba(2, 132, 199, 0.12)',
    accent: '0 3px 12px rgba(198, 168, 75, 0.24)',
    elevation: '0 14px 36px rgba(16, 42, 86, 0.14)',
    glow: '0 0 0 transparent',
    glass: '0 12px 34px rgba(16, 42, 86, 0.12)',
    button: '0 4px 18px rgba(109, 40, 217, 0.22)',
  },
  borders: {
    subtle: 'rgba(7, 89, 133, 0.18)',
    elegant: '#9AB6CA',
    prominent: '#6F94AF',
    glass: '1px solid rgba(7, 89, 133, 0.18)',
    card: '1px solid rgba(7, 89, 133, 0.16)',
    focus: '2px solid #6D28D9',
    glow: '1px solid rgba(109, 40, 217, 0.22)',
  },
  background: {
    primary: '#E6EEF5',
    secondary: '#D6E4EF',
    surface: 'rgba(248, 251, 255, 0.94)',
    elevated: 'rgba(241, 247, 252, 0.98)',
  },
  text: {
    primary: '#0B1726',
    secondary: '#243447',
    muted: '#334155',
    heading: '#0B1726',
    subheading: '#172033',
    body: '#243447',
    label: '#334155',
    accent: '#0369A1',
  },
};
