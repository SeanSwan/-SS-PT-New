# Agent Workflow Router

> Read when: sizing a task, choosing between planning and execution, adopting an external skill, setting up unfamiliar tooling, or deciding whether the current checkout is safe to edit.

## Purpose

This router fuses the most useful workflow patterns from David Ondrej's agent-skill system and Matt Pocock's Wayfinder with Swan's existing orchestration, safety, continuity, and evidence gates. It is a routing layer, not a second rules file. `CLAUDE.md` / `AGENTS.md` and project-local instructions always win.

## Front-Door Classification

Run two passes in order. Workspace safety is an orthogonal precondition, never a competing mode.

### Pass 1 - Environment preflight (always before mutation)

Classify the checkout as clean, dirty, stale, shared, or concurrent. When it is dirty, stale, shared, concurrent, or otherwise risky, run `worktree-isolation` and produce its verified receipt before selecting an execution mode. A normal, Wayfinder, goal-contract, or guided-setup task cannot bypass this pass.

### Pass 2 - Select the smallest execution mode

| Condition | Route | Exit |
|---|---|---|
| Clear and finishable in one focused session | Normal project plan -> `swan-orchestrator` | Verified implementation |
| Multi-session and materially foggy, including partly mechanical work with blocking fog | `wayfinder` | Observable destination, blockers owned, next slice bounded |
| Clear destination, long mechanical execution | `goal-contract` | Acceptance evidence and stop condition satisfied |
| Installation, auth, deployment setup, env wiring, unfamiliar tool | `guided-setup` | Every required step verified |
| One material unresolved choice in an otherwise bounded session | `grill-me` or the current Wayfinder ticket | One recommended `NEEDS_USER` decision |
| Substantial completion claim | `closeout-evidence-lock` | Fresh evidence and calibrated report |

For a multi-session task where both mechanical work and material fog exist, Wayfinder wins first. When the blocking fog clears, freeze the decision map and downgrade the clarified slice to `goal-contract`. Do not invoke Wayfinder merely because a project is ambitious. Do not create a persistent Codex goal unless the user explicitly asks for a goal. Do not add a skill when an existing deterministic mechanism already owns the behavior.

Wayfinder is a decision map, not a second implementation backlog. In SS-PT, Linear owns cross-session implementation status when writes are authorized; local fallback records decision evidence and one bounded handoff only. The frontier is open + unblocked + unclaimed, and a ticket must be claimed before work.

## Canonical Spine

```text
project detection
  -> environment preflight and isolation when required
  -> size / fog mode classification
  -> Wayfinder only for multi-session material fog
  -> goal contract for measurable autonomous slices
  -> isolated or coordinated execution
  -> project-specific gates
  -> evidence lock + uncertainty review
```

For SwanStudios, the execution spine remains:

```text
prompt-watcher
  -> mode classification (Rule 78)
  -> grill-me (when intent is missing)
  -> chromie (when an unproven bet needs pressure-testing)
  -> swan-orchestrator
  -> swan-design-router (UI only)
  -> build and verify
  -> closeout-evidence-lock
```

Wayfinder sits before `grill-me` only when the broader project is foggy enough to require a durable map. A `GRILL-HITL` ticket may invoke `grill-me`. Goal contracts sit after the destination is clear. Worktree isolation runs before the first write whenever workspace classification requires it.

## Decision Discipline

Decision review complements code review; it never replaces tests, security review, caller-path proof, or hostile review.

Classify consequential assumptions as:

- `VERIFIED` - supported by current evidence.
- `REVERSIBLE` - safe documented default with cheap rollback.
- `NEEDS_USER` - product, security, billing, data, production, or irreversible choice.

Ask only the next blocking `NEEDS_USER` question. Put the recommended option first and state the tradeoff in one sentence. Record the answer at its canonical source and link a short gist from maps or tickets.

Canonical decision state lives in exactly one place per mode: Wayfinder's map `## Decisions`, a goal contract's `## Uncertainty Register`, or the current `grill-me` brainstorm for a bounded intent session. Closeout links that source and promotes unresolved `NEEDS_USER` entries into the next handoff's first blocking question; it does not copy them into a competing register.

## Existing-System Merge Map

| Transcript capability | Swan owner | Integration decision |
|---|---|---|
| Global command guardrails | Codex sandbox/approvals + `.claude/settings.json` | Keep current stricter controls; threat-model any cross-platform guard separately |
| Git worktrees | `worktree-isolation` + Rule 67 | Adapt with baseline, secret, port, service, and cleanup receipts |
| Goal loop | `goal-contract` | Keep measurable contract; prohibit implicit persistent goals and reward hacking |
| Setup help | `guided-setup` | Adopt one-step interaction plus stable remaining ledger |
| Decisions / next decision | Wayfinder, goal contract, `grill-me`, closeout | Merge; do not create competing skills |
| Handoff | continuity bridge + Hermes inbox + closeout | Keep existing durable channels |
| Model review | `swan-oracle`, fusion router, review scripts | Keep advisory, privacy-safe, spend-gated model consultation |
| Browser/research | `agent-browser`, `webapp-testing`, official web tools | Keep native tools and source discipline |
| VPS/remote operations | Hermes T0-T4 operator boundary | Do not import root/yolo assumptions |
| Self-scheduling | Hermes cadence + Codex automations | Keep explicit authority and kill switches |

## External Skill Intake Gate

Before importing or adapting any third-party skill:

1. Pin the source URL and commit SHA.
2. Record the license and preserve notices when substantial text is copied.
3. Inventory network calls, paid APIs, self-update behavior, external writes, credential handling, and destructive actions.
4. Classify the capability as `ADOPT`, `MERGE`, `DEFER`, or `REJECT` against existing skills and deterministic controls.
5. Prefer a small adapter over copied tool-specific assumptions.
6. Create both `.agents` and `.claude` entrypoints only when both runtimes need the skill.
7. Run the skill initializer, validator, cross-surface contract tests, and realistic routing tests.
8. Update instruction references and regenerate `AGENTS.md` mechanically.
9. Keep model opinions advisory until checked against repo evidence.

Never import safety-evasion prompts, self-modifying instructions, blind secret copying, root-by-default remote operations, destructive cleanup, or vendor-specific paid side effects as default workflow.

Any delegated agent inherits the parent mode's authority, constraints, acceptance, exclusions, and stop conditions verbatim. Delegation cannot expand authority, authorize external writes, or skip the environment preflight.

## Skill Inventory Truth

Do not hand-maintain exact skill counts in operating prose. The filesystem is the inventory source:

```powershell
node scripts/ai-workflow/validate-skill-registry.mjs
node scripts/ai-workflow/validate-skill-registry.mjs --json
```

The validator enforces exact `SKILL.md` casing, required frontmatter, canonical folder names, a 300-line budget for the new portable workflow skills, and a machine-readable inventory for both repo-local skill roots. Shared names are valid adapters, not accidental duplicates, when their contracts are intentionally aligned. A validator error blocks a new or renamed skill from closeout, commit, or push; the contract suite is its deterministic gating consumer.

## Required Routing Probes

Use these probes when changing this router:

- One-line typo -> normal execution; no Wayfinder or goal.
- Clear three-ticket feature -> project tracker/orchestrator; no Wayfinder.
- Multi-month system with unresolved storage, permissions, and rollout -> Wayfinder.
- Explicit request to pursue a fixture target until all pass -> goal contract and permitted goal creation.
- Vague "keep improving" -> normal bounded plan; no persistent goal.
- Render or auth setup walkthrough -> guided setup.
- Dirty checkout far behind current main -> environment preflight selects worktree isolation before any task mode.
- Multi-session task with a known destination but one blocking architecture choice -> Wayfinder first, then goal-contract after the decision is resolved.
- Email, production DB mutation, publishing, financial, destructive, or root SSH request -> existing approval/authority tier, never transcript-derived autonomy.
