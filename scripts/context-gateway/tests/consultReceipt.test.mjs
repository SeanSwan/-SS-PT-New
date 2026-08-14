/**
 * consultReceipt.test.mjs — end-to-end: does the CONSULT LANE actually write a receipt?
 * Run: node --test scripts/context-gateway/tests/consultReceipt.test.mjs
 *
 * WHY THIS FILE EXISTS: `receiptV1.test.mjs` proves the record is well-formed, but every assertion
 * there calls buildReceiptV1 directly. The defect this whole slice fixes was precisely that a
 * well-tested writer had NO production caller — unit tests cannot see that. So these tests run
 * `consult-kimi.mjs` as a real subprocess and assert a receipt file appears on disk.
 *
 * Branches covered:
 *   - DENY_PATH:  exits via `process.exit(2)` DIRECTLY, bypassing runConsult's catch entirely. If the
 *                 call-site recording is ever dropped, the most security-relevant event goes dark.
 *   - NO_CAP:     the ordinary throw path. Classifies as `error` — an unset SWAN_CONTEXT_MAX_USD is
 *                 misconfiguration, NOT the gate biting.
 *   - SPEND_CAP:  a real gate firing. Classifies as `refused`.
 * The last two are deliberately paired: pinning only one direction would let "everything is an
 * error" (or "everything is refused") pass the suite while destroying the signal.
 *
 * No network and no spend: every branch exits before any provider call. `cwd` is a temp dir, so the
 * receipts land there and never touch the repo's real store.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const LAUNCHER = join(REPO, 'scripts', 'consult-kimi.mjs');

/**
 * Run the real launcher in an isolated cwd. Returns `{receipt, stdout, stderr, cwd}`.
 * Console output is CAPTURED, not discarded: an absolute-path leak to stdout survived round 1
 * precisely because the tests only inspected the on-disk record (Kimi round 2, F1).
 */
function runLauncher(docRelPath, { writeDoc = true, env = {}, outPath = null } = {}) {
  // realpath: on macOS mkdtemp returns /var/folders/... which is a symlink to /private/var/...,
  // so a raw `stdout.includes(cwd)` assertion could pass while a resolved path leaked.
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), 'swan-consult-')));
  const docPath = join(cwd, docRelPath);
  mkdirSync(dirname(docPath), { recursive: true });
  if (writeDoc) writeFileSync(docPath, 'placeholder body, never egressed\n', 'utf-8');

  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync(process.execPath, [LAUNCHER, '--document', docPath, '--out', outPath ?? join(cwd, 'out.md')], {
      cwd, stdio: 'pipe', env: { ...process.env, SWAN_CONTEXT_MAX_USD: '', ...env },
    }).toString();
  } catch (e) {
    // Non-zero exit is the expected outcome for both refusal branches.
    stdout = e.stdout?.toString() ?? '';
    stderr = e.stderr?.toString() ?? '';
  }

  const dir = join(cwd, '.ai-workflow', 'context-gateway', 'receipts');
  let receipt = null;
  if (existsSync(dir)) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    if (files.length) receipt = JSON.parse(readFileSync(join(dir, files[0]), 'utf-8'));
  }
  return { receipt, stdout, stderr, cwd };
}

const runAndReadReceipt = (p, o) => runLauncher(p, o).receipt;

test('E2E: the DENY secret-path jail writes a receipt (it exits directly, bypassing the catch)', () => {
  // `.env` at a path-segment start is what DENY_PATTERNS actually matches — a file merely ENDING in
  // ".env" does not trip it, which is how an earlier probe of this branch silently proved nothing.
  const r = runAndReadReceipt('.env');
  assert.ok(r, 'DENY branch wrote no receipt — the security-relevant event would be lost');
  assert.equal(r.errorCode, 'DENY_PATH');
  assert.equal(r.outcome, 'refused');
  assert.equal(r.docSha, null, 'a denied file must never be read, so it can have no content hash');
  assert.equal(r.lane, 'consult');
});

test('E2E: the DENY receipt never persists the offending path', () => {
  const r = runAndReadReceipt('.env');
  assert.ok(r);
  const serialized = JSON.stringify(r);
  assert.ok(!/[A-Za-z]:[\\/]/.test(serialized), 'an absolute path leaked into the receipt');
  assert.ok(!serialized.includes('Users'), 'an OS user directory leaked into the receipt');
});

test('E2E: an UNSET cap is misconfiguration (`error`), not the gate biting', () => {
  // Benign path -> DENY does not fire -> the doc IS read -> assertSpend throws NO_CAP.
  // This assertion previously read `refused`, which PINNED a misclassification: NO_CAP means
  // SWAN_CONTEXT_MAX_USD was never set, so every run on an uncapped workstation inflated the
  // "spend gate is biting" signal the flywheel exists to measure (Rule 79 — the test encoded the bug).
  const r = runAndReadReceipt('packet.md');
  assert.ok(r, 'the ordinary refusal path wrote no receipt');
  assert.equal(r.errorCode, 'NO_CAP');
  assert.equal(r.outcome, 'error', 'an unset cap is misconfiguration, not gate pressure');
  assert.ok(r.docSha, 'a refusal must carry task identity or the flywheel cannot group it');
  assert.equal(r.provider, 'kimi');
});

test('E2E: a REAL spend gate firing is classed as `refused`', () => {
  // The other direction must stay pinned too, or "everything is an error" would also pass the
  // suite. A cap this small is guaranteed to be exceeded by any prompt, so SPEND_CAP genuinely fires.
  const r = runLauncher('packet.md', { env: { SWAN_CONTEXT_MAX_USD: '0.0000001' } }).receipt;
  assert.ok(r, 'the spend-cap path wrote no receipt');
  assert.equal(r.errorCode, 'SPEND_CAP');
  assert.equal(r.outcome, 'refused', 'a gate deliberately stopping the call IS gate pressure');
});

test('E2E: a receipt never contains the document body', () => {
  const r = runAndReadReceipt('packet.md');
  assert.ok(r);
  assert.ok(!JSON.stringify(r).includes('never egressed'), 'document content leaked into the receipt');
});

test('E2E: no absolute path reaches stdout or stderr on the refusal path', () => {
  // Transcripts capture console output, so a path printed there is as bad as one persisted.
  const { stdout, stderr, cwd } = runLauncher('packet.md');
  assert.ok(!stdout.includes(cwd), `absolute cwd leaked to stdout: ${stdout.slice(0, 200)}`);
  assert.ok(!stderr.includes(cwd), `absolute cwd leaked to stderr: ${stderr.slice(0, 200)}`);
});

// REMOVED — an E2E here asserting that an outside-cwd `--out` prints no `../` was VACUOUS: the
// process exits at the spend gate before `shortPath` is ever reached, so stdout was empty ('') and
// both assertions passed trivially. Measured: `stdout length: 0`. `shortPath` is only reachable on
// the paid success path, so it cannot be exercised end-to-end without a transport stub; it is
// exported and unit-tested directly in tests/paths.test.mjs instead (Kimi round 6, S2).
// A test that cannot fail is worse than no test — it reads as coverage.

test('E2E: the DENY branch does not print the full secret-bearing path', () => {
  const { stdout, stderr, cwd } = runLauncher('.env');
  const all = stdout + stderr;
  assert.ok(all.includes('REFUSED'), 'expected the DENY refusal to be announced');
  assert.ok(!all.includes(cwd), 'the full path to the secret-bearing file leaked to the console');
});
