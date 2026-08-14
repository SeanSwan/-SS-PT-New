---
decision: Route each task class to the CHEAPEST surface that clears its bar. Sean's subscriptions (Claude Code, Codex ×3 surfaces) and local Ollama are $0 at the margin and are always tried first; metered OpenRouter is reserved for the independent outside read, which is the one thing a subscription cannot provide.
status: open
supersedes: none
---

# Swan Switchyard — routing the WORKER, not just the reviewer

**Sean, 2026-08-14:** *"Wendell had a system where it chose the correct AIs for the right problem.
Did we set that up? … the setup should have included my VS Code, and I have my Codex desktop, and
Codex VS Code too."*

**Answer: no, not yet.** `fusion-router` routes *how much* fusion (tier 0-3). The Kimi Panel design
routes the *adjudicator*. **Nothing routes the worker.** This is that missing piece.

---

## 1. The surfaces actually available (verified 2026-08-14)

| Surface | Verified how | Marginal cost |
|---|---|---|
| **Claude Code** — Opus 5 / Sonnet / Haiku subagents, Workflow tool | running in it now | **$0** subscription |
| **Codex CLI** | `codex` on PATH; `~/.codex/auth.json` present | **$0** subscription |
| **Codex desktop** | Sean confirmed | **$0** same subscription |
| **Codex VS Code** | Sean confirmed | **$0** same subscription |
| **Local Ollama** | 6 tool-capable models, 262k ctx, RTX 5090; responding 2026-08-14 | **$0**, never leaves the house |
| **Hermes / Hermes 2** | `scripts/hermes/` present; `~/hermes2/.hermes/` present (WSL) | **$0** — local Qwen3 brain |
| **OpenRouter** | Kimi, Sol, HY3, panel, Fable | **metered** |

**Hermes is a different CLASS, not another model.** Every other surface here is synchronous and
desk-bound — Sean has to be sitting here. Hermes is **asynchronous, remote (Telegram), and
scheduled** (native cron; the Morning Ops Briefing already runs daily). Its brain is the local
Qwen3, **fail-closed with no automatic cloud fallback**, so it is also the private lane.

That makes Hermes the answer to a question none of the others can serve: *"do this when I am not at
the machine"* — and, via T0-T4 effect tiers, *"do this without me approving each step, up to a
bounded blast radius."*

**Precedent already in the repo:** `scripts/consult-codex.mjs` was changed 2026-08-11 to prefer the
Codex CLI over OpenRouter, with the note *"Sean pays a monthly Codex subscription… this script
always called [OpenRouter], paying twice — once for the subscription he already owns, and again per
token."* **The Switchyard generalises that one fix into a rule.**

## 2. The routing rule

> **Route to the cheapest surface that clears the task's bar. Escalate only on evidence.**

This is Wendell's Switchyard shape — small worker → observable result → accept or escalate — with
one substitution that changes the economics completely: **his "cheap local model" is Sean's
"already-paid subscription."** Claude Opus is free at the margin here. So the ladder does not start
at a weak model; it starts at a *strong* one that happens to cost nothing.

**What metered spend actually buys:** not capability — *independence*. A second Claude reviewing
Claude shares its blind spots. That is the only thing worth paying for, and it is why the money
belongs at the review gate and nowhere else.

## 3. Task class → surface

| Task class | Route to | Why | Escalate to |
|---|---|---|---|
| Scout / inventory / "where is X" | `Explore` agent, Haiku | breadth, no taste bar | Sonnet if ambiguous |
| Plan / architecture / taste | **Opus 5** (orchestrator) | decides everything downstream | `chromie` / Kimi Panel if the bet is unproven |
| Build — bounded, spec'd | **Sonnet subagents**, parallel via `pipeline` | acceptance criteria make it mechanical | Opus if the spec keeps failing |
| Build — needs a second implementation | **Codex** (CLI / desktop / VS Code) | genuinely different model lineage, $0 | — |
| Gates / tests / lint / typecheck | **deterministic code** | free, instant, cannot hallucinate | — |
| Mechanical + privacy-sensitive (commit msgs, changelogs, memo scrub, first-pass triage) | **local Ollama** (`qwen3.6:35b-a3b`) | $0 and never leaves the machine | — |
| Hostile review — design / UI / copy | **Kimi K3** | design ceiling is its lane; 16-round precision record | Kimi Panel |
| Hostile review — code / correctness | **Sol 5.6, effort high** | standard ceiling, strongest code reader | Kimi Panel |
| Hostile review — auth / billing / PII / secrets | **Sol ONLY** | Kimi & HY3 are refused in code by the ceiling | — |
| Broad coverage — "what did we all miss" | **Kimi Panel** (9 cheap, blind, parallel) | ~2-3¢; different labs, non-overlapping blind spots | gated debate |
| Contested / must-be-right | **gated debate**, then Village | cost scales N×R | Sean confirms first |
| **Sean is away from the desk** | **Hermes** (Telegram) | the only remote surface; T0-T4 bounds blast radius | escalate to a desk surface on return |
| **Scheduled / recurring** | **Hermes native cron** | already the automation home (Morning Ops Briefing runs daily) | — |
| **Must never leave the machine** | **Hermes brain** or direct Ollama | local Qwen3, fail-closed, no auto cloud fallback | — |

## 4. The escalation ladder (Wendell's, with Swan's economics)

```
  deterministic code            $0  ─ can it be checked, not judged?
        ↓ no
  local Ollama                  $0  ─ mechanical AND private?
        ↓ needs judgement
  Claude subagent (Haiku→Sonnet→Opus)   $0  ─ subscription; most work ends here
        ↓ needs a second implementation
  Codex lane                    $0  ─ different lineage, same $0
        ↓ needs an INDEPENDENT outside read
  Kimi / Sol single reviewer    metered  ─ the first real spend
        ↓ needs coverage
  Kimi Panel (9 blind)          ~2-3¢
        ↓ genuinely contested
  gated debate → Village        Sean confirms, cost printed first
```

**Every rung down must be justified by evidence from the rung above**, never by preference. That is
the whole discipline: the escalation is a claim that the cheaper surface *demonstrably* failed.

## 5. Why Codex is a first-class worker, not just a reviewer

Three surfaces, one subscription, $0 at the margin — and critically a **different model lineage**
from Claude. For "build it twice and compare," Codex is the only free way to get genuine
implementation diversity. Rule 67's lane ledger already exists to keep two agents from colliding in
one tree, so the coordination problem is solved.

**Use Codex when:** a second independent implementation is wanted · Claude has failed the same spec
twice (different lineage may not share the blind spot) · the work is naturally parallel and the lane
ledger can keep them apart.

## 6. What this does NOT do

- **No API proxying.** Never route a subscription through a base-URL swap to fake a metered API.
  CLAUDE.md blocks unreviewed proxies, and the terms question is unresolved. First-party
  Agent/Workflow/CLI surfaces only.
- **No best-of-N yet.** That needs sandbox isolation Sean does not have (local-first chosen
  2026-08-14). Worktrees give isolation, not scale.
- **No automatic escalation to paid.** Every metered rung is either a documented default (the
  review gate) or an explicit confirm (debate, Village).

## 7. Open decisions

1. **Does the router pick, or recommend?** Auto-route silently, or state the choice and proceed
   (like `prompt-watcher`)? Recommend: state it in one line — routing decisions are exactly the
   telemetry the flywheel needs, and a silent router is unauditable.
2. **Codex invocation surface** — CLI (scriptable, fits a Workflow) vs desktop/VS Code
   (interactive)? The CLI is the only one an ADW can drive.
3. **Local-model promotion threshold.** After S0 receipts accumulate: what upheld-rate justifies
   moving a task class down to Ollama permanently? This is Wendell's flywheel, and it needs data
   that does not exist yet.

## 8. Build order

Blocked on S0 shipping. Then: **W1** routing table as committed config (not prose) · **W2** the
route decision recorded in every ReceiptV1 so choices are auditable · **W3** Codex CLI wired as a
Workflow-callable worker · **W4** the local-Ollama lane for mechanical/private work · **W5**
promotion analysis once receipts exist.
