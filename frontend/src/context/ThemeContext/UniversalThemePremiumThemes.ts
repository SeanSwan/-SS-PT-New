/**
 * UniversalThemePremiumThemes.ts
 * =============================
 *
 * Ten premium dark-first colorways for the universal SwanStudios theme changer.
 * The schema mirrors UniversalThemeContext themes so every dashboard can consume
 * the same CSS variable bridge without per-surface palette branches.
 */

const fonts = {
  heading: '"Plus Jakarta Sans", "Sora", sans-serif',
  drama: '"Cormorant Garamond", Georgia, serif',
  data: '"Fira Code", "Cascadia Code", monospace',
  ui: '"Sora", "Plus Jakarta Sans", sans-serif',
};

type PremiumThemeSpec = {
  id: string;
  name: string;
  bg: string;
  bg2: string;
  surface: string;
  elevated: string;
  primary: string;
  primaryBlue: string;
  primaryDeep: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  secondaryDeep: string;
  accent: string;
  accentLight: string;
  accentWarm: string;
  text: string;
  textSecondary: string;
  muted: string;
  danger?: string;
  success?: string;
  warning?: string;
};

const alpha = (hex: string, amount: number) => {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${amount})`;
};

const makePremiumTheme = (spec: PremiumThemeSpec) => ({
  id: spec.id,
  name: spec.name,
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'subtle' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: spec.bg,
    stardust: spec.bg2,
    void: '#030407',
    primary: spec.primary,
    primaryBlue: spec.primaryBlue,
    primaryDeep: spec.primaryDeep,
    primaryLight: spec.primaryLight,
    primaryNeon: spec.primary,
    secondary: spec.secondary,
    secondaryLight: spec.secondaryLight,
    secondaryDeep: spec.secondaryDeep,
    accent: spec.accent,
    accentLight: spec.accentLight,
    accentWarm: spec.accentWarm,
    wingPurple: spec.secondary,
    wingPurpleLight: spec.secondaryLight,
    wingPurpleDeep: spec.secondaryDeep,
    white: spec.text,
    silver: spec.textSecondary,
    muted: spec.muted,
    error: spec.danger || '#FB7185',
    success: spec.success || '#4ADE80',
    warning: spec.warning || '#FBBF24',
  },
  gradients: {
    primary: `linear-gradient(135deg, ${spec.primaryDeep}, ${spec.primary})`,
    secondary: `linear-gradient(135deg, ${spec.bg2}, ${spec.secondary})`,
    cosmic: `linear-gradient(135deg, ${spec.secondary}, ${spec.primary})`,
    hero: `radial-gradient(ellipse at 18% 24%, ${alpha(spec.primary, 0.18)} 0%, transparent 48%), radial-gradient(ellipse at 86% 72%, ${alpha(spec.accent, 0.14)} 0%, transparent 50%), radial-gradient(ellipse at center, ${spec.bg2} 0%, ${spec.bg} 72%)`,
    card: `linear-gradient(135deg, ${alpha(spec.primaryDeep, 0.28)}, ${alpha(spec.primary, 0.08)})`,
    accent: `linear-gradient(135deg, ${spec.bg}, ${spec.accent})`,
    stellar: `linear-gradient(45deg, ${spec.primary} 0%, ${spec.accent} 100%)`,
    swanCosmic: `linear-gradient(135deg, ${spec.primary}, ${spec.secondary})`,
    glass: `linear-gradient(135deg, ${alpha(spec.primaryDeep, 0.22)}, ${alpha(spec.primary, 0.08)})`,
  },
  shadows: {
    primary: `0 0 24px ${alpha(spec.primary, 0.24)}`,
    secondary: `0 0 22px ${alpha(spec.secondary, 0.22)}`,
    cosmic: `0 18px 48px rgba(0, 0, 0, 0.58), 0 0 52px ${alpha(spec.primary, 0.12)}`,
    accent: `0 0 20px ${alpha(spec.accent, 0.28)}`,
    elevation: '0 18px 42px rgba(0, 0, 0, 0.56)',
    glow: '0 0 20px currentColor',
    glass: `0 10px 34px ${alpha(spec.bg, 0.54)}`,
    button: `0 8px 24px ${alpha(spec.primary, 0.22)}`,
  },
  borders: {
    subtle: alpha(spec.primary, 0.1),
    elegant: alpha(spec.primary, 0.18),
    prominent: alpha(spec.primary, 0.34),
    glass: `1px solid ${alpha(spec.primary, 0.14)}`,
    card: `1px solid ${alpha(spec.primary, 0.12)}`,
    focus: `2px solid ${spec.primary}`,
    glow: `1px solid ${alpha(spec.secondary, 0.2)}`,
  },
  background: {
    primary: spec.bg,
    secondary: spec.bg2,
    surface: spec.surface,
    elevated: spec.elevated,
  },
  text: {
    primary: spec.text,
    secondary: spec.textSecondary,
    muted: spec.muted,
    heading: spec.text,
    subheading: spec.textSecondary,
    body: spec.textSecondary,
    label: spec.muted,
    accent: spec.primary,
  },
});

export const premiumThemeAdditions = {
  'ruby-forge': makePremiumTheme({
    id: 'ruby-forge', name: 'Ruby Forge', bg: '#10070A', bg2: '#1C0B10', surface: 'rgba(38, 12, 20, 0.82)', elevated: '#32111B',
    primary: '#FB7185', primaryBlue: '#F43F5E', primaryDeep: '#9F1239', primaryLight: '#FDA4AF',
    secondary: '#BE123C', secondaryLight: '#FB7185', secondaryDeep: '#7F1D1D', accent: '#FBBF24', accentLight: '#FDE68A', accentWarm: '#D97706',
    text: '#FFF1F3', textSecondary: 'rgba(255, 241, 243, 0.84)', muted: 'rgba(255, 241, 243, 0.62)',
  }),
  'emerald-vault': makePremiumTheme({
    id: 'emerald-vault', name: 'Emerald Vault', bg: '#04110D', bg2: '#08231B', surface: 'rgba(9, 45, 34, 0.78)', elevated: '#0B3A2B',
    primary: '#34D399', primaryBlue: '#10B981', primaryDeep: '#047857', primaryLight: '#A7F3D0',
    secondary: '#065F46', secondaryLight: '#34D399', secondaryDeep: '#064E3B', accent: '#D6B85A', accentLight: '#F3D675', accentWarm: '#B8942F',
    text: '#ECFDF5', textSecondary: 'rgba(236, 253, 245, 0.84)', muted: 'rgba(236, 253, 245, 0.62)',
  }),
  'solar-gold': makePremiumTheme({
    id: 'solar-gold', name: 'Solar Gold', bg: '#120C05', bg2: '#221408', surface: 'rgba(54, 32, 10, 0.8)', elevated: '#3A240D',
    primary: '#F6C453', primaryBlue: '#F59E0B', primaryDeep: '#B45309', primaryLight: '#FDE68A',
    secondary: '#9A3412', secondaryLight: '#FB923C', secondaryDeep: '#7C2D12', accent: '#F97316', accentLight: '#FDBA74', accentWarm: '#C2410C',
    text: '#FFF7ED', textSecondary: 'rgba(255, 247, 237, 0.84)', muted: 'rgba(255, 247, 237, 0.62)',
  }),
  'amethyst-night': makePremiumTheme({
    id: 'amethyst-night', name: 'Amethyst Night', bg: '#100A1F', bg2: '#1D1233', surface: 'rgba(38, 24, 68, 0.78)', elevated: '#2B1A4D',
    primary: '#C084FC', primaryBlue: '#A855F7', primaryDeep: '#7C3AED', primaryLight: '#E9D5FF',
    secondary: '#67E8F9', secondaryLight: '#A5F3FC', secondaryDeep: '#0E7490', accent: '#F0ABFC', accentLight: '#F5D0FE', accentWarm: '#D946EF',
    text: '#F7F0FF', textSecondary: 'rgba(247, 240, 255, 0.84)', muted: 'rgba(247, 240, 255, 0.62)',
  }),
  'rose-quartz': makePremiumTheme({
    id: 'rose-quartz', name: 'Rose Quartz', bg: '#160A12', bg2: '#26101F', surface: 'rgba(56, 20, 44, 0.78)', elevated: '#3A1830',
    primary: '#FB7185', primaryBlue: '#F472B6', primaryDeep: '#BE185D', primaryLight: '#FBCFE8',
    secondary: '#A21CAF', secondaryLight: '#F0ABFC', secondaryDeep: '#701A75', accent: '#F9A8D4', accentLight: '#FCE7F3', accentWarm: '#DB2777',
    text: '#FFF1F7', textSecondary: 'rgba(255, 241, 247, 0.84)', muted: 'rgba(255, 241, 247, 0.62)',
  }),
  'copper-patina': makePremiumTheme({
    id: 'copper-patina', name: 'Copper Patina', bg: '#120B06', bg2: '#24150C', surface: 'rgba(50, 31, 17, 0.8)', elevated: '#392313',
    primary: '#D97706', primaryBlue: '#F59E0B', primaryDeep: '#92400E', primaryLight: '#FCD34D',
    secondary: '#0F766E', secondaryLight: '#5EEAD4', secondaryDeep: '#134E4A', accent: '#34D399', accentLight: '#99F6E4', accentWarm: '#B45309',
    text: '#FFF7ED', textSecondary: 'rgba(255, 247, 237, 0.84)', muted: 'rgba(255, 247, 237, 0.62)',
  }),
  'aqua-abyss': makePremiumTheme({
    id: 'aqua-abyss', name: 'Aqua Abyss', bg: '#031018', bg2: '#082334', surface: 'rgba(8, 45, 66, 0.78)', elevated: '#0B3B56',
    primary: '#22D3EE', primaryBlue: '#06B6D4', primaryDeep: '#0E7490', primaryLight: '#A5F3FC',
    secondary: '#2563EB', secondaryLight: '#93C5FD', secondaryDeep: '#1E3A8A', accent: '#A3E635', accentLight: '#D9F99D', accentWarm: '#65A30D',
    text: '#ECFEFF', textSecondary: 'rgba(236, 254, 255, 0.84)', muted: 'rgba(236, 254, 255, 0.62)',
  }),
  'graphite-luxe': makePremiumTheme({
    id: 'graphite-luxe', name: 'Graphite Luxe', bg: '#09090B', bg2: '#121318', surface: 'rgba(28, 30, 36, 0.84)', elevated: '#20232A',
    primary: '#D1D5DB', primaryBlue: '#9CA3AF', primaryDeep: '#4B5563', primaryLight: '#F3F4F6',
    secondary: '#6B7280', secondaryLight: '#D1D5DB', secondaryDeep: '#374151', accent: '#C6A84B', accentLight: '#E5CF7A', accentWarm: '#A4872F',
    text: '#F9FAFB', textSecondary: 'rgba(249, 250, 251, 0.82)', muted: 'rgba(209, 213, 219, 0.62)',
  }),
  'pearl-noir': makePremiumTheme({
    id: 'pearl-noir', name: 'Pearl Noir', bg: '#070608', bg2: '#171218', surface: 'rgba(35, 28, 37, 0.82)', elevated: '#2A222D',
    primary: '#F5E7D3', primaryBlue: '#E7D4BA', primaryDeep: '#8B735C', primaryLight: '#FFF7ED',
    secondary: '#A78BFA', secondaryLight: '#DDD6FE', secondaryDeep: '#6D28D9', accent: '#EAB308', accentLight: '#FDE68A', accentWarm: '#A16207',
    text: '#FFF8F0', textSecondary: 'rgba(255, 248, 240, 0.84)', muted: 'rgba(245, 231, 211, 0.62)',
  }),
  'circuit-lime': makePremiumTheme({
    id: 'circuit-lime', name: 'Circuit Lime', bg: '#071104', bg2: '#102008', surface: 'rgba(25, 50, 12, 0.78)', elevated: '#1D340D',
    primary: '#A3E635', primaryBlue: '#84CC16', primaryDeep: '#4D7C0F', primaryLight: '#D9F99D',
    secondary: '#22C55E', secondaryLight: '#86EFAC', secondaryDeep: '#166534', accent: '#38BDF8', accentLight: '#BAE6FD', accentWarm: '#0284C7',
    text: '#F7FEE7', textSecondary: 'rgba(247, 254, 231, 0.84)', muted: 'rgba(247, 254, 231, 0.62)',
  }),
} as const;
