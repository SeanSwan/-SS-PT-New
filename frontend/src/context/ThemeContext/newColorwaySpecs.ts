/**
 * newColorwaySpecs.ts
 * ===================
 * The NEW SwanStudios colorways (Swan Lens finishing pass, 2026-07-22).
 *
 * Kimi's steer across 5 consult rounds: FEWER, DEEPER, more beautiful — not "a lot more."
 * The existing 20 premium colorways already crowd the OKLab hue wheel, so a curated FOUR
 * (one per open lane: deep-scarlet / clean-lime / deep-indigo / orchid-violet) that each
 * clearly clear the distinctness gate beats eight near-duplicates.
 *
 * Variety spread (Sean's ask — "some gradients, some flat, some light glass"):
 *   - crimson-vault  → apex-darks, clean-flat
 *   - verdant-signal → apex-darks, clean-flat
 *   - indigo-rite    → jewel-gradients, gradient-forward
 *   - violet-ember   → frost-glass, light-glass
 *
 * EVERY numeric claim (contrast, ΔE, cyan gate) is VERIFIED by the deterministic test
 * `newColorwaySpecs.audit.test.ts` (colorScience.ts) — no hand-fabricated numbers. Primaries
 * were chosen by a gap solver + refined for brand, then gate-checked:
 *   crimson-vault  #E23A56  nnΔE 8.5   onPrimary #0A0A0F (4.7)
 *   verdant-signal #5FC93F  nnΔE 9.1   onPrimary #0A0A0F (9.3)
 *   indigo-rite    #6D3AE8  nnΔE 18.3  onPrimary #FFFFFF (6.1)
 *   violet-ember   #B04AE6  nnΔE 12.4  onPrimary #0A0A0F (4.7)
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
    id: 'crimson-vault', name: 'Crimson Vault', family: 'apex-darks', variety: 'clean-flat',
    identity: 'A sealed vault lit by one deep scarlet seam — disciplined, no ornament.',
    bg: '#0D0608', bg2: '#170A0D', surface: 'rgba(36, 16, 20, 0.86)', elevated: '#2A141A',
    primary: '#E23A56', primaryBlue: '#F0526E', primaryDeep: '#8E1E32', primaryLight: '#F49CAA',
    secondary: '#C0603E', secondaryLight: '#E0956E', secondaryDeep: '#7A3520',
    accent: '#E9C979', accentLight: '#F6E3AC', accentWarm: '#B08828',
    text: '#FBECEE', textSecondary: 'rgba(251, 236, 238, 0.84)', muted: 'rgba(251, 236, 238, 0.72)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#E9C979',
    glowPrimary: 'rgba(226, 58, 86, 0.48)', glowSecondary: 'rgba(233, 201, 121, 0.32)',
    focusRing: '#E23A56', borderSubtle: 'rgba(226, 58, 86, 0.14)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#E23A56', chart2: '#E9C979', chart3: '#C0603E',
  },
  {
    id: 'verdant-signal', name: 'Verdant Signal', family: 'apex-darks', variety: 'clean-flat',
    identity: 'A clean green signal cutting through deep pine dark — alive, legible.',
    bg: '#060F07', bg2: '#0B1D0D', surface: 'rgba(16, 40, 20, 0.86)', elevated: '#123A1B',
    primary: '#5FC93F', primaryBlue: '#3FB02A', primaryDeep: '#256B14', primaryLight: '#A7E88F',
    secondary: '#3FA9C0', secondaryLight: '#8FD3E0', secondaryDeep: '#155E6E',
    accent: '#E9C979', accentLight: '#F6E3AC', accentWarm: '#A88A2F',
    text: '#EDFBEA', textSecondary: 'rgba(237, 251, 234, 0.84)', muted: 'rgba(237, 251, 234, 0.72)',
    danger: '#FB7185', success: '#5FC93F', warning: '#E9C979',
    glowPrimary: 'rgba(95, 201, 63, 0.46)', glowSecondary: 'rgba(233, 201, 121, 0.32)',
    focusRing: '#5FC93F', borderSubtle: 'rgba(95, 201, 63, 0.14)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#5FC93F', chart2: '#E9C979', chart3: '#3FA9C0',
  },
  {
    id: 'indigo-rite', name: 'Indigo Rite', family: 'jewel-gradients', variety: 'gradient-forward',
    identity: 'A deep indigo procession — ceremonial violet light rising from the dark.',
    bg: '#08061A', bg2: '#100C2C', surface: 'rgba(26, 20, 58, 0.84)', elevated: '#1C1648',
    primary: '#6D3AE8', primaryBlue: '#5A2AD0', primaryDeep: '#3B1A8C', primaryLight: '#B49CF5',
    secondary: '#C05AE0', secondaryLight: '#E0A8F0', secondaryDeep: '#7A2196',
    accent: '#7CC7FF', accentLight: '#BBE1FF', accentWarm: '#4F92D8',
    text: '#F1ECFE', textSecondary: 'rgba(241, 236, 254, 0.84)', muted: 'rgba(241, 236, 254, 0.72)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#F6C453',
    glowPrimary: 'rgba(109, 58, 232, 0.50)', glowSecondary: 'rgba(124, 199, 255, 0.34)',
    focusRing: '#8A5CF0', borderSubtle: 'rgba(109, 58, 232, 0.16)',
    onPrimary: '#FFFFFF', onAccent: '#0A0A0F',
    chart1: '#8A5CF0', chart2: '#7CC7FF', chart3: '#C05AE0',
    gradientFrom: '#3B1A8C', gradientTo: '#6D3AE8', gradientAngle: 140,
  },
  {
    id: 'violet-ember', name: 'Violet Ember', family: 'frost-glass', variety: 'light-glass',
    identity: 'Orchid embers behind frosted glass — warm violet glow through a cold pane.',
    bg: '#0C0714', bg2: '#160C22', surface: 'rgba(34, 20, 48, 0.60)', elevated: 'rgba(44, 26, 62, 0.72)',
    primary: '#B04AE6', primaryBlue: '#9A34D8', primaryDeep: '#5E1E8C', primaryLight: '#D8A8F3',
    secondary: '#E06B9A', secondaryLight: '#F3A8C4', secondaryDeep: '#8A2158',
    accent: '#E9C979', accentLight: '#F6E3AC', accentWarm: '#A88A2F',
    text: '#F5ECFB', textSecondary: 'rgba(245, 236, 251, 0.86)', muted: 'rgba(245, 236, 251, 0.74)',
    danger: '#FB7185', success: '#5FCE8F', warning: '#E9C979',
    glowPrimary: 'rgba(176, 74, 230, 0.48)', glowSecondary: 'rgba(233, 201, 121, 0.32)',
    focusRing: '#B04AE6', borderSubtle: 'rgba(176, 74, 230, 0.16)',
    onPrimary: '#0A0A0F', onAccent: '#0A0A0F',
    chart1: '#B04AE6', chart2: '#E9C979', chart3: '#E06B9A',
    glassBlur: 12, glassOpacity: 0.60,
  },
];
