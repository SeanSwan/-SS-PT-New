#!/usr/bin/env node
import { runReview } from './ai-workflow/sequential-review/reviewer.mjs';

const config = {
  logName: 'consult-opus',
  model: 'anthropic/claude-opus-5',
  title: 'SwanStudios Standalone Opus Review',
  outputHeading: 'Claude Opus 5 - Review',
  defaultOutput: 'docs/ai-workflow/AI-HANDOFF/OPUS-STANDALONE-REVIEW.md',
  pricing: { input: 5, output: 25 },
  requiresOpusSeed: false,
  remit: `You are Claude Opus 5 acting alone as SwanStudios' first-pass architecture reviewer.
You have not seen another model's answer and must not simulate consensus. Perform a hostile,
independent review of the bounded document. Prioritize privacy and re-identification threats,
security boundaries, data minimization, provider risk, NASM workout-safety governance,
operational failure modes, model-routing value, and testability. Distinguish engineering controls
from questions requiring qualified privacy counsel. Give: VERDICT; severity-ranked findings;
the strongest counterargument to the proposal; a revised architecture; phased validation;
and a clear statement of what must not be sent to any external model. Repository truth and
Swan's zero-PII rule remain binding. Do not invent client facts.`,
};

await runReview(config);
