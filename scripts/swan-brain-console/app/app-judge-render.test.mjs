/**
 * app-judge-render-contract — what Judge Mode puts on screen, and where the cursor ends up.
 * @module scripts/swan-brain-console/app/app-judge-render.test
 *
 * WHY THIS SUITE EXISTS (round 11, finding F11)
 * `renderJudge` focused `list.firstElementChild` unconditionally on every redraw, and
 * `wireJudgeKeys` resolves its target from `event.target.closest([data-pair-index])` — so FOCUS
 * IS THE CURSOR. Astra ran the real renderer and the real key handler against a DOM stub and
 * showed the consequence: judging pair two moved focus back to pair one, so the NEXT keypress
 * recorded a verdict against pair one. An operator judging ten pairs from the keyboard silently
 * overwrote pair one nine times, and the panel looked like it was working the whole time.
 *
 * That is why this suite drives the REAL `renderJudge` with a stub document rather than
 * asserting on a plan: the defect is in the DOM half, and a plan-level test cannot see focus.
 * The stub records `.focus()` calls, which is the only observable the contract has.
 *
 * Run: node --test scripts/swan-brain-console/app/app-judge-render.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const render = await import(pathToFileURL(join(HERE, 'app-judge-render.mjs')).href);
const mod = await import(pathToFileURL(join(HERE, 'judge-export.mjs')).href);

/** Twenty rows shaped like the fleet rows the console renders. */
const ROWS = Array.from({ length: 20 }, (_, i) => ({
  id: `v${String(i + 1).padStart(2, '0')}`,
  title: `Variant ${i + 1}`,
  nav_model: 'vertical-index',
  hero_mechanics: 'scroll-reveal',
  grid: 'twelve',
  tradeoff: 'a tradeoff long enough to pass the registry length check',
  wildcard: i === 17 ? 'alien-seed' : null,
}));
const { pairs } = mod.pairsFrom(ROWS);

/**
 * A DOM stub that records focus.
 *
 * `node()` in the module under test reads the AMBIENT `document`, so the stub is installed as
 * the global for the duration of this file (node:test gives each file its own process, so
 * nothing else is affected). The injected `doc` argument is used for `createElement` in
 * `exportBar`, so both paths point at the same stub.
 */
function stubDocument() {
  const make = (tag) => {
    const e = {
      tagName: tag, className: '', textContent: '', hidden: false, tabIndex: 0,
      children: [], attrs: {}, focusCount: 0,
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener() {},
      append(...kids) { this.children.push(...kids); },
      replaceChildren(...kids) { this.children = [...kids]; },
      focus() { this.focusCount += 1; },
      click() {},
    };
    Object.defineProperty(e, 'firstElementChild', { get() { return this.children[0] ?? null; } });
    return e;
  };
  const doc = { createElement: make, getElementById: () => null, head: make('head'), querySelector: () => null };
  return { doc, make };
}

/** Render into a fresh container and hand back the pieces a test needs to look at. */
function renderInto(activeIndex) {
  const { doc, make } = stubDocument();
  globalThis.document = doc;
  const container = make('div');
  render.renderJudge(container, ROWS, mod.emptyState(pairs), doc, activeIndex);
  const list = container.children.find((c) => c.className === 'judge-list');
  return { container, list };
}

describe('F11 — focus follows the judgement', () => {
  test('RED — judging pair 4 leaves the cursor on pair 4, not pair 1', () => {
    /*
     * The round-11 reproduction. Before the fix this assertion fails with index `0`: the render
     * always focused `list.firstElementChild`, so the next keypress went to pair one.
     */
    const { list } = renderInto(3);
    const focused = list.children.filter((c) => c.focusCount > 0);
    assert.equal(focused.length, 1, `${focused.length} pairs took focus; exactly one should`);
    assert.equal(
      focused[0].getAttribute(render.ACTIVE_ATTR), '3',
      'focus landed on the wrong pair — the next keypress would record a verdict there',
    );
  });

  test('RED — the LAST pair is reachable too, so this is not "focus the first" in disguise', () => {
    // A fix that clamped to a valid index would pass the test above and still be wrong here.
    const { list } = renderInto(9);
    const focused = list.children.filter((c) => c.focusCount > 0);
    assert.equal(focused.length, 1);
    assert.equal(focused[0].getAttribute(render.ACTIVE_ATTR), '9');
  });

  test('the initial draw focuses pair one — the default is a starting position, not a rule', () => {
    const { list } = renderInto(0);
    const focused = list.children.filter((c) => c.focusCount > 0);
    assert.equal(focused[0].getAttribute(render.ACTIVE_ATTR), '0');
  });

  test('an out-of-range index falls back to the first pair rather than focusing nothing', () => {
    // The panel must always have a keyboard cursor: no focus means the operator's next keypress
    // goes to the document, which is a worse failure than a reset.
    const { list } = renderInto(99);
    const focused = list.children.filter((c) => c.focusCount > 0);
    assert.equal(focused.length, 1);
    assert.equal(focused[0].getAttribute(render.ACTIVE_ATTR), '0');
  });
});

describe('the panel renders the pairs it claims to', () => {
  test('ten pair rows, each carrying the attribute the keyboard resolves against', () => {
    const { list } = renderInto(0);
    assert.equal(list.children.length, 10);
    assert.deepEqual(
      list.children.map((c) => c.getAttribute(render.ACTIVE_ATTR)),
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    );
  });

  test('each pair shows both variants, with the side spoken rather than only encoded', () => {
    // Round 10's finding: `judge-left` / `judge-right` were the only record of which variant was
    // "1" and which "2", and the visible legend says "1 left wins · 2 right wins".
    const { list } = renderInto(0);
    const sides = list.children[0].children.find((c) => c.className === 'judge-sides');
    assert.deepEqual(sides.children.map((c) => c.className), ['judge-variant judge-left', 'judge-variant judge-right']);
    assert.equal(sides.children[0].children[0].textContent, 'Left');
    assert.equal(sides.children[1].children[0].textContent, 'Right');
  });

  test('both export artifacts are offered, because a caller should not have to choose', () => {
    const { container } = renderInto(0);
    const bar = container.children.find((c) => c.className === 'judge-export');
    assert.ok(bar, 'no export bar was rendered');
    const buttons = bar.children.filter((c) => c.tagName === 'button');
    assert.deepEqual(buttons.map((b) => b.textContent), ['Download .json', 'Download .md']);
  });

  test('an odd fleet reports its unpaired row instead of dropping it', () => {
    const { doc, make } = stubDocument();
    globalThis.document = doc;
    const container = make('div');
    const odd = ROWS.slice(0, 19);
    render.renderJudge(container, odd, mod.emptyState(mod.pairsFrom(odd).pairs), doc, 0);
    const note = container.children.find((c) => c.className === 'judge-wild');
    assert.ok(note, 'the odd row out was silently dropped');
    assert.match(note.textContent, /v19/);
  });
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: the render module and this suite stay within 300 lines', () => {
  for (const f of ['app-judge-render.mjs', 'app-judge-render.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
