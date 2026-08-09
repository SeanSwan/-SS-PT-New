#!/usr/bin/env node
/**
 * @file verify-until-dry-gate.mjs
 * @description Stop-hook adapter for current, hash-bound Code Perfectionist receipts.
 *
 * Default mode is observe: report missing/stale proof without wedging active work.
 * Set VERIFY_UNTIL_DRY_MODE=enforce only after the repository adoption gate passes.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defaultReceiptPath } from '../verify-until-dry/cli.mjs';
import { decideHook } from '../verify-until-dry/hook-decision.mjs';
import { captureSnapshot } from '../verify-until-dry/snapshot.mjs';

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function main() {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { /* enforce path handles absence */ }
  if (input?.stop_hook_active) return;
  const repoRoot = resolve(input.cwd ?? process.cwd());
  const mode = input.mode ?? process.env.VERIFY_UNTIL_DRY_MODE ?? 'observe';
  const receiptPath = resolve(input.receipt_path ?? process.env.VERIFY_UNTIL_DRY_RECEIPT ?? defaultReceiptPath(repoRoot));
  const receipt = readJson(receiptPath);
  let currentSnapshot = null;
  let captureError = null;
  try {
    currentSnapshot = captureSnapshot({ cwd: repoRoot, scopeContract: receipt?.scopeContract ?? {} });
  } catch (error) {
    captureError = error.message;
  }
  const decision = captureError
    ? { mode, block: mode !== 'observe', reason: `snapshot-capture-failed:${captureError}` }
    : decideHook({ mode, receipt, currentSnapshot });
  if (decision.block) {
    process.stdout.write(`${JSON.stringify({
      decision: 'block',
      reason: `Code Perfectionist: ${decision.reason}. Run verify-until-dry and obtain current CLEAN_IN_PROVEN_SCOPE evidence.`,
    })}\n`);
  } else if (decision.reason !== 'clean-current-receipt') {
    process.stderr.write(`[verify-until-dry][observe] ${decision.reason}\n`);
  }
}

main();
