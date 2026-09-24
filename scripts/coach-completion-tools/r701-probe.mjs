/**
 * R7-01 probe — does `checkSuccessor` read the receipt's CONTENTS, or only hash its bytes?
 *
 * Astra Review 7 (High): "checkSuccessor hashes the receipt, never parses it." If that is right, a
 * receipt whose bytes are intact but whose CONTENTS say the predecessor FAILED will still admit.
 *
 * The test is a two-arm comparison against one real file so the hash cannot differ:
 *   ARM 1  a receipt whose bytes match the recorded digest and whose contents say PASS
 *   ARM 2  a receipt whose bytes match a DIFFERENT recorded digest and whose contents say FAIL
 * A gate that parses would refuse ARM 2's contents regardless of the hash. A gate that only hashes
 * refuses ARM 2 for the WRONG REASON — and, decisively, admits a file whose contents it never read.
 */
import { writeFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSuccessor } from '../coach-completion-admission.mjs';

const root = mkdtempSync(join(tmpdir(), 'r701-'));
const sha = (s) => createHash('sha256').update(s).digest('hex');

// ── ARM 1: a truthful PASS receipt ─────────────────────────────────────────────────────────────
const passBody = JSON.stringify({ status: 'PASS', cleanupFailed: false, skippedRequiredCases: [] });
writeFileSync(join(root, 'pass.json'), passBody);
const arm1 = checkSuccessor({
  predecessorReceipt: { status: 'PASS', receiptPath: 'pass.json', sha256: sha(passBody) },
  evidence: {},
  root,
});

// ── ARM 2: THE DECISIVE ONE. Same top-level `status` FIELD (so the field check passes), but the
// receipt's CONTENTS record a failed cleanup and a skipped required case, and the bytes are
// hashed correctly — so a hash-only gate sees a perfectly consistent file.
const lyingBody = JSON.stringify({ status: 'PASS', cleanupFailed: true, skippedRequiredCases: ['c1', 'c2'] });
writeFileSync(join(root, 'lying.json'), lyingBody);
const arm2 = checkSuccessor({
  predecessorReceipt: { status: 'PASS', receiptPath: 'lying.json', sha256: sha(lyingBody) },
  evidence: {},
  root,
});

console.log('ARM 1 (truthful PASS receipt)');
console.log('  admitted =', arm1.admitted, '| violations =', arm1.violations.length);
console.log('\nARM 2 (bytes match, contents record cleanupFailed + skipped required cases)');
console.log('  admitted =', arm2.admitted, '| violations =', arm2.violations.length);
console.log('  violations:', arm2.violations);
console.log('\n── VERDICT ──');
console.log(arm2.admitted
  ? 'CONFIRMED: R7-01 is REAL. A receipt recording a FAILED predecessor was ADMITTED, because its\n' +
    '           contents were never read — only its bytes were hashed and compared.'
  : 'REFUTED: the receipt contents are consulted.');
