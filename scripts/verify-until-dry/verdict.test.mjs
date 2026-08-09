#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/verdict.test.mjs
 * PURPOSE: Lock the pure verdict function against every easy false-clean path.
 * TRUST: Agents may request verdicts; only this deterministic contract emits one.
 * RUN: node --test scripts/verify-until-dry/verdict.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERDICTS, computeVerdict } from './verdict.mjs';
import { appendEvent } from './ledger.mjs';
import { buildCompletedReview } from './review-proof.mjs';

const cleanInput = () => {
  const headSha = '1'.repeat(40);
  const scopeHash = '2'.repeat(64);
  let ledger = [];
  ledger = appendEvent(ledger, { type: 'snapshot', headSha, scopeHash });
  const input = {
    ledger,
    tier: 2,
    headSha,
    scopeHash,
    reviewedScopeHash: scopeHash, sourceHash: 'a'.repeat(64), reviewPacketHash: 'b'.repeat(64),
    requiredGates: ['unit', 'typecheck'],
    gates: {
      unit: { status: 'pass', current: true },
      typecheck: { status: 'pass', current: true },
    },
    findings: [],
    blockers: [],
    escalations: [],
    vantages: [], reviews: [],
  };
  input.reviews = [
    buildCompletedReview({ id: 'R1', builder: 'builder', reviewer: 'reviewer-a',
      headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
      reviewPacketHash: input.reviewPacketHash, axes: ['static-control-flow'],
      output: 'VERDICT: CLEAN\nNo findings.', findings: [] }),
    buildCompletedReview({ id: 'R2', builder: 'builder', reviewer: 'reviewer-b',
      headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
      reviewPacketHash: input.reviewPacketHash, axes: ['dynamic-runtime'],
      output: 'VERDICT: CLEAN\nNo findings.', findings: [] }),
  ];
  return input;
};

test('only the five scoped verdicts exist', () => {
  assert.deepEqual(Object.values(VERDICTS).sort(), [
    'BLOCKED', 'CLEAN_IN_PROVEN_SCOPE', 'DIRTY', 'ESCALATED', 'UNPROVEN',
  ]);
});

test('emits scoped clean only with current gates and distinct clean vantages', () => {
  const result = computeVerdict(cleanInput());
  assert.equal(result.verdict, VERDICTS.CLEAN);
  assert.equal(result.scopeHash, '2'.repeat(64));
});

test('open validated findings force DIRTY', () => {
  const input = cleanInput();
  input.findings.push({ status: 'open', validated: true, signature: 'a:f:logic' });
  assert.equal(computeVerdict(input).verdict, VERDICTS.DIRTY);
});

test('canonical finding lifecycle VALIDATED status forces DIRTY', () => {
  const input = cleanInput();
  input.findings.push({ id: 'F1', status: 'VALIDATED', severity: 'high' });
  const result = computeVerdict(input);
  assert.equal(result.verdict, VERDICTS.DIRTY);
  assert.deepEqual(result.reasons, ['F1']);
});

test('blocking and oscillating conditions cannot become clean', () => {
  const blocked = cleanInput();
  blocked.blockers.push('approval-required');
  assert.equal(computeVerdict(blocked).verdict, VERDICTS.BLOCKED);

  const escalated = cleanInput();
  escalated.escalations.push('oscillation');
  assert.equal(computeVerdict(escalated).verdict, VERDICTS.ESCALATED);
});

test('tampered ledgers, scope narrowing, and stale gates are UNPROVEN', () => {
  const tampered = cleanInput();
  tampered.ledger[0].headSha = 'other';
  assert.equal(computeVerdict(tampered).verdict, VERDICTS.UNPROVEN);

  const narrowed = cleanInput();
  narrowed.reviewedScopeHash = 'easier-scope';
  assert.equal(computeVerdict(narrowed).verdict, VERDICTS.UNPROVEN);

  const stale = cleanInput();
  stale.gates.typecheck.current = false;
  assert.equal(computeVerdict(stale).verdict, VERDICTS.UNPROVEN);
});

test('same-vantage reruns and changed snapshots are UNPROVEN', () => {
  const repeated = cleanInput();
  repeated.reviews[1] = buildCompletedReview({ ...repeated.reviews[1],
    reviewPacketHash: repeated.reviewPacketHash, axes: [...repeated.reviews[0].axes] });
  assert.equal(computeVerdict(repeated).verdict, VERDICTS.UNPROVEN);

  const drifted = cleanInput();
  drifted.reviews[1] = buildCompletedReview({ ...drifted.reviews[1], headSha: '3'.repeat(40),
    reviewPacketHash: drifted.reviewPacketHash });
  assert.equal(computeVerdict(drifted).verdict, VERDICTS.UNPROVEN);
});

test('missing gates or fewer than two clean rounds are UNPROVEN', () => {
  const missingGate = cleanInput();
  delete missingGate.gates.typecheck;
  assert.equal(computeVerdict(missingGate).verdict, VERDICTS.UNPROVEN);

  const oneRound = cleanInput();
  oneRound.reviews.pop();
  assert.equal(computeVerdict(oneRound).verdict, VERDICTS.UNPROVEN);
});

test('a later dirty review prevents historical clean rounds from being reused', () => {
  const input = cleanInput();
  input.reviews.push(buildCompletedReview({
    id: 'R3', builder: 'builder', reviewer: 'reviewer-c', headSha: input.headSha,
    sourceHash: input.sourceHash, scopeHash: input.scopeHash, reviewPacketHash: input.reviewPacketHash,
    axes: ['adversarial-security'], output: 'VERDICT: REVISE\nCritical bug.',
    findings: [{ id: 'F3', status: 'PROPOSED' }],
  }));
  assert.equal(computeVerdict(input).verdict, VERDICTS.UNPROVEN);
});

test('a current executed gate failure is DIRTY, not merely unproven', () => {
  const failed = cleanInput();
  failed.gates.unit = { status: 'fail', current: true };
  const result = computeVerdict(failed);
  assert.equal(result.verdict, VERDICTS.DIRTY);
  assert.deepEqual(result.reasons, ['gate:unit']);
});
