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
 *
 * If Playwright cannot be resolved, tests B1–B4 SKIP VISIBLY — a skip is a
 * statement, silence is a lie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePlaywright, captureAndMeasure } from '../capture.mjs';
import { runLoop } from '../state-machine.mjs';
import { DEFAULT_STAGES, loadProfile } from '../run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF = JSON.parse(readFileSync(join(HERE, '..', 'briefs', 'storefront-hero.json'), 'utf8'));
const HAVE_BROWSER = resolvePlaywright() !== null;

const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), 'brw-'));
  return { runRoot: join(dir, 'runs'), ledgerPath: join(dir, 'ledger.jsonl'), dir };
};

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
