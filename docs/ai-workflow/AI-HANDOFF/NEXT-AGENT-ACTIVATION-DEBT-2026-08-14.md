---
decision: Next agent takes over the activation-debt lane. FIRST TASK is a hostile review of the prior agent's work using Kimi K3 and HY3 — the prior agent is deliberately excluded from that review.
status: open
supersedes: none
---

# Handoff — Activation Debt lane (SwanStudios)

> Paste everything below the line into a fresh agent session.

---

You are taking over the SwanStudios **activation-debt** lane from an Opus 5 session.

**Your FIRST task is not to build. It is to hostile-review the work already done** — with two
external models — because the prior agent's own loop demonstrably converged on its own blind
spots. See §2. Do that before you touch anything else.

---

## 1. Where everything is

| Thing | Location |
|---|---|
| **Branch** | `claude/activation-debt-audit-20260814` — **15 commits, pushed, tree clean** |
| **Worktree** | `C:/tmp/ss-darkcode-20260814` (detached-then-branched off `origin/main` @ `c4a5a396e`; `node_modules` junctioned from the main tree, so backend vitest runs) |
| **Main artifact** | `docs/ai-workflow/AI-HANDOFF/ACTIVATION-DEBT-AUDIT-2026-08-14.md` (~573 lines) |
| **Durable lesson** | `docs/ai-workflow/hermes-learning-packets/20260814-a-documented-lesson-is-not-a-fix.md` |
| **Hermes memo** | `.ai-workflow/hermes-inbox/pending/20260814T181557Z-marketing-…-blocker.md` (main tree) |
| **Prior lane handoff** | `NEXT-AGENT-PROMPT-MARKETING-S2L-2026-08-14.md` (still accurate on money traps; its *sequencing* was overturned — see §5) |

**DO NOT audit against the main tree** at `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`. It sits
on a wip branch **~1930 commits behind main** and will lie to you about what exists. Run consult
scripts from there (that is where `.env` lives); audit from the worktree.

Diff vs main: 6 files, +1110/-2 — 4 backend (2 source, 2 test), 2 docs.

---

## 2. ⚠ YOUR FIRST TASK — hostile-review the prior work with Kimi K3 AND HY3

Sean's instruction: *"I want the next agent to be a part of the hostile review, not [the prior
agent]."* The prior agent is excluded on purpose. **You** run this.

### Why this is not ceremony

The prior agent ran **16 hostile rounds** on the audit and **3** on the code slice, reaching
CLEAN×2 both times — and an external lens still overturned three of its conclusions, and its own
later rounds caught **two false published claims**. A loop run by the author converges on the
author's blind spots. Assume there are more.

### The commands (both are dry-run by default with a $3 cap — the preflight is real)

Run **from the main tree** (`.env` lives there), with absolute `--document` / `--out` paths:

```bash
# 1. PREFLIGHT FIRST — prints worst-case cost, model_calls=0, spends nothing
node scripts/consult-kimi.mjs \
  --document "C:/tmp/ss-darkcode-20260814/docs/ai-workflow/AI-HANDOFF/ACTIVATION-DEBT-AUDIT-2026-08-14.md" \
  --out "<abs-path>/KIMI-REVIEW.md" --effort medium --cap-usd 2 \
  --remit "<see remit below>"

# 2. Then add --confirm-spend ONLY after Sean approves that run.
```

```bash
node scripts/consult-hy3-design.mjs \
  --document "<same or a code-focused packet>" \
  --out "<abs-path>/HY3-REVIEW.md" --cap-usd 2 \
  --remit "<see remit below>"
# same posture: preflight, then --confirm-spend
```

- `consult-kimi.mjs` in the **main tree** is the SAFE 233-line standalone (dry-run default,
  `--cap-usd` enforced, preflight correctly reports `model_calls=0`). A **dangerous 26-line
  gateway wrapper with the same name** exists elsewhere — **read the copy you will invoke, from
  the tree you will invoke it in.**
- `consult-hy3-design.mjs` → `tencent/hy3`, cap $3, `confirmSpend:false`. Its `--help` text
  mistakenly prints "consult-kimi.mjs" — cosmetic, ignore.
- **Rule 76 specifies `--max-tokens 16000` for Kimi.** The prior agent used the 60k default and
  spent $0.2543 (fine, but 16k is the house guidance).
- Ask Sean before the paid run unless he has already named the model this turn (naming it
  pre-authorises that turn, per Rule 76 step 3).

### Calibration you should know before you buy

From the one panel that ran on this lane: **Sol $0.7447** (deepest, attacks *invariants*),
**HY3 $0.0094** (best value-per-dollar by two orders of magnitude — buy it for the rendering /
implementation lens), **Kimi $0.2681**. And from **this** session: **Kimi K3 on a *plan* was the
single highest-value input**, inverting three conclusions for $0.25.

> **The correction that matters:** the prior lane handoff recorded *"Kimi — truncated, least
> useful here"* after a **code-validator** review. That rating was **task-class-specific**, and
> reading it as general would have caused this session to skip its best input. **Record task class
> alongside every calibration figure.**

### Suggested split of remits (buy the lens you do not have)

- **Kimi K3 → the PLAN.** Sequencing, the systemic fix, whether §0's blocked-on-Sean framing is
  right, what is missing entirely. Explicitly tell it *not* to re-derive code facts.
- **HY3 → the CODE.** `adminAlertService.mjs` + `speedToLeadService.mjs` + both test files.
  Redaction correctness, the dedupe contract, the fire-and-forget guard, anything that can throw
  into a send path.

### Attack these specifically — they are the known-weak seams

1. **§0's central claim** (CLAUDE.md vs AGENTS.md). Verified by match counts AND the mirror
   tool's own `--check`, on `origin/main`. Try to break it. If it holds, it is the top priority.
2. **The `.catch()` guard is NOT mutation-provable.** Disclosed in-code. Can you build a test
   that *does* discriminate, or is the honest answer "no, under mocking"?
3. **The phone redaction.** Rewritten once after it ate timestamps and request ids. 10 cases lock
   both directions. Find an input that defeats it — either a phone it misses, or a diagnostic it
   still destroys.
4. **The dedupe contract.** One unread alert per lane; admin reading re-arms it. If Sean never
   reads it, alerts stop forever. Is that right? It matches the money lane — is the money lane
   right?
5. **Scope honesty.** 5 other `sendGridEmail` callers still fail silently (newsletter,
   notification, consult, leadCapture, template). Deliberate scope, not an oversight — but is it
   the *right* scope?
6. **Rule 30 on this document.** One claim in the audit shipped unverified and was false. Assume
   there is another. Re-verify anything you intend to act on.

**Report the verdict as APPROVE / REVISE / REJECT** — per AGENTS.md Rule 46, Kimi is the standard
commit gate and returns a verdict, not just findings. The prior agent asked for findings only and
got the procedure wrong (it could not see the rule — see §3).

---

## 3. 🚨 THE TOP FINDING — the rules themselves are unwired (BLOCKED on Sean)

Found by chasing a "Rule 77" citation that matched nothing in the loaded rules.

**`CLAUDE.md` and `AGENTS.md` have diverged into two different constitutions on `origin/main`.**
AGENTS.md carries **74** numbered rules; CLAUDE.md carries **66**. Claude loads CLAUDE.md; Codex
loads AGENTS.md.

**Zero matches in CLAUDE.md, present in AGENTS.md:** 75 Trailhead-Truth · 76 Create-With-Context ·
**77 Dead-File Quarantine** · 78 Agent Workflow Mode Router · 79 Tests Can Encode The Bug ·
**80 Second-Vantage Verification** · 81 Test-Delta Disclosure · **Kimi Hostile-Review Gate** ·
ADW Discipline · Linear to-do spine.

**They disagree on who gates commits:**

| | CLAUDE.md (Claude loads) | AGENTS.md (Codex loads) |
|---|---|---|
| Final Decider | Fable 5, "on EVERYTHING" (2026-06-10) | **Kimi K3**, standard reviewer + commit gate (**amended 2026-07-26**) |
| Fable | standing gate + fallback chain | **"EXPLICIT OPT-IN ONLY… not a standing gate, fallback, or automatic expense"** |
| Design authority | Gemini 3.1 Pro | **Kimi K3 + Opus 5** (2026-07-25) |

### ⚠ DO NOT run `node scripts/sync-agents-mirror.mjs`

The session-start drift hook recommends it to **every** agent. `sync-agents-mirror.mjs:4` declares
*"AGENTS.md = Codex adapter header + a byte-exact UTF-8 mirror of CLAUDE.md"* — **CLAUDE.md is the
SOURCE.** Running it overwrites AGENTS.md's body and **permanently deletes rules 75–81** from the
only file that has them. A one-command detonator sitting in the startup advice.

**Status: BLOCKED on Sean's direction call (~5 min).** Mechanical repair after that is ~1 h: port
75–81 into CLAUDE.md, reconcile Rule 46 + Co-Orchestrator, close the off-by-one (CLAUDE.md rule 73
= AGENTS.md rule 74). **Do not do it unilaterally** — CLAUDE.md is the root index, its numbers are
cited repo-wide, and the divergence runs both directions (CLAUDE.md has 2 AGENTS.md lacks).

---

## 4. The situation, and where this is going

**The goal:** SwanStudios is a trainer-led B2B2C personal-training SaaS, single operator (Sean is
also the head trainer), production on Render, real paying clients. Core loop: log the workout →
save it → turn it into progress proof → decide the next training action. **Acquisition is the
weakest link.**

**Sean's trigger for this lane:** *"I don't like having stuff that's created and not wired up."*

**The finding:** SwanStudios does not have a building problem, it has an **activation** problem.
Finished, tested code sits behind switches nobody flipped — the marketing speed-to-lead reply has
been dark **24 days**, the outbound automation engine **59 days**. A commit from 2026-07-20
(`f2be2c592`) says it plainly: *"program 8/8 built, 0/8 activated; activation wave = next."* That
wave never ran.

**"Not wired up" is four different problems** with four different-sized remedies — dark (flag-off),
dead (zero importers), superseded (successor exists), merge debt (unmerged branches). Conflating
them is why it felt unbounded.

**Nuance that matters:** ~139 of those feature-days are **governed or deliberately gated** — the
nurture engine is disarmed on purpose pending one-click unsubscribe (CAN-SPAM/GDPR). Genuinely
undocumented drift is **~72 feature-days**. Do not repeat the prior agent's error of reading
deliberate restraint as neglect (it did this **three times**).

---

## 5. What is verified true right now

**Speed-to-lead chain is complete** (`origin/main`): service at
`backend/services/speedToLeadService.mjs`, flag `:24` (`SPEED_TO_LEAD_REPLY_ENABLED === 'true'`),
real call sites at `contactRoutes.mjs:226` / `consultRequestRoutes.mjs:101` /
`leadCaptureRoutes.mjs:150`, all three mounted at `core/routes.mjs:392/396/762`. **The flag is the
only remaining gate.**

**Launch Control exists and is live** — `launchControlService.mjs`, API `core/routes.mjs:497`, UI
`routes.tsx:116`, with DB override + rollout + role targeting + % bucketing. It governs exactly
**3** flags (`launchControlResolve.mjs:9`): `dashboardV2Finance`, `postSaveHandoff`, `prismCapture`.

**Three activation mechanics, one governed:** Launch Control (3 flags, one-click, revertible) ·
backend env (~20, Render dashboard + redeploy) · frontend `VITE_*` (4+, **build-time — Launch
Control can never reach them**). Only **5** flags appear in `render.yaml`.

**Governance was never the binding constraint** — all 3 governed flags sat dark 26–27 days anyway.
What is missing is a **forcing function**, not a dashboard.

**Shipped this session:** `raiseSendFailureAlert` in `adminAlertService.mjs` + wired into both
`speedToLeadService` failure paths. **35/35 tests** across two suites. Both PII scrub layers
mutation-proven.

### Sequencing (rewritten after external review — the prior version was wrong)

The prior agent put two code slices ahead of the flag flip, having just proved the flag was the
only constraint. Kimi quoted its own sentence back at it. Corrected order:

| # | Action | Owner |
|---|---|---|
| **0** | **Call the CLAUDE.md/AGENTS.md direction (§3)** | **Sean, ~5 min** |
| 1 | Flip `SPEED_TO_LEAD_REPLY_ENABLED` + run the existing runbook's live test | **Sean, ~20 min** |
| 2 | Flip `PRISM_CAPTURE_ENABLED` via Launch Control + smoke | **Sean, ~10 min** |
| 3 | Flip `dashboardV2Finance` + `postSaveHandoff`, role-targeted to owner | **Sean, ~10 min** |
| 4 | ~~decide-and-delete~~ **WITHDRAWN** → get a *decision* on SWA-71/SWA-75 | Sean |
| 5 | Land S2L branch half A (cockpit visibility, 27/27, merges clean) | agent |
| 6 | Send-failure alerting | ✅ **DONE this session** |
| 7 | Declare ~19 env flags in `render.yaml` + key-diff sync check | agent |
| 8 | **Investigate** settlement worker, then flip-or-delete | agent |
| 9 | Voice 10-dictation gate, then ONE batched deploy of all four `VITE_*` | agent + Sean |
| 10 | Nurture unsubscribe build slice, **then** `SWAN_AUTOMATION_CRON_ENABLED` | agent, then Sean |

**Steps 1–3 are one ~40-minute sitting.** Sort risk by **reversibility, not visibility**: one click
flips the settlement worker; no click un-settles a 45-day backlog.

**Explicitly NOT to build:** cold-outreach lead scraping (wrong motion for trainer-led B2B2C).

---

## 6. Money traps — read before running any consult script

Real money has already been lost to the first one.

1. **`run-top-ai-panel.ps1` bills Kimi during what it PRINTS as a preflight.** It passes
   `--confirm-spend`/`--cap-usd` to three CLIs; the **gateway-based** `consult-kimi.mjs` ignores
   both and calls the API anyway (`status=preflight-only` then `model_calls=1`).
2. **`consult-sol.mjs` has NO spend gate at all** — no cap, no confirm flag, hardcoded
   `max_tokens: 60_000`. It spends the moment it runs. (Observed: $0.7447.)
3. **Two different `consult-kimi.mjs` exist.** The main-tree 233-line standalone is safe; a 26-line
   gateway wrapper is not. **Read the copy you will invoke.**
4. **Never use `run-newsroom-top-ai-panel.ps1`** — remits hardcoded for a different project.

A true preflight is registry math (`estimateCost` + `enforceCeiling` from
`scripts/context-gateway/src/providers.mjs`), importing nothing from `transport.mjs`, so spending
is physically impossible rather than merely unintended.

---

## 7. Environment gotchas that each cost a cycle

- **`rg -r` is `--replace`, NOT recursive.** `rg -rn "Foo"` rewrites every match to `n` in the
  output. This produced a phantom "component literally named `n`" bug, and recurred **5 times in
  one session** — it is muscle memory from `grep -rn`. **Never type `-rn` with rg.**
- **Never put a conclusion line in the same shell statement as the command that produces it.**
  `rg ... || echo "not found"` fires on ripgrep's *zero-matches* exit (1), not just missing files.
  This is codified as **Rule 80** — which Claude cannot see (§3).
- **`sed` eats regex backslashes.** Mutating a regex with sed produced an unparseable file that
  reported as "no tests" — readable as "mutation survived." Use the Edit tool for regex.
- **`node --check` is not a behaviour check.** It passes on a regex silently reduced to nonsense.
- **Git Bash:** `/tmp` is `%TEMP%`, not `c:/tmp`. With `MSYS_NO_PATHCONV=1`, a `/tmp/...` arg handed
  to git will not resolve. `<rev>:<path>` lies silently without `MSYS_NO_PATHCONV=1`.
- **Worktrees have no `node_modules` / `.env`.** This one is junctioned already (`mklink /J`). A
  borrowed `node_modules` invalidates *frontend* baseline claims (missing `three`, `@zxing/browser`).
- **`--reporter basic` is not valid in vitest 4.** `--reporter=dot` works.
- **`python3` is not on PATH.**

---

## 8. The prior agent's mistakes — this is your attack map

Listed so you know where the soft ground is. All are already corrected in the audit; verify the
corrections rather than trusting them.

1. **Scheduled two code slices ahead of the one action it had proved was the only blocker.**
2. **Omitted PRISM entirely** from its sequence — a one-click-revertible acquisition lever, 26 days
   dark, on a product whose weakest link is acquisition.
3. **Wrong risk axis** — sorted by external visibility; the axis that matters is reversibility.
4. **Its systemic fix was refuted by its own table** (3/3 governed flags rotted anyway).
5. **Published a subagent claim unverified** (Rule 30) in the document where it wrote that subagent
   claims are hypotheses. Claimed 12 DesignPlayground concepts were orphans; **all 12 are
   registered** at `conceptRegistry.ts:53-64`, live via `main-routes.tsx:902`. Deleting them would
   have broken working code. **Retracted in §5 of the audit.**
6. **Proposed deleting dead code without checking the work already existed** — SWA-71 (19 backend)
   and SWA-75 (236 frontend) had already classified 255 candidates and deliberately deleted zero
   ("do nothing before launch"). Rule 77 requires **quarantine**, not deletion. **Slice withdrawn.**
7. **Read deliberate restraint as neglect three times** — nurture engine, parked design manifest,
   zero-deletion inventory. Each had a stated reason in-tree it did not look for.
8. **Counted `it(` lines and reported "13 tests"**; running them said 27.
9. **Said "zero product risk"** about a merge into a production readiness service (Rule 34).
10. **Shipped a privacy guard that destroyed the diagnostics it protected** — the first phone regex
    turned `2026-08-14 10:30:00` into `<redacted-phone>:30:00` and ate request ids.
11. **Shipped a test that could not fail** — the `.catch()` guard test passes with or without the
    guard. Now labelled armour, not evidence.
12. **Delegated sweeps ran ~77%** (10 of 13 load-bearing claims survived hand-verification).

---

## 9. What is proven vs unproven — do not inherit these as fact

**Proven this session (executed, reproducible):**
- `npx vitest run tests/api/adminAlertService.test.mjs __tests__/speedToLeadService.test.mjs` → **35 passed**
- Mutation runs: disabling error-scrub → 2 failed; context-scrub → 2 failed; old phone regex → 3 failed; restored → 35 passed
- S2L readiness suite on the *other* branch → **27/27**
- `node --check` both touched modules → exit 0; import smoke → both exports present
- Rule 42 audit → 0 untracked, 0 modified-uncommitted; secret scan CLEAN on every commit
- Constitution claims → match counts (74/66) + the mirror tool's own `--check` on `origin/main`
- Baseline (Rule 56): wider backend run = **7,615 passed / 3 failed / 33 collection failures**,
  **proven pre-existing** by reverting the two source files to `origin/main` and re-running

**NOT proven — do not repeat as fact:**
- **No flag was flipped; no live send was verified.** Every activation claim is a recommendation.
- **`render.yaml` blueprint-loss severity is `[HYPOTHESIS]`** — Render's sync semantics unverified.
  What *is* verified: only 5 flags have any repo record.
- **Settlement-worker backlog is `[UNKNOWN]`** — an inline path exists
  (`sessionDeductionService.mjs`), so the worker is likely a backstop; whether 45 days of backlog
  accrued needs a read-only query nobody ran.
- **Merge debt on ~20 older branches is unverified** — they differ from main, but whether that work
  was superseded was never checked.
- The alert is proven in unit tests and by rendering its output — **not** against a real SendGrid
  failure in production.

---

## 10. Linear — configured, token rejected

`node scripts/check-mcp-health.mjs linear` (run from the **worktree**; absent in the stale main
tree) → `linear-server` declared in `~/.claude.json` at **USER scope**, HTTP **401**,
**CONFIGURED BUT TOKEN REJECTED**, registering **zero tools**.

**Do NOT conclude "Linear is not configured."** That has been wrong every time (5th recurrence
2026-08-13). An expired token is indistinguishable from absent from the agent side.

Seven board items are held in **audit §10b** so the backlog survives the outage. Fix: fresh token →
replace the Authorization header value for that server in `~/.claude.json` → **fully restart Claude
Code** (MCP connects at startup; a reload will not do it).

---

## 11. What Sean owes (remind him; do not build around these)

1. **Call the CLAUDE.md/AGENTS.md direction** (§3) — ~5 min, gates every agent session.
2. **`SPEED_TO_LEAD_REPLY_ENABLED=true`** on the `ss-pt-new` Render service → Environment. Rollback
   is the same switch. Highest-value 30 seconds in the lane.
3. **Rotate the Render API key exposed 2026-08-12** — standing item, still outstanding.
4. **Refresh the Linear token** (§10).
5. **DMARC** — reported DONE by the prior lane; it never gated the flag anyway.

---

## 12. Discipline expected on this lane

- **Proof-Before-Done:** no "done/fixed/working" without current-session executed evidence in the
  SAME message, plus a clean hostile pass. Stop hooks enforce this and will block you.
- **Dry loop:** hostile rounds until one finds nothing fixable, then ONE more confirming round.
  Each round needs a **new vantage** — different cwd, real caller path, concurrency, external lens,
  documentation instead of code. Re-reading is not a round. End with `DRY-LOOP: CLEAN×2 (rounds: N)`.
- **Mutation-test every guard, one layer at a time.** A green test is not proof the guard bites.
  Disabling *either* redaction layer here turns tests red — that is what proof looks like. And when
  a mutation *survives*, say so and relabel the test.
- **Panel findings are hypotheses (Rule 30).** Probe every one. 4 of 24 were wrong on a prior panel;
  3 of 13 delegated claims were wrong this session.
- **Test-delta honesty:** never rewrite a pre-existing assertion to fit new code. Label RE-ANCHOR.
- **Check for a stated reason before calling anything neglected.** Three of this session's near-misses
  were deliberate decisions documented in-tree.
- **Closeout gates fire every turn:** dual-tier summary (plain-English first), Hermes inbox memo with
  a `## Mistakes I made` section, Linear sync claim, DRY-LOOP line, PROOF line.

---

## 13. The thing most worth internalising

The prior lane's handoff ended with: *a hostile loop run by the author converges on the author's
blind spots.* This session reproduced it exactly — 16 rounds, real finds, and it still took an
outside lens to notice it had scheduled code in front of the one thing it had just proved was
blocking.

But the sharper version came later, and it is why §3 is the top finding:

> **A mandatory rule in the wrong file binds nothing.** The "validate your instrument" lesson was
> not merely written down — it is codified as **Rule 80, a hard gate**. It was broken **five times
> in one session anyway**, because Rule 80 lives in `AGENTS.md` and Claude loads `CLAUDE.md`.
>
> The question is never "is this written down?" It is **"is it written down in the file this agent
> actually reads?"** A rule in the wrong file is indistinguishable from no rule — except that it
> makes the corpus look complete.
