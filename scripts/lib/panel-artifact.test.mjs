import assert from 'node:assert/strict';
import test from 'node:test';

import { validateEvidenceMarkers, validateVerdictContract } from './panel-artifact.mjs';

test('rejects a verdict whose first token is not a permitted verdict', () => {
  const reply = `## VERDICT
The verdict is APPROVE — the packet is sound.

## BLOCKERS
Scenario: no blocker reproduced; describe the checked evidence.

## ATTACKS
Correctness: checked.

## HIGHEST RISK
Evidence: checked.

## CONFIDENCE
Confidence: high.
`;

  assert.equal(
    validateVerdictContract(reply),
    'VERDICT must begin with exactly APPROVE, REVISE, or REJECT',
  );
});

test('rejects APPROVE when the blockers section contains a P0 or P1 blocker', () => {
  const reply = `## VERDICT
APPROVE — the packet is ready.

## BLOCKERS
1. P1 — Scenario: a signed receipt is forged. Evidence: the verifier accepts it. Correction: pin the key.

## ATTACKS
Security: checked.

## HIGHEST RISK
Evidence: the receipt boundary.

## CONFIDENCE
Confidence: medium.
`;

  assert.equal(
    validateVerdictContract(reply),
    'APPROVE conflicts with a P0/P1 blocker in BLOCKERS',
  );
});

test('accepts APPROVE when BLOCKERS contains only a P2 observation', () => {
  const reply = `## VERDICT
APPROVE — no release-blocking defect remains.

## BLOCKERS
1. P2 — Scenario: a future operator omits an optional receipt. Evidence: the packet documents the fallback. Correction: add a reminder.

## ATTACKS
Correctness: checked.

## HIGHEST RISK
Evidence: no release blocker.

## CONFIDENCE
Confidence: high.
`;

  assert.equal(validateVerdictContract(reply), null);
});

test('accepts REVISE when BLOCKERS contains a P1 blocker', () => {
  const reply = `## VERDICT
REVISE — a release-blocking defect remains.

## BLOCKERS
1. P1 — Scenario: a schema is malformed. Evidence: parser failure. Correction: repair it.

## ATTACKS
Correctness: checked.

## HIGHEST RISK
Evidence: the malformed schema.

## CONFIDENCE
Confidence: high.
`;

  assert.equal(validateVerdictContract(reply), null);
});

test('accepts a no-blocker APPROVE without a repair marker', () => {
  const reply = `## VERDICT
APPROVE — no release-blocking defect remains.

## BLOCKERS
No P0/P1/P2 blocker reproduced.
Scenario: no blocker reproduced; describe the checked evidence.

## ATTACKS
Verified: boundary and replay checks passed.

## HIGHEST RISK
Evidence: the remaining risk is gated measurement.

## CONFIDENCE
Confidence: high.
`;

  assert.equal(validateEvidenceMarkers(reply), null);
});

test('requires a repair marker when BLOCKERS contains a numbered finding', () => {
  const reply = `## VERDICT
REVISE — one contract gap remains.

## BLOCKERS
1. P2 — Scenario: an optional receipt is omitted. Evidence: the packet permits drift.

## ATTACKS
Verified: the rest of the state machine.

## HIGHEST RISK
Evidence: the omitted receipt.

## CONFIDENCE
Confidence: high.
`;

  assert.match(validateEvidenceMarkers(reply), /Correction:|Test:|Vector:/);
});
