---
name: cost-guard
description: Cost-discipline gate for paid AI and expensive multi-file operations. Fires BEFORE any spend on OpenRouter / paid model APIs (consult-fable/consult-sol/consult-kimi/validation-orchestrator), any large-context or high-max-tokens call, or any operation that fans many files through a model. Forces logical cost thinking — consolidate before expensive review, right-size effort/tokens, prefer free tiers, estimate + confirm before spend, scope the input — so gigantic chunks of money are never burned on API calls by reflex. Invoke at the start of any task that will call a PAID model or process many files, or when Sean says "make it cheaper", "cost", "how much", "don't spend".
---

# Cost Guard — think logically about spend BEFORE you call

**Role:** money is a first-class constraint, not an afterthought. This skill fires before any paid or expensive operation and forces the cheap-and-correct path. Sean's standing budget signal: **a single review/synthesis run should target ≤ $3, hard ceiling ~$5.** Bigger spends need an explicit estimate + his confirm (Rule 16). The goal is not "never spend" — it is "never spend by reflex."

## When this fires
- ANY call to a PAID model: `consult-fable.mjs`, `consult-sol.mjs`, `consult-kimi.mjs` (OpenRouter), `validation-orchestrator.mjs` (paid AI Village), or any direct OpenRouter/API request that bills.
- ANY call with a raised `--max-tokens` / high `--effort`, or a large document/context.
- ANY operation that would fan **many files** through a model (reviewing/summarizing N docs, "run all the blueprints through", whole-repo passes).
- Whenever Sean asks "how much", "make it cheaper", "cost", "don't spend a lot".

## The 6 rules (apply in order, every time)

**1. Consolidate before the expensive brain — map-reduce, don't broadcast.**
Never feed N raw documents to an expensive model. Have a CHEAP or FREE step (you, the free triangle, or a cheap model) synthesize the N docs into ONE report, then let the expensive brain (Fable/Sol) review the single report.
- Proven this session: full 19-brain Village over 15 blueprints with Fable ≈ **$20-40**; the same panel reviewing ONE consolidated report ≈ **~$1**. Same signal, 1/20th the cost.

**2. Right-size effort and tokens — defaults, not maximums.**
`--effort medium` unless the task genuinely needs deep reasoning; `high` can burn the whole budget on internal reasoning and return an empty/truncated answer (billed for nothing). Raise `--max-tokens` ONLY for outputs that legitimately need it (a big build-exact blueprint), never as a default — the cap only bills for tokens actually generated, but high effort + a high cap together invite runaway reasoning spend.

**3. Prefer free before paid.**
Free/flat-rate tiers first: subscription Claude (you), Codex (pair lane), Gemini (subscription or `consult-gemini.mjs` API is cheap), the free triangle. Reserve paid OpenRouter (Fable $10/$50, Sol $5/$30, Kimi $3/$15 per M) for the step that genuinely needs that specific brain. If YOU can produce the artifact for free, do it — don't pay a model to do what you can.

**4. Scope the input — send only what's needed.**
Don't paste whole files/repos when a section, a diff, or a summary carries the signal. Extract the structured signal (verdict, headers, key claims) and send that. Input tokens are billed too.

**5. Estimate, then confirm, before any non-trivial spend.**
For the paid Village, run the orchestrator's built-in estimator (`evaluateSpendGate` — it aborts before spending if over `SWAN_VILLAGE_MAX_USD`). For solo paid calls, state the rough cost (input+output × the model's per-M price) and get Sean's go if it's over ~$3. Never fire a paid run blind (Rule 16).

**6. Don't re-fire blind — check the result first.**
Before re-running a failed/empty paid call, diagnose WHY (effort exhaustion? timeout? wrong flag?) and fix the cause, so the retry isn't a second wasted charge. Verify a call actually produced usable output (not "(empty response)", not truncated) before treating it as done.

## Anti-patterns (reject on sight)
- Feeding 15 documents to Fable to "review the set" → consolidate to one report first (rule 1).
- `--effort high --max-tokens 100000` as a default on every call → right-size (rule 2).
- Paying a model to summarize/index/compare what you could do for free (rule 3).
- "Run the whole repo through" / broadcasting every file to every brain (rules 1+4).
- Re-firing a choked call without fixing the cause (rule 6).
- Firing a paid Village/synthesis without an estimate + Sean's confirm (rule 5, Rule 16).

## The one-line test before any spend
> "Is this the cheapest path that still gets the real answer? Have I consolidated, right-sized, and checked free options — and does the spend fit Sean's ≤$3/$5 target or have his explicit go?"
If you can't answer yes, stop and fix the plan before you call.

## Provenance
Distilled from the 2026-07-17 KIMI-blueprint session: the choke tax (empty responses at high effort, truncation at the 16k cap, an abort at the 10-min timeout — all billed), and Sean's insight that Fable reviewing ONE consolidated report instead of 15 blueprints cuts a $20-40 run to ~$1. Cross-references: Rule 16 (paid Village permission + estimate), Rule 50 (Tier-C spend-gated), `scripts/lib/cost-gate.mjs` (the hard cap + estimator), fusion tiers (free triangle before paid Village).
