# Prompt Reconstruction + Hostile Review Protocol

**Status:** Active operating protocol  
**Owner:** Sean / SwanStudios AI workflow  
**Applies to:** Claude, Codex, Hermes, Fable, local AI reviewers, and any agent writing plans, prompts, specs, docs, tickets, or implementation slices for SwanStudios.

## Purpose

Before an agent creates a plan, prompt pack, spec, documentation bundle, implementation ticket, or substantial code/design slice, it must first make sure it understands the real goal and is not blindly obeying a weak prompt.

This protocol is especially important for Fable-class work because the highest-leverage model should improve the task framing before spending expensive reasoning or output tokens.

## Core Rule

Before creating anything substantial, the agent must:

1. **Reconstruct the goal.** Restate what Sean is really trying to accomplish in plain language.
2. **Audit the prompt.** Identify gaps, contradictions, vague wording, missing context, overreach, and likely failure modes.
3. **Identify weak assumptions.** Call out any assumption that could cause wrong work, wasted code, unsafe automation, poor UX, or token waste.
4. **Improve the prompt or plan.** Produce a sharper version of the task, with clearer scope, constraints, acceptance criteria, and what not to do.
5. **Execute the improved version.** Once the improved framing is strong enough, act without over-planning.
6. **Prove the result.** Before claiming completion, cite the evidence: file reads, tests, command output, screenshots, route receipts, or other reproducible checks.

## Fable / Highest-Leverage Model First Deliverable

When Fable, Claude, or another top-tier model is given a broad prompt, its first deliverable must be:

> **Prompt Reconstruction + Hostile Review**

Only after that should it write docs, specs, prompts, code plans, or implementation instructions.

## Hank Transcript Principles Applied

This protocol operationalizes the prompting principles Sean approved:

- **Give the why.** Explain the business/product/user reason behind the work.
- **Say what not to do.** Explicitly block scope creep, unsafe actions, fake data, unnecessary rewrites, and token bloat.
- **Let it act when it has enough.** Do not stall forever in planning when the next action is clear.
- **Make it prove work with evidence.** Completion claims require a verified caller path, test, file read, or other proof.
- **Say less where possible.** Prefer compact, high-signal prompts and docs over impressive but bloated output.
- **Do not ask for private reasoning.** Ask for conclusions, evidence, tradeoffs, and concise rationale summaries, not hidden chain-of-thought.

## Required Output Shape

For substantial prompts/plans, the agent should respond in this order:

1. **Goal Reconstruction**
   - What Sean is trying to accomplish.
   - Why it matters now.
   - What success looks like.

2. **Hostile Review of the Prompt / Plan**
   - Weak assumptions.
   - Missing evidence.
   - Scope risks.
   - UX/business risks.
   - Safety/security/data risks.
   - Token-waste risks.

3. **Improved Task Framing**
   - Sharper objective.
   - Files/surfaces to inspect.
   - What not to touch.
   - Acceptance criteria.
   - Required verification.

4. **Execution or Handoff**
   - Execute if safe and scoped.
   - Otherwise produce a precise handoff prompt/spec/ticket for the right model/persona.

5. **Evidence / Verification**
   - Tests run, file evidence, route evidence, screenshot evidence, or explicit `[UNVERIFIED]` gaps.

## What Not To Do

Do not:

- blindly follow a broad prompt without improving it first
- write a huge plan when a smaller slice is needed
- claim a prompt/spec/code change is complete without evidence
- ask Sean to repeat context already present in the repo or conversation
- expose private reasoning or ask another model to expose private reasoning
- make unsafe self-upgrades or app mutations without confirmation
- route every task to the strongest model when a cheaper/local model can handle it
- let hostile review become vague criticism without concrete fixes
- move to implementation before the success criteria are clear

## Hostile Review Severity

Use these severities when reviewing prompts or plans:

- **P0:** Could cause security, billing, client-data, production, or legal harm.
- **P1:** Could block launch, revenue, onboarding, schedule, workout logging, or client confidence.
- **P2:** Could cause poor UX, maintainability problems, token waste, or future rework.
- **P3:** Polish, naming, formatting, or optional improvement.

## Stop Condition

For recursive work:

1. Implement or rewrite one slice.
2. Run hostile review.
3. Fix the findings.
4. Review again.
5. Move to the next slice only when there are no meaningful P0/P1/P2 findings left, or Sean explicitly accepts the remaining tradeoff.

## Compact Fable Prompt Pattern

Use this pattern when handing a substantial task to Fable:

```text
Before creating anything, reconstruct the goal, audit this prompt, identify weak assumptions, improve the prompt, then execute the improved version.

Apply these rules:
- Give the why.
- Say what not to do.
- Act when you have enough information.
- Prove completion with evidence.
- Keep output as short as possible while still useful.
- Do not reveal or request private reasoning.

First deliverable: Prompt Reconstruction + Hostile Review.
Second deliverable: Improved prompt/plan.
Third deliverable: Execution or precise handoff.
```

## Relation To Existing Rules

This protocol complements:

- Rule 15: Recursive planning before building.
- Rule 17: Dual-pass completion / hostile review.
- Rule 19: No speculative success language.
- Rule 26: Canonical Surface Receipt.
- Rule 41: Closeout evidence lock.
- Rule 51: Confidence-tag discipline.
- Rule 57: Dual-tier summaries for substantial work.

It should be linked from `CLAUDE.md` and `AGENTS.md` near the Karpathy principles or Mandatory Rules section so every agent sees it before planning or creating substantial work.
