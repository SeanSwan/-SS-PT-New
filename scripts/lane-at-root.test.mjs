#!/usr/bin/env node
/**
 * lane-at-root.test.mjs — S1 acceptance for the root-pinned entry point
 * ======================================================================
 * Purpose: prove the wrapper pins cwd to ITS OWN checkout, forwards argv as
 * data, and propagates the child's exit code. Boundary: fixtures only; no real
 * ledger, git, database or network.
 *
 * WHY (Astra hostile review, 2026-09-20 — F04): the recovery command the hook
 * printed used an absolute script path but did not pin cwd, so pasting it from a
 * subdirectory reproduced the v3.0 bug as advice. The wrapper is the fix, and
 * these cases are what make "it pins cwd" a measurement instead of a claim —
 * the delegate reports its ACTUAL cwd, so a missing `cwd` option fails here
 * rather than passing quietly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { resolve, join, sep, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Synthetic delegate. Prints its real cwd and argv, and drops an INVOKED marker
 *  so a test can prove the child was NOT run when an operation is rejected. */
const SYNTHETIC_LANE = `
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const mode = process.env.FIXTURE_MODE || 'ok';
writeFileSync(fileURLToPath(new URL('./INVOKED', import.meta.url)), 'yes');
if (mode === 'nonzero') process.exit(7);
console.log('[lane] cwd ' + process.cwd());
console.log('[lane] argv ' + JSON.stringify(process.argv.slice(2)));
`;

function makeFixture(label) {
  const parent = mkdtempSync(resolve(tmpdir(), 'lane-root-'));
  const root = join(parent, `${label} fixture`);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'backend'), { recursive: true });
  cpSync(join(REPO, 'scripts/lane-at-root.mjs'), join(root, 'scripts/lane-at-root.mjs'));
  writeFileSync(join(root, 'scripts/lane.mjs'), SYNTHETIC_LANE);
  return { parent, root, invoked: join(root, 'scripts/INVOKED') };
}

function cleanup({ parent, root }) {
  assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep), 'refusing cleanup outside tmp');
  assert.ok(resolve(root).startsWith(resolve(parent) + sep), 'refusing cleanup outside its own parent');
  rmSync(parent, { recursive: true, force: true });
}

/** Run the fixture's wrapper. Returns output and exit code; never throws. */
function runWrapper(root, cwd, args, mode = 'ok') {
  try {
    const out = execFileSync(process.execPath, [join(root, 'scripts/lane-at-root.mjs'), ...args], {
      cwd, encoding: 'utf8', env: { ...process.env, FIXTURE_MODE: mode }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { out, code: 0 };
  } catch (e) {
    return { out: `${e.stdout || ''}${e.stderr || ''}`, code: e.status ?? -1 };
  }
}

// ── cwd pinning ─────────────────────────────────────────────────────────────
for (const [name, pick] of [
  ['pins root from root cwd', (f) => f.root],
  ['pins root from nested cwd', (f) => join(f.root, 'backend')],
  ['pins root from unrelated cwd', (f) => join(f.parent, 'scratch')],
]) {
  test(name, () => {
    const f = makeFixture('cwd');
    try {
      if (pick(f).endsWith('scratch')) mkdirSync(pick(f), { recursive: true });
      const { out, code } = runWrapper(f.root, pick(f), ['digest']);
      assert.equal(code, 0);
      // The delegate's OWN reported cwd must be the fixture root.
      assert.ok(out.includes(`[lane] cwd ${f.root}`), `delegate ran elsewhere:\n${out}`);
    } finally { cleanup(f); }
  });
}

test('preserves argv without shell interpretation', () => {
  const f = makeFixture('argv');
  try {
    // Hostile arguments: spaces, quotes, command substitution and backticks.
    const args = ['claim', '--task', 'has spaces', '--files', `a"b'c`, '$(touch PWNED)', '`touch PWNED2`', '--next', 'x;y|z&w'];
    const { out, code } = runWrapper(f.root, f.root, args);
    assert.equal(code, 0);
    const line = out.split('\n').find((l) => l.startsWith('[lane] argv '));
    assert.ok(line, `delegate never reported argv:\n${out}`);
    // Exact round-trip: every argument arrives byte-identical, in order. The
    // child's slice(2) is [op, ...rest], so it equals the wrapper's own argv tail.
    assert.deepEqual(JSON.parse(line.slice('[lane] argv '.length)), args);
    // And nothing executed: no shell was involved.
    assert.equal(existsSync(join(f.root, 'PWNED')), false, 'a shell expanded a substitution');
    assert.equal(existsSync(join(f.root, 'PWNED2')), false, 'a shell expanded a backtick');
  } finally { cleanup(f); }
});

test('propagates child exit status', () => {
  const f = makeFixture('exit');
  try {
    const { code } = runWrapper(f.root, f.root, ['digest'], 'nonzero');
    assert.equal(code, 7, 'the child code must survive the wrapper');
  } finally { cleanup(f); }
});

test('rejects unsupported operations', () => {
  const f = makeFixture('reject');
  try {
    for (const bad of [[], ['doctor'], ['snapshot'], ['prune'], ['--help']]) {
      const { out, code } = runWrapper(f.root, f.root, bad);
      assert.equal(code, 64, `expected EX_USAGE for ${JSON.stringify(bad)}`);
      assert.match(out, /unsupported operation|usage:/);
    }
    // The decisive assertion: an unsupported op must not reach the delegate.
    assert.equal(existsSync(f.invoked), false, 'the child was invoked for a rejected operation');
  } finally { cleanup(f); }
});

test('uses entry checkout instead of caller checkout', () => {
  const a = makeFixture('entryA');
  const b = makeFixture('callerB');
  try {
    // Invoke A's entry point while sitting in B.
    const { out, code } = runWrapper(a.root, b.root, ['digest']);
    assert.equal(code, 0);
    assert.ok(out.includes(`[lane] cwd ${a.root}`), `delegate did not belong to A:\n${out}`);
    assert.ok(!out.includes(b.root), 'delegate resolved the CALLER checkout');
    assert.equal(existsSync(a.invoked), true, 'A\'s delegate never ran');
    assert.equal(existsSync(b.invoked), false, 'B\'s delegate ran');
  } finally { cleanup(a); cleanup(b); }
});
