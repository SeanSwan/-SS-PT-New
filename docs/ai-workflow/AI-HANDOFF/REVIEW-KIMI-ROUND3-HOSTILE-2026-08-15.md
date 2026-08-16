# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-BRIEF-ROUND3-2026-08-15.md
**Seed:** (none)
**Tokens:** 10171 in / 22206 out | **Cost:** ~$0.3636 | **Wall:** 112.5s | **finish_reason:** stop

---

# Hostile review — round 3

## Mandated hand-execution of `normaliseIdentity` (httpHardening.ts:73–92)

| Input | Path through code | Exact returned key | Verdict |
|---|---|---|---|
| `1.2.3.4` | no `:` → returned as-is (line 78) | `1.2.3.4` | OK |
| `1.2.3.4:5678` | has `:` → treated as IPv6; no `::` → line 85 branch; `headParts=['1.2.3.4','5678']`, `slice(0,4)` keeps both | `1.2.3.4:5678::/64` | **DEFECT — one client mints MANY keys** (one per source port). Also `1.2.3.4` and `1.2.3.4:5678` are different keys for the same client |
| `2001:db8::1` | head `['2001','db8']`, tail `['1']`, filler 5 → `[2001,db8,0,0,0,0,0,1]`, slice 4 | `2001:db8:0:0::/64` | OK, correct /64 |
| `::1` | head `[]`, tail `['1']`, filler 7 → slice 4 = four zeros | `0:0:0:0::/64` | Correct /64 — but see next row |
| `::ffff:1.2.3.4` | head `[]`, tail `['ffff','1.2.3.4']`, filler 6 → `[0,0,0,0,0,0,ffff,1.2.3.4]`, slice 4 | `0:0:0:0::/64` | **DEFECT — MANY different clients collide onto ONE key.** Every IPv4-mapped address, `::1`, and `::` share a single bucket |
| `[2001:db8::1]:443` | bracket regex strips port → same as `2001:db8::1` | `2001:db8:0:0::/64` | OK (intended collision with row 3) |
| `fe80::1%eth0` | tail `['1%eth0']`, filler 6 → slice 4 | `fe80:0:0:0::/64` | Acceptable (fe80::/64 genuinely is one /64; zone ID dropped but irrelevant) |
| malformed `garbage` | no `:` → as-is | `garbage` | Stable, fine |
| malformed `1:2:3:4:5:6:7:8:9` | no `::` → slice(0,4) | `1:2:3:4::/64` | Stable, fine |

Both defect directions are present: row 2 is many-keys-per-client, row 5 is many-clients-per-key.

## Mandated header walk, `clientKey` at `SWANGUARD_TRUSTED_PROXY_HOPS=1` (httpHardening.ts:164–204)

| `x-forwarded-for` value | Arithmetic (`index = Math.max(0, len − hops)`) | Resulting key |
|---|---|---|
| `203.0.113.10` | len 1, index = max(0, 0) = 0 | `203.0.113.10` ✓ |
| `9.9.9.9, 203.0.113.10` (caller spoof + proxy append) | len 2, index = 1 | `203.0.113.10` ✓ spoof neutralised |
| `::ffff:203.0.113.10` | len 1, index 0 → normalise | `0:0:0:0::/64` ✗ (Finding 1) |
| `203.0.113.10:50001` | len 1, index 0 → normalise | `203.0.113.10:50001::/64` ✗ (Finding 4) |
| `unknown` | len 1, index 0 → rejected in place | `untrusted-origin` ✓ (correctly NOT filtered pre-index) |
| absent / empty / `, ,` | — | `untrusted-origin` ✓ |
| hops=**1.5**, `9.9.9.9, 203.0.113.10` | index = max(0, 0.5) = **0.5** → `chain[0.5]` = `undefined` | **`undefined.toLowerCase()` throws TypeError** (Finding 2) |
| hops=**NaN**, any non-empty chain | index = max(0, NaN) = **NaN** → `chain[NaN]` = `undefined` | **TypeError on every request** (Finding 2) |

## Ranked findings

| # | Rank | Finding | Location | Confidence |
|---|---|---|---|---|
| 1 | HIGH | All IPv4-mapped IPv6 (`::ffff:a.b.c.d`) collapse to one key `0:0:0:0::/64` — shared rate bucket **and shared auth lockout**; reintroduces the global sign-in kill switch | httpHardening.ts:80–91 | High (code), Medium (proxy emits mapped form) |
| 2 | HIGH | Boot guard accepts NaN / fractional / Infinity hops; `clientKey` then throws TypeError in `guard`, **outside** the try/catch in app.ts | httpHardening.ts:129, 193–201 | High on code path, Medium on config parse |
| 3 | HIGH | Empty/missing `index.html` check is boot-only; per-request root resolution means a *later* broken release serves blank 200s with green health | staticSite.ts:148, 202–221 | High |
| 4 | MEDIUM | Unbracketed `IPv4:port` in XFF → per-port keys → limiter + lockout bypass and map churn | httpHardening.ts:78, 85 | Medium |
| 5 | MEDIUM | `bound()` evicts **live** lockouts/windows under key-minting pressure (IPv6 /48 walk = 65k keys > 10k cap); /64 keying does not bound a /48 | httpHardening.ts:222–235 | Medium-High |
| 6 | LOW | `recordAuth` counts any non-2xx (400/404/503) as an auth failure; on a shared key, 50 garbage POSTs lock sign-in | httpHardening.ts:~328 | High |
| 7 | LOW | Boot `statSync(shellAtBoot)` is outside any try — a vanishing file throws raw ENOENT, misclassified startup code | staticSite.ts:148 | Medium |

Checked and found sound: `startupFailureCode` (name-keyed lookup handles `TrustedProxyConfigurationError extends ConfigError` correctly; fixed codes leak gate identity, not values — acceptable), the in-place `unknown` rejection, and content-type-from-requested-name (only exploitable by a planter who already has write access to the root).

---

## Finding 1 — IPv4-mapped IPv6 collapses the entire IPv4 Internet into one bucket and one lockout

**httpHardening.ts:80–91** (the `split('::')` path), consumed at httpHardening.ts:203 and 262.

Hand-execution (above): `::ffff:1.2.3.4` → tail `['ffff','1.2.3.4']`, filler 6, `slice(0,4)` discards groups 5–8 — which is where the entire IPv4 address lives. Result: `0:0:0:0::/64`, identical to the key for `::ffff:5.6.7.8`, `::1`, and `::`.

**Failure path:** any deployment whose trusted proxy writes IPv4 peers in mapped form (common — Node dual-stack sockets produce `::ffff:a.b.c.d` from `socket.remoteAddress`, and proxies built on them forward that form verbatim in XFF) puts **every IPv4 user** into one 2000/min bucket and one `maxFailures: 50` auth lockout. One attacker (or 50 expired-magic-link clicks across the user base — see Finding 6) trips `0:0:0:0::/64:/api/auth/magic-link/consume` and sign-in is locked for **everyone**, renewable indefinitely. This is precisely the "global sign-in kill switch keyed on a constant" that commit `9b20fb4` claims to have removed — reintroduced one function down, and it arms exactly when magic-link opens. The `assertTrustedProxyConfiguration` boot guard cannot see it because hops is correctly 1.

The doc comment at line 70 ("IPv4 and anything unrecognised is returned as-is") is wrong about its own code: IPv4-*mapped* IPv6 contains `:` and takes the IPv6 path.

**Fix direction and what it would break:** special-case `::ffff:a.b.c.d` (and `::ffff:xxxx:yyyy` hex form) → return the dotted quad. This *merges* keys (mapped and bare forms of the same client unify) — the safe direction. It does not affect genuine IPv6 /64 bucketing.

## Finding 2 — `assertTrustedProxyConfiguration` passes NaN/fractional/Infinity; `clientKey` then throws on every request, outside the try/catch

**httpHardening.ts:129** (`if (config.trustedProxyHops < 1)`), **193–194** (`chain[index]`), **201** (`trusted.toLowerCase()`).

`NaN < 1` is `false`; `1.5 < 1` is `false`; `Infinity < 1` is `false`. All three pass the production boot guard. Then in `clientKey`: `hops <= 0` is false for all three, and the comment at line 191 ("`index` is always within bounds") is only true for integers:

- `hops = NaN`: `Math.max(0, len − NaN)` = `NaN` → `chain[NaN]` = `undefined` → **TypeError at line 201 for every request carrying any XFF header**.
- `hops = 1.5`: any chain of length ≥ 2 (i.e., any client that sent its own XFF, which the proxy appends to) → `chain[0.5]` = `undefined` → TypeError. An attacker can also *force* chain length ≥ 2 by sending any XFF value.
- `hops = Infinity`: `index = 0` → trusts `chain[0]`, the caller-written entry — full spoofing bypass (overlaps the accepted "wrong hop count" item, but unlike a plausible wrong integer, this is parse-level garbage the boot guard exists to reject).

**Outage shape:** `guard` is invoked at app.ts *before* the `try { dispatchRequest(...) }` — the TypeError is not converted to a 500 by `errorResponse`; it rejects `handle()`. With Node's default unhandled-rejection behavior this is a process crash; at best it is a 500/hang for every request. The service boots "healthy" (the guard passed) and then dies under traffic — the exact failure shape the guard was built to prevent.

**Uncertainty:** I cannot see how `SWANGUARD_TRUSTED_PROXY_HOPS` is parsed. `Number("1.5")` = 1.5 and `Number("Infinity")` = Infinity reach the guard unchanged; `parseInt` would not. **Fix:** `if (!Number.isInteger(config.trustedProxyHops) || config.trustedProxyHops < 1) throw …`. This rejects nothing a correct operator sets (`Number("1.0")` = 1, an integer) and is cheap insurance regardless of the parser.

## Finding 3 — The empty-shell guard is boot-only, but the root is now resolved per request: a later broken deploy serves blank 200s

**staticSite.ts:148** (boot check), **202–221** (`serveShell`), **240** (per-request `canonicalise(configuredRoot)`).

Commit `9b20fb4` deliberately changed the root from canonicalised-once to resolved-per-request, so a repointed `current` symlink is followed. Consequence nobody wired up: the non-empty-`index.html` check at line 148 validates **the release that is live at boot**, not the release being served later. Sequence:

1. Boot with good release A → check passes.
2. Deploy release B whose build produced an empty `index.html` (truncated CI artifact — the exact scenario lines 144–147 describe); `current` repoints.
3. `serveShell` (210–218) re-checks that the shell resolves to a regular file — but **never re-checks size**. Empty file → `fileResponse` → **200 with a blank body**, `no-cache`.
4. `/api/health` is 200. Platform marks the deploy live and retires release A. All green, blank app — the failure the boot check was added to prevent, now undetectable by the boot check.

If B's `index.html` is missing entirely, every page 404s while health stays 200 (louder, same outage).

**Fix:** move the `size === 0` check into `serveShell` (treat empty as 404/503). Cost: one `statSync` per shell request — already paying `realpathSync` + `statSync` there, so this adds nothing measurable. Breaks nothing: a legitimately empty shell is never correct.

## Finding 4 — Unbracketed `IPv4:port` is parsed as IPv6, minting one key per source port

**httpHardening.ts:78, 85.**

The author anticipated ports — the bracket regex at line 75 handles `[2001:db8::1]:443` — but missed the unbracketed IPv4 form. `1.2.3.4:5678` contains `:`, so it takes the IPv6 path and yields `1.2.3.4:5678::/64`. A proxy that appends `ip:port` to XFF (non-standard but seen in the wild) gives one client a fresh rate-limit bucket **and a fresh `authKey`** per source port: 50 fresh auth failures per port, and >10k ports overflow `maxTrackedKeys`, triggering Finding 5's eviction. Direction: many-keys-per-client (bypass), opposite of Finding 1.

**Uncertainty:** Render's proxy appears to emit bare IPs, so this is latent rather than live in the documented topology — hence MEDIUM. **Fix:** before the colon test, strip a trailing port from values matching `/^\d{1,3}(\.\d{1,3}){3}:\d+$/`. Do NOT strip `:port` from anything else — bare IPv6 with a port is ambiguous by nature, and over-stripping would corrupt real IPv6 keys.

## Finding 5 — `bound()`'s second pass evicts *live* lockouts and windows; an IPv6 /48 walk exceeds the key budget

**httpHardening.ts:231–234** (the insertion-order eviction loop), interacting with line 91.

When all entries are live, `bound` deletes the oldest insertions unconditionally. For `lockouts` that means **deleting an active lockout releases it**. Concrete path: an attacker with an IPv6 /48 (a standard allocation) controls 65,536 /64s → 65,536 distinct keys from `normaliseIdentity`. That (a) exceeds `maxTrackedKeys: 10_000`, so every map sweep evicts other tenants' live rate windows (their counts reset — mild) and live lockout entries (locks release — security-relevant), and (b) means the /64 fix bounds a single /64 but not the attacker: 65k × 2000 req/min and 65k × 50 auth failures per window. The commit message claims the "IPv6 /64 bypass" is fixed; it is fixed *within* a /64 only.

This is partly inherent to per-identity limiting (a botnet beats any per-IP scheme), so I rank it MEDIUM — but the *eviction of live lockout state* is a self-inflicted defect: the second pass should never delete an entry where `lockedUntil > now`. Skipping locked entries means the map can exceed `maxTrackedKeys` under attack; that is the correct failure direction (memory grows bounded by distinct attackers, rather than security state being silently dropped).

## Finding 6 — `recordAuth` counts every non-2xx as an auth failure

**httpHardening.ts:~328** (`const success = response.status >= 200 && response.status < 300`).

`recordAuth` runs on every dispatched response. A 400 (malformed JSON), 404, or 503 on an auth path counts as a failed sign-in. On a per-IP key this is mostly self-inflicted, but combined with Finding 1 (`0:0:0:0::/64`) or a NAT, 50 garbage POSTs to `/api/auth/magic-link/consume` — no valid tokens needed — lock the shared key for 15 minutes, renewable. When magic-link opens, expired-link clicks (400s) from real users also burn the budget. **Fix:** count only statuses the auth handler can actually emit for a *processed* credential check (e.g., 401/403), or have the handler report the outcome explicitly. Watch out: narrowing this must not exempt genuine credential failures, or the lockout becomes decorative.

## Finding 7 — Boot-time `statSync(shellAtBoot)` can throw raw ENOENT

**staticSite.ts:148.** `resolveWithinRoot` already stat'd the file, but between its return and `statSync(shellAtBoot)` the file can disappear (concurrent deploy). The uncaught ENOENT is not a `ConfigError`, so it surfaces as `STARTUP_E_RUNTIME`/`UNKNOWN` instead of `STARTUP_E_CONFIG` — a crash-loop with a misleading reason code, defeating `ee63b1c`'s purpose. Wrap in try/catch and fold into the existing `ConfigError`. LOW because the race window is milliseconds at boot.
