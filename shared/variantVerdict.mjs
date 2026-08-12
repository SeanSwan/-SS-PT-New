/**
 * variantVerdict.mjs — what a HUMAN said about a generation.
 *
 * Split out of `variantRun.mjs` at the 300-line cap (rule 4), and the seam is
 * real: `variantRun` owns what the machine RECORDED, this owns what a person
 * DECIDED. They are different kinds of fact with different lifecycles — a
 * generation is immutable once written, a verdict can change when someone looks
 * again.
 *
 * Both functions ANNOTATE rather than append. A verdict is not a generation, and
 * appending one would inflate a ledger whose entire purpose is reconstructing
 * real spend.
 */

import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { readRuns, LEDGER_FILE, RunError } from './variantRun.mjs';

/**
 * Patch one row in place. Used for HUMAN VERDICTS — a pick, a rubric answer —
 * which annotate a generation rather than being one. Appending them instead
 * would inflate a ledger whose entire purpose is reconstructing real spend.
 *
 * A corrupt line is passed through untouched rather than dropped: rewriting the
 * file must never be a chance to lose rows.
 */
export function annotateRun(variantId, patch, root = process.cwd()) {
  const p = join(root, LEDGER_FILE);
  if (!existsSync(p)) throw new RunError('E_RUN_INVALID', 'No ledger to annotate.');
  const { runs } = readRuns(root);
  const target = runs.find((r) => r.variantId === variantId);
  if (!target) throw new RunError('E_RUN_INVALID', `No variant ${variantId}.`);
  const out = readFileSync(p, 'utf8').split('\n').map((line) => {
    if (!line.trim()) return line;
    try {
      const row = JSON.parse(line);
      return row.variantId === variantId ? JSON.stringify({ ...row, ...patch }) : line;
    } catch { return line; }
  }).join('\n');
  writeFileSync(p, out, 'utf8');
  return { ...target, ...patch };
}

/**
 * Record a human's pick. A thin specialisation of annotateRun(): it marks the
 * winner AND unmarks its siblings, so "the winner" stays singular per run and a
 * stale crown from an earlier pick cannot linger beside the new one.
 */
export function markWinner(variantId, root = process.cwd()) {
  const { runs } = readRuns(root);
  const target = runs.find((r) => r.variantId === variantId);
  if (!target) throw new RunError('E_RUN_INVALID', `No variant ${variantId}.`);
  if (target.runId) {
    for (const sib of runs) {
      if (sib.runId === target.runId && sib.variantId !== variantId && sib.winner) {
        annotateRun(sib.variantId, { winner: false }, root);
      }
    }
  }
  return annotateRun(variantId, { winner: true }, root);
}
