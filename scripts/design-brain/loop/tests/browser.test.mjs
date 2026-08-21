/**
 * browser.test.mjs — S3 acceptance tests: the real-browser deterministic lane.
 * ============================================================================
 *   B1 full loop with the browser lane ON: browser meters present, screenshots
 *      on disk at 375 and 1440, verify green on the real storefront render
 *   B2 seeded horizontal overflow is caught at 375 by real geometry
 *   B3 seeded sub-44px tap target is caught
 *   B4 seeded low COMPUTED contrast (var chain resolved by the browser) caught
 *   B5 explicit config skip is recorded as a meter, never silent
 *   B6 unavailable browser while required FAILS the meter (fail-closed)
 *   V16 a missing plate file is reported as an outcome failure (S5)
 *   V17 the real awe render decodes its plate in a real browser (S5)
 *   M1  a seeded infinite above-fold loop is caught (S6)
 *   M2  a seeded layout-property transition is caught (S6)
 *   M3  REGRESSION: a page with no animation produces ZERO motion findings
 *   M4  the scroll strip produces six stills per viewport, on disk
 *   M5  the reduced-motion run is recorded, never silently skipped
 *   M6  motion meters ride INSPECT and fire on a seeded defect
 *   M7  the calibration SET is honest: every planted defect fails its meter
 *
 * ALL browser-launching tests live in THIS file on purpose: node --test runs
 * files in parallel, and two files each launching headless Chromium made
 * screenshot capture fail under contention — a suite that passed per-file and
 * failed as a suite. One owner for the browser lane, no flake.
 *
 * If Playwright cannot be resolved, tests B1–B4 SKIP VISIBLY — a skip is a
 * statement, silence is a lie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePlaywright, captureAndMeasure, SCROLL_STOPS } from '../capture.mjs';
import { runLoop } from '../state-machine.mjs';
import { DEFAULT_STAGES, loadProfile } from '../run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF = JSON.parse(readFileSync(join(HERE, '..', 'briefs', 'storefront-hero.json'), 'utf8'));
const HAVE_BROWSER = resolvePlaywright() !== null;

const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), 'brw-'));
  return { runRoot: join(dir, 'runs'), ledgerPath: join(dir, 'ledger.jsonl'), dir };
};

const AWE_BRIEF = JSON.parse(readFileSync(join(HERE, '..', 'briefs', 'homepage-awe.json'), 'utf8'));
const VAULT = join(HERE, '..', 'vault', 'exemplars', 'swan');

/** A scratch vault seeded with the committed fixture exemplars. */
function scratchVault() {
  const root = join(mkdtempSync(join(tmpdir(), 'vx-')), 'swan');
  for (const v of ['win', 'fail', 'borderline']) mkdirSync(join(root, v), { recursive: true });
  for (const [v, stem] of [['win', 'fx-split-ledger-win'], ['win', 'fx-editorial-column-win'], ['fail', 'fx-card-sprawl-fail'], ['borderline', 'fx-kpi-strip-borderline']]) {
    copyFileSync(join(VAULT, v, `${stem}.png`), join(root, v, `${stem}.png`));
    copyFileSync(join(VAULT, v, `${stem}.json`), join(root, v, `${stem}.json`));
  }
  return root;
}

const fixture = (body) => {
  const p = join(mkdtempSync(join(tmpdir(), 'fix-')), 'page.html');
  writeFileSync(p, body);
  return p;
};

test('B1 full loop, browser lane ON: meters, screenshots, verify green', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const { runRoot, ledgerPath } = fresh();
  const { ctx } = await runLoop({ brief: BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), runRoot, ledgerPath });
  const meterNames = ctx.artifacts.inspect.meters.map((m) => m.meter);
  for (const expected of ['browser:overflow@375', 'browser:overflow@1440', 'browser:tap_targets@375', 'browser:cta_fold@375', 'browser:computed_contrast@375', 'browser:min_font@375']) {
    assert.ok(meterNames.includes(expected), `missing meter ${expected}`);
  }
  for (const shots of ctx.artifacts.inspect.screenshots) {
    assert.ok(existsSync(shots.fold) && existsSync(shots.full), 'screenshots must exist on disk');
  }
  assert.equal(ctx.artifacts.verify.all_meters_pass, true,
    `regressions: ${JSON.stringify(ctx.artifacts.verify.regressions)}`);
});

test('B2 seeded overflow is caught at 375 by real geometry', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const p = fixture('<main><div style="width:2000px;height:20px;background:#003080;"></div><a data-cta style="display:inline-block;min-width:44px;min-height:44px;color:#0A0A0F;background:#60C0F0;">Go</a></main>');
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  const at375 = cap.viewports.find((v) => v.viewport.width === 375);
  assert.equal(at375.overflow, true, 'a 2000px element must overflow a 375px viewport');
});

test('B3 seeded sub-44px tap target is caught', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const p = fixture('<main><button style="width:20px;height:20px;">x</button></main>');
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  const at375 = cap.viewports.find((v) => v.viewport.width === 375);
  assert.equal(at375.tapFails.length, 1);
  assert.equal(at375.tapFails[0].tag, 'button');
});

test('B4 low COMPUTED contrast via CSS var chain is caught by the browser', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const p = fixture('<main style="--dim:#3a3f45;background:#22262b;"><p style="color:var(--dim);">barely visible text</p></main>');
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  const at375 = cap.viewports.find((v) => v.viewport.width === 375);
  assert.ok(at375.contrastFails.length >= 1, 'the browser must resolve the var chain and fail the ratio');
  assert.ok(at375.contrastFails[0].ratio < 4.5);
});

test('B5 explicit config skip is a recorded meter, never silence', async () => {
  const { runRoot, ledgerPath } = fresh();
  const { ctx } = await runLoop({ brief: BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), browserInspect: false, runRoot, ledgerPath });
  const lane = ctx.artifacts.inspect.meters.find((m) => m.meter === 'browser_lane');
  assert.equal(lane.value, 'skipped:config');
  assert.equal(lane.pass, true);
});

test('B6 unavailable browser while required fails the lane meter (fail-closed)', async () => {
  const { runRoot, ledgerPath } = fresh();
  const stubCapture = async () => ({ available: false, reason: 'stubbed-out for test' });
  const { ctx } = await runLoop({
    brief: BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(),
    captureFn: stubCapture, runRoot, ledgerPath,
  }).catch((err) => ({ ctx: null, err }));
  // The lane meter fails -> critique fix_now (not whitelisted) -> verify red.
  if (ctx) {
    const lane = ctx.artifacts.inspect.meters.find((m) => m.meter === 'browser_lane');
    assert.equal(lane.pass, false);
    assert.equal(ctx.artifacts.verify.all_meters_pass, false, 'a degraded run may finish but must finish RED');
  }
});

// --- S5 plate lane (moved here so only one file launches a browser) --------

test('V16 a real browser marks a missing plate file as failed', { skip: !resolvePlaywright() && 'playwright unavailable' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'plate-'));
  const page = join(dir, 'page.html');
  writeFileSync(page, '<main><img src="./does-not-exist.png" alt="" data-plate style="width:100%"><a data-cta style="display:inline-block;min-width:44px;min-height:44px;color:#0A0A0F;background:#60C0F0;">Go</a></main>');
  const cap = await captureAndMeasure(page, join(dir, 'shots'));
  const at375 = cap.viewports.find((v) => v.viewport.width === 375);
  assert.equal(at375.plateCount, 1);
  assert.equal(at375.plateFails.length, 1, 'a 404 plate must be reported as an outcome failure');
  assert.match(at375.plateFails[0].src, /does-not-exist/);
});

test('V17 the real awe render decodes its plate in a real browser', { skip: !resolvePlaywright() && 'playwright unavailable' }, async () => {
  const { ctx } = await runLoop({
    brief: AWE_BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(),
    vaultRoot: scratchVault(), ...fresh(),
  });
  const names = ctx.artifacts.inspect.meters.map((m) => m.meter);
  assert.ok(names.includes('browser:plates_loaded@375'), 'the awe surface declares a plate, so the meter must be present');
  const m = ctx.artifacts.inspect.meters.find((x) => x.meter === 'browser:plates_loaded@1440');
  assert.equal(m.pass, true, `plate failed to decode: ${JSON.stringify(m.value)}`);
  assert.equal(ctx.artifacts.verify.all_meters_pass, true);
});

// --- S6 motion lane (deterministic, no LLM) ---------------------------------

const CTA = '<a data-cta style="display:inline-block;min-width:44px;min-height:44px;color:#0A0A0F;background:#60C0F0;">Go</a>';

test('M1 a seeded infinite above-fold loop is caught', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const p = fixture(`<style>@keyframes pulse{from{opacity:.4}to{opacity:1}}</style>
    <main><div data-zone="hero" style="animation:pulse 2s linear infinite;height:80px;background:#003080;"></div>${CTA}</main>`);
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  const at375 = cap.viewports.find((v) => v.viewport.width === 375);
  const infinite = at375.motionFindings.filter((f) => f.kind === 'infinite-above-fold');
  assert.equal(infinite.length, 1, `expected one infinite loop, got ${JSON.stringify(at375.motionFindings)}`);
  assert.match(infinite[0].detail, /pulse/);
});

test('M2 a seeded layout-property transition is caught', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const p = fixture(`<main><div data-zone="hero" style="transition:width 300ms ease;height:40px;background:#003080;"></div>
    <div data-zone="b" style="transition:all 250ms;height:40px;background:#003080;"></div>${CTA}</main>`);
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  const at375 = cap.viewports.find((v) => v.viewport.width === 375);
  assert.ok(at375.motionFindings.some((f) => f.kind === 'layout-transition' && /width/.test(f.detail)),
    `layout transition missed: ${JSON.stringify(at375.motionFindings)}`);
  assert.ok(at375.motionFindings.some((f) => f.kind === 'transition-all'),
    'transition:all with a real duration must be flagged');
});

test('M3 REGRESSION: a page with no animation produces ZERO motion findings', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  // The first cut of this meter read `transitionProperty` alone, which computes
  // to its INITIAL value "all" on every element — it flagged all 26 elements of
  // a page with zero animation, including <head> and <style>. A meter that
  // always fails is a meter people switch off.
  const p = fixture(`<main><section data-zone="hero"><h1 style="color:#E0ECF4">Static</h1>${CTA}</section></main>`);
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  for (const v of cap.viewports) {
    assert.deepEqual(v.motionFindings, [], `false positives at ${v.viewport.width}: ${JSON.stringify(v.motionFindings)}`);
    assert.equal(v.animatedCount, 0);
  }
});

test('M4 the scroll strip produces six stills per viewport, on disk', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const p = fixture(`<main><div style="height:3000px;background:#0A0A0F;"></div>${CTA}</main>`);
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  for (const v of cap.viewports) {
    assert.equal(v.strip.length, SCROLL_STOPS.length, `expected ${SCROLL_STOPS.length} stills at ${v.viewport.width}`);
    assert.deepEqual(v.strip.map((s) => s.pct), [...SCROLL_STOPS]);
    for (const s of v.strip) assert.ok(existsSync(s.path), `missing still ${s.path}`);
    // and the stills are COMPOSITED into one openable artifact (blueprint §S6)
    assert.ok(existsSync(v.stripPath), `missing composited strip ${v.stripPath}`);
    const html = readFileSync(v.stripPath, 'utf8');
    for (const s of v.strip) assert.match(html, new RegExp(`scroll ${s.pct}%`), `strip omits the ${s.pct}% still`);
  }
});

test('M5 the reduced-motion run is recorded, never silently skipped', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const p = fixture(`<style>@keyframes pulse{from{opacity:.4}to{opacity:1}}
    @media (prefers-reduced-motion: reduce){.amb{animation:none!important}}</style>
    <main><div class="amb" data-zone="hero" style="animation:pulse 2s linear infinite;height:80px;background:#003080;"></div>${CTA}</main>`);
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  assert.ok(cap.reducedMotion, 'the reduced-motion lane must always report');
  assert.ok(!cap.reducedMotion.unavailable, `reduced-motion run failed: ${cap.reducedMotion.unavailable}`);
  assert.equal(cap.reducedMotion.animatedCount, 0, 'the page honours reduce: nothing still animating');
  // and the same page WITHOUT the media query keeps looping under reduce
  const p2 = fixture(`<style>@keyframes pulse{from{opacity:.4}to{opacity:1}}</style>
    <main><div data-zone="hero" style="animation:pulse 2s linear infinite;height:80px;background:#003080;"></div>${CTA}</main>`);
  const cap2 = await captureAndMeasure(p2, join(dirname(p2), 'shots'));
  assert.ok(cap2.reducedMotion.animatedCount > 0, 'a page ignoring the preference must be distinguishable');
});

test('M6 motion meters ride INSPECT and fire on a seeded defect', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  const { browserMeters } = await import('../stages/inspect.mjs');
  const p = fixture(`<style>@keyframes pulse{from{opacity:.4}to{opacity:1}}</style>
    <main><div data-zone="hero" style="animation:pulse 2s linear infinite;height:80px;background:#003080;"></div>${CTA}</main>`);
  const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
  const meters = browserMeters(cap);
  const inf = meters.find((m) => m.meter === 'motion:infinite_above_fold@375');
  assert.ok(inf, 'the meter must be emitted');
  assert.equal(inf.pass, false, 'a seeded infinite above-fold loop must FAIL the run');
  assert.equal(meters.find((m) => m.meter === 'motion:scroll_strip@375').pass, true);
  assert.ok(meters.find((m) => m.meter === 'motion:reduced_motion'), 'reduced-motion meter present');
});

test('M7 the calibration SET is honest: every planted defect really fails its named meter', { skip: !HAVE_BROWSER && 'playwright unavailable' }, async () => {
  // Validate the instrument before trusting any result it produces. A planted
  // "defect" that does not actually register would hand a free pass to a seat
  // that cannot see anything — calibration would certify a blind critic.
  const { plantedDefectPairs } = await import('../critic-fixtures.mjs');
  const { inspectHtml, browserMeters } = await import('../stages/inspect.mjs');
  const IR = { skeleton_id: 'CAL', zones: [{ zone: 'hero', section_type: 'hero' }], card_budget: 0, anti_specs: [] };

  for (const pair of plantedDefectPairs()) {
    const metersFor = async (art) => {
      const p = fixture(art.html);
      const cap = await captureAndMeasure(p, join(dirname(p), 'shots'));
      return [...inspectHtml(art.html, IR), ...browserMeters(cap)];
    };
    const bad = await metersFor(pair.defective);
    const good = await metersFor(pair.clean);
    const badMeter = bad.find((m) => m.meter === pair.expect_meter);
    const goodMeter = good.find((m) => m.meter === pair.expect_meter);
    assert.ok(badMeter, `${pair.id}: meter ${pair.expect_meter} was never emitted`);
    assert.equal(badMeter.pass, false, `${pair.id}: the planted defect did NOT fail ${pair.expect_meter} — the calibration set is lying`);
    assert.ok(goodMeter, `${pair.id}: meter missing on the clean side`);
    assert.equal(goodMeter.pass, true, `${pair.id}: the CLEAN page fails ${pair.expect_meter} — the pair is not a valid contrast`);
  }
});
