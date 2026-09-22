/**
 * generateVideo.mjs — the render-agent's `generate` handler.
 *
 * Lives outside `render-agent.mjs` because that file is already at 329 lines and
 * the 300-line cap (rule 4) is not a rounding target. The agent keeps dispatch;
 * the work lives here, where it can be unit-tested without starting a poll loop.
 *
 * ── HANDLER CONTRACT (matches runMediaSync exactly) ─────────────────────────
 *   async (job, onProgress) -> output object
 *   job.params carries the request; `err.permanent = true` means do not retry.
 *
 * ── ERROR CLASSIFICATION IS THE POINT OF THIS FILE ──────────────────────────
 * A prior defect in this same subsystem marked EVERY extraction failure
 * retryable, so a permanently-missing file burned a job's entire attempt budget
 * three times before failing. The inverse is just as bad: marking a transient
 * network blip permanent throws away a job that would have succeeded on retry.
 *
 * So the split is explicit and enumerated below rather than left to a default.
 * A bad prompt, a licence refusal, an unknown provider, and a malformed workflow
 * are all facts about the REQUEST — retrying grows no new licence and fixes no
 * typo. A timeout, a socket error, or a 5xx are facts about the MOMENT.
 */

import { resolve as resolveProvider, validateVideoRequest, ProviderError, readGrants, readEnabled } from '../../../shared/providers/video/registry.mjs';
import { readFileSync } from 'node:fs';
import { mimeForFilename } from './completion.mjs';
import { assertPromptAllowed } from '../../../shared/providers/video/promptPolicy.mjs';
import { assertRunAllowed } from './ceilings.mjs';
import { buildProvenance } from '../../../shared/providers/video/provenance.mjs';
import { territories } from '../../../shared/providers/video/licenceGate.mjs';
// The transport registry moved to its own file to stay inside rule 4's 300-line cap.
// Re-exported at the bottom, so `ADAPTERS` and `ComfyError` are still reachable from
// here and no existing caller has to change an import path.
import { ADAPTERS, ComfyError } from './adapters.mjs';

/**
 * Error codes that describe the request rather than the moment. Anything here is
 * permanent; everything else is allowed a retry.
 */
const PERMANENT_CODES = new Set([
  // registry — the request or its licence position is wrong
  'E_UNKNOWN_PROVIDER', 'E_PROVIDER_DISABLED', 'E_LICENCE_GRANT_REQUIRED',
  // D3. The request did not assert an explicit hosted selection. That is a fact about the
  // REQUEST, not the moment: a retry re-reads the same params and reaches the same answer,
  // so retrying re-asks a question already answered no — the same reasoning the round-14
  // licence codes below use. Deliberately NOT in the "transient" class with the caps: those
  // expire at the UTC day boundary, and this one does not expire at all.
  'E_HOSTED_REQUIRES_EXPLICIT_SELECTION',
  // Round 14's three. A licence position does not change between attempts: the catalogue row
  // and the recorded terms are the same bytes on the second try, so retrying re-asks a
  // question already answered no. Deliberately NOT included is any code meaning "the ledger
  // or the clock will differ tomorrow" — those keep their retry, as the cap comment below
  // explains.
  'E_LICENCE_PROHIBITED', 'E_LICENCE_UNVERIFIED', 'E_LICENCE_POSITION_UNKNOWN',
  'E_BAD_INPUT', 'E_IMAGE_FIRST_REQUIRED', 'E_UNSUPPORTED_KIND', 'E_NO_PROVIDER',
  // comfyui — the graph or its wiring is wrong
  'E_NO_WORKFLOW', 'E_BAD_WORKFLOW', 'E_GUI_FORMAT_WORKFLOW', 'E_NO_NODE', 'E_NO_INPUT',
  'E_NOT_CONFIGURED', 'E_NO_OUTPUT_PATH',
  // A 4xx submit is the graph's fault and will fail identically forever.
  // E_SUBMIT_FAILED (5xx) is deliberately ABSENT: ComfyUI restarting or briefly
  // out of VRAM is a fact about the moment, and a later attempt may well succeed.
  'E_SUBMIT_REJECTED',
  // ROUND 25. The run COMPLETED and its output node produced no video. Same graph, same bytes,
  // same outcome — there is no transient shape of this, because it is only reached once
  // `terminalState` has said the graph finished. It was left retryable by round 19 alongside
  // E_GRAPH_FAILED, and it does not share that code's excuse: E_GRAPH_FAILED is MIXED (its
  // canonical instance here is `CUDA out of memory`, a fact about the moment) and so cannot be
  // classified by code at all, which is why the adapter marks permanence per-instance instead.
  // This one is not mixed, so the set is where it belongs.
  'E_NO_OUTPUT',
  // A refused prompt is the same words every time. Retrying it burns the job's whole
  // attempt budget re-asking a question already answered no — and puts a prompt the
  // policy filter rejected in front of a model three more times.
  'E_POLICY_REFUSED',
  // A malformed ceiling fails identically until a human edits the environment. The
  // SPEND and RUN caps themselves are deliberately NOT here: those expire at the UTC
  // day boundary, so tomorrow genuinely succeeds and the job deserves its retry.
  'E_BAD_CAP',
  // A corrupt ledger file does not repair itself either. Same class: retrying re-reads
  // the same unparseable bytes, and only a human deleting or fixing the file changes it.
  'E_LEDGER_DEGRADED',
  // THE CALLER'S OWN CEILING. Every one of these is a fact about the REQUEST rather than
  // about the moment: a retry re-reads the same stored ceiling and the same catalogue
  // price, so it reproduces the same numbers and the same refusal. Deliberately NOT here:
  // E_CALLER_RUN_CAP and E_CALLER_SPEND_CAP, which accumulate over the UTC day and so
  // genuinely succeed tomorrow — the same distinction the global caps make above.
  'E_JOB_COST_EXCEEDED', 'E_BAD_MAX_COST', 'E_JOB_COST_UNKNOWN',
]);

/**
 * A stable seed for a job id.
 *
 * Deterministic so a retry of the same job renders the same thing; distinct per job so
 * ComfyUI's graph cache never hands two jobs one video. Bounded to 2^31-1 because that is
 * what sampler seed widgets accept.
 */
export function seedFromJobId(jobId) {
  let h = 2166136261;
  for (const ch of String(jobId)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2147483647;
}

function markPermanence(err) {
  if (err && PERMANENT_CODES.has(err.code)) err.permanent = true;
  return err;
}

export function isPermanentCode(code) {
  return PERMANENT_CODES.has(code);
}

/**
 * @param {object} job          queue job; `params` carries the request
 * @param {Function} onProgress (pct, message) => Promise<void>
 */
export async function runGenerate(job, onProgress, deps = {}) {
  const {
    env = process.env,
    adapters = ADAPTERS,
    outDir = env.SWAN_AGENT_OUT_DIR || process.cwd(),
    // Injected so the guard, the clock and the record are all testable without a
    // filesystem or a real date. A null ledger means "count nothing" — used by tests
    // and by any caller that has not wired persistence yet.
    ledger = null,
    now = () => new Date(),
    // Supplied by the agent. Absent in unit tests and in any caller that has not wired
    // storage — in which case the artifact stays local and `uploaded` says so.
    api = null,
    readArtifact = null,
    fetchImpl = fetch,
  } = deps;

  const p = job.params || {};
  const providerId = p.provider || p.providerId;

  if (!providerId) {
    const e = new ProviderError('E_NO_PROVIDER', 'generate requires params.provider');
    throw markPermanence(e);
  }

  const adapter = adapters[providerId];
  if (!adapter) {
    const e = new ProviderError('E_UNKNOWN_PROVIDER',
      `No adapter for "${providerId}". This agent carries: ${Object.keys(adapters).join(', ') || '(none)'}`);
    throw markPermanence(e);
  }

  // Licence gate FIRST, before any validation work or GPU time. A refusal here is
  // the cheapest possible place to discover the model may not legally be run —
  // and the message says which thing is restricted, because the ambiguous version
  // of this sentence already cost this project days.
  let caps;
  try {
    caps = resolveProvider(providerId, {
      commercial: p.commercial !== false,
      // The OPERATOR's jurisdiction decides, not the request's (licenceGate.territories).
      territories: territories(env.SWAN_OPERATOR_TERRITORY, p.territory),
      // Derived from the INJECTED env, not `process.env`. Letting the registry
      // fall back to its own default would make the `env` parameter decorative:
      // a test could pass against an injected env while production read a
      // different one, which is the shape of bug that makes a suite worthless.
      grants: readGrants(env),
      enabled: readEnabled(env),
      // ── D3, AND THIS LINE IS THE HALF THAT MAKES IT A MECHANISM ──────────────
      // `registry.resolve()` refuses a `explicit-paid-only` row unless the caller asserts
      // an explicit selection. That assertion has to be made at the place runs actually
      // START, or the policy is a gate with no key: the resolver would refuse every hosted
      // run, including the deliberate ones, and the first person to hit it would "fix" it
      // by deleting the check.
      //
      // Read from the REQUEST rather than inferred from `providerId` being present, and the
      // difference is the entire mechanism. A fallback, a retry, a saturation path and a
      // default all carry a provider id too — so "a provider was named" cannot distinguish a
      // deliberate selection from an automatic one, which is exactly the confusion Astra's
      // first invariant exists to prevent ("local saturation, unavailability, unsupported
      // parameters, and failure never add hosted candidates"). Only the caller knows which
      // it did, so only the caller can say so.
      //
      // Consequence, stated plainly because it is a real behaviour change: a request that
      // names a hosted provider WITHOUT this flag is refused. No live caller is affected
      // today — every hosted row ships `enabled: false` behind unretrieved terms — and that
      // is the point of adding the flag now rather than after enablement.
      explicitSelection: p.explicitSelection === true,
    });
  } catch (err) {
    throw markPermanence(err);
  }

  let request;
  try {
    request = validateVideoRequest(p, caps);
  } catch (err) {
    throw markPermanence(err);
  }

  // CONTENT POLICY — before spend, before GPU time, before anything reaches a model.
  // A refused prompt is a fact about the request, so it is permanent: resubmitting the
  // same words produces the same refusal forever.
  let policy;
  try {
    policy = assertPromptAllowed(request.prompt, env);
  } catch (err) {
    throw markPermanence(err);
  }

  // CEILINGS — GLOBAL, PER-CALLER, PER-JOB, composed in one place. Checked after policy
  // so a refused prompt never consumes a slot, and before submission so a ceiling is a
  // gate rather than a report. `ceilings.mjs` says why there are three, in what order
  // they are applied, and which refusals are permanent.
  const { day, allowance } = assertRunAllowed({ job, caps, ledger, env, now });

  await onProgress(5, `provider ${providerId} accepted`);

  const outPath = `${String(outDir).replace(/[\\/]$/, '')}/job-${job.id}.mp4`;

  let result;
  try {
    // SEED PER JOB, unless the caller pinned one.
    //
    // ComfyUI caches by graph. Submitting an identical graph returns the PREVIOUS run's
    // outputs without re-rendering — so two jobs with the same prompt silently share one
    // video, and if that earlier artifact has since been moved or swept, the download
    // 404s on a file the history still advertises. Both happened here: a repeat
    // submission failed with E_DOWNLOAD_FAILED pointing at a file relocated minutes
    // before.
    //
    // Derived from the job id rather than random, so retrying the SAME job reproduces
    // its render while a DIFFERENT job never collides.
    const seed = p.seed ?? seedFromJobId(job.id);
    // ── F2: THE ADAPTER RUNS THE RESOLVER TOO, SO IT NEEDS THE SAME TWO FACTS ──────
    // The hosted adapter now calls `resolve()` itself, because it used to be a submission
    // path that bypassed enablement, the licence judgement and the D3 gate entirely. That
    // makes this call site a place where the two gates must AGREE: if the adapter resolved
    // with defaults, it would refuse the very run this handler has already authorised, and
    // the first person to hit that would "fix" it by deleting the check.
    //
    // So the same two request facts travel with the call. `commercial` mirrors the licence
    // judgement made above (and the request's `!== false` reading, so an absent field means
    // commercial and the licence gate still applies). `explicitSelection` is the same
    // assertion that got past the resolver a few lines up.
    result = await adapter.generate(request, {
      env, onProgress, outPath, seed, providerId,
      commercial: p.commercial !== false,
      explicitSelection: p.explicitSelection === true,
    });
  } catch (err) {
    throw markPermanence(err);
  }

  // The caller is named so the per-caller ceiling has something to accumulate against.
  // `job.owner` is absent in unit tests and in any caller that has not wired identity —
  // in which case no per-caller split is written and no per-caller cap can bind.
  if (ledger) ledger.record(day, { runs: 1, spendUsd: allowance.runCost, caller: job.owner });

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  // Only attempted when the agent handed us an authenticated `api`. A failure here is
  // RETRYABLE and the job fails rather than completing: the render succeeded, but
  // completing with an r2Key whose object does not exist would put a confident lie in
  // the queue — the same defect class as recording an mp4 as `mediasync.json`. The
  // local file is preserved and named in the error so the render is recoverable.
  const mime = mimeForFilename(result.filename);
  let uploaded = false;
  let r2Key = `jobs/${job.id}/${result.filename || 'render.mp4'}`;

  if (api) {
    await onProgress(90, 'uploading artifact');
    const readBytes = readArtifact || ((pth) => readFileSync(pth));
    const body = readBytes(result.outPath);
    const signed = await api(`/jobs/${job.id}/upload-url`, {
      body: {
        filename: result.filename, contentType: mime,
        sha256: result.sha256, bytes: result.bytes,
      },
    });
    const url = signed?.data?.uploadUrl;
    const key = signed?.data?.objectKey;
    if (!url || !key) {
      const e = new Error('Server did not return an upload URL for this artifact.');
      e.code = 'E_NO_UPLOAD_URL';
      throw e;
    }
    const put = await fetchImpl(url, { method: 'PUT', headers: { 'content-type': mime }, body });
    if (!put.ok) {
      const e = new Error(
        `Artifact upload failed (${put.status}). The render is intact at ${result.outPath} — `
        + 'it does not need to be regenerated.');
      e.code = 'E_UPLOAD_FAILED';
      throw e;
    }
    uploaded = true;
    r2Key = key;
  }

  const provenance = buildProvenance({
    caps,
    request,
    result,
    commercial: p.commercial !== false,
    // The OPERATOR's territory: where the run HAPPENED, not where a request claimed it did.
    territory: env.SWAN_OPERATOR_TERRITORY || 'US',
    grantRecorded: readGrants(env).has(providerId),
    now: now(),
    // Welded to the record rather than returned beside it — an unresolved consent question
    // has to survive to publish time to be a control at all.
    policyFlags: policy.flags,
  });

  return {
    provider: result.provider,
    promptId: result.promptId,
    localPath: result.outPath,
    bytes: result.bytes,
    filename: result.filename,
    // The hash travels out with the artifact, not only into the provenance record.
    // It was used for the upload-url body and then DROPPED from this return, so
    // `server.mjs`'s `out.sha256 ?? null` produced a null on every asset: a caller
    // could download the bytes and had nothing to verify them against. The provenance
    // record carried the hash; the asset metadata did not. Found by fetching the
    // artifact over HTTP and comparing, not by reading this file.
    sha256: result.sha256 ?? null,
    // The queue's artifact pointer. Without these the agent falls back to mediasync's
    // literals and records an mp4 as `mediasync.json` / `application/json`.
    r2Key,
    mime,
    // What the operator sees in the agent log instead of "offset undefineds".
    summary: `${result.filename} (${result.bytes} bytes) via ${result.provider}`,
    // Carried through to the caller because the licence requires it to be shown
    // wherever the video is. A field that travels with the artifact is harder to
    // forget than a rule written in a document.
    attribution: result.attribution,
    // TRUE only when an object actually landed in storage. When no `api` was supplied
    // the artifact is local-only and this says so rather than implying otherwise.
    uploaded,
    durationBoundEnforced: request.durationBoundEnforced,
    // The durable record promised to the licensor. Travels in the job output, which is
    // what the queue already stores — a second table would be a second source of truth
    // for a record whose entire job is to be immutable.
    provenance,
    // Anything the policy filter flagged but did not block. Surfaced so human review
    // (the actual backstop) knows what to look at rather than re-reading every prompt.
    policyFlags: policy.flags.map(f => ({ rule: f.rule, detail: f.detail })),
  };
}

export { ADAPTERS, ComfyError };
