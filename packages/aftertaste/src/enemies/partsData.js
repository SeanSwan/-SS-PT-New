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
import regularM from '../../../../assets/runtime/enemy/regular/manifest.json' with { type: 'json' };
import crumbRoachM from '../../../../assets/runtime/enemy/crumb-roach/manifest.json' with { type: 'json' };
// S3: every original face was re-sculpted through the PARTED pipe — the whole cast severs now.
import dripCystM from '../../../../assets/runtime/enemy/drip-cyst-v2/manifest.json' with { type: 'json' };
import greaseFlyM from '../../../../assets/runtime/enemy/grease-fly-v2/manifest.json' with { type: 'json' };
import pattyLarvaM from '../../../../assets/runtime/enemy/patty-larva-v2/manifest.json' with { type: 'json' };
import kissingBugM from '../../../../assets/runtime/enemy/kissing-bug/manifest.json' with { type: 'json' };

/** type → parts array (undefined = partless monster, whole-sphere hitscan as before). */
export const PARTS = {
  fryling: frylingV2.parts,
  regular: regularM.parts,
  'crumb-roach': crumbRoachM.parts,
  'drip-cyst': dripCystM.parts,
  'grease-fly': greaseFlyM.parts,
  'patty-larva': pattyLarvaM.parts,
  'kissing-bug': kissingBugM.parts,
};

/** Damage multiplier per struck part — T3 default (headshot ×2), Sean-overridable. */
export const PART_DAMAGE = { head: 2 };

/** type → how many skinned meshes its model renders (parted models carry one per part). */
export const PART_MESH_COUNT = {
  fryling: 2, regular: 2, 'crumb-roach': 2, 'drip-cyst': 2, 'grease-fly': 2, 'patty-larva': 2, 'kissing-bug': 2,
};
