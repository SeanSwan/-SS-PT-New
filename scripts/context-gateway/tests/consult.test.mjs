/**
 * consult.test.mjs — the consult-lane security gates (hostile pass 8 named these untested).
 * Run: node --test scripts/context-gateway/tests/consult.test.mjs
 *
 * The consult wrappers read operator-named ARBITRARY paths and egress them, so their gates —
 * DENY-refusal of secret-bearing paths, and the design ceiling screening BOTH --document AND
 * --seed — are load-bearing. These spawn the real wrapper and assert it REFUSES (exit 2) BEFORE
 * any network turn (no OPENROUTER_API_KEY needed because the refusal precedes the fetch).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { classifyCompletion, ERROR_CODES } from '../src/receiptV1.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..'); // repo root (…/SS-PT-context-gateway)
const dir = mkdtempSync(join(tmpdir(), 'swan-consult-'));
writeFileSync(join(dir, 'hero.md'), '# hero redesign, parallax layers\n');
writeFileSync(join(dir, 'authMiddleware.mjs'), 'export function requireAuth(){ return 1; }\n');
writeFileSync(join(dir, 'secrets.json'), '{"internalApiSecret":"plainvalue"}\n');

// The wrappers must be spawned with cwd=ROOT (they resolve real scripts and env from the repo),
// but the receipt ledger must NOT be the repo's. Every run of this file used to forge 4 synthetic
// audit records in the production spend ledger (F8). SWAN_RECEIPTS_ROOT separates "where the code
// lives" from "where the audit record goes".
const LEDGER_SANDBOX = mkdtempSync(join(tmpdir(), 'swan-consult-ledger-'));

/** Run a consult wrapper; return { code, out }. A refusal exits non-zero and prints REFUSED. */
function runConsult(wrapper, args, env = {}) {
  try {
    const out = execFileSync('node', [join('scripts', wrapper), ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        SWAN_CONTEXT_MAX_USD: '1',
        OPENROUTER_API_KEY: '',
        SWAN_RECEIPTS_ROOT: LEDGER_SANDBOX,
        ...env,
      },
      stdio: 'pipe',
    }).toString();
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

test('consult DENY: a secret-bearing --document is refused (exit 2, no network)', () => {
  const r = runConsult('consult-fable.mjs', ['--document', join(dir, 'secrets.json')]);
  assert.equal(r.code, 2);
  assert.match(r.out, /REFUSED secret-bearing path/);
  assert.doesNotMatch(r.out, /sending request|model=/, 'no network turn happened');
});

test('consult DENY: a secret-bearing --seed is refused too', () => {
  writeFileSync(join(dir, 'key.pem'), 'x\n');
  const r = runConsult('consult-fable.mjs', ['--document', join(dir, 'hero.md'), '--seed', join(dir, 'key.pem')]);
  assert.equal(r.code, 2);
  assert.match(r.out, /REFUSED secret-bearing path/);
});

test('consult ceiling: kimi (design) refuses a sensitive --seed even with a benign --document', () => {
  const r = runConsult('consult-kimi.mjs', ['--document', join(dir, 'hero.md'), '--seed', join(dir, 'authMiddleware.mjs')]);
  assert.equal(r.code, 2);
  assert.match(r.out, /REFUSED \[CEILING\]/);
  assert.match(r.out, /E002/, 'the SEED (E002), not just the document, is screened');
});

test('consult: no cap set → fail-closed refusal (exit 2)', () => {
  const r = runConsult('consult-sol.mjs', ['--document', join(dir, 'hero.md')], { SWAN_CONTEXT_MAX_USD: '' });
  assert.equal(r.code, 2);
  assert.match(r.out, /NO_CAP/);
});

// --- F3: a truncated review is not a successful one -----------------------------------------
// The only failure gate was `r.empty`, and a repo grep found NOTHING treating finish_reason
// 'length' as a failure. So a paid call cut off mid-sentence — the COMMON way a reasoning model
// fails on a large packet, observed live twice on 2026-08-14 — was recorded outcome:'ok',
// errorCode:null, exit 0, with no banner. The standalone consult-hy3-design.mjs already guarded
// this; the lane that OWNS the receipt contract did not.
test('F3: an empty completion is an error, with cost still recorded', () => {
  assert.deepEqual(classifyCompletion({ empty: true, finishReason: 'error' }),
    { outcome: 'error', errorCode: 'EMPTY_RESPONSE' });
});

test('F3: a TRUNCATED completion is an error, not a success', () => {
  assert.deepEqual(classifyCompletion({ empty: false, finishReason: 'length' }),
    { outcome: 'error', errorCode: 'TRUNCATED' },
    'a review cut off at max_tokens was being recorded as ok');
});

test('F3: a normal completion is still ok', () => {
  assert.deepEqual(classifyCompletion({ empty: false, finishReason: 'stop' }),
    { outcome: 'ok', errorCode: null });
  assert.deepEqual(classifyCompletion({ empty: false, finishReason: null }),
    { outcome: 'ok', errorCode: null }, 'an absent finish_reason must not be treated as failure');
});

test('F3: empty takes precedence over truncated — the more specific failure wins', () => {
  // A reasoning model that burns the budget returns BOTH empty content and finish_reason:'length'.
  // EMPTY_RESPONSE is the more actionable code ("you paid and got nothing"), so it must not be
  // masked by the newer, broader one.
  assert.deepEqual(classifyCompletion({ empty: true, finishReason: 'length' }),
    { outcome: 'error', errorCode: 'EMPTY_RESPONSE' });
});

test('F3: TRUNCATED is a legal receipt code, not a string that normalizes to UNKNOWN', () => {
  // ERROR_CODES is an allowlist; an unlisted code silently becomes 'UNKNOWN' and the ledger loses
  // the distinction this fix exists to record.
  assert.ok(ERROR_CODES.includes('TRUNCATED'), 'TRUNCATED missing from the receipt enum');
});

// --- F8: the suite must not forge rows in the ledger it exists to protect --------------------
// These tests spawn the REAL wrapper with cwd=ROOT (they need the real scripts), and the wrapper
// keyed its receipts off process.cwd() — so every run of this file wrote 4 synthetic audit records
// into the repo's production spend ledger. Bisected 2026-08-14: full glob +4, receiptV1 suite +0.
// The rows carry outcome:error and name providers that were never called, so a spend/failure audit
// reads fiction as fact — in the one artifact this whole slice exists to make trustworthy.
// The ledger root is now EXPLICIT (SWAN_RECEIPTS_ROOT) instead of implicit-from-cwd.
test('F8: running the consult suite writes NO receipts into the repo ledger', () => {
  const ledger = join(ROOT, '.ai-workflow', 'context-gateway', 'receipts');
  const before = existsSync(ledger) ? new Set(readdirSync(ledger)) : new Set();

  // UNIQUE documents per call, deliberately. `eventId` hashes the doc, and the stamp is only
  // second-granular, so re-running an IDENTICAL call within the same second reuses the filename
  // and overwrites in place — leaving the file COUNT unchanged. An earlier draft of this test
  // reused the shared fixtures and passed while 3 receipts were being written, because the
  // earlier tests in this file had already written those exact filenames in the same second.
  // A test that cannot fail is the defect class this whole slice exists to delete; unique inputs
  // remove the collision so the assertion measures what it claims to.
  const uniq = mkdtempSync(join(tmpdir(), 'swan-f8-'));
  writeFileSync(join(uniq, 'a.md'), `# f8 probe a ${process.hrtime.bigint()}\n`);
  writeFileSync(join(uniq, 'b.md'), `# f8 probe b ${process.hrtime.bigint()}\n`);
  writeFileSync(join(uniq, 'c.json'), `{"internalApiSecret":"f8-${process.hrtime.bigint()}"}\n`);

  // Exercise every receipt-writing branch this file covers: DENY_PATH, CEILING, NO_CAP.
  runConsult('consult-fable.mjs', ['--document', join(uniq, 'c.json')]);
  runConsult('consult-kimi.mjs', ['--document', join(uniq, 'a.md'), '--seed', join(dir, 'authMiddleware.mjs')]);
  runConsult('consult-sol.mjs', ['--document', join(uniq, 'b.md')], { SWAN_CONTEXT_MAX_USD: '' });

  const after = existsSync(ledger) ? readdirSync(ledger) : [];
  const added = after.filter((f) => !before.has(f));
  assert.deepEqual(added, [], `consult suite forged ${added.length} receipt(s) in the REAL ledger: ${added.join(', ')}`);
});

test('F8: receipts still get written — to the redirected root, so coverage is not lost', () => {
  // Redirection must not silently disable recording: a "fix" that stops writing receipts entirely
  // would pass the test above while deleting the audit trail. Prove the row lands somewhere.
  const sandbox = mkdtempSync(join(tmpdir(), 'swan-ledger-'));
  runConsult('consult-sol.mjs', ['--document', join(dir, 'hero.md')], {
    SWAN_CONTEXT_MAX_USD: '', SWAN_RECEIPTS_ROOT: sandbox,
  });
  const written = join(sandbox, '.ai-workflow', 'context-gateway', 'receipts');
  assert.ok(existsSync(written), 'no receipts directory created under the redirected root');
  assert.ok(readdirSync(written).length > 0, 'redirection silenced the audit record instead of moving it');
});
