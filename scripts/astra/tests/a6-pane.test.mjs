/**
 * a6-pane.test.mjs — slice A6's SURFACE tests: the Ledger pane, its route, its one dial, and
 * the client handler behind it.
 *
 * THREE CLAIMS THIS FILE EXISTS TO MAKE, each of which a plausible wrong build would pass:
 *
 *   1. **THE DIAL IS WIRED, NOT MERELY RENDERED.** `AC4.6`'s registry check proves the id is
 *      registered and present in the markup; it says nothing about whether anything happens on
 *      use. A4b found two dead controls that way. So this file IMPORTS THE CLIENT MODULE (with a
 *      small DOM stub — the client touches `document` at module scope) and asserts the Ledger's
 *      handler is the SAME FUNCTION OBJECT as the Think pane's, which is a claim about identity
 *      rather than about agreement. Two handlers that happen to agree today would pass a text
 *      check and fail this.
 *   2. **THE PANE IS PURE.** A5's hostile review found the State pane re-reading the board behind
 *      its caller, and proved it by handing the pane a two-lane summary and watching it print
 *      sixty attempts. The same proof is repeated here with a hand-made ledger: the header must
 *      show the numbers it was GIVEN.
 *   3. **THE DIAL IS OFFERED ONLY WHERE IT CAN ACT.** A control rendered on a decided row is the
 *      dead-control defect in its other form — the operator presses it and concludes the action
 *      failed. This is asserted in both directions: one button on a pending row, none on a
 *      decided one, and none at all when nothing has been compiled.
 *
 * IT ALSO PINS THE A6 FIX TO THE THINK PANE. `renderThink` used to read `view.outcome` — a field
 * that does not exist — so it printed `outcome: pending` for every compile, including one just
 * marked rejected-all. The test below hands it a view carrying a DELIBERATELY WRONG `outcome`
 * field and requires the pane to ignore it, which is the only form of this test that a
 * re-regression to `view.outcome` cannot pass.
 *
 * AND IT PINS THE FOURTH CLAIM, ADDED BY THE HOSTILE ROUND: **THE PAGE MUST NOT ARGUE WITH
 * ITSELF.** The header counts the ledger and the batch section lists a separate argument, so a
 * ledger built over 41 compiles beside an omitted batch list printed *"17 rejected of 41"* above
 * *"no compiles yet"*. `C3` in `A6-CORRECTIONS.md`. Every fixture in this file therefore builds
 * both sides from ONE list, through `paneWith`, so that no test accidentally asserts the
 * refusal instead of the behaviour it was written for.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTROLS, READ_ONLY_PANES, UNWIRED_CONTROLS, verifyControls, controlsForPane } from '../surface/controls.mjs';
import { renderLedger } from '../surface/paneLedger.mjs';
import { renderThink } from '../surface/panes.mjs';
import { renderPane, PANE_PATHS, PANE_ROUTES } from '../surface/paneRoutes.mjs';
import { STYLESHEETS, stylesheetsOnDisk } from '../surface/shell.mjs';

const REJECT = 'ledger.markRejectedAll';
const THINK_REJECT = 'think.markRejectedAll';

/** Every `data-control` id in a body. */
const controlsIn = (html) => [...html.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);
/** The ids the pane attached to a specific compile, i.e. the ones that can actually act. */
const rejectTargets = (html) => [...html.matchAll(new RegExp(`data-control="${REJECT}" data-compile-id="([^"]+)"`, 'g'))]
  .map((m) => m[1]);

/** A compile row. The batch table reads only these fields — nothing else is needed, or used. */
const row = (id, outcome) => ({
  compileId: id, outcome, createdAt: '2026-09-26T12:00:00.000Z',
  view: { slots: [], facetsApplied: [] },
});

/** `n` rows, the first `rejected` of them `rejected_all` and the rest `pending`. */
const batchOf = (n, rejected = 0) => Array.from({ length: n },
  (_, i) => row(`c${i + 1}`, i < rejected ? 'rejected_all' : 'pending'));

/**
 * A ledger the PANE cannot have produced — hand-made, so "the pane rendered what it was given"
 * is a claim with a falsifiable opposite.
 *
 * `n` AND `byOutcome` ARE DERIVED FROM `rows`, NOT HAND-WRITTEN. `renderLedger` requires the
 * batch list and the ledger to be about the same set (C3), so a fixture that wrote `n`
 * independently of the rows it passes would model an input the pane REFUSES — and the test
 * would then be exercising the refusal instead of the thing it was written for. `rejected` is
 * still hand-made: it is the one number the trend cannot be checked against from the rows
 * without the fixture ceasing to be a fixture.
 *
 * `drift.rule.ok` defaults to true so the cost section renders its estimate columns; pass
 * `rule: { ok: false, reason: 'x' }` to render the withheld state.
 */
function fakeLedger({ rows = [], rejected = 0, bySlot = [], byFacet = [], drift = {}, note = 'a note' } = {}) {
  const byOutcome = { pending: 0, accepted: 0, refined: 0, rejected_all: 0 };
  for (const r of rows) byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;
  return {
    trend: {
      n: rows.length, rejected, byOutcome, rejectedIds: [],
      bySlot, byFacet, sufficient: rejected >= 3, minRejected: 3, note,
    },
    drift: {
      series: [], priced: 0, total: 0, summary: null, runsError: null,
      rule: { ok: true, source: 'scripts/forge.mjs', missing: [], reason: null }, ...drift,
    },
  };
}

/**
 * Render the pane from ONE list, the way the caller does — `paneRoutes.mjs` builds the ledger
 * over `ledgerEntries()` and passes that same array. Every fixture below goes through here,
 * because a fixture that built the two sides separately would be testing C3's refusal.
 */
const paneWith = (rows, opts = {}) => renderLedger({ ledger: fakeLedger({ rows, ...opts }), compiles: rows });

// ---------------------------------------------------------------------------
// AC6.1 — the control is registered, labelled, and WIRED
// ---------------------------------------------------------------------------

test('AC6.1 the Ledger dial is registered as a DIAL that writes with a token', () => {
  const check = verifyControls();
  assert.equal(check.ok, true, `registry inconsistent: ${JSON.stringify(check)}`);
  const c = CONTROLS.filter((x) => x.id === REJECT);
  assert.equal(c.length, 1, `${REJECT} must be registered exactly once — it is the pane's only control`);
  assert.equal(c[0].kind, 'dial', '02-BLUEPRINT §5 row 7 gives the Ledger a dial, not a proposal');
  assert.equal(c[0].pane, 'ledger');
  assert.equal(c[0].rendered, true);
  assert.equal(c[0].writes, true, 'it writes an outcome');
  assert.equal(c[0].token, true, 'a write with no token is a write with no CSRF protection');
  assert.match(c[0].effect, /one action, no typed reason/, 'AC6.1 says the reason is not typed');
  // The pane that carries it must NOT be declared read-only, and the read-only set must still
  // be exactly the two panes A5 closed. A third entry here would mean A6 quietly made a pane
  // read-only instead of building its control.
  assert.deepEqual(READ_ONLY_PANES.map((p) => p.pane).sort(), ['law', 'state']);
  assert.deepEqual(controlsForPane('ledger').map((x) => x.id), [REJECT]);
  // A6 ADDS THE LAST CONTROL THE RAIL WAS MISSING, and it must not arrive unwired. The
  // exclusion list has been empty since A4b emptied it; a first entry here would mean the
  // Ledger's dial shipped as a dead control.
  assert.deepEqual(UNWIRED_CONTROLS, [],
    'no rendered control is excused as unwired — the Ledger dial must not become the first entry');
});

test('AC6.1 the Ledger handler IS the Think handler — the same function object', async () => {
  // The client touches `document` and `window.matchMedia` at module scope, so it is imported
  // under a two-line stub. This is a REAL import: the assertions below are made against the
  // table the browser dispatches on, not against the file's text.
  globalThis.document = { getElementById: () => null, addEventListener: () => {}, querySelector: () => null };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.location = { pathname: '/ledger', reload() {} };
  const root = new URL('../static/astra-actions.js', import.meta.url).href;
  const { ACTIONS } = await import(root);

  // The import must have produced a real table, or the identity claim below is two `undefined`s.
  assert.ok(Object.keys(ACTIONS).length >= 15,
    `the dispatch table came back with ${Object.keys(ACTIONS).length} entries — the import did not load it`);
  assert.ok(ACTIONS[REJECT], `${REJECT} renders but has no handler — that is a DEAD CONTROL`);
  assert.equal(typeof ACTIONS[REJECT], 'function');
  assert.equal(ACTIONS[REJECT], ACTIONS[THINK_REJECT],
    'the two affordances of `rejected_all` must be ONE function. Two that currently agree can '
    + 'drift — one gaining a confirmation, the other losing the token — and nothing would notice.');

  // THE FULL SWEEP IS NOT REPEATED HERE. `a4-surface.test.mjs` walks every RENDERED control
  // against the client source, and `ledger.markRejectedAll` is rendered — so the sweep covers
  // it from the moment it was registered. What that sweep cannot see is IDENTITY, and that is
  // the gap this test fills. Duplicating the sweep here would give two places to keep in step.
});

test('AC6.1 the dial is offered ONLY on a row that can still be decided', () => {
  const pendingOnly = paneWith([row('c1', 'pending')]);
  assert.deepEqual(rejectTargets(pendingOnly), ['c1'], 'a pending row offers the dial, pointed at itself');

  const decidedOnly = paneWith([row('c2', 'rejected_all')], { rejected: 1 });
  assert.deepEqual(rejectTargets(decidedOnly), [],
    'a decided row must offer NO dial — pressing it would do nothing, which reads as a failure');
  assert.match(decidedOnly, /no action offered/, 'and it must SAY so rather than render an empty cell');

  const mixed = paneWith([row('c3', 'pending'), row('c4', 'accepted'), row('c5', 'pending')]);
  assert.deepEqual(rejectTargets(mixed), ['c3', 'c5'], 'one dial per pending row, and no others');
});

// ---------------------------------------------------------------------------
// The pane is PURE — the A5 D48 defect class, re-proved for A6
// ---------------------------------------------------------------------------

test('HOSTILE (A6) the Ledger renders the numbers it was GIVEN, not ones it re-derived', () => {
  // A number the real registry cannot produce in a test: if the pane called `ledgerEntries()`
  // or `rejectedAllTrend()` itself, the header would show the live registry's counts and this
  // would read 0 of 0.
  const html = paneWith(batchOf(41, 17), { rejected: 17 });
  assert.match(html, /<b data-ledger-rejected>17<\/b> rejected of 41/,
    'the header must show the ledger it was handed — a pane that re-reads its source is two panes');
  assert.doesNotMatch(html, /rejected of 0/, 'the pane must not fall back to an empty registry');
});

test('HOSTILE (A6) a ledger and a batch list that DISAGREE are a named failure, not a page arguing with itself', () => {
  // THE STATE THE HOSTILE ROUND FOUND BY EXECUTION (C3), reached exactly the way a caller
  // reaches it: `renderLedger({ ledger })` with `compiles` omitted. The first version drew a
  // header reading "17 rejected of 41" directly above a batch section reading "no compiles
  // yet" — two answers to one question, in one document, in the console's own voice.
  const html = renderLedger({ ledger: fakeLedger({ rows: batchOf(41, 17), rejected: 17 }) });
  assert.match(html, /E_LEDGER_BATCH_MISMATCH/, 'the disagreement must be NAMED');
  assert.doesNotMatch(html, /data-ledger-rejected/,
    'and the header count must not render — it is one half of the contradiction');
  assert.doesNotMatch(html, /no compiles yet/,
    'nor the empty batch state, which claims nothing was compiled while the ledger counts 41');

  // A PARTIAL list is the same fault one row short, not only the fully-omitted argument.
  const short = renderLedger({ ledger: fakeLedger({ rows: batchOf(3) }), compiles: [row('c1', 'pending')] });
  assert.match(short, /E_LEDGER_BATCH_MISMATCH/, 'a batch list shorter than the ledger is the same defect');

  // C9 — THE GUARD MUST BE TOTAL. `null` is not a list, and the first cut read `.length` before
  // it could refuse, so this threw a TypeError and the pane answered with a 500: an UNNAMED
  // failure, in the pane whose whole argument is that a failure is named. Asserted by NOT
  // throwing rather than by matching a string — the defect WAS the throw.
  const nulled = renderLedger({ ledger: fakeLedger({ rows: batchOf(3) }), compiles: null });
  assert.match(nulled, /E_LEDGER_BATCH_MISMATCH/, 'a non-list batch argument must be NAMED, not thrown');
  assert.match(nulled, /is not a list/, 'and the reason must say which fault it is');

  // AND THE MATCHING CASE MUST STILL DRAW, or the guard is a pane that never renders.
  const ok = paneWith(batchOf(3));
  assert.match(ok, /<b data-ledger-rejected>0<\/b> rejected of 3/);
  assert.match(ok, /THIS BATCH/);
});

test('HOSTILE (A6) an absent ledger is a NAMED failure, never an empty Ledger', () => {
  const html = renderLedger({});
  assert.match(html, /E_LEDGER_UNRESOLVED/, 'a missing ledger must name the fault');
  assert.doesNotMatch(html, /data-ledger-rejected/,
    'an unresolved ledger must not render a count — `0 rejected` reads as "nothing was rejected"');
  // The reason is asserted WITHOUT its quotation marks: the pane escapes them, and a test that
  // matched the raw form would fail against correct escaping and pass against broken escaping.
  assert.match(html, /the defect this pane exists to catch/, 'and the reason must be stated');
});

test('HOSTILE (A6) a share with no denominator renders an em-dash, never NaN% or 0%', () => {
  // The guard is unreachable from `rejectedAllTrend` BY CONSTRUCTION (see `ledgerTrend.mjs`), so
  // the only honest place to test it is here, where a hand-made trend can carry `all: 0`.
  const html = paneWith([row('c1', 'pending')], {
    bySlot: [{ key: 'subject', rejected: 1, all: 0, share: null, values: [] }],
  });
  assert.match(html, /—/, 'an absent denominator must render as absent');
  assert.doesNotMatch(html, /NaN/, 'a NaN would be the arithmetic leaking onto the screen');
  assert.doesNotMatch(html, /1 of 0 \(0%\)/, 'a 0% share is a claim the data cannot support');
});

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

test('AC6.3 /ledger is a real pane route, and it renders all three sections', async () => {
  assert.ok(PANE_PATHS.includes('/ledger'), '/ledger must be enumerable — a route no guard can see');
  assert.equal(PANE_ROUTES.filter((r) => r.path === '/ledger').length, 1, 'one entry, not two');
  const pane = await renderPane('/ledger', { state: {} });
  assert.equal(pane.title, 'Ledger');
  assert.equal(pane.activePane, 'ledger');
  assert.match(pane.body, /THIS BATCH/);
  assert.match(pane.body, /THE TREND/);
  assert.match(pane.body, /COST DRIFT/);
  assert.doesNotMatch(pane.body, /not built yet/,
    'A6 is the slice that builds the last stub; the pane must no longer claim otherwise');
  // An unknown path is still null — the fall-through is a 404, not a blank 200.
  assert.equal(await renderPane('/ledger/nope', { state: {} }), null);
});

test('AC6.3 the Ledger stylesheet is linked AND on disk, in both directions', () => {
  const onDisk = stylesheetsOnDisk();
  assert.ok(STYLESHEETS.includes('/static/astra-ledger.css'), 'the sheet must be linked by the shell');
  assert.ok(onDisk.includes('/static/astra-ledger.css'), 'and it must exist');
  assert.deepEqual([...STYLESHEETS].sort(), onDisk,
    'a hand-kept list of sheets stops covering the one added next slice — the two must agree');
  assert.equal(STYLESHEETS.indexOf('/static/astra.css'), 0,
    'cascade order is load-bearing: `.panel--notice` and `.panel` have equal specificity');
});

// ---------------------------------------------------------------------------
// The A6 fix to the Think pane
// ---------------------------------------------------------------------------

const VIEW = {
  blocked: false, partial: false, brainVersion: 'x', slots: [], lawChecks: [], capabilities: {},
  promptText: 'p', provider: 'gemini',
};

test('A6 FIX the Think pane reads the outcome it is GIVEN, never `view.outcome`', () => {
  // A view carrying a DELIBERATELY WRONG `outcome`. If the pane ever goes back to reading the
  // view, this test fails — which is the only version of it that a regression cannot pass.
  const lying = { ...VIEW, outcome: 'pending' };
  const rejected = renderThink({ view: lying, compileId: 'cmp-1', outcome: 'rejected_all' });
  assert.match(rejected, /outcome: <b>rejected_all<\/b>/,
    'the outcome comes off the registry entry; `view.outcome` has never existed');
  assert.doesNotMatch(rejected, /outcome: <b>pending<\/b>/, 'the view\'s own field must be ignored');

  // And the control follows the outcome: a decided compile offers no button.
  assert.deepEqual(controlsIn(rejected).filter((id) => id === THINK_REJECT), [],
    'a compile already marked rejected-all must not offer the action again');

  const pending = renderThink({ view: VIEW, compileId: 'cmp-2', outcome: 'pending' });
  assert.match(pending, /outcome: <b>pending<\/b>/);
  assert.deepEqual(controlsIn(pending).filter((id) => id === THINK_REJECT), [THINK_REJECT],
    'a pending compile still offers the action');
});

test('A6 FIX the Think pane no longer reads `view.estimatedCents`, which does not exist', () => {
  const html = renderThink({ view: { ...VIEW, estimatedCents: 40 }, compileId: 'cmp-3', outcome: 'pending' });
  assert.doesNotMatch(html, /est 40¢/,
    'the field is not on the ExplainView; rendering it would be inventing a number');
  assert.match(html, /href="\/ledger"/, 'cost belongs on the Ledger, and the pane must point there');
});
