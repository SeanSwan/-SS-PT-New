// scripts/coach-completion-admission.successor.test.mjs
//
// R7-01 and R7-03 (Astra Review 7, High). Split from `coach-completion-admission.test.mjs`, which was
// at 397 lines and would have been over Rule 4's 300-line cap. The split is also the right seam: that
// file tests the shapes of the DOCUMENTS, this one tests the two ways a successor gate can be
// satisfied WITHOUT evidence — a hashed-but-unread receipt, and a path that leaves the root.
//
// Run from ROOT: node --test scripts/coach-completion-admission.successor.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { checkSuccessor, sha256 } from './coach-completion-checkpoint.mjs';

// ── R7-01 (Astra Review 7, High): A DIGEST PROVES THE BYTES, NOT THE CLAIM ────────────────────────
// She measured that `checkSuccessor` hashed the receipt and never parsed it. Reproduced in
// `tmp/r701-probe.mjs`: a receipt whose bytes matched its recorded digest and whose CONTENTS recorded
// `cleanupFailed: true` plus two skipped required cases was ADMITTED with ZERO violations. The
// `evidence` argument — which is what the failure checks actually read — was a SEPARATE claim by the
// caller, never reconciled against the receipt on disk.
const receiptDir = () => mkdtempSync(join(tmpdir(), 'r701-'));
const RECEIPT_CLEAN = JSON.stringify({ status: 'PASS', cleanupFailed: false, skippedRequiredCases: [] });
const withReceipt = (bodyText) => {
  const dir = receiptDir();
  writeFileSync(join(dir, 'admission.json'), bodyText);
  const parsed = JSON.parse(bodyText);
  return { dir, receipt: { status: parsed.status ?? 'PASS', receiptPath: 'admission.json', sha256: sha256(Buffer.from(bodyText)) } };
};

test('R7-01 REFUSAL: a receipt whose CONTENTS record a failed cleanup cannot admit, hash or no hash', () => {
  const { dir, receipt } = withReceipt(JSON.stringify({ status: 'PASS', cleanupFailed: true, skippedRequiredCases: [] }));
  // The caller's evidence says everything is fine — the RECEIPT is the contradicting witness.
  const r = checkSuccessor({ predecessorReceipt: receipt, evidence: {}, root: dir });
  assert.equal(r.admitted, false);
  assert.match(r.violations.join(' '), /records a FAILED cleanup/,
    'the receipt must be READ, not merely hashed — this is the R7-01 defect exactly');
});

test('R7-01 REFUSAL: skipped required cases recorded in the receipt are found without the caller saying so', () => {
  const { dir, receipt } = withReceipt(JSON.stringify({ status: 'PASS', cleanupFailed: false, skippedRequiredCases: ['c1', 'c2'] }));
  const r = checkSuccessor({ predecessorReceipt: receipt, evidence: {}, root: dir });
  assert.equal(r.admitted, false);
  assert.match(r.violations.join(' '), /records 2 skipped required case\(s\)/);
});

test('R7-01 REFUSAL: a receipt recording a non-PASS status is authoritative over the caller', () => {
  const { dir, receipt } = withReceipt(JSON.stringify({ status: 'FAIL', cleanupFailed: false, skippedRequiredCases: [] }));
  const r = checkSuccessor({ predecessorReceipt: receipt, evidence: {}, root: dir });
  assert.equal(r.admitted, false);
  assert.match(r.violations.join(' '), /records status "FAIL"/);
});

test('R7-01: a receipt and its caller DISAGREEING is itself a violation — in BOTH directions', () => {
  // Direction 1: the caller asserts a failure the receipt does not record.
  const a = withReceipt(RECEIPT_CLEAN);
  const r1 = checkSuccessor({ predecessorReceipt: a.receipt, evidence: { cleanupFailed: true }, root: a.dir });
  assert.equal(r1.admitted, false);
  assert.match(r1.violations.join(' '), /DISAGREE on cleanupFailed/);
  // Direction 2: the caller omits a failure the receipt records.
  const b = withReceipt(JSON.stringify({ status: 'PASS', cleanupFailed: true, skippedRequiredCases: [] }));
  const r2 = checkSuccessor({ predecessorReceipt: b.receipt, evidence: { cleanupFailed: false }, root: b.dir });
  assert.equal(r2.admitted, false);
  assert.match(r2.violations.join(' '), /DISAGREE on cleanupFailed/);
});

test('R7-01 REFUSAL: a receipt that cannot be PARSED is refused, not silently digested', () => {
  const dir = receiptDir();
  const junk = '{ this is not json';
  writeFileSync(join(dir, 'admission.json'), junk);
  const r = checkSuccessor({
    predecessorReceipt: { status: 'PASS', receiptPath: 'admission.json', sha256: sha256(Buffer.from(junk)) },
    evidence: {}, root: dir,
  });
  assert.equal(r.admitted, false);
  assert.match(r.violations.join(' '), /could not be READ as JSON \(invalid-json\)/);
});

test('R7-01 CONTROL: a truthful, agreeing receipt still ADMITS — the gate must not refuse honesty', () => {
  const { dir, receipt } = withReceipt(RECEIPT_CLEAN);
  const r = checkSuccessor({ predecessorReceipt: receipt, evidence: { cleanupFailed: false, skippedRequiredCases: [] }, root: dir });
  assert.deepEqual(r.violations, []);
  assert.equal(r.admitted, true);
});

// ── R7-03 (Astra Review 7, High): ROOT CONFINEMENT ───────────────────────────────────────────────
// She measured `../../../AGENTS.md` being ACCEPTED as a source path. `join(root, rel)` walks out of
// the root, so a binding could be satisfied by a file that is not part of the package — and the
// digest check would PASS, because the file really exists with those bytes. The hash then proves the
// WRONG thing, which is why confinement is not a nicety layered on top of it.
test('R7-03 REFUSAL: a source path that ESCAPES the root is refused (the digest cannot save it)', () => {
  const dir = receiptDir();
  const r = checkSuccessor({
    predecessorReceipt: { status: 'PASS', receiptPath: join('..', '..', '..', '..', 'etc', 'hosts'), sha256: 'a'.repeat(64) },
    evidence: {}, root: dir,
  });
  assert.equal(r.admitted, false);
  assert.match(r.violations.join(' '), /escapes-root/,
    'escaping the root must be its OWN refusal, distinct from ENOENT — the operator needs to know which');
});

test('R7-03 CONTROL: a NON-escaping ".." still resolves — the guard must not refuse legitimate paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'r703-'));
  writeFileSync(join(dir, 'real.json'), RECEIPT_CLEAN);
  // `a/b/../../real.json` stays inside the root and must be accepted.
  const r = checkSuccessor({
    predecessorReceipt: { status: 'PASS', receiptPath: join('a', 'b', '..', '..', 'real.json'), sha256: sha256(Buffer.from(RECEIPT_CLEAN)) },
    evidence: {}, root: dir,
  });
  assert.deepEqual(r.violations, [], `a .. that does not escape is legitimate; got ${JSON.stringify(r.violations)}`);
});
