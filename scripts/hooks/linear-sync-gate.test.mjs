/**
 * Contract tests for the deterministic Linear board-sync Stop gate (SWA-23).
 *
 * WHY THIS FILE EXISTS: the gate shipped with NO tests. That is the same class
 * of gap it exists to prevent — an unprotected guard is a guard that can be
 * silently broken. Written 2026-08-04 alongside the marker tightening, and
 * mutation-proven (reverting the marker regex turns the first test red).
 *
 * Protects: substantiality thresholds, the three documented pass paths
 * (real board write / explicit sync claim / explicit N/A opt-out), the
 * emission-path carve-out, current-turn scoping, and fail-open behaviour.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeTurn, decide, parseTranscript } from './linear-sync-gate.mjs';

const line = (obj) => JSON.stringify(obj);
const userText = (text) => line({ type: 'user', message: { content: [{ type: 'text', text }] } });
const toolUse = (name, input) =>
  line({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
const assistantText = (text) =>
  line({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

const buildTurn = (closeout) =>
  [
    userText('do the work'),
    toolUse('Edit', { file_path: 'src/a.ts' }),
    toolUse('Edit', { file_path: 'src/b.ts' }),
    ...(closeout ? [assistantText(closeout)] : []),
  ].join('\n');

// ── The tightening (Sean 2026-08-04) ────────────────────────────────────────
// A bare "SWA-123" used to satisfy the gate. Closeouts cite issues for context
// constantly, so citing became indistinguishable from syncing and the gate
// effectively never fired. The marker must now be a deliberate claim.

test('a bare SWA mention does NOT satisfy the gate (citing is not syncing)', () => {
  const reason = decide({}, buildTurn('Shipped it. Related context lives in SWA-111.')) ?? '';
  assert.match(reason, /Linear board sync/);
});

test('an explicit LINEAR: SWA-<n> claim passes', () => {
  assert.equal(decide({}, buildTurn('Done.\n\nLINEAR: SWA-144 (updated)')), null);
});

// HOSTILE ROUND (same day): the first tightening still allowed arbitrary text
// between the label and the id, so prose + an incidental citation reassembled
// the accidental pass. These lock the label→id adjacency.
test('LINEAR: followed by prose plus an incidental citation does NOT pass', () => {
  for (const closeout of [
    'LINEAR: none — but SWA-9 exists',
    'blah LINEAR: pending, see SWA-5 later',
    'LINEAR: will file tomorrow, tracked under SWA-77',
  ]) {
    assert.match(decide({}, buildTurn(closeout)) ?? '', /Linear board sync/, closeout);
  }
});

test('markdown emphasis and a following note around the claim still pass', () => {
  for (const closeout of [
    '**LINEAR:** SWA-144',
    'LINEAR: SWA-144 (created + commented this turn)',
    'linear: swa-144',
  ]) {
    assert.equal(decide({}, buildTurn(closeout)), null, closeout);
  }
});

test('the N/A opt-out with a reason still passes', () => {
  assert.equal(
    decide({}, buildTurn('LINEAR: N/A — typo fix, maps to no issue')),
    null,
  );
});

test('an ACTUAL board write passes with no marker at all (preferred path)', () => {
  const raw = [
    userText('do the work'),
    toolUse('Edit', { file_path: 'src/a.ts' }),
    toolUse('Edit', { file_path: 'src/b.ts' }),
    toolUse('mcp__linear-server__save_issue', { id: 'SWA-144' }),
  ].join('\n');
  assert.equal(decide({}, raw), null);
});

test('a Linear READ does not waive the gate', () => {
  const raw = [
    userText('do the work'),
    toolUse('Edit', { file_path: 'src/a.ts' }),
    toolUse('Edit', { file_path: 'src/b.ts' }),
    toolUse('mcp__linear-server__get_issue', { id: 'SWA-144' }),
  ].join('\n');
  assert.match(decide({}, raw) ?? '', /Linear board sync/);
});

// ── Substantiality + carve-outs ─────────────────────────────────────────────

test('a git commit alone is substantial enough to require a sync', () => {
  const raw = [userText('ship'), toolUse('Bash', { command: 'git commit -m "x"' })].join('\n');
  assert.match(decide({}, raw) ?? '', /Linear board sync/);
});

test('one file write is below the threshold — stays silent', () => {
  const raw = [userText('tweak'), toolUse('Edit', { file_path: 'src/a.ts' })].join('\n');
  assert.equal(decide({}, raw), null);
});

test('Hermes memo / memory writes do not count toward substantiality', () => {
  const raw = [
    userText('note it'),
    toolUse('Write', { file_path: '.ai-workflow/hermes-inbox/pending/x.md' }),
    toolUse('Write', { file_path: 'memory/y.md' }),
  ].join('\n');
  assert.equal(decide({}, raw), null);
});

test('stop_hook_active short-circuits (no self-retrigger loop)', () => {
  assert.equal(decide({ stop_hook_active: true }, buildTurn('no marker here')), null);
});

test('only the CURRENT turn counts — a prior turn marker does not carry over', () => {
  const raw = [
    userText('first'),
    assistantText('LINEAR: SWA-1 (updated)'),
    userText('second'),
    toolUse('Edit', { file_path: 'src/a.ts' }),
    toolUse('Edit', { file_path: 'src/b.ts' }),
  ].join('\n');
  assert.match(decide({}, raw) ?? '', /Linear board sync/);
});

test('malformed transcript lines are tolerated (fail-open per line)', () => {
  const raw = ['not-json{{{', userText('hi'), 'also-bad', assistantText('hello')].join('\n');
  assert.equal(decide({}, raw), null);
});

test('analyzeTurn reports the signals the decision rests on', () => {
  const s = analyzeTurn(parseTranscript(buildTurn('LINEAR: SWA-144')));
  assert.equal(s.fileWrites, 2);
  assert.equal(s.markerSeen, true);
  assert.equal(s.linearWrite, false);
});
