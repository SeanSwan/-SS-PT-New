# Hermes memo — external review corrected the headline: 190/211, not 208/211

**Surface:** vs-claude (Opus 5) · **Session:** main-s2e2f8326 · **UTC:** 2026-08-15T05:30Z
**Branch:** `claude/qa-harness-slice0-20260811` — **local-commit, NOT pushed.**
**Commit:** `cc0e17ede` · **Packet:** `20260815-a-denylist-is-an-inverted-allowlist.md`

---

## What happened

Sean asked for a whole-lane hostile review by Kimi K3, then fixes, then a dry loop, then a push to
Render. First three done. **The push is held** — see below.

**Kimi K3** ($0.2068, 9.7k in / 11.9k out, clean finish) reviewed the whole lane with an explicit
remit not to repeat what two Claude sessions had already found. It didn't. Seven findings, three
rated S1, **all three verified real before I acted on any of them** (Rule 30):

1. **A role gate is not an ownership gate.** `clientOnly` on `GET /:clientId/pain-log` stops
   trainers and admins — not the other clients, which is the whole attack. Same for
   `authorize(['client'])`, `requireSubscription`, `requireTier`, `requireFeature`. All were in the
   clearing set. The file had already learned half this lesson — it anchored `hasAccess` because "a
   feature flag is not an authorization gate" — and listed `requireFeature` as a gate eleven lines
   later.
2. **My sink denylist was an inverted allowlist.** It excluded `console.log`/`res.json` and cleared
   on every other callee, so `auditLog('read', req.user.id, req.params.userId)` cleared a handler
   with zero authorization — and this codebase writes actor-attributed audit logging diligently, so
   the more carefully someone instrumented an unguarded handler, the more likely it passed.
3. **A comparison was never required to involve the param.** `req.user.role === 'client'` cleared
   `/users/:id`.

Three more surfaced by running rather than reasoning: two regressions my own fixes introduced, and
one **pre-existing** `expandSpreads` bug — it captured to the first `]`, nested inside
`authorize(['trainer','admin'])`, truncating the array right before the only member that binds the
param. Eight of the most sensitive handlers were defended three ways and it read a fragment. It had
been masked all along by the blind `authorize\s*\(` that cleared them anyway.

**Cleared count 208 → 190, backlog 3 → 21.** That is the correction, not a regression.

## Mistakes I made

- **I published a security number I manufactured.** "7 flagged → 0" was the output of code I wrote
  minutes earlier and I reported it as a fact about the codebase.
- **I cited a control that could not fail** as the reason that number was trustworthy. Both probes
  used the isolated case, which already passed.
- **I nearly widened a check to silence true positives.** When the role-gate fix flagged eight
  `clientProgressRoutes` handlers my first read was "I over-tightened". The tightening was right; a
  different function was truncating the evidence. Tuning instead of tracing would have reinstated
  two defects and called it a fix.
- **Three escaping failures in a row, retried before diagnosing.** `\\b` in a heredoc'd Python
  string became a literal backspace (0x08) because `\b` is a valid escape; `\/` survived because it
  is invalid. Two extra retries before I compared `repr()`.
- **REPEAT — I reported a mutation run that never applied.** The anchor failed, the script exited
  before writing, and the "16 passed" that followed was an unmutated run. The peer wrote up exactly
  this — *a mutation you did not verify was applied is not a mutation* — hours earlier the same day.
  Caught and redone with a grep confirmation, but I had read their write-up and repeated it anyway.

## External-model calibration

| Model | Yield | Cost |
|---|---|---|
| **kimi-k3** (high) | 7 findings, 3 S1, all 3 real. Uniquely found the *conceptual* defects — the two authorization axes conflated, the predicate inverted — that 12 rounds of Claude self- and peer-review never reached. | **$0.2068 — worth it** |
| **hy3** (high) | Nothing, again. All tokens to internal reasoning, no visible text. Second failure this lane on a long document. | ~$0.03 — route low or skip |
| **Peer Claude** (free Rule 67 lane) | 5 defects over 8 rounds incl. the only one that made the tool *silent*; self-corrected an attribution against its own interest. | **$0 — highest yield per dollar** |

**Routing rule:** peers find implementation defects (wrong offsets, missed files). The paid tier
finds category defects (the axis you conflated). Self-review reaches neither, because checking your
own work presupposes knowing what to check.

## Push status — HELD, and why

Sean asked for the push. I did the safety work and stopped short of the button:

- **The peer is still actively committing to this exact branch** — its tip moved three times during
  the turn. Four of the seven runtime files in this deploy are its in-flight work. Asked it directly
  for ship-readiness in `review-queue.md`.
- **63 behind `origin/main`**, so the tree that would deploy is not the tree that was audited.
- **Good news, verified not assumed:** the 54-commit range contains **no migrations, no seeders, no
  `.sql`, no `render.yaml`, no `package.json`, no CI workflows** — so the `migrate:production` hook
  fires on nothing new. Of 52 files / 8310 insertions: 30 docs, 13 tests, 7 runtime, 1 CLAUDE.md.
  The runtime four are all peer security hardening (bypass writer removed from the dev console,
  emergency dashboard admin-gated, prekey rate limiting).

Recommended order: peer confirms → merge `origin/main` → re-run both suites → push with an explicit
refspec (a bare `git push` from that worktree targets `main`, its upstream is misconfigured).

## Owner-gated

1. **Push go/no-go** (above).
2. **`GET /keys/:userId`** — Kimi escalated the peer's note: unauthenticated it is an anonymous
   user-enumeration oracle; unthrottled it drains a target's one-time prekeys, degrading their E2EE
   to unsigned-prekey fallback. Confirm it sits behind auth + a per-fetcher limit.
3. **Resource-shaped IDOR is outside the instrument.** `/photos/:id`, `/orders/:id` — **251 handlers**
   against the 211 audited. The canonical attack shape in this product, uncounted. Separate slice.
4. **`CLAUDE.md` stops at Rule 73; `AGENTS.md` has 74-79.** Six standing rules invisible to every
   Claude session, and the drift-check's suggested remedy deletes them. Unchanged from earlier today.
5. Carried: rotate the Render API key; add the DMARC record.
