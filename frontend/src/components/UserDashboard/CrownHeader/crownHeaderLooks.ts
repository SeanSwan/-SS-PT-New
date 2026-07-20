/**
 * ============================================================================
 * FILE: crownHeaderLooks.ts — FUSION F2 (lens-world-fusion 02-wireframes §1)
 * PURPOSE: Ordering data for the Looks Carousel. ORDER LAW: committed look
 * first, then v2-capable styles by mood-family order, then chrome styles
 * (family order within each group, §4.2 row order inside families —
 * pipeline additions append at their family's end, same law as the Lab).
 * ============================================================================
 */
import type { StyleLensManifest } from '../../../core/style-lens-os';
import { SWAN_STYLE_LENS_VISUALS } from '../../../adapters/style-lens-swan';
import { V2_RECIPE_BY_CATALOG_ID } from '../../../adapters/style-lens-swan/v2/catalogV2Map';
import {
  WORKOUT_DESIGN_MOOD_FAMILY_ORDER,
  WORKOUT_DESIGN_STYLE_LENSES,
  WORKOUT_DESIGN_STYLE_ROW_ORDER,
} from '../../DashBoard/Pages/workout-design-lab/workoutDesignStyleCatalog';

const familyIndex = (id: string): number => {
  const family = SWAN_STYLE_LENS_VISUALS[id]?.moodFamily;
  const index = family
    ? (WORKOUT_DESIGN_MOOD_FAMILY_ORDER as readonly string[]).indexOf(family)
    : -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const rowIndex = (id: string): number => {
  const family = SWAN_STYLE_LENS_VISUALS[id]?.moodFamily;
  const row = family ? WORKOUT_DESIGN_STYLE_ROW_ORDER[family] : undefined;
  const index = row ? row.indexOf(id) : -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

/** Committed first · v2-capable by family/row order · chrome by family/row order. */
export const orderedLooks = (committedId: string): readonly StyleLensManifest[] => {
  const committed = WORKOUT_DESIGN_STYLE_LENSES.filter(({ id }) => id === committedId);
  const rest = WORKOUT_DESIGN_STYLE_LENSES.filter(({ id }) => id !== committedId).sort(
    (a, b) => {
      const aV2 = V2_RECIPE_BY_CATALOG_ID[a.id] ? 0 : 1;
      const bV2 = V2_RECIPE_BY_CATALOG_ID[b.id] ? 0 : 1;
      if (aV2 !== bV2) return aV2 - bV2;
      if (familyIndex(a.id) !== familyIndex(b.id)) return familyIndex(a.id) - familyIndex(b.id);
      return rowIndex(a.id) - rowIndex(b.id);
    },
  );
  return [...committed, ...rest];
};
