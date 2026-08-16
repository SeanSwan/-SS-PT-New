/**
 * absence-claim-gate.test.mjs — proves the Stop-hook decision logic. Run: node --test.
 *
 * The load-bearing tests here are the NEGATIVE ones. This gate's whole risk is noise: agents write
 * "does not exist" constantly and legitimately, and a gate that fires on those gets switched off,
 * which is strictly worse than no gate. So the false-positive cases outnumber the blocking case.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './absence-claim-gate.mjs';

/** Minimal transcript: one user line, then an assistant turn with optional tool calls + final text. */
function transcript({ finalText = '', toolCommands = [] } = {}) {
  const lines = [JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'do the work' }] } })];
  const content = toolCommands.map((command) => ({ type: 'tool_use', name: 'Bash', input: { command } }));
  if (finalText) content.push({ type: 'text', text: finalText });
  lines.push(JSON.stringify({ type: 'assistant', message: { content } }));
  return lines.join('\n');
}

const CLAIM = 'GLM is not wired here — scripts/consult-glm.mjs does not exist in this repo.';

test('BLOCKS the exact 2026-08-15 failure: a repo asset called missing with no multi-ref check', () => {
  const r = decide({}, transcript({ finalText: CLAIM }));
  assert.ok(r, 'expected a block');
  assert.match(r, /not in this checkout/i);
  assert.match(r, /repo-wide-find/);
});

test('ALLOWS when the multi-ref check actually ran this turn', () => {
  const r = decide({}, transcript({
    finalText: CLAIM,
    toolCommands: ['node scripts/repo-wide-find.mjs consult-glm.mjs'],
  }));
  assert.equal(r, null, 'evidence in the turn must satisfy the gate');
});

test('ALLOWS when a raw multi-ref git check ran instead', () => {
  for (const cmd of ['git for-each-ref --format=%(refname)', 'git ls-tree -r --name-only origin/main', 'git branch -a']) {
    assert.equal(decide({}, transcript({ finalText: CLAIM, toolCommands: [cmd] })), null, cmd);
  }
});

test('ALLOWS with the honest escape hatch', () => {
  const r = decide({}, transcript({ finalText: `${CLAIM}\n\nABSENCE-CHECK: N/A — this is a third-party package, not a repo asset.` }));
  assert.equal(r, null);
});

test('no-loop guard: stop_hook_active always allows', () => {
  assert.equal(decide({ stop_hook_active: true }, transcript({ finalText: CLAIM })), null);
});

test('FAIL-OPEN on an unreadable transcript', () => {
  assert.equal(decide({}, 'not json at all\n{{{'), null);
});

// --- the noise cases: everything below must stay silent ------------------------------------------

test('ALLOWS absence claims that are not about repo assets', () => {
  const benign = [
    'The column deactivatedBy does not exist in the production table.',
    'That user is missing from the seed data.',
    'The API key is not present in the environment.',
    'There is no such route registered on the server.',
    'The record could not be found for that client id.',
  ];
  for (const text of benign) {
    assert.equal(decide({}, transcript({ finalText: text })), null, `false positive on: ${text}`);
  }
});

test('ALLOWS a turn that merely MENTIONS a file without claiming it is absent', () => {
  const r = decide({}, transcript({ finalText: 'I edited scripts/consult-glm.mjs and it now streams correctly.' }));
  assert.equal(r, null);
});

test('ALLOWS an absence noted mid-turn but not asserted in the closing message', () => {
  // The agent looked, did not find it, then resolved it. That is the process working.
  const raw = transcript({
    toolCommands: ['ls scripts/consult-glm.mjs'],
    finalText: 'Wired GLM into the review chain; both reviewers returned findings.',
  });
  assert.equal(decide({}, raw), null);
});

test('ALLOWS an empty or toolless turn', () => {
  assert.equal(decide({}, transcript({})), null);
});
