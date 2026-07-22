/**
 * newColorwaySpecs.ts
 * ===================
 * The NEW SwanStudios colorways (Swan Lens beautification, 2026-07-22).
 *
 * Authored to Kimi's locked design direction across consult rounds 1-4:
 *  - Curated families: apex-darks / jewel-gradients / frost-glass / heritage.
 *  - Variety spread: gradient-forward, clean-flat, light-glass (Sean's explicit ask —
 *    "some with gradients, some without, some with light glass").
 *  - Naming voice: two words, material/atmospheric (Ember Forge / Velvet Hour / Glacier
 *    Mint); no yoga/meditation/zen, no marketplace-neon names.
 *  - Semantic token roles honored (glow on fills, gradient on ONE signature surface).
 *
 * EVERY numeric claim (contrast, ΔE, cyan gate) is VERIFIED by the deterministic test
 * `newColorwaySpecs.audit.test.ts` (colorScience.ts). This module is data only; the
 * test is the source of truth for compliance. Values here were tuned until the audit
 * passed — no hand-fabricated ΔE/contrast numbers.
 *
 * Spec shape matches PremiumThemeSpec in UniversalThemePremiumThemes.ts. These are
 * spread into premiumThemeAdditions via makePremiumTheme().
 */

export interface NewColorwaySpec {
  id: string;
  name: string;
  family: 'apex-darks' | 'jewel-gradients' | 'frost-glass' | 'heritage';
  variety: 'gradient-forward' | 'clean-flat' | 'light-glass';
  identity: string;
  bg: string; bg2: string; surface: string; elevated: string;
  primary: string; primaryBlue: string; primaryDeep: string; primaryLight: string;
  secondary: string; secondaryLight: string; secondaryDeep: string;
  accent: string; accentLight: string; accentWarm: string;
  text: string; textSecondary: string; muted: string;
  danger: string; success: string; warning: string;
  glowPrimary: string; glowSecondary: string; focusRing: string; borderSubtle: string;
  onPrimary: string; onAccent: string;
  chart1: string; chart2: string; chart3: string;
  gradientFrom?: string; gradientTo?: string; gradientAngle?: number;
  glassBlur?: number; glassOpacity?: number;
}

export const NEW_COLORWAY_SPECS: NewColorwaySpec[] = [
  {
    id: 'ember-forge', name: 'Ember Forge', family: 'jewel-gradients', variety: 'gradient-forward',
    identity: 'Heat under pressure — molten amber over forged obsidian.',
    bg: '#0E0805', bg2: '#1A0E06', surface: 'rgba(40, 22, 10, 0.82)', elevated: '#331B0C',
    primary: '#FF9E4A', primaryBlue: '#F97316', primaryDeep: '#9A3B0B', primaryLight: '#FFC489',
    secondary: '#E0532B', secondaryLight: '#FB8B5E', secondaryDeep: '#7C2A12',
    accent: '#F6C453', accentLight: '#FBE0A2', accentWarm: '#C2410C',
    text: '#FFF3E8', textSecondary: 'rgba(255, 243, 232, 0.84)', muted: 'rgba(255, 243, 232, 0.70)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#F6C453',
    glowPrimary: 'rgba(255, 158, 74, 0.50)', glowSecondary: 'rgba(246, 196, 83, 0.34)',
    focusRing: '#FF9E4A', borderSubtle: 'rgba(255, 158, 74, 0.14)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#FF9E4A', chart2: '#F6C453', chart3: '#E0532B',
    gradientFrom: '#9A3B0B', gradientTo: '#FF9E4A', gradientAngle: 130,
  },
  {
    id: 'velvet-hour', name: 'Velvet Hour', family: 'jewel-gradients', variety: 'gradient-forward',
    identity: 'The last violet minute before night — plush and electric.',
    bg: '#0C0916', bg2: '#161029', surface: 'rgba(34, 22, 58, 0.82)', elevated: '#2A1B49',
    primary: '#B98CFF', primaryBlue: '#8B5CF6', primaryDeep: '#5B21B6', primaryLight: '#DDC9FF',
    secondary: '#E06BC8', secondaryLight: '#F3A8E0', secondaryDeep: '#86216F',
    accent: '#7CC7FF', accentLight: '#BBE1FF', accentWarm: '#4F92D8',
    text: '#F6F0FF', textSecondary: 'rgba(246, 240, 255, 0.84)', muted: 'rgba(246, 240, 255, 0.70)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#F6C453',
    glowPrimary: 'rgba(185, 140, 255, 0.50)', glowSecondary: 'rgba(124, 199, 255, 0.34)',
    focusRing: '#B98CFF', borderSubtle: 'rgba(185, 140, 255, 0.14)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#B98CFF', chart2: '#7CC7FF', chart3: '#E06BC8',
    gradientFrom: '#5B21B6', gradientTo: '#E06BC8', gradientAngle: 140,
  },
  {
    id: 'glacier-mint', name: 'Glacier Mint', family: 'frost-glass', variety: 'light-glass',
    identity: 'Cold clean air over a frosted vault — pale mint through glass.',
    bg: '#04110E', bg2: '#082019', surface: 'rgba(12, 44, 36, 0.62)', elevated: 'rgba(16, 58, 47, 0.72)',
    primary: '#5FE3B0', primaryBlue: '#2DD4A8', primaryDeep: '#0B6B52', primaryLight: '#A7F3D9',
    secondary: '#4FBFE0', secondaryLight: '#9BDFF2', secondaryDeep: '#0E5E76',
    accent: '#D9C77A', accentLight: '#EFE2AC', accentWarm: '#A88A2F',
    text: '#EAFBF4', textSecondary: 'rgba(234, 251, 244, 0.86)', muted: 'rgba(234, 251, 244, 0.72)',
    danger: '#FB7185', success: '#5FE3B0', warning: '#F6C453',
    glowPrimary: 'rgba(95, 227, 176, 0.46)', glowSecondary: 'rgba(217, 199, 122, 0.32)',
    focusRing: '#5FE3B0', borderSubtle: 'rgba(95, 227, 176, 0.16)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#5FE3B0', chart2: '#D9C77A', chart3: '#4FBFE0',
    glassBlur: 12, glassOpacity: 0.62,
  },
  {
    id: 'frost-lantern', name: 'Frost Lantern', family: 'frost-glass', variety: 'light-glass',
    identity: 'A warm gold lantern seen through frosted blue glass.',
    bg: '#050B16', bg2: '#0A1728', surface: 'rgba(16, 34, 58, 0.60)', elevated: 'rgba(20, 44, 74, 0.72)',
    primary: '#7BB8F5', primaryBlue: '#4F92E8', primaryDeep: '#1E4E8C', primaryLight: '#B9D9FB',
    secondary: '#E9C979', secondaryLight: '#F6E3AC', secondaryDeep: '#9A7A2A',
    accent: '#C9A8F0', accentLight: '#E4D2F9', accentWarm: '#8B5CF6',
    text: '#EAF2FD', textSecondary: 'rgba(234, 242, 253, 0.86)', muted: 'rgba(234, 242, 253, 0.72)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#E9C979',
    glowPrimary: 'rgba(123, 184, 245, 0.46)', glowSecondary: 'rgba(201, 168, 240, 0.32)',
    focusRing: '#7BB8F5', borderSubtle: 'rgba(123, 184, 245, 0.16)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#7BB8F5', chart2: '#E9C979', chart3: '#C9A8F0',
    glassBlur: 10, glassOpacity: 0.60,
  },
  {
    id: 'obsidian-rose', name: 'Obsidian Rose', family: 'apex-darks', variety: 'clean-flat',
    identity: 'Deep matte black with a single disciplined rose-gold edge.',
    bg: '#0B0709', bg2: '#150E11', surface: 'rgba(32, 22, 26, 0.86)', elevated: '#2A1D22',
    primary: '#F0A6B4', primaryBlue: '#E87A93', primaryDeep: '#9C3B54', primaryLight: '#F9CDD6',
    secondary: '#C08A5E', secondaryLight: '#E0B78E', secondaryDeep: '#7A5232',
    accent: '#E9C979', accentLight: '#F6E3AC', accentWarm: '#B08828',
    text: '#FBEEF0', textSecondary: 'rgba(251, 238, 240, 0.84)', muted: 'rgba(251, 238, 240, 0.70)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#E9C979',
    glowPrimary: 'rgba(240, 166, 180, 0.46)', glowSecondary: 'rgba(233, 201, 121, 0.32)',
    focusRing: '#F0A6B4', borderSubtle: 'rgba(240, 166, 180, 0.14)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#F0A6B4', chart2: '#E9C979', chart3: '#C08A5E',
  },
  {
    id: 'deep-current', name: 'Deep Current', family: 'apex-darks', variety: 'clean-flat',
    identity: 'The pressure of the deep — royal sapphire, no ornament.',
    bg: '#050912', bg2: '#0A1220', surface: 'rgba(16, 28, 50, 0.86)', elevated: '#152238',
    primary: '#6FA8F0', primaryBlue: '#4F86E0', primaryDeep: '#1E3E82', primaryLight: '#AFCBF7',
    secondary: '#5FC7C0', secondaryLight: '#9CE0DB', secondaryDeep: '#155E5A',
    accent: '#C6A84B', accentLight: '#E0CB86', accentWarm: '#96792E',
    text: '#EAF1FC', textSecondary: 'rgba(234, 241, 252, 0.84)', muted: 'rgba(234, 241, 252, 0.70)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#C6A84B',
    glowPrimary: 'rgba(111, 168, 240, 0.46)', glowSecondary: 'rgba(198, 168, 75, 0.32)',
    focusRing: '#6FA8F0', borderSubtle: 'rgba(111, 168, 240, 0.14)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#6FA8F0', chart2: '#C6A84B', chart3: '#5FC7C0',
  },
  {
    id: 'jade-reliquary', name: 'Jade Reliquary', family: 'jewel-gradients', variety: 'gradient-forward',
    identity: 'Carved jade lit from within — heirloom green and gold.',
    bg: '#05100B', bg2: '#0A2016', surface: 'rgba(14, 46, 32, 0.82)', elevated: '#123A28',
    primary: '#4FD597', primaryBlue: '#22C08A', primaryDeep: '#0A6B49', primaryLight: '#A3EDCB',
    secondary: '#D9B24C', secondaryLight: '#EDD388', secondaryDeep: '#8A6A1F',
    accent: '#E6C97A', accentLight: '#F3E2AC', accentWarm: '#A88A2F',
    text: '#EAFBF1', textSecondary: 'rgba(234, 251, 241, 0.84)', muted: 'rgba(234, 251, 241, 0.70)',
    danger: '#FB7185', success: '#4FD597', warning: '#E6C97A',
    glowPrimary: 'rgba(79, 213, 151, 0.48)', glowSecondary: 'rgba(230, 201, 122, 0.32)',
    focusRing: '#4FD597', borderSubtle: 'rgba(79, 213, 151, 0.14)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#4FD597', chart2: '#E6C97A', chart3: '#D9B24C',
    gradientFrom: '#0A6B49', gradientTo: '#4FD597', gradientAngle: 135,
  },
];
