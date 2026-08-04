---
name: wayfinder
description: Use only when work is both expected to span multiple focused sessions and materially foggy because unresolved product or architecture decisions block a trustworthy bounded plan. Skip clear multi-session execution and anything finishable in one session.
---

# Wayfinder

Map uncertain multi-session work without pretending the implementation is already known.

## Entry Gate

Use Wayfinder only when both conditions are true:

1. The effort will span more than one focused session.
2. Material product or architecture decisions remain unresolved, so a trustworthy bounded implementation plan cannot yet be written.

Supporting signals include research or prototype branches, blocking decision dependencies, and a need for a future agent to resume without reconstructing context from chat.

Exit early when either condition is false. Clear multi-session execution belongs in the project's canonical tracker and orchestrator, not Wayfinder.

When a multi-session task is partly mechanical but still has material decision fog, Wayfinder wins first. As soon as the blocking fog is resolved, freeze the decision map and downgrade the clarified mechanical slice to `goal-contract`.

## Authority and Storage

- Treat repo evidence as authoritative and model output as advisory.
- For SS-PT, Linear remains canonical cross-session implementation status when external writes are authorized.
- Default to local decision evidence under `docs/ai-workflow/wayfinder/<topic>/` when tracker writes are not authorized or no tracker is configured.
- A local map is not an implementation backlog. It records fog, decision provenance, and links to canonical work; it does not duplicate implementation task status.
- Use an external issue tracker only when the user explicitly authorizes external writes for the current session, names the tracker, and scopes whether ticket creation, ticket updates, or both are allowed. Tracker authority is separately granted and revocable; it does not flow from worktree or implementation authority.
- Never copy secrets, PII, raw production records, tokens, or private infrastructure details into maps or tickets.
- Follow the active project's instruction files, coordination rules, and approval gates.

## Create the Map

Create `map.md` with:

```markdown
# Wayfinder Map: <topic>
Status: active | paused | resolved
Destination: <observable end state>
Why now: <business or user value>
Canonical tracker: <project/issue links or local-fallback>

## Known Terrain
- <verified fact with file, command, route, or source evidence>
## Fog
- <unresolved question and why it matters>
## Frontier
- <open + unblocked + unclaimed decision ticket IDs>
## Decisions
- D-001 <decision> - open | decided | superseded
## Decision Ticket Graph
- T-001 <decision ticket> - blocks: <ticket IDs or none>
## Out of Scope
- <explicit exclusion>
## Primary Sources
- <repo path, issue, transcript, or authoritative URL>
```

Write the destination before decision tickets. It must be observable; avoid goals such as "make it better."

## Create Decision Tickets

Use one decision-ticket type:

1. `RESEARCH-AFK` - bounded evidence gathering without user input.
2. `PROTOTYPE-HITL` - a reversible prototype requiring human judgment.
3. `GRILL-HITL` - one unresolved product decision only the user can make.
4. `PREREQUISITE-AFK` - mechanical evidence needed before another decision is answerable.

Each ticket contains:

```markdown
# <ID>: <title>
Type: RESEARCH-AFK | PROTOTYPE-HITL | GRILL-HITL | PREREQUISITE-AFK
Status: open | resolved | superseded
Blocks: <IDs or none>
Blocked by: <IDs or none>
Claimed by: <agent/lane or none>
Claimed at: <timestamp or none>
Decision served: <decision ID>
Canonical tracker link: <issue URL/ID or local-fallback>

## Question
<one question this ticket resolves>
## Evidence Needed
- <specific artifact or observation>
## Acceptance
- <observable resolution condition>
## Exclusions
- <what this ticket must not expand into>
## Result
<fill when resolved, with source links>
```

Keep one primary question per ticket. Preserve links to the evidence that caused the decision.

## Frontier and Claims

The frontier is exactly the set of decision tickets that are `open`, have no unresolved blocker, and are unclaimed.

1. Claim a frontier ticket in the canonical tracker before work. In local fallback, fill `Claimed by` and `Claimed at` atomically before research or delegation.
2. Never work a ticket claimed by another active lane.
3. Release a stale claim only after checking the coordination ledger and recording why.
4. Resolve the ticket at one canonical source; the map stores only a linked gist.
5. Parallelize only independent `RESEARCH-AFK` tickets when the user or runtime rules allow delegation.
6. Run at most one interactive decision ticket per session.
7. Delegated agents inherit the parent ticket's exclusions, authority, acceptance, and stop conditions verbatim. They cannot expand scope, perform external writes, or escalate authority on their own.

## Order the Work

1. Resolve blocking decision dependencies first.
2. Keep planning and implementation separate.
3. Produce a spec only when the destination or project rules require one; a direct decision or bounded change may hand off without a new spec.
4. Once fog is sufficiently cleared, freeze the map as decision evidence and create or link implementation work in the canonical project tracker.
5. In local fallback, hand off one bounded implementation slice with acceptance and verification; do not build a second local implementation backlog.
6. End each session by updating decisions, claim state, frontier, and primary-source links.

## Decision Discipline

Classify consequential assumptions:

- `VERIFIED` - supported by current evidence.
- `REVERSIBLE` - safe to proceed with a documented default.
- `NEEDS_USER` - product, security, billing, data, or irreversible choice requiring the user.

Surface only the next blocking `NEEDS_USER` decision. Recommend one option and state the tradeoff; do not dump the whole decision tree on the user.

The map's `## Decisions` section is canonical for Wayfinder decision state. At session close, unresolved entries must become the next session handoff's first blocking question, linked back to the map. Do not copy the same decision into a second local register.

## Integration

- Use `grill-me` for deep intent extraction inside a `GRILL-HITL` ticket.
- Use `goal-contract` after the destination is clear and a long mechanical slice needs measurable stop conditions.
- Use `worktree-isolation` before implementation when the checkout is dirty, shared, stale, or concurrent.
- Use `swan-orchestrator` for the project pre-task gate.
- Use `closeout-evidence-lock` before any completion claim.

## Stop Conditions

Stop mapping and hand off when the destination is observable, blockers are decided or owned, the next slice has bounded acceptance and verification, and out-of-scope is recorded.

Do not turn Wayfinder into planning theater. Supersede any decision ticket that no longer reduces fog or unlocks work, recording why.