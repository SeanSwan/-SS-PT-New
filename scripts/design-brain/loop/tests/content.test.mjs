/**
 * content.test.mjs — S4 acceptance tests (blueprint §S4, SWA-185).
 * ================================================================
 *   C1 banned marketing register halts the loop AT CONTENT, naming the phrase
 *   C2 placeholder/lorem text halts at CONTENT
 *   C3 an unquantified section fails unless explicitly exempted
 *   C4 superlative-stuffed copy fails the density cap
 *   C5 provenance: unsourced facts are normalized, REPORTED, never hidden;
 *      the fully-sourced storefront brief reports zero unproven facts
 *   C6 content-driven IA (GLM F4's acceptance): the SAME skeleton library with
 *      data-shaped vs narrative-shaped content produces structurally different
 *      fleets, with the clashes recorded per skeleton
 *   C7 full loop: linter report and content rejections ride the artifacts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contentStage } from '../stages/content.mjs';
import { lintContent, classifyShape, typeCompatible } from '../content-lint.mjs';
import { diverge } from '../diverge.mjs';
import { runLoop, StateError } from '../state-machine.mjs';
import { DEFAULT_STAGES, loadProfile } from '../run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF = JSON.parse(readFileSync(join(HERE, '..', 'briefs', 'storefront-hero.json'), 'utf8'));

const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), 'cnt-'));
  return { runRoot: join(dir, 'runs'), ledgerPath: join(dir, 'ledger.jsonl') };
};

const briefWith = (mutate) => {
  const b = JSON.parse(JSON.stringify(BRIEF));
  mutate(b);
  return b;
};

test('C1 banned register halts at CONTENT with the phrase named', async () => {
  const brief = briefWith((b) => { b.facts.sections[0].facts[0] = { text: 'Unleash your potential and transform your journey', source: 'x' }; });
  await assert.rejects(
    runLoop({ brief, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), ...fresh() }),
    (err) => err instanceof StateError && err.state === 'CONTENT' && /banned-register/.test(err.message),
  );
});

test('C2 placeholder text halts at CONTENT', async () => {
  const brief = briefWith((b) => { b.facts.sections[1].facts[1] = { text: 'TODO: write the 6-month pitch', source: 'x' }; });
  await assert.rejects(
    runLoop({ brief, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), ...fresh() }),
    (err) => err instanceof StateError && err.state === 'CONTENT' && /placeholder-text/.test(err.message),
  );
});

test('C3 an unquantified section fails unless explicitly exempted', () => {
  const noNumbers = briefWith((b) => {
    b.facts.sections[2].facts = [{ text: 'Progress you can see and share', source: 'x' }];
  });
  assert.throws(() => contentStage({ brief: noNumbers }), /unquantified-section/);

  const exempted = briefWith((b) => {
    b.facts.sections[2].facts = [{ text: 'Progress you can see and share', source: 'x' }];
    b.facts.sections[2].quantified_exempt = true;
  });
  const model = contentStage({ brief: exempted });
  assert.equal(model.linter_report.violations.length, 0);
});

test('C4 superlative-stuffed copy fails the density cap', () => {
  const stuffed = briefWith((b) => {
    b.facts.sections[0].facts[0] = { text: 'World-class seamless cutting-edge $175 training', source: 'x' };
  });
  assert.throws(() => contentStage({ brief: stuffed }), /superlative-density/);
});

test('C5 provenance: unsourced facts are reported, sourced brief reports none', () => {
  const model = contentStage({ brief: BRIEF });
  assert.equal(model.linter_report.unproven.length, 0, 'the storefront brief is fully sourced');
  assert.ok(model.sections.every((s) => s.facts.every((f) => typeof f.source === 'string')));

  const stringFact = briefWith((b) => { b.facts.sections[0].facts[2] = 'A bare string fact with 26+ years'; });
  const m2 = contentStage({ brief: stringFact });
  assert.equal(m2.linter_report.unproven.length, 1);
  assert.equal(m2.sections[0].facts[2].source, 'unsourced');
});

test('C6 content-driven IA: same library, different content shape, different fleet', () => {
  const mk = (id, nav, hero, grid, plan, wildcard = false) => ({
    id, nav_model: nav, hero_mechanics: hero, grid, card_budget: 0,
    section_plan: plan, anti_specs: [], wildcard,
  });
  const library = [
    mk('D1', 'top-bar-a', 'split-asymmetric-x', '12col-a', { hero: 'hero', main: 'price-ledger' }),
    mk('N1', 'sticky-rail-b', 'full-bleed-y', 'single-narrative', { hero: 'hero', main: 'narrative-chapter' }),
    mk('G1', 'none-anchor-c', 'single-column-z', 'single-editorial', { hero: 'hero', main: 'editorial-flow' }),
    mk('G2', 'top-utility-d', 'table-first-w', '2col-dense', { hero: 'hero', main: 'proof-list' }),
    mk('WD', 'side-rail-e', 'no-hero-v', '2col-data', { hero: 'kpi-strip', main: 'data-table' }, true),
    mk('WN', 'drawer-f', 'poster-overlay-u', 'collage-grid', { hero: 'hero', main: 'media-plate' }, true),
  ];
  const content = (shape) => ({
    content_model_id: 'c-shape',
    sections: [
      { slot: 'hero', shape, facts: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] },
      { slot: 'main', shape, facts: [{ text: 'd' }, { text: 'e' }, { text: 'f' }] },
    ],
  });
  const brief = { ...BRIEF, skeleton_library: library };
  const profile = loadProfile();

  const dataSet = diverge({ brief, content: content('data'), profile, ...fresh() });
  const narrSet = diverge({ brief, content: content('narrative'), profile, ...fresh() });

  const ids = (s) => s.directions.map((d) => d.skeleton_id).sort();
  assert.ok(ids(dataSet).includes('D1') && !ids(dataSet).includes('N1'));
  assert.ok(ids(narrSet).includes('N1') && !ids(narrSet).includes('D1'));
  assert.notDeepEqual(ids(dataSet), ids(narrSet), 'content shape must change the structural fleet');
  assert.ok(dataSet.content_rejected.some((r) => r.skeleton_id === 'N1'));
  assert.ok(narrSet.content_rejected.some((r) => r.skeleton_id === 'D1'));
  assert.equal(dataSet.directions.find((d) => d.wildcard).skeleton_id, 'WD');
  assert.equal(narrSet.directions.find((d) => d.wildcard).skeleton_id, 'WN');
});

test('C7 full loop: linter report and content rejections ride the artifacts', async () => {
  const { ctx } = await runLoop({ brief: BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), ...fresh() });
  assert.deepEqual(ctx.artifacts.content.linter_report.violations, []);
  assert.deepEqual(ctx.artifacts.content.linter_report.unproven, []);
  assert.ok(ctx.artifacts.content.sections.every((s) => ['data', 'narrative', 'mixed'].includes(s.shape)));
  assert.ok(Array.isArray(ctx.artifacts.ir.direction_set.content_rejected));
  assert.equal(ctx.artifacts.verify.all_meters_pass, true);
});

test('C8 shape math sanity', () => {
  assert.equal(classifyShape([{ text: '$175' }, { text: '$110' }, { text: '$8,400' }]), 'data');
  assert.equal(classifyShape([{ text: 'prose' }, { text: 'words' }, { text: 'story' }]), 'narrative');
  assert.equal(typeCompatible('price-ledger', 'narrative'), false);
  assert.equal(typeCompatible('narrative-chapter', 'data'), false);
  assert.equal(typeCompatible('editorial-flow', 'data'), true);
});
