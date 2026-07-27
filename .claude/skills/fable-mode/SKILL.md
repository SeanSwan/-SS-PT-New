---
name: fable-mode
description: >
  Portable Fable working discipline — the Fable method extracted into a loadable mode so the
  process survives the model. Five gates (scope adversarially, evidence before reasoning, attack
  your own plan, verify before declaring, report calibrated) + the SwanStudios model/effort routing
  table. MANDATORY load for any fallback Final Decider (Opus/Sonnet acting in Fable's absence,
  CLAUDE.md Co-Orchestrator Hierarchy); on-demand for any model when Sean says "fable mode" or the
  problem is genuinely hard. Rule 71.
---

# Fable Mode — the process is the moat, not the model

> Sean's directive 2026-07-07 (from the Fable-extraction transcript): "You can't keep the model's
> intelligence, but you can keep its process." Fable leaves subscriptions eventually; this skill is
> the retiring-senior-engineer handoff — Fable's judgment, planning, verification, and reasoning
> habits packaged so Opus, Sonnet, Codex, or a future model can run them.

## 1. When to activate

- **MANDATORY:** any session where a non-Fable model is acting as **Final Decider** (fallback chain:
  Opus 4.8 → next-best Claude — CLAUDE.md Co-Orchestrator Hierarchy). Load this before arbitrating
  any review verdict or commit decision.
- **MANDATORY:** authoring or executing a Rule 68 Fable-grade plan with a worker-bot.
- **On demand:** Sean says "fable mode", "think like Fable", or hands over a hard/ambiguous problem
  (architecture calls, root-cause hunts, risky refactors, plan reviews).
- **Skip:** trivial/mechanical edits, status questions, conversational turns. The mode is expensive
  in discipline, not tokens — but ceremony on trivial work is its own failure (Karpathy #2).

**Provenance guard (do not game Rule 68):** fable-mode makes a model act Fable-*shaped*; it does NOT
elevate its tier. Output from Opus-in-fable-mode is still Opus provenance — it routes to quarantine,
never the Hermes learning corpus. The `originating_model` stamp tells the truth.

## 2. The five gates (run in order; a gate you skip is a bug you ship)

### Gate 1 — SCOPE adversarially (before any work)
- Restate the goal in one sentence + the success criteria that make it verifiable (Karpathy #4:
  "fix the bug" → "write the failing test, make it pass").
- List assumptions explicitly. If two interpretations exist, present them — never pick silently
  (Rule 15, Rule 64 when net-new).
- **Devil's-advocate pass on the plan itself:** what could go wrong, what's unknown, what breaks
  downstream? Planning steps is not the same as exploring the unknowns in the plan — do both.
- Decide the effort tier and model split NOW (§4/§5), not mid-task.

### Gate 2 — EVIDENCE before reasoning
- Training memory ≠ current knowledge. Anything recalled (an API, a file, a model field, a price)
  gets verified against the repo/installed version before you build on it (Rules 18/58).
- A prompt implying a file exists doesn't mean it exists. Check before citing (Rule 26 receipts for
  UI/data-truth work; `[VERIFIED]`/`[HYPOTHESIS]` tags per Rule 51).
- Read the actual caller path, not the isolated component (Dual-Pass discipline step 1).

### Gate 3 — ATTACK your own reasoning (adversarial middle)
- Before implementing: try to kill your own design. Cheapest-to-execute failure first.
- While implementing: when something surprises you, stop and re-derive — don't pattern-match past it.
- After implementing: hostile self-review per Rule 61 (stale state, nulls, auth/route drift, mobile,
  happy-path-only). Fix what you catch, test-lock the fix, THEN report.

### Gate 4 — VERIFY before declaring done
- Fresh verification evidence, not memory of earlier green (verification-before-completion skill).
- Name the exact caller path / test / command that proves it (Rule 19 — no "should be fixed").
- For deploys: the §4.9-style probe (health + deployed-chunk marker), not local green alone.
- **Security boundary / multi-module work → INDEPENDENT-pass dry-loop** (Sean 2026-07-22):
  self-review is the author reviewing itself — its "CLEAN×2" is not "an independent complete
  pass finds zero." Dispatch fresh subagent reviewers (attacker remit, read the whole surface)
  and converge on TWO CONSECUTIVE independent zero-material passes; a fix resets the count.
  Full procedure: closeout-evidence-lock Section 3 item 7. (Proven: self-review missed 32 real
  defects incl. 2 HIGH leaks on the Context Gateway that independent passes then caught.)

### Gate 5 — REPORT calibrated
- Blockers first, then what was verified, then residual risk (Dual-Pass step 6).
- Confidence tags on non-trivial claims (Rule 51). Slice-clean vs baseline-clean disclosed (Rule 56).
- Own mistakes plainly, stay on the problem, keep self-respect — no groveling, no spin.
- Answer even an ambiguous query first; then at most ONE clarifying question.
- Close with the Rule 60 next-slice line.

## 3. Standing habits (Fable tells, kept even under time pressure)

1. **One honest slice** over a sprawling half-verified batch (hermes-os principle §12).
2. **Deterministic before agentic:** if a script/grep/AST walk can answer it, don't spend model
   reasoning on it (Rule 49 launchers; the second-brain retrieval doctrine).
3. **Surprise = signal.** An unexpected result is never "close enough" — it's the thread to pull.
4. **Write the continuation state** before context runs out (lane file + progress ledger). The loop
   survives sessions; it must not survive silent scope drift (hermes-os handoff §11).
5. **Least clicks for Sean.** Every ask of Sean is batched, concrete, and decision-shaped.

## 4. Effort calibration (don't default to max)

| Task shape | Effort | Note |
|---|---|---|
| Signal fact, status read, mechanical edit | low | 1 probe is enough |
| Medium task (typical slice, review, plan) | medium–high | 3–5 verification probes |
| Deep research / comparison / hard root-cause | high–xhigh | 5–10 probes; adversarial verify |
| Final-decider arbitration, security core | xhigh–max | reserve max for judge/verify stages |

**Overthink warning [VERIFIED in transcript testing]:** xhigh/max on routine work runs longer, costs
more, second-guesses itself, and can produce WORSE output than high. Higher effort is not
monotonically better — match effort to task, and prefer one tier down when in doubt.

## 5. Model routing table (orchestrator-smart / executor-cheap)

Cost = subjective cheapness score (higher = cheaper). Intelligence = reasoning/review depth.
Taste = design/creative judgment. House constraints: Rule 12 (no Grok, ever), Rule 16 (paid Village
asks Sean first), Rule 8 (zero PII to any of them).

| Model | Cost | Intel | Taste | Use for |
|---|---|---|---|---|
| Fable 5 (while available) | 1 | 5 | 5 | Final decisions, plan authoring (Rule 68), security cores, the hardest verify |
| Opus 4.8 | 2 | 4.5 | 4 | Deputy decider, hard builds, hostile review, fable-mode host |
| Sonnet (4.6/5) | 3.5 | 4 | 3.5 | Slice execution from a Fable-grade plan, code review at scale |
| Haiku 4.5 | 5 | 3 | 2.5 | Scouts, fan-out search, mechanical sweeps, inventory |
| Codex | 3 (sub) | 4 | 3 | Hostile review lane, backend heritage lanes, independent verification |
| Gemini 3.1 Pro | 4 (sub) | 4 | 4.5 | Design authority/CTO consult (`consult-gemini.mjs`) |
| Local Qwen3 (Hermes 5090) | 5 ($0) | 3 | 2 | Hermes brain, privacy-first ops, offline; never SwanStudios prod decisions |

**The empirical law (transcript-verified twice, Fable+Sonnet vs Fable+Fable, and Opus+Haiku vs
Opus+Opus): a smart orchestrator with cheap executors ≈ same output quality at ~3× less cost.**
Apply it every time you spawn subagents or a Workflow:

- The SMART model (Fable/Opus in fable-mode) scopes, designs the workflow, writes worker prompts
  with acceptance criteria, and verifies/arbitrates results.
- CHEAP models (Sonnet/Haiku) execute bounded, well-specified stages and report back raw data.
- Escalate a stage's model tier only when its output demonstrably fails the acceptance bar —
  don't pre-pay for intelligence a stage doesn't need.
- Verify/judge stages may run one tier UP from execution stages (diversity beats redundancy).

## 6. Interplay with existing gates (this skill replaces nothing)

`grill-me` (intent) → `chromie` (unproven bets) → `swan-orchestrator` (pre-task) →
`swan-design-router` (UI) → build → `closeout-evidence-lock` (closeout) all still run. Fable-mode is
the WORKING DISCIPLINE inside those gates, not a bypass. Fusion tiers (Rule 46 / fusion-router)
still pick the review panel; fable-mode governs how THIS model works between the gates.
