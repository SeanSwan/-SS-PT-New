/**
 * vault.test.mjs — S5 acceptance tests (blueprint §S5, SWA-185).
 * ==============================================================
 *   (bake-off tests live in bakeoff.test.mjs — Rule 4 file cap)
 *   V1  the seeded fixture vault validates clean, counted by verdict
 *   V2  an image with no sidecar, and a sidecar with no image, are both named
 *   V3  `source: scraped` is refused with the licensing reason (law 1)
 *   V4  a misfiled exemplar (verdict != folder) is a defect, not a warning
 *   V5  fixtures are excluded from consumption unless opted into loudly
 *   V6  awe_photo with an EMPTY vault fails loudly — no invented hero
 *   V7  awe_photo with fixtures allowed resolves plates, rides the plan, and
 *       reaches the DOM as a real <img> (the writer-without-reader cure)
 *   V8  the crop id is GEOMETRY-derived, not id-derived — recolored twins
 *       collide, which is what makes the distinctness law non-tautological
 *   V9  two directions resolving one hero crop HALT the run
 *   V15 the plate meter fires only when plates exist, and FAILS on a broken one
 *   V18 REGRESSION: the contrast auto-fix must not drop the plates it re-renders
 *   V19 a declared-but-absent plate FAILS the plan-vs-DOM meter (fail-closed)
 *   V22 the vault enums are contracts: `scraped` is unrepresentable
 *   V23 vault family matching cannot silently drift from the IR fingerprint
 *   V24 PLATE_SECTIONS is the plate vocabulary the contract depends on
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readVault, consumable, validateSidecar, selectExemplars, familyOf, VERDICTS, SOURCES, REQUIRED_FIELDS } from '../vault/vault.mjs';
import { slotCropId, assertDistinctHeroCrops, PLATE_SECTIONS } from '../stages/materials.mjs';
import { irFingerprint } from '../ir.mjs';
import { runLoop, StateError } from '../state-machine.mjs';
import { DEFAULT_STAGES, loadProfile } from '../run.mjs';
import { validateMaterialPlan } from '../contracts.mjs';
import { browserMeters, inspectAll } from '../stages/inspect.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VAULT = join(HERE, '..', 'vault', 'exemplars', 'swan');
const AWE_BRIEF = JSON.parse(readFileSync(join(HERE, '..', 'briefs', 'homepage-awe.json'), 'utf8'));

const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), 'vault-'));
  return { runRoot: join(dir, 'runs'), ledgerPath: join(dir, 'ledger.jsonl'), dir };
};

/** A scratch vault; `seed` copies the committed fixtures in. */
function scratchVault({ seed = false } = {}) {
  const root = join(mkdtempSync(join(tmpdir(), 'vx-')), 'swan');
  for (const v of VERDICTS) mkdirSync(join(root, v), { recursive: true });
  if (seed) {
    for (const [v, stem] of [['win', 'fx-split-ledger-win'], ['win', 'fx-editorial-column-win'], ['fail', 'fx-card-sprawl-fail'], ['borderline', 'fx-kpi-strip-borderline']]) {
      copyFileSync(join(VAULT, v, `${stem}.png`), join(root, v, `${stem}.png`));
      copyFileSync(join(VAULT, v, `${stem}.json`), join(root, v, `${stem}.json`));
    }
  }
  return root;
}

const sidecar = (over = {}) => ({
  id: 'ex-test', verdict: 'win', skeleton_family: 'split-asymmetric',
  signature_moment: 'the ledger is the composition', why: 'test fixture',
  source: 'first-party', ranked_by: 'sean', ranked_at: '2026-08-21', ...over,
});

const briefWith = (mutate) => { const b = JSON.parse(JSON.stringify(AWE_BRIEF)); mutate(b); return b; };

test('V1 the seeded fixture vault validates clean and counts by verdict', () => {
  const v = readVault(VAULT);
  assert.deepEqual(v.defects, []);
  assert.equal(v.exemplars.length, 4);
  assert.equal(v.exemplars.filter((e) => e.verdict === 'win').length, 2);
  assert.ok(v.exemplars.every((e) => existsSync(e.image_path)), 'every exemplar points at a real image on disk');
});

test('V2 an unpaired image and an unpaired sidecar are both named', () => {
  const root = scratchVault();
  copyFileSync(join(VAULT, 'win', 'fx-split-ledger-win.png'), join(root, 'win', 'orphan.png'));
  writeFileSync(join(root, 'fail', 'ghost.json'), JSON.stringify(sidecar({ id: 'ghost', verdict: 'fail' })));
  const v = readVault(root);
  assert.ok(v.defects.some((d) => /orphan\.png: image has no sidecar/.test(d)), v.defects.join('\n'));
  assert.ok(v.defects.some((d) => /ghost: sidecar has no image file/.test(d)), v.defects.join('\n'));
});

test('V3 source: scraped is refused with the licensing reason', () => {
  const defects = validateSidecar(sidecar({ source: 'scraped' }), { verdictDir: 'win', imagePresent: true });
  assert.equal(defects.length, 1);
  assert.match(defects[0], /scraped exemplars are refused outright \(licensing\)/);
});

test('V4 a misfiled exemplar (verdict != folder) is a defect', () => {
  const defects = validateSidecar(sidecar({ verdict: 'fail' }), { verdictDir: 'win', imagePresent: true });
  assert.ok(defects.some((d) => /contradicts its folder/.test(d)), defects.join('\n'));
});

test('V5 fixtures are excluded from consumption unless opted into loudly', () => {
  const v = readVault(VAULT);
  assert.equal(consumable(v.exemplars).length, 0, 'default consumption sees no fixture');
  assert.equal(consumable(v.exemplars, { allowFixtures: true }).length, 4);
  // and a system-ranked exemplar never counts, fixture or not
  assert.equal(consumable([{ source: 'first-party', ranked_by: 'system' }]).length, 0);
});

test('V6 awe_photo with an empty vault fails loudly — no invented hero', async () => {
  const empty = scratchVault();
  await assert.rejects(
    runLoop({ brief: AWE_BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), browserInspect: false, vaultRoot: empty, ...fresh() }),
    (err) => err instanceof StateError && err.state === 'MATERIALS' && /Refusing to invent a hero/.test(err.message),
  );
});

test('V6b awe_photo also fails when the vault holds ONLY fixtures and the brief has not opted in', async () => {
  const brief = briefWith((b) => { b.allow_fixture_exemplars = false; });
  await assert.rejects(
    runLoop({ brief, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), browserInspect: false, vaultRoot: scratchVault({ seed: true }), ...fresh() }),
    (err) => err instanceof StateError && err.state === 'MATERIALS' && /Refusing to invent a hero/.test(err.message),
  );
});

test('V7 awe_photo resolves plates, rides the plan, and reaches the DOM as a real img', async () => {
  const { receipt, ctx } = await runLoop({
    brief: AWE_BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(),
    browserInspect: false, vaultRoot: scratchVault({ seed: true }), ...fresh(),
  });
  const plan = ctx.artifacts.materials;
  assert.deepEqual(validateMaterialPlan(plan), []);
  assert.equal(plan.strategy, 'awe_photo');
  assert.equal(plan.fixtures_allowed, true, 'a fixture-steered run is visibly not a production run');

  const plates = plan.slots.filter((s) => s.plate);
  assert.ok(plates.length >= 1, 'at least one plate slot resolved');
  for (const p of plates) {
    assert.match(p.resolution, /^(exemplar|lineage):.+@crop-/);
    assert.ok(p.crop_id, 'every plate carries a geometry-derived crop id');
  }
  // the plan is hash-pinned into the receipt (receipt or it did not happen)
  assert.ok(receipt.state_log.find((s) => s.state === 'MATERIALS')?.artifact_hash);
  // and the plate REACHES the page — this is the reader that makes the plan consumed
  const html = readFileSync(ctx.artifacts.render.html_path, 'utf8');
  assert.match(html, new RegExp(`data-plate-crop="${plates[0].crop_id}"`));
  assert.match(html, /<img src="[^"]+\.png" alt="" data-plate/);
});

test('V8 the crop id is geometry-derived, not id-derived (the law is not tautological)', () => {
  const fp = { hero: 'split-asymmetric', grid: '12col-asymmetric', sections: ['hero', 'proof-list'], cardinalities: [3, 3], cards: 0 };
  const recoloredTwin = { ...fp };
  assert.equal(slotCropId(fp, 0), slotCropId(recoloredTwin, 0),
    'identical geometry MUST collide — that collision is what the fleet gate catches');
  const genuinelyDifferent = { ...fp, hero: 'single-column', grid: 'single-column' };
  assert.notEqual(slotCropId(fp, 0), slotCropId(genuinelyDifferent, 0));
});

test('V9 two directions resolving one hero crop HALT the run', () => {
  const fp = { hero: 'split-asymmetric', grid: '12col-asymmetric', sections: ['hero', 'proof-list'], cardinalities: [3, 3], cards: 0 };
  assert.throws(
    () => assertDistinctHeroCrops([{ skeleton_id: 'X1', fingerprint: fp }, { skeleton_id: 'X2', fingerprint: { ...fp } }]),
    /resolve the SAME hero crop.*one plate world skinned twice/s,
  );
  // a fleet with genuinely divergent geometry passes
  assert.doesNotThrow(() => assertDistinctHeroCrops([
    { skeleton_id: 'X1', fingerprint: fp },
    { skeleton_id: 'X2', fingerprint: { ...fp, hero: 'centered-fullbleed', grid: '3col-card' } },
  ]));
});

test('V9b selectExemplars prefers an exact family match, then falls back within the verdict', () => {
  const pool = consumable(readVault(VAULT).exemplars, { allowFixtures: true });
  const [first] = selectExemplars(pool, { skeleton_family: 'single-column-editorial-inline', verdict: 'win', limit: 2 });
  assert.equal(first.id, 'fx-editorial-column-win', 'exact family wins');
  const fallback = selectExemplars(pool, { skeleton_family: 'nothing-matches-this', verdict: 'win', limit: 1 });
  assert.equal(fallback.length, 1, 'a same-verdict win still carries more signal than an adjective');
});

// --- S5 plate-outcome meter (hostile round 1: a stamped plate that never
// --- decoded would otherwise pass every gate) -------------------------------

test('V15 the plate meter is emitted only when plates exist, and FAILS on a broken plate', () => {
  const none = browserMeters({ viewports: [{ viewport: { width: 375 }, contrastFails: [], tapFails: [], ctaTop: 0, ctaInFold: true, minFont: 16, plateCount: 0, plateFails: [] }] });
  assert.equal(none.filter((m) => m.meter.startsWith('browser:plates_loaded')).length, 0,
    'a type_data surface declares no plates and must not gain a plate meter');

  const broken = browserMeters({ viewports: [{ viewport: { width: 375 }, contrastFails: [], tapFails: [], ctaTop: 0, ctaInFold: true, minFont: 16, plateCount: 1, plateFails: [{ src: 'missing.png', reason: 'decoded to zero width' }] }] });
  const meter = broken.find((m) => m.meter === 'browser:plates_loaded@375');
  assert.ok(meter, 'a page declaring a plate gains the meter');
  assert.equal(meter.pass, false, 'a plate that never decoded must FAIL the run');
});

test('V18 REGRESSION: the contrast auto-fix must not drop the plates it re-renders', async () => {
  // Repro: `renderOpts.textToken:'surface'` seeds a contrast failure, so REVISE
  // fires its token-swap re-render. Before the fix that re-render carried no
  // plates: the plan declared one, the shipped page had none, and the loop still
  // reported all_meters_pass — a silent hero-less awe surface.
  const { ctx } = await runLoop({
    brief: AWE_BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), browserInspect: false,
    vaultRoot: scratchVault({ seed: true }), renderOpts: { textToken: 'surface' }, ...fresh(),
  });
  assert.match(ctx.artifacts.revise.revision, /contrast-token-swap/, 'the revision lane must actually have fired');

  const declared = ctx.artifacts.materials.slots.filter((s) => s.plate);
  const finalHtml = readFileSync(ctx.artifacts.revise.html_path, 'utf8');
  for (const p of declared) {
    assert.match(finalHtml, new RegExp(`data-plate-crop="${p.crop_id}"`),
      `the revised page dropped plate ${p.crop_id}`);
  }
  const meter = ctx.artifacts.verify && ctx.artifacts.inspect.meters.find((m) => m.meter === 'plates_declared_vs_rendered');
  assert.ok(meter, 'the plan-vs-DOM meter must be present whenever plates are declared');
  assert.equal(meter.pass, true);
});

test('V19 the plan-vs-DOM meter FAILS when a declared plate is missing from the file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'drop-'));
  const page = join(dir, 'page.html');
  writeFileSync(page, '<main data-skeleton="X"><section data-zone="hero" data-section-type="hero"></section></main>');
  const ctx = {
    runDir: dir, browserInspect: false,
    artifacts: {
      ir: { skeleton_id: 'X', zones: [{ zone: 'hero', section_type: 'hero' }], card_budget: 0, anti_specs: [] },
      materials: { slots: [{ slot: 'hero', plate: true, crop_id: 'crop-deadbeef' }] },
    },
  };
  const { meters } = await inspectAll(ctx, { html_path: page });
  const meter = meters.find((m) => m.meter === 'plates_declared_vs_rendered');
  assert.ok(meter, 'meter emitted because the plan declared a plate');
  assert.equal(meter.pass, false, 'a declared-but-absent plate must FAIL, not be silent');
  assert.deepEqual(meter.value.missing, ['crop-deadbeef']);
});

test('V22 the vault enums are CONTRACTS: scraped is unrepresentable, fields are fixed', () => {
  assert.ok(!SOURCES.includes('scraped'),
    'the whole licensing law is that "scraped" has no valid representation — never add it');
  assert.deepEqual([...SOURCES], ['first-party', 'licensed', 'fixture']);
  assert.deepEqual([...VERDICTS], ['win', 'fail', 'borderline']);
  for (const f of ['id', 'verdict', 'skeleton_family', 'signature_moment', 'why', 'source', 'ranked_by', 'ranked_at']) {
    assert.ok(REQUIRED_FIELDS.includes(f), `${f} must stay required — a ranking missing it cannot steer`);
  }
  assert.throws(() => { SOURCES.push('scraped'); }, 'the source enum is frozen');
});

test('V23 vault family matching cannot silently drift from the IR fingerprint', () => {
  // familyOf() and ir.mjs's internal family() must agree, or exemplar selection
  // starts matching on a different notion of "family" than the fleet gate does —
  // a silent divergence with no failing meter anywhere.
  for (const mech of ['split-asymmetric-plate-left-price-right', 'single-column-editorial-plate-inline', 'no-hero-kpi-strip-prices-first']) {
    const viaIr = irFingerprint({
      zones: [{ section_type: 'hero', cardinality: 1 }], grid: 'g-x', nav_model: 'n-x',
      hero_mechanics: mech, card_budget: 0,
    }).hero;
    assert.equal(familyOf(mech), viaIr, `family disagreement on "${mech}"`);
  }
});

test('V24 PLATE_SECTIONS is the plate vocabulary the contract depends on', () => {
  assert.ok(PLATE_SECTIONS.includes('hero'), 'a hero must be able to carry a plate');
  assert.ok(PLATE_SECTIONS.includes('media-plate'));
  assert.ok(!PLATE_SECTIONS.includes('price-ledger'), 'a price ledger is type+data, never an image plate');
});
