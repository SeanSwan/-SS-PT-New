/**
 * forgeReadApi.mjs — the READ contract for anything that renders Forge output.
 *
 * WHY THIS EXISTS: the Create-surface UI belongs to a different agent. Without a
 * typed shape to consume, they would scrape `runs.jsonl` directly — and then the
 * ledger's internal fields become someone else's public API, so it can never
 * change. Worse, the reviewer's warning: withhold this and they will invent
 * their own provenance, at which point this ledger becomes decorative.
 *
 * READ ONLY. Nothing here generates, deletes, or spends. A UI asking for a
 * picture goes through the CLI or a future job endpoint, never through this.
 *
 * THE SHAPE IS DELIBERATELY NARROWER THAN THE LEDGER. Fields a renderer has no
 * business seeing (promptSha, brainVersion, recordVersion, safetyEvents' inner
 * structure) are omitted, so internal churn does not break a consumer.
 */

import { readRuns } from './variantRun.mjs';

/** Bump when a field in the DTO changes meaning. Consumers may assert on it. */
export const READ_API_VERSION = 1;

/**
 * One generated option, as a renderer needs it.
 *
 * `imageRef` is a repo-relative POSIX path, NOT a URL — the artifact store is
 * local and gitignored, so serving it is the consumer's decision, not ours.
 * Every measured field may be null, and null means UNMEASURED, never zero: a
 * cost of null is "we do not know", which is a different fact from "it was free".
 */
function toOption(r) {
  return {
    id: r.variantId,
    parentId: r.parentVariantId ?? null,
    runId: r.runId ?? null,
    briefId: r.briefId,
    intent: r.intent ?? null,            // 'root' | 'reroll' | 'refine' | null (pre-v2 rows)
    status: r.status,                    // 'ok' | 'safety-reject' | 'error'
    winner: r.winner === true,
    prompt: r.promptText ?? null,
    promptTruncated: r.promptTruncated === true,
    imageRef: r.imageRef ?? null,
    imagePruned: r.imagePruned === true, // the image is GONE, but it existed
    width: r.actualWidth ?? null,
    height: r.actualHeight ?? null,
    aspectRequested: r.aspectRequested ?? null,
    aspectOutOfTolerance: r.aspectOutOfTolerance ?? null,
    costUsd: typeof r.costUsd === 'number' ? r.costUsd : null,
    wallMs: r.wallMs ?? null,
    retries: r.retries ?? 0,
    review: r.review ?? null,            // the human's rubric answers, if any
    createdAt: r.createdAt ?? null,
    rejected: r.status === 'safety-reject',
  };
}

/** Every run, newest first, grouped as a UI would show them. */
export function listRuns(root = process.cwd()) {
  const { runs, skipped } = readRuns(root);
  const byRun = new Map();
  for (const r of runs) {
    const key = r.runId || `single:${r.variantId}`;
    if (!byRun.has(key)) byRun.set(key, []);
    byRun.get(key).push(r);
  }

  const out = [];
  for (const [runId, rows] of byRun) {
    const options = rows.map(toOption);
    const ok = options.filter((o) => o.status === 'ok');
    out.push({
      runId: runId.startsWith('single:') ? null : runId,
      briefId: rows[0].briefId,
      prompt: rows[0].promptText ?? null,
      createdAt: rows[0].createdAt ?? null,
      options,
      okCount: ok.length,
      failedCount: options.length - ok.length,
      // Summed over PRICED options only. A run containing unmeasured rows
      // reports how many, rather than quietly treating unknown as zero.
      costUsd: Number(ok.reduce((s, o) => s + (o.costUsd ?? 0), 0).toFixed(6)),
      unpricedCount: options.filter((o) => o.costUsd === null).length,
      winnerId: options.find((o) => o.winner)?.id ?? null,
    });
  }
  out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { apiVersion: READ_API_VERSION, runs: out, corruptRows: skipped };
}

/** One run by id, or null. */
export function getRun(runId, root = process.cwd()) {
  return listRuns(root).runs.find((r) => r.runId === runId) ?? null;
}

/**
 * Spend, as an operator surface would chart it.
 * Unpriced rows are COUNTED, not silently folded into the total — the ledger
 * holds pre-fix rows whose cost was never captured, and a chart that renders
 * those as $0 tells the viewer the run was free.
 */
export function spendSummary(root = process.cwd()) {
  const { runs } = readRuns(root);
  const priced = runs.filter((r) => typeof r.costUsd === 'number');
  return {
    apiVersion: READ_API_VERSION,
    totalUsd: Number(priced.reduce((s, r) => s + r.costUsd, 0).toFixed(6)),
    pricedCount: priced.length,
    unpricedCount: runs.length - priced.length,
    imageCount: runs.filter((r) => r.imageRef && !r.imagePruned).length,
    prunedCount: runs.filter((r) => r.imagePruned).length,
  };
}
