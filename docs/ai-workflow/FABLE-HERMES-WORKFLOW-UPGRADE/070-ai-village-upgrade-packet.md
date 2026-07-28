# AI Village Upgrade Packet

Date: 2026-07-03
Scope: planning packet only. Do not run AI Village from this document without Sean approval.

## Executive Verdict

AI Village should not be the default builder. It should be the high-stakes review court.

Current local docs show useful AI Village infrastructure, but the policy is drifted across older validation docs and current AGENTS/CLAUDE rules. The upgrade should make one packet that says when to run it, what it costs, what brains are involved, and how its output is used.

## Current Rule

AI Village requires Sean approval. It is reserved for critical decisions:

- auth/authz
- Stripe/billing
- multi-tenant scoping
- minors' data
- legal/compliance
- irreversible migrations
- pre-launch hardening
- cross-service architecture

For normal planning:

- use deterministic local checks first
- use single-provider review second
- use Fable/Gemini/Codex review as appropriate
- reserve paid Village for must-be-right decisions

## Proposed Village Modes

### Mode 1: Planning Review

Use when:

- The product bet is strategic.
- The technical plan is broad.
- No secrets or PII are included.

Inputs:

- problem statement
- current local evidence
- proposed slices
- risks
- decisions needed

Output:

- approve/revise/reject
- missing assumptions
- risk table
- slice order

### Mode 2: Security/Privacy Gate

Use when:

- client data, health notes, minors' data, auth, admin permissions, PLAUD transcripts, or operator automation are involved.

Inputs:

- redacted prompt only
- route map
- data-flow map
- effect-level map
- proposed controls

Output:

- threat model
- data boundary review
- attack paths
- required mitigations
- "do not ship until" list

### Mode 3: Release Gate

Use when:

- A major feature is complete and Sean wants high-confidence release review.

Inputs:

- diff summary
- tests run
- route receipt
- data migration status
- Render deploy plan
- rollback plan

Output:

- approve/revise/reject
- release blockers
- verification gaps
- post-deploy smoke plan

### Mode 4: Design Court

Use when:

- A high-visibility UI surface is being redesigned.

Inputs:

- surface receipt
- current screenshots if available
- Swan design source docs
- user workflow
- responsive risks

Output:

- 2 to 3 concept directions
- hostile design critique
- final recommended direction
- acceptance criteria

## Required AI Village Pre-Run Checklist

Before any Village run:

- Sean explicitly approves.
- Spend cap is set.
- No secrets are included.
- PII is removed or redacted.
- Raw client transcript/injury notes are not sent.
- Prompt includes local evidence, not speculation.
- The requested verdict is explicit.
- The output destination is defined.

## Proposed Brain Roles

This is a policy packet, not a hard implementation list. The current orchestrator may differ.

Recommended roles:

1. CEO/product strategy
2. CTO/architecture
3. security/privacy
4. auth/authz/tenant isolation
5. data model/database
6. frontend UX
7. accessibility
8. performance
9. billing/Stripe/revenue
10. coach/trainer workflow
11. client journey
12. QA/test strategy
13. operations/Render/deploy
14. hostile bug hunter
15. synthesis judge/Fable final decider when available

## Output Contract

Every Village report should include:

- verdict: approve, revise, reject
- confidence
- top blockers
- non-blocking risks
- exact files/routes reviewed
- evidence gaps
- recommended slice order
- final human decision needed

## Hostile Review

Risk: AI Village becomes expensive theater.

Fix: require precise local evidence, one decision, and a spend cap.

Risk: AI Village leaks private data.

Fix: raw client data never goes in. Use redacted prompt packets only.

Risk: AI Village overrides repo rules.

Fix: repo rules win. Village findings are advisory until Codex/Fable reconcile them.

Risk: AI Village slows every slice.

Fix: only high-stakes triggers invoke it. Normal slices use tests, hostile self-review, and focused single-provider review.

