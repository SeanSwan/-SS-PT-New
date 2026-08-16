/**
 * completion.mjs — how a finished job is reported to the queue.
 *
 * Extracted from `render-agent.mjs` for two reasons, in this order:
 *
 * 1. It was inline and untestable, and consequently WRONG. Both fields were hardcoded
 *    to mediasync's shape, so the first `generate` job recorded an mp4 in the queue as
 *    `mediasync.json` with mime `application/json` — the queue storing a confident lie
 *    about an artifact it had never inspected. Unit tests could not reach it; only
 *    driving the real agent against a stub server exposed it.
 * 2. `render-agent.mjs` is already over the 300-line cap (rule 4). Keeping these there
 *    made a pre-existing violation meaningfully worse.
 *
 * A handler that produces something other than a JSON measurement MUST declare its own
 * `r2Key`, `mime` and `summary`. The fallbacks reproduce mediasync's recorded behaviour
 * byte-for-byte, so adding handlers never changes what the existing one reports.
 */

/** The queue's artifact pointer for a finished job. */
export function completionBody(job, output = {}) {
  return {
    r2Key: output.r2Key || `jobs/${job.id}/mediasync.json`,
    mime: output.mime || 'application/json',
    output,
  };
}

/**
 * The one line the operator actually watches.
 *
 * Printed `offset undefineds usable=undefined` for every render — worse than silence,
 * because it reads as a measurement that ran and failed rather than a field that was
 * never meant to apply.
 */
export function completionSummary(output = {}) {
  return output.summary
    ?? `offset ${output.offsetSeconds?.toFixed?.(4)}s usable=${output.usable}`;
}

/** Map a produced filename to the mime the queue should record. */
const MIME_BY_EXT = Object.freeze({
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mkv: 'video/x-matroska', gif: 'image/gif',
});

export function mimeForFilename(filename) {
  const ext = String(filename || '').match(/\.([^.]+)$/)?.[1]?.toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}
