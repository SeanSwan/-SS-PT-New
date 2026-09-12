<!-- USER-WORKFLOW-MIGRATION:20260908 -->
> **Controller blocker resolved, 2026-09-08.** Sean explicitly changed this task
> to finish the implementation slices and required tests, then Astra hostile
> review and repairs of the combined result. This supersedes older mandatory
> GLM/Flash and per-slice review gates and STALE_POLICY blocker text below.
> Use `tmp/coach-g02-robustness-20260908/workflow-state-user-override.json`.
> The supported migration and current-session enrollment were executed and
> verified: status active, cadence final-astra, 9 consumed calls preserved, task
> cap 24. The old state and history remain intact as evidence.
> G04a's approved architecture is retained; continue the bounded build/test
> gates and append subsequent planned slices using the updated controller.
> Deferred review is pending, not approval. This is not a claim that G04-G11
> are implemented. No push or deployment has occurred.

# Swan Coach Universe V3 — execution package

Owner: Sean (product), Astra (architecture, all reviews and review repairs), Luna Extra High (implementation). Version: 3.6, 2026-09-12.
Status: IMPLEMENTATION IN PROGRESS; implementation_authorized: true (Sean request, 2026-09-04).
Historical planning snapshot (superseded): implementation_authorized: false.

## Current execution authority

Start with [47 — current Astra runtime hostile review](47-astra-runtime-hostile-review.md) and [48 — capability truth and release gaps](48-capability-truth-and-release-gaps.md). Source work for G04–G11 exists, but the previous completion claims exceed the mounted behavior. Review and repairs are in progress; Universe release is NOT READY. Session Desk is withdrawn from the default mount until its real integration is complete. Existing chat, reviewed proposals and canonical Logger/Planner remain.

Current controller: tmp/coach-astra-hostile-20260912/workflow-state-v2.json. Supported migration preserves the predecessor, 9 historical admissions and the Astra-only final-review override. Original packet snapshots and hashes are in tmp/coach-astra-hostile-20260912/preservation.json. Architecture and domain contracts in [31](31-gwen-execution-handoff.md) and [32](32-gwen-domain-and-verification-contract.md) remain binding. Older checkpoints and the migration banner above are historical evidence.

## Plain-English Summary

Make Swan Coach the application’s dependable training partner: converse naturally,
understand the current client and session, draft useful changes, apply authorized
actions, show what actually saved, remember with permission, and recover honestly.
The distinctive experience is the **Session Desk**: conversation beside a living
workout draft and a compact timeline of verified results. On a phone these become
three views of the same task. Coach stays available on existing working surfaces.

The latest development branch already contains valuable security and UI work.
It is not merged into the verified GitHub main ref. Several blueprint claims also
outpace the actual mounts. Finish the connective tissue before adding autonomy.
“Beyond Jarvis” is a product ambition, not a claim of consciousness or AGI.

## Technical Summary

Baseline: `claude/jarvis-p0-2-security-20260902`, commit
`bfc7a789869384e48116c5f0f091913865fdc575`. Inspected in an isolated detached worktree.
GitHub main observed: `53120649f356c3efccee32872b530096d386642f`.
This package supersedes v2’s **future build instructions**, not existing runtime
contracts or review evidence. Never replay v2 cards 1.0–1.5 as if all were absent.

## Original v3.0 background read order (current entry is31/32 above)

1. [Reality, history, and review adjudication](01-audit.md).
2. [Product blueprint and capability boundaries](02-blueprint.md).
3. [API, identity, persistence, and recovery contracts](03-contracts.md).
4. [Flowcharts, sequence diagrams, state machines, ERD](04-flows.md).
5. [Role wireframes and interaction specification](05-wireframes.md).
6. [Memory, voice, emotional support, and research](06-intelligence.md).
7. [Tests and requirement traceability](07-tests.md).
8. [Foundation build cards S0–S5](08-foundation-cards.md).
9. [Experience build cards S6–S11](09-experience-cards.md).
10. [Luna kickoff and readiness receipt](10-readiness.md).
11. [Comprehensive implementation handoff](11-comprehensive-handoff.md).

Supporting files: `tests/`, `evidence/`, and `wireframes.html` are part of this
package. The HTML is a static synthetic design artifact, not the application.

## Authority and preservation

The September 2 v2 file receives a supersession notice; its body is preserved.
Earlier August V3, unified-brain panels, and July hive-mind plans are historical
inputs. This V3 means **Universe V3**, not the August onboarding V3.
Existing `coach_action_proposals` remains the reviewed domain-write authority.
An intent ledger coordinates execution and recovery; it cannot approve a workout
or bypass the proposal service. No new generic SQL or arbitrary tool executor.

Historical planning boundary: the pre-authorization package began with S0 as a
probe and reconciliation step, and prohibited implementation. Sean has now
authorized implementation and subsequently the Gwen handoff. The old S3-first
kickoff is superseded: atomic integration has passed scoped review. Follow31/32
for the remaining sequence and per-slice gates; no new production authorization.

## Current implementation receipt

Sean authorized the runtime slices in this task. S1 is implemented and verified:
the live command registry feeds the mounted CoachIntentBar, voice and recorder
drafts carry explicit provenance, typed edits become mixed, and the Command Center
uses the shared ConfirmationSheet. S3 foundation is implemented and verified:
CoachIntent has a PII-free model, additive migration, central registration, a
read-only coordinator for claim, completion, failure, and unknown reconciliation,
and owner/assignment-gated bounded receipt-read routes. S4 now has a deterministic
workout read-back verifier plus a narrow receipt hook at the daily-form writer's
transaction boundary. S5a now returns an evidence envelope that preserves degraded
domain state and blocks dependent plans when required safety data is unavailable.
S5b adds an optional provider policy gate and S5c bounds conversation responses
before they leave the router. Route-wide claim/commit integration, real workout
read-back, full chat caller adoption, and S6–S11 remain planned until their named
tests and real caller paths are built.

## What “excellent” means

- A workout request produces one reviewable draft and one verified save.
- Corrections preserve exercise IDs, units, session ownership, and unsaved work.
- Every action answers: for whom, what changed, did it persist, can it be reversed?
- Missing health/training data is visibly unavailable, never interpreted as zero.
- Memory can be inspected, corrected, forgotten, and excluded from a private chat.
- Proactivity is consented, quiet, relevant, and measured by useful training outcomes.
- No engagement objective rewards dependency, shame, or keeping a user talking.

## Release boundary

The implementation slice is committed locally on the isolated branch
`codex/swan-coach-universe-v3-implementation-20260904`; it has not been pushed
or deployed. No live app, production schema, provider configuration, release
flag, or existing application test outside the scoped Coach changes was
changed. See the readiness receipt for exact checks and remaining integration
evidence.

### Current continuation: 2026-09-12 HR2 / G04.1

Plan49 and49-wireframe.html now define the connected Session Desk. G04.1 alone is PLAN READY after35 baseline tests and six-width synthetic layout checks; the Desk remains unmounted. Current controller: tmp/coach-astra-hostile-20260912/workflow-state-v3.json, ten preserved cumulative admissions. Current repair evidence:723 backend +58 Node +93 PostgreSQL +1412 frontend tests passed;66 focused owner/transport tests and canonical typecheck passed. Read47/48 for exact limitations; no final approval, commit/push or deployment.


G04.1 local exit,2026-09-12: Luna implemented dormant editor/library/Desk presentation; Astra repaired actual browser findings (lost Escape focus, uncontained absolute picker and clipped mobile set rows) and fenced delayed disabled/unmounted picker callbacks. Current scoped suite47PASS/8files; canonical npm run type-check exit0; actual editor/Rolodex/useExerciseSearch/worker browser7widths320..3840 PASS with synthetic library transport, native pointer/keyboard, no storage accesses, kgblocked and disabled retirement. Mobile/desktop screenshots visually inspected. Full Coach owner/proposal/backend journey is not established by this component harness. Desk stays unmounted; G04.2-5 and final combined review remain pending. Original builderRED recovered byteexact from native session:7fail2pass, but the kg assertion lacked controlled-prop rerender and is not valid behavioralRED. Six other failures showed intended missing/incorrect behavior; clean browserRED separately preserved. Latest GREEN12newtests+35compatibility=47. Prior full frontend1412 and productionbuild predate this slice.
