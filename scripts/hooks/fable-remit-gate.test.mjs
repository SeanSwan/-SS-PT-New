#!/usr/bin/env node
/**
 * fable-remit-gate.test.mjs — the bypasses this gate must refuse.
 *
 * Every case in "the loopholes GPT-5.6 Sol named" is a real attack it described in
 * hostile review on 2026-08-26 (blocker B4). They are the reason the gate is
 * purpose-blind; if someone later adds remit parsing, these fail.
 *
 * Run: node scripts/hooks/fable-remit-gate.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide, invokesFable, commandKey } from './fable-remit-gate.mjs';

// Most cases drive the pure `decide()`. The refusal-output tests must spawn the real
// process, because what the AGENT sees is the whole point of GLM 5.3's blocker 1.
const GATE = join(dirname(fileURLToPath(import.meta.url)), 'fable-remit-gate.mjs');

/** Drive decide() against an in-memory token store so no state is written. */
function harness() {
  const tokens = {};
  return {
    tokens,
    run: (cmd) => decide(cmd, { tokens, persist: () => {} }),
  };
}

// --- what counts as spending Fable ------------------------------------------

test('a direct consult-fable invocation is gated', () => {
  assert.equal(invokesFable('node scripts/consult-fable.mjs --document a.md'), true);
});

test('npx and bun are gated too', () => {
  assert.equal(invokesFable('npx scripts/consult-fable.mjs --document a.md'), true);
  assert.equal(invokesFable('bun scripts/consult-fable.mjs --document a.md'), true);
});

test('an invocation after a shell separator is still gated', () => {
  assert.equal(invokesFable('cd /repo && node scripts/consult-fable.mjs --document a.md'), true);
});

test('BYPASS (found by self-hostile pass): sh -c quote-wrapping is gated', () => {
  // `node` preceded by a QUOTE, not a separator. The first draft used [ ;&|(],
  // copied from spend-guard-gate.mjs, and walked straight through this.
  // Enumerated separator lists rot; a negated identifier class does not.
  assert.equal(invokesFable('sh -c "node scripts/consult-fable.mjs --document a.md"'), true);
});

test('BYPASS (found by self-hostile pass): bash -lc quote-wrapping is gated', () => {
  assert.equal(invokesFable("bash -lc 'node scripts/consult-fable.mjs --document a.md'"), true);
});

test('BYPASS: a quoted PIPE before the script path does not hide the call', () => {
  // The middle segment was a bare [^|;&]*?, which could not cross a boundary character
  // even inside quotes. The house review template literally says "APPROVE | REVISE | REJECT".
  assert.equal(invokesFable('node --require "a|b" scripts/consult-fable.mjs --document a.md'), true);
});

test('BYPASS: a quoted SEMICOLON before the script path does not hide the call', () => {
  assert.equal(invokesFable('node --require "a;b" scripts/consult-fable.mjs --document a.md'), true);
});

test('BYPASS: a quoted AMPERSAND before the script path does not hide the call', () => {
  assert.equal(invokesFable("node --require 'a&b' scripts/consult-fable.mjs --document a.md"), true);
});

test('BOUNDARY: an invocation plus an unrelated MENTION in a second command still does not match', () => {
  // What the [^|;&] exclusion is FOR. Quoted-span support must not lose it.
  assert.equal(invokesFable('node build.mjs | grep scripts/consult-fable.mjs'), false);
  assert.equal(invokesFable('node build.mjs ; cat scripts/consult-fable.mjs'), false);
  assert.equal(invokesFable('node build.mjs && cat scripts/consult-fable.mjs'), false);
});

test('BOUNDARY: a real invocation in the SECOND command is still caught', () => {
  assert.equal(invokesFable('node build.mjs | node scripts/consult-fable.mjs'), true);
});

// --- interpreter shapes named by GLM 5.3 (B2) and GLM 5.3-flash (B1) ---------

test('BYPASS: a TAB after the runner is gated', () => {
  // The separator was a literal U+0020, but bash's IFS splits on tab too.
  // Fixed with a negated identifier class rather than a literal tab character —
  // an invisible character in a guard regex is the same fragility class as the
  // `\\b` that once became 0x08 and silently matched nothing.
  assert.equal(invokesFable('node\tscripts/consult-fable.mjs --document a.md'), true);
});

test('BYPASS: bunx is gated', () => {
  assert.equal(invokesFable('bunx tsx scripts/consult-fable.mjs'), true);
});

test('BYPASS: tsx and ts-node are gated', () => {
  assert.equal(invokesFable('tsx scripts/consult-fable.mjs --document a.md'), true);
  assert.equal(invokesFable('ts-node scripts/consult-fable.mjs --document a.md'), true);
});

test('nodejs and node-foo are NOT the node binary', () => {
  // The widened alternation must not widen into false positives.
  assert.equal(invokesFable('nodejs scripts/consult-fable.mjs'), false);
  assert.equal(invokesFable('node-foo scripts/consult-fable.mjs'), false);
});

// --- the second ask must NOT be satisfiable from the agent's own output ------

test('the refusal does NOT print the token (GLM 5.3 blocker 1)', () => {
  // A PreToolUse refusal is read by the AGENT. Printing the token there made the
  // two-ask contract satisfiable with zero human involvement.
  const r = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ tool_input: { command: 'node scripts/consult-fable.mjs --document a.md' } }),
    encoding: 'utf-8',
  });
  assert.equal(r.status, 2);
  assert.doesNotMatch(r.stderr, /SWAN_FABLE_APPROVE=[a-f0-9]{12}/,
    'the token must never appear in output the agent reads');
  assert.match(r.stderr, /PENDING-FABLE-APPROVAL/, 'it must say where Sean can find it');
});

test('an env prefix is gated', () => {
  assert.equal(invokesFable('env node scripts/consult-fable.mjs --document a.md'), true);
});

test('an absolute interpreter path is gated', () => {
  assert.equal(invokesFable('/usr/bin/node scripts/consult-fable.mjs --document a.md'), true);
});

test('a word ENDING in node is not the node binary', () => {
  assert.equal(invokesFable('mynode scripts/consult-fable.mjs --document a.md'), false);
});

test('MENTIONING the script does not gate — false positives train people to route around guards', () => {
  assert.equal(invokesFable('grep -n remit scripts/consult-fable.mjs'), false);
  assert.equal(invokesFable('cat scripts/consult-fable.mjs'), false);
  assert.equal(invokesFable('git log --oneline scripts/consult-fable.mjs'), false);
});

test('the panel is gated ONLY when fable is actually a named seat', () => {
  assert.equal(invokesFable('node scripts/consult-panel.mjs --seats ox,glm --document a.md'), false);
  assert.equal(invokesFable('node scripts/consult-panel.mjs --seats ox,fable --document a.md'), true);
});

test('a seat merely containing "fable" as a substring is not the fable seat', () => {
  assert.equal(invokesFable('node scripts/consult-panel.mjs --seats fablet --document a.md'), false);
});

test('unrelated commands pass untouched', () => {
  assert.equal(invokesFable('npm test'), false);
  assert.equal(invokesFable('node scripts/consult-ox.mjs --document a.md'), false);
});

// --- the core contract: the first ask always refuses -------------------------

test('the first ask is refused and mints a token', () => {
  const h = harness();
  const d = h.run('node scripts/consult-fable.mjs --document a.md');
  assert.equal(d.allow, false);
  assert.match(d.token, /^[a-f0-9]{12}$/);
});

test('non-Fable commands are allowed without minting anything', () => {
  const h = harness();
  assert.equal(h.run('npm run build').allow, true);
  assert.deepEqual(h.tokens, {});
});

// --- the loopholes GPT-5.6 Sol named (B4) ------------------------------------

test('BYPASS: "ultra-complete blueprint executed verbatim" is still refused', () => {
  const h = harness();
  const d = h.run(
    'node scripts/consult-fable.mjs --document plan.md --remit "Produce an ultra-complete ' +
    'blueprint a worker-bot executes verbatim, with per-field API contracts and numbered slices"',
  );
  assert.equal(d.allow, false, 'the prose rule permits this wording — the gate must not');
});

test('BYPASS: "review AND return the corrected implementation" is still refused', () => {
  const h = harness();
  const d = h.run(
    'node scripts/consult-fable.mjs --document x.md --remit "Hostile review, then return the ' +
    'corrected implementation for every file you flag"',
  );
  assert.equal(d.allow, false, 'a mixed remit is the classic review-call-that-is-a-build-call');
});

test('BYPASS: a remit that is literally the word "review" is still refused', () => {
  const h = harness();
  assert.equal(h.run('node scripts/consult-fable.mjs --document x.md --remit "review"').allow, false);
});

test('BYPASS: no remit at all is still refused', () => {
  const h = harness();
  assert.equal(h.run('node scripts/consult-fable.mjs --document x.md').allow, false);
});

test('BYPASS: --dry-run does NOT pass — the Fable path does not implement it', () => {
  const h = harness();
  const d = h.run('node scripts/consult-fable.mjs --document x.md --dry-run');
  assert.equal(d.allow, false, 'honoring a flag the target ignores is how a gate lies');
});

test('BYPASS: an invented approval token is refused', () => {
  const h = harness();
  const d = h.run('SWAN_FABLE_APPROVE=deadbeef1234 node scripts/consult-fable.mjs --document x.md');
  assert.equal(d.allow, false);
});

test('BYPASS: a token minted for one command cannot be lifted onto another', () => {
  const h = harness();
  const first = h.run('node scripts/consult-fable.mjs --document a.md');
  const d = h.run(`SWAN_FABLE_APPROVE=${first.token} node scripts/consult-fable.mjs --document b.md`);
  assert.equal(d.allow, false, 'tokens are bound to the exact command');
});

// --- the second ask: Sean's explicit override --------------------------------

test('the second ask with the right token proceeds', () => {
  const h = harness();
  const first = h.run('node scripts/consult-fable.mjs --document a.md');
  const second = h.run(`SWAN_FABLE_APPROVE=${first.token} node scripts/consult-fable.mjs --document a.md`);
  assert.equal(second.allow, true);
  assert.equal(second.reason, 'second approval accepted');
});

test('a token is SINGLE USE — replaying it is refused', () => {
  const h = harness();
  const first = h.run('node scripts/consult-fable.mjs --document a.md');
  const cmd = `SWAN_FABLE_APPROVE=${first.token} node scripts/consult-fable.mjs --document a.md`;
  assert.equal(h.run(cmd).allow, true);
  assert.equal(h.run(cmd).allow, false, 'a replayable token is an unlimited pass');
});

test('reformatting whitespace does not break a legitimate second ask', () => {
  const h = harness();
  const first = h.run('node scripts/consult-fable.mjs --document a.md');
  const second = h.run(`SWAN_FABLE_APPROVE=${first.token} node   scripts/consult-fable.mjs    --document a.md`);
  assert.equal(second.allow, true);
});

test('the command key ignores the token itself, so mint and redeem agree', () => {
  const bare = commandKey('node scripts/consult-fable.mjs --document a.md');
  const withToken = commandKey('SWAN_FABLE_APPROVE=aabbccddeeff node scripts/consult-fable.mjs --document a.md');
  assert.equal(bare, withToken);
});
