/**
 * routes.mjs — the EXECUTING surface. Pure handlers: they take a context and return
 * `{ status, body }`, so every one of them is testable without a socket, a GPU, or a
 * vendor.
 *
 * The read-only handlers (`listModels`, `wallet`, `estimate`) live in
 * `routesCatalog.mjs`; the wire envelope and the job projection live in `wire.mjs`.
 * Both are re-exported at the bottom, so `routes.mjs` remains the one import a
 * caller needs — this file was split for rule 4, not to move anybody's import.
 *
 * ── NEUTRAL, NOT VENDOR-SHAPED. THIS IS A REVISION. ─────────────────────────
 * The first version of this file mirrored Higgsfield: `POST /v1/generations` ->
 * `{ request_id, status_url, cancel_url }`, `GET /v1/requests/:id/status`. The
 * reasoning was integration familiarity. Astra rejected it:
 *
 *   "Do not make 'local GPU execution' and 'hosted billable generation'
 *    interchangeable merely because both produce video."
 *
 * The vendor shape has three concrete problems. It puts a vendor's cancellation
 * semantics into both lanes when the local lane's cancellation is a different and
 * untested thing. It offers no place to put a PRICE before execution. And it makes
 * submission and payment the same act, so an agent that can submit can spend.
 *
 *   POST /v1/quotes           price and authorise. Creates no job, spends nothing.
 *   POST /v1/jobs             execute a quote. Requires the quote id AND a ceiling.
 *   GET  /v1/jobs/:id         state, including the honest non-terminal ones.
 *   POST /v1/jobs/:id/cancel  only while nothing has started.
 *   GET  /v1/assets/:id       artifact metadata + provenance
 *   GET  /v1/assets/:id/content  the bytes
 *
 * The quote is the seam that makes "an agent cannot spend on its own" structural
 * rather than a policy someone remembers.
 */

import { statSync } from 'node:fs';
import { basename } from 'node:path';
import { formatUsd } from '../shared/providers/video/costEstimate.mjs';
import { preflight, PreflightError } from './preflight.mjs';
import { STATUS, isTerminal } from './store.mjs';
import { fail, statusFor, publicJob } from './wire.mjs';

/** POST /v1/quotes — price and authorise. Spends nothing, submits nothing. */
export function createQuote({ body, env, ledger, quotes, principal = 'unknown', now = () => new Date() }) {
  const params = body?.params && typeof body.params === 'object' ? body.params : body;

  let pre;
  try {
    pre = preflight({ params, env, ledger, now });
  } catch (err) {
    if (err instanceof PreflightError) {
      return fail(statusFor(err.code), err.code, err.message, { retryable: err.permanent !== true });
    }
    throw err;
  }

  const quote = quotes.create({
    owner: principal,
    provider: pre.providerId,
    executionKind: pre.caps.transport === 'comfyui' ? 'local_gpu' : 'hosted',
    params,
    licenceDecision: {
      commercial_use: pre.caps.licence.commercialUse,
      restricts: pre.caps.licence.restricts,
      // Always false here. This was written as `pre.usage && false`, which evaluates to
      // false whenever `pre.usage` is truthy and to `pre.usage` otherwise — a truthiness
      // dance that reads as though a grant could be inherited from a usage record. It
      // cannot: the grant is read per-job from the environment at run time, and a quote
      // records only that none was established at quote time.
      grant_recorded: false,
    },
    pricing: {
      currency: 'USD',
      // The basis NAMES the unit the price is expressed in. `rateUnit: 'run'` used to
      // fall through to 'none', so a flat per-run provider was described as having no
      // pricing basis at all while `rate.unit` called it a run — two vocabularies for
      // one fact, and the caller picks whichever it read first.
      basis: pre.caps.rateUnit === 'second' ? 'output_second'
        : pre.caps.rateUnit === 'generation' ? 'generation'
          : pre.caps.rateUnit === 'run' ? 'run' : 'none',
      rate_usd: pre.caps.costPerSecondUsd ?? pre.caps.costPerRunUsd,
      rate_provenance: pre.caps.provenance.costPerSecondUsd ?? null,
      // Micros are authoritative; the string is what crosses the wire.
      estimated_micros: pre.estimatedMicros,
      estimated_usd: pre.estimatedCostUsd,
      detail: pre.costLine,
    },
    requirements: [],
    admitted: true,
  });

  return {
    status: 201,
    body: {
      quote: {
        id: quote.id,
        created_at: quote.createdAt,
        // Astra's policy default: five minutes. A quote is not a reservation.
        expires_at: quote.expiresAt,
        provider: quote.provider,
        execution_kind: quote.executionKind,
        pricing: quote.pricing,
        licence_decision: quote.licenceDecision,
        // Stated so a caller cannot mistake a quote for permission to execute.
        note: 'A quote authorises nothing by itself. Submit it to /v1/jobs to execute.',
      },
    },
  };
}

/** POST /v1/jobs — execute a quote. Requires the quote AND a ceiling. */
export function createJob({
  body, env, ledger, jobs, quotes, runner, principal = 'unknown', now = () => new Date(),
}) {
  const quoteId = body?.quote_id;
  if (!quoteId) return fail(400, 'E_NO_QUOTE', 'Request requires quote_id.');

  const quote = quotes.get(quoteId);
  if (!quote) return fail(404, 'E_QUOTE_NOT_FOUND', `No quote "${quoteId}".`);
  // OWNERSHIP BEFORE EXPIRY. The reverse order answered 410 for another principal's
  // EXPIRED quote and 404 for one that does not exist — so the difference between the two
  // was an oracle for whether a quote id is real, which is precisely what the comment
  // below says a caller must not learn. Expiry is a fact about a quote the caller owns;
  // it is not something a stranger gets to observe. The two refusals must be the SAME
  // answer in every state, so the ownership test has to come first.
  if (quote.owner !== principal) {
    // 404, not 403: a caller should not learn that another principal's quote exists.
    return fail(404, 'E_QUOTE_NOT_FOUND', `No quote "${quoteId}".`);
  }
  if (quote.expired) {
    return fail(410, 'E_QUOTE_EXPIRED',
      `Quote ${quoteId} expired at ${quote.expiresAt}. Quotes last five minutes; take a new one.`);
  }

  // Astra: "The caller's max_cost_usd can only reduce a server allowance." So it is
  // validated and stored, never used to RAISE anything, and a missing ceiling on a
  // priced route is a refusal rather than an implicit blank cheque.
  const estimateMicros = quote.pricing.estimated_micros;
  const maxCostUsd = body?.max_cost_usd;
  if (estimateMicros !== null && estimateMicros > 0) {
    if (maxCostUsd === undefined || maxCostUsd === null) {
      return fail(400, 'E_MAX_COST_REQUIRED',
        'This quote prices above zero, so job submission requires max_cost_usd. '
        + 'A priced route is never executed without an explicit ceiling from the caller.');
    }
    // A JSON NUMBER, not merely something `Number()` tolerates. `Number(true)` is 1 and
    // `Number([5])` is 5, so a type-loose ceiling silently turns `max_cost_usd: true`
    // into a one-dollar authorisation and `[5]` into five. This is the one field where
    // a coercion bug is a money bug, so it is type-checked rather than coerced.
    if (typeof maxCostUsd !== 'number' || !Number.isFinite(maxCostUsd)) {
      const got = Array.isArray(maxCostUsd) ? 'an array' : typeof maxCostUsd;
      return fail(400, 'E_BAD_MAX_COST',
        `max_cost_usd must be a JSON number of US dollars; got ${got}.`);
    }
    // Snap to the micro-dollar grid BEFORE scaling. `0.29 * 1e6` is 289999.99999999994
    // in binary floating point, which rounds to the right integer here but is the exact
    // class of arithmetic Astra ruled out; `toFixed(6)` removes the sub-micro noise so
    // the scale is exact for any figure a caller can actually express.
    const maxMicros = Math.round(Number(maxCostUsd.toFixed(6)) * 1_000_000);
    if (maxMicros <= 0) {
      return fail(400, 'E_BAD_MAX_COST', `max_cost_usd must be a positive number; got "${maxCostUsd}".`);
    }
    if (maxMicros < estimateMicros) {
      return fail(403, 'E_BUDGET_EXCEEDED',
        `max_cost_usd $${Number(maxCostUsd).toFixed(4)} is below this quote's estimated `
        + `$${formatUsd(estimateMicros)}. The caller's ceiling can only reduce the server's, never raise it.`);
    }
  }

  const job = jobs.create({
    owner: principal,
    provider: quote.provider,
    executionKind: quote.executionKind,
    params: quote.params,
    quoteId: quote.id,
    billed: estimateMicros === null || estimateMicros > 0,
    maxCostUsd: maxCostUsd ?? null,
    estimateUsd: quote.pricing.estimated_usd,
  });

  // Hand off. The runner re-runs every gate in `runGenerate` — preflight was an early
  // refusal, never the enforcement.
  runner(job, quote);

  return {
    status: 202,
    body: { job: publicJob(job) },
  };
}

export function getJob({ id, jobs, principal = 'unknown' }) {
  const job = jobs.get(id);
  if (!job || job.owner !== principal) return fail(404, 'E_NOT_FOUND', `No job "${id}".`);
  return { status: 200, body: { job: publicJob(job) } };
}

export function cancelJob({ id, jobs, principal = 'unknown' }) {
  const job = jobs.get(id);
  if (!job || job.owner !== principal) return fail(404, 'E_NOT_FOUND', `No job "${id}".`);
  if (isTerminal(job.status)) {
    return fail(409, 'E_ALREADY_TERMINAL', `Job ${id} is already "${job.status}".`);
  }
  // Astra: "never promise that 'cancel requested' means 'execution stopped' or
  // 'not billed.'" Only a job that has not been dispatched can actually be stopped.
  // Saying "cancelled" while the GPU keeps working is the class of confident lie
  // this repo keeps writing tests against.
  //
  // THE WINDOW IS ZERO-WIDTH WITH THE RUNNER AS IT IS TODAY, and that is stated rather
  // than left for a caller to discover. `createJob` calls `runner()` before the 202 is
  // written, and the runner's first act is a microtask that sets `running`. Node drains
  // microtasks before it reads another request off the socket, so by the time ANY second
  // request can be handled the job is already `running` — the 202's `state: "queued"` is
  // true at the instant it is written and stale on arrival. Round 10's section A pins
  // this: 12 submissions, 12 cancellations, 0 succeeded. The branch below is correct and
  // becomes reachable the moment dispatch is queued rather than immediate; until then the
  // honest reading is that this endpoint can only ever refuse.
  if (job.status !== STATUS.QUEUED) {
    return fail(409, 'E_CANCEL_TOO_LATE',
      `Job ${id} has been dispatched ("${job.status}") and cannot be cancelled from here.`);
  }
  jobs.update(id, { status: STATUS.CANCELED, progress: { pct: 0, message: 'cancelled before dispatch' } });
  return { status: 202, body: { job: publicJob(jobs.get(id)) } };
}

/** Asset metadata. One artifact per job in v1, so the asset id IS the job id. */
export function getAsset({ id, jobs, principal = 'unknown' }) {
  const job = jobs.get(id);
  if (!job || job.owner !== principal) return fail(404, 'E_NOT_FOUND', `No asset "${id}".`);
  if (job.status !== STATUS.SUCCEEDED || !job.output) {
    return fail(409, 'E_NO_ARTIFACT', `Job ${id} is "${job.status}" and has no artifact.`);
  }
  return {
    status: 200,
    body: {
      asset: {
        id,
        job_id: id,
        filename: job.output.filename,
        bytes: job.output.bytes,
        mime: job.output.mime,
        sha256: job.output.sha256,
        attribution: job.output.attribution,
        // The provenance record is the whole reason the licence question is
        // answerable months later. It travels with the asset, not in a log.
        provenance: job.output.provenance,
        content_url: `/v1/assets/${id}/content`,
      },
    },
  };
}

export function getAssetContent({ id, jobs, principal = 'unknown' }) {
  const job = jobs.get(id);
  if (!job || job.owner !== principal) return fail(404, 'E_NOT_FOUND', `No asset "${id}".`);
  if (job.status !== STATUS.SUCCEEDED || !job.output?.localPath) {
    return fail(409, 'E_NO_ARTIFACT', `Job ${id} is "${job.status}" and has no artifact.`);
  }
  const path = job.output.localPath;
  // A regular FILE, not merely something that exists. `existsSync` is true for a
  // directory and `statSync().size` returns a number for one, so the previous check
  // waved a directory straight through to `createReadStream`, which then emitted
  // EISDIR into a stream with no error listener — a process kill, reachable from any
  // job record whose `localPath` no longer points at a file.
  let stat = null;
  try { stat = statSync(path); } catch { stat = null; }
  if (!stat?.isFile()) {
    // The record and the filesystem disagree. Say so rather than 404ing as though the
    // job never existed — but NOT with the server's absolute path in it. An error
    // message is the one place a caller can read a deployment's layout off the wire.
    // The job id and the filename are enough to act on; the path stays in the log.
    return fail(410, 'E_ARTIFACT_MISSING',
      `Job ${id} is recorded as succeeded with artifact "${basename(path)}", but no readable `
      + 'file is there now. The record is kept; the bytes are gone.');
  }
  return {
    status: 200,
    stream: { path, bytes: stat.size, mime: job.output.mime || 'application/octet-stream' },
  };
}

export { fail, statusFor } from './wire.mjs';
export { listModels, wallet, estimate } from './routesCatalog.mjs';
