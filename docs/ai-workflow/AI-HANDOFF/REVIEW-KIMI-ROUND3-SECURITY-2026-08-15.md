# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-BRIEF-ROUND3-2026-08-15.md
**Seed:** (none)
**Tokens:** 10192 in / 36948 out | **Cost:** ~$0.5848 | **Wall:** 691.0s | **finish_reason:** stop

---

# SwanGuard round-3 hostile review

Line numbers are counted from the source as printed in the brief (no line numbers were supplied); they should be within a line or two. Where the excerpt gave no stable numbering (server.ts), I cite by symbol.

**Headline:** nothing here is CRITICAL-exploitable under the *stated* production config (hops=1, Render appends exactly one XFF entry, all sign-in paths closed). The two HIGH findings are both single-precondition away from outage/bypass, and both live in the code the last two commits added.

---

## HIGH-1 — `normaliseIdentity` collapses every IPv4-mapped IPv6 client into one rate-limit **and one lockout** bucket

**`apps/api/src/httpHardening.ts:91-94`** (function at 76-95).

Trace `::ffff:203.0.113.7` through the function: no brackets → `value.includes(':')` true → `split('::')` gives `head=''`, `tail='ffff:203.0.113.7'` → `headParts=[]`, `tailParts=['ffff','203.0.113.7']` → filler = 6 → `[0,0,0,0,0,0,'ffff','203.0.113.7'].slice(0,4)` → **`0:0:0:0::/64`**. The hex form `::ffff:cb00:7107` lands on the same key, as do `::1` and `::`. Every IPv4-mapped client on the internet shares one bucket.

**Why this is the 9b20fb4 bug again:** that commit removed the lockout for `UNTRUSTED_ORIGIN` precisely because a shared lockout key is "a global sign-in kill switch" (comment at httpHardening.ts:256-266). The mapped-address collapse recreates an identical shared key — `0:0:0:0::/64:/api/auth/magic-link/consume` (authKey at :269) — but it is **not** `UNTRUSTED_ORIGIN`, so the :267 bail-out does not fire and the lockout is fully armed on the shared key.

**Attack sequence** (precondition: the front proxy renders IPv4 peers in mapped form — Node dual-stack sockets produce `::ffff:x.x.x.x` from `remoteAddress` by default, so any proxy that copies the socket address into XFF does this):

```
for i in $(seq 1 55); do
  curl -s -X POST https://swanguard.example/api/auth/magic-link/consume \
    -H 'content-type: application/json' -d '{"token":"AAAAAA"}'
done
```

50 failures → `recordAuth` (:333-340) locks `0:0:0:0::/64:/api/auth/magic-link/consume` for 15 min. Every IPv4 user on earth now gets `429 auth_locked_out` on sign-in. One request every 15 minutes renews it indefinitely. Bonus: `recordAuth` counts **any non-2xx as failure** (:336), and `errorResponse` 500s pass through `recordAuth` (app.ts calls it after the catch) — so 50 requests that merely *crash the handler* lock the cohort without touching credential guessing. The same key also shares the 2000/min IP bucket (:291-302): one mapped-form attacker 429s all mapped-form users.

**Impact:** renewable, one-attacker sign-in outage for the entire IPv4 user base, plus mass 429s. **Confidence:** code trace certain; exploitability conditional on the proxy emitting mapped form — I could not determine Render's XFF rendering from the brief. **Fix care:** detect the `::ffff:` prefix and key on the embedded IPv4 address, handling *both* dotted and hex tail forms; do not just strip the prefix and re-enter the `/64` path, and do not "filter out" mapped entries (that would promote caller-written chain entries — the exact `unknown`-fix regression the brief warns about).

---

## HIGH-2 — `assertTrustedProxyConfiguration` accepts `undefined`/`NaN`/fractional/`Infinity`; two of those turn `guard()` into a per-request throw **outside** the app's try/catch

**`apps/api/src/httpHardening.ts:134`** (`if (config.trustedProxyHops < 1)`), interacting with **:170, :198-207** and the **app.ts pipeline**.

`< 1` is the wrong predicate for every non-number number:

- **`undefined`** (env var unset; `trustedProxyHops?` is *optional* in `HttpHardeningConfig` at :43): `undefined < 1` is `false` → boot guard **passes**. Then :170 `?? 0` → hops=0 → every request keys to `UNTRUSTED_ORIGIN` → one shared 2000/min bucket and no lockout for the whole production service — the precise outage this commit exists to prevent, now *undetected at boot*.
- **`NaN`** (e.g. `Number("1\n")`/`Number("")` from an unvalidated env parse): `NaN < 1` is `false` → passes. In `clientKey`: `NaN <= 0` false → XFF parsed → `Math.max(0, len - NaN)` = `NaN` → `chain[NaN]` = `undefined` → **`trusted.toLowerCase()` throws TypeError at :207**.
- **Fractional, e.g. `1.5`**: passes the guard; a caller sending any XFF header makes `chain.length=2`, `index = 0.5`, `chain[0.5]` = `undefined` → same throw at :207. **Caller-triggerable at will.**
- **`Infinity`**: passes; `Math.max(0, len - Infinity)` = 0 → `chain[0]` — the caller-written leftmost entry is trusted → full rate-limit/lockout spoofing, the P1-6 hole reopened.

The throw is worse than it looks because of app.ts:

```ts
const blocked = httpHardening.guard(...) ?? httpHardening.authGuard(...);  // NOT in try/catch
if (blocked) return ...;
try { response = await dispatchRequest(...) } catch ...
```

`guard()` runs *before* the only try/catch. A TypeError here escapes `handle()` as a rejected promise; on Node ≥15 an unhandled rejection terminates the process by default.

**Attack sequence** (given hops=NaN or 1.5):

```
curl -H 'X-Forwarded-For: 9.9.9.9' https://swanguard.example/api/health
```

One request → process exit → Render restarts → repeat → sustained outage with a crash log that looks like a code bug, not config.

**Impact:** one-request process kill (NaN/fractional), or silent whole-service shared bucket (undefined), or full spoofing (Infinity). **Confidence:** JS semantics certain; whether config parsing can actually deliver NaN/undefined is **not determinable from the brief** (parsing code not shown) — but the guard's entire job is to catch bad values, and it catches only `< 1`. **Fix care:** validate `Number.isInteger(hops) && hops >= 1 && Number.isFinite(hops)` in the assert; do **not** "fix" it by coercing undefined→1 — the comment at :118-120 correctly warns a silent default of 1 re-opens spoofing.

---

## HIGH-3 (arms on launch) — magic-link **send** endpoint is absent from `AUTH_ATTEMPT_PATHS`; `recordAuth`'s 2xx=success convention can neuter the lockout even on `consume`

**`apps/api/src/httpHardening.ts:101-105`** (the Set), **:336** (success test).

The moment magic-link opens:

```
for i in $(seq 1 2000); do
  curl -s -X POST https://swanguard.example/api/auth/magic-link-intents \
    -H 'content-type: application/json' -d '{"email":"victim@example.com"}'
done
```

The send path gets **no lockout** (not in the Set → `authKey` returns null at :252) — the only control is the 2000/min per-IP bucket. That is 2000 emails/minute to an arbitrary victim from one address (mailbox bombing), or the service as a spam relay burning the mail provider's domain reputation, and IPv6 rotation multiplies it per /64 (see MEDIUM-1). Token-minting requests are likewise unbounded by lockout.

Second arming hazard: `recordAuth` treats any 2xx as success and **resets** the failure count (:336 via `recordAuthOutcome`). The standard anti-enumeration shape for both send and consume is `200 {status:"ok"}` regardless of whether the email/token was valid. If either endpoint is built that way, the lockout on `consume` **never accumulates a single failure** and brute force is bounded only by the per-IP rate limit. This must be verified against the endpoint's actual response contract when it lands — it is invisible from this brief.

Third: the dev path returning the token in the response body. If that behavior is gated on `nodeEnv` alone, any reachable non-production deployment (Render preview environments are the classic case) hands a working sign-in token for *any email address* to anyone who POSTs — instant account takeover, no mailbox access needed. The gating is not shown in the brief; flagging as must-verify before launch.

**Impact:** email-bombing/spam-relay at 2000/min per source identity; potentially zero effective brute-force lockout on consume; possible ATO via token-in-body outside production. **Confidence:** HIGH that the Set omits the path and that :336 resets on 2xx (visible in code); MEDIUM on endpoint behavior since it doesn't exist yet.

---

## MEDIUM-1 — the /64 lockout granularity is still a bypass for low-entropy tokens, and enables lockout-map eviction

**`apps/api/src/httpHardening.ts:76-95, :269, :339`** (`bound` at 229-242).

Commit 9b20fb4 stopped the 2^64 address walk, but the lockout is 50 failures **per /64 per 15 min**, and attackers routinely control a /48 (65,536 /64s — tunnel brokers, cloud VMs). That is ~3.2M consume attempts per 15 minutes. Against a high-entropy magic-link token: irrelevant. Against a 6-digit email code (a very common magic-link shape): the 10⁶ space is covered several times over — full brute force. Additionally, 10,001 distinct lockout keys overflow `maxTrackedKeys`, and `bound`'s second loop (:238-241) evicts **live** lockouts oldest-first — an IPv6-rotating attacker can evade even the per-/64 lockouts they already tripped.

**Confidence:** code behavior certain; exploitability hinges on token entropy, which I could not determine from the brief. **Fix care:** keying lockout on /48 instead trades this for merging legitimate sites behind one prefix — state the tradeoff rather than silently picking either.

---

## MEDIUM-2 — bare `IPv4:port` is misparsed as IPv6, putting the source port *inside* the rate-limit key

**`apps/api/src/httpHardening.ts:81`** (`if (!value.includes(':')) return value;`) with **:86-88**.

The bracketed regex at :78 only strips ports from `[v6]:port`. A bare `203.0.113.7:51234` contains a colon, so it enters the IPv6 branch: no `::` → `tail === undefined` → key becomes `203.0.113.7:51234::/64`. If the front proxy includes client source ports in XFF (non-standard but seen in the wild, e.g. HAProxy configs), **every new connection is a fresh bucket**: the per-IP limit and the auth lockout never trip, and the churn feeds `bound()` eviction of legitimate entries.

**Attack:** >2000 req/min from one client, no 429, lockout never accumulates. **Confidence:** parsing bug certain; exploitability conditional on proxy behavior — not determinable from the brief.

---

## MEDIUM-3 — hard links defeat the realpath containment added in a84f9a7

**`apps/api/src/staticSite.ts:270-299`** (realpath at :285, `isFile` at :291).

`realpathSync` resolves *symlinks*; a **hard link** inside the root to a file outside it has a real path genuinely inside the root — containment passes, `isFile()` passes. The module's own comments name "a build step or a dependency" as the realistic planter; a compromised dependency's postinstall can `ln /home/app/data/households.json dist/assets/backup.json` (same filesystem), and because the extension allowlist keys on the *requested* name, any allowlisted extension works:

```
GET /assets/backup.json  →  200 application/json  →  <database contents>
```

**Impact:** exfiltration of any file the build user could read, served unauthenticated with an attacker-chosen MIME. **Confidence:** HIGH that realpath containment is blind to inode aliasing; MEDIUM on the plant scenario. **Fix care:** an `nlink > 1` rejection would catch this but can false-positive with content-addressed/hard-linking build tooling — verify against the actual build before adopting.

---

## LOW findings

**LOW-1 — Session-bucket minting and eviction.** httpHardening.ts:212-221, 304-307, 229-242. `Authorization: Bearer <random>` per request mints unlimited `sess:` buckets (no credential needed — the threat model's exact attacker). Past 10,000 entries, `bound` evicts oldest *live* windows, resetting legitimate users' counts. This weakens the session limiter to nothing under flood, but the per-IP limiter backstops it, and eviction grants victims *more* quota, not less — limiter-neutralisation, not DoS.

**LOW-2 — 429 receipts disclose limiter internals.** httpHardening.ts:296-301, 309-314, 325-328, 351-361. `limit`, `remaining`, `retryAfterMs`, and especially `scope: ip|session|auth` tell an attacker exactly which limiter tripped and how to pace just under it; `auth_locked_out` vs `rate_limited` distinguishes lockout from rate limiting. Also: static 404/405 bodies lack `requestId` while API errors include it (staticSite.ts: notFound/notAllowed vs `receipt`), fingerprinting which layer answered. Minor recon aid.

**LOW-3 — Content-type from the requested name: analysed, not exploitable as-is.** staticSite.ts:161-170, 189, 220-224. A planted in-root symlink (`link.html → real.js`) relabels content, but: realpath containment (:285-288) keeps targets inside the root; `script-src 'self'` blocks inline script in any HTML so served; `nosniff` (assumed in SECURITY_HEADERS — see below) blocks script execution of mislabelled non-JS; and an attacker with a file-plant primitive could simply write an `.html`/`.js` directly. The confusion grants nothing beyond the primitive that enables it. No action beyond the already-accepted `isContentHashed` analogue.

**LOW-4 — CSP assessment (as requested).** staticSite.ts:75-88. (a) Against an attacker who can **write any file into the root**, `script-src 'self'` provides *zero* protection — they host the payload on `'self'` (`<script src="/evil.js">` from their own `evil.html`); the CSP mitigates markup injection, not file write, and nobody should cite it as a compensating control for the build/dependency planter. (b) `style-src 'unsafe-inline'` enables CSS injection → defacement/UI-redress; data exfiltration via CSS is well constrained by `img-src 'self' data:`, `font-src`, `connect-src 'self'`, `form-action 'none'`, `base-uri 'none'`. (c) **No open redirect and no JSONP-shaped endpoint exist in the shown code**; a future JSONP endpoint would additionally need a JS MIME to be `<script src>`-abusable, because nosniff blocks `application/json` — keep it that way. (d) `.svg` in the allowlist (:~104) is safe only because `secure()` (httpHardening.ts:342-347) back-fills the API's `default-src 'none'` onto non-HTML responses — SVG with script is otherwise same-origin XSS. That dependency is implicit; a test pinning "SVG responses carry a CSP" is warranted.

**LOW-5 — Startup codes: sound lookup, operability regression, one misclassification path.** server.ts (`STARTUP_FAILURE_CODES`, `startupFailureCode`). The name-keyed lookup is sound given every class sets `this.name` explicitly, and codes go to logs only — no HTTP surface shown — so disclosure requires log access and reveals gate *existence*, not values: negligible. But the first call site wraps with a generic message and **discards the original error's message and stack**, so the "crash-loop with an unreadable log" the comment claims to fix is only half-fixed (a bare code, no remediation text — the `TrustedProxyConfigurationError` message is the good part and it's thrown away). And staticSite.ts:140's `statSync(shellAtBoot)` can throw raw on a boot-time race (the file was just stat'ed inside `resolveWithinRoot`), producing a non-`ConfigError` → misclassified `STARTUP_E_UNKNOWN`.

**LOW-6 — Pre-auth surface inventory (question 1).** Reachable unauthenticated: all static GET/HEAD (the full JS bundle — app logic, routes, embedded feature flags — plus **any allowlisted file the build copies**: `.json`/`.txt` are in CONTENT_TYPES at staticSite.ts:95-112 and the comments themselves cite a served `/assets/version.json` → version disclosure aids CVE targeting); 405 for any non-GET/HEAD off-`/api` (reveals the static handler exists); `/api/health`; the three closed sign-in paths returning **403 vs 503 vs 404** — which leaks each feature's rollout state; 413/429 receipts. All minor, all pre-auth by design, but the `.json`/`.txt` allowance is the one with a concrete leak.

**TOCTOU (question 3) — explicitly de-prioritised.** The realpath→stat→`readFile` race (staticSite.ts:285-298 vs :177) exists, but winning it requires local write access to the served root; a remote credential-less attacker cannot reach it, and a local attacker with root-write can already replace content outright. The only escalation is a scoped-write CI principal racing a symlink swap to read files readable only by the API user — microsecond window, contrived. Case-insensitive filesystems fail *closed* (case-mismatched prefix check → 404), not open.

---

## What I could NOT determine from this brief

1. **Contents of `SECURITY_HEADERS`** — whether `x-content-type-options: nosniff` and the API's `default-src 'none'` CSP are actually present. LOW-3, LOW-4(d), and the JSONP analysis all depend on both.
2. **How `SWANGUARD_TRUSTED_PROXY_HOPS` is parsed** — whether NaN/undefined/fractional can actually reach `assertTrustedProxyConfiguration` (the precondition for HIGH-2's crash variant).
3. **The server adapter's behavior when `handle()` throws** — process crash vs. dropped connection vs. 500 (severity of HIGH-2).
4. **Render's actual XFF rendering** — mapped IPv4 forms (HIGH-1) and ports (MEDIUM-2) are both proxy-behavior-dependent.
5. **Magic-link token entropy and response shapes** — whether MEDIUM-1/HIGH-3's brute-force paths are real, and whether consume returns anti-enumeration 200s.
6. **How the dev-sign-in token-in-body behavior is gated** (HIGH-3, third hazard).
7. **`readJsonBody` and the full `recordAuthOutcome` body** — quoted only in part.
8. Whether any existing or planned endpoint reflects input with a JavaScript MIME (the only way `script-src 'self'` becomes JSONP-abusable).

**Deliberately not reported** (per the accepted list): NAT/shared-IP 429s, wrong-but-plausible hop counts, direct-to-node XFF trust, `isContentHashed` on the requested path (and its self-documented regex residual), missing ETag, HEAD content-length, the unreachable clear-after-lock, realpath cost on network mounts, and the redundant lexical `..` check.
