/**
 * DOC TRUTH — a world's header must describe the world's actual code.
 * ===================================================================
 * WHY (hostile round 7): every recipe file opens with a 7-star header that
 * states the world's structural codeword — the six variants + template that ARE
 * its distinctness. That header is the first thing the next agent reads, and it
 * is the only human-readable statement of why the world is different from the
 * other 24. If someone tunes a variant and leaves the header alone, the doc
 * lies, and it lies in exactly the place a reader trusts most.
 *
 * Nothing caught that: prose is invisible to the compiler, to vitest, and to
 * every gate in this engine. So parse the prose and diff it against the object.
 * (CLAUDE.md Rule 75 / TRAILHEAD-TRUTH, applied to source headers.)
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { builtWorlds } from './registry';
import type { RecipeSlot } from '../../../core/style-lens-os/v2/recipeV2';

const RECIPE_DIR_CANDIDATES = [
  'src/adapters/style-lens-swan/worlds/recipes',
  'adapters/style-lens-swan/worlds/recipes',
  'frontend/src/adapters/style-lens-swan/worlds/recipes',
];
const recipeDir = RECIPE_DIR_CANDIDATES.map((p) => resolve(process.cwd(), p)).find(existsSync);
if (!recipeDir) {
  throw new Error(
    `doc-truth guard cannot locate worlds/recipes from cwd ${process.cwd()} — update ` +
      `RECIPE_DIR_CANDIDATES (do NOT delete this check).`,
  );
}

/** The header's declared axis words → the recipe key each one must match. */
const AXIS_SLOT: Record<string, RecipeSlot> = {
  display: 'text.display',
  body: 'text.body',
  surface: 'surface.card',
  collection: 'collection.exercise',
  action: 'action.primary',
  chart: 'chart.progress',
};

/** Pull `<value> <axis>` pairs out of the header's codeword sentence. */
const parseCodeword = (header: string): Record<string, string> | null => {
  const flat = header.replace(/\*/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const match = flat.match(/codeword[^:]*:\s*(.+?)\s*(?:\(|\.\s|$)/);
  if (!match) return null;
  const parsed: Record<string, string> = {};
  for (const part of match[1].split('/')) {
    const words = part.trim().split(/\s+/);
    if (words.length < 2) continue;
    const axis = words[words.length - 1];
    parsed[axis] = words.slice(0, -1).join(' ');
  }
  return Object.keys(parsed).length ? parsed : null;
};

describe('doc truth · every built world header matches its recipe', () => {
  const worlds = builtWorlds();

  it('has worlds to check and can read their sources (anti-vacuous guard)', () => {
    expect(worlds.length).toBeGreaterThan(0);
    expect(readFileSync(resolve(recipeDir, `${worlds[0].id}.ts`), 'utf8').length).toBeGreaterThan(200);
  });

  it('every world declares a structural codeword in its header', () => {
    const missing = worlds
      .filter((w) => !parseCodeword(readFileSync(resolve(recipeDir, `${w.id}.ts`), 'utf8').split('*/')[0]))
      .map((w) => w.id);
    expect(
      missing,
      `these worlds state no codeword, so a reader cannot tell what makes them distinct: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('the declared codeword equals the recipe it sits above', () => {
    const drift: string[] = [];
    for (const world of worlds) {
      const source = readFileSync(resolve(recipeDir, `${world.id}.ts`), 'utf8');
      const declared = parseCodeword(source.split('*/')[0]);
      if (!declared) continue; // reported by the test above

      for (const [axis, slot] of Object.entries(AXIS_SLOT)) {
        if (!(axis in declared)) continue;
        const actual = world.recipe.components?.[slot]?.variant;
        if (declared[axis] !== actual) {
          drift.push(`${world.id}: header says ${axis} "${declared[axis]}" but ${slot} is "${actual}"`);
        }
      }
      if ('template' in declared) {
        const actual = world.recipe.composition?.['desktop-enhanced']?.template;
        if (declared.template !== actual) {
          drift.push(`${world.id}: header says template "${declared.template}" but desktop is "${actual}"`);
        }
      }
    }
    expect(drift, `\n${drift.join('\n')}\n`).toEqual([]);
  });
});

/**
 * The GENERATOR is a gate surface too (hostile round 12). `scripts/lens-add-world.mjs`
 * predates docTruth + fontLoading, and had drifted into emitting a stub that fails
 * BOTH the moment it is registered: no codeword line at all, and a display variant
 * (`vaulted-editorial`) that applies `font-style: italic` paired with Plus Jakarta
 * Sans, which loads no italic axis. A scaffold that cannot pass the gates teaches
 * every future author the wrong shape, so the stub is contract-tested here.
 */
describe('doc truth · the world generator emits a gate-compatible scaffold', () => {
  const stubSource = readFileSync(
    resolve(recipeDir, '../../../../../../scripts/lens-add-world.mjs'),
    'utf8',
  );

  it('can read the generator (anti-vacuous guard)', () => {
    expect(stubSource).toContain('renderWorldRecipeStub');
  });

  it('the scaffold header declares a codeword that matches the variants it emits', () => {
    // Parse the whole generator source: the stub's header lives inside a
    // template literal, so there is no reliable comment boundary to split on.
    const declared = parseCodeword(stubSource);
    expect(declared, 'the scaffold states no codeword — a generated world fails docTruth').not.toBeNull();
    for (const [axis, slot] of Object.entries(AXIS_SLOT)) {
      if (!(axis in declared!)) continue;
      const emitted = stubSource.match(
        new RegExp(`'${slot.replace('.', '\\.')}':\\s*\\{\\s*variant:\\s*'([a-z-]+)'`),
      );
      expect(emitted, `scaffold emits no ${slot}`).not.toBeNull();
      expect(declared![axis], `scaffold header ${axis} vs emitted ${slot}`).toBe(emitted![1]);
    }
  });

  it('the scaffold never pairs a slanting display variant with a font that has no italic', () => {
    // `vaulted-editorial` applies font-style: italic in lensRepresentationStyles.
    // Plus Jakarta Sans (the scaffold's face) is loaded with no ital axis, so that
    // pairing renders as synthetic oblique and fails fontLoading.test.ts.
    const display = stubSource.match(/'text\.display':\s*\{\s*variant:\s*'([a-z-]+)'/)?.[1];
    const usesPlusJakarta = /world-title-font[^\n]*Plus Jakarta Sans/.test(stubSource);
    expect(display, 'scaffold emits no display variant').toBeTruthy();
    if (usesPlusJakarta) {
      expect(
        display,
        'the scaffold pairs a slanting display variant with Plus Jakarta Sans, which loads no italic axis',
      ).not.toBe('vaulted-editorial');
    }
  });

  it('the scaffold does not send authors to files that now derive themselves', () => {
    expect(
      /flip the ledger status/i.test(stubSource),
      'the scaffold still tells authors to flip the ledger status — the ledger reads it from the registry',
    ).toBe(false);
  });
});
