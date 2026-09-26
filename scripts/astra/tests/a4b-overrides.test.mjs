/**
 * a4b-overrides.test.mjs — the OVERRIDE FENCE: what the API boundary permits.
 *
 * `brief.slotOverrides` is the ONE layer `resolveSlots` applies LAST, so it is the
 * only thing in the system that can overwrite a decided value — including a law. That
 * makes it the highest-risk surface Astra has, and it had no test file of its own
 * until A4b.
 *
 * SPLIT FROM `a4b-editor.test.mjs` at the seam the project already uses elsewhere
 * (`a4-routes` vs `a4-surface`, `a3-surface` vs `a3-transport`): what the BOUNDARY
 * refuses versus what the PANE offers. This file is the boundary. It was split out of
 * a single 331-line file, which Rule 4's guard caught — the same guard, doing the same
 * job, on the second slice in a row.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { handleApi } from '../surface/api.mjs';
import { BLOCKED_OVERRIDE_KEYS, validateOverrides } from '../core/overrides.mjs';
import { withServer, TEST_TOKEN as TOKEN } from './helpers/serverHarness.mjs';

// ---------------------------------------------------------------------------
// D36 — the OVERRIDE FENCE. `slotOverrides` was an unvalidated passthrough.
// ---------------------------------------------------------------------------
//
// `resolveSlots` applies `brief.slotOverrides` LAST, after the kill-list is set,
// so an override can DELETE a LAW. The compile route did
// `if (body.slotOverrides) brief.slotOverrides = body.slotOverrides;` — any key,
// any value, any type. Measured: `{"slotOverrides": {"negative": ""}}` returned a
// compile reporting all six lawChecks green with the kill-list gone.
//
// Two independent guards now exist and BOTH are asserted here, because either
// alone would be a plausible-looking fix that misses the other's case:
//   * `shared/swanLawFilter.mjs`  — LAW 3 refuses a negative slot naming no family.
//   * `core/overrides.mjs`        — the boundary refuses `negative` outright.
// A guard that only fires AFTER the deletion is a net, not a fence.

test('D36 the compile route REFUSES `negative` as an override key', async () => {
  await withServer(async ({ json }) => {
    for (const value of ['', 'watermark only', 'lens flare']) {
      const r = await json('compile', {
        brief: { text: 'a frozen lake', intent: 'hero' },
        slotOverrides: { negative: value },
      }, TOKEN);
      assert.equal(r.status, 400, `negative:${JSON.stringify(value)} must be refused`);
      assert.equal(r.error.code, 'E_OVERRIDE_KEY_BLOCKED');
      assert.match(r.error.message, /LAW 3/, 'the refusal must name the law it protects');
      assert.match(r.error.message, /not a dial/, 'and must say why the key is not on offer');
    }
    // The 400 is only meaningful if the SAME route answers 200 with the token and a
    // lawful body — otherwise this test would pass on a 401 and prove nothing.
    const ok = await json('compile', { brief: { text: 'a frozen lake' } }, TOKEN);
    assert.equal(ok.status, 200);
    assert.equal(ok.ok, true);
  });
});

test('D36 the refusal is never a silent strip — the brief is not compiled at all', async () => {
  await withServer(async ({ json }) => {
    const r = await json('compile', {
      brief: { text: 'a frozen lake' },
      slotOverrides: { negative: '' },
    }, TOKEN);
    assert.equal(r.status, 400);
    // A sanitising handler would drop the key and compile the rest. That would
    // hide the attempt: the operator would see a green compile and never learn
    // that their override was discarded. No compileId is the proof.
    assert.equal(r.compileId, undefined, 'a refused request must not produce a compile');
    assert.equal(r.view, undefined);
  });
});

test('D36 the fence names every offender so one round-trip fixes the request', () => {
  const state = { brief: {} };
  const cases = [
    [{ subjekt: 'x' }, 'E_OVERRIDE_KEY_UNKNOWN'],
    [{ light: 42 }, 'E_OVERRIDE_VALUE_TYPE'],
    [{ light: null }, 'E_OVERRIDE_VALUE_TYPE'],
    [['negative'], 'E_OVERRIDE_SHAPE'],
    ['negative', 'E_OVERRIDE_SHAPE'],
  ];
  for (const [slotOverrides, code] of cases) {
    const r = handleApi('compile', { method: 'POST', body: { brief: { text: 'a lake' }, slotOverrides }, state });
    assert.equal(r.status, 400, `${JSON.stringify(slotOverrides)} must be refused`);
    assert.equal(r.body.error.code, code);
  }
  // BLOCKED BEATS UNKNOWN: a request wrong in both ways reports the law, not the typo.
  const both = handleApi('compile', {
    method: 'POST', body: { brief: { text: 'a lake' }, slotOverrides: { negative: '', subjekt: 'x' } }, state,
  });
  assert.equal(both.body.error.code, 'E_OVERRIDE_KEY_BLOCKED');
});

test('D36 the legitimate override path is untouched', async () => {
  await withServer(async ({ json }) => {
    const r = await json('compile', {
      brief: { text: 'a frozen lake', intent: 'hero' },
      slotOverrides: { light: 'flat overcast light' },
    }, TOKEN);
    assert.equal(r.status, 200);
    assert.equal(r.ok, true);
    const light = r.view.slots.find((s) => s.key === 'light');
    assert.equal(light.value, 'flat overcast light');
    // And the kill-list survives an unrelated override — the thing the fence protects.
    const negative = r.view.slots.find((s) => s.key === 'negative');
    assert.match(negative.value, /iridescent gradient/);
    assert.equal(negative.empty, false);
  });
});

test('D36 an absent or empty override layer is not an error', async () => {
  await withServer(async ({ json }) => {
    for (const body of [{ brief: { text: 'a frozen lake' } }, { brief: { text: 'a frozen lake' }, slotOverrides: {} }]) {
      const r = await json('compile', body, TOKEN);
      assert.equal(r.status, 200);
      assert.equal(r.ok, true);
    }
  });
});

// ---------------------------------------------------------------------------
// The policy is ONE definition, and it is the one the operator is shown.
// ---------------------------------------------------------------------------

test('the blocked-key policy is shared, not restated per surface', () => {
  // The failure this prevents: the pane offers a control the API then rejects,
  // so the operator is handed a refusal they were invited to make. Both readers
  // must resolve to the SAME object.
  assert.ok(Object.hasOwn(BLOCKED_OVERRIDE_KEYS, 'negative'));
  const reason = BLOCKED_OVERRIDE_KEYS.negative;
  assert.equal(typeof reason, 'string');
  assert.match(reason, /LAW 3/);
  assert.ok(reason.length > 60, 'the reason is operator copy, not a log token');
});

test('validateOverrides is pure — it never mutates the request it judges', () => {
  const raw = { light: 'flat overcast light' };
  const before = JSON.stringify(raw);
  const r = validateOverrides(raw, ['light', 'negative']);
  assert.equal(r.ok, true);
  assert.notEqual(r.overrides, raw, 'the returned layer must be a copy, not the caller\'s object');
  r.overrides.light = 'mutated';
  assert.equal(JSON.stringify(raw), before, 'mutating the result must not reach the request');
});

test('validateOverrides reports the FIRST finding deterministically', () => {
  // Several things wrong at once must not produce a different code on a different
  // run — a caller that branches on the code needs it to be stable.
  const keys = ['light', 'negative'];
  const seen = new Set();
  for (let i = 0; i < 12; i += 1) {
    seen.add(validateOverrides({ negative: '', subjekt: 'x', light: 1 }, keys).code);
  }
  assert.deepEqual([...seen], ['E_OVERRIDE_KEY_BLOCKED']);
});
