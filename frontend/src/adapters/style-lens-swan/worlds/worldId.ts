/**
 * BLUEPRINT — worldId (Swan adapter · World Engine spine, Slice 1)
 * ================================================================
 * The CLOSED set of the 25 Swan Lens worlds and their families. This is the
 * single source of truth for the roster: it is the SAME 25 ids the Workout
 * Design Lab already ships in `workoutDesignStyleCatalog.ts`
 * (`WORKOUT_DESIGN_STYLE_ROW_ORDER`) — we PROMOTE those real ids from
 * chrome-only lenses to full `--world-*` worlds, we do not invent new names.
 *
 * `WorldId` is a closed union → any `Record<WorldId, …>` (the registry, the
 * ledger) is exhaustive, so a missing world is a COMPILE ERROR, not a runtime
 * surprise. That is the cheap completeness guarantee the CI layer-1 check and
 * the A3 gate-flip contract both lean on.
 *
 * DNA/phenomenon/palette per world: SWAN-LENS-WORLD-ENGINE-MASTER-BUILD-PROMPT
 * -2026-07-28.md §1. Taxonomy: references/SWAN-LENS-OS.md.
 */

export const WORLD_FAMILIES = ['playful', 'calm', 'technical', 'luxe', 'atmospheric'] as const;
export type WorldFamily = (typeof WORLD_FAMILIES)[number];

/**
 * Roster order MIRRORS `WORKOUT_DESIGN_STYLE_ROW_ORDER` exactly (playful 7 /
 * calm 4 / technical 6 / luxe 4 / atmospheric 4 = 25). The Lab contract test
 * asserts those family counts; keeping this list in lock-step is enforced by
 * `registry.test.ts` (family-count partition check).
 */
export const WORLD_IDS = [
  // playful (7)
  'candy-glass-arcade', 'kinetic-kanban', 'signal-garden', 'tempo-forge',
  'orbit-atlas', 'modular-harbor', 'kintsugi-circuit',
  // calm (4)
  'quiet-meridian', 'recovery-cloister', 'monastic-grid', 'lunar-stack',
  // technical (6)
  'prism-terminal', 'blueprint-fold', 'analog-flight-recorder', 'chronograph-board',
  'terrain-console', 'coach-ledger',
  // luxe (4)
  'crystalline-cathedral', 'carbon-atelier', 'meridian-magazine', 'glass-rail',
  // atmospheric (4)
  'aurora-index', 'tidal-columns', 'split-horizon', 'cedar-workshop',
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

/**
 * Compile-time proof the roster is exactly 25: `WORLD_IDS.length` is the tuple
 * length literal, so if the list ever drifts off 25 this annotation fails to
 * typecheck — the roster can only change deliberately (and the Lab contract
 * test + registry.test.ts re-assert it at runtime).
 */
export const WORLD_COUNT: 25 = WORLD_IDS.length;

export const WORLD_FAMILY: Readonly<Record<WorldId, WorldFamily>> = Object.freeze({
  // playful
  'candy-glass-arcade': 'playful',
  'kinetic-kanban': 'playful',
  'signal-garden': 'playful',
  'tempo-forge': 'playful',
  'orbit-atlas': 'playful',
  'modular-harbor': 'playful',
  'kintsugi-circuit': 'playful',
  // calm
  'quiet-meridian': 'calm',
  'recovery-cloister': 'calm',
  'monastic-grid': 'calm',
  'lunar-stack': 'calm',
  // technical
  'prism-terminal': 'technical',
  'blueprint-fold': 'technical',
  'analog-flight-recorder': 'technical',
  'chronograph-board': 'technical',
  'terrain-console': 'technical',
  'coach-ledger': 'technical',
  // luxe
  'crystalline-cathedral': 'luxe',
  'carbon-atelier': 'luxe',
  'meridian-magazine': 'luxe',
  'glass-rail': 'luxe',
  // atmospheric
  'aurora-index': 'atmospheric',
  'tidal-columns': 'atmospheric',
  'split-horizon': 'atmospheric',
  'cedar-workshop': 'atmospheric',
});

/** The `swan.<id>.v2` recipe-id convention (matches the labRecipes gate). */
export const worldRecipeId = (id: WorldId): string => `swan.${id}.v2`;

export const isWorldId = (value: unknown): value is WorldId =>
  typeof value === 'string' && (WORLD_IDS as readonly string[]).includes(value);
