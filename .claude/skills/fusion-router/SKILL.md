---
name: fusion-router
description: Auto-selects the best AI-collaboration tier for a task and asks Sean's permission before spending effort/credits. At the start of a substantial task it classifies the work and recommends one of the four fusion tiers — 0 lazy Claude+Codex pair-coding, 1 duo fusion, 2 triangle fusion (Claude+Codex+Gemini via the polling board, the everyday workhorse), 3 paid AI Village (must-be-right) — then confirms with Sean (mandatory for the paid tier) or honors a manual override ("use the triangle", "paid village", "just code it"). The decision layer on top of ai-village-fusion. Invoke at the start of any non-trivial coding/decision task, or when Sean says "router", "which tier", "pick the best one".
---

# Fusion Router

**Role:** the auto-pick-the-tier gate. Sean (2026-06-15): *"automate this as much as possible — when doing prompts it'll just kick in and choose which is the best one depending on the situation, but ask my permission first on how we wanna code from the get-go, or if I want it I can bring it up."*

So: classify the task → recommend the best tier → **get Sean's go-ahead before proceeding** (always for paid; a quick confirm for free fusion; just proceed for trivial) → route to `ai-village-fusion`. Sean can override anytime.

This sits ABOVE `ai-village-fusion` (which runs the tiers) and beside `prompt-watcher` (which sharpens the prompt). prompt-watcher decides *what* the prompt means; fusion-router decides *who* should work it.

## When it kicks in
- At the **start of a substantial task** (a feature, a redesign, a hard bug, an architecture/"is this right" call, a plan review) — like `swan-orchestrator`, run this first.
- When Sean names it ("router", "which tier", "pick the best") or names a tier ("triangle", "duo", "village", "just code it").
- NOT on trivial/conversational turns (typo, one-line fix, status question) — those are Tier 0, just do them.

## Step 1 — Classify the task → recommend a tier

| Signals in the task | Recommend | Why |
|---|---|---|
| Trivial, mechanical, single clear file, low risk | **Tier 0** (pair-code / just do it) | fusion adds nothing; don't burn time |
| Quick "what do you think / sanity-check" worth a 2nd model | **Tier 1** (duo: Claude+Codex) | one cross-model second opinion, ~free |
| Everyday hard call: architecture, design, plan review, "is this right", divergent options, refactor strategy | **Tier 2 triangle** (Claude+Codex+Gemini) — DEFAULT WORKHORSE | diverse panel + synthesis, ~free on subs |
| Must-be-right / high-stakes: auth, billing, Stripe, multi-tenant scoping, security, minors' data, legal, irreversible migration, pre-launch hardening — or Sean says "be thorough / I extremely must have the right answer" | **Tier 3 paid Village** | full ~13-brain depth + debates + Opus/Fable judge; worth real credits |

Bias: when unsure between two, pick the **lower** tier (cheaper/faster) and say what the higher tier would add. The triangle is the everyday default; the paid Village is the exception, used least.

## Step 2 — Permission gate (the "ask first" rule)

- **Tier 0** → just proceed. No permission prompt (asking on trivial work = fatigue).
- **Tier 1 / 2 (free)** → state the recommendation + one-line why, and proceed unless it's genuinely ambiguous which tier fits — a quick confirm is fine, but these cost ~$0 so don't over-gate. If Sean has said "always use the triangle," auto-route to Tier 2 without asking.
- **Tier 3 (paid) → ALWAYS ask first.** It spends real credits (Rule 16). Show the recommendation + that it's the paid Village + the spend gate (`SWAN_VILLAGE_MAX_USD`, estimate+confirm). Never launch the paid Village without an explicit yes.
- **Manual override always wins:** "use the triangle" / "paid village" / "duo" / "just code it" → use that tier directly, skip the recommendation.

Use `AskUserQuestion` when you genuinely need Sean to choose (especially Tier 2-vs-3 on a borderline high-stakes task); otherwise state the pick inline and go.

## Step 3 — Route
Hand off to `ai-village-fusion` with the chosen tier:
- Tier 0 → proceed with normal Claude+Codex work (Rule 67 pair-coding).
- Tier 1/2 → the free polling board (`scripts/fusion-triangle.mjs` for the triangle; duo = same launcher with `--agents claude,codex`). Gemini auto-uses the best available Pro (Pro-first model chain, falls back to flash only when Pro is throttled).
- Tier 3 → `node scripts/validation-orchestrator.mjs …` (spend-gated), **then chain into Tier 2 — see below.**

### Tier 3 ALWAYS chains into Tier 2 (Sean's rule, 2026-06-16)
The paid Village is a **deep-analysis stage, never the final word.** Whenever a Tier 3 run happens, its `synthesis.md` is fed to a **Tier 2 triangle** (Claude+Codex+Gemini) as the input, and **the triangle's synthesis is the FINAL verdict** (closed by the Final Decider chain Fable→Opus→Codex). A high-stakes task therefore runs: **Village (deep) → triangle (ratify) → final.** This catches the Village's blind spots / over-reach with the trusted everyday panel and keeps the Decider as the closer. (Tiers 0–2 do NOT chain — only Tier 3 → Tier 2.) The triangle ratify-pass is free (subscriptions), so the chain adds rigor at ~$0 on top of the paid run.

## How "auto kick-in" is wired
- **WIRED on every prompt (Sean approved 2026-06-16):** the `prompt-watcher` UserPromptSubmit hook (`scripts/hooks/prompt-watcher.mjs`) now emits a one-line fusion-tier nudge alongside its SIMPLE/VISION classifier, so the tier decision fires automatically on every prompt — no one has to remember to invoke this skill. The model decides whether a review is warranted: trivial → just do it; substantial → triangle (default); high-stakes → propose the paid Village and ask first.
- **Per-prompt fatigue guard:** only the paid tier (Tier 3) ever forces a confirmation (Rule 16). Free tiers proceed; trivial/conversational turns skip fusion entirely.
- **Also still a pre-task gate:** apply this skill explicitly at the start of substantial tasks (like `swan-orchestrator`) when you want the full tier-selection procedure, not just the hook nudge.

## Guardrails
- **Spend (Rule 16):** Tier 3 needs explicit permission every time. Free tiers never spend API credits (flat-rate subs).
- **Self-improvement is propose-only** (Sean's standing rule): if this router's heuristics should change, propose the edit; apply on Sean's yes.
- **Privacy (Rule 8):** routing reasoning and fusion files use IDs/roles only.
- **Final Decider chain:** Fable → Opus/Claude → Codex governs the judge/Decider in whatever tier runs.

## Related
- `.claude/skills/ai-village-fusion/SKILL.md` — the four tiers this routes to
- `scripts/fusion-triangle.mjs` — Tier 1/2 launcher (polling board, Gemini Pro-first chain)
- `scripts/validation-orchestrator.mjs` — Tier 3 paid Village
- `.claude/skills/prompt-watcher/SKILL.md` — sharpens the prompt (complementary, runs alongside)
- `.claude/skills/swan-orchestrator/SKILL.md` — the broader pre-task rule gate
