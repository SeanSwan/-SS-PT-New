#!/usr/bin/env node
/**
 * Scores distilled external-reference candidates against Swan's proven baseline.
 * Labels are notifications only; they never authorize implementation or canon promotion.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const GAP_POINTS = {
  missing: 25,
  unmounted: 22,
  fragmented: 20,
  experimental: 15,
  doctrine_only: 12,
  shared_capability: 8,
  mounted: 0,
  unknown: 0,
};

const LABEL_RANK = ['REJECT', 'WATCH', 'TRIAL', 'USE_NOW'];

const clampUnit = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const capLabel = (label, maximum) => (
  LABEL_RANK.indexOf(label) > LABEL_RANK.indexOf(maximum) ? maximum : label
);

export function evaluateCandidate(candidate, baseline, policy) {
  const status = baseline?.status ?? 'unknown';
  const flags = [];
  const reasons = [];

  if ((candidate.hard_conflicts ?? []).length > 0) {
    return {
      id: candidate.id,
      capability_id: candidate.capability_id,
      label: 'REJECT',
      score: 0,
      flags: ['CANON_CONFLICT'],
      reasons: [`Hard conflict: ${candidate.hard_conflicts.join(', ')}`],
    };
  }

  let score = GAP_POINTS[status] ?? GAP_POINTS.missing;
  score += clampUnit(candidate.usability) * 15;
  score += clampUnit(candidate.swan_fit) * 15;
  score += clampUnit(candidate.taste_fit) * 10;
  score += clampUnit(candidate.strategic_fit) * 20;
  score += Math.min(Number(candidate.evidence_count) || 0, 5) * 2;
  score += clampUnit(candidate.confidence) * 10;
  score -= clampUnit(candidate.implementation_cost) * 15;
  score -= clampUnit(candidate.risk) * 15;

  if (candidate.duplicates_existing || status === 'mounted') {
    score -= 30;
    flags.push('DUPLICATE');
    reasons.push('Swan already has a mounted equivalent; require a measurable improvement.');
  }
  if (status === 'fragmented') {
    reasons.push('Existing capability is fragmented across the user journey.');
  }
  if (status === 'unmounted') {
    reasons.push('Prefer integration of the existing unmounted component over a new invention.');
  }
  if (status === 'experimental') {
    reasons.push('An experimental Swan concept exists but is not a production capability.');
  }
  if (status === 'unknown') {
    flags.push('NEEDS_BASELINE_PROOF');
    reasons.push('Swan capability status is unknown; absence has not been proven.');
  }

  score = Math.round(Math.max(0, Math.min(100, score)));
  let label = score >= policy.use_now_min
    ? 'USE_NOW'
    : score >= policy.trial_min
      ? 'TRIAL'
      : score >= policy.watch_min
        ? 'WATCH'
        : 'REJECT';

  if (
    label === 'USE_NOW'
    && (
      Number(candidate.evidence_count) < policy.minimum_use_now_evidence
      || clampUnit(candidate.confidence) < policy.minimum_use_now_confidence
    )
  ) {
    label = 'TRIAL';
    flags.push('EVIDENCE_LIMITED');
  }

  if (status === 'unknown') {
    label = capLabel(label, 'TRIAL');
  }

  if (candidate.requires_client_green) {
    flags.push('TOKEN_PROPOSAL');
    reasons.push('Sean likes black/white/green, but client green needs explicit token review.');
    label = capLabel(label, 'TRIAL');
  }
  if (candidate.requires_browser_proof) {
    flags.push('NEEDS_BROWSER_PROOF');
    reasons.push('Authenticated or rendered behavior needs browser proof before USE_NOW.');
    label = capLabel(label, 'TRIAL');
  }

  return {
    id: candidate.id,
    capability_id: candidate.capability_id,
    label,
    score,
    flags,
    reasons,
  };
}

export function evaluatePortfolio(candidates, baselineDocument, policy) {
  const capabilities = new Map(
    (baselineDocument.capabilities ?? []).map((item) => [item.id, item]),
  );
  return candidates
    .map((candidate) => evaluateCandidate(
      candidate,
      capabilities.get(candidate.capability_id),
      policy,
    ))
    .sort((left, right) => (
      LABEL_RANK.indexOf(right.label) - LABEL_RANK.indexOf(left.label)
      || right.score - left.score
    ));
}

async function runCli() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...value] = arg.replace(/^--/, '').split('=');
      return [key, value.join('=')];
    }),
  );
  if (!args.candidates || !args.baseline || !args.policy || !args.output) {
    throw new Error('Required: --candidates= --baseline= --policy= --output=');
  }

  const [candidates, baseline, policy] = await Promise.all(
    [args.candidates, args.baseline, args.policy].map(async (path) => (
      JSON.parse(await readFile(path, 'utf8'))
    )),
  );
  const evaluated = evaluatePortfolio(candidates, baseline, policy);
  await writeFile(args.output, `${JSON.stringify(evaluated, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${evaluated.length} recommendations to ${args.output}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
