/**
 * BLUEPRINT — World Registry (Swan adapter · World Engine spine, Slice 1)
 * ======================================================================
 * The single `WorldId → WorldEntry` map for all 25 Swan Lens worlds. Exhaustive
 * over the closed `WorldId` union, so a missing world is a COMPILE ERROR — the
 * cheap completeness guarantee behind CI layer-1 and the A3 gate-flip contract.
 *
 * Status model (honest by construction):
 *  - `built`   → `recipe` is a real `RecipeV2` (renders `--world-*`). 23 today.
 *  - `planned` → `recipe` is `null` (chrome-only lens still). 2 today, both
 *                deliberate holdouts the Lab's chrome-vs-v2 contract tests need
 *                (see the note on BUILT_RECIPES below) — NOT unfinished work.
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
// Waves 2–4 (roster order).
import { KINETIC_KANBAN_RECIPE } from './recipes/kinetic-kanban';
import { SIGNAL_GARDEN_RECIPE } from './recipes/signal-garden';
import { TEMPO_FORGE_RECIPE } from './recipes/tempo-forge';
import { ORBIT_ATLAS_RECIPE } from './recipes/orbit-atlas';
import { MODULAR_HARBOR_RECIPE } from './recipes/modular-harbor';
import { KINTSUGI_CIRCUIT_RECIPE } from './recipes/kintsugi-circuit';
import { RECOVERY_CLOISTER_RECIPE } from './recipes/recovery-cloister';
import { MONASTIC_GRID_RECIPE } from './recipes/monastic-grid';
import { ANALOG_FLIGHT_RECORDER_RECIPE } from './recipes/analog-flight-recorder';
import { CHRONOGRAPH_BOARD_RECIPE } from './recipes/chronograph-board';
import { TERRAIN_CONSOLE_RECIPE } from './recipes/terrain-console';
import { CARBON_ATELIER_RECIPE } from './recipes/carbon-atelier';
import { MERIDIAN_MAGAZINE_RECIPE } from './recipes/meridian-magazine';
import { GLASS_RAIL_RECIPE } from './recipes/glass-rail';
import { TIDAL_COLUMNS_RECIPE } from './recipes/tidal-columns';
import { SPLIT_HORIZON_RECIPE } from './recipes/split-horizon';
import { CEDAR_WORKSHOP_RECIPE } from './recipes/cedar-workshop';

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
  // Waves 2–4. Codewords were solved against the CONSERVATIVE production-surface
  // distance (5 axes; chart excluded because 5 of 6 rollout surfaces publish no
  // chart slot, composition counted only when the DESKTOP template differs), so
  // every pair clears >= 3 axes on the strictest host, not just in the Lab.
  'kinetic-kanban': KINETIC_KANBAN_RECIPE,
  'signal-garden': SIGNAL_GARDEN_RECIPE,
  'tempo-forge': TEMPO_FORGE_RECIPE,
  'orbit-atlas': ORBIT_ATLAS_RECIPE,
  'modular-harbor': MODULAR_HARBOR_RECIPE,
  'kintsugi-circuit': KINTSUGI_CIRCUIT_RECIPE,
  'recovery-cloister': RECOVERY_CLOISTER_RECIPE,
  'monastic-grid': MONASTIC_GRID_RECIPE,
  'analog-flight-recorder': ANALOG_FLIGHT_RECORDER_RECIPE,
  'chronograph-board': CHRONOGRAPH_BOARD_RECIPE,
  'terrain-console': TERRAIN_CONSOLE_RECIPE,
  'carbon-atelier': CARBON_ATELIER_RECIPE,
  'meridian-magazine': MERIDIAN_MAGAZINE_RECIPE,
  'glass-rail': GLASS_RAIL_RECIPE,
  'tidal-columns': TIDAL_COLUMNS_RECIPE,
  'split-horizon': SPLIT_HORIZON_RECIPE,
  'cedar-workshop': CEDAR_WORKSHOP_RECIPE,
  // TWO worlds stay CHROME-ONLY on purpose — 'lunar-stack' and 'blueprint-fold'.
  // WorkoutDesignLab.styleAxis.test.tsx proves the v1-vs-v2 badge split AND the
  // Compare contract that BOTH panes can be chrome (exact chrome copy, two real
  // scoped stages with independent lenses) — that needs a second still-chrome id,
  // which is why it is two and not one. Retiring the chrome-only concept entirely
  // is Slice 15, Sean's go-live gate; both ids are guarded there so a future wave
  // that promotes either must pick a fresh holdout or make the Slice-15 call.
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

/**
 * A registry entry whose recipe is PROVEN non-null at the type level. Without
 * this, `builtWorlds()` widened back to `WorldEntry[]` and threw away its own
 * type predicate, forcing every consumer to write `entry.recipe!` — a non-null
 * assertion that would keep compiling if the built invariant ever broke.
 */
export type BuiltWorldEntry = WorldEntry & { readonly recipe: RecipeV2 };

/** Every world with a real recipe (status === 'built'). */
export const builtWorlds = (): readonly BuiltWorldEntry[] =>
  WORLD_IDS.map((id) => WORLD_REGISTRY[id]).filter((e): e is BuiltWorldEntry => e.recipe !== null);

/** Worlds still awaiting their recipe (status === 'planned'). */
export const plannedWorlds = (): readonly WorldEntry[] =>
  WORLD_IDS.map((id) => WORLD_REGISTRY[id]).filter((e) => e.recipe === null);

export const builtWorldCount = (): number => builtWorlds().length;
