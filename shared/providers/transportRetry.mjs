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

/**
 * Base backoff. Two retries after the first attempt.
 *
 * PROVENANCE: not measured — chosen as a conventional 1s/4s exponential pair.
 * Unlike the tolerances in this codebase there is no observation to derive it
 * from, and saying so is the honest position. What IS derived is the jitter and
 * the ceiling below.
 */
export const DEFAULT_BACKOFF_MS = [1000, 4000];

/**
 * Jitter fraction applied to every wait.
 *
 * WHY IT EXISTS: a fixed backoff synchronises every client that failed at the
 * same moment, so they all return together and re-flatten a provider that was
 * just coming back. Full-jitter is overkill for a workload of three concurrent
 * requests; +/-25% is enough to decorrelate a bracket's own options from each
 * other, which is the only herd this system actually creates.
 */
export const JITTER_FRACTION = 0.25;

/**
 * Total wall-clock budget across all attempts.
 *
 * PROVENANCE: DERIVED, and here is the arithmetic so it can be checked. One
 * generation is OBSERVED at 12-40s (measured across every run in this ledger;
 * slowest recorded 40.2s). Three attempts at the observed worst case is ~120s,
 * plus 1s+4s of backoff, is ~125s. 180s leaves ~45% headroom over that without
 * letting a single option hold a bracket open for minutes.
 */
export const TOTAL_BUDGET_MS = 180_000;

/**
 * The longest server-suggested wait we will actually serve.
 *
 * `Retry-After` is an UNAUTHENTICATED HINT from a network peer. Clamping it to
 * the total budget meant "obey anything up to three minutes" — a provider asking
 * for 120s would park a whole bracket on one sleep, converting their problem
 * into our latency. Past this, the option ABORTS and the bracket moves on.
 *
 * PROVENANCE: none — arbitrary. No provider hint has been observed in this
 * system yet, so there is no p99 to derive from. Stated as arbitrary rather than
 * dressed up: an honest "no data" beats a fake citation.
 */
export const MAX_RETRY_AFTER_MS = 30_000;

export class TransportError extends Error {
  constructor(message, attempts) {
    super(message);
    this.name = 'TransportError';
    this.code = 'E_PROVIDER_TRANSPORT';
    this.attempts = attempts;
  }
}

/**
 * Honour the provider's own guidance when it gives any.
 *
 * `Retry-After` is either delta-seconds or an HTTP date. A provider that tells
 * you when to come back knows more than your backoff table does, so its value
 * wins — up to MAX_RETRY_AFTER_MS, past which the caller aborts. This function
 * REPORTS the hint faithfully; the decision to serve or refuse it belongs to the
 * retry loop, not to the parser.
 */
export function retryAfterMs(res, now = Date.now()) {
  const raw = res?.headers?.get?.('retry-after');
  if (!raw) return null;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  const at = Date.parse(raw);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}

/**
 * Call `doFetch()` with retries. Returns `{ res, retries, waitedMs }`.
 *
 * @param {() => Promise<Response>} doFetch
 * @param {object} [opts] { maxRetries, backoffMs, sleep, random, now, totalBudgetMs }
 */
export async function withRetry(doFetch, opts = {}) {
  const maxRetries = Number.isInteger(opts.maxRetries) ? opts.maxRetries : 2;
  const backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const random = opts.random ?? Math.random;
  const now = opts.now ?? (() => Date.now());
  const budget = opts.totalBudgetMs ?? TOTAL_BUDGET_MS;

  const started = now();
  let retries = 0;
  let waitedMs = 0;

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
      return { res, retries, waitedMs };
    }

    // The provider's own guidance beats the local table when it offers any —
    // but a hint longer than we are willing to serve aborts instead of waiting.
    const advised = res ? retryAfterMs(res, now()) : null;
    if (advised !== null && advised > MAX_RETRY_AFTER_MS) {
      throw new TransportError(
        `Provider asked for a ${Math.round(advised / 1000)}s Retry-After, over the `
        + `${MAX_RETRY_AFTER_MS / 1000}s we will serve. Aborting rather than parking the bracket.`,
        attempt + 1,
      );
    }
    const base = advised ?? backoffMs[Math.min(attempt, backoffMs.length - 1)];
    const jitter = base * JITTER_FRACTION * (random() * 2 - 1);
    const wait = Math.max(0, Math.round(base + jitter));

    // A budget that is only checked after sleeping is not a budget.
    if ((now() - started) + wait > budget) {
      if (res) return { res, retries, waitedMs };        // surface the last real response
      throw new TransportError(
        `Retry budget of ${budget}ms exhausted after ${attempt + 1} attempt(s)`, attempt + 1);
    }

    retries += 1;
    waitedMs += wait;
    await sleep(wait);
  }
}
