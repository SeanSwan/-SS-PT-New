/**
 * lens-add-world — Swan World Engine authoring generator (Slice 1)
 * ================================================================
 * Scaffolds one planned world into a real recipe so authoring a world is one
 * command, not the 7–9-file frozen-core chore. It emits a `worlds/recipes/
 * <id>.ts` stub (valid RecipeV2 that compiles clean against LAB_HOST_MANIFEST
 * using only allowlisted variants) and prints the exact registry wiring line.
 * It NEVER edits the registry itself (deterministic, review-safe: the author
 * pastes the one line, so the diff is legible and Rule-34-clean).
 *
 * Usage:  node scripts/lens-add-world.mjs <world-id>
 * The `renderWorldRecipeStub` export is pure (no fs/clock/random) so CI can
 * scaffold a dummy world end-to-end and assert it compiles (registry.test.ts).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** The 25 closed world ids + families (kept in lock-step with worldId.ts). */
export const WORLD_FAMILY = {
  'candy-glass-arcade': 'playful', 'kinetic-kanban': 'playful', 'signal-garden': 'playful',
  'tempo-forge': 'playful', 'orbit-atlas': 'playful', 'modular-harbor': 'playful',
  'kintsugi-circuit': 'playful', 'quiet-meridian': 'calm', 'recovery-cloister': 'calm',
  'monastic-grid': 'calm', 'lunar-stack': 'calm', 'prism-terminal': 'technical',
  'blueprint-fold': 'technical', 'analog-flight-recorder': 'technical', 'chronograph-board': 'technical',
  'terrain-console': 'technical', 'coach-ledger': 'technical', 'crystalline-cathedral': 'luxe',
  'carbon-atelier': 'luxe', 'meridian-magazine': 'luxe', 'glass-rail': 'luxe',
  'aurora-index': 'atmospheric', 'tidal-columns': 'atmospheric', 'split-horizon': 'atmospheric',
  'cedar-workshop': 'atmospheric',
};

const toConst = (id) => id.toUpperCase().replace(/-/g, '_') + '_RECIPE';

/**
 * Pure scaffold renderer. Produces a compilable RecipeV2 stub (allowlisted
 * variants + playfield-stack template) the author then art-directs. No side
 * effects — same input always yields the same string.
 */
export function renderWorldRecipeStub(id) {
  const family = WORLD_FAMILY[id];
  if (!family) throw new Error(`unknown world id "${id}" (must be one of the 25 in worldId.ts)`);
  const CONST = toConst(id);
  return `/**
 * WORLD RECIPE — ${id} (${family}) · Swan World Engine  [SCAFFOLD — art-direct me]
 * DNA: <one-line DNA>. Impossible phenomenon: <the ONE optical trick>.
 * Signature motion: <beat>. Surface fit: <surface>. (Master build prompt §1.)
 * Law A: chrome stays Crystalline Swan tokens; the world paints only --world-*.
 * TODO(author): tune tokens + component variants for this world's DNA, then add
 *   to worlds/registry.ts BUILT_RECIPES and flip the ledger status via wave slice.
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const ${CONST}: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.${id}.v2',
  tokens: {
    'world-title-font': "700 clamp(28px, 3.4vw, 52px)/1.06 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.01em',
    'world-panel-radius': '16px',
    'world-row-radius': '12px',
    'world-dial-radius': '12px',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #12203c 88%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    'tablet': { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'vaulted-editorial' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'floating-candy' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
`;
}

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('usage: node scripts/lens-add-world.mjs <world-id>');
    process.exit(1);
  }
  const stub = renderWorldRecipeStub(id); // throws on unknown id
  const outDir = path.resolve('frontend/src/adapters/style-lens-swan/worlds/recipes');
  const outFile = path.join(outDir, `${id}.ts`);
  try {
    await fs.access(outFile);
    console.error(`refusing to overwrite existing ${outFile}`);
    process.exit(1);
  } catch {
    /* not present — proceed */
  }
  await fs.writeFile(outFile, stub, 'utf8');
  console.log(`scaffolded ${outFile}`);
  console.log('\nNext (paste into worlds/registry.ts):');
  console.log(`  import { ${toConst(id)} } from './recipes/${id}';`);
  console.log(`  // …and in BUILT_RECIPES:  '${id}': ${toConst(id)},`);
}

// Run only as a CLI, never on import (so the pure export is test-safe).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('lens-add-world.mjs')) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
