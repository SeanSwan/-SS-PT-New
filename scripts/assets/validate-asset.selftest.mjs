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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* ------------------------------------------------------------------ selftest */

function selftest() {
  const registry = {
    assets: [{ id: 'enemy.fryling', budgetPriors: { lod0Triangles: 1500 } }],
    skeletons: [{ id: 'skeleton.creature-small.v1', clips: ['idle', 'move', 'attack', 'hit', 'death'] }],
    zones: [{ id: 'world.miniature-play.voxel-realm/zone.aftertaste.fallen-food-court' }],
    licensePolicy: { kindValues: ['owner-authored', 'cc0', 'ccby', 'model'] },
  };
  const worldIds = new Set(['world.miniature-play.voxel-realm']);
  const ctx = { registry, worldIds, manifestDir: ROOT };

  const base = () => ({
    schema: 'swan.game-asset.v1',
    id: 'enemy.fryling',
    zone: 'world.miniature-play.voxel-realm/zone.aftertaste.fallen-food-court',
    skeleton: 'skeleton.creature-small.v1',
    animations: ['idle', 'move', 'attack', 'hit', 'death'],
    budgets: null,
    provenance: {
      humanOwner: 'owner', createdAtUtc: '2026-08-25T12:00:00.000Z', aiAssisted: false,
      similarityReviewed: true, license: { kind: 'owner-authored' },
    },
    runtime: { lod0: 'x', lod1: 'x', lod2: 'x', collision: 'x' },
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
