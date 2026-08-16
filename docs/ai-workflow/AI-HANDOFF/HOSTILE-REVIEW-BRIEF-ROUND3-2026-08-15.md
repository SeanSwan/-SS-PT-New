# SwanGuard round-3 hostile review brief (2026-08-15)

## What this is

SwanGuard is a greenfield TypeScript/Node service holding household and civic
data. It is **pre-production: nothing in this brief has ever run in production.**
Runtime is Node with WHATWG `Request`/`Response` (not Express). Tests: vitest,
888 pass / 0 fail, `tsc` exit 0.

Four commits of security hardening were just written by an AI agent in response
to two prior hostile-review rounds. **Every prior round found MORE defects in the
freshly-changed code than in the code it replaced.** Two of the eight defects
already fixed were introduced by the fixes for earlier defects.

**Your job is to attack THESE FIXES.** Do not review the pre-existing codebase.

## Ground rules for your output

- Cite `file:line` for every finding. A finding with no line reference is noise.
- State a **concrete exploit or failure path**: inputs → observable wrong result.
  "Consider hardening X" with no failure path will be discarded.
- Rank: CRITICAL (exploitable now) / HIGH (outage or bypass under realistic
  config) / MEDIUM / LOW.
- **Say when you are unsure.** A previous reviewer's proposed fix for the
  `unknown` chain entry was ITSELF a bypass — filtering `unknown` out of the
  X-Forwarded-For chain promotes a caller-written entry into the trusted
  position. Only a test caught it. Reason about what your fix would break.
- Prefer few high-confidence findings over many speculative ones.

## Deployment shape

- Target platform: Render. One TLS-terminating proxy in front of the service.
- `SWANGUARD_TRUSTED_PROXY_HOPS: "1"` in production (`render.yaml`).
- Static web build served from the API's own origin (no CORS anywhere; session
  and CSRF cookies are `SameSite=Strict`).
- All three sign-in paths are CLOSED in production today: `dev-sign-in` 403,
  `magic-link-intents` 503, `passkeys` 404. Magic-link is the next work item, so
  reason about what arms when it opens.

## Request pipeline (apps/api/src/app.ts)

```ts
async handle(request) {
  const requestId = getRequestId(request);
  const blocked = httpHardening.guard(request, requestId) ?? httpHardening.authGuard(request, requestId);
  if (blocked) return httpHardening.secure(blocked);
  let response: Response;
  try { response = await dispatchRequest({ ...ELIDED..., request, requestId, staticSite }); }
  catch (error) { response = errorResponse(error, requestId); }
  httpHardening.recordAuth(request, response);
  return httpHardening.secure(response);
}
```

Dispatch order: if a static handler is configured and the path is NOT under
`/api`, the static handler answers. Otherwise API routing.

## The four commits under review

| Commit | What it claims to fix |
|---|---|
| `a84f9a7` | link escape out of the served root; year-long cache on unhashed files; boot check that passed on a *directory* named index.html |
| `ea404ed` | rate limiter trusted `x-real-ip` (caller-supplied) — a bypass at the production setting; production boot guard on `SWANGUARD_TRUSTED_PROXY_HOPS` |
| `9b20fb4` | global sign-in kill switch via a shared lockout key; IPv6 /64 bypass; `unknown` chain entries; a symlink-deploy regression the agent introduced; empty-shell boot |
| `ee63b1c` | fixed enum startup reason codes (`STARTUP_E_*`) |

## Highest-value targets, in order

1. **`clientKey` / `authKey` / `normaliseIdentity` in httpHardening.ts** — the
   change most likely to cause an outage. Chains longer or shorter than `hops`;
   IPv6 normalisation correctness (what does an IPv4-mapped address do?); ports;
   whether removing the lockout on the shared identity removed brute-force
   protection somewhere it was load-bearing.
2. **`resolveWithinRoot` in staticSite.ts** — TOCTOU between `realpathSync`,
   `statSync` and `readFile`; case-insensitive filesystems; the per-request root
   resolution just added; whether `content-type` derived from the REQUESTED name
   rather than the resolved file is exploitable.
3. **`assertTrustedProxyConfiguration`** — is `>= 1` the right floor? Does it
   brick a legitimate topology? Does it detect a WRONG (too high) value?
4. **`startupFailureCode`** — does naming a gate leak anything useful to an
   attacker? Is the lookup itself sound?
5. **Cache-control policy** (`isContentHashed`) and the HTML CSP.

## Known and already accepted — do NOT re-report these

- Static assets share the API's 2000/min per-IP bucket (NAT'd office → whole
  building 429s). Owner's capacity decision, deliberately deferred.
- `/api/health` does not exercise static serving.
- No runtime detection of a hop count that is set but WRONG.
- Direct-to-node topologies would trust a caller-written `x-forwarded-for`.
- `isContentHashed` runs on the requested path, not the resolved basename.
- No `ETag`/`Last-Modified` on `no-cache` responses.
- `HEAD` drops `content-length`.
- `recordAuthOutcome` clears a lockout on the failure after it locks — proven
  unreachable from the app (`app.ts` returns early on `authGuard`).
- Per-request `realpathSync` + `statSync` cost on a network mount.
- The lexical `..` check in `decodePathname` is a redundant pre-filter that no
  test can distinguish from the realpath containment check.

Anything else is fair game.

---

# SOURCE UNDER REVIEW

## apps/api/src/httpHardening.ts (COMPLETE)

```ts
import {
  SECURITY_HEADERS,
  checkLockout,
  evaluateRateLimit,
  recordAuthOutcome,
  requestBodyExceedsLimit,
  type LockoutConfig,
  type LockoutState,
  type RateLimitConfig,
  type RateLimitWindow
} from '@family-first/domain';
import { createHash } from 'node:crypto';
import { ConfigError } from './config';
import { jsonResponse } from './http';

/**
 * Phase 127 HTTP hardening — the stateful boundary wrapper. Holds the rate-limit
 * windows + auth lockout state and exposes: `guard` (size cap + per-IP + per-
 * session rate limits → a structured 413/429 receipt or null), `authGuard` (auth
 * brute-force lockout → 429 or null), `recordAuth` (record a sign-in outcome), and
 * `secure` (apply the helmet-class headers to every response). All decisions are
 * delegated to the pure domain primitives; this module only owns the maps.
 */

export interface HttpHardeningConfig {
  ipRateLimit: RateLimitConfig;
  sessionRateLimit: RateLimitConfig;
  maxBodyBytes: number;
  authLockout: LockoutConfig;
  now?: () => number;
  /**
   * P1-6: how many proxy hops in front of this service are trusted.
   *
   * `x-forwarded-for` was previously honoured unconditionally, so a caller could
   * send a unique spoofed IP per request to evade the per-IP rate limit AND grow
   * the limiter map without bound. 0 means trust nothing and use the socket-level
   * identity. With N > 0 the client IP is taken N entries from the RIGHT of the
   * chain, because only the hops your own proxies appended are trustworthy —
   * anything further left was supplied by the caller. Render terminates TLS at one
   * proxy, so a Render deployment sets 1.
   */
  trustedProxyHops?: number;
  /** Upper bound on limiter/lockout entries, so spoofed keys cannot exhaust memory. */
  maxTrackedKeys?: number;
}

export const defaultHttpHardeningConfig: HttpHardeningConfig = {
  authLockout: { lockoutMs: 15 * 60_000, maxFailures: 50, windowMs: 15 * 60_000 },
  ipRateLimit: { limit: 2000, windowMs: 60_000 },
  maxBodyBytes: 1_000_000,
  maxTrackedKeys: 10_000,
  sessionRateLimit: { limit: 2000, windowMs: 60_000 },
  trustedProxyHops: 0
};

/**
 * The rate-limit key used when no trustworthy client identity is available.
 * Shared by every caller on purpose: a single strict bucket is safe, whereas any
 * caller-supplied identity is an unlimited supply of buckets.
 */
const UNTRUSTED_ORIGIN = 'untrusted-origin';

/**
 * Buckets a client identity.
 *
 * IPv6 is collapsed to its /64 prefix. Every IPv6 client is allocated at least a
 * /64, so keying on the full address means a client can walk 2^64 addresses —
 * one fresh rate-limit bucket per request, and the tracked-key budget burned
 * along the way. A /64 is the smallest unit an operator actually controls, so it
 * is the right unit to limit.
 *
 * IPv4 and anything unrecognised is returned as-is; a value we cannot parse is
 * still a stable key, which is all the limiter needs.
 */
function normaliseIdentity(entry: string): string {
  // `[2001:db8::1]:443` — brackets and an optional port.
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(entry);
  const value = bracketed ? bracketed[1] : entry;

  if (!value.includes(':')) return value;

  const [head, tail] = value.split('::');
  const headParts = head === '' ? [] : head.split(':');

  if (tail === undefined) {
    // No compression: already the full eight groups.
    return headParts.slice(0, 4).map(normaliseHextet).join(':') + '::/64';
  }

  const tailParts = tail === '' ? [] : tail.split(':');
  const filler = Array.from({ length: Math.max(0, 8 - headParts.length - tailParts.length) }, () => '0');

  return [...headParts, ...filler, ...tailParts].slice(0, 4).map(normaliseHextet).join(':') + '::/64';
}

function normaliseHextet(group: string): string {
  return group.toLowerCase().replace(/^0+(?=.)/, '');
}

const AUTH_ATTEMPT_PATHS = new Set([
  '/api/auth/dev-sign-in',
  '/api/auth/magic-link/consume',
  '/api/auth/passkeys/login/verify'
]);

/**
 * Refuses to build a production server whose client-identity source is unusable.
 *
 * With `trustedProxyHops` at 0 there is no trustworthy per-caller identity, so
 * every request — API and static asset alike — shares ONE rate-limit bucket and
 * ONE auth-lockout bucket. On a deployed service that is not a safety margin, it
 * is an outage waiting for traffic: ordinary load exhausts the shared quota and
 * every user gets 429, and a single attacker can trip the shared lockout for
 * everybody. The failure looks like a traffic problem, not a config problem,
 * which is what makes it expensive to diagnose.
 *
 * Failing at boot is the cheap version of that discovery. This is deliberately
 * NOT a silent default of 1: guessing a hop count that does not match reality
 * trusts a `x-forwarded-for` entry the caller wrote, which is the spoofing hole
 * P1-6 closed. The operator has to state the real number.
 *
 * Never set higher than the number of proxies actually in front of this service
 * — each extra hop is one more position in the chain the caller controls.
 * Render terminates TLS at one proxy, so a Render deployment sets 1.
 *
 * Only enforced in production: development and test have no proxy by design.
 */
export function assertTrustedProxyConfiguration(config: {
  nodeEnv: 'development' | 'test' | 'production';
  trustedProxyHops: number;
}): void {
  if (config.nodeEnv !== 'production') return;

  if (config.trustedProxyHops < 1) {
    throw new TrustedProxyConfigurationError(
      'SWANGUARD_TRUSTED_PROXY_HOPS is ' +
        `${config.trustedProxyHops} in production, so no per-caller identity can be derived and every ` +
        'request would share one rate-limit and auth-lockout bucket. Set it to the number of proxies ' +
        'actually in front of this service (Render terminates TLS at one, so: 1). Never set it higher ' +
        'than the real count — each extra hop is one more spoofable position in x-forwarded-for.'
    );
  }
}

/**
 * Extends ConfigError so the runtime re-throws it unwrapped — `createApiRuntime`
 * wraps anything else into a generic `ApiRuntimeError`, which would erase the
 * type the startup reason code is selected from.
 */
export class TrustedProxyConfigurationError extends ConfigError {
  constructor(message: string) {
    super(message);
    this.name = 'TrustedProxyConfigurationError';
  }
}

export interface HttpHardening {
  guard(request: Request, requestId: string): Response | null;
  authGuard(request: Request, requestId: string): Response | null;
  recordAuth(request: Request, response: Response): void;
  secure(response: Response): Response;
}

export function createHttpHardening(config: HttpHardeningConfig = defaultHttpHardeningConfig): HttpHardening {
  const ipWindows = new Map<string, RateLimitWindow>();
  const sessionWindows = new Map<string, RateLimitWindow>();
  const lockouts = new Map<string, LockoutState>();
  const now = config.now ?? (() => Date.now());

  function clientKey(request: Request): string {
    const hops = config.trustedProxyHops ?? 0;

    // `x-real-ip` is NEVER consulted. It is conventionally set by a proxy, but
    // nothing stops a caller sending it and this process cannot tell the two
    // apart. It used to be the fallback on all three paths below, which meant a
    // fresh `X-Real-IP` per request bought a fresh rate-limit bucket every time —
    // at hops=0 and, whenever `x-forwarded-for` was absent or empty, at hops=1
    // too, which is the production setting. P1-6 closed that hole in
    // `x-forwarded-for` and left it open one header over.
    //
    // With no trusted chain every caller shares UNTRUSTED_ORIGIN. That is
    // degraded (one attacker can spend the shared quota, and the shared auth
    // lockout) but it is not bypassable, and it is why hops must be set
    // correctly in production — see assertTrustedProxyConfiguration.
    if (hops <= 0) return UNTRUSTED_ORIGIN;

    const forwarded = request.headers.get('x-forwarded-for');
    if (!forwarded) return UNTRUSTED_ORIGIN;

    const chain = forwarded
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '');
    if (chain.length === 0) return UNTRUSTED_ORIGIN;

    // Count from the right: only the entries our own proxies appended are
    // trustworthy. Taking chain[0] is what made spoofing trivial.
    // `index` is always within bounds here: hops >= 1 and chain.length >= 1, so
    // Math.max(0, len - hops) lands in [0, len-1].
    const index = Math.max(0, chain.length - hops);
    const trusted = chain[index];

    // Several cloud load balancers insert the literal `unknown` when they cannot
    // determine a peer. It is not an identity — but it must NOT be filtered out
    // of the chain before indexing, because dropping the entry our own proxy
    // appended promotes a CALLER-WRITTEN entry into the trusted position, which
    // is the spoofing hole P1-6 closed. Reject it in place instead.
    if (trusted.toLowerCase() === 'unknown') return UNTRUSTED_ORIGIN;

    return normaliseIdentity(trusted);
  }

  function sessionKey(request: Request): string {
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return `anon:${clientKey(request)}`;
    }

    // Never key a cache by raw secret material. A keyed hash keeps the limiter
    // working without holding session tokens as map keys.
    return `sess:${createHash('sha256').update(authorization.slice(7)).digest('base64url').slice(0, 32)}`;
  }

  /**
   * Bounds a tracking map. Without this, a caller sending many distinct keys grows
   * the map until the process dies — the rate limiter becomes the DoS vector.
   * Expired entries go first; if everything is live, the oldest insertions are
   * dropped (Map preserves insertion order).
   */
  function bound<T>(map: Map<string, T>, isExpired: (value: T) => boolean): void {
    const max = config.maxTrackedKeys ?? 10_000;
    if (map.size <= max) return;

    for (const [key, value] of map) {
      if (map.size <= max) break;
      if (isExpired(value)) map.delete(key);
    }

    for (const key of map.keys()) {
      if (map.size <= max) break;
      map.delete(key);
    }
  }

  function hasBody(method: string): boolean {
    const upper = method.toUpperCase();
    return upper === 'POST' || upper === 'PUT' || upper === 'PATCH';
  }

  function authKey(request: Request): string | null {
    if (request.method.toUpperCase() !== 'POST') return null;
    const pathname = new URL(request.url).pathname;
    if (!AUTH_ATTEMPT_PATHS.has(pathname)) return null;

    const client = clientKey(request);

    // A rate limit and a lockout fail in opposite directions on a SHARED key.
    // Exhausting a shared rate-limit bucket spends your own quota; exhausting a
    // shared lockout locks OTHER PEOPLE out. With no trustworthy identity every
    // caller keys to the same string, so `maxFailures` failed sign-ins from one
    // attacker would lock the sign-in path for the entire user base — renewable
    // indefinitely. A global sign-in kill switch keyed on a constant.
    //
    // So: no lockout without an identity to attach it to. Brute force is still
    // bounded there by the per-IP and per-session rate limits, which are safe to
    // share. Production cannot reach this state anyway —
    // assertTrustedProxyConfiguration refuses to boot without a real hop count.
    if (client === UNTRUSTED_ORIGIN) return null;

    return `${client}:${pathname}`;
  }

  return {
    guard(request, requestId) {
      // P1-6 note: this pre-check can only inspect a DECLARED Content-Length, and a
      // WHATWG Request does not always carry one, so it cannot be the only defence.
      // Requiring the header was tried and rejected: it refuses legitimate bounded
      // bodies. The real cap is enforced while reading, in readJsonBody (http.ts),
      // which counts bytes off the stream. This stays as a cheap early rejection for
      // callers that do declare an oversized length.
      if (
        hasBody(request.method) &&
        requestBodyExceedsLimit(request.headers.get('content-length'), config.maxBodyBytes)
      ) {
        return receipt(requestId, 413, 'payload_too_large', 'Request body exceeds the size limit', {
          limitBytes: config.maxBodyBytes
        });
      }

      const ts = now();
      const ip = clientKey(request);
      const ipDecision = evaluateRateLimit(ipWindows.get(ip), { config: config.ipRateLimit, now: ts });
      ipWindows.set(ip, ipDecision.window);
      bound(ipWindows, (window) => window.windowStart + config.ipRateLimit.windowMs <= ts);
      if (!ipDecision.allowed) {
        return receipt(requestId, 429, 'rate_limited', 'Too many requests from this client', {
          limit: ipDecision.limit,
          remaining: ipDecision.remaining,
          retryAfterMs: ipDecision.retryAfterMs,
          scope: 'ip'
        });
      }

      const session = sessionKey(request);
      const sessionDecision = evaluateRateLimit(sessionWindows.get(session), { config: config.sessionRateLimit, now: ts });
      sessionWindows.set(session, sessionDecision.window);
      bound(sessionWindows, (window) => window.windowStart + config.sessionRateLimit.windowMs <= ts);
      if (!sessionDecision.allowed) {
        return receipt(requestId, 429, 'rate_limited', 'Too many requests for this session', {
          limit: sessionDecision.limit,
          remaining: sessionDecision.remaining,
          retryAfterMs: sessionDecision.retryAfterMs,
          scope: 'session'
        });
      }

      return null;
    },

    authGuard(request, requestId) {
      const key = authKey(request);
      if (!key) return null;
      const { locked, retryAfterMs } = checkLockout(lockouts.get(key), now());
      if (locked) {
        return receipt(requestId, 429, 'auth_locked_out', 'Too many failed attempts; try again later', {
          retryAfterMs,
          scope: 'auth'
        });
      }
      return null;
    },

    recordAuth(request, response) {
      const key = authKey(request);
      if (!key) return;
      const success = response.status >= 200 && response.status < 300;
      const at = now();
      lockouts.set(key, recordAuthOutcome(lockouts.get(key), { config: config.authLockout, now: at, success }));
      bound(lockouts, (state) => state.lockedUntil <= at && state.firstFailureAt + config.authLockout.windowMs <= at);
    },

    secure(response) {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        if (!response.headers.has(name)) response.headers.set(name, value);
      }
      return response;
    }
  };
}

function receipt(
  requestId: string,
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown>
): Response {
  const headers: Record<string, string> = {};
  if (typeof extra.retryAfterMs === 'number') headers['retry-after'] = String(Math.ceil(extra.retryAfterMs / 1000));
  return jsonResponse({ error: { code, message, requestId }, ...extra }, status, requestId, headers);
}
```

## apps/api/src/staticSite.ts (COMPLETE)

```ts
import { realpathSync, statSync } from 'node:fs';
import { readFile as readFileFromDisk } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { ConfigError } from './config';

/**
 * BLUEPRINT
 * Purpose: Serve the built web app from the API's own origin, so the browser
 *   never makes a cross-origin request and the existing same-origin controls
 *   (Strict cookies, CORP, no CORS) keep working unchanged.
 * Data:    Read-only bytes from the configured build directory. No user data, no
 *          request body, no persistence, no network egress.
 * States:  200 asset | 200 shell (client-side route) | 404 (miss, unlisted
 *          extension, or attempted escape) | 405 (non GET/HEAD).
 * Actions: GET/HEAD only. Nothing here writes, mutates, or authenticates.
 * Safety:  Extension allowlist (source maps and anything unlisted are 404);
 *          percent-decode then reject `..`, NUL and backslash; the resolved path
 *          is re-checked inside the root BOTH lexically and after resolving
 *          links, and anything that is not a regular file is refused; `/api/*`
 *          is never routed here so no endpoint can be shadowed; a one-year
 *          `immutable` policy is given only to content-hashed filenames, never
 *          to a directory convention; HTML carries a document CSP with
 *          `script-src 'self'` and no `unsafe-inline`/`unsafe-eval`, while the
 *          API's `default-src 'none'` is left untouched. Refuses to construct
 *          unless the root holds a readable index.html FILE, so a broken build
 *          fails the deploy instead of passing an API-only health check.
 * Verification: apps/api/src/staticSite.test.ts (17 tests). The three added on
 *          2026-08-14 each reproduce a defect that was demonstrated against the
 *          running bundled server first: a junction escaping the root, an
 *          unhashed file cached for a year, and a directory named index.html
 *          booting "healthy" with every page 404. Note that the lexical `..`
 *          check and the containment check cannot be told apart by any test —
 *          removing either alone leaves the suite green — because WHATWG URL
 *          normalisation collapses dot segments before this module runs.
 *
 * TASK A — single-origin static serving.
 *
 * The browser client is same-origin BY DESIGN, in four independent ways:
 * `cross-origin-resource-policy: same-origin`, `default-src 'none'`,
 * `SameSite=Strict` on the session and CSRF cookies, and the complete absence of
 * CORS anywhere in the API. Pointing the web app at a *different* deployed origin
 * would therefore require adding CORS and downgrading both cookies to
 * `SameSite=None`, weakening CSRF protection on an app holding household and
 * civic data.
 *
 * So the web build is served from the same origin as the API instead, and none of
 * those four controls has to move. `apiRuntimeConfig.resolveBackendBaseUrl`
 * already returns `undefined` when no base URL is configured, and `toApiUrl` then
 * emits a bare relative path — so a production build with no
 * `VITE_SWANGUARD_API_BASE_URL` set already talks to its own origin. The
 * localhost allowlist stays exactly as strict as it was; nothing here widens it.
 *
 * This module is opt-in: with no static root configured the API behaves exactly
 * as it did before, and an unknown path is still a JSON 404.
 */

export interface StaticSiteOptions {
  root: string;
  /** Injectable for tests; defaults to reading from disk. */
  readFile?: (path: string) => Promise<Buffer>;
}

export type StaticSiteHandler = (request: Request) => Promise<Response>;

/**
 * The document policy for the HTML shell.
 *
 * This does NOT relax the API's `default-src 'none'` — that policy is unchanged
 * and still applies to every JSON response (`httpHardening.secure` only fills in
 * a header that is absent, so a static response may carry its own). An HTML
 * document simply cannot render under `default-src 'none'`, so the shell declares
 * the narrowest policy it can actually run with:
 *
 *   - `script-src 'self'` — no `unsafe-inline`, no `unsafe-eval`. The Vite build
 *     emits an external module script and no inline script.
 *   - `style-src` carries `'unsafe-inline'` because styled-components injects
 *     style rules at runtime. This permits no script execution.
 *   - The Google Fonts origins are listed because `index.html` links them.
 *     Self-hosting the two families would let both be dropped.
 *   - `connect-src 'self'` is exactly the same-origin API this file exists to
 *     serve.
 */
export const STATIC_DOCUMENT_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'"
].join('; ');

/**
 * An allowlist, not a denylist. Anything the build does not legitimately emit is
 * a 404 — which is what keeps source maps, `.env` files and stray backups in the
 * output directory from being served if one ever lands there.
 */
const CONTENT_TYPES = new Map<string, string>([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

export function createStaticSiteHandler({ root, readFile = defaultReadFile }: StaticSiteOptions): StaticSiteHandler {
  // NOT canonicalised once. Freezing the real path at construction pinned an
  // atomic symlink deploy (`current` -> `releases/<stamp>`) to whichever release
  // was live at boot: the process served the old release forever, then 404'd
  // every page once retention deleted it — with /api/health still 200. The root
  // is resolved per request instead, inside resolveWithinRoot.
  const rootPath = resolve(root);

  // Fail closed at boot rather than serving a 404 for every page. A wrong path
  // would otherwise pass the health check and look like a successful deploy,
  // which is the same failure shape as the hardcoded `ready: true` removed in
  // P1-5: a probe that reports success without checking anything.
  //
  // `existsSync` was not enough: it is true for a DIRECTORY named index.html.
  // Demonstrated on the running server — the service booted, every page 404'd,
  // and /api/health still returned 200, so the platform would have marked the
  // deploy live and retired the last good instance. Liveness is probed on the
  // API while the breakage is in static, so this check is the only thing
  // standing between a broken build and a "successful" deploy.
  const shellAtBoot = resolveWithinRoot(rootPath, '/index.html');

  // An EMPTY index.html passes every check above — it is a readable regular
  // file. A failed build that still creates the file (`touch`, a truncated CI
  // artifact upload) would boot, answer every route 200 with a blank body, and
  // pass the health check. All green, blank app.
  if (shellAtBoot === null || statSync(shellAtBoot).size === 0) {
    throw new ConfigError(
      `SWANGUARD_WEB_STATIC_ROOT does not contain a readable, non-empty index.html file (looked in ${rootPath}); ` +
        'build the web workspace first or unset it to run API-only'
    );
  }

  return async function handleStaticRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return notAllowed();
    }

    const requestedPath = decodePathname(new URL(request.url).pathname);
    if (requestedPath === null) {
      return notFound();
    }

    // A path with no file extension is a client-side route (`/civic/newsroom`),
    // so it gets the shell. A path WITH an extension is an asset request, and a
    // miss must stay a miss — answering it with HTML produces a MIME-type error
    // in the browser that reads like a broken build.
    const extension = extensionOf(requestedPath);

    if (extension === null) {
      return serveShell(rootPath, readFile, request.method);
    }

    const contentType = CONTENT_TYPES.get(extension);
    if (!contentType) {
      return notFound();
    }

    const filePath = resolveWithinRoot(rootPath, requestedPath);
    if (filePath === null) {
      return notFound();
    }

    const file = await readFileOrNull(readFile, filePath);
    if (file === null) {
      return notFound();
    }

    // Only a content-HASHED filename is safe to cache forever, and the
    // directory it sits in does not prove that. Vite copies `public/` into the
    // build verbatim, so an unhashed file can land under `/assets/` and keep its
    // name across deploys; served `immutable` it is unreachable for a year, and
    // `immutable` suppresses even a conditional revalidation. Verified live: a
    // plain `/assets/version.json` was handed a one-year immutable policy.
    const cacheControl = isContentHashed(requestedPath) ? IMMUTABLE_CACHE : NO_CACHE;

    return fileResponse(file, contentType, cacheControl, request.method);
  };
}

async function serveShell(
  rootPath: string,
  readFile: (path: string) => Promise<Buffer>,
  method: string
): Promise<Response> {
  // Re-checked per request, not trusted from boot: the shell could be swapped
  // for a link or a directory by a deploy that lands underneath a running
  // process.
  const shellPath = resolveWithinRoot(rootPath, '/index.html');
  if (shellPath === null) {
    return notFound();
  }

  const shell = await readFileOrNull(readFile, shellPath);
  if (shell === null) {
    return notFound();
  }

  return fileResponse(shell, 'text/html; charset=utf-8', NO_CACHE, method);
}

function fileResponse(file: Buffer, contentType: string, cacheControl: string, method: string): Response {
  const headers = new Headers({
    'cache-control': cacheControl,
    'content-type': contentType
  });

  if (contentType.startsWith('text/html')) {
    // Set explicitly so httpHardening.secure() leaves it alone — it only fills in
    // headers that are absent. Every other hardened header still applies.
    headers.set('content-security-policy', STATIC_DOCUMENT_CSP);
  }

  // A Node Buffer is not structurally a DOM BodyInit; copy into a plain view.
  return new Response(method === 'HEAD' ? null : new Uint8Array(file), { headers, status: 200 });
}

/**
 * Percent-decodes the pathname and rejects anything that could escape the served
 * root. Decoding first is what makes `%2e%2e` and `..%2f` fail here rather than
 * after they have been turned back into `..`.
 */
function decodePathname(pathname: string): string | null {
  let decoded: string;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  // A NUL byte can truncate a path inside a native call. A backslash is a path
  // separator on Windows, so it must not survive as an ordinary character.
  if (decoded.includes('\0') || decoded.includes('\\')) {
    return null;
  }

  if (decoded.split('/').includes('..')) {
    return null;
  }

  return decoded;
}

/**
 * Containment, in two passes.
 *
 * The lexical pass catches `..` that survived decoding. It is NOT sufficient on
 * its own: a link inside the root resolves to a path that is lexically inside
 * while the bytes it names live outside. That was demonstrated against the
 * running server — a junction at `dist/assets/out` served a file from another
 * directory as `200 image/png`, cached `immutable` for a year, because the
 * extension allowlist keys on the REQUESTED name and never sees the target. The
 * realistic planter is a build step or a dependency that copies a link into the
 * output, not an attacker with a shell.
 *
 * So the real path is resolved and re-checked, and anything that is not a
 * regular file is refused — which also rules out serving a directory or a
 * device node.
 */
export function resolveWithinRoot(configuredRoot: string, requestedPath: string): string | null {
  // Resolved per call, not frozen at boot, so a repointed deploy symlink is
  // followed. Costs one realpath on the root; we already pay one on the
  // candidate.
  const rootPath = canonicalise(configuredRoot);
  if (rootPath === null) {
    return null;
  }

  const candidate = resolve(rootPath, `.${requestedPath}`);

  if (!isInsideRoot(rootPath, candidate)) {
    return null;
  }

  const real = canonicalise(candidate);
  if (real === null || !isInsideRoot(rootPath, real)) {
    return null;
  }

  try {
    if (!statSync(real).isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  return real;
}

function isInsideRoot(rootPath: string, candidate: string): boolean {
  return candidate === rootPath || candidate.startsWith(rootPath + sep);
}

/** Real path with links resolved; null when the path does not exist. */
function canonicalise(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

/**
 * A build-emitted, content-addressed name: `index-DyPFrhR6.js`. The hash is what
 * makes a one-year `immutable` policy safe, because a changed file gets a
 * changed URL.
 *
 * Six characters, not eight: `[hash:6]` is a documented and common Rollup/Vite
 * setting, and an eight-character floor would silently downgrade a genuinely
 * immutable asset to `no-cache` — a regression nobody notices except as origin
 * load. The failure direction matters more than the precision here.
 *
 * Known residual: a hand-written name whose final dash-segment is six or more
 * characters (`hero-backgroundimage.png`) still matches and would be cached
 * immutably. That is a far smaller surface than caching the whole directory
 * immutably, and the safe way to close it completely is to read the build
 * manifest rather than to guess from the name.
 */
function isContentHashed(requestedPath: string): boolean {
  return requestedPath.startsWith('/assets/') && /[-.][A-Za-z0-9_-]{6,}\.[A-Za-z0-9]+$/.test(requestedPath);
}

function extensionOf(requestedPath: string): string | null {
  const lastSegment = requestedPath.slice(requestedPath.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');

  if (dotIndex <= 0) {
    return null;
  }

  return lastSegment.slice(dotIndex).toLowerCase();
}

async function readFileOrNull(
  readFile: (path: string) => Promise<Buffer>,
  filePath: string
): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function notFound(): Response {
  return new Response(JSON.stringify({ error: { code: 'not_found', message: 'Route not found' } }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status: 404
  });
}

function notAllowed(): Response {
  return new Response(JSON.stringify({ error: { code: 'method_not_allowed', message: 'Method not allowed' } }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status: 405
  });
}

async function defaultReadFile(path: string): Promise<Buffer> {
  return readFileFromDisk(path);
}
```

## apps/api/src/server.ts — startup failure codes (the parts that changed)

```ts
}

export interface StartedHttpServer {
  close(): Promise<void>;
  port: number;
  runtime: ApiRuntime;
  server: Server;
  shutdownComplete: Promise<void>;
}

export class HttpServerStartupError extends Error {
  readonly code: StartupFailureCode;

  constructor(message: string, code: StartupFailureCode = 'STARTUP_E_UNKNOWN') {
    super(message);
    this.name = 'HttpServerStartupError';
    this.code = code;
  }
}

/**
 * A refused boot has to tell the operator WHICH gate refused, or a correct
 * fail-closed guard becomes a crash-loop with an unreadable log.
 *
 * These are fixed constants selected by the error's TYPE. Nothing is
 * interpolated from the error, the config, or the environment, so the
 * sanitization guarantee stays exactly as it was: a code reveals config STATE,
 * never a value. (See "logs sanitized startup failure output without raw
 * environment values" in server.test.ts — that is the control this preserves.)
 */
export type StartupFailureCode =
  | 'STARTUP_E_TRUSTED_PROXY_HOPS'
  | 'STARTUP_E_DURABILITY'
  | 'STARTUP_E_CONFIG'
  | 'STARTUP_E_RUNTIME'
  | 'STARTUP_E_UNKNOWN';

const STARTUP_FAILURE_CODES: Readonly<Record<string, StartupFailureCode>> = {
  ApiRuntimeError: 'STARTUP_E_RUNTIME',
  ConfigError: 'STARTUP_E_CONFIG',
  StoreDurabilityError: 'STARTUP_E_DURABILITY',
  TrustedProxyConfigurationError: 'STARTUP_E_TRUSTED_PROXY_HOPS'
};

export function startupFailureCode(error: unknown): StartupFailureCode {
  if (error instanceof HttpServerStartupError) return error.code;
  const name = error instanceof Error ? error.name : '';
  return STARTUP_FAILURE_CODES[name] ?? 'STARTUP_E_UNKNOWN';
}

export class HttpServerShutdownError extends Error {
```

...and the two call sites:

```ts
  } catch (error) {
    await closeStartupResources(server, runtime);
    throw new HttpServerStartupError('HTTP server could not start', startupFailureCode(error));
  }

  // runHttpServer:
  } catch (error) {
    output.error(`HTTP server could not start [${startupFailureCode(error)}]`);
    exit(1);
  }
```

Error class names in play (each sets `this.name` explicitly):
`ConfigError`, `ApiRuntimeError`, `StoreDurabilityError`,
`TrustedProxyConfigurationError extends ConfigError`.

## apps/api/src/runtime.ts — where the proxy guard runs

```ts
  assertProductionDurability({ config, suppliedStores: overrides });
  assertTrustedProxyConfiguration(config);
  return createApiApp({ /* ... */ });
```

## Supporting domain primitives (pure, in @family-first/domain)

```ts
export function evaluateRateLimit(
  previous: RateLimitWindow | undefined,
  params: { now: number; config: RateLimitConfig }
): RateLimitDecision {
  const { now, config } = params;
  const sameWindow = previous !== undefined && now - previous.windowStart < config.windowMs;
  const windowStart = sameWindow ? previous!.windowStart : now;
  const count = (sameWindow ? previous!.count : 0) + 1;
  const allowed = count <= config.limit;
  return {
    allowed,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    retryAfterMs: allowed ? 0 : Math.max(0, config.windowMs - (now - windowStart)),
    window: { count, windowStart }
  };
}

export interface LockoutConfig {
  maxFailures: number;
  windowMs: number;
  lockoutMs: number;
}

export interface LockoutState {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

/** Read-only lockout check (call BEFORE processing an auth attempt). */
export function checkLockout(state: LockoutState | undefined, now: number): { locked: boolean; retryAfterMs: number } {
  if (state && state.lockedUntil > now) {
    return { locked: true, retryAfterMs: state.lockedUntil - now };
  }
  return { locked: false, retryAfterMs: 0 };
}

/** Record an auth outcome (call AFTER processing). Success resets; failures accumulate within the window and lock after `maxFailures`. */
export function recordAuthOutcome(
  state: LockoutState | undefined,
```
