/**
 * linkUrl — allowlist the scheme of a URL before it lands in an `<a href>`.
 *
 * WHY THIS EXISTS. `SpotlightRail.tsx` renders a publisher link whose URL arrives from
 * SwanGuard through the HMAC-signed bridge and is stored by
 * `backend/routes/bridge/bridgeIngestRoutes.mjs` as `sourceUrl: str(source.url, 2048)` —
 * trimmed and truncated, never scheme-checked. React 18 does **not** neutralise a
 * `javascript:` href: it emits a development warning ("A future version of React will
 * block javascript: URLs") and renders the attribute unchanged. Verified against the
 * installed react-dom 18.3.1:
 *
 *   renderToStaticMarkup(<a href="javascript:alert(document.cookie)">chip</a>)
 *   -> <a href="javascript:alert(document.cookie)">chip</a>
 *
 * So an untrusted URL reaching this sink is stored XSS, and the sink is live: the rail is
 * mounted at `UserDashboard/components/ClientDashboardHome.railSections.tsx` (`ClientRightRail`).
 *
 * WHY NOT `sanitizeImageUrl`. That helper is an ORIGIN allowlist for our own R2 media
 * domain. A Spotlight source link points at an arbitrary publisher by design, so an origin
 * allowlist would reject every legitimate source. What both sinks share is the question
 * this module answers: is the SCHEME one we are willing to hand to a browser?
 *
 * ALLOWLIST, NOT DENYLIST. Enumerating the bad schemes (`javascript:`, `data:`,
 * `vbscript:`, `blob:`, `file:`…) loses to the next one someone invents, and to the next
 * spelling of this one. Only `http:` and `https:` are returned; everything else is null.
 *
 * The caller decides what null means. Here it degrades to a plain `<span>`: the source
 * NAME still renders, so a rejected URL costs the reader a click, not the attribution.
 */

/** Schemes a browser may be asked to navigate to on the reader's behalf. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/** C0 controls and DEL. No legitimate publisher URL contains a raw one. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Returns `value` if it is an absolute http(s) URL safe to place in `href`, otherwise null.
 *
 * Rejected: non-http(s) schemes in any casing, relative paths, protocol-relative `//host`,
 * anything containing raw control characters, and anything that does not parse.
 */
export function sanitizeLinkHref(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (CONTROL_CHARS.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // WHATWG URL lower-cases the scheme, so `JaVaScRiPt:` and `java\tscript:` both land here
  // as `javascript:` and are refused by the allowlist rather than by a prefix match.
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) return null;

  return trimmed;
}
