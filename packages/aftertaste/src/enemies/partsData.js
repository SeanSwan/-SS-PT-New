/**
 * partsData.js — each monster's PART table, imported straight from the validated manifest.
 *
 * TEACHING NOTE — ONE SOURCE OF TRUTH, AGAIN:
 * The hit shapes were measured by the pipeline from the actual vertices, and the asset gate
 * re-derives them from the GLB on every commit. If this file copied those numbers by hand, it
 * would be the third copy and the first to rot. Importing the manifest itself means the game,
 * the gate, and the pipe all read ONE record. (JSON imports work in both Vite and node 22, so
 * unit tests can reach this without a browser — unlike models.js, which stays Vite-only.)
 *
 * Shapes are in the normalized render frame (1 unit tall, footprint centred, feet at y=0). To
 * test a world ray against them, offset by the enemy's (x, z) — that is combat.js's job.
 */
import frylingV2 from '../../../../assets/runtime/enemy/fryling-v2/manifest.json' with { type: 'json' };

/** type → parts array (undefined = partless monster, whole-sphere hitscan as before). */
export const PARTS = {
  fryling: frylingV2.parts,
};

/** Damage multiplier per struck part — T3 default (headshot ×2), Sean-overridable. */
export const PART_DAMAGE = { head: 2 };

/** type → how many skinned meshes its model renders (parted models carry one per part). */
export const PART_MESH_COUNT = { fryling: 2 };
