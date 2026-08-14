---
decision: Paste-able handoff prompt for the next agent on the Marketing Command Center / speed-to-lead lane.
status: open
supersedes: none
---

# Handoff prompt — Marketing Command Center / speed-to-lead

> Paste everything below the line into a fresh agent session.

---

You are picking up the SwanStudios **Marketing Command Center / speed-to-lead** lane.

**Read first:** `docs/ai-workflow/AI-HANDOFF/MARKETING-COMMAND-CENTER-HANDOFF-2026-08-14.md`
on branch `claude/marketing-readiness-s2l-clean-2026-08-14`. It carries the full arc,
the corrections, and the panel results. This prompt is the orientation layer, not a
replacement for it.

## The one-sentence situation

The acquisition machine is **built and switched OFF**; every piece of code below is
upstream of a Render flag only Sean can flip, so nothing in this lane is delivering
value yet — the bottleneck has never been missing tooling.

## Where the work lives

- **Branch:** `claude/marketing-readiness-s2l-clean-2026-08-14` — 11 commits, **pushed**,
  tree clean. Based on `origin/main`, but **main moves fast (it was already 4 commits
  ahead within the hour)** — rebase before you build, and audit against `origin/main`.
- **Worktree:** `c:/tmp/swan-mkt-s2l`
- **Do NOT audit against the main tree** at `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`
  — it sits on a wip branch **~1900 commits behind main** and will lie to you about
  what exists.

## State

| Thing | State |
|---|---|
| Speed-to-lead service | Code **live on main** (`backend/services/speedToLeadService.mjs`), **DARK** pending Sean's flag |
| Readiness cockpit card | Built, reports presence booleans only, dark-by-default reports `ready` not an alarm |
| Fuzzy-variable validator | Hardened, dry (CLEAN×2 over 10 rounds), externally reviewed. **NOT wired to anything** |
| PII in branch history | **Resolved.** Old branch deleted; nothing was ever pushed from it |
| DMARC | **DONE** — Sean set it up. It never gated the flag anyway |

## ⚠ MONEY TRAPS — read before running any consult script

Real money has already been lost to the first one.

1. **`run-top-ai-panel.ps1` bills Kimi during what it PRINTS as a preflight.** It passes
   `--confirm-spend`/`--cap-usd` to three CLIs. `consult-opus5` and `consult-hy3-design`
   honor both and no-op. The gateway-based `consult-kimi.mjs` on current main **ignores
   both and calls the API anyway.** That is the documented `status=preflight-only`
   followed by `model_calls=1`. It also hardcodes an unlowerable `MaxTokens = 60000`,
   which at `effort=high` is the documented way to get an empty final message.
2. **`consult-sol.mjs` has NO spend gate at all** — no cap, no confirm flag, hardcoded
   `max_tokens: 60_000`. It spends the moment it runs. (Observed: $0.7447 in one call.)
3. **Two different `consult-kimi.mjs` exist.** The 26-line gateway wrapper on main has no
   dry-run and no `--cap-usd`; the 233-line standalone in the older main tree has both.
   **Read the copy you are actually going to invoke**, from the tree you will invoke it in.
4. **Never use `run-newsroom-top-ai-panel.ps1`** — its remits are hardcoded for a
   different project.

**A true preflight is registry math**: `estimateCost` + `enforceCeiling` from
`scripts/context-gateway/src/providers.mjs`, importing nothing from `transport.mjs`, so
spending is physically impossible rather than merely unintended.

**Calibration from the one panel that ran** (24 claims probed, 20 reproduced, $1.0222):
Sol $0.7447 — deepest by far, attacks *invariants* not inputs. HY3 $0.0094 — best
value-per-dollar by two orders of magnitude; buy it for the rendering lens. Kimi $0.2681
— truncated, least useful here. **Buy the lens you don't have, not another pass with
your own.**

## Environment gotchas that each cost a cycle

- In Git Bash, **`/tmp` is `%TEMP%`, not `c:/tmp`** — and with `MSYS_NO_PATHCONV=1` a
  `/tmp/...` argument handed to git (a Windows binary) will not resolve at all.
- **Worktrees have no `node_modules`** and no `.env`. Junction node_modules from the main
  tree via a `.bat` (`mklink /J`); run consult scripts **from the main tree** (that is
  where `.env` lives) with absolute `--document` / `--out` paths.
- A borrowed `node_modules` **invalidates baseline claims** — it lacked `three` and
  `@zxing/browser`, producing phantom tsc errors. Report scope, never "tsc clean".
- **Never type literal invisible/control characters into source.** Build those character
  classes with `new RegExp` from escaped strings. This mistake was made three times in
  one session; once it made git classify the file as binary.
- **`node --check` is not a behavior check.** It passed on a regex that had been silently
  reduced to `/d{3}[...]d{4}/` and matched nothing. Test guards against real inputs.
- `--reporter basic` is not valid in vitest 4.

## Two things Sean owes (do not build around them — remind him)

1. **`SPEED_TO_LEAD_REPLY_ENABLED=true`** on the `ss-pt-new` Render service →
   Environment. Not the database. Rollback = same switch to `false`. **This is the
   highest-value action in the entire lane** and it takes 30 seconds.
2. **Rotate the Render API key exposed 2026-08-12.** Standing item, remind until confirmed.

## NEXT SLICE — wire fuzzy variables into the send path

Everything needed is verified present:

- `backend/services/emailTemplateService.mjs` → `renderInstantReplyEmail`
- `backend/services/speedToLeadService.mjs:41` → currently
  `renderInstantReplyEmail({ clientName: name })`
- `backend/services/marketing/fuzzyVariableService.mjs` → `resolveFuzzyVariables`
- Flag: `speedToLeadService.mjs:24` → `SPEED_TO_LEAD_REPLY_ENABLED === 'true'`

**Contract:** `renderInstantReplyEmail` gains an OPTIONAL clause slot.
`speedToLeadService` calls `resolveFuzzyVariables({ noteText, source })` and passes the
result through; **on `null` it must fall back to the existing static human-written copy**,
which is already a good email. The fuzzy path stays behind
`MARKETING_FUZZY_VARS_ENABLED` (exact-match `'true'`, currently unset = off), so wiring
it changes nothing in production until that flag is deliberately set.

**Non-negotiables carried by the validator — do not weaken them:**
- The generator NEVER receives identity. A test asserts its argument keys are exactly
  `{noteText, source}`. Identity is re-attached by the template, locally, after generation.
- Every failure path returns null. Nothing may throw into a send.
- The generator has a 2s timeout. A pending generator used to hang the send forever.
- Guards live in `backend/services/marketing/fuzzyClauseGuards.mjs`; **each constant
  carries the input that defeated its previous form.** Do not "simplify" one back open.

## Then, in value order

3. **Signals engine** — extend readiness from "is it configured?" to "is it drifting?"
   (lead-flow collapse, CPL spike, conversion shift). Read-only, zero send risk.
4. **Error observability** — marketing workers log to `logger` and nothing surfaces. Sean
   already owns the channel (Hermes/Telegram); the workers just don't write to it.
5. **In-app agent console** — Sean's explicit constraints: **registered skills only** (no
   free-form execution from a browser admin panel), serving **Codex as well as Claude**,
   with the two able to **review each other**.
6. The four money-leak / guardrail defects listed in the handoff's Linear queue.

**Explicitly NOT to build: cold-outreach lead scraping.** Wrong motion for a trainer-led
B2B2C product regardless of what any course teaches.

## Linear

`node scripts/check-mcp-health.mjs linear` (run it **from the worktree** — the script does
not exist in the stale main tree) reports **CONFIGURED BUT TOKEN REJECTED (401)**.
`linear-server` IS declared in `~/.claude.json` at USER scope; the expired credential makes
it register **zero tools**, which from the agent side is indistinguishable from absent.
**Do NOT conclude "Linear is not configured"** — that has been wrong every time. Five
queued board items are recorded in the handoff §6 so the backlog survives the outage.

## Discipline expected on this lane

- **Proof-before-done (Rule 73):** no "done/fixed/working" without current-session
  executed evidence in the same message, plus a clean hostile pass.
- **Dry loop:** hostile rounds until one finds nothing fixable, then ONE more confirming
  round. Each round needs a **new vantage** — different cwd, real caller path, concurrency,
  external lens. Re-reading code is not a round. End with `DRY-LOOP: CLEAN×2 (rounds: N)`.
- **Panel findings are hypotheses (Rule 30).** 4 of 24 were wrong last time, including one
  confident claim that NFKC folds ß→ss (it does not). Probe every one before acting.
- **Test-delta honesty:** never rewrite a pre-existing assertion to fit new code. If
  behavior intentionally changed, label it RE-ANCHOR and say why.

## The thing most worth internalizing

I ran **four** hostile rounds to dry and still shipped 14 bypasses. Not for lack of
effort — I kept attacking **inputs** while the external reviewer attacked **claims**
("never blocks a send", "rejects never repairs", "only returns a substring" — all three
were false). A hostile loop run by the author converges on the author's blind spots.
When you have run dry, that is the moment to buy a different lens, not another round.
