/**
 * dry-loop-gate.test.mjs — proves the Stop-hook decision logic, incl. the Rule 74
 * (Proof-Before-Done, Sean 2026-07-22) proof-token requirement. Run: node --test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './dry-loop-gate.mjs';

// Build a minimal transcript: one real user line, then assistant turn with tool_use
// writes/commits and a final assistant text block. `userText` is the LAST real user
// line — the demand side the review-path gate reads.
function transcript({ writes = 0, commit = false, finalText = '', userText = 'do the work' } = {}) {
  const lines = [];
  lines.push(JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: userText }] } }));
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

test('build turn WITH dry-loop marker but NO proof token blocks (Rule 74)', () => {
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

// --- Review-path gate (Sean 2026-07-22 "make it stick"): a REVIEW-only turn (no file
// writes) that was demanded, or that surfaced a not-clean verdict, must still prove the
// loop ran dry — otherwise the agent can do ONE round, hand back findings, and stop, and
// Sean has to type "do another review" again. This closes that hole. ---

test('review DEMANDED + findings but NO marker/escape blocks (the hole Sean kept hitting)', () => {
  const r = decide({}, transcript({
    userText: 'do a hostile review on this work',
    finalText: 'Round 1 found 3 issues: a stale route, a null deref, a mobile overflow.',
  }));
  assert.ok(r && /review turn/.test(r));
});

test('dictation variant "hospital review" is also treated as a review demand', () => {
  const r = decide({}, transcript({
    userText: "let's go ahead and do a hospital review",
    finalText: 'Here are two problems I spotted.',
  }));
  assert.ok(r && /review turn/.test(r));
});

test('review DEMANDED + CLEAN×2 marker allows (loop ran dry)', () => {
  assert.equal(decide({}, transcript({
    userText: 'hostile review please',
    finalText: `Nothing left. ${DRY}`,
  })), null);
});

test('review DEMANDED + AWAITING SEAN escape allows (finding is Sean-gated)', () => {
  assert.equal(decide({}, transcript({
    userText: 'review this code',
    finalText: 'One finding is a money-path call. AWAITING SEAN: honor-vs-refund decision (flagged to Linear).',
  })), null);
});

test('UNPROMPTED not-clean verdict (REVISE) on a review-only turn blocks', () => {
  const r = decide({}, transcript({
    userText: 'do the work',
    finalText: 'Self-review verdict: REVISE — the adapter drops the userId param.',
  }));
  assert.ok(r && /review turn/.test(r));
});

test('no review demand + no verdict + no writes does NOT false-block (precision)', () => {
  assert.equal(decide({}, transcript({
    userText: 'what did codex think of the plan?',
    finalText: 'It liked the approach; it flagged one bug in the cache layer to watch.',
  })), null);
});

test('review DEMANDED but ALSO build-shaped falls through to the stricter build gate', () => {
  // writes>=2 => build path; marker present but NO proof => Proof-Before-Done block wins.
  const r = decide({}, transcript({
    userText: 'hostile review then fix',
    writes: 2,
    finalText: `fixed them. ${DRY}`,
  }));
  assert.ok(r && /Proof-Before-Done/.test(r));
});
