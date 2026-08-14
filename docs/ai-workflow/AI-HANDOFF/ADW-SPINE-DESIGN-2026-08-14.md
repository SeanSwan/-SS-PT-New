---
decision: Swan's ADW spine is a Workflow-tool script + roster config + phase receipts — NOT a standalone orchestrator. Agent phases run on subscription capacity; metered spend collapses to the review gate only.
status: open
supersedes: none
---

# ADW Spine — design (grounded, pre-build)

**Author:** vs-claude (Opus 5), 2026-08-14 · **Companion to:** `SOFTWARE-FACTORY-FUSION-HANDOFF-2026-08-14.md` §3, T7

---

## 1. The constraint that decides the architecture

**A standalone Node/Python orchestrator cannot invoke Claude Code's Agent tool.** Only the harness
can. So the video's shape — `scripts/adw/run.mjs` driving phases with its own agent calls — would
force every phase back out to **metered** OpenRouter.

That throws away the single biggest advantage Swan has over the setup in the video:

| | IndyDevDan | Swan |
|---|---|---|
| Frontier capacity | metered (OpenRouter / Fireworks), per token, every phase | **flat-rate subscription** (Claude, ChatGPT/Codex) — already bought |
| Cost of a build run | proportional to work done | **$0 at the margin** |
| Where money goes | every phase | **the review gate only** |

**Evidence, this session:** S0 shipped 16 commits, 6 new modules, 43 net-new tests. Build cost **$0**.
Total spend **$2.58**, 100% of it Kimi hostile review. The economics already work — by accident.

## 2. The spine already exists in the harness

The **Workflow tool** is a script-driven multi-agent orchestrator: `phase()`, `agent()`,
`pipeline()`, `parallel()`, per-agent `model` and `effort` override, structured output via JSON
schema, worktree isolation per agent, a resumable journal, and a concurrency cap. That IS the ADW —
phases as deterministic code with agents inside them — running on subscription capacity.

**Therefore: do NOT build a parallel orchestrator.** IndyDevDan's own advice is "stay in
distribution." The harness's primitive is the distribution.

## 3. What is actually missing (the real build)

1. **Standing SDLC workflow scripts.** No saved workflows exist. Need: `scout`, `plan`,
   `plan-build`, `plan-build-test`, and the full `sdlc`. Each is a Workflow script committed under
   `.claude/workflows/`.
2. **A roster config** — core-4 per role (which model, which effort, which prompt, which tools).
   Today routing lives in prose inside skills. Should be one committed file the workflows read.
3. **Phase receipts.** The Workflow journal is harness-internal. Swan's own telemetry store
   (`.ai-workflow/context-gateway/receipts/`, built as S0) should also capture per-phase records so
   the observability surface has one place to read.
4. **The observability surface (S1 "Swan Morning").** Receipts on disk with no view is not
   observability. This is the highest-value build.
5. **Cost rollup.** No cumulative view exists anywhere.

## 4. Roster — the model stack mapped to phases

Principle: **the smart model scopes and verifies; cheap models execute; deterministic code gates.**
Metered providers appear exactly once, at review.

| Phase | Runs on | Why | Marginal cost |
|---|---|---|---|
| scout / audit | `Explore` agent, haiku or sonnet | breadth, low taste bar | $0 |
| plan / architect | opus | taste + scoping decide everything downstream | $0 |
| build | sonnet subagents (parallel via `pipeline`) or the Codex lane | bounded work with acceptance criteria | $0 |
| gate / test / lint | **deterministic code** — no agent | free, instant, reliable | $0 |
| hostile review | **Kimi K3** (+ panel, see handoff T3) | proven: ~53 findings / 14 rounds, 0 hallucinated | **metered — the only spend** |
| document | haiku or sonnet | mechanical | $0 |

**Hard rule: never proxy a subscription through a base-URL swap to fake an API.** CLAUDE.md already
blocks unreviewed API/base-URL proxies, and the terms question is unresolved (Sol raised it, never
answered). First-party Agent/Workflow primitives have no gray area and cost nothing.

## 5. Sandboxes — what Swan already has

The video uses cloud VMs (exe.dev) for isolation, scale, and autonomy. Swan already has **isolation**
via git worktrees — this entire S0 build ran in one, with the main tree untouched. The Workflow tool
also supports `isolation: 'worktree'` per agent, so parallel builders cannot collide.

**Scale and autonomy are the parts worktrees do not give**, and both are gated on the spine existing
first. **Best-of-N is therefore a later slice, not a starting point** — Sean chose local-first
2026-08-14 for exactly this reason.

## 6. Build order

- **S0** — receipts. Built; 16 commits; dry-loop rounds 15-16 owed; **not pushed**.
- **A1** — roster config + the `scout` and `plan` workflows. Smallest real slice.
- **A2** — `plan-build-test` with deterministic gates between phases.
- **A3** — phase receipts wired into the S0 store + cost rollup.
- **S1** — Swan Morning: one desktop button, one surface, receipt counter as the first pixel.
- **A4** — full `sdlc` workflow (adds review + document phases).
- **Later, gated** — cloud sandboxes, best-of-N.

**A1 cannot start until S0 ships** — otherwise the S0 diff under active hostile review gets muddied.

## 7. Open questions for Sean

1. **Codex lane inside the ADW?** Codex is a second subscription and a proven hostile reviewer
   (Rule 46/67). Should build phases fan out across Claude AND Codex, or stay Claude-only for now?
2. **How autonomous?** The video's pitch is "show up at the beginning and the end." Swan's gates
   (proof-before-done, dry-loop, blast-radius) assume a human in the loop at closeout. Which gates
   may a workflow satisfy on its own, and which always stop for Sean?
3. **Where does `swan-gate` sit?** It already specifies an independent validator writing an
   executable gate BEFORE the build. That is stronger than the video's gate checks — it should
   become the deterministic phase between build and review rather than being reinvented.
