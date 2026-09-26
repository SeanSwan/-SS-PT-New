/**
 * a5-boards.test.mjs — slice A5's BOARD half: the capability board, the `/state` pane, the
 * pane route table and the stylesheet list.
 *
 * `T-U-07`  every row of the board carries a code source, and the board DEGRADES rather than
 *           asserting a status it cannot support
 * `T-U-08`  a capability declared `claimed` renders as NOT verified (asserted in
 *           `a5-capabilities.test.mjs`; the PANE half is asserted here)
 * `T-I-07`  the State pane renders ZERO controls, by construction
 *
 * THE LAW HALF IS IN `a5-law.test.mjs`, AND THE `AC5.4` HALF IN `a5-authority.test.mjs` — both
 * split out for Rule 4. The law split happened when the hostile-review helper further down
 * took this file to 328 lines; it is by SUBJECT rather than by line number, so `T-U-07`'s law
 * rows moved out with the law board they are about.
 *
 * THE ONE THING THIS FILE IS CAREFUL ABOUT. `T-U-07`'s requirement is not "the board has
 * citations" — it is "every row shows a reason traceable to a file, and the board VERIFIES
 * that rather than asserting it". So no test here reads an expectation out of the module
 * under test: the pane is handed a board, and the test requires that same board back out.
 * A test the module under test could satisfy by itself is a tautology — mutation `M2` in A4b,
 * and again in A5 (`D44`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { renderState } from '../surface/paneState.mjs';
import { renderThink } from '../surface/panes.mjs';
import { routesThatCouldEnable } from '../core/authority.mjs';
import { capabilities, summarizeBoard, readSpecMode } from '../core/capabilities.mjs';
import { auditEnable } from '../core/authority.mjs';
import { PANE_PATHS, PANE_ROUTES } from '../surface/paneRoutes.mjs';
import { READ_ONLY_PANES } from '../surface/controls.mjs';
import { STYLESHEETS, stylesheetsOnDisk } from '../surface/shell.mjs';
import { REPO_ROOT } from '../core/paths.mjs';

/** Every `data-control` id in a rendered body. The State pane must produce an empty list. */
const controlsIn = (html) => [...html.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);
const reasonFor = (pane) => READ_ONLY_PANES.find((p) => p.pane === pane).reason;
/**
 * Render the State pane the way `paneRoutes.mjs` does: ONE board read, two consumers.
 * The pane takes the audit as data, so this is the only correct way to call it.
 */
const statePane = (over = {}) => {
  const board = capabilities();
  return renderState({ summary: summarizeBoard(board), audit: auditEnable(board), specMode: readSpecMode(), ...over });
};

// ---------------------------------------------------------------------------
// T-I-07 — the State pane renders ZERO controls, by construction
// ---------------------------------------------------------------------------

test('T-I-07 the State pane emits NO control attribute, and states why it is read-only', () => {
  const html = statePane({ taste: 'http://127.0.0.1:7331' });
  assert.deepEqual(controlsIn(html), [], 'the State pane must emit no control');
  assert.ok(html.includes(reasonFor('state')), 'the pane must render the registry reason verbatim');
  assert.match(html, /scripts\/design-brain\/src\/[a-z-]+\.mjs:\d+/);
});

test('T-U-07 a missing State board is a NAMED failure, never an empty table', () => {
  // The Law half of this contract lives in `a5-law.test.mjs` — each pane is tested beside the
  // board it renders. What matters here is the SHAPE: an unresolved board is an error the
  // operator can act on, not a blank table that reads as "nothing is switched on".
  const st = renderState({});
  assert.match(st, /E_STATE_BOARD_UNRESOLVED/);
  assert.doesNotMatch(st, /<tbody>\s*<\/tbody>/);
});

// ---------------------------------------------------------------------------
// T-U-07 / T-U-08 — the State board's own rows
// ---------------------------------------------------------------------------

test('T-U-07 the State pane renders every lane with its citation and its gate', () => {
  const summary = summarizeBoard(capabilities());
  const html = statePane({ summary, taste: 'http://127.0.0.1:7331' });
  for (const row of summary.board) {
    assert.ok(html.includes(row.lane), `${row.lane} is missing from the board`);
    assert.ok(html.includes(row.source), `${row.lane} rendered without its file:line citation`);
    if (row.status === 'REFUSED') {
      assert.ok(html.includes(row.gatedBy), `${row.lane} is REFUSED with no named gate on the pane`);
    }
  }
  // Both ends of the board must be on screen. A page showing only ACTIVE lanes reads as
  // "everything works", which is the misreading the board exists to prevent.
  for (const status of ['ACTIVE', 'REFUSED', 'RETIRED']) assert.ok(html.includes(status), `${status} missing`);
});

test('T-U-07 the spec-mode row reports the CONFIG, and an unreadable gate reads as closed', () => {
  const real = readSpecMode();
  assert.equal(real.enabled, false, 'spec mode is gated off in the shipped config');
  assert.equal(real.unreadable, false);
  assert.match(real.path, /^scripts\/design-brain\/config\/spec-mode\.json$/);
  const html = statePane({ specMode: real, taste: null });
  assert.match(html, /enabled: <b>false<\/b>/);
  assert.ok(html.includes('no control to change it'));
  // THE FAIL-OPEN BRANCH, SHOWN FIRING. A gate whose reader cannot be demonstrated to close
  // is indistinguishable from one that always reports open.
  const broken = readSpecMode(`${REPO_ROOT}/scripts/design-brain/config/nope.json`);
  assert.equal(broken.enabled, false, 'an unreadable gate must report CLOSED, never open');
  assert.equal(broken.unreadable, true);
  assert.match(broken.reason, /E_SPEC_MODE_UNREADABLE/);
});

test('T-U-08 the two boards keep their vocabularies apart, and `claimed` keeps its consequence', () => {
  // `claimed`/`verified` are the THINK pane's capability vocabulary. The State board carries
  // lane STATUSES, which are a different claim — borrowing the words would let a reader take
  // `ACTIVE` for `verified`. So the split is asserted rather than assumed.
  const state = statePane({ taste: null });
  assert.doesNotMatch(state, /cap-verified|cap-claimed|cap-false/,
    'the State board must not borrow the Think pane\'s capability classes');
  assert.doesNotMatch(state, /\bclaimed\b/, 'the State board reports statuses, not capabilities');
  // And the pane that DOES carry a capability claim still renders `claimed` with its
  // consequence, so the word cannot appear anywhere without one.
  const think = renderThink({
    view: {
      brainVersion: 'x', slots: [], lawChecks: [], promptText: '', provider: 'gemini',
      capabilities: { honorsNegativePrompt: 'claimed', seedIsDeterministic: 'verified' },
    },
    compileId: 'cmp-claimed',
  });
  assert.match(think, /claimed[\s\S]*treated false/, '`claimed` must carry its consequence');
  assert.match(think, /cap-verified/);
});

// ---------------------------------------------------------------------------
// The panes are PURE — and the hostile review is why these two exist
// ---------------------------------------------------------------------------

test('HOSTILE (A5) the State pane renders the board it was GIVEN, not one it re-read', () => {
  // A5's hostile review found that `enableAuditSection()` called `auditEnable()` with no
  // argument, which defaults to `capabilities()` — so the pane read the board a SECOND time,
  // behind the caller's back. Two reads per render, and two boards that could disagree
  // inside one pane. Proved by handing it a two-lane summary and watching the audit still
  // report the real board's sixty attempts.
  const fake = {
    board: [
      { lane: 'alpha', status: 'ACTIVE', source: 'x:1', sourceMissing: false, writes: 'none' },
      { lane: 'beta', status: 'REFUSED', source: 'x:2', sourceMissing: false, gatedBy: 'g', writes: 'none' },
    ],
    byStatus: { ACTIVE: 1, REFUSED: 1 },
    inconclusive: [],
  };
  // A synthetic audit whose count cannot be confused with the real board's.
  const fakeAudit = { attempted: 2, expected: 2, enabled: [], refused: 2, attempts: [], byCode: {} };
  const html = renderState({ summary: fake, audit: fakeAudit, specMode: { enabled: false, path: 'p' }, taste: null });
  assert.match(html, /<b>0<\/b> of <b>2<\/b> attempts enabled/,
    'the pane must print the audit it was handed, not re-derive the board');
  assert.doesNotMatch(html, /<b>60<\/b>/, 'the pane read the real board behind the caller');
  assert.ok(html.includes('alpha') && html.includes('beta'));
  // And the pane refuses to render without an audit rather than defaulting to a re-read.
  assert.match(renderState({ summary: fake, specMode: { enabled: false, path: 'p' } }),
    /E_STATE_BOARD_UNRESOLVED/);
});

/**
 * Strip comments, so a scan measures the CODE and not the prose that documents it.
 *
 * THIS HELPER EXISTS BECAUSE THIS TEST FAILED ON ITSELF. The first version scanned the raw
 * file for `pathname === '...'`, and the docstring that EXPLAINED the fix — *"they used to be
 * `pathname === '/' ? 'Compose' : 'Choose'`"* — contained the very literals it was hunting
 * for. The test was measuring its own explanation, and it reported a defect that had already
 * been fixed. That is the same class as `D40a`/`D44`: **the check did not measure the thing
 * it named.** A scan of a file that documents what it forbids has to exclude the commentary.
 *
 * WHAT IT DOES NOT STRIP, DELIBERATELY: a trailing `//` comment. A `//` inside a string
 * (`file:///C:/…`) is indistinguishable from a line comment without a real lexer, and
 * guessing wrong in the permissive direction would let a real comparison hide. So this
 * errs toward KEEPING text: a literal in a trailing comment trips the assertion below. That
 * is a false positive, and a false positive in a guard is the correct bias — someone looks.
 */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')     // block comments — the whole file header is one
  .replace(/^[ \t]*\/\/[^\n]*$/gm, ''); // full-line `//` comments

test('HOSTILE (A5) PANE_PATHS covers every pane route in paneRoutes.mjs, in BOTH directions', () => {
  // `AC5.4`'s transport half scans routes for an enable action. It read `MUTATION_ROUTES`
  // only, and pane routes were an `if` chain with NO list — so `GET /state/enable-spec`
  // would have been invisible to every guard in the tree. The route table is what fixes it,
  // and this test is what keeps the table honest.
  //
  // The stripper is checked FIRST, because a stripper that ate too much would make the
  // assertion below pass vacuously — the same trap this test just fell into from the other
  // side. `'/real'` must survive; the block and full-line comments must not.
  const synthetic = codeOnly([
    "const a = 1; // pathname === '/trailing'",
    "// pathname === '/line'",
    "/* pathname === '/block' */",
    "const u = 'file:///C:/z';",
    "const k = pathname === '/real';",
  ].join('\n'));
  assert.ok(!synthetic.includes('/line') && !synthetic.includes('/block'),
    'the stripper must remove block and full-line comments');
  assert.ok(synthetic.includes("pathname === '/real'") && synthetic.includes('file:///C:/z'),
    'the stripper must not eat real code or a string containing `//`');

  const src = codeOnly(readFileSync(`${REPO_ROOT}/scripts/astra/surface/paneRoutes.mjs`, 'utf8'));
  const literals = [...src.matchAll(/pathname (?:===|\.startsWith\()\s*'([^']+)'/g)].map((m) => m[1]);
  // The table itself is the source of truth now, so the literals should be gone entirely.
  assert.deepEqual(literals, [], 'a bare pathname comparison means a route the guards cannot enumerate');
  const declared = PANE_ROUTES.map((r) => r.path);
  assert.deepEqual([...PANE_PATHS].sort(), [...declared].sort(), 'PANE_PATHS must index the table');
  // The routes the tree actually serves must all be in the table.
  for (const p of ['/', '/choose', '/think', '/law', '/state', '/tune', '/ledger']) {
    assert.ok(PANE_PATHS.includes(p), `${p} is served but not in PANE_ROUTES — a guard cannot see it`);
  }
  // And the table is non-trivial, so an empty table cannot pass this.
  assert.ok(PANE_PATHS.length >= 7, `only ${PANE_PATHS.length} pane paths — the table is not complete`);
  // The pattern really would catch a pane route that enabled something.
  assert.ok(routesThatCouldEnable(['/state/enable-spec']).length === 1);
});

// ---------------------------------------------------------------------------
// The stylesheets — the list is verified, not trusted
// ---------------------------------------------------------------------------

test('the shell links EVERY stylesheet on disk, in an order that preserves the cascade', () => {
  assert.deepEqual([...STYLESHEETS].sort(), stylesheetsOnDisk(),
    'a stylesheet on disk that the shell does not link is CSS that silently does nothing');
  // `.panel--notice` and `.panel` have equal specificity, so the base sheet must load first
  // or the notice loses its background to the plain panel rule.
  assert.equal(STYLESHEETS[0], '/static/astra.css', 'the base sheet must load first');
  for (const href of STYLESHEETS) assert.match(href, /^\/static\/[a-z-]+\.css$/);
});
