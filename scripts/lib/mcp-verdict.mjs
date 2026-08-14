/**
 * mcp-verdict.mjs — the verdict logic that tells "expired token" from "not configured".
 * =====================================================================================
 * Extracted from check-mcp-health.mjs at the 300-line cap (Rule 4 prescribes extraction over
 * comment-shaving). This is the part that MATTERS: a wrong verdict launders a guess into an
 * authoritative-looking answer, which is worse than no tool at all.
 *
 * Two failure directions, both real and both shipped at least once:
 *   false NEGATIVE — a rejected token reported as anything else  -> the 5-session recurrence continues
 *   false POSITIVE — a healthy server reported as token-rejected -> Sean rotates a WORKING credential
 *
 * @module lib/mcp-verdict
 */
/**
 * Header names that actually carry a credential. Allowlist on purpose — see the note at the
 * `hasCredential` call site for why unrecognized headers must read as "no credential".
 */
const AUTH_HEADERS = new Set([
  'authorization', 'proxy-authorization', 'x-api-key', 'api-key', 'x-auth-token', 'x-access-token',
]);

/** True when the headers we will TRANSMIT contain something that can authenticate. */
export const credentialHeadersIn = (headers) =>
  Object.keys(headers ?? {}).some((k) => AUTH_HEADERS.has(k.toLowerCase()));

/**
 * The three buckets a verdict can land in, and the ONLY place that mapping is decided.
 *
 * WHY THIS IS A RETURNED FIELD AND NOT A STRING MATCH AT THE CALL SITE: the caller used to route
 * with `verdict.startsWith('REACHABLE')`, which silently swallowed
 * `'REACHABLE — HTTP 304 (cache validation, no body)'` — a BROKEN endpoint — into `unverified`,
 * flipping its exit code 1 -> 2 and letting a config containing one 304-answering server exit 0.
 * Prefix matching over prose is a collision waiting for the next verdict string to be written; the
 * bucket belongs to whoever decides the verdict. Two policies for one question is how a fix lands
 * in only one of them (Kimi round 16, S2).
 *
 *   verified   — something was actually PROVEN healthy
 *   unverified — no fault found, but nothing proven either (credential lives elsewhere)
 *   unhealthy  — genuinely broken; outranks everything else in the exit code
 */
export const BUCKETS = Object.freeze({ VERIFIED: 'verified', UNVERIFIED: 'unverified', UNHEALTHY: 'unhealthy' });

/**
 * Map an observed result to a plain-language cause + the exact action that fixes it.
 * `body` is matched here and NEVER returned — the caller only receives the verdict.
 *
 * `hasCredential` gates EVERY branch that asserts something about the credential — not just
 * 401/403. Gating only the branch a reviewer named, three times running, is how this file kept
 * shipping the same defect one clause over (Kimi round 15, S2.3).
 *
 * It defaults to FALSE, matching this module's documented asymmetry: the safe failure direction is
 * "no credential was sent", because that under-claims. A `true` default pointed the other way — any
 * future call site omitting the argument would silently ungate every credential-asserting branch,
 * re-arming the round-15 defect for the next caller. Explicit at the call site beats default-unsafe
 * (Kimi round 16, L3).
 */
export function diagnose(status, body = '', hasCredential = false) {
  // A 401 proves the token is BAD only if a token was actually SENT. Servers whose credential lives
  // outside the config — Claude Code's interactive OAuth, for instance — have no Authorization
  // header here, so this probe is unauthenticated by construction and its 401 says nothing about
  // their health. Reporting those as TOKEN REJECTED tells Sean to rotate a WORKING credential: the
  // exact inverse of the failure this tool exists to kill. Caught live on a real server whose tools
  // were registered and working while this tool called its token rejected (round 14, self-found).
  const NO_CREDENTIAL = {
    bucket: BUCKETS.UNVERIFIED,
    verdict: 'CANNOT VERIFY — no credential in config',
    remedy: 'This probe sent no recognized auth header because the config carries none, so the 401 is '
      + 'the probe being unauthenticated — NOT evidence about the server. Its credential is handled '
      + 'elsewhere (typically interactive OAuth via Claude Code). Do NOT rotate anything on this '
      + 'basis. If its tools are missing, re-authenticate it in an interactive session and restart.',
  };
  if (!hasCredential && (status === 401 || status === 403)) return NO_CREDENTIAL;
  const REJECTED = {
    bucket: BUCKETS.UNHEALTHY,
    verdict: 'CONFIGURED BUT TOKEN REJECTED',
    remedy: 'The server IS configured — the credential is expired/revoked, so it registers ZERO tools. '
      + 'Do NOT report this as "not configured". Fix: generate a fresh token, replace the Authorization '
      + 'header value for this server, then RESTART Claude Code fully (MCP servers connect at startup).',
  };
  // STATUS FIRST, body only as a last-resort tiebreaker. The body regex used to be OR'd with the
  // status check, so it ran against EVERY response — a healthy 200 whose payload merely contained
  // the word "unauthorized" was reported as a rejected token, telling Sean to rotate a working
  // credential. That is the fifth-recurrence failure in the opposite direction (Kimi round 2, F2).
  if (status === 401 || status === 403) return REJECTED;
  if (status !== null && status >= 200 && status < 300) {
    // A null-body status (204/205) proves the server was REACHED and did not reject the credential —
    // it does not prove acceptance, since a proxy can answer 204 without ever challenging auth.
    // Same HEALTHY bucket (so the exit code is unchanged) but the remedy stops overclaiming, which
    // is the Rule 75 class this file exists to delete (Kimi round 9, O1).
    const bodiless = status === 204 || status === 205;
    // "accepts the credential" is a claim about a credential — it cannot be made when none was
    // sent. An unauthenticated 2xx proves reachability and nothing more (round 15, S2.3).
    if (!hasCredential) {
      return {
        bucket: BUCKETS.UNVERIFIED,
        verdict: 'REACHABLE — credential not tested',
        remedy: 'The server answered, but this probe sent no credential, so nothing was proven about '
          + 'auth. Its credential is handled elsewhere (typically interactive OAuth). If tools are '
          + 'missing, re-authenticate in an interactive session and RESTART Claude Code.',
      };
    }
    return {
      bucket: BUCKETS.VERIFIED,
      verdict: 'HEALTHY',
      remedy: bodiless
        ? 'Reached, and the credential was NOT rejected — but a bodiless response does not prove it '
          + 'was accepted. If tools are missing, RESTART Claude Code and check the server\'s own logs.'
        : 'Server answers and accepts the credential. If tools still are not listed, RESTART Claude Code.',
    };
  }
  if (status === null) {
    return { bucket: BUCKETS.UNHEALTHY, verdict: 'UNREACHABLE', remedy: 'Network/DNS/timeout — not an auth problem. Check connectivity, then retry.' };
  }
  if (status === 304) {
    // Carved out BEFORE the redirect branch: 304 is a cache-validation response with no body, not a
    // moved endpoint, so "update the url in config" would be wrong advice — and read-capped's header
    // lists 304 among the null-body statuses, so leaving it here would have the verdict layer
    // contradicting a sibling module's documentation (Kimi round 10, O1).
    // NOT "UNEXPECTED HTTP 304": that string is reserved for the genuinely-unhandled fallback, and
    // 304 now has a dedicated branch — calling a handled status unexpected is false, and it would
    // merge with tool-gap verdicts for anything aggregating them (Kimi round 11, N1).
    return {
      // UNHEALTHY, deliberately. A POST `initialize` drawing a cache-validation response is an
      // endpoint not functioning as an MCP server — broken, not merely unprobeable. Round 11 pinned
      // its exit code as load-bearing; the prefix-matching router had silently reclassified it to
      // unverified, so a config with one 304 endpoint plus one healthy server exited 0 (round 16, S2).
      bucket: BUCKETS.UNHEALTHY,
      verdict: 'REACHABLE — HTTP 304 (cache validation, no body)',
      remedy: 'Cache-validation response to a POST — the server is reachable but returned no '
        + 'initialize payload. Check the server\'s own logs; this is not a URL problem.',
    };
  }
  if (status >= 300 && status < 400) {
    // Never print Location — a redirect target can itself carry a tokenized URL.
    return {
      bucket: BUCKETS.UNHEALTHY,
      verdict: `REDIRECT (HTTP ${status})`,
      remedy: 'Endpoint redirects. Update the url in config to the final location. NOT followed on purpose: '
        + 'the credential is never forwarded to another origin.',
    };
  }
  if (status >= 500) return { bucket: BUCKETS.UNHEALTHY, verdict: 'SERVER ERROR', remedy: 'Upstream is failing. Not a local config problem. Retry later.' };
  // Non-2xx, non-auth, non-redirect: the body is the only signal left, so the regex is legitimate —
  // but ONLY if a credential was sent. An unauthenticated probe drawing a 400 "unauthorized" would
  // otherwise still tell Sean to rotate a working token (round 15, S2.3).
  if (/invalid_token|invalid access token|unauthorized/i.test(body)) {
    return hasCredential ? REJECTED : NO_CREDENTIAL;
  }
  return { bucket: BUCKETS.UNHEALTHY, verdict: `UNEXPECTED HTTP ${status}`, remedy: 'Unhandled status — check the server\'s own logs.' };
}
