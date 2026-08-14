---
decision: Blend the IndyDevDan "software factory" (ADW-as-code) into Swan's existing rules+hooks+fusion stack; refresh the AI Village roster and the Kimi panel from live OpenRouter data; gate debate behind explicit approval.
status: open
supersedes: none
---

# HANDOFF — Software Factory Fusion + Model-Stack Refresh

**From:** vs-claude (Opus 5), session 05abd0e9, 2026-08-14
**To:** the next agent
**Why this exists:** Sean is closing a long session to keep token cost down. Everything you need is
here. Do NOT re-read the prior chat.

---

## 0. READ THIS FIRST — the state you are inheriting

**Branch `s0/receipt-v1-2026-08-13`, worktree at `.claude/worktrees/s0-receipt-v1`, 16 commits,
NOT PUSHED.** It branches from `origin/main` and is 0 behind.

**⚠ The main working tree (`SS-PT` on `wip/comms-notifications-2026-07-05`) is ~1845 commits behind
`origin/main` and has ~99 unpushed commits of its own.** Do not build there. That trap already cost
this session one wasted edit — a hook fix applied to a stale copy that could never reach main.

**The dry-loop is NOT closed.** Rounds 1–14 ran (Kimi K3 hostile review). Round 14 returned REVISE
with 2 findings; I fixed those plus one worse defect I found myself, and committed. **Round 15 has
not run.** Per the Dry-Loop Law you need a clean round PLUS one confirming round before pushing.
Do not push on my say-so.

**Verification state as of `f705ab302`** (all current-session, reproducible):
- `node --test scripts/context-gateway/tests/*.test.mjs` → 131 tests, 130 pass, 0 fail, 1 skipped
  (skip is pre-existing; stashed baseline at `origin/main` was 88/87/0/1)
- `node --test scripts/__tests__/check-mcp-health.test.mjs` → 26/26
- `node --test scripts/hooks/linear-sync-gate.test.mjs scripts/hooks/gate-window-parity.test.mjs` → 19/19
- All touched files ≤300 lines
- **UNPROVEN:** the paid success path (`shortPath`, the `saved ->` / `receipt ->` console lines).
  Reachable only after a real provider call. 16 unit tests stand in. Refusal / DENY / diagnostic
  paths ARE proven end-to-end via subprocess.

---

## 1. What was built (S0 of the flywheel)

**Root cause fixed:** `receipt.mjs:4` claimed *"Every provider call leaves a receipt"* while
`writeReceipt` had **zero production callers**. Every consult was redacted and spend-gated and
completely unrecorded. Verified: all adapters route through `runConsult`; `consult.mjs` never
imported `receipt`.

| File | Purpose |
|---|---|
| `scripts/context-gateway/src/receiptV1.mjs` | Allowlisted audit record for the CONSULT lane. Fields copied explicitly — prompts/responses/bodies **cannot** enter, proven by negative tests. |
| `scripts/context-gateway/src/paths.mjs` | ONE escape predicate for "does this path leave the base". `shortPath` (console/artifact) + `relativizePath` (receipt) share it. |
| `scripts/lib/read-capped.mjs` | Bounded response read; cancels rather than drains. |
| `scripts/check-mcp-health.mjs` | Answers "is this MCP server working, and if not why" in one command. |
| `scripts/hooks/linear-sync-gate.mjs` | Block message now names the health checker. |

**Why two receipt writers:** the consult lane has a `pseudoManifest` of `{id,path}` — no question,
headSha, tiers, SHAs, or line windows, and no citation audit. Passing it to `writeReceipt` emits
`undefined` for every window field and throws on `audit.invalid.length`. They stay separate.

**Receipts land in** `.ai-workflow/context-gateway/receipts/` (gitignored, `.gitignore:447`).
One JSON file per event — never an appended log, because three consults run concurrently here.

---

## 2. THE LINEAR ROOT CAUSE (5th recurrence — do not re-derive this)

`~/.claude.json` (USER scope) declares `linear-server`, HTTP + `Authorization` header.
**The token returns HTTP 401 `invalid_token`.** An expired token registers ZERO tools, which from an
agent's side is indistinguishable from "not configured" — which is why five sessions concluded
"Linear isn't set up." It is set up. The credential is dead.

**SEAN OWES:** rotate the Linear token in `~/.claude.json`, then **fully restart Claude Code**
(MCP servers connect only at startup). Until then no agent can write to the board and every
closeout must say `LINEAR: N/A — board unreachable`. **Never fabricate an SWA id.**

**Diagnostic:** `node scripts/check-mcp-health.mjs linear`. It reads all five config locations
(`.mcp.json`, `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude.json`,
`~/.claude/settings.json`) and probes each HTTP server. Exit 0 healthy / 1 unhealthy / 2 declared
but unprobeable / 3 nothing matched.

**Known live state:** `linear-server` = TOKEN REJECTED (real). `mobbin` = CANNOT VERIFY (its
credential is interactive OAuth, not in config — **not** a fault; do not rotate it).
`playwright`, `swan-scout` = stdio, unprobeable.

---

## 3. SEAN'S NEW DIRECTION — the actual work

Sean watched IndyDevDan's *"Super Simple Software Factory"* (2026-08-10) and wants it blended into
the existing Swan stack. His words, condensed: *"I really like the way this is working out… think of
the most comprehensive way we can blend all this together and make it one thing."*

### 3.1 What the video proposes

Three actors: **engineer + deterministic code + agents**. Agents propose, code disposes.
An **ADW** (AI Developer Workflow) is a phased pipeline — plan → build → test → review → document —
where each phase is an agent call wrapped in deterministic gate checks, phases hand off **typed
JSON envelopes**, and every agent has a **core-4 config** (context / model / prompt / tools) in YAML.
The org of ADWs = the **software factory**. Key properties: observable, customizable, reusable.
Plus: **model stack not model** (right model per phase by cost/speed/quality), **best-of-N** (same
prompt into N sandboxes, pick the winner), **agentic access** (an orchestrator agent operates the
factory so the human is only present at planning and review).

### 3.2 What Sean ALREADY has (do not rebuild these)

| Factory concept | Swan equivalent | Notes |
|---|---|---|
| ADW vocabulary | **Rule 73 already defines it** | "a chained set of build/verify stages is an ADW; the org of ADWs + board + agents is the software factory" — the vocabulary is adopted |
| Deterministic gates | 10 hooks (Stop ×5, PreToolUse ×2, SessionStart ×2, UserPromptSubmit) | dry-loop, hermes-closeout, linear-sync, dual-tier, blast-radius, drift-check, lane |
| Gate-before-build | `swan-gate` (Rule 73) — independent validator writes `gate.mjs` BEFORE the build; builder never edits it, hash-diff enforced | stronger than the video's version |
| Model routing | Fusion tiers 0–3 + `fable-mode` routing table + `fab-sol` planner/executor split | |
| Observability substrate | **S0 receipts — just built this session** | this is the missing telemetry the factory needs |
| Orchestration primitive | The `Workflow` tool (script-driven multi-agent, phases, pipeline/parallel) | already in the harness |
| Coordination | Rule 67 lane ledger | the poor-man's sandbox |

**Swan's governance layer is far ahead of the video** — 81 rules, proof-before-done, dry-loop,
test-delta disclosure, blast-radius gates. Do not regress any of it.

### 3.3 The REAL gaps (this is the work)

1. **No phased ADW as code.** Swan's pipeline is convention + hooks. The video's is a ~180-line
   orchestrator with explicit `with phase(...)` blocks, so the *sequence itself* is deterministic
   and restartable by session id. Swan has `Workflow` but no standing SDLC script.
2. **No typed handoff envelope between phases.** Agents hand off prose. The video validates JSON
   between every phase and re-prompts on schema failure.
3. **No agent-config file.** Core-4 (context/model/prompt/tools) per role, in YAML, versioned.
   Swan's routing lives in prose inside skills.
4. **No observability surface.** Receipts are JSON on disk with no view. The video's swim-lane +
   cost-per-phase view is the thing that makes the loop improvable. **This is S1 "Swan Morning".**
5. **No cost aggregation.** I spent **$2.58 on Kimi across 14 rounds** this session and only know
   because I tallied by hand. There is no per-session or per-phase rollup anywhere.
6. **No sandboxes / best-of-N.** Everything runs in Sean's tree. Best-of-N is *gated on* sandbox
   isolation — do not promise it before that exists.
7. **Gemini Flash 3.7 is not configured.** Sean named it explicitly. Not in `providers.mjs`.
8. **AI Village roster is stale.** Needs a live OpenRouter refresh.

### 3.4 The convergence worth noticing

Wendell's data flywheel, IndyDevDan's factory, and Sean's S0→S1 ladder **all point at the same next
step**: instrument first, then build the surface that makes the instrument readable. S0 turned the
recorder on. S1 is the swim-lane view. Everything else (routing, best-of-N, local-model promotion)
needs weeks of accumulated receipts to be designed honestly.

---

## 4. TASKS FOR YOU, IN ORDER

### T1 — Close the dry-loop and ship S0 (do this first, it is nearly done)
Run Kimi round 15 on the full diff vs `origin/main`. If clean, run round 16 as the confirming round.
Two consecutive clean rounds = `DRY-LOOP: CLEAN×2 (rounds: N)` → then push. Fix anything found and
restart the count. **Do not push without two clean rounds — Sean was explicit.**

```
node scripts/consult-kimi.mjs --document <packet> --out <verdict> --effort high --confirm-spend
```
Cost so far: 14 rounds, $2.58, cap $3.00 (`SWAN_CONTEXT_MAX_USD`). **The cap is per-call, not
cumulative** — watch the running total yourself.

### T2 — OpenRouter model-stack refresh + AI Village update
Sean: *"go on OpenRouter and look up the best models right now… update my AI Village to make it
tighter… add more models that are gonna be more on the free status so it could be smarter."*

- Pull the live OpenRouter model list (pricing, context, capabilities). **Do not trust training
  memory for model IDs or prices** — Rule 46/model-ID discipline. Verify against
  `config/MODEL_VERSIONS.md` and update it.
- Produce a **model stack table**: frontier / workhorse / cheap / free, with $/M in and out, context,
  and what each is FOR. The video's framing is right: *right model, right phase, right price.*
- Update the AI Village roster (`scripts/validation-orchestrator.mjs`) — add strong **free-tier**
  models to widen the panel at zero marginal cost.
- **Rule 12 is absolute: no Grok / X-AI anywhere.**
- **Rule 16: the Village is spend-gated and requires Sean's explicit per-run permission.**

### T3 — The Kimi panel (Sean's specific ask)
Sean: *"add more models to my Kimi, because I'm using Kimi a lot… so whenever I want Kimi, all of
them are getting all that information, and they're all talking."*

Design a **panel-by-default** consult: one packet fans out to Kimi K3 + HY3 + a few cheap models
concurrently, and returns ONE synthesis (consensus / contradictions / unique insights / blind
spots / fused recommendation — the existing fusion synthesis contract). Constraints:
- **Kimi and HY3 are `ceiling: 'design'`** in `providers.mjs` — they REFUSE packets whose evidence
  paths match `SENSITIVE_PATH_RE` (auth/billing/PII/secrets/migrations/admin). This is enforced in
  code and is a Sean-gated policy change. Route accordingly; do not widen the ceiling.
- Reuse `scripts/consult-openrouter-panel.mjs` if it fits rather than writing a new fan-out.
- Every provider call must now leave a ReceiptV1 (that is what S0 bought you) — so the panel's
  cost/latency per model becomes measurable immediately.

### T4 — Gated debate escalation
Sean: *"a debate is good only if it's needed and should be escalated to a debate… make a debate
option, but it's super gated because it's expensive. And it definitely asks and double checks
before we do that."*

Debate = the recursive multi-round adversarial mode (`swan-debate`). Make it:
- **Never automatic.** Default is single-pass panel.
- **Triggered only** when the panel returns CONTRADICTIONS, or the caller explicitly asks.
- **Two-step confirm** with a printed cost estimate before the first paid round.
- Hard round cap + running spend total shown between rounds.

### T5 — Gemini Flash 3.7 setup
Not configured. Add to `providers.mjs` with verified model id, real pricing, ceiling, and a
`priceVerified` date. Sean named it as a panel member.

### T6 — S1 "Swan Morning" (the highest-value build)
One desktop `.cmd` → one surface. Sean has ~8 fragmented launchers (`Hermes Command Center.cmd`,
`Hermes Daily Brief.cmd`, `Start Hermes 2.cmd`, …) and no single entry point. **First pixel is the
receipt counter, showing zero honestly at first.** This is simultaneously: Sean's original ask, the
video's observability view, and Wendell's "instrument the thesis." Two independent design reviewers
converged on it unprompted.

UI work routes through `swan-design-router` (Rule 40). Crystalline Swan, styled-components, Victory
charts, 44px targets, dark-first, ≤300 lines/file.

### T7 — ADW spine (the structural piece, do last)
Only after T1–T6. A phased SDLC orchestrator with typed JSON envelopes between phases and a
per-role agent config. Use the existing `Workflow` tool as the execution primitive rather than
inventing a DSL — the video's own advice is *"stay in distribution."* Sandboxes and best-of-N are
**gated on** isolation Sean does not have yet; do not promise them.

---

## 5. CONSULT THESE BRAINS (Sean's instruction)

Sean wants the next agent to ask **Kimi K3, HY3, and Gemini Flash 3.7** (once T5 lands) about the
factory blend. Give each a grounded packet — **not a strategy memo**. Hard-won lesson from this
session: Kimi and HY3 are design-scoped; handed an infrastructure/economics memo they produce
nothing usable (~$0.06 wasted). Handed a real diff with a specific remit, Kimi produced ~53 findings
across 14 rounds with **zero hallucinations and one inaccuracy**. Match the packet to the reviewer.

**Kimi calibration from 14 rounds:** its *detection* is excellent; its *attribution* is fallible
(it once called a defect "pre-existing" that I had introduced — verified via `git show origin/main:<path> | cat -A`).
**Trust its findings enough to act; verify its dismissals before relaxing.**

---

## 6. SEAN'S ENHANCED PROMPT (refactored, for reuse)

> Blend the IndyDevDan "software factory" model into the existing SwanStudios agent stack without
> regressing any of its governance. Specifically: (1) map every factory concept — phased ADW,
> deterministic gates, typed inter-phase handoffs, per-role core-4 agent config, swim-lane
> observability, cost-per-phase, model stack, best-of-N — onto what Swan already has, and name only
> the genuine gaps; (2) refresh the model stack from LIVE OpenRouter data (never from memory),
> producing a frontier/workhorse/cheap/free table with verified ids, prices, and per-phase purpose,
> and update `config/MODEL_VERSIONS.md` and the AI Village roster, adding strong free-tier models to
> widen the panel at zero marginal cost; (3) make Kimi a PANEL by default — one packet fans out to
> Kimi K3 + HY3 + Gemini Flash 3.7 + selected cheap models, returning one synthesis under the
> existing fusion contract, respecting the code-enforced design ceiling on Kimi/HY3; (4) make
> multi-round DEBATE an explicit, cost-estimated, double-confirmed escalation that fires only on
> contradiction or direct request, never by default; (5) build the observability surface (S1 Swan
> Morning) that makes the receipts readable, since an instrument nobody reads is not observability.
> Constraints: Rule 12 (no Grok, ever), Rule 16 (Village spend-gated, ask first), Rule 8 (IDs/roles
> only), the dry-loop and proof-before-done gates, ≤300 lines/file. Sequence the work so each step
> produces evidence the next one needs, and state plainly what cannot be proven in-session.

**What I added to Sean's original and why:** live-data-not-memory for model ids (Rule 46 discipline,
and this session already caught a stale-branch/stale-fact error); the design-ceiling constraint on
Kimi/HY3 (would otherwise be discovered by refusal); "name only the genuine gaps" (prevents
rebuilding what Rule 73 already defines); the cost-estimate + double-confirm shape for debate; and
the explicit note that best-of-N is gated on sandbox isolation that does not exist yet.

---

## 7. GAPS SEAN DID NOT MENTION — flag these

1. **No cumulative spend view.** The $3.00 cap is per-call. Nothing tracks a session total.
   With a Kimi panel + optional debate this becomes a real risk. S0 receipts make it computable —
   build the rollup with T3.
2. **Best-of-N needs sandboxes.** The video runs five VMs. Swan has one tree + a lane ledger.
   Do not promise best-of-N until isolation exists.
3. **The worktree needs a decision.** 16 commits on `s0/receipt-v1-2026-08-13`. After push, decide
   whether to keep, merge, or remove the worktree.
4. **`SWAN_CONTEXT_MAX_USD` is unset in the worktree** — every consult there fail-closes. Fine for
   tests (they exercise that branch deliberately); set it if you need live consults from there.
5. **The main tree's 1845-commit drift is unresolved** and is its own hazard.
6. **Free models are not free of risk.** Check provider data-retention terms before routing anything
   through them — Rule 8 (zero PII to LLMs) applies regardless of price.

---

## 8. HOUSE RULES THAT WILL BITE YOU

- **Rule 74 Proof-Before-Done** — no "done/fixed/passing" without current-session evidence in the
  same message + a clean hostile pass.
- **Rule 75 Trailhead-Truth** — docs and UI describe what the code does NOW. This session found
  four separate over-claims, including one comment written to fix an over-claim.
- **Rule 79 Tests Can Encode The Bug** — a red test after a fix is a QUESTION. Diagnose against
  ground truth before editing an assertion. This session had two: one test asserted a
  misclassification, another could not fail at all (`stdout length: 0`).
- **Rule 80 Second-Vantage** — one tool's failure is never proof. It caught the "Linear isn't
  configured" error five times running.
- **Rule 81 Test-Delta Disclosure** — report a table of changed assertions (RE-ANCHOR vs SILENCE)
  before and separately from any pass count.
- **Rule 59** — never print a secret VALUE. Use presence-only checks on `.env`.
- **Use the exact-string edit tool, not heredoc/`str.replace`, for escape-sensitive edits.** A
  Python heredoc silently ate a backslash this session and disabled a security control on Windows
  with every test still green.

---

## 9. ONE-LINE STATUS FOR SEAN

S0 built and verified but **not pushed** (dry-loop needs rounds 15–16); Linear token expired and
awaiting his rotation; next build is S1 Swan Morning; the factory blend is scoped in §3–4 above.
