/**
 * Swan tier names, colors, and lookup helpers for gamification surfaces.
 * Extracted from styled-gamification-system.ts without runtime behavior changes.
 */

export const SWAN_TIERS = {
  bronze:   { label: 'Cygnus Initiate',      color: '#002060', bg: 'rgba(0, 32, 96, 0.20)',     glow: 'rgba(0, 32, 96, 0.4)' },
  silver:   { label: 'Frostwing Ascendant',   color: '#60C0F0', bg: 'rgba(96, 192, 240, 0.15)',  glow: 'rgba(96, 192, 240, 0.4)' },
  gold:     { label: 'Gilded Sovereign',      color: '#C6A84B', bg: 'rgba(198, 168, 75, 0.15)',  glow: 'rgba(198, 168, 75, 0.4)' },
  platinum: { label: 'Amethyst Apex',         color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)',  glow: 'rgba(139, 92, 246, 0.4)' },
} as const;


export const CRYSTALLINE_SWAN = {
  label: 'Crystalline Swan',
  color: '#E0ECF4',
  bg: 'rgba(224, 236, 244, 0.10)',
  glow: 'rgba(224, 236, 244, 0.5)',
  gradient: 'linear-gradient(135deg, #60C0F0, #8B5CF6, #C6A84B)',
};

export type SwanTier = keyof typeof SWAN_TIERS;

export function getSwanTierColor(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.color || '#002060';
}

export function getSwanTierBg(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.bg || 'rgba(0, 32, 96, 0.20)';
}

export function getSwanTierLabel(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.label || 'Cygnus Initiate';
}

export function getSwanTierGlow(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.glow || 'rgba(0, 32, 96, 0.4)';
}
