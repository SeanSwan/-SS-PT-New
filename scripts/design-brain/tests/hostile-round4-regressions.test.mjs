/**
 * hostile-round4-regressions.test.mjs — regressions for the ROUND-4 hostile review (2026-09-18).
 * ==============================================================================================
 *   R4-1  Round 3's fix was INCOMPLETE. It wrapped the PARSE stage of `adjudicate` in a try/catch so a
 *         malformed DECIDE line gets a named ⚠ and exit 5 — but `applyDecisions` throws for two further
 *         human-input errors (a merge target that does not exist, and a merge chain), and those were
 *         still escaping as raw stack traces with exit 1. The same defect, one line below the fix.
 *
 * Why this is a test and not a comment: the round-3 fix was verified by a test that only ever
 * exercised the parse stage. A guard is only as wide as the test that proves it, so this file proves
 * the APPLY stage too — and the two assertions are deliberately identical in shape, because the
 * interface contract is that every unreadable human instruction fails the same way.
 *
 * Deliberately NOT covered here (see REPORT.md § "Remaining uncaught throws"): the data-root jail
 * (`paths.mjs`) and the writer's symlink/binary/escape refusals still throw uncaught. Those are not
 * usage errors — they are invariant and security refusals, and a loud stack trace is the correct
 * response to a write that would escape the corpus.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SRC = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;

const tempRoot = () => mkdtempSync(join(tmpdir(), 'db-r4-'));

const claim = (over = {}) => ({
  claimId: 'CLM-aaaaaaaaaa', domainId: 'D01',
  principle: 'log sets inline without leaving the active workout screen',
  workflowPhase: 'Logger', userRole: 'client', products: ['Hevy'], receiptRefs: ['RCP-9001'],
  exceptions: [], contradictions: [], swanTranslation: {},
  confidence: { level: 'low', basis: 'single source — capped LOW until corroborated' },
  singleSource: true, status: 'proposed', createdUtc: '2026-09-18T20:00:00.000Z',
  ...over,
});

function adjudicate(root, batchText) {
  const batch = join(root, 'BATCH-t.md');
  writeFileSync(batch, batchText);
  return spawnSync(NODE, [join(SRC, 'src', 'adjudicate.mjs'), '--root', root, '--batch', batch],
    { encoding: 'utf8' });
}

// ─────────────────────────────────────────────────────────────────────────────
// R4-1a — a merge target that does not exist.
// ─────────────────────────────────────────────────────────────────────────────
test('R4-1a: merging into a nonexistent target exits 5 with a named message, not a stack trace', () => {
  const root = tempRoot();
  try {
    writeFileSync(join(root, 'claims-proposed.jsonl'), JSON.stringify(claim()) + '\n');
    const r = adjudicate(root, '### CLM-aaaaaaaaaa\nDECIDE: m CLM-nonexistent\n');
    assert.equal(r.status, 5, `expected exit 5, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /the batch could not be applied/);
    assert.match(r.stderr, /merge target CLM-nonexistent does not exist/);
    assert.match(r.stderr, /nothing was applied/);
    assert.doesNotMatch(r.stderr, /at applyDecisions \(/, 'must not be a raw stack trace');
    assert.doesNotMatch(r.stderr, /Node\.js v/, 'must not be an uncaught fatal error');
    assert.equal(existsSync(join(root, 'claims.jsonl')), false, 'nothing may be imported');
    // and the pending claim survives untouched
    assert.match(readFileSync(join(root, 'claims-proposed.jsonl'), 'utf8'), /CLM-aaaaaaaaaa/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// R4-1b — a merge chain (target is itself merged).
// ─────────────────────────────────────────────────────────────────────────────
test('R4-1b: merging into an already-merged target exits 5 with a named message', () => {
  const root = tempRoot();
  try {
    writeFileSync(join(root, 'claims-proposed.jsonl'), JSON.stringify(claim()) + '\n');
    const tombstone = claim({
      claimId: 'CLM-bbbbbbbbbb', status: 'merged', mergedInto: 'CLM-cccccccccc',
      principle: 'plate math shows a per-side split on every barbell row',
      products: ['Strong'], receiptRefs: ['RCP-9002'],
    });
    writeFileSync(join(root, 'claims.jsonl'), JSON.stringify(tombstone) + '\n');

    const r = adjudicate(root, '### CLM-aaaaaaaaaa\nDECIDE: m CLM-bbbbbbbbbb\n');
    assert.equal(r.status, 5, `expected exit 5, got ${r.status}: ${r.stderr}`);
    assert.match(r.stderr, /the batch could not be applied/);
    assert.match(r.stderr, /no chains/);
    assert.doesNotMatch(r.stderr, /at applyDecisions \(/);
    // the ledger is exactly as it was — one row, no rev+1
    const rows = readFileSync(join(root, 'claims.jsonl'), 'utf8').trim().split('\n').filter(Boolean);
    assert.equal(rows.length, 1, 'no append may be written when the batch is refused');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
