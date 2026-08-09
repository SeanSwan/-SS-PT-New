#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/verdict.mjs
 * PURPOSE: Compute the only authoritative verdict vocabulary from evidence.
 * INVARIANT: No natural-language agent output can directly select CLEAN.
 * DESIGN: Pure function; no filesystem, network, clock, or process dependencies.
 */

import { verifyLedger } from './ledger.mjs';
import { validateCompletedReviews } from './review-proof.mjs';
import { findingIdentityHash, hasCanonicalFindingClosure, hasUnsafeComparableCharacters,
  normalizeComparableText } from './findings.mjs';
import { validateRegressionProof } from './regression-proof.mjs';
import { sha256 } from './ledger.mjs';

export const VERDICTS = Object.freeze({
  BLOCKED: 'BLOCKED',
  CLEAN: 'CLEAN_IN_PROVEN_SCOPE',
  DIRTY: 'DIRTY',
  ESCALATED: 'ESCALATED',
  UNPROVEN: 'UNPROVEN',
});

function result(verdict, input, reasons) {
  return {
    verdict,
    scopeHash: input.scopeHash ?? null,
    headSha: input.headSha ?? null,
    provenance: input.ledger?.at(-1)?.provenance ?? null,
    reasons,
  };
}

function axesDifference(left = [], right = []) {
  const a = new Set(left);
  const b = new Set(right);
  return [...a].filter((item) => !b.has(item)).length
    + [...b].filter((item) => !a.has(item)).length;
}

function missingOrStaleGates(input) {
  return (input.requiredGates ?? []).filter((name) => {
    const gate = input.gates?.[name];
    return !gate || gate.current !== true || !['pass', 'fail'].includes(gate.status);
  });
}

function failedCurrentGates(input) {
  return (input.requiredGates ?? []).filter((name) => {
    const gate = input.gates?.[name];
    return gate?.current === true && gate.status === 'fail';
  });
}

function closureEvidenceIsCurrent(finding, input) {
  if (!hasCanonicalFindingClosure(finding)) return false;
  const validation = input.ledger.find((entry) => entry.hash === finding.validation.evidenceHash);
  const closure = input.ledger.find((entry) => entry.hash === finding.closure.evidenceHash);
  const common = validation?.type === 'finding-validation' && validation.findingId === finding.id &&
    validation.actor === finding.validation.actor && validation.sourceHash === input.sourceHash &&
    validation.scopeHash === input.scopeHash && validation.findingHash === findingIdentityHash(finding) &&
    closure?.type === 'finding-closure' && closure.findingId === finding.id &&
    closure.actor === finding.closure.actor && closure.disposition === finding.disposition &&
    closure.sourceHash === input.sourceHash && closure.scopeHash === input.scopeHash &&
    (closure.ownerApprovalHash ?? null) === (finding.closure.ownerApprovalHash ?? null) &&
    validation.seq < closure.seq;
  if (!common) return false;
  if (finding.disposition === 'FIXED') {
    return closure.regressionProof?.failureSignature === finding.failureSignature &&
      validateRegressionProof(closure.regressionProof, {
        findingId: finding.id, tier: input.tier, sourceHash: input.sourceHash,
      });
  }
  if (finding.disposition === 'NONREPRODUCIBLE') {
    const proof = closure.nonReproductionProof;
    return proof?.schema === 'verify-until-dry.nonreproduction-proof.v1' &&
      proof.findingId === finding.id && proof.sourceHash === input.sourceHash &&
      proof.scopeHash === input.scopeHash && /^[a-f0-9]{64}$/.test(String(proof.commandHash ?? '')) &&
      typeof proof.output === 'string' && sha256(proof.output) === proof.outputHash &&
      proof.exitCode === 0 && proof.reproduced === false &&
      proof.failureSignature === finding.failureSignature &&
      !hasUnsafeComparableCharacters(proof.output) &&
      !normalizeComparableText(proof.output).includes(proof.failureSignature);
  }
  return false;
}

function finalVantagesAreValid(input, proof) {
  const rounds = proof.vantages.slice(-2);
  if (rounds.length !== 2) return false;
  if (rounds.some((round) => round.clean !== true)) return false;
  if (rounds.some((round) => round.headSha !== input.headSha)) return false;
  if (rounds.some((round) => round.scopeHash !== input.scopeHash)) return false;
  return axesDifference(rounds[0].axes, rounds[1].axes) >= 2;
}

export function computeVerdict(input = {}) {
  const ledger = verifyLedger(input.ledger);
  if (!ledger.valid) return result(VERDICTS.UNPROVEN, input, [ledger.error]);

  const findings = input.findings ?? [];
  const openFindings = findings.filter((finding) =>
    finding.status === 'VALIDATED' || (finding.validated === true && finding.status === 'open'));
  if (openFindings.length) {
    return result(VERDICTS.DIRTY, input, openFindings.map((finding) => finding.signature ?? finding.id));
  }
  const invalidClosures = findings.filter((finding) =>
    finding.status === 'CLOSED' && !closureEvidenceIsCurrent(finding, input));
  if (invalidClosures.length) {
    return result(VERDICTS.UNPROVEN, input,
      invalidClosures.map((finding) => `finding-closure-proof-required:${finding.id ?? 'unknown'}`));
  }
  const unresolvedFindings = findings.filter((finding) => finding.status !== 'CLOSED');
  if (unresolvedFindings.length) {
    return result(VERDICTS.UNPROVEN, input,
      unresolvedFindings.map((finding) => `finding-validation-required:${finding.id ?? 'unknown'}`));
  }

  const failedGates = failedCurrentGates(input);
  if (failedGates.length) {
    return result(VERDICTS.DIRTY, input, failedGates.map((gate) => `gate:${gate}`));
  }

  if ((input.escalations ?? []).length) {
    return result(VERDICTS.ESCALATED, input, [...input.escalations]);
  }
  if ((input.blockers ?? []).length) {
    return result(VERDICTS.BLOCKED, input, [...input.blockers]);
  }

  const missing = missingOrStaleGates(input);
  if (missing.length) {
    return result(VERDICTS.UNPROVEN, input, missing.map((gate) => `gate:${gate}`));
  }
  if (!input.scopeHash || input.scopeHash !== input.reviewedScopeHash) {
    return result(VERDICTS.UNPROVEN, input, ['scope-contract-mismatch']);
  }
  if (!/^[a-f0-9]{64}$/.test(String(input.reviewPacketHash ?? ''))) {
    return result(VERDICTS.UNPROVEN, input, ['review-packet-missing']);
  }
  const proof = validateCompletedReviews(input.reviews, input);
  if (proof.valid && !proof.coverageComplete) {
    return result(VERDICTS.UNPROVEN, input, ['review-path-coverage-incomplete']);
  }
  if (proof.valid && !proof.fullScopeLocalReview) {
    return result(VERDICTS.UNPROVEN, input, ['full-scope-local-review-required']);
  }
  if (!input.headSha || !proof.valid || !finalVantagesAreValid(input, proof)) {
    return result(VERDICTS.UNPROVEN, input, ['two-distinct-clean-vantages-required']);
  }
  return result(VERDICTS.CLEAN, input, []);
}
