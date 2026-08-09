/**
 * @file convergence.mjs
 * @description Pure dry-loop state machine with oscillation and exhaustion detection.
 */
import { canonicalJson, sha256 } from './ledger.mjs';

const HASH = /^[a-f0-9]{64}$/;

const AXES = new Set(['adversarial-security', 'contract-tests', 'cross-platform', 'dynamic-runtime',
  'hostile-logic', 'state-machine', 'static-control-flow', 'user-forward-test']);

function normalizeVantage(vantage) {
  if (!vantage?.reviewer || !Array.isArray(vantage.axes) || vantage.axes.length === 0 ||
      vantage.axes.some((axis) => !AXES.has(axis))) {
    throw new Error('Each round needs a reviewer and allowed vantage axes');
  }
  return { reviewer: vantage.reviewer, axes: [...new Set(vantage.axes)].sort() };
}

function axisDifference(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  let count = 0;
  for (const axis of a) if (!b.has(axis)) count += 1;
  for (const axis of b) if (!a.has(axis)) count += 1;
  return count;
}

function inverseOverlap(previous, current) {
  if (!previous || !current) return 0;
  const priorAdded = new Set(previous.added ?? []);
  const priorRemoved = new Set(previous.removed ?? []);
  const currentAdded = new Set(current.added ?? []);
  const currentRemoved = new Set(current.removed ?? []);
  let inverse = 0;
  for (const item of priorAdded) if (currentRemoved.has(item)) inverse += 1;
  for (const item of priorRemoved) if (currentAdded.has(item)) inverse += 1;
  const denominator = Math.max(
    priorAdded.size + priorRemoved.size,
    currentAdded.size + currentRemoved.size,
    1,
  );
  return (inverse / denominator) * 100;
}

export function initialConvergence() {
  return Object.freeze({
    status: 'VERIFYING',
    reason: null,
    cleanStreak: 0,
    cleanSourceHash: null,
    cleanVantages: Object.freeze([]),
    cleanReviewers: Object.freeze([]),
    findingCounts: Object.freeze({}),
    rounds: Object.freeze([]),
    lastRepair: null,
  });
}

function escalated(state, round, reason, counts) {
  return Object.freeze({
    ...state,
    status: 'ESCALATED',
    reason,
    findingCounts: Object.freeze(counts),
    rounds: Object.freeze([...state.rounds, Object.freeze(round)]),
    lastRepair: round.repair ?? state.lastRepair,
  });
}

export function recordRound(state, roundInput, config) {
  if (state.status !== 'VERIFYING') throw new Error(`Convergence state is terminal: ${state.status}`);
  if (!HASH.test(String(roundInput?.sourceHash ?? ''))) throw new Error('Round source hash is invalid');
  const findings = [...new Set(roundInput.findings ?? [])].sort();
  const vantage = normalizeVantage(roundInput.vantage);
  const vantageHash = sha256(canonicalJson(vantage.axes));
  const round = {
    number: state.rounds.length + 1,
    sourceHash: roundInput.sourceHash,
    vantage: Object.freeze(vantage),
    vantageHash,
    findings: Object.freeze(findings),
    repair: roundInput.repair ? Object.freeze({
      added: Object.freeze([...(roundInput.repair.added ?? [])]),
      removed: Object.freeze([...(roundInput.repair.removed ?? [])]),
    }) : null,
  };
  const counts = { ...state.findingCounts };
  for (const finding of findings) counts[finding] = (counts[finding] ?? 0) + 1;
  const repeated = findings.find((finding) => counts[finding] > config.convergence.repeatedFindingLimit);
  if (repeated) return escalated(state, round, `repeated-finding:${repeated}`, counts);
  if (inverseOverlap(state.lastRepair, round.repair) >= config.convergence.inverseFixOverlapPercent) {
    return escalated(state, round, 'inverse-repair-oscillation', counts);
  }
  if (findings.length && round.number >= config.convergence.maxRepairRounds) {
    return escalated(state, round, 'repair-round-limit-exhausted', counts);
  }

  let cleanStreak = 0;
  let cleanSourceHash = null;
  let cleanVantages = [];
  let cleanReviewers = [];
  if (findings.length === 0) {
    const sameSource = state.cleanSourceHash === round.sourceHash;
    cleanSourceHash = round.sourceHash;
    cleanVantages = sameSource ? [...state.cleanVantages] : [];
    cleanReviewers = sameSource ? [...state.cleanReviewers] : [];
    const priorClean = sameSource ? state.rounds.filter((item) =>
      item.sourceHash === round.sourceHash && item.findings.length === 0) : [];
    const distinctEnough = priorClean.length === 0 || priorClean.some((item) =>
      item.vantage.reviewer !== vantage.reviewer && axisDifference(item.vantage.axes, vantage.axes) >= 2);
    if (distinctEnough && !cleanVantages.includes(vantageHash) && !cleanReviewers.includes(vantage.reviewer)) {
      cleanVantages.push(vantageHash);
      cleanReviewers.push(vantage.reviewer);
    }
    cleanStreak = cleanVantages.length;
  }
  return Object.freeze({
    status: cleanStreak >= 2 ? 'DRY' : 'VERIFYING',
    reason: cleanStreak >= 2 ? 'two-distinct-clean-vantages' : null,
    cleanStreak,
    cleanSourceHash,
    cleanVantages: Object.freeze(cleanVantages),
    cleanReviewers: Object.freeze(cleanReviewers),
    findingCounts: Object.freeze(counts),
    rounds: Object.freeze([...state.rounds, Object.freeze(round)]),
    lastRepair: round.repair ?? state.lastRepair,
  });
}
