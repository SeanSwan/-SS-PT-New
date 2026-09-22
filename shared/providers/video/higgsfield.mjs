/**
 * higgsfield.mjs — the hosted adapter. Implements the same three functions the
 * contract established: `capabilities()` / `generate()` / `verify()`.
 *
 * The wire — credentials, the auth header, submit/poll/cancel, the status
 * vocabulary — lives in `higgsfieldTransport.mjs` and is re-exported at the bottom
 * of this file, so `ADAPTERS` can register one module and the whole surface travels
 * together. This file holds only the two functions that make a JUDGEMENT.
 *
 * ── DURATION MEANS SOMETHING DIFFERENT HERE, AND THAT IS FINE ───────────────
 * The local lane deliberately leaves `duration` UNBOUND because ComfyUI's matching
 * input is `length`, which is neither seconds nor a 1:1 frame count — binding them
 * would silently render a 4-frame clip for a "4 second" request. Here, `duration` is
 * genuinely SECONDS, because that is the unit the vendor bills in. Same field name,
 * different meaning, and the difference is real rather than a naming accident: one
 * is a request for wall-clock seconds of output, the other is a request for a
 * sampler step count wearing a seconds label.
 *
 * ── THE TWO THINGS THAT ARE NOT BUILT YET ───────────────────────────────────
 * 1. `modelPath` is null in the catalogue. This adapter REFUSES to submit until an
 *    operator pastes the real path from the vendor's OpenAPI reference. Guessing it
 *    fails at the vendor with an opaque 404 after the request has been authorised
 *    and costed — a failure that costs money to discover.
 * 2. Nothing here has been executed against the live endpoint. Every capability is
 *    `published`, and only `verify()` can promote one.
 *
 * ── FAIL-CLOSED ─────────────────────────────────────────────────────────────
 * Missing key id, missing secret, missing model path, unreachable host, a terminal
 * failure status, or a completed request with no artifact URL all THROW. Nothing
 * here fabricates media, substitutes a model, or falls back to the local lane.
 */

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { capabilities as registryCapabilities, resolve, readGrants, readEnabled } from './registry.mjs';
import { territories } from './licenceGate.mjs';
import {
  HiggsfieldError, envSuffix, resolveConfig, authHeader, secretsOf, redactSecrets,
  submit, poll, TERMINAL, isTerminal, findArtifactUrl, cancel,
  insecureBaseUrl, describePollTimeout, DEFAULT_BASE_URL, POLL_INTERVAL_MS,
} from './higgsfieldTransport.mjs';

export function capabilities(providerId) {
  return registryCapabilities(providerId);
}

/**
 * Is this provider usable right now? Returns a report; never throws.
 * Every failure states what to DO — this runs first on a machine that is not set up.
 */
export async function verify(env = process.env, { fetchImpl = fetch, providerId } = {}) {
  const id = providerId || 'higgsfield/minimax-h3';
  const cfg = resolveConfig(env, id);
  const checks = [];

  checks.push({
    name: 'credential — key id',
    ok: Boolean(cfg.keyId),
    detail: cfg.keyId
      ? `present (${cfg.keyId.length} chars)`
      : 'HIGGSFIELD_API_KEY_ID is unset — create a credential in console.higgsfield.ai (the id and the secret are shown in full once)',
  });
  checks.push({
    name: 'credential — secret',
    ok: Boolean(cfg.keySecret),
    detail: cfg.keySecret
      ? 'present (value never printed)'
      : 'HIGGSFIELD_API_KEY_SECRET is unset — both halves are required; a key id alone authenticates nothing',
  });
  checks.push({
    name: 'model endpoint path',
    ok: Boolean(cfg.modelPath),
    detail: cfg.modelPath
      ? cfg.modelPath
      : `unset for ${id} — the catalogue ships modelPath: null on purpose. Take the path from the vendor's OpenAPI reference at docs.higgsfield.ai and set SWAN_HIGGSFIELD_PATH_${envSuffix(id)}. It is never guessed: a wrong path costs a real request to discover.`,
  });

  // Reachability is proven with a request that CANNOT spend: the status endpoint for
  // a syntactically valid but non-existent request id. A 401 means the credential is
  // wrong; a 404 means auth passed and the host is answering. Either is a real
  // finding, and neither generates a job.
  //
  // ── ROUND 20: AN ANSWER THAT PROVES NOTHING IS NOT A YES ──────────────────
  // The first version accepted every status that was not 401/403 — so a 500, a 429 and a 302 all
  // produced `ok: true` with the detail "credential accepted (probe answered 500)". This is the
  // first command run on a machine that is not set up, and it answered YES on the strength of the
  // vendor failing. A status proves the credential worked only if the API reached a DECISION about
  // the request, which is what a 2xx or a non-auth 4xx is. A 5xx, a 429 or a redirect is the vendor
  // failing or diverting before any decision, so it is inconclusive — and inconclusive is not ok.
  let authOk = false;
  let reachDetail = '';
  const insecure = insecureBaseUrl(cfg);
  if (insecure) {
    // Not even probed: the credential must not leave the process for a cleartext destination.
    reachDetail = `SWAN_HIGGSFIELD_URL is "${insecure}", which is not https — the credential would be `
      + 'sent in cleartext. Set it to the vendor\'s https base URL, or unset it.';
  } else {
    try {
      const res = await fetchImpl(`${cfg.baseUrl}/requests/00000000-0000-0000-0000-000000000000/status`, {
        method: 'GET',
        headers: cfg.keyId && cfg.keySecret ? authHeader(cfg) : {},
      });
      const status = Number(res.status);
      if (status === 401 || status === 403) {
        reachDetail = `host reachable but the credential was rejected (${status}) — check the key id and secret`;
      } else if (status >= 500 || status === 429 || (status >= 300 && status < 400)) {
        reachDetail = `host answered ${status}, which does NOT prove the credential was accepted — `
          + (status === 429 ? 'the vendor rate-limited the probe'
            : status >= 500 ? 'the vendor failed before reaching a decision'
              : 'the vendor redirected instead of answering')
          + '. Retry when the vendor is healthy; this check will not call that a yes.';
      } else {
        authOk = true;
        reachDetail = `host reachable, credential accepted (probe answered ${status})`;
      }
    } catch (err) {
      reachDetail = `${cfg.baseUrl} unreachable (${err.message}) — is there a network path to the vendor?`;
    }
  }
  checks.push({ name: 'host + credential', ok: authOk, detail: reachDetail });

  return { provider: id, ok: checks.every(c => c.ok), checks };
}

/**
 * Submit, poll, download. Mirrors the local adapter's signature so the handler can
 * treat both lanes identically above this line.
 */
export async function generate(request, opts = {}) {
  const {
    env = process.env,
    fetchImpl = fetch,
    onProgress = async () => {},
    outPath,
    providerId = 'higgsfield/minimax-h3',
    timeoutMs = 15 * 60 * 1000,
    sleep,
    // ── THE GATE IS ON THIS PATH TOO, AND IT FAILS CLOSED ──────────────────────
    // Astra's round-2 F2. This function used to go `resolveConfig` -> `submit` with no
    // resolver anywhere in between, so the ONE path that actually spends money bypassed
    // enablement, the licence judgement and the D3 selection gate — all three of which are
    // raised inside `registry.resolve()`. Measured: `resolveConfig` reported
    // `configured: true` for a row that was `enabled: false` AND `pricingStatus: 'disputed'`,
    // from synthetic environment alone, while `resolve()` refused that same row twice.
    //
    // The defaults are the fail-closed ones and they are deliberate. `commercial: true`
    // means an unspecified caller gets the licence judgement rather than skipping it;
    // `explicitSelection: false` means an unspecified caller is treated as a default,
    // fallback, retry or saturation path, which is exactly what it is. A caller that knows
    // better says so, and has to say it explicitly.
    commercial = true,
    explicitSelection = false,
  } = opts;

  // The gate. Placed before `resolveConfig` so that nothing — not even reading the
  // credential — happens for a row that is not permitted to run.
  //
  // The options mirror the handler's call rather than inventing their own defaults:
  // `grants`/`enabled` come from the INJECTED env (letting the registry fall back to
  // `process.env` would make the `env` parameter decorative), and the territory is the
  // OPERATOR's, not the request's. An adapter that resolved with a laxer territory than the
  // handler would be a weaker gate than the one it is meant to enforce, which is the
  // failure mode this whole fix exists to remove.
  //
  // The `ProviderError` propagates UNCHANGED. It carries the code the handler keys on
  // (`E_PROVIDER_DISABLED`, `E_LICENCE_GRANT_REQUIRED`, `E_HOSTED_REQUIRES_EXPLICIT_SELECTION`),
  // and re-wrapping it would drop that code or duplicate it in a second vocabulary.
  resolve(providerId, {
    commercial,
    explicitSelection,
    territories: territories(env.SWAN_OPERATOR_TERRITORY),
    grants: readGrants(env),
    enabled: readEnabled(env),
  });

  const cfg = resolveConfig(env, providerId);
  if (!cfg.configured) {
    throw new HiggsfieldError('E_NOT_CONFIGURED',
      'Higgsfield provider is not configured. Run verify() to see exactly which field is missing.');
  }
  if (!outPath) throw new HiggsfieldError('E_NO_OUTPUT_PATH', 'generate() requires opts.outPath.');

  await onProgress(10, 'submitting to higgsfield');
  const job = await submit(request, cfg, fetchImpl);

  const final = await poll(job, cfg, fetchImpl, { timeoutMs, onProgress, sleep });

  if (final.status !== TERMINAL.completed) {
    // `nsfw` and `failed` are the vendor's words and are carried through rather than
    // flattened into one code — a moderation rejection is a different conversation
    // from a generation failure, and the vendor states neither is billed.
    const code = final.status === TERMINAL.nsfw ? 'E_NSFW' : 'E_GENERATION_FAILED';
    const detail = redactSecrets(final.error?.message || final.error || '', secretsOf(cfg));
    throw new HiggsfieldError(code,
      `Higgsfield request ${job.requestId} ended "${final.status}"${detail ? `: ${String(detail).slice(0, 200)}` : ''}.`);
  }

  const url = findArtifactUrl(final);
  if (!url) {
    throw new HiggsfieldError('E_NO_OUTPUT',
      `Request ${job.requestId} completed but carried no artifact URL. `
      + `Keys present: ${Object.keys(final).join(', ')}`);
  }
  // ── ROUND 20: THE RESPONSE BODY MUST NOT CHOOSE WHAT THIS PROCESS FETCHES ──
  // `findArtifactUrl` returns a string out of the vendor's body, and this line used to issue a
  // server-side GET to it with no check at all. Measured: `http://169.254.169.254/latest/meta-data/`
  // was fetched and its bytes written to disk. The scheme is what is checked, NOT the origin — the
  // vendor may legitimately serve artifacts from a CDN, and an origin allowlist built on a guess
  // would refuse real artifacts. A rule that refuses the normal case is broken, not fail-closed.
  if (!/^https:\/\//i.test(String(url))) {
    throw new HiggsfieldError('E_BAD_ARTIFACT_URL',
      `The completed request carries an artifact URL that is not https: ${String(url).slice(0, 120)}. `
      + 'Refusing to fetch it — the URL comes from the vendor\'s response body, so a non-https one '
      + 'would put the download in cleartext or point this process at an arbitrary host.');
  }

  await onProgress(85, 'downloading artifact');
  const dl = await fetchImpl(url, { method: 'GET' });
  if (!dl.ok) throw new HiggsfieldError('E_DOWNLOAD_FAILED', `Could not retrieve the artifact (${dl.status}).`);

  const bytes = Buffer.from(await dl.arrayBuffer());
  if (bytes.length === 0) throw new HiggsfieldError('E_EMPTY_ARTIFACT', 'The artifact came back empty.');

  // Honour the URL's real extension, not the caller's proposed one — same rule the
  // local adapter applies, for the same reason: a filename that misdescribes its
  // contents is a lie every downstream consumer inherits.
  const urlPath = String(url).split('?')[0];
  const ext = (urlPath.match(/\.[a-z0-9]{2,4}$/i) || ['.mp4'])[0].toLowerCase();
  const finalPath = outPath.replace(/\.[^.\\/]*$/, '') + ext;
  writeFileSync(finalPath, bytes);

  return {
    provider: providerId,
    // Named `promptId` to match the local adapter's result shape, carrying the
    // vendor's request id. One field, two vendors, because the consumer above does
    // not care which queue the id belongs to.
    promptId: job.requestId,
    statusUrl: job.statusUrl,
    outPath: finalPath,
    bytes: bytes.length,
    filename: finalPath.split(/[\\/]/).pop(),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    attribution: capabilities(providerId).attribution,
    // The vendor's terminal status, kept because `completed` after a `failed` retry
    // is information, and because the artifact came from a URL we do not own and
    // which the vendor retains for at least seven days.
    vendorStatus: final.status,
    sourceUrl: url,
  };
}

// The wire travels with the adapter so a caller registers one module. `envSuffix`,
// `redactSecrets`, `resolveConfig`, `submit`, `poll`, `cancel`, `isTerminal` and
// `findArtifactUrl` are all reachable from here, and were before this split.
export {
  HiggsfieldError, envSuffix, resolveConfig, redactSecrets, authHeader, secretsOf,
  submit, poll, cancel, TERMINAL, isTerminal, findArtifactUrl,
  insecureBaseUrl, describePollTimeout, DEFAULT_BASE_URL, POLL_INTERVAL_MS,
};
