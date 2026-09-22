/**
 * higgsfieldTransport.mjs — the wire. Credentials, the one auth header shape, the
 * submit/poll/cancel calls, and the status vocabulary.
 *
 * ── WHY THIS IS SEPARATE FROM higgsfield.mjs ────────────────────────────────
 * Rule 4's cap is 300 lines and the adapter had reached 364. The seam chosen is the
 * honest one: everything here can be exercised against a stub `fetchImpl` with no
 * credential, no network and no artifact, while `higgsfield.mjs` holds the two
 * functions that make decisions (what `verify()` reports, and what `generate()`
 * refuses to do). Splitting the other way — by "public" vs "private" — would have
 * put `resolveConfig` and `redactSecrets` behind a re-export for no reason.
 *
 * ── THE CONTRACT, QUOTED FROM THE VENDOR, NOT INFERRED ──────────────────────
 *   Base URL   https://api.higgsfield.ai
 *   Auth       Authorization: Key <KEY_ID>:<KEY_SECRET>
 *   Submit     POST /<model-path>              -> { status, request_id, status_url, cancel_url }
 *   Poll       GET  /requests/<id>/status
 *   Cancel     POST /requests/<id>/cancel       (only while every job is still queued)
 *
 * Statuses: queued, in_progress (non-terminal) -> completed, failed, nsfw, canceled.
 * Outputs:  video -> { video: { url } } ; images -> { images: [{ url }] }.
 *
 * The `status_url` / `cancel_url` the vendor RETURNS are used rather than
 * reconstructed from the request id. The vendor's own docs say to do that, and a
 * hand-built URL is a second source of truth for something already supplied.
 */

import { capabilities as registryCapabilities } from './registry.mjs';

export const DEFAULT_BASE_URL = 'https://api.higgsfield.ai';
export const POLL_INTERVAL_MS = 3000;

export class HiggsfieldError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HiggsfieldError';
    this.code = code;
  }
}

/** Slug for per-provider env keys: `higgsfield/kling-3.0` -> `KLING_3_0`. */
export function envSuffix(providerId) {
  return String(providerId).split('/').pop().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

/**
 * Remove the credential from anything about to be logged or thrown.
 *
 * The vendor's own authentication page instructs integrators to keep credentials out
 * of logs and support messages. A provider that echoes the request back in an error
 * body is the ordinary way that instruction gets broken by accident, so the redaction
 * happens at the point the text is built rather than at the point it is printed.
 */
export function redactSecrets(text, secrets = []) {
  let out = String(text ?? '');
  for (const s of secrets) {
    if (s && s.length >= 6) out = out.split(s).join('<REDACTED>');
  }
  return out;
}

/**
 * Where the credential and the model path come from.
 *
 * FAIL-CLOSED on every field. `configured` requires all three of key id, secret and
 * model path: two out of three is not a working provider, and reporting it as one
 * produces a confusing 401 from the vendor instead of an instruction from us.
 */
export function resolveConfig(env = process.env, providerId = 'higgsfield/minimax-h3') {
  const sfx = envSuffix(providerId);
  const caps = registryCapabilities(providerId);

  const keyId = String(env.HIGGSFIELD_API_KEY_ID || '').trim();
  const keySecret = String(env.HIGGSFIELD_API_KEY_SECRET || '').trim();
  // A per-provider override lets one model be pointed at a different path without
  // editing the frozen catalogue — useful while the paths are still being collected.
  const modelPath = String(env[`SWAN_HIGGSFIELD_PATH_${sfx}`] || caps.modelPath || '').trim();

  return {
    baseUrl: String(env.SWAN_HIGGSFIELD_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    keyId,
    keySecret,
    modelPath,
    providerId,
    configured: Boolean(keyId && keySecret && modelPath),
  };
}

/** The one header shape this vendor accepts, built in one place. */
export function authHeader(cfg) {
  return { Authorization: `Key ${cfg.keyId}:${cfg.keySecret}` };
}

/** The values that must never reach a log, a body, or a thrown message. */
export function secretsOf(cfg) {
  return [cfg.keySecret, cfg.keyId];
}

/**
 * The base URL a credential must never be sent to, or null.
 *
 * ── ROUND 20: THE DESTINATION OF A CREDENTIAL IS PART OF THE CREDENTIAL ─────
 * `SWAN_HIGGSFIELD_URL` was used verbatim, so a base URL of `http://` put
 * `Authorization: Key <id>:<secret>` on the wire in cleartext — measured, in the probe's own output,
 * on every request. The vendor's authentication page instructs integrators to keep credentials out
 * of anything observable, and a plaintext request is the most observable thing there is.
 *
 * It returns null when there is NO credential to protect, deliberately: an http base URL pointing at
 * a local stub is a legitimate way to exercise this module, and refusing it would break the normal
 * case of a test. A rule that refuses the normal case is broken, not fail-closed.
 */
export function insecureBaseUrl(cfg) {
  if (!cfg || !cfg.keyId || !cfg.keySecret) return null;   // nothing to leak
  const url = String(cfg.baseUrl || '');
  return /^https:\/\//i.test(url) ? null : url;
}

/** Submit one generation. Returns the vendor's own ids and URLs. */
export async function submit(request, cfg, fetchImpl = fetch) {
  if (!cfg.configured) {
    throw new HiggsfieldError('E_NOT_CONFIGURED',
      `Higgsfield is not configured for ${cfg.providerId}. Run verify() to see exactly which field is missing.`);
  }
  // AFTER the configuration check, so an unconfigured provider still says which field is missing
  // rather than reporting a scheme problem it does not yet have.
  const insecure = insecureBaseUrl(cfg);
  if (insecure) {
    throw new HiggsfieldError('E_INSECURE_BASE_URL',
      `SWAN_HIGGSFIELD_URL is "${insecure}", which is not https. The credential would be sent in `
      + `cleartext on every request to it. Set it to the vendor's https base URL, or unset it to use `
      + `${DEFAULT_BASE_URL}.`);
  }

  // The vendor bills per second and takes seconds, so duration passes straight through.
  const body = {
    prompt: request.prompt,
    ...(Number.isFinite(Number(request.duration)) ? { duration: Number(request.duration) } : {}),
    ...(request.initImage ? { input_images: [{ type: 'image_url', image_url: request.initImage }] } : {}),
  };

  const res = await fetchImpl(`${cfg.baseUrl}/${cfg.modelPath.replace(/^\//, '')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(cfg) },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    const safe = redactSecrets(raw, secretsOf(cfg)).slice(0, 300);
    // 4xx is a fact about the REQUEST and will fail identically forever; 5xx is a
    // fact about the MOMENT and a later attempt may genuinely succeed. Collapsing
    // them would either burn a job's budget or discard a recoverable one.
    const code = res.status >= 500 ? 'E_SUBMIT_FAILED' : 'E_SUBMIT_REJECTED';
    throw new HiggsfieldError(code, `Higgsfield rejected the request (${res.status}): ${safe}`);
  }

  const data = await res.json().catch(() => ({}));
  const requestId = data.request_id || data.id;
  if (!requestId) {
    throw new HiggsfieldError('E_NO_REQUEST_ID',
      'Higgsfield accepted the request but returned no request_id. Without it the job cannot be '
      + 'polled, cancelled, or reconciled — the request may still be running and billing.');
  }

  return {
    requestId,
    // Used when supplied. A hand-built URL is a second source of truth for something
    // the vendor already told us.
    statusUrl: data.status_url || `${cfg.baseUrl}/requests/${requestId}/status`,
    cancelUrl: data.cancel_url || `${cfg.baseUrl}/requests/${requestId}/cancel`,
    status: data.status || 'queued',
  };
}

/** Terminal statuses, named once so polling and reporting cannot disagree. */
export const TERMINAL = Object.freeze({
  completed: 'completed', failed: 'failed', nsfw: 'nsfw', canceled: 'canceled',
});

export function isTerminal(status) {
  return Object.prototype.hasOwnProperty.call(TERMINAL, String(status));
}

/** The artifact URL, whichever shape this model returns. */
export function findArtifactUrl(data = {}) {
  if (typeof data.video?.url === 'string') return data.video.url;
  const first = Array.isArray(data.images) ? data.images.find(i => typeof i?.url === 'string') : null;
  if (first) return first.url;
  // Documented extras: some video and 3D operations return zip/mov/jsx/fbx/ply.
  for (const key of ['zip', 'mov', 'jsx', 'fbx', 'ply']) {
    if (typeof data[key]?.url === 'string') return data[key].url;
  }
  return null;
}

/**
 * The timeout sentence, which must not assert a cause it did not observe.
 *
 * ── ROUND 20: A BLIP AND A REJECTION ARE NOT THE SAME TIMEOUT ───────────────
 * `poll` treated every non-ok response as a blip and kept going, so a status endpoint answering 401
 * on every poll produced `E_TIMEOUT` after fifteen minutes — carrying the sentence *"The request may
 * still be running and billing."* The code had established the opposite: it had never read a status
 * at all. This is round 16's rule (a report must not state something it does not know) in the lane
 * that spends money, and it is the same repair round 19 made to the local adapter's timeout.
 */
export function describePollTimeout({ requestId, timeoutMs, polls = 0, refusals = 0, lastRefusal = null, last = {} } = {}) {
  const budget = timeoutMs >= 1000 ? `${Math.round(timeoutMs / 1000)}s` : `${timeoutMs}ms`;
  const head = `Higgsfield did not reach a terminal status within ${budget} `
    + `(request ${requestId}, last status "${last?.status}").`;

  if (polls === 0) {
    return `${head} Not one poll completed, so nothing is known about this request — check the network `
      + 'path to the vendor before retrying.';
  }
  if (refusals === polls) {
    return `${head} Every one of the ${polls} poll(s) was refused (last: ${lastRefusal}), so no status was `
      + 'ever read. This is a transport or credential problem, NOT a slow render — nothing here shows '
      + 'the request still running.';
  }
  if (refusals > 0) {
    return `${head} ${refusals} of ${polls} poll(s) were refused (last: ${lastRefusal}), and the status `
      + 'above is the last one actually read. The request may still be running and billing.';
  }
  return `${head} The request may still be running and billing.`;
}

/** Poll until a terminal status. Returns the final status body. */
export async function poll(job, cfg, fetchImpl = fetch, opts = {}) {
  const {
    timeoutMs = 15 * 60 * 1000,
    sleep = (ms) => new Promise(r => setTimeout(r, ms)),
    onProgress = async () => {},
    now = () => Date.now(),
  } = opts;

  const deadline = now() + timeoutMs;
  let last = { status: 'queued' };
  // OBSERVED, so the timeout can report what actually happened. A poll count is what separates
  // "the vendor is slow" from "the vendor never answered us", and only one of those is billable.
  let polls = 0;
  let refusals = 0;
  let lastRefusal = null;

  while (now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetchImpl(job.statusUrl, { method: 'GET', headers: authHeader(cfg) });
    if (!res.ok) {
      polls += 1;
      refusals += 1;
      lastRefusal = Number(res.status);
      // A credential the status endpoint REJECTS is the same answer on every poll, so waiting cannot
      // change it — and the job would spend its entire attempt budget discovering that. Refused now,
      // and named, because "your key is wrong" and "the render is slow" need different repairs.
      if (lastRefusal === 401 || lastRefusal === 403) {
        throw new HiggsfieldError('E_POLL_REJECTED',
          `Higgsfield rejected the credential while polling (${lastRefusal}) for request ${job.requestId}. `
          + 'The same credential is sent on every poll, so a later attempt cannot succeed: check '
          + 'HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET.');
      }
      continue;   // any other blip is not a terminal answer
    }
    polls += 1;
    last = await res.json().catch(() => ({}));
    if (isTerminal(last.status)) return last;
    await onProgress(undefined, `higgsfield: ${last.status || 'in_progress'}`);
  }

  // Distinguished from "finished with nothing". A timeout means the job is very
  // likely STILL RUNNING AND STILL BILLING, which is a materially different message.
  throw new HiggsfieldError('E_TIMEOUT',
    describePollTimeout({ requestId: job.requestId, timeoutMs, polls, refusals, lastRefusal, last }));
}

/** Cancel a request that has not started processing. */
export async function cancel(job, cfg, fetchImpl = fetch) {
  const url = job.cancelUrl || `${cfg.baseUrl}/requests/${job.requestId}/cancel`;
  const res = await fetchImpl(url, { method: 'POST', headers: authHeader(cfg) });
  if (res.status === 400) {
    throw new HiggsfieldError('E_CANCEL_TOO_LATE',
      `Request ${job.requestId} has already started processing and cannot be cancelled.`);
  }
  if (!res.ok) {
    throw new HiggsfieldError('E_CANCEL_FAILED', `Cancel returned ${res.status} for ${job.requestId}.`);
  }
  return { requestId: job.requestId, canceled: true };
}
