/**
 * app-shell-dom-contract — what `applyShell` actually puts in the document.
 * @module scripts/swan-brain-console/app/app-shell-dom.test
 *
 * WHY THIS IS A SEPARATE FILE
 * Split from `app-shell.test.mjs` to satisfy Rule 4, and the split follows the seam the
 * module already has: that file tests the PURE PLANNERS (data in, data out), this one
 * tests the DOM APPLIER. Both were over 300 lines together.
 *
 * WHY IT NEEDS A STUB AT ALL
 * D2's criterion is "a new panel needs no shell edit". Asserting that on the PLAN object
 * is not enough, and that is not a hypothetical: the first version of `applyShell` built
 * the tabs but never created the missing panel, so a new registry row produced a tab
 * whose `aria-controls` pointed at nothing. The plan was correct and the DOM was empty —
 * D2 true on paper, false in the browser. This suite exists to make that difference
 * visible, which requires looking at elements rather than at plans.
 *
 * Run: node --test scripts/swan-brain-console/app/app-shell-dom.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const shell = await import(pathToFileURL(join(HERE, 'app-shell.js')).href);

/**
 * A minimal DOM stub: enough for `applyShell`, and no more.
 *
 * Assigning `id` must make the element findable, exactly as the real DOM does. Without
 * that, the stub hides every element the shell CREATES — which is the half of
 * `applyShell` this suite exists to check. A stub that cannot see created elements would
 * have passed while the panel-creation defect was live.
 */
function fakeDoc(ids) {
  const byId = new Map();
  const make = (tag) => {
    const e = {
      tagName: tag, className: '', textContent: '', hidden: false, tabIndex: 0,
      children: [], attrs: {}, _id: '',
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener() {},
      append(...kids) { this.children.push(...kids); },
      replaceChildren(...kids) { this.children = [...kids]; },
      focus() {},
    };
    Object.defineProperty(e, 'id', {
      get() { return e._id; },
      set(v) { e._id = v; byId.set(v, e); },
    });
    return e;
  };
  const doc = { createElement: make, getElementById: (id) => byId.get(id) ?? null };
  for (const id of ids) { const e = make('div'); e.id = id; byId.set(id, e); }
  /*
   * THE AUTHORED PANELS ARE CHILDREN OF `#main` — in `index.html`, and therefore here.
   *
   * Round 11 (finding F09): `applyShell` enumerates authored panels from `#main.children` rather
   * than from the registry, because a registry-derived list made orphan detection structurally
   * impossible. A FLAT stub would then report no authored panels at all, so every registered row
   * would look like it needed creating. That is the stub being unfaithful to the document, not
   * the applier being wrong: in the real page `<section class="panel" id="panel-doctrine">` sits
   * inside `<main id="main">`. A stub that models the document differently from the document is
   * how a green suite certifies a broken invariant — the same lesson this file's header records
   * about created elements.
   */
  const main = byId.get('main');
  if (main) {
    for (const id of ids) if (id.startsWith('panel-')) main.children.push(byId.get(id));
  }
  return { doc, byId };
}

describe('D2 — a registry row with no authored panel gets a real panel created', () => {
  const tabs = [
    { id: 'doctrine', label: 'Doctrine', module: null, api: null },
    { id: 'judge', label: 'Judge', module: null, api: null },
  ];

  test('the missing panel is created, and the new tab controls something that exists', () => {
    const { doc, byId } = fakeDoc(['tabs', 'main', 'panel-doctrine']);
    const out = shell.applyShell(doc, tabs);
    assert.equal(out.applied, true);
    assert.equal(out.count, 2);
    assert.deepEqual(out.createdPanels, ['panel-judge']);
    assert.ok(byId.has('panel-judge'), 'the panel was planned but never created');
    assert.equal(byId.get('panel-judge').getAttribute('aria-labelledby'), 'tab-judge');
  });

  test('EVERY tab controls an element that actually exists', () => {
    const { doc, byId } = fakeDoc(['tabs', 'main', 'panel-doctrine']);
    shell.applyShell(doc, tabs);
    for (const t of tabs) {
      const controls = byId.get(`tab-${t.id}`).getAttribute('aria-controls');
      assert.ok(byId.has(controls), `tab-${t.id} controls "${controls}", which does not exist`);
    }
  });

  test('an authored panel is used as-is, never duplicated', () => {
    const { doc } = fakeDoc(['tabs', 'main', 'panel-doctrine']);
    const out = shell.applyShell(doc, tabs);
    assert.ok(!out.createdPanels.includes('panel-doctrine'));
    assert.deepEqual(out.createdPanels, ['panel-judge']);
  });

  test('exactly one panel is visible after the shell applies', () => {
    const { doc, byId } = fakeDoc(['tabs', 'main', 'panel-doctrine']);
    shell.applyShell(doc, tabs);
    const visible = ['panel-doctrine', 'panel-judge'].filter((id) => !byId.get(id).hidden);
    assert.deepEqual(visible, ['panel-doctrine'], 'the first tab must be the visible one');
  });

  test('the strip is rebuilt from the registry, replacing the static fallback', () => {
    const { doc, byId } = fakeDoc(['tabs', 'main', 'panel-doctrine']);
    shell.applyShell(doc, tabs);
    const nav = byId.get('tabs');
    assert.equal(nav.children.length, 2);
    assert.deepEqual(nav.children.map((b) => b.id), ['tab-doctrine', 'tab-judge']);
    assert.deepEqual(nav.children.map((b) => b.textContent), ['Doctrine', 'Judge']);
  });

  test('a document with no #tabs element reports why instead of throwing', () => {
    const { doc } = fakeDoc(['main']);
    const out = shell.applyShell(doc, tabs);
    assert.equal(out.applied, false);
    assert.match(out.reason, /no #tabs element/);
  });

  test('a document with no #main cannot create panels, and says so by omission', () => {
    const { doc } = fakeDoc(['tabs', 'panel-doctrine']);
    const out = shell.applyShell(doc, tabs);
    assert.equal(out.applied, true);
    assert.deepEqual(out.createdPanels, [], 'no container means no panel could be appended');
  });

  test('the tab labels come from the registry, never from the id', () => {
    const { doc, byId } = fakeDoc(['tabs', 'main']);
    shell.applyShell(doc, [{ id: 'judge', label: 'Judge Mode', module: null, api: null }]);
    assert.equal(byId.get('tab-judge').textContent, 'Judge Mode');
  });
});

/*
 * ── F09 — an authored panel the registry does not name ────────────────────────
 *
 * Round 11. `applyShell` built its "authored panels" list FROM the registry —
 * `tabs.map((t) => 'panel-' + t.id).filter(exists)` — so every entry was by construction a panel
 * the registry already knew about, and `planPanels`'s orphan report could only ever be `[]`. The
 * guard read as live and was dead, which is worse than absent: the pure-planner test exercised
 * `planPanels` with a broader input than the mounted caller ever supplied, so the suite stayed
 * green while the applier could not report anything.
 *
 * Astra demonstrated it against the real applier: Doctrine visible, a registry containing only
 * Fleet, `orphans: []`, both panels still on screen.
 */
describe('F09 — an authored panel with no registry row is reported AND hidden', () => {
  const onlyFleet = [{ id: 'fleet', label: 'Fleet', module: null, api: null }];

  test('RED — the orphan is named, not silently tolerated', () => {
    const { doc } = fakeDoc(['tabs', 'main', 'panel-doctrine', 'panel-fleet']);
    const out = shell.applyShell(doc, onlyFleet);
    assert.deepEqual(out.orphans, ['panel-doctrine'], 'the applier reported no orphan for an unregistered authored panel');
  });

  test('RED — the orphan is hidden, not merely listed', () => {
    // Reporting alone names a panel that is still on screen beside the selected one, and
    // `selectTab` cannot reach it: that function walks the registry.
    const { doc, byId } = fakeDoc(['tabs', 'main', 'panel-doctrine', 'panel-fleet']);
    shell.applyShell(doc, onlyFleet);
    assert.equal(byId.get('panel-doctrine').hidden, true, 'a panel with no registry row stayed visible');
  });

  test('a registry that names every authored panel reports no orphan', () => {
    // The other direction: the guard must not fire on a healthy document, or the console would
    // report a defect on every single load and the report would be ignored.
    const { doc } = fakeDoc(['tabs', 'main', 'panel-doctrine', 'panel-fleet']);
    const out = shell.applyShell(doc, [
      { id: 'doctrine', label: 'Doctrine', module: null, api: null },
      ...onlyFleet,
    ]);
    assert.deepEqual(out.orphans, []);
  });
});
