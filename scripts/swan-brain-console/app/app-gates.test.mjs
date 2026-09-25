/**
 * app-gates.test — the Gate Health panel's pure planners.
 * @module scripts/swan-brain-console/app/app-gates.test
 *
 * WHY THIS SUITE EXISTS
 * S4.1's whole deliverable is that "not run" is visible as something OTHER than "pass".
 * A panel that renders every gate as a neutral row has failed at that even while showing
 * correct data, so the assertions here are about the WORDS and the TONE, not just the
 * count: a gate that never ran must not read as a gate that succeeded.
 *
 * Written RED-first: this file was run before `app-gates.js` existed, so the import
 * failure is the recorded RED.
 *
 * Run: node --test scripts/swan-brain-console/app/app-gates.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STATUS_TEXT, STATUS_TONE, statusText, statusTone, headline, gateRows, renderGates,
} from './app-gates.mjs';
/*
 * STATUSES comes from the HEALTH module, not from the panel.
 *
 * The panel deliberately does not restate the status vocabulary. Sweeping the panel's
 * label/tone maps against the one list that defines the statuses means this suite fails
 * the moment the two drift, instead of the panel quietly keeping a stale copy of its own.
 * `../gateHealth.mjs` is Node-only (it reads files), which is fine HERE — the PANEL must
 * stay browser-safe, and this file is a test, not something that ships to the page.
 */
import { STATUSES } from '../gateHealth.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/*
 * ROUND 12 (2026-09-20). These assertions used to read `app.css` by name, and that was a narrower
 * claim than the one they state. What matters is that the STYLESHEETS THE PAGE LOADS carry the
 * rule — not which file the rule happens to sit in. Splitting `app.css` for Rule 4 moved the gate
 * table's mobile scroller into `app-panels.css` and broke two of them, which is a test asserting
 * a filename rather than a property. The set is discovered the same way `style-hooks.test.mjs`
 * discovers it, so a future split cannot break this again.
 */
const allCss = () => readdirSync(HERE)
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(HERE, f), 'utf8'))
  .join('\n');

/** A minimal gate row, in the shape `readGateHealth` produces. */
const g = (id, status, detail = 'because') => ({
  id, label: id, path: `p/${id}.json`, declaredBy: 'somewhere', status, detail, ageDays: null,
});

/* ── the invariant: not-run must not look like pass ───────────────────────── */

test('NOT RUN is labelled distinctly from PASS', () => {
  assert.notEqual(statusText('not_run'), statusText('pass'));
  assert.match(statusText('not_run'), /not run/i);
});

test('NOT RUN does not carry the passing tone', () => {
  assert.notEqual(statusTone('not_run'), statusTone('pass'));
  assert.equal(statusTone('pass'), 'ok');
  assert.notEqual(statusTone('not_run'), 'ok');
});

test('every status in the health module has a label and a tone', () => {
  for (const s of STATUSES) {
    assert.ok(STATUS_TEXT[s], `no label for ${s}`);
    assert.ok(STATUS_TONE[s], `no tone for ${s}`);
  }
});

test('an unknown status degrades to a non-passing label rather than throwing', () => {
  assert.doesNotThrow(() => statusText('wat'));
  assert.notEqual(statusText('wat'), statusText('pass'));
  assert.notEqual(statusTone('wat'), 'ok');
});

/* ROUND 24. `'wat'` is a key nobody types. These are the ones an agent probes with, and every
 * one of them resolves on `Object.prototype` — truthy, non-nullish, and not a label. */
test('a prototype key is an unknown status, not a label or a tone', () => {
  for (const s of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf']) {
    assert.equal(statusText(s), 'UNKNOWN', `statusText('${s}') must be a label, not ${typeof statusText(s)}`);
    assert.equal(typeof statusText(s), 'string');
    assert.equal(statusTone(s), 'unknown', `statusTone('${s}') must be a tone, not ${typeof statusTone(s)}`);
    assert.notEqual(statusTone(s), 'ok');
  }
});

/* ── the headline says what the operator needs in one line ────────────────── */

test('a headline names how many gates have no result — and never claims they did not run', () => {
  /*
   * ROUND 15 (Astra K07). The old assertion was `/never ran/i`, and it was pinning a claim the
   * panel cannot make: the reader sees a path with no committed result, which is not the same as
   * a gate that did not run (CI uploads `three-worlds-render`'s artifact and never commits it),
   * and for a producerless gate no result can ever appear.
   */
  const h = headline({ total: 5, pass: 0, fail: 1, stale: 1, not_run: 2, unreadable: 0, not_evidence: 1 });
  assert.match(h, /0 of 5/);
  assert.match(h, /2/);
  assert.match(h, /no committed result/i);
  assert.doesNotMatch(h, /never ran/i, 'the panel cannot know that a gate did not run');
});

test('a producerless gate is called out rather than counted as a failure to run', () => {
  // MUTATION: drop the `producerless` clause from `headline`. RED.
  const h = headline({ total: 5, pass: 0, fail: 0, stale: 0, not_run: 2, unreadable: 0, not_evidence: 3, producerless: 1 });
  assert.match(h, /no committed result/i);
  assert.match(h, /no producer/i);
  assert.doesNotMatch(h, /never ran/i);
});

test('an all-pass summary reads as passing', () => {
  const h = headline({ total: 3, pass: 3, fail: 0, stale: 0, not_run: 0, unreadable: 0, not_evidence: 0 });
  assert.match(h, /3 of 3/);
  assert.doesNotMatch(h, /never ran/i);
  assert.doesNotMatch(h, /no committed result/i);
});

/* ── rows are a pure projection, in a stable order ────────────────────────── */

test('gateRows returns one row per gate, preserving order', () => {
  const rows = gateRows([g('a', 'pass'), g('b', 'not_run'), g('c', 'fail')]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'c']);
});

test('gateRows carries the label, tone and detail through', () => {
  const [row] = gateRows([g('x', 'not_run', 'no result at p/x.json')]);
  assert.equal(row.tone, statusTone('not_run'));
  assert.equal(row.statusText, statusText('not_run'));
  assert.equal(row.detail, 'no result at p/x.json');
  assert.equal(row.label, 'x');
});

test('gateRows tolerates a malformed gate without throwing', () => {
  assert.doesNotThrow(() => gateRows([null, undefined, {}, g('ok', 'pass')]));
});

/* ── the DOM half: the class the panel renders must be a class the CSS knows ──
 * ROUND 7 (2026-09-20). The panel built its table with `class="gate-table"`, and `app.css`
 * styles `.table` — so the gate table matched NOTHING. It got no padding, no borders, no
 * header treatment, and not the `@media (max-width: 700px)` rule that exists specifically
 * to stop a six-column table pushing the page wide. Measured in a real browser: the panel
 * overflowed the document by 63px at 320px and 8px at 375px, and because `app.css` sets
 * `html { overflow-x: hidden }` the overflow was CLIPPED, not scrollable.
 *
 * The browser check did not catch it because the responsive matrix measured one tab out of
 * ten. This is the faster, more specific guard: it names the CAUSE (a class token no
 * stylesheet defines) rather than the symptom, and it reads the real stylesheet rather than
 * a copy of it.
 * ------------------------------------------------------------------------ */

/** The smallest document `renderGates` needs. Mirrors the stub style of the shell suite. */
function fakeDoc() {
  const byId = new Map();
  const make = (tag) => {
    const el = {
      tagName: tag, className: '', textContent: '', id: '', children: [], dataset: {},
      append(...kids) { this.children.push(...kids); },
      replaceChildren(...kids) { this.children = [...kids]; },
    };
    return el;
  };
  const doc = {
    createElement: make,
    getElementById: (id) => byId.get(id) ?? null,
  };
  const panel = make('section');
  panel.id = 'panel-gate-health';
  byId.set('panel-gate-health', panel);
  doc.__panel = panel;
  return doc;
}

/** Depth-first search of the stub tree for the first element with this tag. */
function findTag(node, tag) {
  if (!node) return null;
  if (node.tagName === tag) return node;
  for (const kid of node.children ?? []) {
    const hit = findTag(kid, tag);
    if (hit) return hit;
  }
  return null;
}

test('the gate table carries a class app.css actually styles', () => {
  /*
   * The assertion is against the STYLESHEET, not against a literal. Pinning
   * `className === 'gate-table'` would have passed while the table was unstyled, which is
   * exactly the state this test exists to forbid.
   *
   * Not every token needs a rule: `gate-table` is a HOOK (the browser verifier selects
   * `#panel-gate-health .gate-table tbody tr`), not a style hook. So the invariant is that
   * the element is matched by at least one rule — and that one of them is the stylesheet's
   * own `.table`, which is what carries the mobile overflow scroller.
   *
   * RED as written: before the fix the only token was `gate-table`, `styled` was empty, and
   * this test failed with "app.css defines no .gate-table rule".
   */
  const doc = fakeDoc();
  const out = renderGates({ summary: {}, gates: [g('planning-validation', 'pass')] }, doc);
  assert.equal(out.ok, true);

  const table = findTag(doc.__panel, 'table');
  assert.ok(table, 'the panel rendered no table at all');

  const css = allCss();
  const tokens = String(table.className).split(/\s+/).filter(Boolean);
  assert.ok(tokens.length > 0, 'the table rendered with no class at all');

  const styled = tokens.filter((t) => css.includes(`.${t}`));
  assert.ok(
    styled.length > 0,
    `no class on the gate table [${tokens.join(', ')}] has a rule in the loaded stylesheets — it `
      + 'is styled by nothing, including the @media (max-width: 700px) scroller that stops it '
      + 'pushing the page wide',
  );
  assert.ok(styled.includes('table'), `the .table rule is not among the applied classes [${tokens.join(', ')}]`);
  // And the hook the browser verifier selects on must survive, or its row count breaks.
  assert.ok(tokens.includes('gate-table'), 'the .gate-table hook the verifier uses is gone');
});

test('the stylesheet still carries the mobile scroller this class depends on', () => {
  // The fix above only works because `@media (max-width: 700px)` turns `.table` into its
  // own horizontal scroller. If that rule is ever deleted, the class fix silently stops
  // preventing the overflow.
  const css = allCss();
  assert.match(css, /@media\s*\(max-width:\s*700px\)/);
  assert.match(css, /\.table\s*\{[^}]*overflow-x:\s*auto/s);
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: both modules stay within 300 lines', () => {
  for (const f of ['app-gates.mjs', 'app-gates.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
