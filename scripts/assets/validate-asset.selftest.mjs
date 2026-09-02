#!/usr/bin/env node
/**
 * validate-asset.selftest.mjs — rule fixtures for the asset gate.
 *
 * Split out of validate-asset.mjs 2026-08-25: the validator hit 305 lines against the
 * repo's 300-line cap (found by my own hostile pass, not by the dry loop — the dry loop
 * tested BEHAVIOUR and never measured the artifact). Fixtures need no repo assets, so
 * this runs anywhere.
 *
 *   node scripts/assets/validate-asset.selftest.mjs
 *   exit 0 = all fixtures pass, 1 = a rule regressed
 */
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate-asset.mjs';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_DIR = mkdtempSync(join(tmpdir(), 'swan-asset-selftest-'));

// Minimal REAL GLBs for the presence fixtures (a name check against a registry is not a
// presence check against bytes). Written beside the selftest, deleted on exit.
function glb(gltf) {  // eslint-disable-line no-unused-vars
  let j = Buffer.from(JSON.stringify(gltf)); while (j.length % 4) j = Buffer.concat([j, Buffer.from(' ')]);
  const ch = (d, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(d.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, d]); };
  const cj = ch(j, 0x4e4f534a); const cb = ch(Buffer.alloc(0), 0x004e4942);
  const hd = Buffer.alloc(12); hd.write('glTF', 0); hd.writeUInt32LE(2, 4); hd.writeUInt32LE(12 + cj.length + cb.length, 8);
  return Buffer.concat([hd, cj, cb]);
}
// A glTF with meshes but NO nodes renders nothing and has no world-space AABB. The first version
// of these fixtures omitted nodes, so the containment rule silently skipped and the fixture
// 'passed' by not running (found when worldAabb replaced the local one, 2026-08-26).
const mesh = (count, mn, mx) => ({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [{ count, min: mn, max: mx }] });
const riggedMesh = (count, mn, mx, clips) => {
  const doc = mesh(count, mn, mx);
  doc.nodes.push({ name: 'root-joint' });
  Object.assign(doc.meshes[0].primitives[0].attributes, { JOINTS_0: 1, WEIGHTS_0: 2 });
  doc.accessors.push({ count }, { count });
  doc.skins = [{ joints: [1] }];
  doc.animations = clips.map((name) => ({ name }));
  return doc;
};
const REQUIRED_CLIPS = ['idle', 'move', 'attack', 'hit', 'death'];
const GLB_LOD0_100 = '.selftest-lod0-100.glb';   // 300 verts non-indexed = 100 tris, box -1..1
const GLB_LOD1_50 = '.selftest-lod1-50.glb';
const GLB_LOD2_40 = '.selftest-lod2-40.glb';     // 120 verts = 40 tris = 40% of lod0 (tier table allows 25%)
const GLB_LOD2_20 = '.selftest-lod2-20.glb';     // 60 verts = 20 tris = 20% — allowed
const GLB_COLL_IN = '.selftest-coll-in.glb';
const GLB_COLL_OUT = '.selftest-coll-out.glb';   // AABB pokes outside the lod0 box
writeFileSync(join(FIXTURE_DIR, GLB_LOD0_100), glb(riggedMesh(300, [-1, -1, -1], [1, 1, 1], REQUIRED_CLIPS)));
writeFileSync(join(FIXTURE_DIR, GLB_LOD1_50), glb(mesh(150, [-1, -1, -1], [1, 1, 1])));
writeFileSync(join(FIXTURE_DIR, GLB_LOD2_40), glb(mesh(120, [-1, -1, -1], [1, 1, 1])));
writeFileSync(join(FIXTURE_DIR, GLB_LOD2_20), glb(mesh(60, [-1, -1, -1], [1, 1, 1])));
writeFileSync(join(FIXTURE_DIR, GLB_COLL_IN), glb(mesh(30, [-0.8, -0.8, -0.8], [0.8, 0.8, 0.8])));
writeFileSync(join(FIXTURE_DIR, GLB_COLL_OUT), glb(mesh(30, [-1, -1, -1], [1, 1, 1.5])));
const GLB_NO_SKIN = '.selftest-noskin.glb';
const GLB_WITH_SKIN = '.selftest-skin.glb';
writeFileSync(join(FIXTURE_DIR, GLB_NO_SKIN), glb(mesh(300, [-1, -1, -1], [1, 1, 1])));
writeFileSync(join(FIXTURE_DIR, GLB_WITH_SKIN), glb(riggedMesh(300, [-1, -1, -1], [1, 1, 1], ['move'])));
// Roster-v2 (D2): a rigged GLB whose meshes live under "part:" named nodes — body box y -1..0.2,
// head box y 0.2..1, whole 2 units tall. Normalized (the frame shapes are declared in): body
// y 0..0.6, head y 0.6..1, footprint ±0.5. 300 verts total = 100 tris, same ratios as LOD0_100.
const partedRiggedMesh = (clips) => ({
  asset: { version: '2.0' }, scene: 0,
  scenes: [{ nodes: [0, 1, 2] }],
  nodes: [
    { name: 'part:body', mesh: 0 },
    { name: 'part:head', mesh: 1 },
    { name: 'root-joint' },
  ],
  meshes: [
    { primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] },
    { primitives: [{ attributes: { POSITION: 3, JOINTS_0: 4, WEIGHTS_0: 5 } }] },
  ],
  accessors: [
    { count: 150, min: [-1, -1, -1], max: [1, 0.2, 1] }, { count: 150 }, { count: 150 },
    { count: 150, min: [-1, 0.2, -1], max: [1, 1, 1] }, { count: 150 }, { count: 150 },
  ],
  skins: [{ joints: [2] }],
  animations: clips.map((name) => ({ name })),
});
const GLB_PARTED = '.selftest-parted.glb';
writeFileSync(join(FIXTURE_DIR, GLB_PARTED), glb(partedRiggedMesh(REQUIRED_CLIPS)));
process.on('exit', () => { try { rmSync(FIXTURE_DIR, { recursive: true, force: true }); } catch {} });
const sha = (rel) => createHash('sha256').update(readFileSync(join(FIXTURE_DIR, rel))).digest('hex');

/* ------------------------------------------------------------------ selftest */

function selftest() {
  const registry = {
    assets: [{ id: 'enemy.fryling', budgetPriors: { lod0Triangles: 1500 } }],
    skeletons: [
      { id: 'skeleton.creature-small.v1', clips: ['idle', 'move', 'attack', 'hit', 'death'] },
      // Roster-v2 (dismemberment contract, D1 2026-09-01): named part bones + a part vocabulary.
      {
        id: 'skeleton.creature-small.v2',
        clips: ['idle', 'move', 'attack', 'hit', 'death'],
        bones: ['root', 'body', 'head', 'limb-l', 'limb-r'],
        partVocabulary: ['body', 'head', 'limb-l', 'limb-r', 'tail'],
        partRules: { requiredParts: ['body'], bonePerPart: true },
      },
    ],
    zones: [{ id: 'world.miniature-play.voxel-realm/zone.aftertaste.fallen-food-court', chromeLaw: { embedded: 'A', standalone: 'B' } }],
    licensePolicy: { kindValues: ['owner-authored', 'cc0', 'ccby', 'model'] },
    statusValues: ['planned', 'in-progress', 'validated', 'shipped', 'retired'],
    budgetPolicy: { tierTable: { lod1MaxFractionOfLod0: 0.5, lod2MaxFractionOfLod0: 0.25 } },
  };
  const worldIds = new Set(['world.miniature-play.voxel-realm']);

  const base = () => ({
    schema: 'swan.game-asset.v1',
    id: 'enemy.fryling',
    status: 'planned',
    targetSurface: 'standalone',
    paletteLaw: 'B',
    zone: 'world.miniature-play.voxel-realm/zone.aftertaste.fallen-food-court',
    skeleton: 'skeleton.creature-small.v1',
    animations: ['idle', 'move', 'attack', 'hit', 'death'],
    budgets: null,
    provenance: {
      humanOwner: 'owner', createdAtUtc: '2026-08-25T12:00:00.000Z', aiAssisted: false,
      similarityReviewed: { reviewer: 'owner', date: '2026-08-25', comparedAgainst: ['trademarks'] },
      license: { kind: 'owner-authored' },
    },
    runtime: { lod0: GLB_LOD0_100, lod1: GLB_LOD1_50, lod2: GLB_LOD2_20, collision: GLB_COLL_IN, compression: 'none' },
    sha256: {
      lod0: sha(GLB_LOD0_100), lod1: sha(GLB_LOD1_50),
      lod2: sha(GLB_LOD2_20), collision: sha(GLB_COLL_IN),
    },
  });

  const cases = [
    ['unregistered id is refused', (m) => { m.id = 'enemy.nope'; }, /NOT in assets\/registry/],
    ['flat zone id is refused', (m) => { m.zone = 'zone.flat'; }, /flat/],
    ['unknown clip is refused', (m) => { m.animations.push('dance'); }, /not in skeleton/],
    ['planned asset may declare an incomplete clip set', (m) => { m.animations = ['idle']; }, null],
    ['validated asset missing required clips is refused', (m) => { m.status = 'validated'; m.animations = ['idle']; }, /validated asset is missing required skeleton clips/],
    ['bare budget number is refused', (m) => { m.budgets = { lod0Triangles: 1500 }; }, /fabricated number/],
    ['budget with provenance is accepted', (m) => { m.budgets = { lod0Triangles: 100, tool: 'gltf-transform', command: 'x', date: '2026-08-25', commit: 'b68ec1d39' }; }, null],
    // handoff 2026-08-26 s9: a bare textureMB 0 reads as a measured budget, not a missing bake stage
    ['textureMB 0 with no bake declaration is refused', (m) => { m.budgets = { lod0Triangles: 1500, textureMB: 0, tool: 't', command: 'c', date: '2026-08-26', commit: 'abc' }; }, /no budgets\.bake/],
    ['textureMB 0 declared not-baked is accepted', (m) => { m.budgets = { lod0Triangles: 100, textureMB: 0, bake: 'not-baked', tool: 't', command: 'c', date: '2026-08-26', commit: 'b68ec1d39' }; }, null],
    // Ox open item: spawn-on-death had no manifest representation
    ['spawnOnDeath naming an unregistered asset is refused', (m) => { m.spawnOnDeath = ['enemy.ghost']; }, /spawnOnDeath "enemy\.ghost" is NOT in/],
    ['spawnOnDeath naming itself is refused', (m) => { m.spawnOnDeath = ['enemy.fryling']; }, /names the asset itself/],
    ['spawnOnDeath as a non-array is refused', (m) => { m.spawnOnDeath = 'enemy.fryling'; }, /must be an array/],
    ['free-text license is refused', (m) => { m.provenance.license = 'owner-authored'; }, /structured object/],
    ['model license without receipt is refused', (m) => { m.provenance.license = { kind: 'model', modelName: 'a', modelVersion: '1', licenseId: 'x' }; }, /receiptPath required/],
    ['unreviewed similarity is refused', (m) => { m.provenance.similarityReviewed = false; }, /similarityReviewed/],
    // Branch-gate panel 2026-08-25 (Ox, Kimi, HY3, Grok, DeepSeek) — the honour-system findings:
    ['bare similarityReviewed: true is refused (honour bit)', (m) => { m.provenance.similarityReviewed = true; }, /honour bit/],
    ['similarityReviewed without comparedAgainst is refused', (m) => { m.provenance.similarityReviewed = { reviewer: 'x', date: '2026-08-25', comparedAgainst: [] }; }, /comparedAgainst/],
    ['Law-B asset on an embedded (Law-A) surface is refused — chromeLaw', (m) => { m.targetSurface = 'embedded'; m.paletteLaw = 'B'; }, /violates zone chromeLaw/],
    ['zone-bound asset with no targetSurface is refused', (m) => { delete m.targetSurface; }, /targetSurface must be one of/],
    ['status outside statusValues is refused', (m) => { m.status = 'done'; }, /status must be one of/],
    ['unknown compression value is refused', (m) => { m.runtime.compression = 'garbage'; }, /compression must be one of/],
    ['budget commit that is not a git id is refused', (m) => { m.budgets = { lod0Triangles: 1, tool: 't', command: 'c', date: '2026-08-25', commit: 'not-a-commit' }; }, /not a git object id/],
    // N1 self-review probe A: manifest declared a skeleton + 5 clips; the GLB had 0 skins, 0 clips.
    ['declared skeleton with NO skin in the GLB is refused', (m) => { m.runtime.lod0 = GLB_NO_SKIN; m.sha256.lod0 = sha(GLB_NO_SKIN); }, /contains no skin/],
    ['declared clip absent from the GLB is refused', (m) => { m.runtime.lod0 = GLB_WITH_SKIN; m.sha256.lod0 = sha(GLB_WITH_SKIN); m.animations = ['idle']; }, /animation "idle" declared but not present/],
    // GLM 5.3 N1 blocker 2 (tautological budgets) and blocker 6 (collision containment)
    ['lod2 at 40% of lod0 is refused by the tier table (25%)', (m) => { m.runtime.lod0 = GLB_LOD0_100; m.runtime.lod2 = GLB_LOD2_40; m.sha256.lod0 = sha(GLB_LOD0_100); m.sha256.lod2 = sha(GLB_LOD2_40); }, /misses its budget/],
    ['lod2 at 20% of lod0 passes the tier table', (m) => { m.runtime.lod0 = GLB_LOD0_100; m.runtime.lod2 = GLB_LOD2_20; m.sha256.lod0 = sha(GLB_LOD0_100); m.sha256.lod2 = sha(GLB_LOD2_20); }, null],
    ['collision AABB outside lod0 AABB is refused', (m) => { m.runtime.lod0 = GLB_LOD0_100; m.runtime.collision = GLB_COLL_OUT; m.sha256.lod0 = sha(GLB_LOD0_100); m.sha256.collision = sha(GLB_COLL_OUT); }, /collision AABB \(world space\) exceeds/],
    ['budget commit that does not exist in the repo is refused', (m) => { m.budgets = { lod0Triangles: 1, tool: 't', command: 'c', date: '2026-08-25', commit: 'deadbeefdead' }; }, /not a commit in this repository/],
    ['aiAssisted without weights hash is refused', (m) => { m.provenance.aiAssisted = true; m.provenance.generator = { name: 'a', version: '1' }; m.provenance.seed = 1; }, /weightsSha256/],
    ['Draco on a rigged asset is refused', (m) => { m.runtime.compression = 'draco'; }, /Draco on a rigged/],
    ['missing sha256 is refused', (m) => { delete m.sha256.lod0; }, /sha256\.lod0 missing/],
    // Regression pins for defects found by RUNNING the code, not reading it. Both seats
    // noted the 11 original fixtures did not cover the bug R1 found (Ox + GLM, P1 panel).
    ['aiAssisted: null is refused (R1 regression — null !== undefined)', (m) => { m.provenance.aiAssisted = null; }, /aiAssisted must be true or false/],
    ['aiAssisted: "false" string is refused (falsy matrix)', (m) => { m.provenance.aiAssisted = 'false'; }, /aiAssisted must be true or false/],
    ['runtime path escaping the asset dir is refused', (m) => { m.runtime.lod0 = '../../../etc/passwd'; }, /escapes the asset directory/],
    ['absolute runtime path is refused', (m) => { m.runtime.lod0 = '/etc/passwd'; }, /must be a relative path/],
    ['__proto__ in the manifest does not poison defaults', (m) => { m.__proto__ = { similarityReviewed: true }; m.provenance.similarityReviewed = false; }, /similarityReviewed/],
    // --- roster-v2 parts contract (D1 structure, 2026-09-01) — controls written RED-first ------
    ['a well-formed v2 parts manifest is accepted (positive control)', (m) => { V2(m); }, null],
    ['parts on a skeleton with no part vocabulary is refused', (m) => { m.parts = V2_PARTS(); }, /has no partVocabulary/],
    ['a part tag outside the vocabulary is refused', (m) => { V2(m); m.parts[1].tag = 'wing'; }, /tag "wing" is not in/],
    ['a part bone the skeleton does not have is refused', (m) => { V2(m); m.parts[1].bone = 'tail-9'; }, /bone "tail-9" is not in/],
    ['duplicate part tags are refused', (m) => { V2(m); m.parts[1].tag = 'body'; m.parts[1].severable = false; }, /duplicate part tag/],
    ['zero non-severable body parts is refused', (m) => { V2(m); m.parts[0].severable = true; m.parts[0].severAtHpFraction = 0.5; m.parts[0].onSever = 'none'; }, /exactly one non-severable "body"/],
    ['a severable part with no severAtHpFraction is refused', (m) => { V2(m); delete m.parts[1].severAtHpFraction; }, /severAtHpFraction/],
    ['severAtHpFraction outside 0..1 is refused', (m) => { V2(m); m.parts[1].severAtHpFraction = 1.5; }, /severAtHpFraction/],
    ['an unknown onSever effect is refused', (m) => { V2(m); m.parts[1].onSever = 'explode'; }, /onSever/],
    ['a hit shape with an unknown kind is refused', (m) => { V2(m); m.parts[0].hitShape = { kind: 'box', c: [0, 0, 0], r: 1 }; }, /hitShape/],
    ['a sphere with a non-positive radius is refused', (m) => { V2(m); m.parts[1].hitShape = { kind: 'sphere', c: [0, 0.8, 0], r: 0 }; }, /radius/],
    ['a capsule missing its second endpoint is refused', (m) => { V2(m); m.parts[0].hitShape = { kind: 'capsule', a: [0, 0.2, 0], r: 0.3 }; }, /capsule/],
    // --- D2 geometry honesty: shapes vs the actual bytes. The rules' bite was proven before
    // these fixtures existed: the D1 positive control went red the moment the geometry check
    // landed, because its GLB carried no part meshes (selftest 47/48, 2026-09-02).
    ['declared part with no matching part-mesh in the bytes is refused', (m) => { V2(m); m.runtime.lod0 = GLB_LOD0_100; m.sha256.lod0 = sha(GLB_LOD0_100); }, /no mesh node named "part:/],
    ['part-tagged bytes with NO parts declared are refused', (m) => { m.runtime.lod0 = GLB_PARTED; m.sha256.lod0 = sha(GLB_PARTED); }, /manifest declares no parts/],
    ['a part mesh in the bytes missing from manifest.parts is refused', (m) => { V2(m); m.parts = [m.parts[0]]; }, /"part:head" is not declared/],
    ['an undersized hit shape is refused by the coverage floor', (m) => { V2(m); m.parts[1].hitShape = { kind: 'sphere', c: [0, 0.8, 0], r: 0.1 }; }, /coverage floor/],
    ['a hit shape centred outside its part is refused', (m) => { V2(m); m.parts[1].hitShape = { kind: 'sphere', c: [0, 0.1, 0], r: 0.45 }; }, /outside the part's normalized bounds/],
  ];

  // A valid v2 parts block, fresh per fixture so mutations never leak between cases. Shapes are
  // honest against GLB_PARTED's normalized boxes (body y 0..0.6, head y 0.6..1, footprint ±0.5).
  function V2_PARTS() {
    return [
      { tag: 'body', bone: 'body', severable: false, hitShape: { kind: 'capsule', a: [0, 0.1, 0], b: [0, 0.5, 0], r: 0.45 } },
      { tag: 'head', bone: 'head', severable: true, severAtHpFraction: 0.0, onSever: 'kill', hitShape: { kind: 'sphere', c: [0, 0.8, 0], r: 0.45 } },
    ];
  }
  // Every v2 parts fixture points lod0 at the parted GLB, so structure AND geometry rules run.
  const V2 = (m) => {
    m.skeleton = 'skeleton.creature-small.v2';
    m.parts = V2_PARTS();
    m.runtime.lod0 = GLB_PARTED;
    m.sha256.lod0 = sha(GLB_PARTED);
  };

  let pass = 0; let fail = 0;
  for (const [name, mutate, expect] of cases) {
    const m = base(); mutate(m);
    const ctx = { registry, worldIds, manifestDir: FIXTURE_DIR, root: ROOT };  // FRESH per fixture — validate() writes into ctx
    const { errs } = validate(m, ctx);
    const joined = errs.join(' | ');
    const ok = expect === null ? errs.length === 0 : expect.test(joined);
    if (ok) { pass += 1; console.log(`  PASS  ${name}`); }
    else { fail += 1; console.log(`  FAIL  ${name}\n        got: ${joined || '(no errors)'}`); }
  }
  console.log(`\n[validate-asset] selftest ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
}


selftest();
