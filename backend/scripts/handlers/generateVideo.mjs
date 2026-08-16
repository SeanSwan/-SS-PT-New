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
import { mimeForFilename } from './completion.mjs';
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

  await onProgress(5, `provider ${providerId} accepted`);

  const outPath = `${String(outDir).replace(/[\\/]$/, '')}/job-${job.id}.mp4`;

  let result;
  try {
    result = await adapter.generate(request, { env, onProgress, outPath, seed: p.seed });
  } catch (err) {
    throw markPermanence(err);
  }

  return {
    provider: result.provider,
    promptId: result.promptId,
    localPath: result.outPath,
    bytes: result.bytes,
    filename: result.filename,
    // The queue's artifact pointer. Without these the agent falls back to mediasync's
    // literals and records an mp4 as `mediasync.json` / `application/json`.
    r2Key: `jobs/${job.id}/${result.filename || 'render.mp4'}`,
    mime: mimeForFilename(result.filename),
    // What the operator sees in the agent log instead of "offset undefineds".
    summary: `${result.filename} (${result.bytes} bytes) via ${result.provider}`,
    // Carried through to the caller because the licence requires it to be shown
    // wherever the video is. A field that travels with the artifact is harder to
    // forget than a rule written in a document.
    attribution: result.attribution,
    // HONEST STATE: the artifact is on the agent's local disk. Upload is not
    // implemented in this lane — the mediasync handler has the same gap and says
    // so. Claiming an R2 object here would be a lie the queue would then store.
    uploaded: false,
    durationBoundEnforced: request.durationBoundEnforced,
  };
}

export { ADAPTERS, ComfyError };
