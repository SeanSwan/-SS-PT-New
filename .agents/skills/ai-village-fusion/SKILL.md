---
name: ai-village-fusion
description: The "fusion" option Sean pulls up on top of normal Codex+Codex pair-coding — get a multi-perspective panel + a single synthesized verdict (consensus / contradictions / unique insights / blind spots / fused recommendation) for any hard question, plan, or code review. Four tiers - (0) lazy Codex+Codex pair-coding, (1) duo subscription fusion, (2) TRIANGLE subscription fusion Codex+Codex+Gemini via a shared-folder polling board (the everyday workhorse, ~$0 on flat-rate subs), (3) paid AI Village + Opus/Fable judge (spend-gated, least used). Invoke when Sean says "fusion", "village", "triangle", "second opinion", "panel this", "free fusion", or wants a stronger answer than one model gives. Inspired by OpenRouter's Fusion API; the synthesis step carries most of the quality lift.
---

# AI Village Fusion

**Role:** an on-demand fusion option layered on top of the normal Codex+Codex pair-coding loop. It fans a hard question out to a diverse panel, then runs ONE judge that synthesizes all answers into a single superior verdict — the mechanism OpenRouter's Fusion API is built around (benchmarks attribute ~3/4 of the lift to synthesis, ~1/4 to model diversity).

This is **not** always-on. Sean pulls it up when a question is worth more than one model's take: architecture calls, plans, hard bugs, strategy, "is this right" reviews.

## The four tiers (the ladder — offer the right one)

Pick by stakes/cost (infer from "free"/"no credits"/"quick" vs "must be right"/"ultra-thorough"):

| Tier | Name | Brains | Cost | When |
|---|---|---|---|---|
| **0** | Lazy pair-coding | Codex + Codex (no fusion) | flat-rate | default daily coding (Rule 67) |
| **1** | Duo fusion | Codex + Codex via the board | ≈free | quick 2-way second opinion |
| **2** | **Triangle fusion — the workhorse** | Codex + Codex + Gemini via the board | ≈free | everyday hard questions — MOST USED |
| **3** | Paid AI Village | ~9–13 analysts + recursive debates + Opus/Fable judge | $ (spend-gated) | must-be-right / ultra-thorough — LEAST USED |

Tiers 0–2 are **zero marginal API cost** — they run on the Codex / Codex / Gemini *subscriptions* (flat-rate). Tier 3 spends real credits and is spend-gated. The synthesis contract (consensus / contradictions / partial coverage / unique insights / blind spots / fused recommendation) is identical across all fusion tiers — only the brains and cost differ.

## Tier 3 — PAID (Full Village) — least used, must-be-right

Run the orchestrator. Synthesis judge + spend gate are wired in:

```bash
node scripts/validation-orchestrator.mjs                       # recent code changes
node scripts/validation-orchestrator.mjs --document plan.md    # review a plan/doc
```

Spend controls (Sean's directive — protect credits):
- **Pre-run estimate + confirm:** prints a typical–worst cost range + which paid models will run, then asks to proceed (TTY) or honors `SWAN_VILLAGE_CONFIRM=yes`.
- **Hard cap:** `SWAN_VILLAGE_MAX_USD=<n>` aborts before spending if the worst-case estimate exceeds the cap, and skips the judge mid-run if Phase 1 already blew it.
- **Judge model:** `SWAN_FUSION_JUDGE_MODEL` (verified Opus 4.8 slug, or Fable 5 when it returns). `SWAN_FUSION_SYNTHESIS=off` disables the judge.
- **Output:** `synthesis.md` + `cost-summary.md` (per-model credits used) in the AI Village output dir.

### Tier 3 → Tier 2 ratify gate (MANDATORY — Sean's rule, 2026-06-16)
The Village synthesis is a **deep draft, not the final verdict.** After any paid run, feed its `synthesis.md` into a **Tier 2 triangle** (Codex+Codex+Gemini) and run the free board — **the triangle's synthesis is the FINAL verdict**, closed by the Final Decider (Fable→Opus→Codex). Recipe:
```bash
node scripts/validation-orchestrator.mjs …            # paid Village → writes synthesis.md
node scripts/fusion-triangle.mjs \
  --task "Ratify/finalize this Village verdict: accept, correct, or flag over-reach + blind spots; produce the final recommendation." \
  --context "<paste/point at the Village synthesis.md>"  # free triangle → FINAL synthesis.md
```
The triangle catches the Village's blind spots/over-reach with the trusted everyday panel; the ratify pass is **$0** (subscriptions). **Never close a high-stakes call on the Village alone** — it always ends with a triangle verdict. (Tiers 0–2 never chain; only Tier 3 → Tier 2.)

## Tiers 1 & 2 — FREE subscription fusion (duo / triangle) — the everyday workhorse

Zero-credit fusion on the flat-rate subscriptions via a **shared-folder polling blackboard** (`scripts/lib/fusion-board.mjs`, built on `fusion-handoff.mjs`). **Duo** = Codex + Codex; **Triangle** (the default workhorse) = Codex + Codex + Gemini. Every agent points at the same run folder, writes its own file, and polls ~every 20s to see the others and time each other out.

### The board (Sean's polling model)
`.ai-workflow/fusion/<runId>/` holds `request.md`, `board.json` (live per-agent status), `answers/<agent>.md`, and `synthesis.md`. **Gitignored — local disk only.**
- `initBoard({ root, runId, task, context, agents })` — scaffold (triangle: `agents: ['Codex','codex','gemini']`).
- `postContribution(dir, agent, text)` — an agent writes its file + stamps the board.
- `othersView(dir, agent)` — what the others wrote (for an optional refine round — "see what each other is doing").
- `boardStatus(dir, { staleMs })` — flags timed-out agents (pending agents age from board open).
- `pollUntilReady(dir, { agents, intervalMs: 20000, timeoutMs })` — the ~20s poll loop; returns when all are in, or reports `missing` on timeout (proceed with ≥2).

### Driving the three agents (headless, $0 on subscriptions)
- **Codex:** `Codex -p "<answer this independently…>"` → capture stdout → `postContribution(dir,'Codex',out)` (or Codex-in-loop polls the board itself).
- **Gemini:** `gemini -p "<prompt>" -o text` (CLI is installed) → stdout → `postContribution(dir,'gemini',out)`; `-m <model>` to pin a Gemini 3.x model.
- **Codex (no CLI on PATH):** post a request to `.ai-workflow/coordination/review-queue.md`; Codex, in its own session, reads the board and writes `answers/codex.md`. The poll loop times it out after `timeoutMs` and proceeds with whoever's in.
- **Synthesize:** the Final Decider (Fable → Opus/Codex → Codex) reads all answers via `buildHandoffJudgePrompt(dir, …)`, produces the structured verdict, and saves it with `writeFreeSynthesis(dir, md)` → `synthesis.md`.

**Solo fallback** (only Codex available): run the panel as Codex across distinct lenses (security / UX / perf / cost), self-synthesize, and say diversity is reduced.

### Retention
Free-fusion runs accumulate on local disk (gitignored, never in git). `node scripts/fusion-prune.mjs` deletes run dirs older than **90 days** (`SWAN_FUSION_RETENTION_DAYS` overrides). Run periodically alongside `scripts/coordination-prune.mjs`.

## Coding mode (fusion behind the main coder)

Per the Fusion guidance, fusion is **not** a drop-in coder. The base coder (Codex/GPT-5.5 now → Fable later) leads normal building; pull up fusion **selectively** for the calls worth extra perspective — architecture decisions, "best-practice approach?", risky refactors — then the coder implements the fused recommendation. Don't fusion-gate routine edits.

## Self-improvement (propose-only)

Sean's standing rule: any tuning this skill suggests to itself, the orchestrator, the judge prompt, or model choices is **propose-only** — write the proposal (e.g. to a brainstorm/handoff doc), apply only on Sean's explicit yes. Same safe pattern as `auto-research` / `skill-harvest`. Never self-edit code or rules silently.

## Guardrails
- **Privacy (Rule 8):** handoff files are local/gitignored but still — IDs/roles only, no client PII/medical/immigration data, no secrets.
- **Final Decider chain (AGENTS.md):** Fable 5 → next best Codex (Opus) → Codex. The judge/Decider must be a policy-allowed (US/EU) model; the paid judge fail-closes on disallowed providers.
- **Spend (paid tier):** never run the paid Village unattended without `SWAN_VILLAGE_CONFIRM=yes`; respect `SWAN_VILLAGE_MAX_USD`.
- **Closeout (Rule 57/60):** end with a plain-English + technical summary and the recommended next slice.

## Related
- `scripts/validation-orchestrator.mjs` — Tier 3 paid Village (+ judge + spend gate)
- `scripts/lib/fusion-synthesis.mjs` — the synthesis contract (shared by ALL tiers)
- `scripts/lib/cost-gate.mjs` — paid-tier estimate / cap / confirm / cost summary
- `scripts/lib/fusion-handoff.mjs` — free-tier run scaffold + answer/synthesis file mechanics
- `scripts/lib/fusion-board.mjs` — the shared-folder polling blackboard (status + 20s poll + timeout) for the duo/triangle
- `scripts/fusion-prune.mjs` — 90-day retention prune for the fusion root
- `scripts/fusion-triangle.mjs` — Tier 1/2 live launcher (drives `Codex -p` + `gemini -p` + Codex-via-board → synthesis). BUILT + live-smoke-green; Gemini best-first model chain (Pro→flash fallback).
- **Portability:** the fusion root is `SWAN_FUSION_ROOT`-overridable so other projects route output to themselves, never into SS-PT — see `docs/ai-workflow/references/FUSION-PORTABILITY-PROTOCOL.md`.
- Rule 46 (3-Brain loop), Rule 67 (pair-coding ledger), Opus-Codex debate protocol — the file-handoff foundations this builds on
