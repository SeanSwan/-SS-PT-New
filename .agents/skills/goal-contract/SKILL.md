---
name: goal-contract
description: Use when the user explicitly requests a persistent goal or when a long, mechanical execution slice needs measurable acceptance, validation, checkpoints, and stop conditions. Never create or update a Codex goal unless the user explicitly asks for a goal.
---

# Goal Contract

Turn an outcome into a bounded, auditable execution contract. Autonomy comes from measurable stop conditions, not unlimited scope.

## Entry Gate

Use this skill when:

- the user explicitly says to create, pursue, resume, or keep working toward a goal;
- a long execution slice has a clear destination but needs durable checkpoints;
- success can be expressed as observable evidence.

Do not use it to make a fuzzy product decision. Use `wayfinder` or `grill-me` first.

## Codex Goal Authority

Only call `create_goal` when the user explicitly requests a goal. Only call `update_goal` under its runtime rules. Writing this contract does not itself authorize either call.

## Contract Immutability

After execution starts, the verified baseline and acceptance criteria are immutable. Do not weaken, delete, reinterpret, or silently replace them to make progress appear successful. A material change requires explicit user re-approval and an append-only evidence-log entry containing the old value, proposed value, reason, approver, and timestamp. Never rewrite history in place.

## Write the Contract

Record:

```markdown
# Goal Contract: <title>

Objective: <single observable outcome>
Authority: <what the user authorized>
Baseline: <current verified state>

## Acceptance
- <observable result>

## Validation
- <exact command, route, artifact, or external proof>

## Constraints and Non-Goals
- <security, privacy, spend, branch, production, and scope boundaries>

## Checkpoints
- C1 <durable intermediate state>

## Stop Conditions
- COMPLETE when: <all required evidence exists>
- ESCALATE when: <new authority or material decision is needed>
- BLOCKED when: <runtime blocked threshold is actually met>

## Evidence Log
- <timestamp or phase>: <artifact and result>

## Uncertainty Register
| Decision | Status | Evidence | Alternative | Needs user? |
|---|---|---|---|---|
```

## Execute

1. Verify the baseline before changing state.
2. Work one bounded checkpoint at a time.
3. Update the evidence log with results, including failures.
4. Re-evaluate the next checkpoint against remaining acceptance criteria.
5. Stop immediately when new authority is required.
6. Claim completion only after fresh validation covers every acceptance item.
7. Any delegated agent inherits this contract's authority, constraints, immutable acceptance, and stop conditions verbatim. Delegation cannot expand authority.

## Anti-Reward-Hacking Rules

Never:

- weaken or delete a test to make the goal pass;
- silently redefine success, scope, or the target metric;
- hide failed checks or contradictory evidence;
- replace real caller-path proof with a convenient mock;
- continue beyond the authorized scope because another improvement is nearby;
- mark a goal complete merely because time or tokens are low.

## Uncertainty and Decisions

Classify material decisions as `VERIFIED`, `REVERSIBLE`, or `NEEDS_USER`. Proceed with a reversible default only when rollback is cheap and the choice cannot affect security, billing, data, production, or product direction. Otherwise surface one blocking choice with a recommendation.

The contract's `## Uncertainty Register` is canonical for this mode. At closeout, promote every unresolved `NEEDS_USER` entry into the handoff's first blocking question; do not duplicate it into a competing register.

## Closeout

Report the objective, acceptance results, exact verification evidence, remaining risks, and whether the persistent goal state was changed. Route substantial project work through the normal closeout skill as well.
