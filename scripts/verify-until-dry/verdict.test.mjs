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

const cleanInput = () => {
  let ledger = [];
  ledger = appendEvent(ledger, { type: 'snapshot', headSha: 'head-1', scopeHash: 'scope-1' });
  return {
    ledger,
    tier: 2,
    headSha: 'head-1',
    scopeHash: 'scope-1',
    reviewedScopeHash: 'scope-1',
    requiredGates: ['unit', 'typecheck'],
    gates: {
      unit: { status: 'pass', current: true },
      typecheck: { status: 'pass', current: true },
    },
    findings: [],
    blockers: [],
    escalations: [],
    vantages: [
      { clean: true, headSha: 'head-1', scopeHash: 'scope-1', axes: ['structural', 'reviewer-a'] },
      { clean: true, headSha: 'head-1', scopeHash: 'scope-1', axes: ['behavioral', 'reviewer-b'] },
    ],
  };
};

test('only the five scoped verdicts exist', () => {
  assert.deepEqual(Object.values(VERDICTS).sort(), [
    'BLOCKED', 'CLEAN_IN_PROVEN_SCOPE', 'DIRTY', 'ESCALATED', 'UNPROVEN',
  ]);
});

test('emits scoped clean only with current gates and distinct clean vantages', () => {
  const result = computeVerdict(cleanInput());
  assert.equal(result.verdict, VERDICTS.CLEAN);
  assert.equal(result.scopeHash, 'scope-1');
});

test('open validated findings force DIRTY', () => {
  const input = cleanInput();
  input.findings.push({ status: 'open', validated: true, signature: 'a:f:logic' });
  assert.equal(computeVerdict(input).verdict, VERDICTS.DIRTY);
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
  repeated.vantages[1].axes = [...repeated.vantages[0].axes];
  assert.equal(computeVerdict(repeated).verdict, VERDICTS.UNPROVEN);

  const drifted = cleanInput();
  drifted.vantages[1].headSha = 'head-2';
  assert.equal(computeVerdict(drifted).verdict, VERDICTS.UNPROVEN);
});

test('missing gates or fewer than two clean rounds are UNPROVEN', () => {
  const missingGate = cleanInput();
  delete missingGate.gates.typecheck;
  assert.equal(computeVerdict(missingGate).verdict, VERDICTS.UNPROVEN);

  const oneRound = cleanInput();
  oneRound.vantages.pop();
  assert.equal(computeVerdict(oneRound).verdict, VERDICTS.UNPROVEN);
});
