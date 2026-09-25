/**
 * app-fallback-drift — the static no-JS shell must carry every row the registry declares.
 * @module scripts/swan-brain-console/app/app-fallback-drift.test
 *
 * WHY THIS IS ITS OWN FILE
 * It lived at the foot of `app-shell.test.mjs` until round 9 (2026-09-20) pushed that module to
 * 344 lines against Rule 4. The split is by SUBJECT and follows the precedent already recorded
 * there: `app-shell-dom.test.mjs` was carved out the same way for the same reason. This file
 * guards one property — the static shell and the registry describe the same console.
 *
 * THE DEFECT IT NOW CATCHES, AND WHY IT DID NOT BEFORE
 * The guard was one-directional: it checked `static ⊆ registry` (no orphan markup) and never
 * `registry ⊆ static`. Meanwhile `index.html` carried 8 tab buttons while `tabs.json` declared
 * 10 — `gate-health` and `judge` were missing outright — so the no-JS path rendered a console
 * missing 20% of its surface, including the panel whose job is honest gate reporting. The test
 * was NAMED "the no-JS fallback in index.html cannot silently drift" and reported green.
 *
 * A guard named for a property must test the property, not half of it. Both directions and the
 * cardinality are asserted below; a strict-superset fallback is drift too and would also have
 * passed the old check.
 *
 * Run: node --test scripts/swan-brain-console/app/app-fallback-drift.test.mjs
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

const html = () => readFileSync(join(APP, 'index.html'), 'utf8');
const registryIds = () => shell.validateTabs(readJson('tabs.json')).rows.map((t) => t.id);

const fallbackTabs = () => {
  const nav = /<nav class="tabs"[^>]*>([\s\S]*?)<\/nav>/.exec(html());
  assert.ok(nav, 'the tab nav was not found in index.html');
  return new Set([...nav[1].matchAll(/id="tab-([a-z0-9-]+)"/g)].map((m) => m[1]));
};

const fallbackPanels = () =>
  new Set([...html().matchAll(/id="panel-([a-z0-9-]+)"/g)].map((m) => m[1]));

describe('the no-JS fallback in index.html cannot silently drift', () => {
  /* Direction 1 — an authored button with no registry row is orphan markup. */
  test('every fallback button has a registry row', () => {
    const fallback = fallbackTabs();
    assert.ok(fallback.size > 0, 'no fallback buttons found');
    const registered = new Set(registryIds());
    for (const id of fallback) {
      assert.ok(registered.has(id), `fallback tab "${id}" has no registry row — orphan markup`);
    }
  });

  /* Direction 2 — THE ONE THAT WAS BROKEN. A row the no-JS path cannot reach. */
  test('every registry row has a fallback tab button', () => {
    const ids = registryIds();
    assert.ok(ids.length > 0, 'the registry is empty — this check would be vacuous');
    const fallback = fallbackTabs();
    const missing = ids.filter((id) => !fallback.has(id));
    assert.deepEqual(
      missing,
      [],
      `registry rows with no fallback tab button: ${missing.join(', ')} — the no-JS path cannot reach them`,
    );
  });

  /* And the panel behind the button, or the tab is a dead end without JS. */
  test('every registry row has a fallback panel', () => {
    const ids = registryIds();
    const panels = fallbackPanels();
    const missing = ids.filter((id) => !panels.has(id));
    assert.deepEqual(
      missing,
      [],
      `registry rows with no fallback panel: ${missing.join(', ')} — the tab would open on nothing`,
    );
  });

  /* Cardinality — a strict superset is drift too, and the old check allowed it. */
  test('the fallback and the registry carry the same number of rows', () => {
    const ids = registryIds();
    assert.equal(fallbackTabs().size, ids.length, 'fallback tab count != registry row count');
    assert.equal(fallbackPanels().size, ids.length, 'fallback panel count != registry row count');
  });

  /*
   * The footer's method claim was the FOURTH copy of the allowed-methods fact and the only one
   * still false after rounds 5 and 7 fixed two other copies. It is now removed rather than
   * corrected, because static HTML cannot derive a server constant. This pins the removal so a
   * future edit cannot quietly reintroduce a claim the page cannot verify.
   *
   * COMMENTS ARE STRIPPED FIRST, and that is load-bearing. The first version of this test ran
   * the pattern against the raw file and failed on the round-9 comment that QUOTES the old
   * claim while explaining its removal — the exact trap round 7 hit with `/GET only/` matching
   * `server.mjs`'s legitimate quotation. A regression pattern must be matched against what the
   * operator can READ, not against the source that discusses it.
   */
  test('the footer does not restate the allowed-methods fact', () => {
    const rendered = html().replace(/<!--[\s\S]*?-->/g, '');
    const foot = /<footer[\s\S]*?<\/footer>/.exec(rendered);
    assert.ok(foot, 'no footer found in index.html');
    assert.doesNotMatch(
      foot[0],
      /GET only/,
      'the footer claims "GET only" again — the server also answers HEAD, and the footer cannot derive that',
    );
  });
});

/*
 * ── F18: the fallback must REPORT ITSELF, not merely carry matching ids ──────
 *
 * ROUND 12 (2026-09-20), Astra F18. Everything above establishes that the fallback markup and
 * the registry describe the same console — that the IDS MATCH. Astra graded the gap precisely:
 * matching `aria-controls` is not an interaction. Without JavaScript, nine of the ten panels
 * stayed hidden and their tab buttons did nothing, so the page presented controls that could
 * not work, including the one whose entire job is honest gate reporting.
 *
 * The fix is a declared script-failure state, and these tests are what stop the declaration
 * from becoming decoration. The load-bearing one is the SECOND: the set of panels actually
 * reachable without JavaScript is compared against the set the notice CLAIMS is available. A
 * panel that gains or loses `hidden` therefore fails here rather than quietly contradicting
 * the prose a reader is being asked to trust.
 */
describe('the no-JS fallback reports its own failure state (Astra F18)', () => {
  const noscript = () => {
    const m = /<noscript>([\s\S]*?)<\/noscript>/.exec(html());
    assert.ok(m, 'index.html has no <noscript> script-failure state');
    return m[1];
  };

  const declared = (attr) => {
    const m = new RegExp(`${attr}="([^"]*)"`).exec(noscript());
    assert.ok(m, `the script-failure state does not declare ${attr}`);
    return m[1].trim().split(/\s+/).filter(Boolean).sort();
  };

  /** The panels a browser with scripting OFF would actually be able to see. */
  const staticallyVisiblePanels = () => {
    const out = [];
    for (const m of html().matchAll(/<section\b[^>]*\bid="panel-([a-z0-9-]+)"[^>]*>/g)) {
      // `hidden` as a standalone attribute. `aria-hidden` must NOT count as hidden — a
      // substring test would have read every `aria-hidden="true"` panel as invisible.
      if (!/(^|\s)hidden(?=[\s>=])/.test(m[0])) out.push(m[1]);
    }
    return out.sort();
  };

  test('the inert tab controls are removed from the no-JS view, not left looking operable', () => {
    // Without this, the page still presents ten buttons that cannot reveal anything.
    assert.match(
      noscript(),
      /#tabs\s*,\s*\.kbd-hint\s*\{\s*display:\s*none\s*;?\s*\}/,
      'the script-failure state does not hide #tabs — the no-JS page still shows inert controls',
    );
  });

  test('THE LOAD-BEARING ONE: the notice claims exactly the panels that are reachable', () => {
    const reachable = staticallyVisiblePanels();
    assert.ok(reachable.length > 0, 'no panel is visible without JavaScript — the fallback shows nothing');
    assert.deepEqual(
      declared('data-available'),
      reachable,
      'the script-failure state claims a different set of available panels than the page actually '
      + 'reveals without JavaScript — one of the two changed and the notice was not updated',
    );
    assert.ok(
      declared('data-unavailable').length > 0,
      'the notice declares nothing unavailable — then there is no failure state to report',
    );
  });

  test('every registry row is accounted for as available or unavailable', () => {
    const ids = registryIds().sort();
    const both = [...declared('data-available'), ...declared('data-unavailable')].sort();
    assert.deepEqual(
      both, ids,
      'the script-failure state does not account for every tab — a reader cannot tell whether an '
      + 'unlisted tab is missing, broken, or merely forgotten',
    );
  });

  test('the available and unavailable lists do not overlap', () => {
    const overlap = declared('data-available').filter((id) => declared('data-unavailable').includes(id));
    assert.deepEqual(overlap, [], `these tabs are declared both available and unavailable: ${overlap.join(', ')}`);
  });

  test('the notice names Gates, the panel Astra called out by name', () => {
    // Astra's settle: "verify that Gates is readable or clearly reported unavailable". Gates is
    // the panel whose whole purpose is refusing to look green, so it is the one that must not
    // vanish silently.
    const label = shell.validateTabs(readJson('tabs.json')).rows.find((t) => t.id === 'gate-health')?.label;
    assert.equal(label, 'Gates', 'the gate-health row is no longer labelled "Gates" — update this test');
    assert.match(
      noscript(),
      /Gates/,
      'the script-failure state does not mention Gates — the one panel that must not disappear silently',
    );
  });
});
