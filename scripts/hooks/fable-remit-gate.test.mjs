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
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { decide, invokesFable, commandKey } from './fable-remit-gate.mjs';
import { redeemOnce } from '../lib/atomic-claim.mjs';

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

test('nodejs IS the node binary; node-foo is not', () => {
  // CORRECTED 2026-08-31. This asserted that `nodejs <seat>` does NOT match, as a
  // false-positive guard — and it was WRONG ABOUT THE WORLD. Debian and Ubuntu ship
  // node as `nodejs`, so that command runs Fable and bills. The test enshrined a real
  // hole as a requirement.
  //
  // The identical false test existed in the spend gate and was corrected in its round
  // 5. Both gates were written from the same assumption and only one was ever audited,
  // which is how this one survived. A cry-wolf test is still a claim about the world,
  // and a false one defends the bug.
  assert.equal(invokesFable('nodejs scripts/consult-fable.mjs'), true);
  assert.equal(invokesFable('node-foo scripts/consult-fable.mjs'), false);
});

test('the three blind spots the spend gate\'s corpus found', () => {
  // Found 2026-08-31 by running THIS matcher against the SPEND gate's shape corpus —
  // 60 command shapes that nine rounds of hostile review proved reach a paid seat.
  // Nobody had ever compared the two gates. That is the same cross-table blindness
  // which let the spend gate price Sol at half the rate its own provider record
  // carried, for weeks, with nothing comparing them.
  assert.equal(invokesFable('./scripts/consult-fable.mjs --document x'), true,
    'a shebang script needs no runner word');
  assert.equal(invokesFable('node scripts/consult-fable.MJS --document x'), true,
    'NTFS and macOS are case-insensitive, and this host is Windows');
  // And the mention guard survives the widening — the reason the shebang case is its
  // own alternation rather than an optional runner.
  assert.equal(invokesFable('cat scripts/consult-fable.mjs'), false);
  assert.equal(invokesFable('grep -n remit scripts/consult-fable.mjs'), false);
});

test('the REAL panel is gated — consult-panel.mjs was a ghost', () => {
  // The panel arm named `consult-panel.mjs`, which DOES NOT EXIST. The real fan-out is
  // `consult-openrouter-panel.mjs`, so `--seats fable` through the panel reached Fable
  // COMPLETELY UNGATED — while this file's own comment called it "the same spend by
  // another entrance", which is exactly right and exactly what was not happening.
  //
  // The same ghost was purged from the spend gate in round 5, which also priced
  // `consult-grok.mjs`, equally nonexistent. Two gates, one stale list, one audit.
  assert.equal(invokesFable('node scripts/consult-openrouter-panel.mjs --seats ox,fable --document a.md'), true);
  assert.equal(invokesFable('node scripts/consult-openrouter-panel.mjs --seats ox,glm --document a.md'), false);
  // Both flag spellings. `--seats=fable` was invisible to the space-only form — the
  // exact spelling gap that cost the spend gate a blocker in round 6.
  assert.equal(invokesFable('node scripts/consult-openrouter-panel.mjs --seats=ox,fable --document a.md'), true);
  assert.equal(invokesFable('node scripts/consult-openrouter-panel.mjs --seats=ox,glm --document a.md'), false);
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

// ---------------------------------------------------------------------------
// Codex hostile review, 2026-08-31. Every case below was reproduced against the
// unfixed code before any implementation changed.
// ---------------------------------------------------------------------------

test('CODEX-1: a QUOTED --seats value is still a named seat', () => {
  // `--seats "fable,sol"` is how a multi-seat list is actually written, and the
  // reader captured `[^\s]+` from raw text — so it took `"fable,sol"` WITH the quote
  // and split it into `"fable`, which is not `fable`. A confirmed fan-out carrying
  // Fable read as not-a-Fable-call.
  assert.equal(invokesFable('node scripts/consult-openrouter-panel.mjs --seats "fable,sol" --confirm-spend'), true);
  assert.equal(invokesFable("node scripts/consult-openrouter-panel.mjs --seats 'sol,fable' --confirm-spend"), true);
  // The negative still holds — quoting must not turn every panel into a Fable call.
  assert.equal(invokesFable('node scripts/consult-openrouter-panel.mjs --seats "sol,glm" --confirm-spend'), false);
});

test('CODEX-2: flags belong to the invocation that owns them', () => {
  // Two panels on one line: the first names sol, the second names fable. A
  // line-global "first --seats wins" read returns sol and clears the whole line, so
  // the Fable fan-out rode through because a DIFFERENT command was cheap.
  const solFirst = 'node scripts/consult-openrouter-panel.mjs --seats sol --confirm-spend'
    + ' && node scripts/consult-openrouter-panel.mjs --seats fable --confirm-spend';
  assert.equal(invokesFable(solFirst), true);

  // Order must not matter.
  const fableFirst = 'node scripts/consult-openrouter-panel.mjs --seats fable --confirm-spend'
    + ' && node scripts/consult-openrouter-panel.mjs --seats sol --confirm-spend';
  assert.equal(invokesFable(fableFirst), true);

  // And neither naming fable is still not a Fable call — the fix must not become
  // "any panel gates", which would be cry-wolf on every free fan-out.
  const neither = 'node scripts/consult-openrouter-panel.mjs --seats sol --confirm-spend'
    + ' && node scripts/consult-openrouter-panel.mjs --seats glm --confirm-spend';
  assert.equal(invokesFable(neither), false);
});

test('CODEX-5: Node loader specifiers are canonicalized before classification', () => {
  // Node accepts a module specifier as a file URL, and a URL may percent-encode any
  // character: `consult%2Dfable.mjs` IS `consult-fable.mjs` to Node, and is NOT to a
  // matcher comparing bytes. Query strings and fragments are equally legal and
  // equally invisible.
  //
  // These fixtures are BENIGN BY CONSTRUCTION — they name a seat path so there is
  // something to classify, and nothing in this file ever executes one.
  assert.equal(invokesFable('node --import=file:///C:/repo/scripts/consult%2Dfable.mjs build.mjs'), true,
    'percent-encoded hyphen inside a file URL');
  assert.equal(invokesFable('node --import=./scripts/consult-fable.mjs?v=2 build.mjs'), true,
    'query string on the specifier');
  assert.equal(invokesFable('node --import=./scripts/consult-fable.mjs#frag build.mjs'), true,
    'fragment on the specifier');
  assert.equal(invokesFable('node --require file:///C:/repo/scripts/consult%2Dfable.mjs build.mjs'), true,
    'space-separated loader flag, same encoding');
  // The negative: an unrelated encoded loader must not gate.
  assert.equal(invokesFable('node --import=file:///C:/repo/scripts/set%2Dup.mjs build.mjs'), false);
});

test('CODEX-6: one unused approval snapshot yields exactly ONE winner', () => {
  // Two processes that both read the store while it still said `used: false` both
  // proceeded. The store is an unlocked read-modify-write, so "check then set" has a
  // window — and this harness issues tool calls in parallel as a matter of course.
  //
  // Forced rather than raced: two decisions driven from the SAME snapshot is exactly
  // what two processes holding a stale read see. A process-level barrier test lives
  // beside this one.
  // HERMETIC, and it was not at first. Written without injecting `claim`, this test
  // used the gate's REAL state dir, so the token was spent on the first run and stayed
  // spent: it passed once and failed every run after, which is the worst shape a test
  // can have — green on the machine that wrote it, red on the next one. The claim dir
  // is injected precisely so the primitive can be exercised without touching live state.
  const dir = mkdtempSync(join(tmpdir(), 'swan-codex6-'));
  try {
    const cmd = 'node scripts/consult-fable.mjs --document a.md';
    const key = commandKey(cmd);
    const snapshot = () => ({ [key]: { token: 'aaaaaaaaaaaa', used: false } });
    const present = `SWAN_FABLE_APPROVE=aaaaaaaaaaaa ${cmd}`;
    const claim = (k, t) => redeemOnce(dir, k, t);

    const a = decide(present, { tokens: snapshot(), persist: () => {}, claim });
    const b = decide(present, { tokens: snapshot(), persist: () => {}, claim });
    const winners = [a, b].filter((r) => r.allow).length;
    assert.equal(winners, 1, `one approval admitted ${winners} calls — the claim is not atomic`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CODEX-6b: the suite is re-runnable — a second pass over the same dir still yields ONE', () => {
  // The negative control for the bug above. A test whose result depends on whether it
  // has run before does not measure the code; it measures the filesystem. Two full
  // cycles in one process prove the isolation is real rather than incidental.
  for (const round of [1, 2]) {
    const dir = mkdtempSync(join(tmpdir(), 'swan-codex6b-'));
    try {
      const cmd = `node scripts/consult-fable.mjs --document r${round}.md`;
      const key = commandKey(cmd);
      const present = `SWAN_FABLE_APPROVE=bbbbbbbbbbbb ${cmd}`;
      const claim = (k, t) => redeemOnce(dir, k, t);
      const snap = () => ({ [key]: { token: 'bbbbbbbbbbbb', used: false } });
      const n = [
        decide(present, { tokens: snap(), persist: () => {}, claim }),
        decide(present, { tokens: snap(), persist: () => {}, claim }),
      ].filter((r) => r.allow).length;
      assert.equal(n, 1, `round ${round} admitted ${n}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
