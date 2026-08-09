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
import { appendEvent, sha256 } from './ledger.mjs';
import { buildCompletedReview } from './review-proof.mjs';
import { createFinding, findingIdentityHash, transitionFinding } from './findings.mjs';
import { createRegressionProof } from './regression-proof.mjs';

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
    scopeContract: { paths: ['src/safe.mjs', 'backend/routes/authRoutes.mjs'] },
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
      origin: 'local-full-scope',
      headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
      reviewPacketHash: input.reviewPacketHash, axes: ['static-control-flow'],
      reviewedPaths: input.scopeContract.paths,
      output: 'VERDICT: CLEAN\nNo findings.', findings: [] }),
    buildCompletedReview({ id: 'R2', builder: 'builder', reviewer: 'reviewer-b',
      origin: 'local-full-scope',
      headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
      reviewPacketHash: input.reviewPacketHash, axes: ['dynamic-runtime'],
      reviewedPaths: input.scopeContract.paths,
      output: 'VERDICT: CLEAN\nNo findings.', findings: [] }),
  ];
  return input;
};

function regressionProof(input, findingId, failureSignature = 'reproduced defect') {
  const redOutput = `FAIL ${failureSignature}`;
  const greenOutput = 'PASS repaired behavior';
  const mutationOutput = 'FAIL killed mutation';
  return createRegressionProof({
    findingId, testId: 'finding-regression', tier: input.tier,
    testHash: '4'.repeat(64), greenTestHash: '4'.repeat(64), commandHash: '5'.repeat(64),
    failureSignature,
    red: { sourceHash: '6'.repeat(64), exitCode: 1, output: redOutput,
      outputHash: sha256(redOutput) },
    green: { sourceHash: input.sourceHash, exitCode: 0, output: greenOutput,
      outputHash: sha256(greenOutput) },
    mutation: { sourceHash: '7'.repeat(64), testHash: '4'.repeat(64),
      commandHash: '5'.repeat(64), exitCode: 1, output: mutationOutput,
      outputHash: sha256(mutationOutput), failureSignature: 'killed mutation' },
  });
}

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

test('safe-subset reviews cannot clean a scope with unreviewed excluded paths', () => {
  const input = cleanInput();
  input.reviews = input.reviews.map((review) => buildCompletedReview({
    ...review, reviewPacketHash: input.reviewPacketHash, reviewedPaths: ['src/safe.mjs'],
  }));
  const result = computeVerdict(input);
  assert.equal(result.verdict, VERDICTS.UNPROVEN);
  assert.deepEqual(result.reasons, ['review-path-coverage-incomplete']);
});

test('split partial reviews cannot replace one full-scope local review', () => {
  const input = cleanInput();
  input.reviews = [
    buildCompletedReview({ ...input.reviews[0], reviewer: 'kimi-k3',
      origin: 'kimi-external', reviewPacketHash: input.reviewPacketHash,
      reviewedPaths: ['src/safe.mjs'] }),
    buildCompletedReview({ ...input.reviews[1], reviewPacketHash: input.reviewPacketHash,
      reviewedPaths: ['backend/routes/authRoutes.mjs'] }),
  ];
  const result = computeVerdict(input);
  assert.equal(result.verdict, VERDICTS.UNPROVEN);
  assert.deepEqual(result.reasons, ['full-scope-local-review-required']);
});

test('a dirty full-scope local review cannot satisfy the clean full-scope requirement', () => {
  const input = cleanInput();
  input.reviews = [
    buildCompletedReview({ id: 'R0', builder: 'builder', reviewer: 'local-full-dirty',
      origin: 'local-full-scope', headSha: input.headSha, sourceHash: input.sourceHash,
      scopeHash: input.scopeHash, reviewPacketHash: input.reviewPacketHash,
      axes: ['hostile-logic'], reviewedPaths: input.scopeContract.paths,
      output: 'VERDICT: REVISE\nFINDING: full-scope defect remains.',
      findings: [{ id: 'F0', status: 'PROPOSED' }] }),
    buildCompletedReview({ id: 'R1', builder: 'builder', reviewer: 'kimi-k3',
      origin: 'kimi-external', headSha: input.headSha, sourceHash: input.sourceHash,
      scopeHash: input.scopeHash, reviewPacketHash: input.reviewPacketHash,
      axes: ['static-control-flow'], reviewedPaths: ['src/safe.mjs'],
      output: 'VERDICT: CLEAN\nNo findings.', findings: [] }),
    buildCompletedReview({ id: 'R2', builder: 'builder', reviewer: 'local-partial',
      origin: 'local-full-scope', headSha: input.headSha, sourceHash: input.sourceHash,
      scopeHash: input.scopeHash, reviewPacketHash: input.reviewPacketHash,
      axes: ['dynamic-runtime'], reviewedPaths: ['backend/routes/authRoutes.mjs'],
      output: 'VERDICT: CLEAN\nNo findings.', findings: [] }),
  ];
  const result = computeVerdict(input);
  assert.equal(result.verdict, VERDICTS.UNPROVEN);
  assert.deepEqual(result.reasons, ['full-scope-local-review-required']);
});

test('an unresolved proposed finding cannot be bypassed by two later clean reviews', () => {
  const input = cleanInput();
  const proposed = { id: 'F-proposed', author: 'reviewer-dirty', severity: 'high',
    claim: 'A reproducible defect remains.', status: 'PROPOSED', history: [] };
  input.findings = [proposed];
  input.reviews.unshift(buildCompletedReview({
    id: 'R0', builder: 'builder', reviewer: 'reviewer-dirty', origin: 'local-full-scope',
    headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
    reviewPacketHash: input.reviewPacketHash, axes: ['hostile-logic'],
    reviewedPaths: input.scopeContract.paths,
    output: 'VERDICT: REVISE\nFINDING: A reproducible defect remains.', findings: [proposed],
  }));
  const result = computeVerdict(input);
  assert.equal(result.verdict, VERDICTS.UNPROVEN);
  assert.deepEqual(result.reasons, ['finding-validation-required:F-proposed']);
});

test('a bare CLOSED label cannot substitute for canonical closure evidence', () => {
  const input = cleanInput();
  const forged = { id: 'F-forged', status: 'CLOSED' };
  input.findings = [forged];
  input.reviews.unshift(buildCompletedReview({
    id: 'R0', builder: 'builder', reviewer: 'reviewer-dirty', origin: 'local-full-scope',
    headSha: input.headSha, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
    reviewPacketHash: input.reviewPacketHash, axes: ['hostile-logic'],
    reviewedPaths: input.scopeContract.paths,
    output: 'VERDICT: REVISE\nFINDING: forged closure state.', findings: [forged],
  }));
  const result = computeVerdict(input);
  assert.equal(result.verdict, VERDICTS.UNPROVEN);
  assert.deepEqual(result.reasons, ['finding-closure-proof-required:F-forged']);
});

test('canonical closure must be bound to current ledger, source, and scope evidence', () => {
  const unbound = cleanInput();
  const proposed = createFinding({ id: 'F-closed', author: 'reviewer-dirty',
    severity: 'high', claim: 'A validated defect.', failureSignature: 'reproduced defect' });
  const validated = transitionFinding(proposed, { action: 'validate', actor: 'reviewer-validator',
    evidenceHash: 'c'.repeat(64) });
  const closed = transitionFinding(validated, { action: 'close', actor: 'reviewer-closer',
    disposition: 'FIXED', evidenceHash: 'd'.repeat(64) });
  unbound.findings = [closed];
  assert.deepEqual(computeVerdict(unbound).reasons,
    ['finding-closure-proof-required:F-closed']);

  const bound = cleanInput();
  const proof = regressionProof(bound, proposed.id);
  bound.ledger = appendEvent(bound.ledger, {
    type: 'finding-validation', findingId: proposed.id, actor: 'reviewer-validator',
    sourceHash: bound.sourceHash, scopeHash: bound.scopeHash, findingHash: findingIdentityHash(proposed),
  });
  const boundValidated = transitionFinding(proposed, { action: 'validate',
    actor: 'reviewer-validator', evidenceHash: bound.ledger.at(-1).hash });
  bound.ledger = appendEvent(bound.ledger, {
    type: 'finding-closure', findingId: proposed.id, actor: 'reviewer-closer',
    disposition: 'FIXED', sourceHash: bound.sourceHash, scopeHash: bound.scopeHash,
    regressionProof: proof,
  });
  bound.findings = [transitionFinding(boundValidated, { action: 'close', actor: 'reviewer-closer',
    disposition: 'FIXED', evidenceHash: bound.ledger.at(-1).hash })];
  assert.equal(computeVerdict(bound).verdict, VERDICTS.CLEAN);
});

test('FIXED closure requires validation-before-closure and matching current regression proof', () => {
  const buildClosed = (input, closureFirst, includeProof, failureSignature = 'reproduced defect',
    validationSignature = failureSignature, proofSignature = failureSignature) => {
    const proposed = createFinding({ id: 'F-order', author: 'reviewer-dirty',
      severity: 'high', claim: 'Ordering defect.', failureSignature });
    const validatedIdentity = createFinding({ id: proposed.id, author: proposed.author,
      severity: proposed.severity, claim: proposed.claim, failureSignature: validationSignature });
    const validationEvent = { type: 'finding-validation', findingId: proposed.id,
      actor: 'reviewer-validator', sourceHash: input.sourceHash, scopeHash: input.scopeHash,
      findingHash: findingIdentityHash(validatedIdentity) };
    const closureEvent = { type: 'finding-closure', findingId: proposed.id,
      actor: 'reviewer-closer', disposition: 'FIXED', sourceHash: input.sourceHash,
      scopeHash: input.scopeHash,
      ...(includeProof ? { regressionProof: regressionProof(input, proposed.id, proofSignature) } : {}) };
    input.ledger = appendEvent(input.ledger, closureFirst ? closureEvent : validationEvent);
    const firstHash = input.ledger.at(-1).hash;
    input.ledger = appendEvent(input.ledger, closureFirst ? validationEvent : closureEvent);
    const secondHash = input.ledger.at(-1).hash;
    const validated = transitionFinding(proposed, { action: 'validate', actor: 'reviewer-validator',
      evidenceHash: closureFirst ? secondHash : firstHash });
    input.findings = [transitionFinding(validated, { action: 'close', actor: 'reviewer-closer',
      disposition: 'FIXED', evidenceHash: closureFirst ? firstHash : secondHash })];
    return input;
  };
  assert.deepEqual(computeVerdict(buildClosed(cleanInput(), true, true)).reasons,
    ['finding-closure-proof-required:F-order']);
  assert.deepEqual(computeVerdict(buildClosed(cleanInput(), false, false)).reasons,
    ['finding-closure-proof-required:F-order']);
  assert.deepEqual(computeVerdict(buildClosed(
    cleanInput(), false, true, 'authorization bypass remains reproducible',
    'authorization bypass remains reproducible', 'ui button color')).reasons,
  ['finding-closure-proof-required:F-order']);
  assert.deepEqual(computeVerdict(buildClosed(cleanInput(), false, true,
    'ui button color', 'authorization failure')).reasons,
  ['finding-closure-proof-required:F-order']);
});

test('NONREPRODUCIBLE needs captured execution and local owner exemptions stay unproven', () => {
  const closedInput = (disposition, closureEvidence = {},
    failureSignature = 'expected failure signature') => {
    const input = cleanInput();
    const proposed = createFinding({ id: `F-${disposition}`, author: 'reviewer-dirty',
      severity: 'medium', claim: 'Disposition-specific defect.', failureSignature });
    input.ledger = appendEvent(input.ledger, { type: 'finding-validation', findingId: proposed.id,
      actor: 'reviewer-validator', sourceHash: input.sourceHash, scopeHash: input.scopeHash,
      findingHash: findingIdentityHash(proposed) });
    const validated = transitionFinding(proposed, { action: 'validate', actor: 'reviewer-validator',
      evidenceHash: input.ledger.at(-1).hash });
    const ownerApprovalHash = disposition === 'OWNER_EXEMPTION' ? '8'.repeat(64) : undefined;
    input.ledger = appendEvent(input.ledger, { type: 'finding-closure', findingId: proposed.id,
      actor: 'reviewer-closer', disposition, sourceHash: input.sourceHash, scopeHash: input.scopeHash,
      ownerApprovalHash, ...closureEvidence });
    input.findings = [transitionFinding(validated, { action: 'close', actor: 'reviewer-closer',
      disposition, evidenceHash: input.ledger.at(-1).hash, ownerApprovalHash })];
    return input;
  };
  assert.deepEqual(computeVerdict(closedInput('NONREPRODUCIBLE')).reasons,
    ['finding-closure-proof-required:F-NONREPRODUCIBLE']);
  assert.deepEqual(computeVerdict(closedInput('OWNER_EXEMPTION')).reasons,
    ['finding-closure-proof-required:F-OWNER_EXEMPTION']);

  const unrelatedOutput = 'ACTUAL DEFECT: expected failure signature remains reproducible';
  const unrelated = closedInput('NONREPRODUCIBLE', { nonReproductionProof: {
    schema: 'verify-until-dry.nonreproduction-proof.v1',
    findingId: 'F-NONREPRODUCIBLE', sourceHash: 'a'.repeat(64), scopeHash: '2'.repeat(64),
    commandHash: '9'.repeat(64), output: unrelatedOutput, outputHash: sha256(unrelatedOutput),
    exitCode: 0, reproduced: false, failureSignature: 'unrelated expected token',
  } });
  assert.deepEqual(computeVerdict(unrelated).reasons,
    ['finding-closure-proof-required:F-NONREPRODUCIBLE']);

  for (const [failureSignature, equivalentOutput] of [
    ['calculation mismatch', 'ACTUAL: calculation   mismatch'],
    ['calculation mismatch', 'ACTUAL: Calculation Mismatch'],
    ['calculation mismatch', 'ACTUAL: calcu\u200Blation mismatch'],
    ['calculation mismatch', 'ACTUAL: calcu\u001B[31mlation mismatch'],
    ['café mismatch', 'ACTUAL: cafe\u0301 mismatch'],
  ]) {
    const equivalent = closedInput('NONREPRODUCIBLE', { nonReproductionProof: {
      schema: 'verify-until-dry.nonreproduction-proof.v1',
      findingId: 'F-NONREPRODUCIBLE', sourceHash: 'a'.repeat(64), scopeHash: '2'.repeat(64),
      commandHash: '9'.repeat(64), output: equivalentOutput, outputHash: sha256(equivalentOutput),
      exitCode: 0, reproduced: false, failureSignature,
    } }, failureSignature);
    assert.deepEqual(computeVerdict(equivalent).reasons,
      ['finding-closure-proof-required:F-NONREPRODUCIBLE']);
  }

  const output = 'No matching failure observed.';
  const proven = closedInput('NONREPRODUCIBLE', { nonReproductionProof: {
    schema: 'verify-until-dry.nonreproduction-proof.v1',
    findingId: 'F-NONREPRODUCIBLE', sourceHash: 'a'.repeat(64), scopeHash: '2'.repeat(64),
    commandHash: '9'.repeat(64), output, outputHash: sha256(output), exitCode: 0,
    reproduced: false, failureSignature: 'expected failure signature',
  } });
  assert.equal(computeVerdict(proven).verdict, VERDICTS.CLEAN);
});

test('a later dirty review prevents historical clean rounds from being reused', () => {
  const input = cleanInput();
  input.reviews.push(buildCompletedReview({
    id: 'R3', builder: 'builder', reviewer: 'reviewer-c', headSha: input.headSha,
    origin: 'local-full-scope',
    sourceHash: input.sourceHash, scopeHash: input.scopeHash, reviewPacketHash: input.reviewPacketHash,
    axes: ['adversarial-security'], reviewedPaths: input.scopeContract.paths,
    output: 'VERDICT: REVISE\nCritical bug.',
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
