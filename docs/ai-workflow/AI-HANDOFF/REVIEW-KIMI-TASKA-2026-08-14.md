# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-BRIEF-SWANGUARD-TASKA-2026-08-14.md
**Seed:** (none)
**Tokens:** 3037 in / 13603 out | **Cost:** ~$0.2132 | **Wall:** 468.0s | **finish_reason:** stop

---

# Hostile review — staticSite.ts + git remediation

## Part 1 — Findings against the code

**F1. Traversal: I cannot construct an escape on Linux without a symlink in `dist`. Saying so plainly.**
I worked through your list: WHATWG URL parsing collapses raw and single-encoded dot segments *before the handler runs* (`new URL('http://x/%2e%2e/p.json').pathname === '/p.json'` — the spec's double-dot-segment definition includes `%2e%2e`, `%2e.`, `.%2e`), and converts `\` to `/` for special schemes. Double encoding (`%252e%252e`) decodes once to a literal directory named `%2e%2e`. Overlong UTF-8 makes `decodeURIComponent` throw → 404. Fullwidth `．`, 8.3 names, ADS, UNC are either literal filenames on ext4 or Windows-only. The `'.' + requestedPath` prefix is safe because WHATWG pathnames always begin with `/`.

But your mutation result (their finding 3) has a sharper explanation than "tests are weak": **the `..` check in `decodePathname` is strictly redundant.** Any decoded path containing `..` that `resolveWithinRoot` would *pass* does not exist — lexical containment is sound for the no-symlink case. The `%2f`-smuggled case (`/..%2fpackage.json`, which the URL parser does *not* collapse because `%2f` isn't a separator to it) is caught by *both* layers independently. No test can distinguish them. The layer that is actually load-bearing is `resolveWithinRoot`; the layer doing the visible work on your live tests is the URL parser you didn't write.
**Severity: none (no exploit). Fix:** keep all layers, but add the one fixture that *can* distinguish them — see F2.

**F2. Symlink escape is worse than you rated it, because the extension allowlist keys on the requested name, not the target.**
`extensionOf(requestedPath)` runs on the URL; `readFile` follows symlinks. So `dist/assets/evil.png → /etc/passwd` yields: request `/assets/evil.png` → **200, `content-type: image/png`, body = /etc/passwd, `cache-control: immutable` for a year**. The allowlist does not constrain what is read, only what the link is named. `/etc/passwd` has no extension and doesn't need one. Yes, it presupposes write access to `dist` — but the credible version of that is not "attacker shells the box," it's a compromised build dependency or a poisoned artifact in your CI pipeline, which is exactly the threat model where the attacker *can't* necessarily modify your hashed JS undetected but *can* drop a symlink.
**Severity: low-medium. Line: `resolveWithinRoot` (lexical `resolve`, no `realpath`). Fix:** `realpathSync` the candidate and re-check containment, or `lstat` and reject non-regular files. And add the symlink fixture test — your suite currently has zero coverage of the one escape neither lexical layer can see.

**F3. Cache poisoning via prefix confusion: not constructible. The real cache bug is immutable-by-convention.**
To get `immutable` on a non-`/assets/` file you need a decoded path starting with `/assets/` containing `..` that survives to the `startsWith` check. The URL parser kills raw/single-encoded dots before the handler; `%2f`-smuggled dots are rejected by the `..` check *before* the prefix check. I cannot build it.
The actual defect: `requestedPath.startsWith('/assets/') ? IMMUTABLE_CACHE : NO_CACHE` trusts a **directory convention, not content addressing**. Vite copies `public/` verbatim into `dist`. Anything at `public/assets/logo.png` ships unhashed at `/assets/logo.png` and is cached immutable for one year — deploy v2 changes it, clients keep v1 until 2026. Concrete failing input: two deploys differing only in an unhashed file under `assets/`; wrong output: stale asset served for a year with no revalidation possible (`immutable` suppresses even conditional requests).
**Severity: medium. Line: `const cacheControl = requestedPath.startsWith('/assets/') ? ...`. Fix:** require a hash pattern in the filename (`/-[a-zA-Z0-9_-]{8,}\./`) for immutable, or drive the decision from the build manifest.

**F4. `no-cache` with no validators = full re-download on every navigation.**
`NO_CACHE = 'no-cache'` *requires* revalidation, but you set no `ETag` and no `Last-Modified`, so revalidation can never produce a 304. `/index.html` and `/sw.js` are re-transferred in full on every load, and the service worker update check (`sw.js` fetched on every navigation by spec) always downloads the whole file.
**Severity: low. Line: `fileResponse` header set. Fix:** add a weak ETag from `(size, mtime)` or content hash; handle `If-None-Match` → 304.

**F5. MIME/XSS: I cannot construct script execution from any allowlisted type. Saying so plainly.**
`.svg` gets `default-src 'none'` via `secure()` (you verified), which blocks `script-src` even as a top-level document; CORP same-origin kills cross-origin embedding. `.json`/`.txt`/`.webmanifest` + `nosniff` cannot be coerced into script in a modern browser, and JSON hijacking is dead. The residual: any `.html` file in `dist` other than the shell is served with `STATIC_DOCUMENT_CSP`, which includes `script-src 'self'` — i.e., a full same-origin script-execution context reachable with your `SameSite=Strict` session cookie attached. Only matters if attacker-influenced HTML lands in the build (supply chain again), but the cheap hardening is real: serve *only* `index.html` as `text/html`, 404 or `Content-Disposition: attachment` the rest.
**Severity: low (defense-in-depth).**

**F6. CSP is adequate; `style-src 'unsafe-inline'` is not a live attack here.**
CSS injection cannot become script execution in a modern browser (no `expression()`, no `-moz-binding`), and the exfiltration channels CSS would use are closed: `img-src 'self' data:` blocks attacker-origin beacons from `background-image` attribute-selector oracle attacks, `connect-src 'self'` confines fetch/XHR/beacon to your own API (where an XSS would already be game-over anyway), `font-src` is two origins. `data:` in `img-src` cannot exfiltrate — no network. Honest residuals: no `require-trusted-types-for 'script'` (DOM XSS would still land if an injection sink exists in the SPA), and `connect-src 'self'` means any future XSS rides the API with cookies attached — but CSP was never going to save you there.
**Severity: none/low.**

**F7. `secure()` only-if-absent: not exploitable today; latent hazard.**
Only staticSite pre-sets CSP, only for `text/html`, and it's *stronger* than the global. No code path reflects request input into a security header. I cannot produce a weakening input. But the pattern means the *first* future route or error handler that sets a sloppy `content-security-policy` (or an upstream middleware setting a permissive one "temporarily") silently wins for its responses, with no test failure. Fix: invert for the security set — always overwrite — or assert-on-override in dev.
**Severity: low (latent).**

**F8. `trustedProxyHops = 0` is a one-line fleet DoS, and nothing in the reviewed code guards it.**
With hops=0 the client IP is the socket peer — Render's load balancer egress. Your note "every caller shares one bucket" is slightly off: Render's LB has a *pool* of egress IPs, so it's a handful of shared buckets, which is arguably worse — **organic traffic alone can exhaust 2000/min per LB IP and 429 your entire user base**, no attacker needed. Concrete: `for i in $(seq 2001); do curl -s https://svc/; done` from one host, or just a busy Monday → all users behind that LB IP get 429 for the window. Conversely hops too *high* lets an attacker append fake XFF entries and mint unlimited buckets (rate-limit bypass). The code under review can't fix this, but boot can: fail-closed assertion that `hops >= 1` when `NODE_ENV=production`, and log the derived client IP at startup.
**Severity: high if misconfigured, none in the code as shipped. Also:** static 404s consume the bucket — an attacker on a shared office/NAT IP can 429 colleagues by spraying garbage paths. Low.

**F9. Boot-time check passes while serving is broken — and your health endpoint won't notice.**
`existsSync(resolve(rootPath, 'index.html'))` is true for a **directory** named `index.html`, for a dangling-permission file, and for a file deleted in a post-boot deploy swap. Concrete failure: `dist/index.html/` is a directory → boot succeeds → every extensionless request hits `serveShell` → `readFile` throws EISDIR → read-errors-become-404 → **the SPA is down, but `/api/health` returns 200, so Render marks the deploy live and stops the old healthy instance.** That's the worst version: fail-open at the platform level because liveness is checked on the API while the breakage is in static.
**Severity: medium. Fix:** at boot, `stat` + `isFile()` + read one byte; better, cache the shell in memory at boot and make `/api/health` (or a `/api/ready`) report shell readability.

## Part 2 — Your held findings

1. **`/.env` → 200 shell: confirm, severity low/none.** No content leak is possible — the handler can only emit `index.html` or an allowlisted file under `dist`. Side effect: `/.git/config`, `/.aws/credentials` also return 200 HTML, which will train your scanners/WAF to ignore real signal. Cosmetic.
2. **Case/encoding API mismatch: confirm mechanics, severity low.** No API data is reachable through the static handler. The hazard is forward-looking: the invariant "everything under `/api` is JSON" now depends on `isApiPath` seeing the *raw* pathname, and any future middleware that decodes before routing silently changes routing. Pin it with a test, not a comment.
3. **Mutation testing: confirm, with the F1 sharpening** — the `..` check is subsumed, so the green suite on single-layer removal is *expected*, not just a coverage gap. The coverage gap that matters is the missing symlink fixture (F2), which neither layer catches.
4. **Symlink: confirm, upgraded per F2** (extension keyed on requested name → arbitrary file content served as an allowlisted, immutable-cached type).
5. **Shared bucket: confirm, low.** 2000/min per IP is ~40–100 SPA page loads/minute; only painful behind large NATs, and F8 dominates it anyway.

## Part 3 — Things in "already verified" I think you got wrong or half-wrong

- **"With hops = 0 every caller shares one bucket"** — imprecise; it's one bucket *per Render LB egress IP* (F8). The practical consequence (organic self-DoS) is worse than your framing, not better.
- **"HEAD → 200"** — verify what you actually asserted: `new Response(null, …)` for HEAD drops the `content-length` that the GET would carry. Some caches and proxies key or validate on it. Not a vuln; an incomplete verification.
- **"removing BOTH → 1 test fails"** — that single failing test is the only thing proving containment at all, and it presumably uses a lexical `..` path. It does not exercise the symlink case, so your suite currently proves containment against an attacker who doesn't exist and not against the one who does (build-pipeline symlink).

## Part 4 — Git remediation

**(a) Moving the lock aside: right outcome, wrong justification.** Git's index lock is *existence-based*, not `flock`-based — an "exclusive-open probe" on the lock file proves nothing about a live owner. The correct liveness check is `fuser`/`lsof .git/index.lock` plus `pgrep git` plus lock mtime. With 9-hour staleness and no git processes, the move was justified — but the *rename* (not delete) was the genuinely good call: atomic, recoverable, and if an owner had been alive, `git` would have failed loudly on its lock update rather than corrupting silently. Keep the move, fix the probe in the runbook.

**(b) `git commit -o -- <path>` is content-isolated, not race-proof.** `-o` builds the commit from HEAD plus the working-tree state of the named paths, so another agent's *staged* changes stay out of your commit — that part is real. But: it still takes `index.lock` (concurrent `git add` → lock error; fails safe, but fails), it still **runs hooks** (a fleet-wide pre-commit that stages anything reintroduces the race through the side door), and — critically — `-o` with a pathspec **does not include untracked files**. The 16 foreign files got in because someone ran `git add <dir>` first, and `git add <dir>` sweeps *everything* under that directory, including other agents' untracked work. The race you should be worried about isn't staging-vs-commit; it's add-sweeping-vs-another-agent's-half-written-file.

**(c) Committing 16 untracked foreign files: overstep, mitigated.** Two weeks stale makes "rescue" defensible; doing it without per-file inspection does not. Untracked files are precisely where agents drop `.env` dumps, scratch credentials, and half-finished migrations — you committed them blind, under your authorship, breaking blame. The rescue-shaped move was: inspect each file, commit the obviously-safe ones with a message naming the orphaning agent, and branch-or-stash the rest. What you did was `git add <dir>` and hope.

**(d) What else fails silently fleet-wide in a shared tree:**
- **`gc.log` wedge**: an interrupted auto-gc leaves `.git/gc.log`, and every subsequent `gc --auto` refuses to run *forever* ("gc is already running") — the repo bloats for months and no single agent ever sees an error, because auto-gc failures are warnings on stderr.
- **Stranded ref locks**: `refs/heads/<branch>.lock`, `packed-refs.lock` — same failure mode as `index.lock`, different commands, same root cause (lock taken before validation).
- **Racy index stat cache**: agent A writes a file within the same timestamp granularity as an index write; agent B's `git status` reports it clean. Silent lost work, by design of the racy-git heuristic.
- **Shared hooks and config**: one agent editing `.git/hooks/` or `core.hooksPath`/`core.attributesFile` changes behavior for the whole fleet with zero visibility.
- **`FETCH_HEAD`/`ORIG_HEAD` clobbering**: concurrent fetches make both files meaningless for everyone.
- `fsck` clean proves object-store integrity, not worktree sanity — you verified the wrong layer and got lucky.

The `git worktree`-per-agent fix is correct; the lighter-weight alternative is per-agent `GIT_INDEX_FILE` plus per-agent `GIT_DIR`-scoped config, but worktrees also fix the ref-lock and gc problems, so worktrees win.

## The single most likely thing you've missed

**Your traversal defence is not the code you reviewed — it's the WHATWG URL parser, and your test suite cannot see the difference.** Every "defence verified" result in your live tests (`/../`, `/%2e%2e/`, `/..%5c`) was produced by `new URL()` normalization before a single line of `decodePathname` or `resolveWithinRoot` executed. The `..` check is dead code that no test can kill-detect (your own mutation data proves it), `resolveWithinRoot` is the only layer you wrote that ever fires, and the one input class that beats *it* — a symlink in `dist`, served under an allowlisted requested extension with an immutable cache header — has no test, no `realpath` check, and sits squarely in your supply-chain threat model. Add the symlink fixture and the `realpath` containment check; everything else on this list is hygiene by comparison.
