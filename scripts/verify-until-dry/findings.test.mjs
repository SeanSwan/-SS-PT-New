/**
 * @file findings.test.mjs
 * @description Tests independent validation and evidence-bound finding closure.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createFinding, hasCanonicalFindingClosure, transitionFinding } from './findings.mjs';

test('builder-authored hypotheses require independent validation', () => {
  const finding = createFinding({ id: 'F1', author: 'builder', severity: 'high', claim: 'Race exists.',
    failureSignature: 'race-condition' });
  assert.equal(finding.status, 'PROPOSED');
  assert.throws(
    () => transitionFinding(finding, { action: 'validate', actor: 'builder', evidenceHash: 'a'.repeat(64) }),
    /independent/i,
  );
  const validated = transitionFinding(finding, { action: 'validate', actor: 'reviewer-a', evidenceHash: 'a'.repeat(64) });
  assert.equal(validated.status, 'VALIDATED');
});

test('validated findings close only with fixed, nonrepro, or approved exemption proof', () => {
  const proposed = createFinding({ id: 'F2', author: 'reviewer-a', severity: 'medium', claim: 'Input crashes.',
    failureSignature: 'input-crash' });
  const finding = transitionFinding(proposed, { action: 'validate', actor: 'reviewer-b', evidenceHash: 'b'.repeat(64) });
  assert.throws(() => transitionFinding(finding, { action: 'close', actor: 'builder' }), /closure/i);
  const closed = transitionFinding(finding, {
    action: 'close', actor: 'reviewer-b', disposition: 'FIXED', evidenceHash: 'c'.repeat(64),
  });
  assert.equal(closed.status, 'CLOSED');
  assert.equal(closed.disposition, 'FIXED');
  assert.equal(hasCanonicalFindingClosure(closed), true);
  assert.equal(hasCanonicalFindingClosure({ id: 'F2', status: 'CLOSED' }), false);
});

test('invalid severity, transitions, and fake hashes fail closed', () => {
  assert.throws(() => createFinding({ id: 'F', author: 'r', severity: 'urgent', claim: 'x',
    failureSignature: 'invalid-severity' }), /severity/i);
  for (const failureSignature of ['', '   ', '\u200B']) {
    assert.throws(() => createFinding({ id: 'F-signature', author: 'r', severity: 'low',
      claim: 'x', failureSignature }), /signature/i);
  }
  const finding = createFinding({ id: 'F3', author: 'r', severity: 'low', claim: 'x',
    failureSignature: 'failure-x' });
  assert.throws(() => transitionFinding(finding, { action: 'validate', actor: 'r2', evidenceHash: 'nope' }), /hash/i);
  assert.throws(() => transitionFinding(finding, { action: 'close', actor: 'r2', disposition: 'FIXED', evidenceHash: 'a'.repeat(64) }), /validated/i);
});
