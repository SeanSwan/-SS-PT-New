#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/verdict.mjs
 * PURPOSE: Compute the only authoritative verdict vocabulary from evidence.
 * INVARIANT: No natural-language agent output can directly select CLEAN.
 * DESIGN: Pure function; no filesystem, network, clock, or process dependencies.
 */

import { verifyLedger } from './ledger.mjs';
import { validateCompletedReviews } from './review-proof.mjs';

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

function finalVantagesAreValid(input) {
  const proof = validateCompletedReviews(input.reviews, input);
  if (!proof.valid) return false;
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

  const openFindings = (input.findings ?? []).filter((finding) =>
    finding.status === 'VALIDATED' || (finding.validated === true && finding.status === 'open'));
  if (openFindings.length) {
    return result(VERDICTS.DIRTY, input, openFindings.map((finding) => finding.signature ?? finding.id));
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
  if (!input.headSha || !finalVantagesAreValid(input)) {
    return result(VERDICTS.UNPROVEN, input, ['two-distinct-clean-vantages-required']);
  }
  return result(VERDICTS.CLEAN, input, []);
}
