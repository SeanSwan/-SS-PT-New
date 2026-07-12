/**
 * Workout Design Lab Style axis.
 * Only the 25 promoted Swan lenses belong here; safety and flagship fallbacks stay runtime-only.
 */
import type { StyleLensManifest } from "../../../../core/style-lens-os";
import {
  SWAN_EXPANSION_MANIFESTS,
  SWAN_SENTINEL_MANIFESTS,
} from "../../../../adapters/style-lens-swan";

export const WORKOUT_DESIGN_STYLE_LENSES: readonly StyleLensManifest[] =
  Object.freeze([
    ...SWAN_SENTINEL_MANIFESTS,
    ...SWAN_EXPANSION_MANIFESTS,
  ]);

export const WORKOUT_DESIGN_STYLE_COUNT =
  WORKOUT_DESIGN_STYLE_LENSES.length;
