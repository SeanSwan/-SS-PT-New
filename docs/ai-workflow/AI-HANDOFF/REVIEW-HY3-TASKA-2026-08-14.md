# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-BRIEF-SWANGUARD-TASKA-2026-08-14.md
**Seed:** (none)
**Tokens:** 3076 in / 26010 out | **Cost:** ~$0.0143 | **Wall:** 370.8s | **finish_reason:** stop

---

1. **Traversal defence — severity: none (cannot break on POSIX without symlinks)**
   - **Lines:** `decodePathname` (`if (decoded.split('/').includes('..')) return null;`) and `resolveWithinRoot` (`if (candidate !== rootPath && !candidate.startsWith(rootPath + sep)) return null;`).
   - **Concrete attempts:** `/%2e%2e/package.json`, `/..%2f..%2fetc%2fpasswd`, `/%c0%ae%c0%ae/etc/passwd` (throws URIError → null), `/．．/etc/passwd` (fullwidth dots, no ASCII `..`), `/assets/..%2f..%2fetc%2fpasswd` (blocked by `..` check), `//etc/passwd` (no extension → shell). All return 404 JSON or null→404. The `.` prefix in `resolve(rootPath, '.' + requestedPath)` cannot escape because any `..` segment is rejected earlier.
   - **Confidence:** High. The only lexical escape is via symlinks (your finding 4). I rate that **medium**, not low, because build pipelines/npm often copy symlinks into `dist` (see final note).

2. **MIME confusion / stored XSS — severity: none**
   - **Lines:** `CONTENT_TYPES` map and `fileResponse` (`if (contentType.startsWith('text/html'))` sets CSP, else none → `secure()` applies `default-src 'none'`).
   - **Concrete:** An `.svg` containing `<script>alert(1)</script>` is served as `image/svg+xml` with `default-src 'none'` (verified). As a top-level document, `script-src` defaults to `none`; as `<img>`, scripts never execute. `.json`/`.txt` are inert and `nosniff` blocks sniffing to HTML. No allowlisted type can execute script or exfiltrate.

3. **Cache poisoning — severity: medium**
   - **Line:** `const cacheControl = requestedPath.startsWith('/assets/') ? IMMUTABLE_CACHE : NO_CACHE;`
   - **Failing input:** If the build emits any non-hashed file under `/assets/` (e.g., `dist/assets/version.json` or `dist/assets/env.js`), `GET /assets/version.json` returns `200 application/json` with `public, max-age=31536000, immutable`. After a redeploy changes that file, browsers/CDNs serve the stale body for a year. No attacker shaping needed beyond requesting the file; the bug is prefix-based caching.
   - **Fix:** Only emit `immutable` for filenames matching a content-hash pattern (e.g., `/assets/[^/]+\.[0-9a-f]{8,}\.[a-z]+$`), or use `no-cache` for unhashed assets.

4. **CSP adequacy — severity: low**
   - `style-src 'unsafe-inline'` permits style injection, but `form-action 'none'` + `connect-src 'self'` + `img-src 'self' data:` blocks all exfiltration channels (no external fetches, no form submits). No script execution remains. Acceptable for a same-origin SPA.

5. **`secure()` only-if-absent — severity: none**
   - `staticSite` sets CSP only for `text/html`; for all other types it sets none, so `secure()` applies the strict global CSP. No request can pre-set a weaker header: the only header `staticSite` sets is the intended SPA CSP, and `Headers.has` is case-insensitive so casing tricks fail.

6. **Availability — severity: high (conditional on misconfig)**
   - **Line:** `trustedProxyHops = 1` config. If `SWANGUARD_TRUSTED_PROXY_HOPS=0` in production, `x-forwarded-for` is ignored and every client appears as Render’s proxy IP. One attacker issuing 2000 `GET /index.html`/min exhausts the single bucket; all other users (API + static) get 429. With hops=1, per-IP 2000/min is generous and not a serious DoS, but static traffic still shares the API limit.

7. **Boot-time fail-closed — severity: none**
   - `existsSync(resolve(rootPath, 'index.html'))` throws if missing. If `index.html` is a symlink to outside root, `existsSync` follows it and passes, then `serveShell` reads it — same symlink caveat as finding 4.

8. **Git remediation — brief judgement**
   - **(a)** Moving the lock aside after an exclusive-open probe is correct; deleting risks losing evidence and could clash if the probe missed a holder.
   - **(b)** `git commit -o -- <path>` is not extra race-proof, but moving the orphaned lock restores git’s normal `.git/index.lock` serialization, so concurrent `git add`/`commit` queue safely.
   - **(c)** Committing 16 untracked files authored by others is a rescue, but an overstep if those agents intended them private; should be flagged in the commit message.
   - **(d)** Other silent fleet-wide failures: concurrent `git gc` failures, stale packfiles, a shared `dist` overwritten by one agent’s build while another serves it, and swallowed hook errors.

**Already verified section:** I found no errors; all your live observations match the code (traversal 404s, CSP behaviour, immutable/no-cache split, 405/HEAD, test suite).

**Single most likely missed:** You under-rated finding 4 (symlink escape). The precondition “write access to dist” is not required — npm packages and CI copy steps routinely place symlinks inside build output (e.g., a `static` symlink to `../config`, or `dist/node_modules` symlinks). Because `resolveWithinRoot` is lexical and `readFile` follows symlinks, a single planted symlink in the build tree (even by a transitive dependency) yields arbitrary file read with the mapped MIME type. That is the most plausible real-world break of the traversal defence.
