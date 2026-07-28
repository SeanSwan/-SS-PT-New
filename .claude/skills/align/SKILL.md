---
name: align
description: Fast intent-alignment check before acting. When invoked (/align, "align on this", "make sure we're aligned"), ask Sean a short batch of targeted clarifying questions about the FINAL intention of the task — goal, scope, non-goals, constraints, and success criteria — then restate the aligned plan in a few lines and proceed only after confirmation. Lightweight sibling of grill-me: grill-me is the deep one-question-at-a-time intent-extraction gate for net-new builds; align is the 60-second version for tasks that just need a quick sync before work starts.
---

# Align

**Origin:** harvested 2026-07-16 from an external creator's `/align` skill demoed in a Claude Code + GPT-5.6 Sol workflow video. Adapted to SwanStudios conventions.

**Role:** a cheap pre-flight alignment pass. Before starting a task where the intent could plausibly be read more than one way, surface the ambiguity in ONE compact question batch instead of guessing (Karpathy principle 1: think before coding, don't pick silently).

## When to invoke
- Sean types `/align` or says "align," "make sure we're on the same page," "check with me first."
- Any task where two materially different deliverables both fit the prompt and grill-me (rule 64) would be overkill.

## Method
1. Read the request and the relevant repo context first — never ask what the codebase can answer (rule 18, rule 49).
2. Ask ONE batch (3-6 questions max) via `AskUserQuestion` where options are discrete, covering: goal/outcome, scope + explicit non-goals, constraints (design/security/data), and what "done" looks like. Lead each question with a recommended answer + one-line reason.
3. Restate the aligned plan in ≤5 lines (deliverable, scope, verification).
4. Proceed on confirmation. If answers reveal a net-new surface or unproven bet, route to `grill-me` → `chromie` instead (rules 64-65).

## Not this skill
- Deep vision extraction → `grill-me`.
- Strategy pressure-test → `chromie`.
- Trivial/unambiguous tasks → just do them; align adds a round-trip only when ambiguity is real.
