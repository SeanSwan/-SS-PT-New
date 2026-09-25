/**
 * panelPopulation-contract — the panel-content table, pinned against the real readers.
 * @module scripts/swan-brain-console/panelPopulation.test
 *
 * WHAT THIS SUITE IS FOR (round 12, 2026-09-20 — Astra F14)
 * The browser gate used to assert that each panel's `innerText` exceeded 20 characters. Astra
 * graded it correctly: every authored panel already carries permanent introductory copy, so the
 * check passed with the dynamic renderer replaced by a successful no-op. `#panel-judge` alone
 * holds ~334 characters of prose.
 *
 * The fix measures a CONTAINER against a population derived from the `/api/state` snapshot. This
 * suite is what keeps that table honest, and it does the two things a browser run cannot:
 *
 *   1. it derives the expectations from the REAL readers, so a table that has drifted from the
 *      tree fails here rather than only inside a Chromium run nobody can start in CI;
 *   2. it reproduces the DEFECT — showing the old panel-level check satisfied by static copy —
 *      so the regression is proven rather than asserted.
 *
 * The browser half of F14 remains **UNVERIFIED** in this environment: `console-verify.mjs` needs
 * a Vite server and a Playwright Chromium, and neither is run here. What is verified is the
 * table, its completeness against the registry, and that the gate consumes it.
 *
 * Run: node --test scripts/swan-brain-console/panelPopulation.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PANEL_POPULATION, CANVAS_ROUND_SIZE, pairsFor, comparePopulations } from './panelPopulation.mjs';
import { snapshot } from './snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, 'app');

const ctx = await snapshot();
const readJson = (f) => JSON.parse(readFileSync(join(APP, f), 'utf8'));
const html = () => readFileSync(join(APP, 'index.html'), 'utf8');

/** A healthy measurement, built from the table itself, so a test can perturb ONE entry. */
const healthy = () => Object.fromEntries(PANEL_POPULATION.map((e) => [e.selector, e.expect(ctx)]));

describe('panelPopulation — the table describes this tree', () => {
  test('every expectation is a positive integer against the real snapshot', () => {
    // A zero or NaN here would make the corresponding browser assertion vacuous.
    for (const entry of PANEL_POPULATION) {
      const n = entry.expect(ctx);
      assert.ok(
        Number.isInteger(n) && n > 0,
        `${entry.tab}: ${entry.selector} expects ${n} — a population of zero makes the check vacuous`,
      );
    }
  });

  test('every selector targets CHILDREN of a container, never the container itself', () => {
    /*
     * A selector that matches the container counts 1 forever, which is exactly the defect F14
     * named one level down: a measurement that cannot go to zero because it is not measuring the
     * thing that can be empty. `#fleet-rows` would always be 1; `#fleet-rows > tr` is 0 when the
     * renderer does nothing.
     */
    for (const entry of PANEL_POPULATION) {
      assert.match(
        entry.selector, /[ >]/,
        `${entry.tab}: selector "${entry.selector}" has no combinator — it matches the container, not its children`,
      );
    }
  });

  test('each selector is anchored on an element index.html actually authors', () => {
    const doc = html();
    for (const entry of PANEL_POPULATION) {
      const id = /#([a-z0-9-]+)/.exec(entry.selector)?.[1];
      assert.ok(id, `${entry.tab}: selector "${entry.selector}" has no id anchor`);
      assert.ok(
        doc.includes(`id="${id}"`),
        `${entry.tab}: selector "${entry.selector}" anchors on #${id}, which index.html does not author`,
      );
    }
  });

  test('the table covers exactly the tabs that have a renderer', () => {
    /*
     * Derived from the registry rather than from a hand-written list, so adding a rendered panel
     * without adding an entry here fails — and adding a STATIC panel does not force a fake one.
     * Seats, Memory and Ship declare `module: null` and are static by design; demanding content
     * of them would invent a requirement the product does not have.
     */
    const rendered = readJson('tabs.json').filter((t) => t.module !== null).map((t) => t.id).sort();
    const covered = [...new Set(PANEL_POPULATION.map((e) => e.tab))].sort();
    assert.deepEqual(
      covered, rendered,
      'the population table and the registry disagree about which panels are rendered',
    );
    assert.ok(rendered.length >= 5, `only ${rendered.length} rendered tabs found — this check is nearly vacuous`);
  });

  test('CANVAS_ROUND_SIZE matches the size app.js actually groups by', () => {
    // A restated constant with nothing checking it is the drift class this round is about.
    const src = readFileSync(join(APP, 'app.js'), 'utf8');
    const m = /const size = (\d+);/.exec(src);
    assert.ok(m, 'app.js no longer declares a canvas round size in the expected form');
    assert.equal(Number(m[1]), CANVAS_ROUND_SIZE, 'app.js groups rounds by a different size');
  });
});

describe('panelPopulation — the judge population, which Astra named', () => {
  test('pairsFor matches pairsFrom: adjacent pairing, ten pairs from twenty variants', () => {
    assert.equal(pairsFor(20), 10, 'twenty variants are ten adjacent pairs, not C(20,2)');
    assert.equal(pairsFor(19), 9, 'an odd row out is unpaired, not padded');
    assert.equal(pairsFor(0), 0);
    assert.equal(pairsFor(1), 0);
  });

  test('pairsFor is pinned to the app reducer, not merely to this comment', async () => {
    // The browser gate cannot import the app's ESM graph, so the rule is duplicated — and the
    // duplication is pinned here against the real implementation.
    const { pairsFrom } = await import(pathToFileURL(join(APP, 'judge-export.mjs')).href);
    for (const n of [2, 5, 10, 19, 20, 21]) {
      const rows = Array.from({ length: n }, (_, i) => ({ id: `v${i}` }));
      assert.equal(
        pairsFor(n), pairsFrom(rows).pairs.length,
        `pairsFor(${n}) disagrees with pairsFrom — the duplicated rule has drifted`,
      );
    }
  });

  test('THE REGRESSION: a no-op Judge renderer is caught', () => {
    /*
     * Astra's settle for F14 was explicit: "Regression mutation: replace `initJudge` with a
     * successful no-op; the browser suite must fail." A successful no-op leaves the pair list
     * empty. This asserts that the empty list is a PROBLEM, and names the container.
     */
    const measured = healthy();
    measured['#panel-judge .judge-pair'] = 0;
    const problems = comparePopulations(ctx, measured);
    assert.equal(problems.length, 1, `expected exactly one problem, got: ${problems.join(' | ')}`);
    assert.match(problems[0], /judge/, 'the no-op Judge renderer was not reported');
    assert.match(problems[0], /expected 10/, 'the problem does not state the independent expectation');
  });

  test('THE OLD CHECK WOULD HAVE PASSED — the regression is load-bearing', () => {
    /*
     * This is the mutation proof written down rather than performed and forgotten. The pre-fix
     * assertion was "the panel's innerText is at least 20 characters". With the renderer a no-op,
     * `#panel-judge` still holds its authored lede — so that assertion passes. A regression test
     * that would also pass against the code it replaced proves nothing.
     */
    const doc = html();
    const start = doc.indexOf('id="panel-judge"');
    assert.ok(start > -1, 'index.html no longer authors #panel-judge');
    const end = doc.indexOf('</section>', start);
    const staticText = doc.slice(start, end)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    assert.ok(
      staticText.length >= 20,
      `#panel-judge holds only ${staticText.length} static characters — re-derive this test, the `
      + 'panel-level check it documents may no longer be satisfiable by prose alone',
    );
  });

  test('a healthy measurement produces no problems', () => {
    assert.deepEqual(comparePopulations(ctx, healthy()), []);
  });

  test('an unmeasured container is reported rather than skipped', () => {
    // Silence is the failure mode: a gate that never looked must not read as a gate that passed.
    const measured = healthy();
    delete measured['#fleet-rows > tr'];
    const problems = comparePopulations(ctx, measured);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /never measured/);
  });
});

describe('panelPopulation — the browser gate consumes the table', () => {
  test('WIRING: console-verify.mjs calls comparePopulations', () => {
    /*
     * A pure table can stay correct while the gate stops consulting it — the F04 lesson. This is
     * a SOURCE assertion, labelled as one, because the browser half cannot be executed here.
     */
    const src = readFileSync(join(HERE, 'console-verify.mjs'), 'utf8');
    assert.match(src, /comparePopulations\(/, 'console-verify.mjs no longer calls comparePopulations');
    assert.match(src, /PANEL_POPULATION/, 'console-verify.mjs no longer reads the population table');
  });
});
