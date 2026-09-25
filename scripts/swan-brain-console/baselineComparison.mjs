/**
 * baselineComparison — the PURE half of the baseline comparator: the constants, the argv, and
 * the decision that turns a measured pixel ratio into a status.
 * @module scripts/swan-brain-console/baselineComparison
 *
 * WHY THIS IS SEPARATE FROM `shot-diff.mjs`
 * Two subjects. `shot-diff.mjs` drives a browser: it launches Chromium, navigates the harness,
 * measures pixels and writes files. Nothing here touches any of that — every export is a pure
 * function of its arguments, so the entire decision surface can be pinned by a test that never
 * starts a browser.
 *
 * The split was forced by a Rule 4 breach, and the breach was SELF-INFLICTED: closing round 11's
 * finding F04 — the DOM was both the subject and the denominator of the fleet gate — added the
 * population reconciliation to `shot-diff.mjs` and pushed it to 352 lines. The Judge Mode guard
 * had already caught the same class of breach one round earlier, in `judge-export.test.mjs`.
 *
 * The lesson both times is that the cap is not a formatting preference. It is what forces the
 * browser-driving code and the deciding code apart — and they are the two things that need
 * different tests, because one can only be exercised by a live harness and the other can be
 * pinned exhaustively for free.
 *
 * `CHANNEL_DELTA` and `BASELINE_DIR` live here rather than in the script because they are part
 * of the DECISION's vocabulary: one is the tolerance's unit, the other is where the reference
 * the decision compares against is kept. `shot-diff.mjs` imports both back.
 *
 * BOUNDS: pure. No I/O, no browser, no clock.
 */
import { DEFAULT_MAX_DIFF_PIXEL_RATIO } from './renderResult.mjs';

/** Per-channel delta below which two pixels count as the same colour (antialiasing). */
export const CHANNEL_DELTA = 12;
/** Where baselines live. One PNG per variant, keyed by the fleet row id. */
export const BASELINE_DIR = 'docs/qa/baseline/three-worlds';

/**
 * Decide a variant's status from a measured ratio. PURE, and the part worth testing.
 *
 * `no_baseline` is deliberately its own status rather than a flavour of failure: the fix for
 * it is `--update`, while the fix for a diff is a look at what changed. Collapsing them
 * would tell the operator the wrong thing.
 */
export function classifyComparison({
  baselineExists,
  diffRatio,
  maxDiffPixelRatio = DEFAULT_MAX_DIFF_PIXEL_RATIO,
}) {
  if (!baselineExists) {
    return {
      status: 'no_baseline',
      detail: 'no committed baseline — run with --update to record one, then review the diff',
    };
  }
  if (diffRatio === null || !Number.isFinite(diffRatio)) {
    return { status: 'unreadable', detail: 'the comparison produced no usable ratio' };
  }
  const pct = (diffRatio * 100).toFixed(3);
  const limit = (maxDiffPixelRatio * 100).toFixed(3);
  if (diffRatio > maxDiffPixelRatio) {
    return { status: 'fail', detail: `${pct}% of pixels differ (limit ${limit}%)` };
  }
  return { status: 'pass', detail: `${pct}% of pixels differ (limit ${limit}%)` };
}

/** Count statuses. PURE. `pass` is the only status that is a pass. */
export function summarize(results) {
  const out = { total: results.length, pass: 0, fail: 0, no_baseline: 0, unreadable: 0 };
  for (const r of results) {
    if (out[r.status] === undefined) out[r.status] = 0;
    out[r.status] += 1;
  }
  return out;
}

/** Parse argv. Unknown flags are ignored rather than fatal, so CI edits cannot hang a run. */
export function parseArgs(argv) {
  const value = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const maxDiff = Number(value('--max-diff', String(DEFAULT_MAX_DIFF_PIXEL_RATIO)));
  return {
    url: value('--url', 'http://127.0.0.1:5199/qa-worlds.html'),
    update: argv.includes('--update'),
    maxDiffPixelRatio: Number.isFinite(maxDiff) ? maxDiff : DEFAULT_MAX_DIFF_PIXEL_RATIO,
    result: value('--result', null),
  };
}
