#!/usr/bin/env node
import { runReview } from './ai-workflow/sequential-review/reviewer.mjs';

const config = {
  logName: 'consult-kimi-second-pass',
  model: 'moonshotai/kimi-k3',
  title: 'SwanStudios Kimi Second-Pass Review',
  outputHeading: 'Kimi K3 - Second-Pass Review',
  defaultOutput: 'docs/ai-workflow/AI-HANDOFF/KIMI-SECOND-PASS-REVIEW.md',
  pricing: { input: 3, output: 15 },
  requiresOpusSeed: true,
  remit: `You are Kimi K3 performing SwanStudios' second-pass hostile architecture review.
Read both the original bounded document and the frozen standalone Opus review. Independently
verify every important claim; do not defer to Opus and do not manufacture consensus. Identify
what Opus caught, missed, overstated, or got wrong. Prioritize privacy and re-identification,
security boundaries, data minimization, NASM workout-safety governance, provider risk,
operational failure modes, model-routing value, and testability. Produce: VERDICT; agreement
and disagreement matrix; new findings; corrected architecture; phased validation plan; and
a final recommendation on when Kimi adds enough value to justify external processing.
Repository truth and Swan's zero-PII rule remain binding. Do not invent client facts.`,
};

await runReview(config);
