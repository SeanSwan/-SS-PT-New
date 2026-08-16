# SESSION HANDOFF — SwanGuard round-3 review COMPLETE (2026-08-15)

**Author:** vs-claude (`claude-opus-5`), Fable-tier.
**Extends** `SESSION-HANDOFF-SWANGUARD-ROUND2-2026-08-15.md`, which remains
accurate for §1–§4 and §7–§9. This file replaces its **§5 (the review task —
now DONE)** and re-states what is left.

**SwanGuard HEAD is now `b953aea`**, pushed, `0 0` with origin, verified by
reading files back out of `origin/security/p0-remediation-20260813`.
**906 pass / 0 fail** (`npm test` exit 0), `type-check` exit 0 across 5
workspaces, `build` exit 0.

---

## 1. What the round did

Kimi K3 and GLM-5.3 each ran **two** remits — a hostile correctness/reliability
review and a separate hostile security review — against a 40 KB self-contained
brief (`HOSTILE-REVIEW-BRIEF-ROUND3-2026-08-15.md`) holding the complete source
of every file the four commits touched. Four consults, ~$0.95 total (Kimi
$0.3636 + $0.5848; GLM is subscription-billed).

**Every model claim was verified locally before it was acted on.** Two were
wrong, in both directions — see §3.

**Dry loop: 5 rounds.** R1 found 8 fixable, R2 found 1 (in R1's own fix), R3
found 1 (also mine), R4 found 0 fixable, R5 confirming found 0. Two consecutive
clean rounds = dry.

Tests **888 → 906**: added 18, **re-anchored 1**, removed 0.

---

## 2. Findings — CONFIRMED and fixed

Ranked by what they would actually have done in production.

| # | Sev | Finding | Who found it |
|---|---|---|---|
| 1 | HIGH | `normaliseIdentity` collapsed **every IPv4-mapped client** (`::ffff:a.b.c.d`) onto `0:0:0:0::/64` — one shared rate bucket AND a fully-armed shared auth lockout. The global sign-in kill switch `9b20fb4` removed, reintroduced one function down. Arms when magic-link lands. | me + Kimi + GLM (3×) |
| 2 | HIGH | **`parseNodeEnv` was fail-open.** Any value but exactly `production`/`test` → `development`, which serves `dev-sign-in` (mints a session for any emailHash, **no credential**), re-enables signature-less passkey login, skips the proxy guard, and falls back to an in-memory DB — while booting and answering `/api/health` 200. | GLM pointed at the gate; I found the real cause in `config.ts` |
| 3 | HIGH | Empty-shell guard silently demoted to **boot-only** when the root moved to per-request resolution. A later release with an empty (or missing) `index.html` served **200-blank / 404** with health green. | Kimi |
| 4 | MED | Bare `1.2.3.4:5678` kept the **source port in the key** — a fresh bucket per connection, limiter never binds. | me + Kimi + GLM (3×) |
| 5 | MED | `recordAuth` counted **any non-2xx** as a failed sign-in: 50 malformed bodies locked a key with zero guessing. | Kimi |
| 6 | MED | `bound()` evicted **live lockouts first** under overflow — handing an attacker the blocks they had just tripped. | Kimi + GLM |
| 7 | LOW | `startupFailureCode` resolved `toString`/`constructor` through `Object.prototype` to a **Function**, interpolated into the operator log. | me + GLM (**Kimi called these lines "sound"**) |
| 8 | LOW | Negative static responses had no `cache-control`; the `hops=0` comment claimed a socket-level fallback **that does not exist**. | GLM |

Found by **attacking my own fixes**, not by any model:

- **R2:** `ffff:1.2.3.4` put the `ffff` marker at index 0, so the
  "everything before it is zero" test passed *vacuously* and a malformed value
  keyed into a **real client's bucket**. The marker now has to sit where the
  mapped prefix actually puts it (`marker >= 5`).
- **R3:** I fixed the *empty* shell but left the *missing* shell a 404 — same
  broken-deploy condition, inconsistent signal. Both are 503 now; a genuine
  asset miss is still 404.

---

## 3. Findings DISPROVEN — do not re-action these

- **`NaN` / fractional / `Infinity` hop counts** (Kimi HIGH-2, GLM F3/F4, rated
  HIGH by both, with a proposed fix). **`config.ts:96` already rejects them** —
  `Number.isInteger(hops) && 0 <= hops <= 10`, throwing a `ConfigError` at load,
  long before the guard. Both models flagged their own uncertainty ("I cannot
  see how it is parsed"); both were honest and both were wrong. Their fix would
  have been dead code.
- **SPA routes with a dot 404 instead of serving the shell** (GLM F5). The web
  app has **no client-side router at all** — no `react-router`, no routes.
  Latent at most. Its fix would have **regressed a deliberate documented
  control** (`staticSite.ts`: an asset miss must stay a miss, or a MIME error
  reads like a broken build). This is the same trap as round 2's `unknown`-filter
  "fix" that was itself a bypass.
- **HEAD returns a body on 404/503.** Node's http layer suppresses the body for
  HEAD; `writeFetchResponse` never had to.
- **Kimi's "`startupFailureCode` is sound"** — disproven by live probe; see #7.

---

## 4. CONFIRMED but deliberately NOT fixed — Sean's call

**A HARD link inside the served root to a file outside it defeats the realpath
containment.** Verified live: `200` with the out-of-root file's bytes.
`realpathSync` resolves symlinks; it cannot see through inode aliasing, so the
hard link's real path genuinely *is* inside the root.

I did not fix it, and the reason matters: the `nlink > 1` rejection that closes
it can false-positive on content-addressed / hard-linking build tooling, and its
failure mode is **every asset 404ing** — worse and likelier than the threat,
which needs an attacker who can already write into the build output (and who
could then just plant a `.js`, which `script-src 'self'` happily loads).
**Decide before adopting: check `nlink` on a real Render build output first.**

The ten §4 items in the round-2 handoff are unchanged and still Sean's.

---

## 5. What is left

### TASK C — Render deploy (BLOCKED ON SEAN, then verify)

Unchanged from the round-2 handoff §4, plus one thing this round makes urgent:

- **`NODE_ENV` is now fail-closed, so a typo in the Blueprint refuses to boot
  with a clear message instead of silently serving a credential-free sign-in.**
  That is the intended behaviour. If the deploy refuses with
  `STARTUP_E_CONFIG`, read the message before changing anything.
- Still the highest-risk unverified assumption: **confirm Render actually sends
  `x-forwarded-for`**, and confirm **which form** it uses. If it sends the
  IPv4-mapped or `ip:port` rendering, this round is what stops that becoming an
  outage — but the hop behaviour itself is still unverified against the real
  proxy.

### TASK B — production magic-link sign-in (NOT STARTED)

Unchanged, and both models independently rated the same landmine
**HIGH today → CRITICAL on open**: `/api/auth/magic-link-intents` is **absent
from `AUTH_ATTEMPT_PATHS`**, so the endpoint that sends mail has no lockout —
2000/min of mail to an arbitrary address, per IP.

I deliberately did **not** add it to that Set. A lockout keys on 401/403, which
a *send* endpoint does not emit, so adding it today would install a control that
looks real and does nothing. The send path needs **per-recipient** rate limiting,
which is a TASK B design decision.

The architectural blocker stands: the route takes `{ emailHash }` and **you
cannot email a hash.**

---

## 6. Standing rules that earned their keep this round

- **Validate the instrument.** My first full-suite run showed *116 failures* —
  I had run `npx vitest` from the repo root instead of `npm test`, so the web
  workspace ran without its jsdom config. Nothing was broken.
- **An ambiguous probe that agrees with you is not evidence.** Two of my own new
  tests passed *for the wrong reason* on first writing — one because a 4th
  recorded failure hits the documented clear-after-lock quirk and releases the
  lock, one because it asserted a lockout could survive an overflow in which
  *every* entry was locked (nothing can, without dropping the memory bound).
  Both are now commented with why.
- **Verify a push by reading the file back out of the remote ref.**
