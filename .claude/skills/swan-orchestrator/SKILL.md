---
name: swan-orchestrator
description: Pre-task gate for SwanStudios work. Classifies normal, Wayfinder, goal-contract, guided-setup, and workspace-isolation modes, then enforces recursive planning, dual-pass completion, canonical surface receipts, and repo-hygiene triggers before implementation.
---

# Swan Orchestrator

**Role:** pre-task gate. Converts CLAUDE.md rules from advice into gates by refusing to proceed without the required artifacts.

This skill exists because Claude has demonstrably skipped rules 15, 17, 26, and 32 under time pressure. A pre-task skill that runs first and produces a structured "go/no-go" checklist forces those rules to be satisfied in artifact form, not just in intent.

## Trigger

Invoke at the start of any task that is:
- A non-trivial feature build
- A bug fix that touches more than a single line
- A UI redesign or visual work
- A route/API contract change
- A dashboard audit or visibility work
- A refactor
- A fresh session where the task category is not immediately obvious

Do NOT invoke for:
- A single-typo fix
- A comment-only change
- Reading/exploring with no plan to modify

## Front-door environment and mode classification

Run two passes before producing the project gate:

1. **Environment preflight (always before mutation):** classify the checkout. Dirty, stale, shared, concurrent, or otherwise risky work runs `worktree-isolation` and produces its receipt before any execution mode.
2. **Execution mode:** choose the smallest mode after workspace safety is resolved.

| Condition | Route |
|---|---|
| Clear and finishable in one focused session | Continue with this orchestrator |
| Multi-session and materially foggy, even when partly mechanical | Run `wayfinder` first; downgrade a clarified long slice to `goal-contract` |
| Clear destination with a long mechanical slice | Write a `goal-contract`; create a persistent goal only when the user explicitly asks |
| Installation, authentication, deployment setup, environment wiring, or unfamiliar tooling | Use `guided-setup` |

Record the workspace result, selected mode, and why. Do not use Wayfinder for clear work merely because it is large, and do not create a persistent Codex goal implicitly.

## Output (mandatory)

Produce this checklist in the task thread before any implementation work:

```
=== SWAN ORCHESTRATOR PRE-TASK GATE ===

TASK TYPE: [feature | bugfix | ui-redesign | api-contract | audit | refactor | other]
TASK SCOPE: [one-sentence description]

RULE 15 — Recursive planning:
  [ ] Exhaustive plan written OR explicit reason why not
  [ ] Plan names specific files + functions to touch
  [ ] Plan names failure modes considered

RULE 26 — Canonical Surface Receipt (UI/data-truth tasks only):
  [ ] Route file actually mounted: [file:line]
  [ ] Mounted JSX component: [file:line]
  [ ] Consumer hook/service: [file:line]
  [ ] Exact frontend API path: [string literal]
  [ ] Backend route match: [file:line]
  [ ] Authoritative model fields: [model file:line]

RULE 27 — Surface Classification (if competing surfaces exist):
  [ ] Classification table produced with file:line evidence
  [ ] No ambiguous rows unresolved

RULE 29 — Schema Cross-Check (model-touching tasks):
  [ ] Real column list quoted
  [ ] Repo-wide grep done
  [ ] Drift table produced

RULE 31 — Route Ownership / Shadow Audit (API-touching tasks):
  [ ] Mount-order walk done for touched path
  [ ] Overlapping sibling paths listed
  [ ] Shadowing condition called out if present

RULE 32 — Repo Hygiene Scan (if trigger applies):
  [ ] Hygiene scan run OR explicit reason why not

RULE 17 — Dual-pass plan:
  [ ] Hostile review checklist understood for this task type
  [ ] Verification plan named

MODE: [normal | wayfinder | goal-contract | guided-setup]
WORKSPACE: [read-only-audit | shared-lane | isolated-worktree | stale-or-dirty]

DISPATCH:
  [ ] worktree-isolation      (if workspace requires it)
  [ ] wayfinder               (if multi-session + materially foggy)
  [ ] goal-contract           (if a clear long slice needs measurable stop conditions)
  [ ] guided-setup            (if setup interaction is the task)
  [ ] swan-design-router      (if UI/visual work)
  [ ] canonical-surface-audit (if rule 26 not already satisfied)
  [ ] repo-hygiene-scan       (if rule 32 triggered)
  [ ] closeout-evidence-lock  (always, at end)

STATUS: [GO | BLOCKED — reason]
```

Do not proceed to implementation if any mandatory box is unchecked for the task type. If a box is not applicable, mark it N/A and state why.

## Dispatch rules

- **UI/visual work** → `swan-design-router` drives the implementation; this orchestrator runs first
- **Route/data-truth bug** → `canonical-surface-audit` runs first to produce the surface receipt, then implementation
- **Repo-structural work or fresh confusing session** → `repo-hygiene-scan` runs first
- **Foggy multi-session planning** -> `wayfinder` resolves the frontier before this gate
- **Long measurable execution** -> `goal-contract` defines acceptance and stop conditions
- **Unsafe workspace** -> `worktree-isolation` verifies the baseline before edits
- **Setup walkthrough** -> `guided-setup` owns one-step progression
- **All tasks** -> `closeout-evidence-lock` runs at the end

Multiple dispatches are allowed and often required. E.g., a UI fix on a dashboard surface needs canonical-surface-audit (is this the live surface?) + swan-design-router (how do I make it premium?) + closeout-evidence-lock (can I claim this is fixed?).

## Hard rules this skill enforces

1. **No implementation before the gate output exists in the task thread.** If Claude starts editing files without producing the gate checklist, the session violates this skill.
2. **No "I'll plan as I go" escape.** Rule 15 is mandatory; the gate forces it up front.
3. **No dispatching to non-Swan design skills by default.** Design work goes to `swan-design-router`, not `frontend-design`, not `ui-ux-pro-max`, not `high-end-visual-design`.
4. **No dispatching to `requesting-code-review`.** It depends on missing `superpowers:code-reviewer` infrastructure. Use `closeout-evidence-lock` instead, which preserves the substantive review checklist.
5. **No implicit persistent goal.** A goal contract does not authorize `create_goal`; the user must explicitly request a goal.
6. **No bypass or authority expansion by subagent.** Spawning an Explore or general-purpose agent does not skip this gate. Every subagent inherits the parent mode's authority, constraints, acceptance, exclusions, and stop conditions verbatim; its output remains a hypothesis (rule 30), and the gate still needs to be satisfied manually after it reports.

## Integration with existing CLAUDE.md flow

This skill does not replace CLAUDE.md rules — it is the execution surface for them. CLAUDE.md says what must happen; this skill is the reproducible procedure for how to produce the required artifacts.

## Non-goals

- Does not make design decisions (that's `swan-design-router`)
- Does not perform audits (that's `canonical-surface-audit`)
- Does not write code
- Does not produce closeouts (that's `closeout-evidence-lock`)