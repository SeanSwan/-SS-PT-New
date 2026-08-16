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

import {
  resolve as resolveProvider, validateVideoRequest, ProviderError,
  readGrants, readEnabled,
} from '../../../shared/providers/video/registry.mjs';
import * as comfyuiLocal from '../../../shared/providers/video/comfyuiLocal.mjs';
import { readFileSync } from 'node:fs';
import { mimeForFilename } from './completion.mjs';
import { assertPromptAllowed } from '../../../shared/providers/video/promptPolicy.mjs';
import { readLimits, dayKey, checkRunAllowed } from '../../../shared/providers/video/spendGuard.mjs';
import { buildProvenance } from '../../../shared/providers/video/provenance.mjs';
import { ComfyError } from '../../../shared/providers/video/comfyuiLocal.mjs';

/**
 * Adapters by transport. A second local backend or a hosted vendor registers
 * here; nothing else in the agent changes.
 */
const ADAPTERS = { 'comfyui/minimax-h3': comfyuiLocal };

/**
 * Error codes that describe the request rather than the moment. Anything here is
 * permanent; everything else is allowed a retry.
 */
const PERMANENT_CODES = new Set([
  // registry — the request or its licence position is wrong
  'E_UNKNOWN_PROVIDER', 'E_PROVIDER_DISABLED', 'E_LICENCE_GRANT_REQUIRED',
  'E_BAD_INPUT', 'E_IMAGE_FIRST_REQUIRED', 'E_UNSUPPORTED_KIND', 'E_NO_PROVIDER',
  // comfyui — the graph or its wiring is wrong
  'E_NO_WORKFLOW', 'E_BAD_WORKFLOW', 'E_GUI_FORMAT_WORKFLOW', 'E_NO_NODE', 'E_NO_INPUT',
  'E_NOT_CONFIGURED', 'E_NO_OUTPUT_PATH',
  // A 4xx submit is the graph's fault and will fail identically forever.
  // E_SUBMIT_FAILED (5xx) is deliberately ABSENT: ComfyUI restarting or briefly
  // out of VRAM is a fact about the moment, and a later attempt may well succeed.
  'E_SUBMIT_REJECTED',
  // A refused prompt is the same words every time. Retrying it burns the job's whole
  // attempt budget re-asking a question already answered no — and puts a prompt the
  // policy filter rejected in front of a model three more times.
  'E_POLICY_REFUSED',
  // A malformed ceiling fails identically until a human edits the environment. The
  // SPEND and RUN caps themselves are deliberately NOT here: those expire at the UTC
  // day boundary, so tomorrow genuinely succeeds and the job deserves its retry.
  'E_BAD_CAP',
]);

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
      territory: p.territory || env.SWAN_OPERATOR_TERRITORY || 'US',
      // Derived from the INJECTED env, not `process.env`. Letting the registry
      // fall back to its own default would make the `env` parameter decorative:
      // a test could pass against an injected env while production read a
      // different one, which is the shape of bug that makes a suite worthless.
      grants: readGrants(env),
      enabled: readEnabled(env),
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

  // SPEND + VOLUME CEILING. Checked after policy so a refused prompt never consumes a
  // slot, and before submission so the ceiling is a gate rather than a report.
  let limits;
  try {
    limits = readLimits(env);
  } catch (err) {
    throw markPermanence(err);   // E_BAD_CAP — a human must fix the environment
  }
  const day = dayKey(now());
  const usage = ledger ? ledger.usageFor(day) : { runs: 0, spendUsd: 0 };
  let allowance;
  try {
    allowance = checkRunAllowed(caps, usage, limits);
  } catch (err) {
    // A cap is a fact about the DAY, not the request. Retrying tomorrow genuinely
    // succeeds, so this must stay retryable — marking it permanent would discard work
    // for a ceiling that expires on its own.
    throw err;
  }

  await onProgress(5, `provider ${providerId} accepted`);

  const outPath = `${String(outDir).replace(/[\\/]$/, '')}/job-${job.id}.mp4`;

  let result;
  try {
    result = await adapter.generate(request, { env, onProgress, outPath, seed: p.seed });
  } catch (err) {
    throw markPermanence(err);
  }

  if (ledger) ledger.record(day, { runs: 1, spendUsd: allowance.runCost });

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
    territory: p.territory || env.SWAN_OPERATOR_TERRITORY || 'US',
    grantRecorded: readGrants(env).has(providerId),
    now: now(),
  });

  return {
    provider: result.provider,
    promptId: result.promptId,
    localPath: result.outPath,
    bytes: result.bytes,
    filename: result.filename,
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
