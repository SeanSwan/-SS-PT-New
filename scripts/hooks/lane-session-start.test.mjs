#!/usr/bin/env node
/**
 * lane-session-start.test.mjs — S1 acceptance for orientation
 * ============================================================
 * Purpose: prove every classification branch and both cwd-pinning layers using
 * ISOLATED fixtures. Boundary: no test here touches the real coordination
 * directory, the real ledger, git, a database, or the network.
 *
 * WHY THIS REPLACES THE OLD SUITE (Astra hostile review, 2026-09-20 — F05/F07):
 *   The previous suite invoked the REAL hook six times per run, and each
 *   successful invocation reached `coordination-prune.mjs` — real deletion
 *   against the live ledger, from a test. It also could not force a single
 *   failure class: its "never non-zero" case ran from a bare directory and
 *   SUCCEEDED, because the hook pins cwd. It proved only that a success path
 *   succeeds. Every branch below is now reachable: fixture modes drive the
 *   subprocess cases, and the injected `run` seam drives timeout and overflow,
 *   which no subprocess can be relied on to produce on demand.
 *
 * The old file's lesson still stands and still shapes the cases: fixing how you
 * NAME a path does not fix where the process RUNS. So the cwd cases vary the cwd
 * AND assert the delegate's own reported cwd, rather than merely asserting that
 * something was printed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join, sep, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { orient, shellCommand } from '../lib/lane-orientation.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Synthetic helper. Reports its ACTUAL cwd and argv so the tests can prove
 *  where it ran and what it received, and supports controlled failure modes. */
const SYNTHETIC_LANE = `
const mode = process.env.FIXTURE_MODE || 'ok';
const argv = process.argv.slice(2);
if (mode === 'empty') process.exit(0);
if (mode === 'nonzero') process.exit(7);
if (mode === 'partial') { console.log('[lane] ledger ' + process.cwd()); process.exit(0); }
if (mode === 'failure-text') {
  console.log('[lane] ledger ' + process.cwd());
  console.log('[lane] me: fixture');
  console.log('[lane] not a git repository');
  process.exit(0);
}
console.log('[lane] ledger ' + process.cwd());
console.log('[lane] me: fixture');
console.log('[lane] argv ' + JSON.stringify(argv));
`;

/** Fails loudly if orientation ever invokes retention again. */
const SENTINEL_PRUNE = `
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
writeFileSync(fileURLToPath(new URL('./PRUNE-SENTINEL', import.meta.url)), 'pruned');
`;

/** Copy ONLY the three task-owned runtime files into a fixture whose root
 *  contains spaces (and, when asked, an apostrophe — case 12). */
function makeFixture(label) {
  const parent = mkdtempSync(resolve(tmpdir(), 'lane-hook-'));
  const root = join(parent, `${label} fixture`);
  for (const d of ['scripts/hooks', 'scripts/lib', 'backend', '.ai-workflow/coordination']) {
    mkdirSync(join(root, d), { recursive: true });
  }
  cpSync(join(REPO, 'scripts/lib/lane-orientation.mjs'), join(root, 'scripts/lib/lane-orientation.mjs'));
  cpSync(join(REPO, 'scripts/hooks/lane-session-start.mjs'), join(root, 'scripts/hooks/lane-session-start.mjs'));
  cpSync(join(REPO, 'scripts/lane-at-root.mjs'), join(root, 'scripts/lane-at-root.mjs'));
  writeFileSync(join(root, 'scripts/lane.mjs'), SYNTHETIC_LANE);
  writeFileSync(join(root, 'scripts/coordination-prune.mjs'), SENTINEL_PRUNE);
  writeFileSync(join(root, '.ai-workflow/coordination/review-queue.md'), '# fixture queue\n');
  return { parent, root, sentinel: join(root, 'scripts/PRUNE-SENTINEL') };
}

/** Guarded teardown: refuse unless the target is inside the OS temp parent AND
 *  inside the exact directory this helper created. */
function cleanup({ parent, root }) {
  assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep), 'refusing cleanup outside tmp');
  assert.ok(resolve(root).startsWith(resolve(parent) + sep), 'refusing cleanup outside its own parent');
  rmSync(parent, { recursive: true, force: true });
}

function runHook(root, cwd, mode = 'ok') {
  try {
    const out = execFileSync(process.execPath, [join(root, 'scripts/hooks/lane-session-start.mjs')], {
      cwd, encoding: 'utf8', env: { ...process.env, FIXTURE_MODE: mode }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { out, code: 0 };
  } catch (e) {
    return { out: `${e.stdout || ''}${e.stderr || ''}`, code: e.status ?? -1 };
  }
}

/** Capture orientation output in-process through the injected seam. */
function capture(root, opts = {}) {
  const lines = [];
  const result = orient({ root, emit: (l) => lines.push(l), ...opts });
  return { result, out: lines.join('\n') };
}

const okRun = () => '[lane] ledger /fixture\n[lane] me: fixture\n';

// ── cwd pinning: the same hook must orient from every cwd ────────────────────
for (const [name, pick] of [
  ['orients from root with pinned delegate cwd', (f) => f.root],
  ['orients from backend with pinned delegate cwd', (f) => join(f.root, 'backend')],
  ['orients from outside with pinned delegate cwd', (f) => join(f.parent, 'scratch')],
]) {
  test(name, () => {
    const f = makeFixture('cwd');
    try {
      if (pick(f).endsWith('scratch')) mkdirSync(pick(f), { recursive: true });
      const { out, code } = runHook(f.root, pick(f));
      assert.equal(code, 0, 'hook must exit 0');
      assert.match(out, /status=summary/, 'must classify as summary');
      // The delegate prints its ACTUAL cwd. It must be the fixture root even
      // though the hook was launched from backend/ or outside entirely.
      assert.ok(out.includes(`[lane] ledger ${f.root}`), `delegate cwd was not the root:\n${out}`);
    } finally { cleanup(f); }
  });
}

// ── degraded states ─────────────────────────────────────────────────────────
test('missing helper is degraded and exits zero', () => {
  const f = makeFixture('missing');
  try {
    rmSync(join(f.root, 'scripts/lane.mjs'));
    const { out, code } = runHook(f.root, f.root);
    assert.equal(code, 0);
    assert.match(out, /degraded \(MISSING_HELPER\)/);
    assert.match(out, /review queue:/, 'recovery must still name the queue');
    assert.match(out, /PowerShell:/, 'recovery commands must still be shown');
  } finally { cleanup(f); }
});

test('empty stdout is degraded', () => {
  const f = makeFixture('empty');
  try {
    const { out, code } = runHook(f.root, f.root, 'empty');
    assert.equal(code, 0);
    assert.match(out, /degraded \(EMPTY_OUTPUT\)/);
    assert.doesNotMatch(out, /status=summary/, 'no summary state may be presented');
  } finally { cleanup(f); }
});

test('partial markers are degraded', () => {
  const f = makeFixture('partial');
  try {
    const { out } = runHook(f.root, f.root, 'partial');
    assert.match(out, /degraded \(INVALID_SUMMARY\)/);
  } finally { cleanup(f); }
});

test('failure text overrides summary markers', () => {
  const f = makeFixture('failtext');
  try {
    const { out } = runHook(f.root, f.root, 'failure-text');
    assert.match(out, /degraded \(INVALID_SUMMARY\)/);
    assert.doesNotMatch(out, /status=summary/);
  } finally { cleanup(f); }
});

test('nonzero child is degraded', () => {
  const f = makeFixture('nonzero');
  try {
    const { out, code } = runHook(f.root, f.root, 'nonzero');
    assert.match(out, /degraded \(CHILD_FAILURE\)/);
    assert.equal(code, 0, 'a handled child failure must not fail the session');
  } finally { cleanup(f); }
});

// ── injected seams: branches a subprocess cannot be made to produce ─────────
test('timeout is classified with configured options', () => {
  const f = makeFixture('timeout');
  try {
    const seen = [];
    const run = (execPath, args, opts) => {
      seen.push(opts);
      const e = new Error('timed out');
      e.code = 'ETIMEDOUT';
      throw e;
    };
    const { result, out } = capture(f.root, { run });
    assert.equal(result.reason, 'TIMEOUT');
    assert.equal(seen.length, 1, 'no automatic retry');
    assert.equal(seen[0].timeout, 25_000, 'the configured budget must be passed');
    assert.equal(resolve(seen[0].cwd), resolve(f.root), 'cwd must be pinned');
    assert.doesNotMatch(out, /timed out/, 'raw exception text must not be emitted');
  } finally { cleanup(f); }
});

test('output overflow is degraded', () => {
  const f = makeFixture('overflow');
  try {
    const run = () => { const e = new Error('maxBuffer exceeded'); e.code = 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'; throw e; };
    const { result, out } = capture(f.root, { run });
    assert.equal(result.reason, 'OUTPUT_LIMIT');
    assert.doesNotMatch(out, /status=summary/, 'a partial read must not read as success');
  } finally { cleanup(f); }
});

test('summary never grants edit clearance', () => {
  const f = makeFixture('clearance');
  try {
    const { out } = capture(f.root, { run: okRun });
    assert.match(out, /status=summary; edit-clearance=unverified/);
  } finally { cleanup(f); }
});

// ── read-only guarantee ─────────────────────────────────────────────────────
test('orientation never invokes pruning', () => {
  const f = makeFixture('prune');
  try {
    const queue = join(f.root, '.ai-workflow/coordination/review-queue.md');
    const before = readFileSync(queue, 'utf8');
    const { code } = runHook(f.root, f.root);
    assert.equal(code, 0);
    assert.equal(existsSync(f.sentinel), false, 'prune sentinel was created — orientation wrote');
    assert.equal(readFileSync(queue, 'utf8'), before, 'ledger fixture bytes changed');
  } finally { cleanup(f); }
});

// ── command rendering ───────────────────────────────────────────────────────
test('recovery uses absolute root-pinned entry and actual interpreter', () => {
  const f = makeFixture("O'Brien");
  try {
    const { out } = runHook(f.root, f.root);
    const wrapper = join(f.root, 'scripts', 'lane-at-root.mjs');
    const queue = join(f.root, '.ai-workflow', 'coordination', 'review-queue.md');
    // The fixture root deliberately contains an apostrophe, so the RENDERED text
    // carries the shell-escaped form. Asserting the raw path would fail against
    // a correct renderer — that mistake is what this fixture is here to catch.
    assert.ok(out.includes(wrapper.replace(/'/g, "''")), 'PowerShell form must name the wrapper absolutely');
    assert.ok(out.includes(wrapper.replace(/'/g, "'\\''")), 'POSIX form must name the wrapper absolutely');
    assert.ok(out.includes(process.execPath), 'must use the actual interpreter, not a bare `node`');
    assert.match(out, /PowerShell: & '/, 'PowerShell form must use the call operator');
    assert.match(out, /POSIX:/, 'POSIX form must be labelled separately');
    assert.ok(out.includes("O''Brien"), 'PowerShell must double the apostrophe');
    assert.ok(out.includes("O'\\''Brien"), 'POSIX must close/escape/reopen');
    // The queue line is emitted RAW (it is a path to read, not a command to
    // run), so it keeps the literal apostrophe — unlike the rendered commands.
    assert.ok(out.includes(queue), 'queue path must be absolute');
    assert.ok(out.startsWith('[lane] ') || out.includes('\n[lane] review queue: '), 'queue must be labelled');
    // The F04 regression guard: never advertise a cwd-dependent invocation.
    assert.doesNotMatch(out, /node scripts[\\/]lane\.mjs/, 'must not print a relative invocation');
    assert.doesNotMatch(out, /\bnode "?scripts/, 'must not print a bare `node`');
  } finally { cleanup(f); }
});

// ── the renderer itself, independently of orient ────────────────────────────
test('shellCommand rejects control characters and quotes correctly', () => {
  assert.equal(shellCommand('posix', '/n', ['a b']), `'/n' 'a b'`);
  assert.equal(shellCommand('powershell', '/n', ["it's"]), `& '/n' 'it''s'`);
  assert.throws(() => shellCommand('posix', '/n', ['a\nb']), /NUL, CR or LF/);
  assert.throws(() => shellCommand('powershell', '/n', ['a\rb']), /NUL, CR or LF/);
  assert.throws(() => shellCommand('sh', '/n', ['a']), /unsupported shell/);
});
