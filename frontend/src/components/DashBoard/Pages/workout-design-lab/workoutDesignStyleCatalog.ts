/**
 * Workout Design Lab Style axis.
 * Only the promoted Swan lenses belong here (a growing catalog — 26 as of
 * 2026-07-16); safety and flagship fallbacks stay runtime-only.
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

/**
 * Lab v6 catalog DISPLAY order (A-PACK §4.2, verbatim — never re-decide).
 * Ordering data only; the lens->family mapping lives on the visuals receipt
 * (moodFamily). Manifest order above stays untouched.
 */
export const WORKOUT_DESIGN_MOOD_FAMILY_ORDER = Object.freeze([
  "playful", "calm", "technical", "luxe", "atmospheric",
] as const);

export const WORKOUT_DESIGN_STYLE_ROW_ORDER: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  playful: ["candy-glass-arcade", "kinetic-kanban", "signal-garden", "tempo-forge", "orbit-atlas", "modular-harbor", "kintsugi-circuit"],
  calm: ["quiet-meridian", "recovery-cloister", "monastic-grid", "lunar-stack"],
  technical: ["prism-terminal", "blueprint-fold", "analog-flight-recorder", "chronograph-board", "terrain-console", "coach-ledger"],
  luxe: ["crystalline-cathedral", "carbon-atelier", "meridian-magazine", "glass-rail"],
  atmospheric: ["aurora-index", "tidal-columns", "split-horizon", "cedar-workshop"],
});
