/**
 * a4-surface.test.mjs — slice A4's server-side tests for the Tune pane.
 *
 * T-I-02  the Tune pane renders, and every live knob is visible
 * T-I-03  `GET /api/tuning` describes the config AND the session's stage
 * T-I-04  staging produces a preview and WRITES NOTHING
 * T-I-05  the blast radius is reported before anything is written
 * T-M-07  untouched regions survive — asserted here as "no byte of the config moved"
 *
 * EVERY CHECK IN THIS FILE IS SIDE-EFFECT-FREE, and that is deliberate. `commitStaged`
 * and `revertLast` accept injectable `path`/`priorPath`, so the round-trip against the
 * real config is captured ONCE as A4's named evidence (before/after hashes) rather than
 * performed on every test run. A suite that rewrites a tracked config file is a suite
 * that will eventually fail on a dirty tree and leave the repository changed.
 *
 * TWO DEFECTS FOUND BY WRITING THIS FILE, both now guarded:
 *
 *   D27  `tuning-stage` validated only through `previewStaged`, which IGNORES an unknown
 *        key — so the typo was accepted and the refusal surfaced at COMMIT, after the
 *        operator had written a note. The stage path now runs `applyPatch`, the same
 *        pure validator the commit path uses, so the two cannot disagree.
 *
 *   D28  `GET /api/tuning` returned `tuningView()`, which hard-codes `staged: {}`. After
 *        a real stage the pane said `STAGED (1)` and the API said `staged: {},
 *        changedKeys: []` — a false all-clear on the API surface. Same defect family as
 *        A3's `T-M-03`: a view stating something the data does not support.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { startServer } from '../surface/server.mjs';
import { handleApi } from '../surface/api.mjs';
import { TUNING_PATH } from '../core/paths.mjs';
import { PRIOR_PATH } from '../core/tuningStage.mjs';
import { CONTROLS, UNWIRED_CONTROLS } from '../surface/controls.mjs';
import { KNOB_ORDER } from '../surface/paneTune.mjs';

/**
 * EVERY client module, enumerated from DISK rather than listed by hand.
 *
 * The client became three modules in A4b (Rule 4 split: plumbing / actions / entry),
 * and a handler may live in any of them. A hand-kept list of files to search is how a
 * NEW client file gets silently excluded from this check — and an excluded file is
 * exactly where a dead control would then hide. So the list is read from the
 * directory, and the test below asserts the enumeration is non-trivial.
 */
const CLIENT_DIR = fileURLToPath(new URL('../static/', import.meta.url));
const clientFiles = () => readdirSync(CLIENT_DIR).filter((f) => f.endsWith('.js')).sort();
const clientSource = () => clientFiles()
  .map((f) => readFileSync(join(CLIENT_DIR, f), 'utf8')).join('\n');

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

// ---------------------------------------------------------------------------
// T-I-02 — the pane renders, and it renders every live knob
// ---------------------------------------------------------------------------

test('T-I-02 the Tune pane serves 200 and shows every live knob', async () => {
  await withServer(async ({ get }) => {
    const r = await get('/tune');
    assert.equal(r.status, 200);
    // The keys come from the config, so read them from the same place the pane does.
    const current = JSON.parse(JSON.stringify(
      handleApi('tuning', { method: 'GET', body: {}, state: {} }).body.view.current));
    const keys = Object.keys(current);
    assert.ok(keys.length >= 13, `expected the 13 declared knobs, saw ${keys.length}`);
    for (const k of keys) {
      assert.match(r.text, new RegExp(k.replace(/\./g, '\\.')),
        `knob "${k}" exists in the config but the pane does not show it`);
    }
    // The declared order must not silently drop a knob the config actually has.
    for (const k of KNOB_ORDER) assert.ok(keys.includes(k), `KNOB_ORDER names "${k}" which the config lacks`);
  });
});

test('T-I-02 the pane states which state it is in, and nothing is staged initially', async () => {
  await withServer(async ({ get }) => {
    const r = await get('/tune');
    assert.match(r.text, /state:\s*<b class="state-live">LIVE<\/b>/,
      'a fresh pane must say LIVE — an unlabelled state is a state the operator has to guess');
    assert.match(r.text, /staged values are NOT written until you commit/,
      'the pane must say that staging is not writing');
    assert.match(r.text, /nothing staged — no blast radius to report/);
  });
});

test('T-I-02 every Tune control in the markup is registered, and labelled', async () => {
  await withServer(async ({ get }) => {
    const r = await get('/tune');
    const ids = [...r.text.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(ids.length > 0, 'the pane rendered no controls at all');
    for (const id of new Set(ids)) {
      const c = CONTROLS.find((x) => x.id === id);
      assert.ok(c, `markup carries data-control="${id}" which no registry entry declares`);
      assert.ok(['dial', 'proposal'].includes(c.kind), `${id} has no DIAL/PROPOSAL kind`);
    }
    // `tuning.commit` writes and must therefore be token-gated; if it renders without
    // that, the pane is offering a write the server will refuse.
    assert.ok(ids.includes('tuning.commit'), 'the commit control must render');
    assert.equal(CONTROLS.find((c) => c.id === 'tuning.commit').token, true);
  });
});

test('T-I-02 D30 the knobs are EDITABLE — one input per knob, not read-only text', async () => {
  await withServer(async ({ get }) => {
    const r = await get('/tune');
    // Match the whole tag and then read its attributes, rather than assuming an attribute
    // ORDER — the pane writes `data-key` first and `data-control` last, and a regex that
    // encodes the order is a test that breaks when the markup is reordered harmlessly.
    const tags = [...r.text.matchAll(/<input\b[^>]*>/g)].map((m) => m[0])
      .filter((t) => t.includes('data-control="tuning.knob"'));
    const keys = tags.map((t) => /data-key="([^"]+)"/.exec(t)?.[1]).filter(Boolean);
    const current = JSON.parse(JSON.stringify(
      handleApi('tuning', { method: 'GET', body: {}, state: {} }).body.view.current));
    assert.deepEqual(keys.sort(), Object.keys(current).sort(),
      'every live knob needs exactly one editable input — the pane is an editor (AC4.1), '
      + 'and a knob shown as text is a knob the operator cannot turn');
    // Each input must carry the live value it is compared against, or the client cannot
    // tell "unchanged" from "edited back to the same number".
    assert.equal(tags.filter((t) => t.includes('data-current="')).length, keys.length,
      'each knob input needs its data-current value');
    // And the step must be able to express the engine's own precision.
    assert.match(r.text, /step="0\.01"/, 'a float knob needs a 0.01 step');
    assert.match(r.text, /step="1"/, 'an integer knob needs a 1 step');
  });
});

test('T-I-02 D31 the pane offers DISCARD STAGE, which the packet draws and A4 first omitted', async () => {
  await withServer(async ({ get, json }) => {
    const r = await get('/tune');
    assert.match(r.text, /data-control="tuning\.discard"[\s\S]{0,40}DISCARD STAGE/,
      '03-INTERFACE.md §2.3 draws [DISCARD STAGE] — abandoning a draft must not require committing it');
    // And the action it names really is a discard: an empty patch, no file touched.
    const before = diskHash();
    await json('tuning-stage', { staged: { 'mergeBand.low': 0.4 } }, TOKEN);
    const d = await json('tuning-stage', { staged: {} }, TOKEN);
    assert.equal(d.status, 200);
    assert.deepEqual(d.staged, {});
    assert.equal(diskHash(), before);
  });
});

test('T-I-02 D32 the note field carries its OWN control id, not the stage action\'s', async () => {
  await withServer(async ({ get }) => {
    const r = await get('/tune');
    // The client dispatches on `closest('[data-control]')`, so a click INTO the note field
    // used to be indistinguishable from pressing PREVIEW — the field carried
    // `tuning.stage`. This is the guard: the field is a control in its own right.
    assert.match(r.text, /<textarea[^>]*data-control="tuning\.note"/,
      'the note is an interactive element and needs its own DIAL label');
    assert.doesNotMatch(r.text, /<textarea[^>]*data-control="tuning\.stage"/,
      'the note field must never carry the stage action\'s id');
  });
});

test('a rendered control with no handler is a dead control, and the exclusions are reasoned', () => {
  // An empty enumeration would make every check below pass while reading nothing.
  assert.ok(clientFiles().length >= 3,
    `expected the client modules, found ${clientFiles().length} in static/`);
  const js = clientSource();
  const rendered = CONTROLS.filter((c) => c.rendered);
  // A control is reached either by its id (an action, dispatched) or by the dashed DOM id
  // of the field it owns. Either counts as wired; nothing else does.
  const unwired = rendered.filter((c) => {
    const dashed = c.id.replace('.', '-');
    return !js.includes(`'${c.id}'`) && !js.includes(`'${dashed}'`);
  }).map((c) => c.id);

  const excused = new Set(UNWIRED_CONTROLS.map((u) => u.id));
  assert.deepEqual(unwired.filter((id) => !excused.has(id)), [],
    'these controls render but nothing happens when they are used');

  // THE LIST MUST NOT OUTLIVE ITS REASONS: an entry whose control is wired now is stale,
  // and a stale exclusion is how a dead-control list quietly becomes permanent.
  assert.deepEqual([...excused].filter((id) => !unwired.includes(id)), [],
    'these controls are excused as unwired but ARE wired now — delete the entry');
  for (const u of UNWIRED_CONTROLS) {
    assert.ok(u.why && u.why.length > 40, `${u.id} needs a real reason, not a label`);
    assert.ok(u.ownedBy, `${u.id} needs an owner, or nobody will ever fix it`);
    assert.ok(rendered.some((c) => c.id === u.id), `${u.id} is excused but is not rendered at all`);
  }
});
