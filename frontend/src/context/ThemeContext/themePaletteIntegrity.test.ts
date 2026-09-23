/**
 * themePaletteIntegrity.test.ts
 * =============================
 *
 * HY4 round 3 (#6, LOW): after the Rule 4 split, nothing COMMITTED stopped a palette
 * literal being duplicated, orphaned, or re-inlined into the aggregator. The split
 * was proven correct once, by a one-off harness script (`split-palettes.mjs`); this
 * is the part that keeps it correct on every future edit.
 *
 * The three ways the split can rot, and the assertion for each:
 *  1. A literal re-inlined into `themePalettes.ts`. That file is an aggregator now,
 *     and an inline literal there would silently shadow an import while the file
 *     still looks like a tidy map. Asserted: zero literals in the aggregator.
 *  2. Two modules exporting the same symbol. TypeScript catches a collision only when
 *     both are imported into one module; a duplicate in an unimported module would
 *     sit there as dead data. Asserted: every exported literal name is unique.
 *  3. A literal nothing references, or a theme id with no literal. Asserted: the
 *     counts match, and every literal name appears in the aggregator.
 *
 * KEY ORDER IS ALSO A CONTRACT, and it is asserted exactly rather than as a set:
 * `themeCycle` is `Object.keys(themes)`, so this order IS the order the lens cycles
 * through. A reorder is a user-visible change, so it has to be a deliberate edit to
 * this file rather than a side effect of an import being sorted.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { themes, themeCycle } from './UniversalThemeContext';
import { premiumThemeAdditions } from './UniversalThemePremiumThemes';

const HERE = __dirname;
const PALETTES_DIR = join(HERE, 'palettes');

const read = (file: string): string => readFileSync(join(HERE, file), 'utf8');

/** `export const name = {` — the shape of a palette literal. */
const LITERAL = /^export const (\w+) = \{$/gm;
/** The same shape without `export` — what a re-inlined literal would look like. */
const INLINE_LITERAL = /^(?:export )?const (\w+) = \{$/gm;

/** The 18 base themes, in the order the lens cycles through them. */
const BASE_ORDER = [
  'crystalline-default',
  'crystalline-light',
  'crystalline-dark',
  'crystalline-mono',
  'cinematic-ember',
  'frozen-aurora',
  'obsidian-black',
  'cyberpunk-edgerunners',
  'obsidian-bloom',
  'frozen-canopy',
  'ember-realm',
  'twilight-lagoon',
  'nebula-crown',
  'enchanted-forest',
  'void-crystal',
  'deep-ocean',
  'obsidian-aurora',
  'carbon-fiber',
];

const paletteModules = (): Array<{ file: string; names: string[] }> =>
  readdirSync(PALETTES_DIR)
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((file) => ({
      file,
      names: [...readFileSync(join(PALETTES_DIR, file), 'utf8').matchAll(LITERAL)].map((m) => m[1]),
    }));

/** The base block of the aggregator: between the map's opening and the premium spread. */
const aggregatorBaseBlock = (): string => {
  const source = read('themePalettes.ts');
  const start = source.indexOf('export const themes = {');
  const end = source.indexOf('...premiumThemeAdditions');
  if (start === -1 || end === -1) {
    throw new Error('BUILDER ERROR: the aggregator no longer has the expected shape');
  }
  return source.slice(start, end);
};

const baseIdsInOrder = (): string[] =>
  [...aggregatorBaseBlock().matchAll(/'([a-z0-9-]+)':/g)].map((m) => m[1]);

describe('palette integrity after the Rule 4 split', () => {
  describe('the aggregator is an aggregator', () => {
    it('declares no palette literal of its own', () => {
      const declared = [...read('themePalettes.ts').matchAll(INLINE_LITERAL)]
        .map((m) => m[1])
        .filter((name) => name !== 'themes');

      expect(
        declared,
        'A palette literal was re-inlined into the aggregator. That shadows the imported ' +
          'one and puts the 300-line cap back at risk — put it in palettes/ and import it.'
      ).toEqual([]);
    });

    it('maps each base theme to an imported symbol, never to a literal', () => {
      const block = aggregatorBaseBlock();
      expect(block).not.toMatch(/:\s*\{/);
    });
  });

  describe('the palette modules partition the base themes', () => {
    it('exports exactly 18 palette literals across palettes/', () => {
      const names = paletteModules().flatMap((m) => m.names).filter((n) => n !== 'fonts');
      expect(names).toHaveLength(BASE_ORDER.length);
    });

    it('gives every literal a unique name', () => {
      const seen = new Map<string, string>();
      const duplicates: string[] = [];

      for (const { file, names } of paletteModules()) {
        for (const name of names) {
          if (seen.has(name)) duplicates.push(`${name} in both ${seen.get(name)} and ${file}`);
          seen.set(name, file);
        }
      }

      expect(duplicates).toEqual([]);
    });

    it('references every literal from the aggregator', () => {
      const source = read('themePalettes.ts');
      const orphans = paletteModules()
        .flatMap((m) => m.names)
        .filter((name) => name !== 'fonts')
        .filter((name) => !source.includes(name));

      expect(orphans, 'a palette literal nothing imports is dead data').toEqual([]);
    });
  });

  describe('theme order is a contract, not a side effect', () => {
    it('lists the 18 base themes first, in the recorded order', () => {
      expect(
        baseIdsInOrder(),
        'The lens cycles in this order. A change here is user-visible, so update ' +
          'BASE_ORDER deliberately instead of letting an import sort decide it.'
      ).toEqual(BASE_ORDER);
    });

    it('adds the premium colorways after the base themes, as before the split', () => {
      const premium = Object.keys(premiumThemeAdditions);
      expect(themeCycle.length).toBe(BASE_ORDER.length + premium.length);
      expect(themeCycle.slice(BASE_ORDER.length)).toEqual(premium);
    });
  });

  /**
   * TOKEN VALUES, not just token shapes.
   *
   * Hostile-review round 4. Every other palette gate here checks that a field EXISTS,
   * that names are unique, or that the counts match. Nothing checked that a value is
   * one the consumer understands — so `crystalline-mono` ships
   * `effects.glowIntensity: 'none'`, a value the palette's own union
   * ('subtle' | 'medium' | 'intense') does not contain and the swatch does not branch
   * on. `getThemeSwatch` falls through its ternary chain to the default 0.4 — the
   * same amount 'subtle' produces — so mono's lens glow silently renders as subtle
   * while the palette says "none".
   *
   * This gate records the coercion instead of hiding it, and fails on a NEW value
   * (a typo like 'intence' would otherwise be a silent downgrade to the default).
   *
   * Deliberately NOT changed: making 'none' mean no glow would alter crystalline-mono's
   * appearance, and that is a design decision rather than a review fix. Recorded here.
   */
  describe('effect values are ones the consumer understands', () => {
    const SWATCH_AMOUNTS: Record<string, number> = { subtle: 0.4, medium: 0.45, intense: 0.55 };

    it('uses a glowIntensity the swatch branches on, or a recorded coercion', () => {
      const known = [...Object.keys(SWATCH_AMOUNTS), 'none'];
      const used = [...new Set(themeCycle.map((id) => themes[id].effects.glowIntensity))].sort();

      expect(
        used,
        'a new glowIntensity value appeared. Either teach getThemeSwatch about it, or ' +
          'record it here as a coercion — do not let it fall silently to the default.'
      ).toEqual(known.sort());
    });

    it('confines the recorded coercion to the one theme that declares it', () => {
      const coerced = themeCycle.filter((id) => !(themes[id].effects.glowIntensity in SWATCH_AMOUNTS));

      expect(coerced).toEqual(['crystalline-mono']);
    });
  });
});
