/**
 * a5-law.test.mjs — slice A5's LAW half: the guardrail board and the `/law` pane.
 *
 * SPLIT OUT OF `a5-boards.test.mjs` FOR RULE 4, ON A REAL SEAM. The parent file reached 328
 * lines when A5's hostile review added the comment-stripping helper that test 16 needed, and
 * the split is by SUBJECT rather than by line number: everything here has
 * `shared/swanLawFilter.mjs` and the laws it runs as its subject. `a5-boards.test.mjs` keeps
 * the capability board, the `/state` pane, the pane route table and the stylesheet list.
 *
 * `T-U-07`  every row shows a reason traceable to a file — and the board VERIFIES that
 *           rather than asserting it
 * `T-I-07`  the Law pane renders ZERO controls, by construction
 *
 * THE ONE THING THIS FILE IS CAREFUL ABOUT. `T-U-07`'s requirement is not "the board has
 * citations" — it is "every row shows a reason traceable to a file, and the board VERIFIES
 * that rather than asserting it". So no test here reads an expectation out of the module
 * under test. `lawBoard()` says a row is ENFORCED; the test then opens the cited file at the
 * cited LINE and requires the marker to be there. If the board could satisfy its own test,
 * the test would be a tautology — which is exactly the mutation `M2` in A4b found in the
 * editor suite, and the reason this file checks the line rather than the string.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { lawBoard, cite, LAW_ROWS, LAW_RUNNER, LAW_PATTERNS, KILL_LIST_MARKER } from '../core/lawBoard.mjs';
import { renderLaw } from '../surface/paneLaw.mjs';
import { READ_ONLY_PANES } from '../surface/controls.mjs';
import { LAW_NAMES, KILL_LIST_TEXT } from '../../../shared/swanLawPatterns.mjs';
import { REPO_ROOT } from '../core/paths.mjs';

const board = lawBoard();
/** Every `data-control` id in a rendered body. The Law pane must produce an empty list. */
const controlsIn = (html) => [...html.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);
const reasonFor = (pane) => READ_ONLY_PANES.find((p) => p.pane === pane).reason;

// ---------------------------------------------------------------------------
// T-U-07 (Law half) — the board, and the citation that has to resolve
// ---------------------------------------------------------------------------

test('T-U-07 the law board covers exactly LAW_NAMES, in LAW_NAMES order', () => {
  assert.deepEqual(board.covered, LAW_NAMES);
  assert.deepEqual(board.board.map((r) => r.law), LAW_NAMES,
    'the board must cover the same set the filter runs, in the same order');
  // A count is a claim about completeness, so it is derived and then checked against the
  // one definition — never typed into the table.
  assert.equal(board.board.length, LAW_NAMES.length);
});

test('T-U-07 EVERY law row resolves to a live file:line that really contains its marker', () => {
  assert.deepEqual(board.inconclusive, [], 'no law may be reported without a code source');
  for (const row of board.board) {
    assert.equal(row.status, 'ENFORCED', `${row.law} is not ENFORCED`);
    assert.equal(row.sourceMissing, false, `${row.law} has no source`);
    assert.match(row.source, /^shared\/swanLawFilter\.mjs:\d+$/,
      `${row.law} citation is not repo-relative and forward-slashed — got ${row.source}`);
    // THE POINT OF THE WHOLE FILE: open the file, at the cited line, and look.
    const line = readFileSync(`${REPO_ROOT}/${row.source.split(':')[0]}`, 'utf8')
      .split('\n')[row.sourceLine - 1];
    assert.ok(line.includes(row.marker),
      `${row.law}: ${row.source} does not contain its marker ${JSON.stringify(row.marker)}`);
  }
});

test('T-U-07 the marker is the ENFORCEMENT SITE, not the law name', () => {
  // A marker of `'LAW3-kill-list'` would resolve against the line that PUSHES a violation,
  // so deleting the loop that finds violations would leave the row green citing the line
  // that reports the failure it can no longer detect. Assert the markers are expressions.
  for (const row of LAW_ROWS) {
    assert.doesNotMatch(row.marker, /^LAW\d+/, `${row.law}'s marker is its own name`);
    assert.ok(/[.(]/.test(row.marker), `${row.law}'s marker is not an expression: ${row.marker}`);
    assert.ok(row.protects && row.protects.length > 20, `${row.law} needs a real reason`);
    assert.ok(row.onFailure && row.onFailure.length > 20, `${row.law} must state its consequence`);
  }
  // And the one marker that was chosen for a specific reason is documented as such.
  assert.match(LAW_ROWS.find((r) => r.law === 'LAW3-kill-list').note, /overrides LAST|A4b/);
});

test('T-U-07 the board DEGRADES rather than asserting an unsupported status', () => {
  // The mechanism, shown firing. Without this the "every row has a source" claim would be
  // unfalsifiable — a board that can only be observed healthy is a board nobody knows works.
  const bogus = lawBoard({
    rows: [{ law: 'LAW2-gold-allowlist', protects: 'x', onFailure: 'y', marker: 'NOT_A_REAL_MARKER_98765' }],
  });
  assert.equal(bogus.board[0].status, 'INCONCLUSIVE');
  assert.equal(bogus.board[0].sourceMissing, true);
  assert.match(bogus.board[0].reason, /not found/);
  assert.deepEqual(bogus.inconclusive, ['LAW2-gold-allowlist']);
});

test('T-U-07 an unreadable law file degrades too, and does not throw', () => {
  const c = cite(`${REPO_ROOT}/shared/does-not-exist.mjs`, 'anything');
  assert.equal(c.missing, true);
  assert.equal(c.sourceLine, null);
  assert.match(c.why, /E_LAW_UNREADABLE/);
});

test('T-U-07 the kill-list is cited, counted, and its count is the list\'s own length', () => {
  assert.equal(board.killList.count, KILL_LIST_TEXT.length);
  assert.equal(board.killList.sourceMissing, false);
  assert.equal(board.killList.source, `shared/swanLawPatterns.mjs:82`);
  const line = readFileSync(LAW_PATTERNS, 'utf8').split('\n')[board.killList.sourceLine - 1];
  assert.ok(line.includes(KILL_LIST_MARKER), 'the kill-list citation does not contain its marker');
  assert.ok(board.killList.entries.length >= 6, 'a kill-list of one entry is not a kill-list');
  // And a kill-list that could not be cited degrades rather than rendering as empty.
  const bogus = lawBoard({ rows: [], patterns: `${REPO_ROOT}/shared/nope.mjs` });
  assert.equal(bogus.killList.sourceMissing, true);
  assert.equal(bogus.killList.count, KILL_LIST_TEXT.length, 'the entries are still listed');
});

test('T-U-07 the law runner and the patterns file are the files the board cites', () => {
  assert.ok(LAW_RUNNER.endsWith('shared\\swanLawFilter.mjs') || LAW_RUNNER.endsWith('shared/swanLawFilter.mjs'));
  assert.ok(readFileSync(LAW_RUNNER, 'utf8').includes('applyLaws'),
    'the cited runner must be the file that actually runs the laws');
});

// ---------------------------------------------------------------------------
// T-I-07 (Law half) — the pane renders ZERO controls, by construction
// ---------------------------------------------------------------------------

test('T-I-07 the Law pane emits NO control attribute, and states why it is read-only', () => {
  const html = renderLaw({ board });
  assert.deepEqual(controlsIn(html), [], 'the Law pane must emit no control');
  assert.ok(html.includes(reasonFor('law')), 'the pane must render the registry reason verbatim');
  // And it must carry the citation, not a summary of it.
  assert.match(html, /shared\/swanLawFilter\.mjs:\d+/);
  assert.ok(html.includes('KILL-LIST'));
});

test('T-U-07 an UNSOURCED row renders as INCONCLUSIVE, never as enforced', () => {
  const bogus = lawBoard({
    rows: [{ law: 'LAW2-gold-allowlist', protects: 'gold', onFailure: 'blocked', marker: 'NOPE_123' }],
  });
  const html = renderLaw({ board: bogus });
  assert.match(html, /INCONCLUSIVE/);
  assert.doesNotMatch(html, /ENFORCED/, 'a row with no source must not be rendered as enforced');
  assert.match(html, /law--inconclusive/, 'the row must be styled differently from a sourced one');
  assert.ok(!html.includes('✓'), 'a tick beside an unsourced row asserts what the board just declined to');
});

test('T-U-07 a missing Law board is a NAMED failure, never an empty table', () => {
  const html = renderLaw({});
  assert.match(html, /E_LAW_BOARD_UNRESOLVED/);
  assert.doesNotMatch(html, /<tbody>\s*<\/tbody>/);
});
