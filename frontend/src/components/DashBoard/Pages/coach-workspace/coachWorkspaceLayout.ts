/**
 * FILE: coachWorkspaceLayout.ts
 * PURPOSE: Which layout the Coach Workspace wears for the lens committed in the
 * header Swan Style Lens picker (brain-v4 J13).
 *
 * Two sources, one answer (`data-ws-layout` on the shell):
 *  - A lens WITH a v2 recipe: the recipe is compiled against
 *    COACH_WORKSPACE_MANIFEST and its desktop template is used (the same answer
 *    LensPlanFrame reaches), so the recipe and the workspace never disagree.
 *  - The other lenses (v1: `html[data-style-lens]` + `--lens-*` tokens) carry a
 *    `layoutSignature` in their manifest but no template. This map turns that
 *    signature into one of the four workspace templates, so picking a lens in the
 *    header really changes the coach's layout, not only its colours.
 *
 * Deterministic code, no model involved (rule 73). Every registered lens id must
 * appear here; coachWorkspaceLayout.test.ts fails when a new lens is added so it
 * gets a deliberate assignment instead of a silent default.
 */
import { resolveRecipeForStyleLens } from '../../../../adapters/style-lens-swan/v2/recipeResolution';
import { COACH_WORKSPACE_MANIFEST } from '../../../../adapters/style-lens-swan/v2/surfaceManifests';
import { compileRecipe } from '../../../../core/style-lens-os/v2/compileRecipe';

export type CoachWorkspaceLayout = 'operator-grid' | 'atrium-split' | 'editorial-column' | 'playfield-stack';

export const COACH_WORKSPACE_LAYOUTS: readonly CoachWorkspaceLayout[] = [
  'operator-grid', 'atrium-split', 'editorial-column', 'playfield-stack',
];

/** layoutSignature (manifest) → workspace template. Reason in the trailing comment. */
export const LENS_WORKSPACE_LAYOUT: Readonly<Record<string, CoachWorkspaceLayout>> = {
  'swan-flagship': 'operator-grid', // crystalline command river: the three-pane default
  'aurora-console': 'operator-grid', // weather console: threads · talk · instruments
  'prism-terminal': 'operator-grid', // faceted command prism
  'analog-flight-recorder': 'operator-grid', // instrument telemetry stack
  'terrain-console': 'operator-grid', // contour-map console
  'modular-harbor': 'operator-grid', // berths + command pier
  'signal-garden': 'operator-grid', // branching paths + growth rail
  'kintsugi-circuit': 'operator-grid', // gilded fracture circuit
  'kinetic-kanban': 'operator-grid', // swimlanes: history, talk, context side by side
  'split-horizon': 'atrium-split', // split plane with horizon dock
  'carbon-atelier': 'atrium-split', // canvas + tool rail
  'blueprint-fold': 'atrium-split', // folded drafting plane
  'cedar-workshop': 'atrium-split', // bench + parts wall
  'coach-ledger': 'atrium-split', // indexed ledger with annotation margin
  'chronograph-board': 'atrium-split', // dials + history band
  'tidal-columns': 'atrium-split', // offset column field
  'orbit-atlas': 'atrium-split', // concentric atlas: focus + orbiting context
  'quiet-meridian': 'editorial-column', // single meridian column
  'meridian-magazine': 'editorial-column', // editorial spread
  'monastic-grid': 'editorial-column', // measured, calm, one thing at a time
  'recovery-cloister': 'editorial-column', // sanctuary ring
  'crystalline-cathedral': 'editorial-column', // vaulted nave: one tall column
  'aurora-index': 'editorial-column', // index-and-reveal stack
  'candy-glass-arcade': 'playfield-stack', // action dock (v2 recipe wins when present)
  'glass-rail': 'playfield-stack', // floating glass spine
  'lunar-stack': 'playfield-stack', // offset mission plates
  'tempo-forge': 'playfield-stack', // cadence strip + safe zone
};

/**
 * The workspace layout for a committed lens id. A v2 recipe decides first; then
 * the v1 map; no lens (or an unmapped one) is the default three-pane grid.
 */
export function resolveCoachWorkspaceLayout(styleLensId: string | null | undefined): CoachWorkspaceLayout {
  if (!styleLensId) return 'operator-grid';
  const recipe = resolveRecipeForStyleLens(styleLensId);
  if (recipe) {
    const compiled = compileRecipe(recipe, COACH_WORKSPACE_MANIFEST);
    const template = compiled.ok ? compiled.plan.templates['desktop-enhanced'] : null;
    if (template && (COACH_WORKSPACE_LAYOUTS as readonly string[]).includes(template)) return template as CoachWorkspaceLayout;
  }
  return LENS_WORKSPACE_LAYOUT[styleLensId] ?? 'operator-grid';
}

export type WorkspaceDocking = { sidebarDocked: boolean; inspectorDocked: boolean };

/**
 * Which panels sit in the grid (docked) and which open as sheets, for a layout
 * at a viewport width. MUST mirror CoachWorkspace.styles.ts media rules.
 */
export function workspaceDocking(layout: CoachWorkspaceLayout, width: number): WorkspaceDocking {
  if (width < 768 || layout === 'editorial-column' || layout === 'playfield-stack') {
    return { sidebarDocked: false, inspectorDocked: false };
  }
  if (layout === 'atrium-split') return { sidebarDocked: false, inspectorDocked: width >= 1200 };
  return { sidebarDocked: true, inspectorDocked: width >= 1200 };
}
