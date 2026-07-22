/**
 * dry-loop-gate.test.mjs — proves the Stop-hook decision logic, incl. the Rule 73
 * (Proof-Before-Done, Sean 2026-07-22) proof-token requirement. Run: node --test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './dry-loop-gate.mjs';

// Build a minimal transcript: one real user line, then assistant turn with tool_use
// writes/commits and a final assistant text block.
function transcript({ writes = 0, commit = false, finalText = '' } = {}) {
  const lines = [];
  lines.push(JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'do the work' }] } }));
  const content = [];
  for (let i = 0; i < writes; i += 1) {
    content.push({ type: 'tool_use', name: 'Edit', input: { file_path: `apps/web/src/f${i}.ts` } });
  }
  if (commit) {
    content.push({ type: 'tool_use', name: 'Bash', input: { command: 'git commit -m "x"' } });
  }
  if (finalText) content.push({ type: 'text', text: finalText });
  lines.push(JSON.stringify({ type: 'assistant', message: { content } }));
  return lines.join('\n');
}

const DRY = 'DRY-LOOP: CLEAN×2 (rounds: 3)';
const PROOF = 'PROOF: npm test 842 passed, tsc exit 0';

test('non-build turn (no writes, no commit) always allows', () => {
  assert.equal(decide({}, transcript({ finalText: 'here is my answer' })), null);
});

test('build turn WITHOUT the dry-loop marker blocks (dry-loop)', () => {
  const r = decide({}, transcript({ writes: 2, finalText: 'all fixed!' }));
  assert.ok(r && /Dry-Loop Law/.test(r));
});

test('build turn WITH dry-loop marker but NO proof token blocks (Rule 73)', () => {
  const r = decide({}, transcript({ writes: 2, finalText: `done. ${DRY}` }));
  assert.ok(r && /Proof-Before-Done/.test(r));
});

test('build turn WITH both dry-loop marker AND proof token allows', () => {
  assert.equal(decide({}, transcript({ writes: 2, finalText: `${DRY}\n${PROOF}` })), null);
});

test('a git commit alone counts as build-shaped and needs both markers', () => {
  assert.ok(decide({}, transcript({ commit: true, finalText: `${DRY}` }))); // missing proof -> block
  assert.equal(decide({}, transcript({ commit: true, finalText: `${DRY}\n${PROOF}` })), null);
});

test('PROOF: N/A disclosure satisfies the proof token (honest unproveable case)', () => {
  const finalText = `${DRY}\nPROOF: N/A — live authed browser journey needs a backend that will not run here; covered by jsdom integration tests`;
  assert.equal(decide({}, transcript({ writes: 2, finalText })), null);
});

test('stop_hook_active short-circuits to allow (no-loop guard)', () => {
  assert.equal(decide({ stop_hook_active: true }, transcript({ writes: 2, finalText: 'all fixed' })), null);
});

test('single file write is not build-shaped enough to gate', () => {
  assert.equal(decide({}, transcript({ writes: 1, finalText: 'tweaked one file' })), null);
});
