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
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate-asset.mjs';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Minimal REAL GLBs for the presence fixtures (a name check against a registry is not a
// presence check against bytes). Written beside the selftest, deleted on exit.
function glb(gltf) {
  let j = Buffer.from(JSON.stringify(gltf)); while (j.length % 4) j = Buffer.concat([j, Buffer.from(' ')]);
  const ch = (d, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(d.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, d]); };
  const cj = ch(j, 0x4e4f534a); const cb = ch(Buffer.alloc(0), 0x004e4942);
  const hd = Buffer.alloc(12); hd.write('glTF', 0); hd.writeUInt32LE(2, 4); hd.writeUInt32LE(12 + cj.length + cb.length, 8);
  return Buffer.concat([hd, cj, cb]);
}
const GLB_NO_SKIN = '.selftest-noskin.glb';
const GLB_WITH_SKIN = '.selftest-skin.glb';
writeFileSync(join(ROOT, GLB_NO_SKIN), glb({ asset: { version: '2.0' }, meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [{ count: 3 }] }));
writeFileSync(join(ROOT, GLB_WITH_SKIN), glb({ asset: { version: '2.0' }, meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [{ count: 3 }], skins: [{ joints: [0] }], animations: [{ name: 'move' }] }));
process.on('exit', () => { for (const f of [GLB_NO_SKIN, GLB_WITH_SKIN]) { try { unlinkSync(join(ROOT, f)); } catch {} } });
const sha = (rel) => createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');

/* ------------------------------------------------------------------ selftest */

function selftest() {
  const registry = {
    assets: [{ id: 'enemy.fryling', budgetPriors: { lod0Triangles: 1500 } }],
    skeletons: [{ id: 'skeleton.creature-small.v1', clips: ['idle', 'move', 'attack', 'hit', 'death'] }],
    zones: [{ id: 'world.miniature-play.voxel-realm/zone.aftertaste.fallen-food-court', chromeLaw: { embedded: 'A', standalone: 'B' } }],
    licensePolicy: { kindValues: ['owner-authored', 'cc0', 'ccby', 'model'] },
    statusValues: ['planned', 'in-progress', 'validated', 'shipped', 'retired'],
  };
  const worldIds = new Set(['world.miniature-play.voxel-realm']);
  const ctx = { registry, worldIds, manifestDir: ROOT };

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
    runtime: { lod0: 'x', lod1: 'x', lod2: 'x', collision: 'x', compression: 'none' },
    sha256: {},
  });

  const cases = [
    ['unregistered id is refused', (m) => { m.id = 'enemy.nope'; }, /NOT in assets\/registry/],
    ['flat zone id is refused', (m) => { m.zone = 'zone.flat'; }, /flat/],
    ['unknown clip is refused', (m) => { m.animations.push('dance'); }, /not in skeleton/],
    ['bare budget number is refused', (m) => { m.budgets = { lod0Triangles: 1500 }; }, /fabricated number/],
    ['budget with provenance is accepted', (m) => { m.budgets = { lod0Triangles: 1500, tool: 'gltf-transform', command: 'x', date: '2026-08-25', commit: 'abc' }; }, null],
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
    ['budget commit that does not exist in the repo is refused', (m) => { m.budgets = { lod0Triangles: 1, tool: 't', command: 'c', date: '2026-08-25', commit: 'deadbeefdead' }; }, /not a commit in this repository/],
    ['aiAssisted without weights hash is refused', (m) => { m.provenance.aiAssisted = true; m.provenance.generator = { name: 'a', version: '1' }; m.provenance.seed = 1; }, /weightsSha256/],
    ['Draco on a rigged asset is refused', (m) => { m.runtime.compression = 'draco'; }, /Draco on a rigged/],
    ['missing sha256 is refused', () => {}, /sha256\.lod0 missing|file not found/],
    // Regression pins for defects found by RUNNING the code, not reading it. Both seats
    // noted the 11 original fixtures did not cover the bug R1 found (Ox + GLM, P1 panel).
    ['aiAssisted: null is refused (R1 regression — null !== undefined)', (m) => { m.provenance.aiAssisted = null; }, /aiAssisted must be true or false/],
    ['aiAssisted: "false" string is refused (falsy matrix)', (m) => { m.provenance.aiAssisted = 'false'; }, /aiAssisted must be true or false/],
    ['runtime path escaping the asset dir is refused', (m) => { m.runtime.lod0 = '../../../etc/passwd'; }, /escapes the asset directory/],
    ['absolute runtime path is refused', (m) => { m.runtime.lod0 = '/etc/passwd'; }, /must be a relative path/],
    ['__proto__ in the manifest does not poison defaults', (m) => { m.__proto__ = { similarityReviewed: true }; m.provenance.similarityReviewed = false; }, /similarityReviewed/],
  ];

  let pass = 0; let fail = 0;
  for (const [name, mutate, expect] of cases) {
    const m = base(); mutate(m);
    const { errs } = validate(m, ctx);
    const joined = errs.join(' | ');
    const ok = expect === null
      ? !errs.some((e) => /fabricated number/.test(e))
      : expect.test(joined);
    if (ok) { pass += 1; console.log(`  PASS  ${name}`); }
    else { fail += 1; console.log(`  FAIL  ${name}\n        got: ${joined || '(no errors)'}`); }
  }
  console.log(`\n[validate-asset] selftest ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
}


selftest();
