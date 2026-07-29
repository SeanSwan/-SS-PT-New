/**
 * BLUEPRINT — World Registry (Swan adapter · World Engine spine, Slice 1)
 * ======================================================================
 * The single `WorldId → WorldEntry` map for all 25 Swan Lens worlds. Exhaustive
 * over the closed `WorldId` union, so a missing world is a COMPILE ERROR — the
 * cheap completeness guarantee behind CI layer-1 and the A3 gate-flip contract.
 *
 * Status model (honest by construction):
 *  - `built`   → `recipe` is a real `RecipeV2` (renders `--world-*`). 2 today.
 *  - `planned` → `recipe` is `null` (chrome-only lens still; wave slices 9–13
 *                promote it by authoring the recipe + flipping status).
 *
 * The registry NEVER flips the production rollout gate — `recipeResolution.ts`
 * stays fail-closed until Slice 15's A3 contract goes green (all 25 built +
 * ledger-green + determinism-hash-attested). This file only catalogues; it does
 * not widen the resolvable set. (Master build prompt §3.1/§3.6.)
 */
import type { RecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';
import { WORLD_FAMILY, WORLD_IDS, type WorldFamily, type WorldId } from './worldId';
import { CANDY_GLASS_ARCADE_RECIPE } from './recipes/candy-glass-arcade';
import { PRISM_TERMINAL_RECIPE } from './recipes/prism-terminal';
import { AURORA_INDEX_RECIPE } from './recipes/aurora-index';
import { CRYSTALLINE_CATHEDRAL_RECIPE } from './recipes/crystalline-cathedral';
import { COACH_LEDGER_RECIPE } from './recipes/coach-ledger';
import { QUIET_MERIDIAN_RECIPE } from './recipes/quiet-meridian';

export type WorldStatus = 'built' | 'planned';

export interface WorldEntry {
  readonly id: WorldId;
  readonly family: WorldFamily;
  readonly status: WorldStatus;
  /** non-null iff status === 'built' (invariant enforced by registry.test.ts). */
  readonly recipe: RecipeV2 | null;
}

/** Built worlds (real v2 recipe); every other id is `planned` (recipe: null). */
const BUILT_RECIPES: Partial<Record<WorldId, RecipeV2>> = {
  'candy-glass-arcade': CANDY_GLASS_ARCADE_RECIPE,
  'prism-terminal': PRISM_TERMINAL_RECIPE,
  // Wave 1 (ranks 3–6): all 5 families + both auto-theme anchors represented.
  'aurora-index': AURORA_INDEX_RECIPE,
  'crystalline-cathedral': CRYSTALLINE_CATHEDRAL_RECIPE,
  'coach-ledger': COACH_LEDGER_RECIPE,
  'quiet-meridian': QUIET_MERIDIAN_RECIPE,
};

const buildEntry = (id: WorldId): WorldEntry => {
  const recipe = BUILT_RECIPES[id] ?? null;
  return Object.freeze({
    id,
    family: WORLD_FAMILY[id],
    status: recipe ? 'built' : 'planned',
    recipe,
  });
};

/**
 * Exhaustive registry. Derived from the closed `WORLD_IDS` list + the built map
 * so it can never drift from the roster (adding a world = one `WORLD_IDS` entry
 * + one recipe; the registry picks it up). Typed as the exhaustive record so a
 * roster/registry mismatch is a compile error at the consumer.
 */
export const WORLD_REGISTRY: Readonly<Record<WorldId, WorldEntry>> = Object.freeze(
  Object.fromEntries(WORLD_IDS.map((id) => [id, buildEntry(id)])) as Record<WorldId, WorldEntry>,
);

export const worldEntry = (id: WorldId): WorldEntry => WORLD_REGISTRY[id];

/** Every world with a real recipe (status === 'built'). */
export const builtWorlds = (): readonly WorldEntry[] =>
  WORLD_IDS.map((id) => WORLD_REGISTRY[id]).filter((e): e is WorldEntry & { recipe: RecipeV2 } =>
    e.recipe !== null,
  );

/** Worlds still awaiting their recipe (status === 'planned'). */
export const plannedWorlds = (): readonly WorldEntry[] =>
  WORLD_IDS.map((id) => WORLD_REGISTRY[id]).filter((e) => e.recipe === null);

export const builtWorldCount = (): number => builtWorlds().length;
