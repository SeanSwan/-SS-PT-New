/**
 * transportRetry.mjs — retry policy for provider calls.
 *
 * Split out of `openrouterImage.mjs` at the 300-line cap (rule 4), and the seam
 * is genuine: WHEN to retry is a transport question, not a question about
 * images. The video lane will need the identical policy.
 *
 * THE POLICY, and the reasoning behind each half:
 *
 *   RETRIED — thrown transport errors (DNS, socket, abort) and 5xx. These are
 *   conditions where the request plausibly never reached the model, so a repeat
 *   is a genuine second chance rather than a second charge.
 *
 *   NEVER RETRIED — any 4xx. A 400 safety rejection is a statement about the
 *   PROMPT'S SHAPE: measured at ~60% rejection for tag-serialized prompts and
 *   0% for the identical content as prose. Retrying it spends money to fail the
 *   same way, which is the reasoning already baked into
 *   E_PROVIDER_SAFETY_REJECT.
 *
 * Why this matters at all: without it a network blip silently shrinks a bracket
 * from three options to two AND burns the spend, and nothing in the ledger
 * distinguishes "the model refused" from "a socket hiccuped".
 */

/** Default backoff. Two retries after the first attempt. */
export const DEFAULT_BACKOFF_MS = [1000, 4000];

export class TransportError extends Error {
  constructor(message, attempts) {
    super(message);
    this.name = 'TransportError';
    this.code = 'E_PROVIDER_TRANSPORT';
    this.attempts = attempts;
  }
}

/**
 * Call `doFetch()` with retries. Returns `{ res, retries }`.
 *
 * @param {() => Promise<Response>} doFetch
 * @param {object} [opts] { maxRetries, backoffMs, sleep }
 */
export async function withRetry(doFetch, opts = {}) {
  const maxRetries = Number.isInteger(opts.maxRetries) ? opts.maxRetries : 2;
  const backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  let retries = 0;
  for (let attempt = 0; ; attempt += 1) {
    let res = null;
    let thrown = null;
    try { res = await doFetch(); } catch (e) { thrown = e; }

    const transient = thrown !== null || (res && res.status >= 500);
    if (!transient || attempt >= maxRetries) {
      if (thrown) {
        throw new TransportError(
          `Transport failed after ${attempt + 1} attempt(s): ${String(thrown.message).slice(0, 200)}`,
          attempt + 1,
        );
      }
      return { res, retries };
    }
    retries += 1;
    await sleep(backoffMs[Math.min(attempt, backoffMs.length - 1)]);
  }
}
