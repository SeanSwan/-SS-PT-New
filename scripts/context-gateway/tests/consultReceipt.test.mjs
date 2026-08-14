/**
 * consultReceipt.test.mjs — end-to-end: does the CONSULT LANE actually write a receipt?
 * Run: node --test scripts/context-gateway/tests/consultReceipt.test.mjs
 *
 * WHY THIS FILE EXISTS: `receiptV1.test.mjs` proves the record is well-formed, but every assertion
 * there calls buildReceiptV1 directly. The defect this whole slice fixes was precisely that a
 * well-tested writer had NO production caller — unit tests cannot see that. So these tests run
 * `consult-kimi.mjs` as a real subprocess and assert a receipt file appears on disk.
 *
 * Two branches are covered, both flagged as uncovered in the Kimi hostile review 2026-08-13:
 *   - DENY_PATH: exits via `process.exit(2)` DIRECTLY, bypassing runConsult's catch entirely. If the
 *     call-site recording is ever dropped, the most security-relevant event in the lane goes dark.
 *   - NO_CAP:    the ordinary throw path, which must classify as `refused` (a gate firing).
 *
 * No network and no spend: both branches exit before any provider call. `cwd` is a temp dir, so the
 * receipts land there and never touch the repo's real store.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
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
function runLauncher(docRelPath, { writeDoc = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'swan-consult-'));
  const docPath = join(cwd, docRelPath);
  mkdirSync(dirname(docPath), { recursive: true });
  if (writeDoc) writeFileSync(docPath, 'placeholder body, never egressed\n', 'utf-8');

  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync(process.execPath, [LAUNCHER, '--document', docPath, '--out', join(cwd, 'out.md')], {
      cwd, stdio: 'pipe', env: { ...process.env, SWAN_CONTEXT_MAX_USD: '' },
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

test('E2E: a spend-cap refusal is classed as `refused` and carries task identity', () => {
  // Benign path -> DENY does not fire -> the doc IS read -> assertSpend throws NO_CAP.
  const r = runAndReadReceipt('packet.md');
  assert.ok(r, 'the ordinary refusal path wrote no receipt');
  assert.equal(r.errorCode, 'NO_CAP');
  assert.equal(r.outcome, 'refused', 'a gate firing must class as refused, not error');
  assert.ok(r.docSha, 'a refusal must carry task identity or the flywheel cannot group it');
  assert.equal(r.provider, 'kimi');
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

test('E2E: the DENY branch does not print the full secret-bearing path', () => {
  const { stdout, stderr, cwd } = runLauncher('.env');
  const all = stdout + stderr;
  assert.ok(all.includes('REFUSED'), 'expected the DENY refusal to be announced');
  assert.ok(!all.includes(cwd), 'the full path to the secret-bearing file leaked to the console');
});
