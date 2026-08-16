# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-BRIEF-ROUND3-2026-08-15.md
**Tokens:** 10042 in / 32000 out (reasoning: 30457) | total 42042
**Wall:** 463.8s

---

# SwanGuard round-3 hostile review — findings

Line numbers are counted from the listings provided (±3). All hand-executions below were done on paper against the exact source text.

## Ranked table

| # | Rank | Location | Defect | Direction | Confidence |
|---|---|---|---|---|---|
| F1 | HIGH | `httpHardening.ts:73–91` (`normaliseIdentity`) | IPv4-carrying IPv6 (`::ffff:a.b.c.d`, NAT64 `64:ff9b::a.b.c.d`) collapses **every IPv4 client onto one key**; `::1` and malformed `::::` land in the same bucket → mass 429s + shared auth lockout | collision (many clients → 1 key) | mechanics: high; trigger: medium (proxy-dependent) |
| F2 | HIGH | `httpHardening.ts:77–90` (`normaliseIdentity`) | Unbracketed `ip:port` entries keep the **port in the key** → one client mints a fresh bucket per connection; defeats per-IP limit, per-session limit, **and the auth lockout** | minting (1 client → many keys) | mechanics: high; trigger: medium (proxy-dependent) |
| F3 | MEDIUM | `httpHardening.ts:126` + `:176` + doc at `:32–41` | Production direct-to-node topology is **bricked at boot**; the documented `hops=0` "socket-level identity" fallback **does not exist anywhere** | outage (refuses to boot) | behavior: high |
| F4 | MEDIUM | `httpHardening.ts:126`, `:191–192` | `NaN` and fractional hop values pass the `< 1` boot guard → `chain[0.5]`/`chain[NaN]` → `undefined.toLowerCase()` → TypeError **outside** `app.ts`'s try/catch | outage (per-request crash / crash loop) | code path: certain; reachability: unknown (env parsing elided) |
| F5 | MEDIUM | `staticSite.ts:~186–199` + `extensionOf :~347–356` | Any client-side route whose last segment contains a dot (`/u/j.doe`, `/invite/<jwt>`) returns **404 instead of the shell** | outage (legit users get 404s) | behavior: high; route inventory: unknown |
| F6 | LOW | `httpHardening.ts:97–101` | `AUTH_ATTEMPT_PATHS` is an exact-string duplicate of the router's table; drift when magic-link arms silently detaches lockout + recording | bypass (silent) | low–medium (router elided) |
| F7 | LOW | `staticSite.ts:~389–396` | `notFound()`/`notAllowed()` carry no `cache-control` → intermediaries may heuristically pin a 404 across a deploy | outage (stale 404) | low |

---

## Required hand-execution: `normaliseIdentity` (httpHardening.ts:73–91)

| Input | Execution | Returned key |
|---|---|---|
| `1.2.3.4` | bracket regex: no match; `value.includes(':')` false → returned as-is | `1.2.3.4` ✓ |
| `1.2.3.4:5678` | has `:` → IPv6 path. `split('::')` → `["1.2.3.4:5678"]`, `tail === undefined` → no-compression branch. `headParts = ["1.2.3.4","5678"]`, `slice(0,4)` keeps **both** | `1.2.3.4:5678::/64` ✗ **port retained** |
| `2001:db8::1` | head `["2001","db8"]`, tail `["1"]`, filler `8−2−1=5` zeros → `[2001,db8,0,0,0,0,0,1]`, `slice(0,4)` | `2001:db8:0:0::/64` ✓ |
| `::1` | head `[]`, tail `["1"]`, filler `8−0−1=7` → `[0×7,1]`, `slice(0,4)` | `0:0:0:0::/64` ✓ |
| `::ffff:1.2.3.4` | head `[]`, tail `["ffff","1.2.3.4"]` (len 2), filler `8−0−2=6` → `[0,0,0,0,0,0,ffff,1.2.3.4]`, `slice(0,4)` drops groups 5–8 **including the entire IPv4 payload** | `0:0:0:0::/64` ✗ **collides with `::1` and every other `::ffff:x`** |
| `[2001:db8::1]:443` | bracket regex matches → `2001:db8::1` → as above | `2001:db8:0:0::/64` ✓ (the one port case done right) |
| `fe80::1%eth0` | head `["fe80"]`, tail `["1%eth0"]`, filler 6 → `[fe80,0×6,1%eth0]`, `slice(0,4)` | `fe80:0:0:0::/64` — zone **silently discarded** (it sat in group 8); all zones share one key |
| malformed `::::` | `split('::')` → `["","",""]`; destructure takes `head=""`,`tail=""`, **discards the third part**; headParts/tailParts `[]`, filler 8 | `0:0:0:0::/64` — **garbage lands in the same key as `::1` and all `::ffff:*`** |
| malformed `abc` | no colon → as-is | `abc` (stable, as designed) |

**Direction verdict (as demanded):** the function commits **both** defects, on different input classes. The `::ffff:`/NAT64 handling is the **collision** direction — two *different* clients (`::ffff:203.0.113.7` and `::ffff:198.51.100.9`, plus `::1`) derive the *same* key, which is an availability defect. The bare-`ip:port` handling is the **minting** direction — one client derives *many* keys, which is a protection-bypass defect.

### `clientKey` walk (production, `hops = 1`)

| `x-forwarded-for` | chain | `len − hops` | trusted entry | final key |
|---|---|---|---|---|
| `203.0.113.7` (proxy-appended) |
