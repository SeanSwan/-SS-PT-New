/**
 * wire.mjs — what crosses the socket. Three things, and nothing else:
 *
 *   fail()      the error envelope, so `retryable` is NAMED rather than inferred
 *   statusFor() the mapping from a refusal CODE to the status that says which LAYER
 *               refused — authorisation is 403, a ceiling is 429, a capability gap
 *               is 422. Collapsing them all to 400 is how a caller retries something
 *               that will never succeed, or gives up on something that expires.
 *   publicJob() the projection of a job that a caller may see. Internal paths and
 *               credentials never appear in it, by construction rather than by review.
 *
 * Split out of `routes.mjs` for rule 4. It is also the only part of the surface that
 * both `routes.mjs` and `server.mjs` need, which makes it the real seam.
 */

/** Envelope every error uses. `retryable` is named, never left for a client to infer. */
export function fail(status, code, message, { retryable = false, details = {} } = {}) {
  return { status, body: { error: { code, message, retryable, details } } };
}

/**
 * Every refusal code, mapped to the status that says WHICH LAYER refused.
 *
 * Exported as DATA rather than buried in a `switch` so a test can assert COVERAGE: that
 * every code the gate modules can actually throw appears here. A code missing from this
 * table silently becomes 400, which tells a caller "your request was malformed" when the
 * truth may be "our catalogue is broken" — and the reader then hunts the wrong layer.
 * That is the same mistake this file already documents in the other direction, where a
 * licence refusal reported itself as a 500.
 *
 * The CONVERSE is labelled too. A code in this table that nothing throws is a claim that
 * something is enforced when it is not, which misleads in exactly the same way. Two
 * entries are reserved and unthrown; they are marked as such where they appear.
 */
export const STATUS_BY_CODE = Object.freeze({
  // The request itself is wrong.
  E_NO_PROVIDER: 400,
  E_BAD_INPUT: 400,
  E_BAD_JSON: 400,
  E_BAD_HOST: 400,
  E_IMAGE_FIRST_REQUIRED: 400,
  E_UNSUPPORTED_KIND: 400,
  E_REFUSED: 400,
  // Authorisation, not syntax.
  E_LICENCE_GRANT_REQUIRED: 403,
  E_LICENCE_EVIDENCE_MISSING: 403,
  // Round 14. All three are the same judgement with a different reason, and all three are
  // authorisation rather than syntax: the request is well-formed and the caller is not
  // entitled. Mapping them to 400 would repeat the round-11 defect where a licence refusal
  // surfaced as a server fault and sent the reader hunting an outage that did not exist.
  E_LICENCE_PROHIBITED: 403,
  E_LICENCE_UNVERIFIED: 403,
  E_LICENCE_POSITION_UNKNOWN: 403,
  E_PROVIDER_DISABLED: 403,
  // Round 26 (D3). Authorisation, not syntax — the request is perfectly well-formed and the
  // caller is simply not entitled to reach a billable provider by this path. 403 rather than
  // 400 for the same reason as `E_PROVIDER_DISABLED` directly above, which is the closest
  // analogue: both say "this provider is not selectable by you, here", and both are cured by
  // a deliberate act rather than by fixing the request. A 400 would also mislead, since there
  // is nothing about the body to correct — the missing thing is an assertion of intent.
  E_HOSTED_REQUIRES_EXPLICIT_SELECTION: 403,
  E_UNKNOWN_PROVIDER: 404,
  E_CANCEL_TOO_LATE: 409,
  // RESERVED, NOT THROWN. Nothing raises these two today, and saying so here is the
  // honest reading of a table whose stated purpose is coverage. They are kept because
  // both describe refusals the flow genuinely wants and neither is reachable yet:
  //   E_QUOTE_CHANGED — a quote's price drifting from the catalogue before submission.
  //                     Quotes expire in five minutes, so the window is narrow, and the
  //                     runner re-costs from the live catalogue regardless.
  //   E_QUOTE_USED    — single-use quotes. Quotes are NOT single-use: one quote can
  //                     authorise several jobs. That is safe rather than lax, because
  //                     every run re-runs the gates and charges the ledger, so the daily
  //                     caps bind across reused quotes. See round 6's section H.
  // A reader who assumes either is enforced has been misled by the table, so the table
  // says which is which.
  E_QUOTE_CHANGED: 409,
  E_QUOTE_EXPIRED: 410,
  E_QUOTE_USED: 410,
  E_POLICY_REFUSED: 422,
  // Well-formed request the SERVER cannot honour right now. Retrying later genuinely
  // succeeds, which is what 429 says and 400 does not.
  E_RUN_CAP: 429,
  E_SPEND_CAP: 429,
  E_SPEND_DISABLED: 429,
  E_SPEND_REFUSED: 429,
  E_UNKNOWN_COST: 429,
  E_LEDGER_DEGRADED: 429,
  E_BAD_CAP: 429,
  // OUR data is wrong, not the caller's request — so the reader should look here.
  E_BAD_RATE: 500,
  // A malformed CATALOGUE ROW. The catalogue now validates every row at import, so this
  // should be unreachable from a request — but it is mapped anyway, because the fallback
  // is 400 and 400 says "your request was malformed" about a row the caller never wrote.
  // An unmapped code does not fail loudly; it fails as the wrong answer.
  E_BAD_SPEC: 500,
  E_NO_ATTRIBUTION: 500,

  // ── THE PROVIDER ADAPTERS (round 18) ──────────────────────────────────────
  // Eighteen codes that had NO status anywhere, and fell through to 400. They were missed
  // because the coverage sweep in round 7 listed the gateway modules and omitted all four
  // adapter files — the modules that raise most of this lane's refusals. The sweep is fixed
  // in the same round; these are the entries it was blind to.
  //
  // REACHABILITY, STATED RATHER THAN ASSUMED. An adapter refusal reaches a caller today as
  // `job.error.code` on a 200 job fetch — `server.mjs` catches it in the detached runner and
  // writes it into the job — so mapping these changes NO response. They are mapped for the
  // reason E_BAD_SPEC above is mapped: the fallback is 400, the catch in `routes.mjs` is
  // generic, and a handler that awaited an adapter inline would silently answer "your request
  // was malformed" about a graph the caller never wrote.
  //
  // THE LAYER, in the three-way split the adapters' own comments make:
  //   our provisioning, or our graph, is wrong  -> 500  (permanent: the same bytes every retry)
  //   the provider failed or broke its contract -> 502  (transient)
  //   the provider timed out                    -> 504
  //   the provider refused the content          -> 422
  // NOT 500 for the provider's own failures. Round 11 is the round where "our data is wrong"
  // and "the vendor is down" were collapsed into one status, and the reader then hunted an
  // outage that did not exist. The code says WHICH LAYER refused; the message says what to do.
  E_NOT_CONFIGURED: 500,
  E_NO_WORKFLOW: 500,
  E_BAD_WORKFLOW: 500,
  E_GUI_FORMAT_WORKFLOW: 500,
  E_NO_NODE: 500,
  E_NO_INPUT: 500,
  E_NO_OUTPUT_PATH: 500,
  // A 4xx from ComfyUI is a fact about the GRAPH we sent, which is ours — the adapter's own
  // comment draws this boundary, and its counterpart below is the other side of it.
  E_SUBMIT_REJECTED: 500,
  // ROUND 20, the hosted lane's three. The first two are OUR provisioning — a credential the vendor
  // rejects, and a base URL that would carry that credential in cleartext — so they are 500, beside
  // E_NOT_CONFIGURED. The third is the provider breaking its own contract: it reported completion
  // and handed back a URL this process will not fetch, so it is 502.
  E_POLL_REJECTED: 500,
  E_INSECURE_BASE_URL: 500,
  E_BAD_ARTIFACT_URL: 502,
  E_SUBMIT_FAILED: 502,
  E_NO_PROMPT_ID: 502,
  E_NO_REQUEST_ID: 502,
  E_DOWNLOAD_FAILED: 502,
  E_EMPTY_ARTIFACT: 502,
  // The provider reported completion without an artifact. 502 rather than 500 because in both
  // adapters the code means the PROVIDER's contract was violated — for the local lane that is
  // ComfyUI on :8188, a separate service this API merely fronts — and the actionable half
  // ("check the graph ends in a video-saving node") belongs in the message, not the status.
  E_NO_OUTPUT: 502,
  // ROUND 19: the graph was EXECUTED and a node raised. 502, not 500, and the boundary with
  // E_SUBMIT_REJECTED above is the point: a 4xx submit means ComfyUI refused the graph before
  // running it, which is ours; this means the provider ran it and the run blew up — an OOM, a
  // missing weight, a node's own bug. The exception is quoted into the message, so the reader
  // does not need the status to tell the two apart.
  E_GRAPH_FAILED: 502,
  E_GENERATION_FAILED: 502,
  E_CANCEL_FAILED: 502,
  E_TIMEOUT: 504,
  E_NSFW: 422,
});

/** Maps a refusal code to the status that says WHICH LAYER refused. */
export function statusFor(code) {
  return STATUS_BY_CODE[code] ?? 400;
}

/**
 * The public projection of a job. Internal paths and credentials never appear.
 *
 * By construction: the fields are listed, not spread — so a new internal field on the
 * job record cannot leak by default. `progress` and `error` are the two spreads, and
 * `error` is written by the runner from `{code, message, retryable}` only. A test
 * asserts the projection of a real job contains no path. The claim is only as good as
 * that test, which is why it exists rather than a comment.
 */
export function publicJob(job) {
  return {
    id: job.id,
    state: job.status,
    state_reason: job.progress?.message ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    provider: job.provider,
    execution_kind: job.executionKind,
    quote_id: job.quoteId,
    estimate_usd: job.estimateUsd,
    progress: job.progress,
    ...(job.backendId ? { backend_id: job.backendId } : {}),
    ...(job.output ? { assets: [`/v1/assets/${job.id}`] } : {}),
    ...(job.error ? { error: job.error } : {}),
  };
}
