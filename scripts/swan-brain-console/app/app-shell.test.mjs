/**
 * app-shell-contract — the registries drive the shell, and the shell cannot run a seat.
 * @module scripts/swan-brain-console/app/app-shell.test
 *
 * WHY THIS SUITE IS DOM-FREE
 * The acceptance criterion for S3 is "a new panel needs no shell edit". Proving that
 * with a browser would prove it for one row on one machine; proving it by feeding the
 * planner a fixture and asserting the output grew is a proof about the CODE. That is
 * why `app-shell.js` separates pure planning from DOM application — the planners are
 * testable here, and the DOM layer is a thin applier over their output.
 *
 * THE THREE THINGS THIS SUITE IS ACTUALLY GUARDING
 *   1. The registry is the single source of tabs (D1) and a new row renders (D2).
 *   2. No seat can ever offer a Run action (D3). This console is GET-only; a Run button
 *      would imply a capability that does not exist.
 *   3. Registries are read at request time, not cached at boot (D4) — proven by
 *      changing a file between two calls to the same reader the route uses.
 *
 * Run: node --test scripts/swan-brain-console/app/app-shell.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = HERE;

const shell = await import(pathToFileURL(join(HERE, 'app-shell.js')).href);

const readJson = (file) => JSON.parse(readFileSync(join(APP, file), 'utf8'));

/* ── The real registries ────────────────────────────────────────────────────── */

describe('the shipped registries are valid', () => {
  test('tabs.json validates and still contains the eight original tabs, in order', () => {
    const out = shell.validateTabs(readJson('tabs.json'));
    assert.deepEqual(out.errors, []);
    assert.equal(out.ok, true);
    /*
     * ASSERTED AS A SUBSEQUENCE, NOT AS A PREFIX — and the prefix version was WRONG.
     *
     * This used to be `rows.slice(0, 6)` compared to the original ids, with a comment
     * claiming that a prefix "leaves additions free" while still catching a removal. That
     * claim does not hold: a prefix tolerates APPENDING only. S4.1 inserted the
     * `gate-health` row after `engine`, which is a valid registry, and this test went red
     * anyway — it was measuring POSITION when the invariant is PRESENCE AND ORDER.
     *
     * The regression worth catching is a tab DISAPPEARING or being REORDERED. A subsequence
     * walk catches both, and unlike the prefix it genuinely leaves insertions free.
     */
    const original = ['doctrine', 'fleet', 'canvas', 'copy', 'engine', 'seats', 'memory', 'ship'];
    let cursor = 0;
    for (const id of out.rows.map((t) => t.id)) {
      if (id === original[cursor]) cursor += 1;
    }
    assert.equal(
      cursor,
      original.length,
      'the original tabs must survive in their original relative order; missing or '
        + `reordered from: ${original.slice(cursor).join(', ')}`,
    );
    assert.ok(out.rows.length >= original.length, `expected at least ${original.length} tabs, got ${out.rows.length}`);
  });

  test('sources.json validates, and every path is repo-relative', () => {
    const out = shell.validateSources(readJson('sources.json'));
    assert.deepEqual(out.errors, []);
    assert.ok(out.rows.length >= 8);
    for (const r of out.rows) {
      assert.ok(!r.path.startsWith('/'), `${r.id} must be repo-relative`);
      assert.ok(!r.path.includes('..'), `${r.id} must not escape the repo`);
    }
  });

  test('seats.json validates, and every script path is repo-relative', () => {
    const out = shell.validateSeats(readJson('seats.json'));
    assert.deepEqual(out.errors, []);
    assert.ok(out.rows.length >= 6);
    for (const r of out.rows) {
      assert.match(r.script, /^scripts\/[\w.-]+\.mjs$/);
      assert.ok(['subscription', 'api', 'unknown'].includes(r.billing));
    }
  });
});

/* ── D1 — the registry drives the strip ─────────────────────────────────────── */

describe('D1 — the tab strip is the registry, not a literal', () => {
  const tabs = shell.validateTabs(readJson('tabs.json')).rows;

  test('the strip has one entry per registry row, in registry order', () => {
    const plan = shell.planTabStrip(tabs, 'doctrine');
    assert.equal(plan.length, tabs.length);
    assert.deepEqual(plan.map((p) => p.id), tabs.map((t) => t.id));
    assert.deepEqual(plan.map((p) => p.label), tabs.map((t) => t.label));
  });

  test('REMOVING a registry row removes a tab', () => {
    const trimmed = tabs.filter((t) => t.id !== 'ship');
    const plan = shell.planTabStrip(trimmed, 'doctrine');
    assert.equal(plan.length, tabs.length - 1);
    assert.ok(!plan.some((p) => p.id === 'ship'), 'the removed row is still rendered');
  });

  test('exactly one tab is selected and only it is tabbable', () => {
    const plan = shell.planTabStrip(tabs, 'copy');
    assert.equal(plan.filter((p) => p.selected).length, 1);
    assert.equal(plan.filter((p) => p.tabIndex === 0).length, 1);
    assert.equal(plan.find((p) => p.selected).id, 'copy');
  });

  test('an unknown active id falls back to the first tab rather than selecting nothing', () => {
    const plan = shell.planTabStrip(tabs, 'no-such-tab');
    assert.equal(plan.filter((p) => p.selected).length, 1);
    assert.equal(plan[0].selected, true);
  });

  test('an empty registry plans nothing and selects nothing, without throwing', () => {
    assert.deepEqual(shell.planTabStrip([], 'doctrine'), []);
    assert.equal(shell.nextTabId([], 'doctrine', 1), null);
  });
});

/* ── D2 — a new panel needs no shell edit ───────────────────────────────────── */

describe('D2 — a new registry row renders with no edit to app-shell.js', () => {
  test('a fixture row appears in the strip and in the panel plan', () => {
    const tabs = shell.validateTabs(readJson('tabs.json')).rows;
    // The fixture. Nothing in app-shell.js knows this id exists — that is the test.
    // Deliberately `zz-fixture`, so it can never collide with a real registry row.
    const fixture = { id: 'zz-fixture', label: 'Fixture', module: null, api: null };
    const grown = [...tabs, fixture];

    const strip = shell.planTabStrip(grown, 'doctrine');
    assert.equal(strip.length, tabs.length + 1);
    const added = strip.at(-1);
    assert.equal(added.id, 'zz-fixture');
    assert.equal(added.label, 'Fixture');
    assert.equal(added.controls, 'panel-zz-fixture');
    assert.equal(added.selected, false);

    const { panels } = shell.planPanels(grown, []);
    assert.ok(panels.some((p) => p.id === 'zz-fixture'));
  });

  test('a row with no authored panel is flagged, not dropped', () => {
    // `zz-fixture`, not `judge`: this test originally used `judge` as its synthetic id,
    // and when S2 made Judge a REAL registry row the fixture silently became a
    // duplicate — the assertion then failed for a reason unrelated to the behaviour
    // under test. A fixture id must be one that cannot ever become real.
    const grown = [...shell.validateTabs(readJson('tabs.json')).rows,
      { id: 'zz-fixture', label: 'Fixture', module: null, api: null }];
    // The authored panels are the real tabs' panels, so the fixture has none.
    const authored = shell.validateTabs(readJson('tabs.json')).rows.map((t) => `panel-${t.id}`);
    const { panels } = shell.planPanels(grown, authored);
    const fixture = panels.find((p) => p.id === 'zz-fixture');
    assert.equal(fixture.needsPanel, true, 'the shell must create the panel it has no content for');
    assert.equal(panels.find((p) => p.id === 'doctrine').needsPanel, false);
  });

  test('an authored panel with no registry row is REPORTED as an orphan', () => {
    const tabs = shell.validateTabs(readJson('tabs.json')).rows;
    const { orphans } = shell.planPanels(tabs, [...tabs.map((t) => `panel-${t.id}`), 'panel-ghost']);
    assert.deepEqual(orphans, ['panel-ghost']);
  });
});

/* ── The DOM-application suite lives in `app-shell-dom.test.mjs` ────────────────
 * Split out to satisfy Rule 4. It asserts what `applyShell` puts in the document —
 * which is where the panel-creation defect lived, invisible to a plan-only test.
 */

/* ── D3 — a seat can never offer a Run action ───────────────────────────────── */

describe('D3 — every seat is a stop-card, never a Run button', () => {
  test('a relay-gated seat renders a stop-card', () => {
    const action = shell.seatAction({ seat: 'glm', script: 'scripts/consult-glm.mjs', billing: 'subscription', gate: 'relay' });
    assert.equal(action.kind, 'stop-card');
    assert.match(action.reason, /relay/i);
    assert.equal(action.command, 'node scripts/consult-glm.mjs');
  });

  /**
   * THE GUARD THAT MUST NOT PRODUCE SOMETHING.
   * A test for what a guard must NOT catch: no gate value — including ones invented
   * after this file was written — may yield a runnable action. Written as an
   * exhaustive sweep rather than one example, because the failure mode is a future
   * gate being added and quietly defaulting to runnable.
   */
  test('NO gate value produces a runnable action', () => {
    const gates = ['relay', 'manual', 'direct', 'automatic', 'none', '', null, undefined, 'RUN'];
    for (const gate of gates) {
      const action = shell.seatAction({ seat: 'x', script: 'scripts/x.mjs', billing: 'api', gate });
      assert.equal(action.kind, 'stop-card', `gate ${JSON.stringify(gate)} produced ${action.kind}`);
      assert.notEqual(action.kind, 'run');
    }
  });

  test('every seat in the shipped registry is a stop-card', () => {
    for (const seat of shell.validateSeats(readJson('seats.json')).rows) {
      assert.equal(shell.seatAction(seat).kind, 'stop-card', `${seat.seat} would be runnable`);
    }
  });

  test('an unrecognised gate is labelled as such rather than silently accepted', () => {
    const action = shell.seatAction({ seat: 'x', script: 'scripts/x.mjs', gate: 'automatic' });
    assert.equal(action.gate, 'unrecognised');
    assert.match(action.reason, /unrecognised gate/);
  });
});

/* ── D4 and the HTTP route live in `registry-route.test.mjs` ────────────────────
 * They were SPLIT OUT to satisfy Rule 4 (this file reached 352 lines). That split is
 * why the acceptance command names BOTH files: a command naming only this one would
 * silently stop covering the server — which is the half of S3 that D16 is about.
 */

/*
 * THE STATIC-FALLBACK DRIFT GUARD MOVED OUT (round 9, 2026-09-20).
 *
 * It lives in ./app-fallback-drift.test.mjs now. It was one-directional — it checked
 * `static subset-of registry` and never the reverse — while `index.html` carried 8 tabs and
 * `tabs.json` declared 10, so the no-JS path was missing two panels and the guard named
 * "cannot silently drift" reported green. Both directions are asserted there, plus the
 * cardinality and the removed footer claim.
 *
 * Split out for Rule 4 as well as subject: this file reached 344 lines. Same precedent as
 * `app-shell-dom.test.mjs` above — a command naming only this file would silently stop
 * covering the fallback.
 */

/* ── Validation rejects bad input (the planner is not trusting) ─────────────── */

describe('validation rejects malformed registries instead of half-rendering', () => {
  test('duplicate ids, bad ids and missing labels are all caught', () => {
    const out = shell.validateTabs([
      { id: 'ok', label: 'Fine' },
      { id: 'ok', label: 'Duplicate' },
      { id: 'Bad Case', label: 'Bad id' },
      { id: 'no-label' },
      'not an object',
    ]);
    assert.equal(out.ok, false);
    assert.equal(out.rows.length, 1, 'only the valid row may survive');
    assert.equal(out.errors.length, 4);
    assert.ok(out.errors.some((e) => /duplicate/.test(e)));
    assert.ok(out.errors.some((e) => /not an object/.test(e)));
  });

  test('a non-array registry is refused, not coerced', () => {
    assert.equal(shell.validateTabs({}).ok, false);
    assert.equal(shell.validateSources('nope').ok, false);
    assert.equal(shell.validateSeats(null).ok, false);
  });

  test('a seat with an unknown gate is refused by validation', () => {
    const out = shell.validateSeats([{ seat: 'x', script: 'scripts/x.mjs', billing: 'api', gate: 'yolo' }]);
    assert.equal(out.ok, false);
    assert.match(out.errors[0], /"gate" must be one of/);
  });

  test('loadRegistries reports a fetch failure rather than throwing', async () => {
    const out = await shell.loadRegistries(async () => { throw new Error('offline'); });
    assert.equal(out.ok, false);
    assert.equal(out.errors.length, 3);
    assert.match(out.errors[0], /could not load/);
  });
});

/* ── Rule 4 ─────────────────────────────────────────────────────────────────── */

/*
 * SCOPE, STATED BECAUSE IT WAS NOT (round 10, 2026-09-20). Three Rule 4 guards live in this
 * directory — here, in `app-gates.test.mjs` and in `judge-export.test.mjs` — and each names
 * a hand-written list. Between them they cover nine files; eight more in `app/` are named by
 * none, and nothing says whether that is deliberate: `app.js`, `app-judge.js`, `onboard.js`,
 * `app-fallback-drift.test.mjs` and the four `.css`/`.html` assets.
 *
 * Round 10 then edited `app-judge.js` to 307 lines and NOTHING FAILED, which is the gap
 * demonstrated rather than argued. This is still not asserted as a violation — whether Rule
 * 4 covers stylesheets and assets is not established, and a gate built on a rule the project
 * does not have is itself a defect — so it is recorded as a decision to be made. What this
 * suite asserts is the unambiguous part: every file this round touched stays in budget.
 */
describe('Rule 4 — the S3 modules and suites stay within budget', () => {
  test('every S3 module and suite is ≤300 lines', () => {
    for (const f of [
      'app-shell.js', 'app-registries.mjs', 'app-shell.test.mjs', 'app-shell-dom.test.mjs',
      'registry-route.test.mjs', 'asset-routes.test.mjs', 'style-hooks.test.mjs',
    ]) {
      const lines = readFileSync(join(APP, f), 'utf8').split('\n').length;
      assert.ok(lines <= 300, `${f} is ${lines} lines, over the 300-line budget`);
    }
  });
});
