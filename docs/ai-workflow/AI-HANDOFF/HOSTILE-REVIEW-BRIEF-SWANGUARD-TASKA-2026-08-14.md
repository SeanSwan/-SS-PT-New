# Hostile review brief — SwanGuard TASK A (single-origin static serving) + git-lock remediation

You are a hostile reviewer. Your job is to find defects, not to praise. Assume the
author was competent but rushed and self-reported their own work. Be specific:
cite the exact line and describe the concrete exploit or failure, not a category.

If you believe something is wrong, say what input produces what wrong output.
If you cannot construct that, say so and downgrade your confidence. Do not pad
with generic security advice — I have the code in front of me and will verify
every claim you make. Two prior models were confidently wrong this session.

## Context

SwanGuard is a Node/TypeScript app holding household and civic data. It is
deployed as ONE service on Render that serves both the JSON API and the built
web SPA from a SINGLE ORIGIN. That is deliberate: the API has
`cross-origin-resource-policy: same-origin`, a global CSP of
`default-src 'none'; frame-ancestors 'none'`, `SameSite=Strict` on both the
session and CSRF cookies, and NO CORS anywhere. Splitting the origin would force
CORS + `SameSite=None`.

Security headers are applied by `secure(response)`, which sets each header ONLY
if the response does not already carry it:

```ts
secure(response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value);
  }
  return response;
}
```

SECURITY_HEADERS = content-security-policy `default-src 'none'; frame-ancestors 'none'`,
cross-origin-opener-policy same-origin, cross-origin-resource-policy same-origin,
permissions-policy, referrer-policy no-referrer, HSTS, x-content-type-options nosniff,
x-frame-options DENY.

Routing (`apps/api/src/app.ts`). `guard()` (rate limit + body size) runs on EVERY
request including static assets, then:

```ts
if (staticSite && !isApiPath(url.pathname)) {
  return staticSite(request);
}
// ... all /api/* routes below
function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}
```

Rate limits: per-IP 2000/60s and per-session 2000/60s, fixed window.
`trustedProxyHops` = 1 on Render (client IP taken 1 from the RIGHT of
x-forwarded-for). With hops = 0 every caller shares one bucket.

## THE CODE UNDER REVIEW — apps/api/src/staticSite.ts

```ts
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

const CONTENT_TYPES = new Map<string, string>([
  ['.css','text/css; charset=utf-8'], ['.gif','image/gif'],
  ['.html','text/html; charset=utf-8'], ['.ico','image/x-icon'],
  ['.jpeg','image/jpeg'], ['.jpg','image/jpeg'],
  ['.js','text/javascript; charset=utf-8'], ['.json','application/json; charset=utf-8'],
  ['.png','image/png'], ['.svg','image/svg+xml'], ['.txt','text/plain; charset=utf-8'],
  ['.webmanifest','application/manifest+json'], ['.webp','image/webp'],
  ['.woff','font/woff'], ['.woff2','font/woff2']
]);

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

export function createStaticSiteHandler({ root, readFile = defaultReadFile }: StaticSiteOptions): StaticSiteHandler {
  const rootPath = resolve(root);

  if (!existsSync(resolve(rootPath, 'index.html'))) {
    throw new ConfigError(`SWANGUARD_WEB_STATIC_ROOT does not contain an index.html ...`);
  }

  return async function handleStaticRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') return notAllowed();

    const requestedPath = decodePathname(new URL(request.url).pathname);
    if (requestedPath === null) return notFound();

    const extension = extensionOf(requestedPath);
    if (extension === null) return serveShell(rootPath, readFile, request.method);

    const contentType = CONTENT_TYPES.get(extension);
    if (!contentType) return notFound();

    const filePath = resolveWithinRoot(rootPath, requestedPath);
    if (filePath === null) return notFound();

    const file = await readFileOrNull(readFile, filePath);
    if (file === null) return notFound();

    const cacheControl = requestedPath.startsWith('/assets/') ? IMMUTABLE_CACHE : NO_CACHE;
    return fileResponse(file, contentType, cacheControl, request.method);
  };
}

function fileResponse(file, contentType, cacheControl, method) {
  const headers = new Headers({ 'cache-control': cacheControl, 'content-type': contentType });
  if (contentType.startsWith('text/html')) {
    headers.set('content-security-policy', STATIC_DOCUMENT_CSP);
  }
  return new Response(method === 'HEAD' ? null : new Uint8Array(file), { headers, status: 200 });
}

function decodePathname(pathname: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  if (decoded.split('/').includes('..')) return null;
  return decoded;
}

function resolveWithinRoot(rootPath: string, requestedPath: string): string | null {
  const candidate = resolve(rootPath, `.${requestedPath}`);
  if (candidate !== rootPath && !candidate.startsWith(rootPath + sep)) return null;
  return candidate;
}

function extensionOf(requestedPath: string): string | null {
  const lastSegment = requestedPath.slice(requestedPath.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex <= 0) return null;
  return lastSegment.slice(dotIndex).toLowerCase();
}
```

`serveShell` reads `<root>/index.html` and returns it as text/html, no-cache.
`notFound()` = JSON 404. `notAllowed()` = JSON 405. Read errors become 404.

## What I ALREADY verified live (do not re-report these as findings)

Booted the real bundled server, single verified listener, correct app identity:

- All of these return **404 JSON**, no repo file leaked: `/../package.json`,
  `/../../package.json`, `/%2e%2e/package.json`, `/%252e%252e/package.json`,
  `/..%2fpackage.json`, `/....//package.json`, `/assets/%2e%2e/%2e%2e/package.json`,
  `/..%5cpackage.json`, `/%2e%2e%2f%2e%2e%2fpackage.json`, `/index.html%00.png`,
  `/sw.js.map`, `/assets/x.js.map`, `/package.json`, `/index.html.bak`, `/foo.exe`.
- `/api/health` → 200 **application/json** with `default-src 'none'` intact.
  `/api/nope` → 404 JSON. `/api` → 404 JSON.
- HTML shell carries STATIC_DOCUMENT_CSP **plus** nosniff, HSTS, COOP, CORP,
  x-frame-options DENY — `secure()` stripped nothing.
- `/favicon.svg` → `image/svg+xml` **with `default-src 'none'`**, so script-in-SVG
  cannot execute.
- Hashed `/assets/index-*.js` → immutable; `/index.html` and `/sw.js` → no-cache.
- POST/PUT/DELETE/OPTIONS → 405. HEAD → 200.
- Full suite 868 pass / 0 fail.

## Findings I already hold (confirm, refute, or rate severity)

1. `/.env` returns **200 text/html** (the SPA shell), not 404. Cause:
   `extensionOf` returns null when `dotIndex <= 0`, so any dotfile is treated as a
   client-side route. No file content leaks. Is this worse than cosmetic?
2. `/API/health`, `/%61pi/health`, `/api%2fhealth`, `/Api/nope` all return
   **200 text/html** (SPA shell) because `isApiPath` tests the RAW pathname
   case-sensitively while `decodePathname` later decodes `%2f`/`%61`. No API data
   is exposed — the static handler can only read the build dir. Real risk or not?
3. Mutation testing shows the traversal defences are NOT independently covered:
   removing the `..` check alone → 14/14 still pass; removing the `resolveWithinRoot`
   containment alone → 14/14 still pass; removing BOTH → 1 test fails. A future
   refactor could silently delete one layer with a green suite.
4. Path containment is lexical (`resolve`), not `realpath`, so a symlink inside the
   build output could escape. Presupposes write access to `dist`.
5. Static asset traffic now shares the API's 2000/min per-IP rate-limit bucket.

## ATTACK THESE — highest value first

1. **Break the traversal defence.** Give me a concrete request path that reads a
   file outside the build root, or state plainly that you cannot. Consider: WHATWG
   URL normalization happening BEFORE the handler sees the path; single vs double
   decoding; overlong UTF-8; unicode normalization; `．` fullwidth dots;
   Windows 8.3 short names; ADS (`file.png:stream`); UNC via `//`; case-insensitive
   filesystems; the `.` prefix in `resolve(rootPath, '.' + requestedPath)`.
2. **MIME confusion / stored XSS.** `.json`, `.svg`, `.webmanifest`, `.txt` are
   allowlisted. Given `default-src 'none'` on non-HTML responses and nosniff, can
   any allowlisted type still execute script or steal data in a modern browser?
3. **Cache poisoning.** `cacheControl` is chosen from the REQUESTED path prefix
   `/assets/`, before resolution. Can a request be shaped so a non-hashed,
   deploy-varying file is served with `immutable`, or so a shared cache stores the
   wrong body under an `/assets/` key?
4. **CSP adequacy.** `style-src 'unsafe-inline'` is present for styled-components.
   With `script-src 'self'` and no `unsafe-eval`, what real attack remains? Is
   `connect-src 'self'` + `img-src data:` a meaningful exfiltration path?
5. **`secure()`'s "only if absent" behaviour.** Can any request cause a response to
   pre-set a security header and thereby WEAKEN it? Only staticSite sets CSP, and
   only for text/html.
6. **Availability.** Static requests pass through the fixed-window limiter. With
   2000/min per IP and `trustedProxyHops` correct, is that actually a problem? What
   breaks if `SWANGUARD_TRUSTED_PROXY_HOPS` is misconfigured to 0 in production?
7. **Boot-time fail-closed.** The handler throws if the root lacks `index.html`.
   Any way that check passes while serving is still broken?

## Second target — the git remediation (judge the process, briefly)

A shared git working tree used by several concurrent AI agents accumulated
orphaned `.git/index.lock` files; every index-writing command failed for ~9 hours
and no agent noticed because each saw only its own failure. The agent:
snapshotted `.git/index`, proved no live owner via an exclusive-open probe,
MOVED (not deleted) the lock aside, verified `fsck` clean and 0 files staged, then
committed one explicit directory with `git commit -o -- <path>`.

Root cause: git takes the index lock BEFORE validating arguments, so a malformed
command strands it. Proposed structural fix: one `git worktree` per agent.

Questions: (a) was moving the lock aside correct, or should it have been left for
its owner? (b) is `git commit -o -- <path>` genuinely race-proof against another
agent staging concurrently? (c) the agent committed 16 files authored by OTHER
agents that had been sitting untracked for up to two weeks — overstep or rescue?
(d) what else in a multi-agent shared tree fails silently fleet-wide that no
single agent would notice?

## Output format

Numbered findings. For each: **severity** (critical/high/medium/low/none),
**the exact line or path**, **the concrete failing input and wrong output**, and
**the fix**. Then a short list of anything in my "already verified" section you
think I got WRONG. Finish with the single most likely thing I have missed.
