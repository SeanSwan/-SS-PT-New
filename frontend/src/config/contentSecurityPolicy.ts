/**
 * frontend/src/config/contentSecurityPolicy.ts
 * ============================================
 * SWA-104 — the production Content-Security-Policy for the public site.
 *
 * WHY THIS LIVES IN THE BUNDLE AND NOT ONLY IN render.yaml
 * --------------------------------------------------------
 * sswanstudios.com is served by the Render STATIC SITE (`swanstudios-frontend`),
 * not by the Express backend. Helmet's CSP in backend/core/app.mjs therefore only
 * ever reached /api/* responses — never the HTML document a visitor loads.
 *
 * render.yaml already declared a `headers:` block (2026-07-28 launch hardening),
 * but that service is NOT Blueprint-synced — its headers are configured in the
 * Render dashboard, so everything written in render.yaml is inert for it. A live
 * probe of https://sswanstudios.com/ returned no CSP, no X-Frame-Options, no
 * Referrer-Policy, no Permissions-Policy and no HSTS; only Render's default
 * x-content-type-options. Meanwhile /api/health — same host, same Cloudflare
 * edge — returned the full helmet policy, which proves Cloudflare is NOT
 * stripping headers: the static site simply never sent any.
 *
 * A <meta http-equiv> tag is the only delivery path that ships with the build
 * artifact and therefore cannot be lost to hosting configuration. It is injected
 * at head-prepend by a build-only Vite plugin (see vite.config.ts) so that it is
 * absent from `npm run dev` — a dev document carrying this policy would break the
 * local http://localhost:10000 API proxy under `upgrade-insecure-requests`.
 *
 * WHAT THIS POLICY ACTUALLY BUYS (stated plainly, not overstated)
 * --------------------------------------------------------------
 * The fetch directives are deliberately PERMISSIVE (`https:` rather than a host
 * allowlist). The app legitimately loads from Google Fonts, Stripe, jsDelivr
 * (MediaPipe wasm), unpkg (ffmpeg core), Cloudflare R2, ReadyPlayerMe, YouTube
 * and Vimeo, and several of those paths (checkout, content-studio compression,
 * the admin world map) cannot be exercised from a local unauthenticated build.
 * A tight host allowlist that is wrong breaks a revenue path silently in
 * production; a permissive one cannot. `script-src` must keep 'unsafe-inline'
 * regardless — index.html relies on an inline `onload` attribute for the async
 * font swap — and once 'unsafe-inline' is present a host allowlist buys little,
 * because an injected inline script runs either way.
 *
 * So the protection here is concentrated in the directives that stop real attack
 * classes AND cannot break a resource load:
 *   object-src 'none'   — no plugin/embed injection
 *   base-uri 'self'     — no <base> hijack redirecting every relative URL
 *   form-action 'self'  — no form-post exfiltration to an attacker origin
 *   upgrade-insecure-requests — no mixed-content downgrade
 * plus 'unsafe-eval' being ABSENT (verified: zero `new Function(` across all 446
 * production bundles), and 'wasm-unsafe-eval' scoped to the WebAssembly the
 * MediaPipe and ffmpeg features genuinely need.
 *
 * NOT DELIVERABLE FROM CODE — these are header-only and need the Render dashboard:
 *   frame-ancestors / X-Frame-Options (clickjacking), Strict-Transport-Security,
 *   Permissions-Policy. `frame-ancestors` is intentionally omitted below because
 *   browsers ignore it in a <meta> tag and log a console warning. The matching
 *   values live in render.yaml for when Blueprint sync is enabled.
 *
 * Referrer-Policy IS deliverable without a header, via <meta name="referrer">
 * in index.html. Two inert tags were removed from that block at the same time:
 * browsers honour X-Content-Type-Options and X-XSS-Protection only as real HTTP
 * headers and ignore the http-equiv form, so they advertised protection they did
 * not provide. Render already sends x-content-type-options: nosniff for real
 * (confirmed by live probe), and X-XSS-Protection is deprecated. A sibling
 * X-Frame-Options meta had already been removed for logging a console error —
 * which was this same ignored-in-meta behaviour all along.
 *
 * WHY THIS RATIONALE IS NOT IN index.html: HTML comments are served to every
 * visitor. An earlier draft of this slice explained the gap inline and shipped a
 * public note naming the exact controls the site is still missing. Keep security
 * reasoning in this module — it is imported only by vite.config.ts at build time
 * and is never bundled into client JavaScript.
 *
 * Tightening the fetch directives to a real host allowlist is a separate,
 * evidence-gated slice: it needs report-uri telemetry from real traffic, not a
 * guess made from grep.
 */

/**
 * NOTE FOR DEAD-CODE TRIAGE: static analysis (Fallow) reports the four exports
 * below as unused, because their only consumer is contentSecurityPolicy.test.ts
 * and — for PRODUCTION_CSP_HEADER — a YAML file no import graph can see. They are
 * the test's contract surface and the drift oracle that keeps render.yaml honest.
 * Do not prune them; deleting them removes the guard, not dead weight.
 *
 * Directives are declared as an ordered list so the test suite can assert on
 * individual entries rather than string-matching one long line.
 */
export const PRODUCTION_CSP_DIRECTIVES: readonly string[] = [
  // Permissive baseline — the strict directives below are what carry the policy.
  "default-src 'self' https: data: blob:",
  // 'unsafe-inline' is required by the async font-swap onload attribute in
  // index.html. 'wasm-unsafe-eval' is required by MediaPipe (useMediaPipe.ts)
  // and ffmpeg.wasm (videoCompressor.ts). Full 'unsafe-eval' is NOT included.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https:",
  // styled-components injects <style> at runtime; Google Fonts serves stylesheets.
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  // R2-hosted video, plus blob: for locally generated/compressed media.
  "media-src 'self' data: blob: https:",
  // wss: covers the Socket.IO connection to the backend Render origin.
  "connect-src 'self' blob: data: https: wss:",
  // Stripe, YouTube and Vimeo embeds.
  "frame-src 'self' https:",
  // ffmpeg.wasm and MediaPipe both spawn workers from blob: and from their CDN.
  "worker-src 'self' blob: https:",
  "manifest-src 'self'",
  // --- the directives that actually stop attacks ---
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
];

/** The single-line policy string used as the <meta> content attribute. */
export const PRODUCTION_CSP = PRODUCTION_CSP_DIRECTIVES.join('; ');

/**
 * frame-ancestors cannot be delivered by <meta> — browsers ignore it there. It is
 * exported so render.yaml's header value and this module stay in one place
 * conceptually, and so the test suite can assert it is absent from the meta policy.
 */
export const FRAME_ANCESTORS_DIRECTIVE = "frame-ancestors 'self'";

/** The header form of the same policy, for Render/any header-capable host. */
export const PRODUCTION_CSP_HEADER = `${PRODUCTION_CSP}; ${FRAME_ANCESTORS_DIRECTIVE}`;

/**
 * The tag the policy is anchored to. It is deliberately NOT head-prepend.
 *
 * A meta CSP only governs what the parser sees after it, so first-in-head is the
 * instinctive choice — but the charset declaration must land inside the first
 * 1024 bytes of the document or the browser falls back to guessing the encoding.
 * Prepending a ~900-byte policy left only ~310 bytes of headroom before charset
 * crossed that line, and it would have failed silently the next time a directive
 * was added. Anchoring immediately AFTER charset removes the coupling entirely:
 * the only thing preceding the policy is a declaration that fetches nothing.
 */
const CHARSET_META = /<meta\s+charset=[^>]*>/i;

/**
 * Inject the policy into an HTML document, immediately after <meta charset>.
 *
 * Throws rather than returning the document unchanged when the anchor is missing.
 * A silent no-op here would reproduce this ticket exactly — a policy that exists
 * in the source tree and never reaches a visitor — so the build must fail loudly.
 */
export const injectCspMeta = (html: string): string => {
  if (!CHARSET_META.test(html)) {
    throw new Error(
      'swan-production-csp-meta: no <meta charset> anchor found in index.html. ' +
        'The Content-Security-Policy would have shipped nowhere. Restore the ' +
        'charset tag or update CHARSET_META in src/config/contentSecurityPolicy.ts.',
    );
  }

  return html.replace(
    CHARSET_META,
    (charsetTag) =>
      `${charsetTag}\n    <meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}">`,
  );
};
