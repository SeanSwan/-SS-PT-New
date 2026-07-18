/**
 * Swan Lens — world-role VALUE contract (S1-A, DATA only).
 *
 * A typed per-lens value table keyed to World-Engine **Lane A's existing** `--world-*`
 * role names (bg/panel/accent/text/muted/action/shadow/radius). This is a VALUE SOURCE,
 * not a schema: keys are bare role names WITHOUT the leading `--`, mirroring the shape of
 * `RecipeTokens` (core/style-lens-os/v2/recipeV2.ts) so Lane A can feed roles into
 * `compileRecipe` whenever it wires them. Slice-1 consumes this only in the design-value
 * guard, its tests, and the registry-integrity check — it emits NO `--world-*` CSS.
 *
 * Ownership (Rule 67): Lane A owns the `--world-*` NAMES + their wiring. This adapter file
 * owns the VALUES only. No new `--world-*` name is introduced here (see the regrounded
 * blueprint §3.C "requires Lane A agreement" for proposed additions — none emitted in Slice 1).
 */

/** The eight world roles Lane A already exposes (bare names, no leading `--`). */
export const LENS_WORLD_ROLES = [
  'bg',
  'panel',
  'accent',
  'text',
  'muted',
  'action',
  'shadow',
  'radius',
] as const;

export type LensWorldRole = (typeof LENS_WORLD_ROLES)[number];

/**
 * How a role's value is format-validated (guard rule R4).
 * - `color`  → strict 6-digit hex (`#rrggbb`); the only kind eligible for contrast checks.
 * - `length` → `<number>px|rem`.
 * - `paint`  → a color/gradient value (starts with `#`/`rgb(`/`rgba(`/`linear-gradient(`/
 *              `radial-gradient(`/`color-mix(in srgb,`/`none`).
 * - `shadow` → a box-shadow value (offset/blur lengths + a color); NOT a bare paint.
 *   [FLAGGED micro-clarification vs blueprint §3.B/R4, which named only color/length/paint:
 *    the `shadow` role's value is a box-shadow, so it needs its own kind. Mechanical, not a
 *    design decision — confirm with Kimi if desired.]
 */
export type ValueKind = 'color' | 'length' | 'paint' | 'shadow';

/** One role's value + its declared kind (drives R4 format + R5 contrast eligibility). */
export interface LensWorldRoleValue {
  value: string;
  kind: ValueKind;
}

/** A full per-lens table: every role in LENS_WORLD_ROLES present (guard rule R1). */
export type LensWorldRoleValues = Readonly<Record<LensWorldRole, LensWorldRoleValue>>;

/** manifestId → its world-role value table. */
export type LensWorldValuesRegistry = Readonly<Record<string, LensWorldRoleValues>>;

/**
 * Documentation-only map from a world role to the natural RecipeV2 slot Lane A would wire it
 * into (surface.card←panel, text.*←text, action.primary←action, chart.progress←accent). This
 * is a NOTE for Lane A, not code Slice-1 executes; roles with no natural slot are omitted.
 */
export const WORLD_ROLE_TO_RECIPE_SLOT: Readonly<Partial<Record<LensWorldRole, string>>> = {
  panel: 'surface.card',
  text: 'text.body',
  action: 'action.primary',
  accent: 'chart.progress',
};
