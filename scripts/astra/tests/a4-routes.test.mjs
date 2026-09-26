/**
 * a4-routes.test.mjs — slice A4's API routes for the Tune pane.
 *
 * T-I-03  `GET /api/tuning` describes the config AND the session's stage
 * T-I-04  staging produces a preview and WRITES NOTHING
 * T-I-05  the blast radius is reported before anything is written
 * T-I-10  every tuning mutation is behind the token gate
 * plus the error classifier, which is what stopped a bug wearing a domain refusal.
 *
 * SPLIT FROM `a4-surface.test.mjs`, which reached 350 of Rule 4's 300 lines. The seam is
 * PANE versus ROUTES: that file proves the markup and the registry agree and that every
 * control is wired; this one proves what the endpoints answer. Test files are held to the
 * same cap as source files, and a test file nobody can read is a test file nobody checks.
 *
 * EVERY CHECK HERE IS SIDE-EFFECT-FREE. `commitStaged` and `revertLast` accept injectable
 * `path`/`priorPath`, so the round-trip against the real config is captured ONCE as A4's
 * named evidence (before/after hashes) rather than performed on every test run. A suite
 * that rewrites a tracked config file is a suite that will eventually fail on a dirty tree
 * and leave the repository changed.
 *
 * TWO DEFECTS FOUND BY WRITING THIS FILE, both now guarded:
 *
 *   D27  `tuning-stage` validated only through `previewStaged`, which IGNORES an unknown
 *        key — so the typo was accepted and the refusal surfaced at COMMIT, after the
 *        operator had written a note. The stage path now runs `applyPatch`, the same pure
 *        validator the commit path uses, so the two cannot disagree.
 *
 *   D28  `GET /api/tuning` returned `tuningView()`, which hard-codes `staged: {}`. After a
 *        real stage the pane said `STAGED (1)` and the API said `staged: {}, changedKeys:
 *        []` — a false all-clear on the API surface. Same defect family as A3's `T-M-03`.
 *
 *   D29  `TUNING_PATH` was used in `api.mjs` without being imported, and every catch was
 *        `e.code ?? 'E_SOMETHING'` — so the resulting `ReferenceError` was reported as a
 *        400 DOMAIN REFUSAL under a real code. A perfect impression of the gate working.
 *        The classifier below is the fix, and the last test proves it can fail.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

import { startServer } from '../surface/server.mjs';
import { handleApi } from '../surface/api.mjs';
import { TUNING_PATH } from '../core/paths.mjs';
import { PRIOR_PATH } from '../core/tuningStage.mjs';

const TOKEN = 'a4-test-token';
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const diskHash = () => sha(readFileSync(TUNING_PATH, 'utf8'));

async function withServer(fn) {
  const s = await startServer({ port: 0, token: TOKEN });
  const base = s.url.replace(/\/$/, '');
  const req = async (path, opts = {}) => {
    const r = await fetch(base + path, opts);
    return { status: r.status, text: await r.text(), headers: r.headers };
  };
  const get = (path) => req(path);
  const post = (route, body, token) => req(`/api/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-astra-token': token } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  const json = async (route, body, token) => {
    const r = await post(route, body, token);
    return { ...JSON.parse(r.text), status: r.status, text: r.text };
  };
  try {
    return await fn({ base, req, get, post, json });
  } finally {
    await s.close();
  }
}


test('T-I-03 GET /api/tuning reports the live knobs', async () => {
  await withServer(async ({ get }) => {
    const r = await get('/api/tuning');
    assert.equal(r.status, 200);
    const { view } = JSON.parse(r.text);
    assert.equal(view.state, 'live');
    assert.equal(typeof view.current['auto.S'], 'number', 'auto.S must read as a number, not a string');
    assert.deepEqual(view.staged, {});
    assert.deepEqual(view.changedKeys, []);
  });
});

test('T-I-03 D28 the view carries the SESSION stage — an API must not report a false all-clear', async () => {
  await withServer(async ({ get, json }) => {
    const staged = await json('tuning-stage', { staged: { 'mergeBand.low': 0.4 } }, TOKEN);
    assert.equal(staged.status, 200);

    const r = await get('/api/tuning');
    const { view } = JSON.parse(r.text);
    assert.deepEqual(view.staged, { 'mergeBand.low': 0.4 },
      'the session holds a staged value; the view must not report an empty stage');
    assert.deepEqual(view.changedKeys, ['mergeBand.low']);
    assert.equal(view.state, 'staged', 'a view with a stage must not call itself live');
    assert.ok(view.blastRadius.length > 0, 'a staged gate key must report its blast radius');
    assert.equal(view.blastRadius[0].family, 'mergeBand.');
  });
});

// ---------------------------------------------------------------------------
// T-I-04 / T-M-07 — staging previews, and writes nothing
// ---------------------------------------------------------------------------

test('T-I-04 staging returns a preview and leaves the config byte-identical', async () => {
  const before = diskHash();
  const priorExisted = existsSync(PRIOR_PATH);
  await withServer(async ({ json }) => {
    const r = await json('tuning-stage', { staged: { 'mergeBand.low': 0.4 } }, TOKEN);
    assert.equal(r.status, 200);
    assert.equal(r.preview.wrote, false, 'a preview that wrote is not a preview');
    assert.ok(r.preview.moves.length > 0, 'the preview must name the pairs it moved');
    assert.equal(r.preview.current.bands['merge-band'], 3);
    assert.equal(r.preview.staged.bands['merge-band'], 7,
      'lowering the merge floor must move pairs INTO the merge band');
    assert.equal(r.preview.ms < 2000, true, `preview took ${r.preview.ms}ms, over the 2s budget`);
  });
  assert.equal(diskHash(), before, 'T-M-07: staging moved bytes in the live config');
  assert.equal(existsSync(PRIOR_PATH), priorExisted,
    'staging created a prior-value record — only a COMMIT may do that');
});

test('T-I-04 staging an empty patch clears the stage rather than erroring', async () => {
  await withServer(async ({ json }) => {
    await json('tuning-stage', { staged: { 'mergeBand.low': 0.4 } }, TOKEN);
    const cleared = await json('tuning-stage', { staged: {} }, TOKEN);
    assert.equal(cleared.status, 200);
    assert.equal(cleared.cleared, true);
    assert.deepEqual(cleared.staged, {});
  });
});

test('T-I-04 D27 an unknown key is refused AT STAGE TIME, not at commit', async () => {
  await withServer(async ({ json }) => {
    const r = await json('tuning-stage', { staged: { 'nope.missing': 1 } }, TOKEN);
    assert.equal(r.status, 400, 'the typo must be refused when it is made');
    assert.equal(r.error.code, 'E_TUNING_KEY_UNKNOWN');
    // ...and the refusal must not have half-accepted the patch. A refused stage that
    // still left a value staged would be worse than accepting the typo: the operator
    // sees an error AND has a live staged change they did not intend.
    const view = await json('tuning', {}, TOKEN);
    assert.deepEqual(view.view.staged, {}, 'a refused stage left a value staged');
    assert.deepEqual(view.view.changedKeys, []);
    assert.equal(view.view.state, 'live');
  });
});

test('T-I-04 a patch that changes nothing is refused, not silently accepted', async () => {
  await withServer(async ({ json }) => {
    const live = await json('tuning', {}, TOKEN);
    const r = await json('tuning-stage', { staged: { 'mergeBand.low': live.view.current['mergeBand.low'] } }, TOKEN);
    assert.equal(r.status, 400);
    assert.equal(r.error.code, 'E_TUNING_NO_CHANGES',
      'a no-op patch is a change the operator believes they made and did not');
  });
});

// ---------------------------------------------------------------------------
// T-I-05 — the blast radius, before anything is written
// ---------------------------------------------------------------------------

test('T-I-05 staging a gate key reports its blast radius, and the pane warns', async () => {
  await withServer(async ({ get, json }) => {
    await json('tuning-stage', { staged: { 'auto.S': 0.9 } }, TOKEN);
    const view = JSON.parse((await get('/api/tuning')).text).view;
    assert.ok(view.blastRadius.some((b) => b.gate),
      'auto.S feeds the auto-corroboration gate; the blast radius must say so');
    const pane = await get('/tune');
    assert.match(pane.text, /BLAST RADIUS/);
    assert.match(pane.text, /blast--gate/, 'a gate change must be styled as a warning, not a column');
    assert.match(pane.text, /state-staged">STAGED \(1\)</);
  });
});

test('T-I-05 committing with nothing staged is refused before any write', async () => {
  const before = diskHash();
  await withServer(async ({ json }) => {
    const r = await json('tuning-commit', { note: 'a note long enough to pass' }, TOKEN);
    assert.equal(r.status, 400);
    assert.equal(r.error.code, 'E_TUNING_NO_CHANGES');
  });
  assert.equal(diskHash(), before, 'a refused commit must not touch the config');
});

// ---------------------------------------------------------------------------
// The token gate, and the error classifier
// ---------------------------------------------------------------------------

test('T-I-10 every tuning mutation is behind the token gate', async () => {
  await withServer(async ({ post }) => {
    for (const route of ['tuning-stage', 'tuning-commit', 'tuning-revert']) {
      const r = await post(route, { staged: { 'mergeBand.low': 0.4 } });
      assert.equal(r.status, 401, `${route} without a token must be 401`);
      assert.equal(JSON.parse(r.text).error.code, 'E_TOKEN_REQUIRED');
    }
    // A read stays free — otherwise the 401 above proves nothing about writes.
    assert.equal((await post('directions', { text: 'x' })).status, 200);
  });
});

test('a bug can never wear a domain refusal — an unclassified throw is a 500 E_ASTRA_INTERNAL', () => {
  // A `ReferenceError` from a typo used to be reported as a 400 under the route's own
  // code, because every catch was `e.code ?? 'E_SOMETHING'` and a `ReferenceError` has
  // no `.code`. That is a perfect impression of a working gate: the status is plausible,
  // the code is a real one, and the console is actually broken. A4 shipped exactly that
  // bug (D29 — `TUNING_PATH` used without an import).
  //
  // `state: undefined` is not a state a caller would pass; it forces the same shape of
  // failure on purpose. What is asserted is the CLASSIFICATION, not the crash.
  const r = handleApi('directions', { method: 'POST', body: { text: 'a brief' }, state: undefined });
  assert.equal(r.status, 500, 'a programming error is not a 400');
  assert.equal(r.body.error.code, 'E_ASTRA_INTERNAL');
  assert.match(r.body.error.message, /TypeError|ReferenceError/,
    'the message must name the error class so a reader can tell it is a bug');
  // The counter-case, in the same test: a real domain refusal keeps its own code.
  const domain = handleApi('reject', { method: 'POST', body: { compileId: 'no-such' }, state: {} });
  assert.equal(domain.status, 404);
  assert.equal(domain.body.error.code, 'E_COMPILE_UNKNOWN');
});
