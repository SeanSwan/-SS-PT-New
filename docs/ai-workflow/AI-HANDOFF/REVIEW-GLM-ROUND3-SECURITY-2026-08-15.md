# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-BRIEF-ROUND3-2026-08-15.md
**Tokens:** 10064 in / 29455 out (reasoning: 25454) | total 39519
**Wall:** 422.2s

---

Note on citations: line numbers are counted from the listings provided; treat as ±5. Anything behind `dispatchRequest` (API router body, magic-link route handlers, config parsing of `SWANGUARD_TRUSTED_PROXY_HOPS`, the dev-sign-in 403 gate) is elided and flagged below as undetermined.

---

## 1. Pre-authentication attack surface (complete enumeration)

| Reachable | What it leaks / allows |
|---|---|
| `GET/HEAD` any non-`/api` path | Full build output for allowlisted extensions (`.txt`, `.json`, `.svg`, …) from **anywhere in the root**, not just `/assets/`; the HTML shell (which names every hashed asset → dependency/version fingerprint); a 200-vs-404 file-existence oracle (F7). |
| `POST/PUT/PATCH` with declared oversized `content-length` | 413 receipt that echoes `limitBytes: 1000000` — ops-config disclosure pre-auth (`httpHardening.ts` `guard`, ~:283). |
| Any request past 2000/min | 429 receipt leaking `limit`, `remaining`, `retryAfterMs`, `scope` — confirms *which* limiter tripped and whether your bucket is shared with live strangers (F5, amplifier for F1). |
| `POST /api/auth/dev-sign-in` | 403 today — but the 403 itself discloses that the route exists and is env-gated, not absent (contrast passkeys' 404). Pre-auth roadmap intel. |
| `POST /api/auth/magic-link/intents` | 503 — discloses a sign-in modality under construction. |
| `POST /api/auth/magic-link/consume`, `/api/auth/passkeys/login/verify` | Lockout machinery reachable: `auth_locked_out` + `retryAfterMs` tells an attacker exactly when to resume. |
| All other `/api/*` | **Could not determine** — router elided. |

Also note: no authentication is needed to *spend* other people's rate-limit budget via the shared bucket in F1.

## 2. Rate-limit / lockout bypass

**F1 — HIGH. All IPv4-mapped IPv6 addresses collapse to one shared bucket `0:0:0:0::/64`.**
`httpHardening.ts:75–94` (`normaliseIdentity`), specifically the `slice(0, 4)` at :87/:93 which takes the first four groups of the *expanded* address and discards the rest.

Trace for `::ffff:203.0.113.7`: `split('::')` → head `''` → `headParts=[]`; tailParts `['ffff','203.0.113.7']`; filler = 6 zeros; expanded = `[0,0,0,0,0,0,'ffff','203.0.113.7']`; `slice(0,4)` → `0:0:0:0::/64`. **The IPv4 tail is thrown away entirely.** Every `::ffff:a.b.c.d` address — and every address whose expansion begins with four zero groups — keys to the identical string.

Attack sequence (assuming the edge delivers IPv4 peers in mapped form, which Node dual-stack listeners do natively):
1. `curl -s -D- https://app/ -H 'accept: anything'` ×2001 from any v4-mapped client → every subsequent v4-mapped client gets `429 {"scope":"ip","remaining":0,...}`.
2. Stronger: `for i in $(seq 1 50); curl -s -X POST https://app/api/auth/magic-link/consume -H 'content-type: application/json' -d '{"token":"x"}'; done` → lockout key `0:0:0:0::/64:/api/auth/magic-link/consume` (`httpHardening.ts:271`) locks sign-in **for every v4-mapped client** — the exact "global sign-in kill switch" the comment at :258–269 claims production cannot reach, reintroduced through the normaliser rather than the constant.

Impact: cross-user 429 DoS plus targeted total lockout of the sign-in path for an address class. Confidence: code behaviour **certain** (verified by hand-trace); whether Render emits the mapped form in `x-forwarded-for` **could not be determined** — this is the one fact to verify before dismissing it. Residual sibling: a non-bracketed `ip:port` entry (`1.2.3.4:5678`) keys per-port (`:82–87` path), so any middlebox that varies the port mints fresh buckets.

**F2 — MEDIUM. Unlimited session buckets minted by junk Bearer tokens.**
`httpHardening.ts:214–223` (`sessionKey`). Pre-auth:
```
for i in …; curl -s https://app/api/whatever -H "Authorization: Bearer random$i"; done
```
Each request gets a distinct `sess:<sha256>` bucket; the session limiter never binds an attacker who doesn't want it bound. It only ever constrains holders of *fixed* tokens (i.e., legitimate users), where the per-IP limit already binds. The control is decorative against its actual adversary. Map growth is bounded (`bound()`), so this is a control-integrity finding, not memory exhaustion. Confidence: high.

**F3 — MEDIUM (conditional on elided config parsing). Non-integer / NaN `trustedProxyHops` passes the boot guard and crashes on the first proxied request.**
`httpHardening.ts:134` checks only `< 1`. `NaN < 1` is false; `1.5 < 1` is false. Then in `clientKey`: `NaN <= 0` false → XFF path taken; `Math.max(0, len - NaN)` = `NaN`; `chain[NaN]` = `undefined`; `trusted.toLowerCase()` at :209/**202** throws `TypeError`. With `hops = 1.5`, `chain[2.5]` → `undefined` → same throw. Attack: set `SWANGUARD_TRUSTED_PROXY_HOPS=1.5` (typo) or any unparseable value → boot succeeds (guard passed), then **every request carrying `x-forwarded-for` — i.e., all traffic through the proxy — errors**. This is precisely the crash-loop-outage shape the guard was built to prevent, arriving through a value the guard doesn't validate for type/integrality. Distinct from the accepted "wrong-but-plausible hop count" residual: this is the *new guard* failing its own contract. Confidence in the code path: high; whether the elided parser can produce NaN/1.5: **undetermined**.

**Verdict on XFF bucket-minting at hops=1 (the question asked):** No, *provided* the proxy appends rather than passes through — index `len - hops` (:201) then always lands on the proxy-written rightmost entry, and the in-place `unknown` rejection (:209) is correct (does not promote caller entries). Whether Render appends, replaces, or passes `x-forwarded-for` through **could not be determined from this brief**; if it passes through, hops=1 is fully spoofable — but that is the accepted direct-to-node/wrong-hops residual, not re-reported.

## 3. Static file server: traversal, link escape, TOCTOU, content-type

**Traversal/link escape: clean.** Post-decode `..`/NUL/backslash rejection, lexical containment, then `realpathSync` + containment + `isFile` re-check (`staticSite.ts:276–306` approx). A link inside the root pointing out resolves to an out-of-root real path → 404. Case-insensitive filesystems: `realpathSync` returns the true canonical target, so case-aliasing cannot launder an escape; target platform is Linux anyway.

**TOCTOU: LOW, not remotely exploitable.** The window is between `statSync(real)` and `readFile(real)`: a local actor that deletes the target and replaces it with a symlink in that microsecond window escapes containment. That requires local write access, at which point the game is over (see §4). The per-request root `canonicalise` is the *intended* symlink-swap-following for atomic deploys. No remote-reachable TOCTOU exists because no remote primitive writes to the root.

**Content-type from the requested name: not exploitable for script execution.** Chain of reasoning: (a) containment now holds on the *resolved* path, so a mis-typed serve requires an in-root file whose name differs from the request — only build-planted links do that; (b) `X-Content-Type-Options: nosniff` (via `SECURITY_HEADERS`) prevents reinterpretation of e.g. `image/png`-typed bytes as HTML; (c) even served as `text/html` (request a `.html` name), `script-src 'self'` with no `unsafe-inline`/`unsafe-eval` blocks inline script, and `default-src 'none'` applies to non-HTML static responses. The only script path is an attacker-authored `.js` *file inside the root* — which is the file-write-to-root scenario of §4, already fatal. Verdict: no independent finding; the residual is exactly "file-writer == developer."

**F4 — LOW. Unauthenticated file-existence oracle + whole-root disclosure of `.txt`/`.json`/`.svg`.**
`staticSite.ts:91–107` (`CONTENT_TYPES`) and :165. Any file with an allowlisted extension anywhere under the root is served `no-cache` to anonymous callers:
```
GET /deploy-notes.txt        → 200 text/plain   (if a build step copied it in)
GET /assets/config.local.json → 200 application/json
```
The allowlist was reasoned about as "things the build emits under /assets"; it actually governs the entire root. Impact depends on build hygiene; oracle value (`200` vs `404`) is unconditional. Confidence high on mechanism.

## 4. The CSP

`staticSite.ts:72–85`. Verdicts:

- **Attacker who can write any file into the root: CSP is irrelevant — full origin compromise.** Plant `evil.html` plus `evil.js`; request `/evil.html`; `script-src 'self'` happily loads `/evil.js` because "self" includes attacker files. Script then reads `document.cookie` (SameSite=Strict does not protect against same-origin script) → session takeover. `style-src 'unsafe-inline'` adds UI-redressing/overlay phishing on top. This is inherent to any static server and matches the trust model stated above; it means a compromised dependency or CI step is game-over with no second line — worth stating in threat model, not a new defect.
- **Open redirect / JSONP-shaped endpoint: none found in the provided code.** `connect-src 'self'` plus no CORS means even a JSONP-ish reflector could not exfiltrate to another origin; the risk would be `script-src` bypass via a same-origin JSON-to-script gadget — **could not determine**, router elided; flag for the round when routes are shown.
- **`style-src 'unsafe-inline'` in isolation:** CSS-only exfiltration is blocked (`img-src 'self' data:`, `font-src`, `connect-src 'self'` close every fetch channel to a foreign origin; `@import` is bounded by `style-src`'s origin list). Residual is overlay/restyling attacks, which require DOM injection anyway.

## 5. `STARTUP_E_*` and status-code differentials

**No remote disclosure via `STARTUP_E_*`:** codes are emitted only to `output.error` / exit path at boot. An unauthenticated remote attacker cannot trigger a boot or read the log. Fine.

**F5 — LOW. `startupFailureCode` lookup is unsound against prototype keys.**
`server.ts` (`STARTUP_FAILURE_CODES` record + `startupFailureCode`): `STARTUP_FAILURE_CODES[name] ?? 'STARTUP_E_UNKNOWN'`. For `error.name === 'constructor'` / `'toString'` / `'valueOf'`, the lookup returns the inherited `Object.prototype` member (truthy, so `??` doesn't fire) and the "fixed constant" becomes a function whose source is interpolated into the log line — violating the stated guarantee that nothing but a fixed constant is emitted. Unreachable with the four current error classes (none collide), so LOW; fix is `Object.hasOwn` or a `null`-prototype record, and note the fix breaks nothing.

**Status-code differentials (LOW, informational):** 404 vs 405 maps the router for a remote caller (`POST /index.html` → `405 method_not_allowed` = static-served; `POST /api/nope` → 404); 403 vs 503 vs 404 on the three auth paths is a free sign-in-modality roadmap (§1); 429 receipts leak limiter internals and, under F1's shared bucket, let an attacker *verify* cross-victim sharing by watching `remaining` move on requests they didn't make. `retryAfterMs` on `auth_locked_out` gives brute-force resumption scheduling to the second.

## 6. What arms the moment magic-link opens

**F6 — HIGH today, CRITICAL on opening. The send endpoint is missing from `AUTH_ATTEMPT_PATHS`.**
`httpHardening.ts:100–104`: the set contains `dev-sign-in`, `magic-link/consume`, `passkeys/login/verify` — not `/api/auth/magic-link/intents` (or whatever the send path becomes). Consequences at :254 (`authKey` returns null) and :251–272 (`recordAuth` no-ops): **no lockout, no failure recording, nothing but the 2000/min per-IP limit** on the endpoint that triggers outbound email.

Attack when the 503 is removed:
```
while true; do curl -s -X POST https://app.example/api/auth/magic-link/intents \
  -H 'content-type: application/json' \
  -d '{"email":"victim@example.org"}'; done
```
at 2000/min sustained = ~2.9M mails/day from one IP; linear in IPs. Impacts: mail-bombing arbitrary addresses; email-provider reputation damage → **service-wide sign-in outage** (the provider blocks you, and magic-link is then the only front door); possible account enumeration if the response or timing differs for known vs unknown addresses (**undetermined** — handler elided); cost abuse. Note also F1 arms simultaneously: the *consume* lockout that does exist is keyed per-IP, and under the shared v4-mapped bucket one attacker's 50 bad tokens lock consumption for the entire address class.

**F7 — CRITICAL if the dev gate fails open (condition undetermined).** The brief states dev-sign-in "returns the token in the response body" and 403s in production. **Where the 403 is enforced is not in the provided source.** If it is `NODE_ENV`-gated and Render ever runs with `NODE_ENV` unset/typo'd, `POST /api/auth/dev-sign-in {"email":"<any user>"}` → bearer token for an arbitrary account, no password, pre-auth. That is total authentication bypass. I could not verify the gate's location or fail direction; this is the single highest-value thing to confirm in the full tree. Its 50-failure/15-min lockout (it *is* in `AUTH_ATTEMPT_PATHS`) is irrelevant when one request suffices.

---

## Ranked summary

| # | Rank | Finding | Location | Confidence |
|---|---|---|---|---|
| F6 | HIGH → CRITICAL on open | magic-link send absent from `AUTH_ATTEMPT_PATHS`; send-storm/mail-bomb, no lockout | httpHardening.ts:100–104, :254 | High |
| F1 | HIGH | IPv4-mapped IPv6 → single shared `0:0:0:0::/64` bucket; cross-user 429 DoS + shared lockout key reintroduces the global kill switch | httpHardening.ts:87, :93, :271 | Code: certain; trigger: medium |
| F7 | CRITICAL *if* gate fails open | dev-sign-in token-in-body behind an unverifiable 403 gate | route handler (elided) | Undetermined |
| F3 | MEDIUM | NaN/non-integer hops passes boot guard → TypeError on all XFF traffic | httpHardening.ts:134, :201–202 | High on code, conditional on parser |
| F2 | MEDIUM | Session limiter bypassable by rotating junk Bearer tokens; control never binds attackers | httpHardening.ts:214–223 | High |
| F4 | LOW | Whole-root unauth disclosure of `.txt/.json/.svg` + existence oracle | staticSite.ts:91–107, :165 | High |
| F5 | LOW | `startupFailureCode` prototype-key lookup; 413/429 receipts leak config; 404/405/403/503 router mapping | server.ts (`startupFailureCode`), httpHardening `receipt` | High |

## Could not determine from this brief

1. Whether Render **appends** the client IP to `x-forwarded-for` or passes/replaces the header — decides both F1's trigger and whether hops=1 is spoofable at all.
2. Whether the edge emits IPv4 peers in **mapped form** (`::ffff:a.b.c.d`) — F1's trigger.
3. Config parsing of `SWANGUARD_TRUSTED_PROXY_HOPS` — whether NaN or non-integers can reach `trustedProxyHops` (F3).
4. The **location and fail direction** of the dev-sign-in 403 gate and the magic-link 503 gate (F7), and whether the magic-link dev mode returns tokens inline.
5. The full API router: any other unauthenticated endpoints, JSONP-shaped reflectors, or open redirects (§4).
6. Magic-link token entropy and the send endpoint's response/timing behaviour for unknown emails (enumeration).
7. Whether any production traffic path reaches the node without `x-forwarded-for` (would land callers in the shared `UNTRUSTED_ORIGIN` bucket, and disables their lockout via :269).
