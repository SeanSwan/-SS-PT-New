#!/usr/bin/env node
/**
 * lane-orientation.test.mjs — S3 acceptance for orientation classification
 * =======================================================================
 * Purpose: prove that EVERY failure class the orientation hook can meet is
 * (a) reachable and (b) classified distinctly, and that no class is ever
 * presented as clearance. Boundary: fixtures only — no real ledger, no git
 * invocation, no live coordination directory.
 *
 * WHY THIS FILE EXISTS (Astra hostile review, 2026-09-20 — F03, F07):
 *   F03: the pre-S1 hook tested `if (out) { print claim guidance }`. ANY
 *   non-empty stdout counted as a healthy ledger, so a diagnostic printed with
 *   exit 0 would have been shown to an agent as orientation. The marker check
 *   and the override order are what fix that, and they are only real if a test
 *   can force the broken shapes.
 *
 *   F07: the old suite proved only that a success path succeeds. It could not
 *   force a missing helper, malformed stdout, a timeout, or an output overflow,
 *   so five of the six branches in `orient()` were never executed by any test —
 *   including the one (INVALID_SUMMARY) that guards the actual defect. Every
 *   branch here is reached through the injected `run`/`exists` seams, which is
 *   what makes this a measurement rather than a restatement.
 *
 * The classification is PRESENTATION validation only. `kind: 'summary'` means
 * "the text looked like a digest" — never "you may edit". Case 8 asserts that
 * the clearance disclaimer is emitted in BOTH states, because a degraded run
 * that prints no way forward is how an agent concludes the ledger is unusable
 * and edits an unclaimed file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { orient, shellCommand } from './lib/lane-orientation.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HEALTHY = '[lane] ledger C:/x/.ai-workflow/coordination\n[lane] me: a@b · branch main\n[lane] no fresh locks held by other agents.\n';

/** Collect emitted lines and classify once. `run`/`exists` are the module's own
 *  seams, so no process is spawned and no fixture directory is needed. */
function classify({ exists = () => true, run } = {}) {
  const lines = [];
  const result = orient({ root: ROOT, exists, run, emit: (l) => lines.push(l) });
  return { result, lines, text: lines.join('\n') };
}

const okRun = () => HEALTHY;

test('healthy digest classifies as summary and is not clearance', () => {
  const { result, text } = classify({ run: okRun });
  assert.equal(result.kind, 'summary');
  assert.match(text, /edit-clearance=unverified/, 'a summary must still refuse clearance');
});

test('missing helper degrades without invoking the child', () => {
  let called = false;
  const { result } = classify({ exists: () => false, run: () => { called = true; return HEALTHY; } });
  assert.equal(result.kind, 'degraded');
  assert.equal(result.reason, 'MISSING_HELPER');
  assert.equal(called, false, 'a missing helper must not be executed');
});

test('empty output degrades as EMPTY_OUTPUT', () => {
  assert.equal(classify({ run: () => '   \n  ' }).result.reason, 'EMPTY_OUTPUT');
});

test('non-empty output without digest markers degrades as INVALID_SUMMARY', () => {
  // This is the F03 defect itself: a diagnostic with exit 0. Non-empty, and the
  // old `if (out)` test would have presented it as a healthy ledger.
  const { result, text } = classify({ run: () => 'warning: something odd happened\n' });
  assert.equal(result.kind, 'degraded');
  assert.equal(result.reason, 'INVALID_SUMMARY');
  assert.doesNotMatch(text, /status=summary/, 'a diagnostic must never be shown as a summary');
});

test('failure text overrides present markers', () => {
  // A run can print `[lane] ledger` and then report it is not a git repository.
  // Marker-only checking would pass this; the order in orient() must not.
  const poisoning = '[lane] ledger C:/x\n[lane] me: a@b\nfatal: not a git repository\n';
  const { result } = classify({ run: () => poisoning });
  assert.equal(result.kind, 'degraded');
  assert.equal(result.reason, 'INVALID_SUMMARY');
});

test('timeout degrades as TIMEOUT, not as a generic child failure', () => {
  const err = Object.assign(new Error('spawn ETIMEDOUT'), { code: 'ETIMEDOUT' });
  assert.equal(classify({ run: () => { throw err; } }).result.reason, 'TIMEOUT');
});

test('signal-terminated child degrades as TIMEOUT', () => {
  const err = Object.assign(new Error('killed'), { signal: 'SIGTERM' });
  assert.equal(classify({ run: () => { throw err; } }).result.reason, 'TIMEOUT');
});

test('output overflow degrades as OUTPUT_LIMIT', () => {
  const err = Object.assign(new Error('maxBuffer exceeded'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' });
  assert.equal(classify({ run: () => { throw err; } }).result.reason, 'OUTPUT_LIMIT');
});

test('a plain non-zero exit degrades as CHILD_FAILURE', () => {
  assert.equal(classify({ run: () => { throw new Error('exit 1'); } }).result.reason, 'CHILD_FAILURE');
});

test('every degraded class emits a reason, a recovery path, and no clearance', () => {
  const failures = [
    { exists: () => false, run: okRun },
    { run: () => '' },
    { run: () => 'unrecognised\n' },
    { run: () => { throw Object.assign(new Error('t'), { code: 'ETIMEDOUT' }); } },
    { run: () => { throw Object.assign(new Error('b'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' }); } },
    { run: () => { throw new Error('n'); } },
  ];
  const seen = new Set();
  for (const opts of failures) {
    const { result, text } = classify(opts);
    assert.equal(result.kind, 'degraded');
    assert.ok(result.reason, 'a degraded result must name its reason');
    seen.add(result.reason);
    assert.match(text, /status=degraded; edit-clearance=unverified/);
    assert.match(text, /review queue:/, 'recovery must appear in the degraded state too');
    assert.match(text, /PowerShell:/, 'a recovery command must be shown in the degraded state too');
    assert.match(text, /POSIX:/);
  }
  // Distinct reasons, not six spellings of CHILD_FAILURE — the classes must
  // actually discriminate, which is the whole point of F07.
  assert.equal(seen.size, failures.length, `expected distinct reasons, got ${[...seen].join(', ')}`);
});

test('recovery commands are shell-quoted and root-pinned', () => {
  const ps = shellCommand('powershell', 'C:/Program Files/node.exe', ['C:/repo/scripts/lane-at-root.mjs', 'digest']);
  const sh = shellCommand('posix', "C:/it's/node", ['/repo/scripts/lane-at-root.mjs', 'digest']);
  assert.match(ps, /lane-at-root\.mjs/, 'the wrapper, not a bare lane.mjs');
  assert.match(sh, /lane-at-root\.mjs/);
  assert.match(ps, /^& '/, 'PowerShell form uses the call operator');
  // Assert the shape that actually matters: the space-bearing path arrives as ONE
  // quoted token. An earlier revision of this case asserted `doesNotMatch` on a
  // bare `'C:/Program Files` and failed against correct output, because the
  // pattern's own prefix `& '` satisfied it — the assertion was broken, not the
  // renderer. Match the precise quoted token instead.
  assert.ok(
    ps.includes("'C:/Program Files/node.exe'"),
    `the space-bearing path must be a single quoted token, got: ${ps}`,
  );
  assert.match(sh, /\\'/, "a POSIX apostrophe must be escaped, not dropped");
  assert.ok(sh.includes("'C:/it'\\''s/node'"), `POSIX path must be escaped, got: ${sh}`);
});

test('a newline in a command part is rejected, not rendered', () => {
  // A command that looks correct and runs something else is worse than an error.
  assert.throws(() => shellCommand('posix', 'node', ['a\nb']), /NUL, CR or LF/);
  assert.throws(() => shellCommand('powershell', 'node', ['a\rb']), /NUL, CR or LF/);
});
