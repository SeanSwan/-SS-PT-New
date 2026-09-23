/**
 * themeToggleMetadata.ts
 * ======================
 *
 * Accessible label + glyph for every theme the header lens can reach.
 *
 * Two things changed here on 2026-09-18:
 *
 * 1. `description` is no longer a hand-maintained second copy of the theme name.
 *    It is read from `themes[themeId].name`, so a renamed theme can never drift
 *    out of sync with what the lens announces.
 * 2. Every theme now has its OWN glyph. Previously three themes shared `flame`,
 *    three shared `waves`, two shared `gem` and so on — which meant colour was the
 *    only channel distinguishing them, on the one control whose whole job is to
 *    tell you which theme is active. Distinct glyphs make the lens readable
 *    without relying on colour perception.
 */

import React from 'react';
import {
  Anchor,
  CircuitBoard,
  Contrast,
  Crown,
  Droplets,
  Flame,
  Flower,
  Flower2,
  Gem,
  Grid3x3,
  Hammer,
  Hexagon,
  Layers,
  Leaf,
  Lock,
  Moon,
  MoonStar,
  Mountain,
  Orbit,
  Shell,
  Snowflake,
  Sparkles,
  Sun,
  Sunrise,
  Swords,
  TreePine,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { themes, themeCycle, type ThemeId } from './UniversalThemeContext';

export type ThemeIconKey =
  | 'anchor'
  | 'circuit'
  | 'contrast'
  | 'crown'
  | 'droplets'
  | 'flame'
  | 'flower'
  | 'flower2'
  | 'gem'
  | 'grid'
  | 'hammer'
  | 'hexagon'
  | 'layers'
  | 'leaf'
  | 'lock'
  | 'moon'
  | 'moonStar'
  | 'mountain'
  | 'orbit'
  | 'shell'
  | 'snowflake'
  | 'sparkles'
  | 'sun'
  | 'sunrise'
  | 'swords'
  | 'tree'
  | 'waves'
  | 'zap';

const ICONS: Record<ThemeIconKey, LucideIcon> = {
  anchor: Anchor,
  circuit: CircuitBoard,
  contrast: Contrast,
  crown: Crown,
  droplets: Droplets,
  flame: Flame,
  flower: Flower,
  flower2: Flower2,
  gem: Gem,
  grid: Grid3x3,
  hammer: Hammer,
  hexagon: Hexagon,
  layers: Layers,
  leaf: Leaf,
  lock: Lock,
  moon: Moon,
  moonStar: MoonStar,
  mountain: Mountain,
  orbit: Orbit,
  shell: Shell,
  snowflake: Snowflake,
  sparkles: Sparkles,
  sun: Sun,
  sunrise: Sunrise,
  swords: Swords,
  tree: TreePine,
  waves: Waves,
  zap: Zap,
};

const DEFAULT_ICON: ThemeIconKey = 'sparkles';

/** One distinct glyph per theme — no two themes share one. */
export const themeIconKeys: Record<ThemeId, ThemeIconKey> = {
  'crystalline-default': 'sparkles',
  'crystalline-light': 'sunrise',
  'crystalline-dark': 'zap',
  'crystalline-mono': 'moon',
  'cinematic-ember': 'flame',
  'frozen-aurora': 'snowflake',
  'obsidian-black': 'contrast',
  'cyberpunk-edgerunners': 'swords',
  'obsidian-bloom': 'flower',
  'frozen-canopy': 'tree',
  'ember-realm': 'mountain',
  'twilight-lagoon': 'waves',
  'nebula-crown': 'crown',
  'enchanted-forest': 'leaf',
  'void-crystal': 'gem',
  'deep-ocean': 'anchor',
  'obsidian-aurora': 'orbit',
  'carbon-fiber': 'grid',
  'ruby-forge': 'hammer',
  'emerald-vault': 'lock',
  'solar-gold': 'sun',
  'amethyst-night': 'moonStar',
  'rose-quartz': 'flower2',
  'copper-patina': 'hexagon',
  'aqua-abyss': 'droplets',
  'graphite-luxe': 'layers',
  'pearl-noir': 'shell',
  'circuit-lime': 'circuit',
};

export interface ThemeToggleMetadataEntry {
  description: string;
  icon: ThemeIconKey;
}

/**
 * Built by walking `themeCycle`, so key order always matches the cycle and the
 * accessible name always matches `themes[id].name`.
 */
export const themeToggleMetadata: Record<ThemeId, ThemeToggleMetadataEntry> = Object.fromEntries(
  themeCycle.map((themeId) => [
    themeId,
    {
      description: themes[themeId].name,
      icon: themeIconKeys[themeId] ?? DEFAULT_ICON,
    },
  ])
) as Record<ThemeId, ThemeToggleMetadataEntry>;

export const getThemeDescription = (themeId: ThemeId): string =>
  themeToggleMetadata[themeId]?.description ?? themes[themeId]?.name ?? String(themeId);

export const getThemeIconKey = (themeId: ThemeId): ThemeIconKey =>
  themeToggleMetadata[themeId]?.icon ?? DEFAULT_ICON;

interface ThemeLensIconProps {
  themeId: ThemeId;
  size?: number;
}

/** Renders the glyph for a theme. Never throws for an unknown theme. */
export const ThemeLensIcon: React.FC<ThemeLensIconProps> = ({ themeId, size = 20 }) => {
  const Icon = ICONS[getThemeIconKey(themeId)] ?? ICONS[DEFAULT_ICON];
  return <Icon size={size} />;
};

export default themeToggleMetadata;
