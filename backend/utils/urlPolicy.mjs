/**
 * ============================================================================
 * FILE: urlPolicy.mjs
 * PURPOSE: URL-scheme and origin policy for values interpolated into an
 *          `href="..."` in outbound email. HTML escaping is NOT URL policy.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * `escapeHtmlAttribute` (utils/htmlEscape.mjs) escapes `& < > " '`. That stops a
 * value breaking out of the attribute. It does **not** stop the value being a
 * working `javascript:` URL:
 *
 *   escapeHtmlAttribute('javascript:alert(1)')
 *   // javascript:alert(1)     <- still executable, and quotes were never the problem
 *
 * HTML encoding and URL policy are different questions, and the email guard's own
 * rejected-rule note records that it conflated them. This module answers the second
 * question; the caller still applies the first.
 *
 * CONTRACT
 * --------
 * `validateEmailCtaUrl(value, { allowedOrigins })`:
 *   - accepts a string containing an **absolute HTTPS** URL;
 *   - rejects empty input, raw control characters, surrounding whitespace,
 *     credentials, protocol-relative URLs, and every non-HTTPS scheme;
 *   - parses with WHATWG `URL` and compares its **normalized origin** against an
 *     exact configured set;
 *   - rejects an empty or invalid origin set;
 *   - returns the normalized URL (`.href`) for subsequent attribute encoding.
 *
 * DELIBERATELY NOT DONE
 * ---------------------
 * No suffix matching, no substring matching, and no caller-supplied allowed-origin
 * list derived from the same untrusted value. `endsWith('sswanstudios.com')` accepts
 * `https://evil-sswanstudios.com`, which is the whole attack.
 *
 * HTTPS-ONLY, AND THAT IS A CHOICE WITH A COST
 * --------------------------------------------
 * The contract says absolute HTTPS. That matches production, where `FRONTEND_URL`
 * defaults to `https://sswanstudios.com`. It **breaks local development**, where a
 * CTA built from `FRONTEND_URL=http://localhost:5173` (see `.env.example`) would now
 * be rejected. The fix is to add the local origin AND the `http:` scheme to the
 * caller's policy in dev — not to loosen this helper. A predicate that silently
 * accepts `http:` in production is the thing this module exists to prevent.
 *
 * DEFAULT EMPTY, ON PURPOSE
 * -------------------------
 * `validateEmailCtaUrl(v)` with no options returns null. There is no built-in
 * allow-list: an origin set is a statement about *this deployment*, and baking one
 * in here would make the default permissive the day a domain changes. Callers pass
 * their own, read from inspected configuration.
 */

/** Schemes that are never acceptable in a link, listed for the diagnostic only. */
const KNOWN_DANGEROUS_SCHEMES = ['javascript', 'data', 'vbscript', 'file'];

/**
 * @typedef {object} UrlPolicyOptions
 * @property {Iterable<string>} allowedOrigins  Exact origins, e.g. `https://sswanstudios.com`.
 * @property {boolean} [allowInsecureHttp]      Dev-only escape hatch. Default false.
 */

/** A string value check that does not coerce. `new URL(123)` would be a type error. */
const isString = (value) => typeof value === 'string';

/**
 * Normalize an allowed-origin entry to a WHATWG origin, or null if it is unusable.
 * A bare hostname (`sswanstudios.com`) is NOT accepted: it has no scheme, and
 * guessing `https` here would silently widen the set the caller declared.
 */
function normalizeOrigin(entry) {
  if (!isString(entry)) return null;
  const trimmed = entry.trim();
  if (!trimmed) return null;
  if (trimmed !== entry) return null; // surrounding whitespace in config is a config bug
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  // An origin entry must be exactly an origin: no path, query, fragment or credentials.
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
  if (parsed.username || parsed.password) return null;
  return parsed.origin;
}

/**
 * Normalize an allowed-origin policy into the exact origin set it denotes.
 *
 * Exported so the *shape* of a policy is inspectable without guessing from a single
 * accept/reject outcome. A bare string and a one-element array both reject an
 * unrecognized URL, but only one of them is a correctly declared policy: resolving the
 * set is what tells those two apart. Diagnostics read this; the decision reads
 * `validateEmailCtaUrl`.
 *
 * @param {unknown} allowedOrigins
 * @returns {Set<string>} Normalized origins. Empty when the policy is absent or unusable.
 */
export function resolveAllowedOrigins(allowedOrigins) {
  if (!allowedOrigins) return new Set();
  // A bare string satisfies `Iterable<string>` but denotes no origins: iterating it
  // yields code points, so `'https://a.example'` would resolve to single characters.
  //
  // NOTE ON PROOF: deleting this line does not change any observed result, because
  // `normalizeOrigin` rejects each single character anyway (none parses as an absolute
  // URL), so the set comes out empty either way. A mutation test that removes this line
  // SURVIVES, and that is recorded rather than papered over. The line is kept as
  // defence in depth: it states the intent directly instead of relying on a downstream
  // function's rejection behaviour to produce the same outcome by accident. It is not
  // load-bearing, and it is not claimed to be.
  if (isString(allowedOrigins)) return new Set();
  if (typeof allowedOrigins?.[Symbol.iterator] !== 'function') return new Set();
  const set = new Set();
  for (const entry of allowedOrigins) {
    const origin = normalizeOrigin(entry);
    if (origin) set.add(origin);
  }
  return set;
}

/**
 * Validate a CTA destination.
 *
 * @param {unknown} value
 * @param {UrlPolicyOptions} [options]
 * @returns {string|null} The normalized absolute URL, or null when rejected.
 *   Returning `null` rather than throwing is deliberate: a rejected CTA must drop
 *   the link, not fail the mail. The caller decides whether that is an alert.
 */
export function validateEmailCtaUrl(value, options = {}) {
  const { allowedOrigins, allowInsecureHttp = false } = options;

  if (!isString(value)) return null;
  if (!value) return null;

  // Surrounding whitespace is a rejection, not something to trim away: a value that
  // needed trimming was not the URL the caller thought it had.
  if (value !== value.trim()) return null;

  // Raw control characters (C0, DEL) must never reach a URL. `new URL()` strips some
  // of these, which would silently convert a rejected value into an accepted one.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(value)) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  // Reject before scheme checks so the diagnostic is about the shape, not the scheme:
  // `//evil.example/x` parses with the *base* scheme and would pass an https test.
  if (parsed.username || parsed.password) return null;

  const scheme = parsed.protocol;
  const httpsOk = scheme === 'https:';
  const httpOk = allowInsecureHttp && scheme === 'http:';
  if (!httpsOk && !httpOk) return null;

  // An empty or invalid origin set rejects everything. This is the difference between
  // "no policy configured" and "policy configured and this value is not in it" — the
  // first must not be permissive.
  if (!allowedOrigins) return null;

  // Resolve the policy through the shared helper: a bare string and a non-iterable both
  // denote NO origins rather than throwing or iterating into single characters.
  const set = resolveAllowedOrigins(allowedOrigins);
  if (set.size === 0) return null;

  // Exact normalized-origin comparison. `parsed.origin` lowercases the host and drops
  // the default port, so this is not a string prefix test wearing a different hat.
  if (!set.has(parsed.origin)) return null;

  return parsed.href;
}

/**
 * True when `value` is a scheme known to be dangerous, for diagnostics only.
 * Never used to *decide* acceptance — acceptance is decided above, positively.
 */
export const isKnownDangerousScheme = (value) => {
  if (!isString(value)) return false;
  try {
    return KNOWN_DANGEROUS_SCHEMES.includes(new URL(value).protocol.replace(':', ''));
  } catch {
    return false;
  }
};

/**
 * Read the allowed-origin set for outbound email CTA links from inspected
 * configuration. Returns a frozen array; an empty array is a valid answer and a
 * meaningful one (it means "no CTA links will be emitted"), not an error.
 *
 * Sources, in order: `EMAIL_CTA_ALLOWED_ORIGINS` (comma-separated) if set and
 * non-empty, otherwise `FRONTEND_URL`. Both are existing, trusted configuration —
 * no new production environment variable is introduced by this module.
 */
export function emailCtaAllowedOrigins(env = process.env) {
  const declared = (env.EMAIL_CTA_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (declared.length > 0) return Object.freeze(declared);
  const frontend = (env.FRONTEND_URL || '').trim();
  return Object.freeze(frontend ? [frontend] : []);
}
