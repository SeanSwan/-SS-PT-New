/**
 * themePalettes.ts
 * ================
 *
 * The 28 theme palettes — assembled here, authored in `palettes/`.
 *
 * HISTORY, because the shape of this file was a review finding twice.
 * The 28 palettes were once a single 1,596-line table with a RULE 4 EXEMPTION
 * attached ("it is a data table, nothing to extract"). HY4 round 2 (MEDIUM #3)
 * called that out correctly: an exemption invented by the person it benefits turns
 * a hard cap into a suggestion, and any large module can claim to be a data table.
 * The exemption is deleted. The 18 base literals now live in eight family modules
 * under `palettes/`, each well under the cap, and this file is the aggregator.
 *
 * The split was MECHANICAL — `tmp/theme-lens-harness/split-palettes.mjs` sliced the
 * old file by line range and added `export` to each declaration; not one colour
 * value was retyped. Drift is then ruled out by resolving the module and diffing
 * the resulting object (`extract-themes.mjs`), not by reading the source.
 *
 * ⚠ KEY ORDER IS LOAD-BEARING. `themeCycle` is `Object.keys(themes)`, so the order
 * of the spread below is the order the theme lens cycles through. Insertions belong
 * at the end of the base block, or in `palettes/`'s owner list, deliberately.
 *
 * The 10 premium colorways are built by `makePremiumTheme` in
 * UniversalThemePremiumThemes.ts and spread in last, exactly as before.
 *
 * Every consumer that used to import `themes` from UniversalThemeContext still can:
 * that module re-exports everything here.
 */

import { premiumThemeAdditions } from './UniversalThemePremiumThemes';
import { crystallineDefault, crystallineLight } from './palettes/crystallineLight';
import { crystallineDark, crystallineMono } from './palettes/crystallineDark';
import { cinematicEmber } from './palettes/emberRealm';
import { frozenAurora } from './palettes/frozenRealm';
import { obsidianBlack, obsidianBloom, obsidianAurora } from './palettes/obsidian';
import { cyberpunkEdgerunners, nebulaCrown, carbonFiber } from './palettes/chromatic';
import { frozenCanopy } from './palettes/frozenRealm';
import { emberRealm } from './palettes/emberRealm';
import { twilightLagoon, enchantedForest } from './palettes/atelier';
import { voidCrystal, deepOcean } from './palettes/abyss';

// === THEME MAPPING ===
export const themes = {
  'crystalline-default': crystallineDefault,
  'crystalline-light': crystallineLight,
  'crystalline-dark': crystallineDark,
  'crystalline-mono': crystallineMono,
  'cinematic-ember': cinematicEmber,
  'frozen-aurora': frozenAurora,
  'obsidian-black': obsidianBlack,
  'cyberpunk-edgerunners': cyberpunkEdgerunners,
  'obsidian-bloom': obsidianBloom,
  'frozen-canopy': frozenCanopy,
  'ember-realm': emberRealm,
  'twilight-lagoon': twilightLagoon,
  'nebula-crown': nebulaCrown,
  'enchanted-forest': enchantedForest,
  'void-crystal': voidCrystal,
  'deep-ocean': deepOcean,
  'obsidian-aurora': obsidianAurora,
  'carbon-fiber': carbonFiber,
  ...premiumThemeAdditions,
} as const;

export type ThemeId = keyof typeof themes;

export const themeCycle = Object.keys(themes) as ThemeId[];

// === THEME TYPE (union of all theme variants) ===
export type CrystallineTheme = (typeof themes)[ThemeId];
