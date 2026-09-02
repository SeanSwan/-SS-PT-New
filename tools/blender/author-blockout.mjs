/**
 * author-blockout.mjs — write a creature blockout .obj from a list of boxes.
 *
 * WHY THIS EXISTS: `roster-to-obj.py` turns the AUTHORED voxel roster (a markdown recipe grammar)
 * into blockouts, and that path stays canonical for creatures that have a roster recipe. This is
 * the smaller door for creatures whose silhouette is being SCULPTED directly — Sean's playtest-4
 * note that the cast "reads as Tetris blocks" is a silhouette problem, and a silhouette is faster
 * to iterate as boxes-with-intent than as a re-authored voxel grid.
 *
 * The rule that makes the boxes readable as a creature rather than a pile: the top third of the
 * height is the HEAD, because that is exactly where swan_pipe's v2 part split cuts (see
 * swan_pipe_stages.rig_and_animate). A creature whose head does not occupy its own top third
 * gets a head part that is half a shoulder.
 *
 *   node tools/blender/author-blockout.mjs <name> <out.obj>
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** [x0,x1, y0,y1, z0,z1] — axis-aligned, y-up, feet at y=0, facing +z. */
export const BLOCKOUTS = {
  // The baseline horror: a hunched crawler-biped. Squat legs, a forward-slumped mass, stubby
  // arms, and a wedge head that juts AHEAD of the chest — the "leading with the face" read.
  fryling: [
    [-2, -1, 0, 2, -1, 1], [1, 2, 0, 2, -1, 1],          // legs
    [-2, 2, 2, 4, -1, 1],                                 // hunched torso
    [-3, -2, 2, 3, 0, 2], [2, 3, 2, 3, 0, 2],             // stubby arms, thrown forward
    [-1, 1, 4, 6, 0, 3],                                  // head: top third, jutting forward
    [-1, 1, 4, 5, 3, 4],                                  // snout wedge
  ],
  // The bruiser: a bulbous sac on short legs with a drooping crest. Wide at the middle, narrow at
  // the base — top-heavy silhouette so it reads as unstable weight, not a cube.
  'drip-cyst': [
    [-1, 1, 0, 1, -1, 1],                                 // stubby base
    [-2, 2, 1, 4, -2, 2],                                 // the sac (widest mass)
    [-3, -2, 2, 3, -1, 1], [2, 3, 2, 3, -1, 1],           // side bulges
    [-1, 1, 4, 6, -1, 1],                                 // crest/head, top third
    [-1, 1, 5, 6, 1, 3],                                  // drip lobe hanging forward
  ],
  // The flier: a fat thorax slung between two wing planes, tiny legs, blunt head. Wings are what
  // make it unmistakable in one frame.
  'grease-fly': [
    [-1, 1, 0, 1, -1, 1],                                 // legs/underslung
    [-1, 1, 1, 4, -2, 2],                                 // thorax
    [-4, -1, 2, 3, -1, 2], [1, 4, 2, 3, -1, 2],           // wing planes
    [-1, 1, 5, 7, 1, 3],                                  // head on a neck, alone in the top third
    [-1, 1, 4, 5, 0, 2],                                  // neck
  ],
  // The armoured crawler: a long segmented low body with plate ridges down the spine and a blunt
  // head at one end. Length is its identity; the ridges keep it from reading as a brick.
  // The armoured crawler REARS: its head end lifts clear of the body, which is both true to a
  // caterpillar's threat pose and the only way a horizontal creature can own a top third — the v2
  // split cuts by HEIGHT, so a head that lies flat beside the body cannot be a head part at all.
  'patty-larva': [
    [-4, -2, 0, 1, -1, 1], [-2, 0, 0, 1, -1, 1], [0, 2, 0, 1, -1, 1], // three body segments
    [-3, 1, 1, 2, 0, 1],                                  // one plate ridge (offset = segmentation)
    [2, 3, 1, 3, -1, 1],                                  // the rearing neck
    [2, 4, 3, 5, -1, 1],                                  // head, lifted into its own top third
  ],
  // The kissing bug: a long flat shield-back on a raised cone head with a proboscis spike. Built
  // as SCULPTED boxes rather than from the 26-voxel roster grid — the grid's box count put a floor
  // under LOD2 that the registry tier table refuses (measured 216 tris = 33% of lod0, ceiling
  // 25%). The fix is fewer, more deliberate boxes, NOT a looser gate: the silhouette that carries
  // this creature is the spike and the shield trapezoid, and both survive at 6 boxes.
  'kissing-bug': [
    [-1, 1, 0, 1, -1, 1],                                 // low legs
    [-3, 1, 1, 2, -2, 2],                                 // flat shield-back (the wide read)
    [-3, -2, 1, 2, -1, 1],                                // rear taper
    [1, 2, 1, 3, -1, 1],                                  // neck riser
    [1, 3, 3, 5, -1, 1],                                  // cone head, alone in the top third
    [3, 6, 3, 4, 0, 1],                                   // the proboscis spike
  ],
};

const [name, out] = process.argv.slice(2);
if (!name || !out) {
  console.error('usage: node tools/blender/author-blockout.mjs <name> <out.obj>');
  process.exit(2);
}
const boxes = BLOCKOUTS[name];
if (!boxes) {
  console.error(`unknown blockout "${name}" — known: ${Object.keys(BLOCKOUTS).join(', ')}`);
  process.exit(2);
}

const v = []; const f = []; let n = 0;
for (const [x0, x1, y0, y1, z0, z1] of boxes) {
  for (const p of [[x0, y0, z0], [x0, y0, z1], [x0, y1, z0], [x0, y1, z1],
    [x1, y0, z0], [x1, y0, z1], [x1, y1, z0], [x1, y1, z1]]) v.push(`v ${p.join(' ')}`);
  for (const s of [[1, 2, 4, 3], [5, 7, 8, 6], [1, 5, 6, 2], [3, 4, 8, 7], [1, 3, 7, 5], [2, 6, 8, 4]]) {
    f.push(`f ${s.map((i) => i + n).join(' ')}`);
  }
  n += 8;
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `# enemy.${name} — sculpted blockout, ${boxes.length} boxes (S3 re-sculpt 2026-09-02)\n${v.join('\n')}\n${f.join('\n')}\n`);
const ys = boxes.flatMap(([, , y0, y1]) => [y0, y1]);
const top = Math.max(...ys); const bot = Math.min(...ys);
const headStart = bot + (top - bot) * (2 / 3);
const headBoxes = boxes.filter(([, , , y1]) => y1 > headStart).length;
console.log(`${name}: ${boxes.length} boxes, height ${top - bot}, ${headBoxes} box(es) reach the head third (y>=${headStart.toFixed(2)})`);
if (headBoxes === 0) { console.error('NO box reaches the head third — the v2 split would produce an empty head part'); process.exit(1); }
