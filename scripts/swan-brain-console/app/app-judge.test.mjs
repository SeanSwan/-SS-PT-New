/**
 * app-judge-wiring-contract — the layer between Judge Mode's decisions and its pixels.
 * @module scripts/swan-brain-console/app/app-judge.test
 *
 * WHY THIS SUITE EXISTS (round 11)
 * `app-judge.js` is the WIRING: it acquires storage, loads the stylesheet, attaches the key
 * handler and boots the panel. It had no suite of its own, and both of this round's Judge Mode
 * DOM findings landed here rather than in the renderer:
 *
 *   F10 — `globalThis.localStorage` was evaluated as an ARGUMENT at the call site, outside the
 *         try blocks that `loadStoredState` and `saveState` each carry. `localStorage` is a
 *         getter and is documented to THROW rather than return null in a partitioned or
 *         cookie-blocked context, so a restricted browser lost Judge Mode — and Gate Health
 *         with it, since `initGates` boots later in the same outer try — under a banner that
 *         blamed the snapshot read, which had not failed.
 *
 *   F11 — the wiring half of the same defect. `wireJudgeKeys` resolves its target from the event
 *         target's nearest `[data-pair-index]` ancestor, so whatever holds focus IS the cursor;
 *         the index therefore has to travel with the state into the redraw.
 *
 * Run: node --test scripts/swan-brain-console/app/app-judge.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const judge = await import(pathToFileURL(join(HERE, 'app-judge.js')).href);
const mod = await import(pathToFileURL(join(HERE, 'judge-export.mjs')).href);

/** Twenty rows shaped like the fleet rows the console renders. */
const ROWS = Array.from({ length: 20 }, (_, i) => ({ id: `v${String(i + 1).padStart(2, '0')}` }));
const { pairs } = mod.pairsFrom(ROWS);

/** A container that records its keydown handler so a test can drive it. */
function fakeContainer() {
  const handlers = {};
  return {
    el: { addEventListener: (type, fn) => { handlers[type] = fn; } },
    fire: (event) => handlers.keydown(event),
  };
}

/** A keydown whose target sits inside the pair carrying `index`. */
function keyOn(index, key) {
  return {
    key,
    target: { closest: () => ({ getAttribute: () => String(index) }) },
    preventDefault() {},
  };
}

/* ── F10 — acquiring storage is part of the boundary ──────────────────────── */

describe('F10 — a browser that refuses to hand over storage must not take the panel down', () => {
  test('RED — a throwing storage getter yields null instead of raising', () => {
    const scope = {};
    Object.defineProperty(scope, 'localStorage', {
      get() { throw new Error('storage SecurityError'); },
      configurable: true,
    });
    assert.equal(judge.acquireStorage(scope), null);
  });

  test('an absent storage property is null, not undefined', () => {
    // `undefined` would flow through `saveState`'s optional chaining harmlessly, but it would
    // make "the browser has no storage" indistinguishable from "nobody asked" — and this
    // subsystem spends its whole budget removing exactly that kind of ambiguity.
    assert.equal(judge.acquireStorage({}), null);
  });

  test('a working storage object is returned as-is, so the happy path is unchanged', () => {
    const storage = { getItem: () => null, setItem: () => {} };
    assert.equal(judge.acquireStorage({ localStorage: storage }), storage);
  });

  test('a null storage is a supported value for both helpers, not a crash', () => {
    // The degraded mode the boundary buys: an unavailable store means "this session will not be
    // remembered", never "this console is broken".
    assert.equal(mod.loadStoredState(null, pairs), null);
    /*
     * ROUND 12 (2026-09-21) — THIS ASSERTION USED TO BE `true`, AND THAT WAS THE BUG.
     * Astra (G13) found that `saveState` returned a success receipt for a store that does not
     * exist, and this test had encoded that as the contract — so the correct fix would have
     * read as a regression here. A regression test that asserts the defect is worse than no
     * test. `null` storage means "nowhere to persist", which is exactly what `saveState`
     * exists to report.
     */
    assert.equal(mod.saveState(null, mod.emptyState(pairs)), false,
      'a save that could not happen must not report success');
  });
});

/* ── F11 — the index travels with the state ───────────────────────────────── */

describe('F11 — the wiring tells the redraw WHICH pair was acted on', () => {
  test('RED — judging pair 5 reports index 5, not 0', () => {
    /*
     * The half of F11 that lives here. The renderer can only restore focus to the right pair if
     * the wiring says which pair it was, and `onChange(state)` used to say nothing. A renderer
     * fix alone would have been silently reverted by this signature.
     */
    const { el, fire } = fakeContainer();
    const seen = [];
    judge.wireJudgeKeys(el, ROWS, mod.emptyState(pairs), (state, index) => seen.push([state, index]));
    fire(keyOn(5, '1'));
    assert.equal(seen.length, 1);
    assert.equal(seen[0][1], 5, 'the redraw was not told which pair was judged');
    assert.equal(seen[0][0].verdicts[5].kind, 'left');
  });

  test('clearing a pair reports its index too, so undo does not jump the cursor', () => {
    const { el, fire } = fakeContainer();
    const seen = [];
    judge.wireJudgeKeys(el, ROWS, mod.emptyState(pairs), (state, index) => seen.push([state, index]));
    fire(keyOn(7, '2'));
    fire(keyOn(7, '0'));
    assert.deepEqual(seen.map((s) => s[1]), [7, 7]);
    assert.equal(seen[1][0].verdicts[7], undefined, 'the clear did not take effect');
  });

  test('an unmapped key reports nothing at all — it is not a verdict', () => {
    const { el, fire } = fakeContainer();
    const seen = [];
    judge.wireJudgeKeys(el, ROWS, mod.emptyState(pairs), (state, index) => seen.push([state, index]));
    fire(keyOn(3, 'q'));
    fire(keyOn(3, 'ArrowRight'));
    assert.deepEqual(seen, []);
  });

  test('the pairs it returns are the ones it judged against', () => {
    const { el } = fakeContainer();
    const keys = judge.wireJudgeKeys(el, ROWS, mod.emptyState(pairs), () => {});
    assert.equal(keys.pairs.length, 10);
    assert.equal(keys.getState().pairCount, 10);
  });
});

/* ── boot failure paths ───────────────────────────────────────────────────── */

describe('initJudge reports rather than throws', () => {
  /** A panel stub. The row checks run BEFORE anything touches the DOM, so nothing else is needed. */
  const panel = { querySelectorAll: () => [] };

  test('a missing panel is a reason, not an exception', () => {
    // The shell may have failed to build the panel; a judge panel that takes the whole console
    // down with it would be a worse failure than a missing feature.
    const out = judge.initJudge(ROWS, null);
    assert.equal(out.ok, false);
    assert.match(out.reason, /panel-judge not found/);
  });

  test('the panel is checked before the rows — a missing panel is named even with bad rows', () => {
    // Order matters for the operator's diagnosis: "no panel" and "not enough variants" have
    // different fixes, and reporting the second when the first is true sends them the wrong way.
    const out = judge.initJudge([ROWS[0]], null);
    assert.match(out.reason, /panel-judge not found/);
  });

  test('fewer than two variants is a reason, not a crash', () => {
    const out = judge.initJudge([ROWS[0]], panel);
    assert.equal(out.ok, false);
    assert.match(out.reason, /fewer than two variants/);
  });

  test('a non-array row list is refused before it reaches the panel', () => {
    assert.equal(judge.initJudge(undefined, panel).ok, false);
    assert.equal(judge.initJudge('v01,v02', panel).ok, false);
  });
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: the wiring module and this suite stay within 300 lines', () => {
  for (const f of ['app-judge.js', 'app-judge.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
