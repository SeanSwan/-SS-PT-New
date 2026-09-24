/**
 * coach-completion-admission.mjs — the two ADMISSION gates for the S83 completion package.
 *
 * WHY THIS IS ITS OWN MODULE (Rule 4 + Astra R6-03). `coach-completion-checkpoint.mjs` owns the
 * structural checks (bindings, preservation, run contract, scope) and the aggregate. These two
 * gates answer a DIFFERENT question — may a successor start, and did a controller migration
 * preserve what it must — and both were found to be validating ASSERTIONS rather than the evidence
 * those assertions describe. Keeping them together keeps that subject in one reviewable place.
 *
 * Both are FAILURE-ON-ABSENCE: a gate that cannot run says so, because "we did not check" is not a
 * defence and a green aggregate must mean every gate actually fired.
 *
 * Budget: <=300 lines (Rule 4).
 */

import { hashSource, readJsonFrom } from './coach-completion-checkpoint.mjs';


/**
 * R5-08's negative sentinel. A successor is admitted only when its predecessor
 * receipt exists and passed. A refused successor launches nothing.
 *
 * ── R6-03 (Astra Review 6, `xhigh`, HIGH): THE SENTINEL WAS CHECKING FOR STRINGS ───────────────
 * She measured: **`receiptPath: 'does-not-exist'`, `sha256: 'not-a-hash'` -> `admitted: true`.**
 * The old body asserted only that the two FIELDS were present and truthy — so any two strings
 * anywhere satisfied it. That is a gate against a typo, not against a missing receipt.
 *
 * Two consequences she named, and both are corrected here:
 *
 *  1. **The receipt must actually be there and match.** When `root` is supplied the path is
 *     resolved, read, hashed, and compared against the recorded digest; a 64-hex shape check runs
 *     even without a root. A non-hash string is now a violation in every mode.
 *
 *  2. **`successorLaunched: true` was FALSE REPORTING.** This module is read-only by construction —
 *     the checkpoint's own header says it "never launches a child" — so it has no way to witness a
 *     launch. The old code set the flag from `!refused`, i.e. it reported an INTENT as an
 *     OBSERVATION. Astra's instruction is to "remove synthetic process claims". The field is now
 *     `null` and carries an explicit `launchWitnessed: false`, because "I did not observe a launch"
 *     is the only true statement a read-only validator can make. A caller that wants to assert
 *     non-launch must supply its own observation.
 */
export const checkSuccessor = ({ predecessorReceipt, evidence, root = null } = {}) => {
  const violations = [];
  // Declared FIRST: the R7-01 reconciliation below compares the caller's evidence against the
  // receipt's contents, so this must be initialized before the receipt block reads it.
  const e = evidence || {};
  if (!predecessorReceipt) {
    violations.push('successor: no predecessor receipt supplied');
  } else {
    if (predecessorReceipt.status !== 'PASS') violations.push(`successor: predecessor status is "${predecessorReceipt.status}", not PASS`);
    const path = predecessorReceipt.receiptPath;
    if (!path) violations.push('successor: predecessor receipt has no path');
    // A recorded hash must LOOK like a digest in every mode — `"not-a-hash"` is not evidence of
    // anything, and accepting it was half of what Astra reproduced.
    const recorded = predecessorReceipt.sha256 == null ? null : String(predecessorReceipt.sha256).toLowerCase().trim();
    if (recorded == null) violations.push('successor: predecessor receipt has no hash');
    else if (!/^[0-9a-f]{64}$/.test(recorded)) violations.push(`successor: predecessor receipt hash "${predecessorReceipt.sha256}" is not a 64-hex digest`);

    if (path && root) {
      const got = hashSource(root, path);
      if (!got.ok) violations.push(`successor: predecessor receipt ${path} does not resolve (${got.reason})`);
      else if (recorded && /^[0-9a-f]{64}$/.test(recorded) && got.sha256 !== recorded) {
        violations.push(`successor: predecessor receipt ${path} sha256 MISMATCH — recorded ${recorded.slice(0, 12)}…, raw bytes ${got.sha256.slice(0, 12)}…`);
      } else {
        // ── R7-01 (Astra Review 7, High): A HASH IS NOT A READING ─────────────────────────────
        // She measured, and I reproduced it (`tmp/r701-probe.mjs`): a receipt whose bytes matched
        // the recorded digest and whose CONTENTS recorded `cleanupFailed: true` and two skipped
        // required cases was ADMITTED with ZERO violations. The gate hashed the file and never
        // parsed it, so the `evidence` argument — which is what the two checks below actually
        // read — was a SEPARATE claim by the caller. The receipt on disk was never cross-checked
        // against it, and a receipt that says the predecessor failed could admit a successor.
        //
        // The two facts must be RECONCILED, not merely both present. A disagreement is itself a
        // violation: if the receipt says "failed cleanup" and the caller's evidence says nothing,
        // exactly one of them is wrong and the gate cannot choose — so it refuses and says which.
        const parsed = readJsonFrom(root, path);
        if (!parsed.ok) {
          violations.push(`successor: predecessor receipt ${path} could not be READ as JSON (${parsed.reason}) — a digest proves the bytes, not the claim`);
        } else {
          const r = parsed.value;
          // The receipt's OWN status field is authoritative for content. A receipt recording a
          // non-PASS status cannot admit a successor no matter what the caller asserts.
          if (r.status != null && r.status !== 'PASS') {
            violations.push(`successor: predecessor receipt ${path} records status "${r.status}", not PASS`);
          }
          // Cross-check each fact the caller asserts, and ALSO consult the receipt directly — so a
          // caller that supplies empty `evidence` cannot silence a failing receipt (and vice versa).
          const fromReceipt = {
            cleanupFailed: r.cleanupFailed === true || r.cleanupSucceeded === false,
            skippedRequiredCases: Array.isArray(r.skippedRequiredCases) ? r.skippedRequiredCases
              : (Array.isArray(r.skipped) ? r.skipped : []),
          };
          if (fromReceipt.cleanupFailed) violations.push(`successor: predecessor receipt ${path} records a FAILED cleanup`);
          if (fromReceipt.skippedRequiredCases.length) {
            violations.push(`successor: predecessor receipt ${path} records ${fromReceipt.skippedRequiredCases.length} skipped required case(s)`);
          }
          // Reconciliation — the caller's claim vs the receipt's. Both directions are refusals.
          if (Boolean(e.cleanupFailed) !== fromReceipt.cleanupFailed) {
            violations.push(`successor: receipt ${path} and the supplied evidence DISAGREE on cleanupFailed (receipt ${fromReceipt.cleanupFailed}, evidence ${Boolean(e.cleanupFailed)})`);
          }
          const evSkipped = Array.isArray(e.skippedRequiredCases) ? e.skippedRequiredCases.length : 0;
          if (evSkipped !== fromReceipt.skippedRequiredCases.length) {
            violations.push(`successor: receipt ${path} and the supplied evidence DISAGREE on skipped required cases (receipt ${fromReceipt.skippedRequiredCases.length}, evidence ${evSkipped})`);
          }
        }
      }
    } else if (path && !root) {
      violations.push('successor: NO ROOT SUPPLIED — the predecessor receipt was not read or verified');
    }
  }
  if (e.cleanupFailed) violations.push('successor: predecessor recorded a failed cleanup');
  if (e.skippedRequiredCases?.length) violations.push(`successor: predecessor skipped ${e.skippedRequiredCases.length} required case(s)`);
  const refused = violations.length > 0;
  return {
    admitted: !refused,
    refused,
    violations,
    // R6-03: this module cannot witness a launch, so it does not claim to have. `null` is the
    // honest value — not `false` (which would assert "it did not launch") and not `true` (the
    // fabrication Astra caught). Read `launchWitnessed` to see why.
    successorLaunched: null,
    launchWitnessed: false,
    launchLog: [],
  };
};

// ── R7-02 (Astra Review 7, HIGH): the CONTROLLER-PRESERVATION gate moved out ────────────────────
// The R7-02 fix (content-equality verification + `deepDiffs`) took this file to 343 lines against
// Rule 4's 300 cap. The gate now lives in `coach-completion-controller-preservation.mjs` — a real
// subject seam, since this module asks "may a successor start" and that one asks "did a controller
// migration preserve what it must". Re-exported here so every existing import site is unchanged.
export { checkControllerMigration, deepDiffs } from './coach-completion-controller-preservation.mjs';

