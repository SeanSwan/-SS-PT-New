/**
 * WHAT CHANGED — human-readable diff between two ResolvedLensPlans.
 * Powers the honest per-pane axis list in Compare/Forge ("a no-op axis
 * is immediately visible") and the golden-pair gate: two lenses meant
 * to be opposites must differ on >= 5 axes.
 */
import type { ResolvedLensPlan } from './compileRecipe';
import type { RecipeSlot } from './recipeV2';

export const DIFF_AXES = [
  'typography',
  'composition',
  'surface',
  'collection',
  'action',
  'chart',
] as const;

export type DiffAxis = (typeof DIFF_AXES)[number];

const SLOT_AXIS: Record<RecipeSlot, DiffAxis> = {
  'text.display': 'typography',
  'text.body': 'typography',
  'surface.card': 'surface',
  'collection.exercise': 'collection',
  'action.primary': 'action',
  'chart.progress': 'chart',
};

export interface AxisChange {
  axis: DiffAxis;
  from: string;
  to: string;
}

export const whatChanged = (
  a: ResolvedLensPlan,
  b: ResolvedLensPlan,
): AxisChange[] => {
  const changes: AxisChange[] = [];
  const seen = new Set<string>();

  for (const [slot, axis] of Object.entries(SLOT_AXIS) as Array<
    [RecipeSlot, DiffAxis]
  >) {
    const fromVariant = a.variants[slot];
    const toVariant = b.variants[slot];
    if (fromVariant !== toVariant && !seen.has(`${axis}:${slot}`)) {
      seen.add(`${axis}:${slot}`);
      changes.push({
        axis,
        from: fromVariant ?? '(host default)',
        to: toVariant ?? '(host default)',
      });
    }
  }

  for (const profile of ['desktop-enhanced', 'tablet', 'mobile-minimal'] as const) {
    if (a.templates[profile] !== b.templates[profile] && !seen.has('composition')) {
      seen.add('composition');
      changes.push({
        axis: 'composition',
        from: `${a.templates[profile]} (${profile})`,
        to: `${b.templates[profile]} (${profile})`,
      });
    }
  }

  return changes;
};

/** Count of DISTINCT axes that differ — the golden-pair gate metric. */
export const changedAxisCount = (changes: readonly AxisChange[]): number =>
  new Set(changes.map(({ axis }) => axis)).size;
