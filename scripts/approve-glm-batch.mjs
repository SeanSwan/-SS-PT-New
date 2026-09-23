#!/usr/bin/env node
/**
 * Opens the next bounded GLM review batch after the 15-round checkpoint.
 *
 * This command is deliberately separate from consult-panel.mjs so no review
 * loop can approve itself. Run it only after Sean gives explicit approval in
 * the current conversation. It stores one payload-free marker in the local
 * usage ledger; it never reads or writes an API key, prompt, document path, or
 * provider response.
 *
 * Usage:
 *   node scripts/approve-glm-batch.mjs --confirmation "APPROVE NEXT 15 GLM REVIEW ROUNDS"
 */
import {
  approveNextGlmBatch,
  GLM_BATCH_APPROVAL_PHRASE,
} from './lib/glm-consumption-guard.mjs';

const argv = process.argv.slice(2);
const confirmationIndex = argv.indexOf('--confirmation');
const confirmation = confirmationIndex >= 0 ? argv[confirmationIndex + 1] : '';

if (!confirmation) {
  console.error('[approve-glm-batch] BLOCKED: explicit owner approval is required.');
  console.error(`After approval, pass: --confirmation "${GLM_BATCH_APPROVAL_PHRASE}"`);
  process.exit(2);
}

try {
  const result = approveNextGlmBatch({ confirmation });
  console.log(
    `[approve-glm-batch] owner checkpoint recorded; closed ${result.roundsClosed} review rounds, ` +
    `opened at most ${result.roundsApproved} more.`,
  );
} catch (error) {
  console.error(`[approve-glm-batch] BLOCKED: ${error.message}`);
  process.exit(2);
}
