/**
 * diverge.test.mjs — S2 acceptance tests (blueprint §S2, SWA-185).
 * ================================================================
 * The panel's demands as assertions:
 *   A1 reproduce today's disease: recolored clones of one skeleton are flagged
 *      non-distinct and the gate refuses (bounded, loud)
 *   A2 the classic centered-hero-3-card skeleton is ALWAYS denylist-rejected
 *   A3 adding a denylist entry regenerates the fleet (data change, no code)
 *   A4 a too-close pair is resampled with an explicit logged lever change
 *   A5 a non-alien wildcard is refused
 *   A6 IR contract refuses an IR with no divergence evidence attached
 *   A7 full-loop integration: the closed loop now carries fleet evidence in its
 *      receipt and the section-type sequence round-trips through the DOM
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diverge, buildIR } from '../diverge.mjs';
import { irDistance } from '../ir.mjs';
import { slopMatches, loadDenylist } from '../slop-denylist.mjs';
import { validateLayoutIR } from '../contracts.mjs';
import { runLoop } from '../state-machine.mjs';
import { DEFAULT_STAGES, loadProfile } from '../run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF = JSON.parse(readFileSync(join(HERE, '..', 'briefs', 'storefront-hero.json'), 'utf8'));

const CONTENT = {
  content_model_id: 'content-test',
  brief_id: BRIEF.brief_id,
  primary_claim: 'Sessions from $110.',
  cta_label: 'Book',
  sections: [
    { slot: 'hero', heading: 'H', facts: ['a $175', 'b', 'c'] },
    { slot: 'packages', heading: 'P', facts: ['3-month $8,400', 'e', 'f'] },
    { slot: 'proof', heading: 'R', facts: ['g', 'h', 'i'] },
  ],
};

const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), 'div-'));
  return { runRoot: join(dir, 'runs'), ledgerPath: join(dir, 'ledger.jsonl') };
};
const args = (over = {}) => ({ brief: BRIEF, content: CONTENT, profile: loadProfile(), ...fresh(), ...over });

const mkSkel = (id, nav, hero, grid, extra = {}) => ({
  id, nav_model: nav, hero_mechanics: hero, grid, card_budget: 0,
  section_plan: { hero: 'hero', packages: 'price-ledger', proof: 'proof-list' },
  anti_specs: [], wildcard: false, ...extra,
});

test('A1 today\'s disease: a library of recolored clones is refused, loudly and bounded', () => {
  const clone = (id) => mkSkel(id, 'top-bar-minimal', 'centered-stack-generic', '12col-symmetric');
  const brief = {
    ...BRIEF,
    skeleton_library: [
      clone('C1'), clone('C2'), clone('C3'),
      mkSkel('W', 'side-rail-left', 'no-hero-kpi', '2col-data', { wildcard: true, section_plan: { hero: 'kpi-strip', packages: 'data-table', proof: 'faq' } }),
    ],
  };
  assert.throws(
    () => diverge(args({ brief })),
    /distance gate unsatisfiable/,
    'three clones with different paint must be flagged as ONE structure',
  );
});

test('A2 the centered-3-card showcase is always denylist-rejected, never in a fleet', () => {
  const set = diverge(args());
  const rejected = set.denylist_rejected.find((r) => r.skeleton_id === 'SF3-centered-showcase');
  assert.ok(rejected, 'SF3 must be denylist-rejected');
  assert.ok(rejected.hits.some((h) => h.id === 'hero-3card-cta'));
  assert.ok(!set.directions.some((d) => d.skeleton_id === 'SF3-centered-showcase'));
  // And directly: its IR matches the predicate regardless of styling.
  const sf3 = BRIEF.skeleton_library.find((s) => s.id === 'SF3-centered-showcase');
  assert.ok(slopMatches(buildIR(sf3, CONTENT, BRIEF)).length >= 1);
});

test('A3 adding a denylist entry regenerates the fleet — data change, no code change', () => {
  const before = diverge(args());
  assert.ok(before.directions.some((d) => d.skeleton_id === 'SF1-split-ledger'));

  const extended = [...loadDenylist(), { id: 'ban-price-ledger', why: 'test', match: { section_present: 'price-ledger' } }];
  const after = diverge(args({ denylist: extended }));
  assert.ok(!after.directions.some((d) => d.skeleton_id === 'SF1-split-ledger'), 'newly-banned structure must leave the fleet');
  assert.ok(after.denylist_rejected.some((r) => r.skeleton_id === 'SF1-split-ledger'));
  assert.notEqual(before.recommended, after.recommended);
});

test('A4 a colliding pair resamples with an explicit logged lever change', () => {
  const profile = {
    levers: [
      { lever: 'l1', match: 'alpha', polarity: 'positive', confidence: 0.9 },
      { lever: 'l2', match: 'beta', polarity: 'positive', confidence: 0.8 },
      { lever: 'l3', match: 'gamma', polarity: 'positive', confidence: 0.7 },
      { lever: 'l4', match: 'delta', polarity: 'positive', confidence: 0.6 },
    ],
  };
  const brief = {
    ...BRIEF,
    skeleton_library: [
      mkSkel('K1', 'top-bar-alpha', 'split-asymmetric-alpha', '12col-asymmetric'),
      mkSkel('K2', 'none-anchor-beta', 'single-column-beta', 'single-column-editorial', { section_plan: { hero: 'hero', packages: 'editorial-flow', proof: 'editorial-flow' } }),
      // K3: a RECOLORED CLONE of K1 — same structural families (top-bar /
      // split-asymmetric / 12col-asymmetric), different scored tokens, so it
      // ranks 3rd (above K4) and lands in the initial fleet with its twin.
      mkSkel('K3', 'top-bar-gamma', 'split-asymmetric-gamma', '12col-asymmetric-gamma', { section_plan: { hero: 'hero', packages: 'price-ledger', proof: 'proof-list' } }),
      mkSkel('K4', 'sticky-progress-delta', 'full-bleed-delta', 'single-column-narrative', { section_plan: { hero: 'hero', packages: 'narrative-chapter', proof: 'media-plate' } }),
      mkSkel('W', 'side-rail-left', 'no-hero-kpi', '2col-data', { wildcard: true, section_plan: { hero: 'kpi-strip', packages: 'data-table', proof: 'faq' } }),
    ],
  };

  const set = diverge(args({ brief, profile }));
  assert.equal(set.resample_log.length, 1, 'exactly one resample expected');
  assert.equal(set.resample_log[0].swapped_out, 'K3');
  assert.equal(set.resample_log[0].swapped_in, 'K4');
  assert.ok(set.distance.min.value >= set.tau);
});

test('A5 a wildcard cloning a fleet member is refused as not alien', () => {
  const brief = {
    ...BRIEF,
    skeleton_library: [
      ...BRIEF.skeleton_library.filter((s) => !s.wildcard && s.id !== 'SF3-centered-showcase'),
      { ...BRIEF.skeleton_library.find((s) => s.id === 'SF1-split-ledger'), id: 'W-clone', wildcard: true },
    ],
  };
  assert.throws(() => diverge(args({ brief })), /not alien enough/);
});

test('A6 the IR contract refuses an IR with no divergence evidence', () => {
  const sf1 = BRIEF.skeleton_library.find((s) => s.id === 'SF1-split-ledger');
  const bare = buildIR(sf1, CONTENT, BRIEF);
  const defects = validateLayoutIR(bare);
  assert.ok(defects.some((d) => d.includes('direction_set')), 'a lone IR with no proven fleet must fail the gate');
});

test('A7 full loop: receipt carries fleet evidence; section types round-trip in the DOM', async () => {
  const { ctx } = await runLoop({ brief: BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), ...fresh() });
  const ds = ctx.artifacts.ir.direction_set;
  assert.equal(ds.fleet.length, 4);
  assert.ok(ds.distance_min >= ds.tau);
  assert.ok(ds.denylist_rejected.some((r) => r.skeleton_id === 'SF3-centered-showcase'));
  const meter = ctx.artifacts.inspect.meters.find((m) => m.meter === 'section_types_roundtrip');
  assert.equal(meter.pass, true, 'IR section types must reach the DOM in order');
  assert.equal(ctx.artifacts.verify.all_meters_pass, true);
});

test('A8 distance math sanity: a structure is 0 from itself, high from a stranger', () => {
  const sf1 = buildIR(BRIEF.skeleton_library[0], CONTENT, BRIEF);
  const sf6 = buildIR(BRIEF.skeleton_library.find((s) => s.id === 'SF6-table-first'), CONTENT, BRIEF);
  assert.equal(irDistance(sf1, sf1), 0);
  assert.ok(irDistance(sf1, sf6) > 0.6);
});
