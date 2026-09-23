# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-BRIEF-ROUND2-2026-08-15.md
**Seed:** (none)
**Tokens:** 2230 in / 15233 out | **Cost:** ~$0.2352 | **Wall:** 317.7s | **finish_reason:** stop

---

# Pre-ship hostile review — round 2

I attacked the fixes. Several hold. Several don't. The rate limiter has real problems, but the thing most likely to ruin your first deploy is the interaction between FIX 5 and the error sanitizer you decided not to touch.

---

## Findings

### 1. HIGH — FIX 4: XFF-absent collapse is a site-wide auth lockout, not just a 429 bucket

**Line:** `if (!forwarded) return UNTRUSTED_ORIGIN;` combined with `authKey = ${clientKey}:${pathname}` and "50 failures / 15 min → 15 min lock."

**Failing input:** Any topology where some requests arrive without `x-forwarded-for` (proxy strips it on a path, a health/internal route bypasses the LB, a websocket upgrade that doesn't forward headers, a second ingress you forgot about). Then:

```
50 × POST /api/auth/login  { "user": "anyone", "pass": "wrong" }   (no XFF header)
```

**Wrong output:** All 50 failures land on `UNTRUSTED_ORIGIN:/api/auth/login`. Every user attempting sign-in — from any IP — gets 429 for 15 minutes. One attacker (or one confused client) renews this indefinitely by re-failing every 15 minutes. You have built a global sign-in kill switch keyed on a constant string.

You named this risk ("can one attacker lock every user out of sign-in?") and the answer is **yes, trivially, whenever collapse occurs** — and collapse occurs whenever any request path lacks the header, which is exactly the scenario you designed UNTRUSTED_ORIGIN for.

**Fix:** Never apply lockout to the shared fallback key. If `clientKey === UNTRUSTED_ORIGIN`, apply per-attempt throttling only, or key auth lockout on `username + clientKey` so the shared bucket can't be exhausted into a global lock. Add a metric/alert on the fraction of traffic keyed as UNTRUSTED_ORIGIN — that number going nonzero in prod is your early warning for finding 3.

---

### 2. HIGH — FIX 4: static assets in the per-IP bucket makes shared-egress collapse a certainty, not a risk

**Line:** "Static assets pass through this same limiter" + per-IP 2000/60s.

**Failing input:** 100 users behind one corporate NAT (your launch customer, a school, a conference wifi). Each page load = 1 document + ~40 assets:

```
100 users × 40 assets × 1 page load/min = 4000 req/min from one source IP
```

**Wrong output:** The entire office 429s after ~30 seconds. Per-IP 2000/min sounds generous until you divide by assets-per-page and users-per-egress-IP. This is the classic first-deploy outage for SPAs and you've baked it in.

**Fix:** Separate, much larger bucket for static GETs (or exempt successful asset responses and only count misses/errors). Keep the 2000/min bucket for API/auth traffic.

---

### 3. HIGH — FIX 4: the guard validates that hops exists, not that it's *correct*; both error directions are exploitable

**Line:** `const index = Math.max(0, chain.length - hops);`

The formula is only sound when `hops` exactly equals the number of proxies that **append** to XFF. FIX 5 enforces `>= 1`. It cannot enforce correctness, and both directions fail:

**Too high (or a proxy that sets/replaces instead of appending):** hops=2, one appending proxy.

```
GET /api/anything
X-Forwarded-For: 9.9.9.9        ← proxy appends real IP: chain = [9.9.9.9, real]
```

`index = max(0, 2-2) = 0` → key = `9.9.9.9`, caller-written. Rotate it per request: limiter fully bypassed, and you mint 10,000 buckets against `maxTrackedKeys`, evicting (or growing past) every legitimate bucket. **You are one fat-fingered env var away from re-opening P1-6, and the boot guard will have told you the config was valid.**

**Too low:** hops=1, two appending proxies (e.g., Cloudflare → Render). `index = len-1` → key = the *inner proxy's own IP*. All users share one bucket → finding 2's collapse, for everyone, forever.

**Fix:** You cannot validate this statically, so detect it at runtime: log the derived key cardinality at boot/canary, alert if the top key exceeds a small share of traffic, and document the counting rule ("number of proxies that append, counted from your process outward"). Consider rejecting requests where `chain.length < hops` loudly (metric), since that is the signature of misconfiguration.

---

### 4. MEDIUM-HIGH — FIX 4: IPv6 rotation bypasses the per-IP limit even with correct hops

**Line:** `return chain[index]` — the key is the literal address string.

**Failing input:** Client rotates through its /64:

```
X-Forwarded-For: 2001:db8::1
X-Forwarded-For: 2001:db8::2
... (2^64 available)
```

**Wrong output:** Each request is a fresh bucket. Per-IP limiting is meaningless for IPv6 clients, and key churn burns `maxTrackedKeys`. Any client with a /64 (default allocation everywhere) has this.

**Fix:** Normalize IPv6 keys to their /64 prefix before bucketing.

---

### 5. MEDIUM-HIGH — FIX 1: canonicalising the root once at construction breaks symlink-swap deploys, then 404s everything while health stays 200

**Line:** "`rootPath` is computed once at construction as `canonicalise(resolve(root))`"

**Failing input:** Standard atomic deploy layout — root configured as `/srv/app/current`, a symlink to `/srv/app/releases/2024-01-01`. Boot canonicalises to the release dir. Deploy release `2024-02-01`, repoint the symlink.

**Wrong output:** The running process serves the **old release indefinitely** — every request resolves under `/srv/app/releases/2024-01-01` because `rootPath` was frozen at boot. Then your retention job deletes the old release: `realpathSync` throws → `canonicalise` returns null → **every static request 404s while `/api/health` returns 200** — the exact incident FIX 3 was built to prevent, now occurring at runtime instead of boot.

Note the flip side: freezing the canonical root is also what *saves* you from the dist-swap escape (a swapped `dist` symlink resolves outside the frozen root and is rejected). The defense works; the cost is this.

**Fix:** Re-canonicalise the root per request (one extra `realpathSync`, which you're already paying for the candidate), or watch the symlink and rebuild. At minimum, document that the root must be a real directory, never a symlink.

---

### 6. MEDIUM-HIGH — FIX 3 only moved the original defect to runtime; `/api/health` still doesn't exercise static serving

**Line:** the boot check itself; the health endpoint is unchanged.

**Failing input:** Boot succeeds on a healthy EFS/NFS mount; the mount drops or hangs afterward. Or finding 5's release cleanup.

**Wrong output:** Pages 404 (or the sync syscalls hang the event loop → *everything* times out), `/api/health` still returns 200, platform keeps the instance live and retires nothing. Your original proven incident was "boots, pages 404, health 200, deploy goes live." FIX 3 covers only the boot-time half of that sentence.

**Fix:** Wire the health endpoint (or a `/health/deep` the platform checks) through the same per-request `resolveWithinRoot(rootPath, '/index.html')` you already run. You built the recheck; the health check doesn't use it.

---

### 7. MEDIUM — FIX 3: zero-byte `index.html` passes

**Line:** `statSync(real).isFile()` (and the readability check).

**Failing input:** A failed build that still creates the file:

```
touch dist/index.html    # or a truncated CI artifact upload
```

**Wrong output:** Boot passes (regular file, readable), every route serves `200` with an empty body, health 200, platform marks the deploy live. Blank app in production, all checks green.

**Fix:** Require `size > 0` at minimum; better, require a marker you control (`<div id="root">`, a build stamp comment).

---

### 8. MEDIUM — FIX 2: legitimate hashed assets get `no-cache` (silent regression you asked about)

**Line:** `/[-.][A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/`

**Failing inputs:**
- Rollup/Vite configured with `[hash:6]` (a documented, common setting): `assets/index-a1b2c3.js` → 6-char hash fails `{8,}` → **NO_CACHE on an immutable asset**.
- Any request path carrying a query string, if `requestedPath` includes it: `/assets/app-B3k2x9Lm.js?v=3` → `$` anchor fails → NO_CACHE. (I can't verify what the caller passes; if it's `url.pathname` you're safe — confirm it.)

**Wrong output:** Immutable assets served `no-cache` forever. Nobody notices; repeat visitors re-download everything; your origin takes the load — which feeds finding 2's bucket exhaustion.

**Fix:** Lower the bound to 6 (collision risk at 6 base64url chars is still negligible for cache-keying purposes) or make the threshold configurable, and add a test fixture containing your *actual* build output filenames so a Vite default change goes red.

**ReDoS:** I cannot construct one. No nested quantifiers, the hash class excludes `.`, path length is bounded — worst case is quadratic-ish scanning on a short string. Rating: **none**.

---

### 9. LOW-MEDIUM — FIX 2: the check runs on the requested path, and containment permits in-root symlinks

**Line:** `isContentHashed(requestedPath)` vs. `resolveWithinRoot` returning `real`.

**Failing input:** A symlink inside dist (containment explicitly allows in-root symlink targets):

```
dist/assets/app-AAAAAAAA.js  →  ../config.js   (mutable, in root)
GET /assets/app-AAAAAAAA.js
```

**Wrong output:** Mutable content served with `immutable, max-age=1y` — a one-year cache-poisoning of a resource that will change. Requires someone/something to create the symlink (a build tool, a deploy script), which is why it's not higher.

**Fix:** Run the hash check on the resolved basename, or assert dist contains no symlinks at build time.

---

### 10. LOW — FIX 1: the `?? resolve(root)` fallback creates the casing mismatch you asked about

**Line:** `canonicalise(resolve(root)) ?? resolve(root)`

**Failing input:** Root absent at boot (build step ordering), later created, on a case-insensitive FS or a path traversing a symlink (`/var/www` → `/private/var/www` on macOS; Windows drive-letter casing: `resolve` yields `c:\app\dist`, `realpathSync` yields `C:\app\dist`).

**Wrong output:** `rootPath` is the non-canonical string; every per-request `real` is canonical; `isInsideRoot` string-compares them → mismatch → **all static requests 404 forever, health 200**. Linux production with the root present at boot is safe; the fallback path is the hole.

**Fix:** If the root can't be canonicalised at boot, fail the boot (you already refuse for a missing shell — a missing root is strictly worse) or re-canonicalise lazily and atomically swap.

---

### 11. LOW — FIX 1: TOCTOU and sync-syscall amplification

**TOCTOU** (`realpathSync`/`statSync` → later `readFile`): real, but exploiting it requires write access to the served tree, at which point you have larger problems. The frozen canonical root (finding 5) closes the deploy-swap variant. Rating: low.

**DoS amplification:** two blocking syscalls per asset, no cache. On local disk with page cache, negligible. On EFS/NFS at ~1–5ms per `realpathSync`, 2000 req/min (your own limit) = up to ~20s of blocked event loop per minute per key — and finding 4 shows how cheap fresh keys can be. Conditional medium on network mounts. **Fix:** a small positive-result cache keyed by path, invalidated on `fs.watch` or TTL.

---

### 12. LOW — FIX 4: dead fallback and `unknown` entries

- `chain[index] ?? chain[chain.length - 1]` — with `hops >= 1` and `chain.length >= 1`, `index = max(0, len - hops)` is always in `[0, len-1]`. The `??` branch is unreachable. Dead code here means the invariant was never checked; delete it or assert it.
- Proxies that insert the literal string `unknown` (several cloud LBs do) create a shared `unknown` bucket across unrelated users. Filter `unknown` (case-insensitive) from the chain before indexing.

---

### 13. The coverage gap: documenting it was the wrong call

"WHATWG URL normalisation collapses dot segments before this module runs" is true **only for paths that arrive via WHATWG parsing**. The day someone adds a route using raw `req.url`, or a proxy decodes `%2f` upstream, the lexical `..` check is the only thing standing up — and per your own disclosure, deleting *containment itself* leaves the suite green. You currently have no effective test on the security control.

The fix is five lines and you already have the harness:

```ts
expect(resolveWithinRoot(root, '/../secret.txt')).toBeNull();
expect(resolveWithinRoot(root, '/../../etc/passwd')).toBeNull();
```

Call the module directly, bypassing URL parsing. That distinguishes the two checks and pins containment independently. Document-then-ship is how this regression gets in.

---

### 14. The non-fix: stopping was wrong, and it directly causes your worst first-deploy outcome

The test asserts that **raw environment values** (a `DATABASE_URL` interpolated into an error) never reach logs. A fixed enum reason code interpolates nothing:

```
STARTUP_E_TRUSTED_PROXY_HOPS_UNSET
STARTUP_E_SHELL_NOT_READABLE
STARTUP_E_DURABILITY
```

Does a code leak anything to an attacker who can trigger boots? No: they already know they triggered the boot, the code reveals config *state* (not values), and startup logs are operator-facing — an attacker reading your deploy logs is a separate, already-fatal breach. You conflated "never log env values" with "never say anything," and the test you deferred to does not prohibit the enum design.

**Correct design:** fixed enum code + a static, allowlisted hint string per code; keep sanitizing all dynamic content exactly as today.

---

## The single thing most likely to break on the first production deploy

**FIX 5 + the sanitized startup error.** This service has never run in production, which means the production environment has never needed `SWANGUARD_TRUSTED_PROXY_HOPS` set — it defaults to `0` everywhere else. The first prod boot throws `TrustedProxyConfigurationError`, the runtime sanitizes it to **"could not start"** with no reason, and because this is the *first* deploy there is no previous version to roll back to. You get a crash-looping service and a log line that tells the operator nothing, during the highest-scrutiny deploy of the project's life. Finding 14 is what converts this from a two-minute fix into a multi-hour incident. Ship the enum codes in the same release as the guard, or do not ship the guard.

Runner-up: finding 1/2 — any request path lacking XFF collapses all anonymous users into one 2000/min bucket and one shared auth lockout.

## Things you made worse than they were

1. **Direct-to-node production (FIX 5).** A legitimate topology (Node directly exposed, or behind an LB that sets its own header you don't read) previously failed *closed*: hops=0 → UNTRUSTED_ORIGIN → degraded but not spoofable. Now it cannot boot at hops=0, so the operator sets `1` — and every client's self-written `X-Forwarded-For` is trusted verbatim, with a boot guard vouching for the config. You converted fail-closed into fail-open-with-confidence.
2. **Proxies that set `X-Real-IP` but not XFF (FIX 4).** Before: keyed by X-Real-IP — spoofable, but functional. After: total collapse into one bucket. For that topology you traded "working but spoofable" for "down."
3. **Atomic symlink deploys (FIX 1).** Previously the server followed the symlink per request; now it serves the boot-time release forever, then 404s everything (health 200) after retention cleanup. A standard deploy pattern is silently broken.
4. **Boot refusal without reason codes (FIX 3 + 5 + non-fix).** "Running but 404ing" was bad; "crash-looping with a one-line log that says nothing" is operationally worse, and you now have *two* guards that produce it.

**Verified-clean items I could not break:** the FIX 2 regex (no ReDoS, rating none); the `+ sep` prefix-sibling guard; the dist-swap escape (closed by the frozen canonical root); left-padding XFF entries when hops is exactly correct (positional math holds).
