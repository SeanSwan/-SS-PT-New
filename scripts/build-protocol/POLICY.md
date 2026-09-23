## Mega Blueprints — automatic build protocol

Sean's standing instruction, effective 2026-09-06. Apply across projects and
coding platforms. This is one complete workflow, not a menu of optional steps.

**Activation and visible marker.** Before software building or behavior changes,
say **Mega Blueprints** once, briefly, near the start of the reply. Activate
from intent: build, create, implement, add a feature/component/page, redesign,
refactor, migrate, integrate, fix/debug behavior, or equivalent requests such as
"can you", "I want", and "make this work". A continuation ("go", "next slice",
"finish it") inherits the active build and its checklist. Explicit planning or
blueprint requests activate the planning workflow. Interpret context; do not
depend on exact keyword matches. Mere conversation, status/explanation, or
running an existing compiler/test command does not start a new build packet.

**Audit phrase.** "Did we make a blueprint that?", "did we blueprint that?",
"where is Mega Blueprints?", or a complaint that the marker is missing invokes
an actual audit. Say **Mega Blueprints** and inspect the current canonical
plan, all applicable artifacts, test commands/results, traceability, and native
instruction/hook loading. Report VERIFIED, MISSING, STALE, BLOCKED, or NOT RUN
with evidence. A missing marker is a reason to investigate, not proof the hook
failed. Never manufacture confirmation or merely print the marker afterward.
The marker means activation, not successful completion or hook execution proof.

**Load and preserve.** Load the installed `non-vibe-coding` skill and relevant
project instructions. Use this complete checklist even if skill discovery is
unavailable, and report that loading gap. Establish exact repository/worktree,
branch, commit, dirty state, active ownership, mounted caller path, and current
tests. Find the governing plans before creating documents. Preserve originals
with verified snapshots; maintain one canonical set with status/version and
supersession links. Do not replace another agent's work or invent a competing
plan. Reuse and update the active packet on continuation; do not recreate it
every turn. Keep the checklist accounted for even on small changes: compact
sections are allowed, silent omissions are not.

**Required package — all together before implementation:**

1. **Requirements:** user/job/outcome, scope/non-goals, roles, assumptions and
   unresolved decisions, requirement IDs, measurable acceptance criteria,
   business rules, and invariants/forbidden side effects.
2. **Blueprint:** responsibilities, boundaries, component/state ownership,
   dependencies, existing patterns, exact integration points, and tradeoffs.
3. **Wireframes:** actual desktop/mobile wireframes for UI; loading, empty,
   partial, success, denied, validation-error, failure, retry/recovery states;
   keyboard/focus/accessibility and responsive behavior. Headless work must
   explicitly mark wireframes N/A with a reason.
4. **Flowchart and Mermaid:** author valid Mermaid source and show a rendered
   preview when supported; otherwise disclose the rendering limitation. Include
   happy, blocked, error, cancel/defer, retry, recovery and rollback paths as
   applicable. Mermaid is the diagram format, not a redundant separate diagram.
5. **Contracts and conditional diagrams:** inputs/outputs, types, validation,
   API/events/storage, authoritative data sources, errors and compatibility.
   Assess state diagrams, sequence diagrams, ERD/data models, permissions
   matrices, and privacy/trust-boundary flows. Include each applicable item;
   record a concrete N/A reason for the others.
6. **Test plan and executable tests:** requirement-linked test IDs, fixtures,
   action, expected observable result, forbidden side effects, test level,
   command/environment and evidence. Cover applicable unit/component,
   integration/contract, end-to-end, responsive/accessibility, permissions,
   malformed/stale/duplicate data, races/idempotency, timeouts/interruption,
   performance, migration, restore and rollback behavior. Use isolated test
   resources; do not assume local means a disposable database.
7. **Traceability:** requirement -> acceptance criterion -> artifact/component
   -> test -> implementation slice -> evidence/status. Flag uncovered
   requirements and boundaries covered only by mocks.
8. **Implementation and operations:** ordered small slices with entry/exit
   evidence, dependencies, compatibility/migration, rollout, recovery/rollback,
   useful logs/metrics, measurable performance budgets and operational owner,
   with explicit applicability decisions.
9. **Hostile review and decisions:** challenge the plan, failure paths, data
   truth, complexity and test blind spots; resolve findings or name blockers.
   Preserve existing review authority. Provider calls/spend need their existing
   authorization; the protocol does not demand a paid reviewer.
10. **Readiness receipt:** canonical artifact links, preservation proof,
    applicability matrix, test commands and actual results, unresolved decisions,
    coverage gaps and the next authorized slice. Missing required evidence
    prevents claiming readiness. For substantial packets, use the installed
    skill's `references/receipt-format.md` and `scripts/check-readiness.mjs`
    integrity gate, then inspect the underlying evidence. A passing structural
    check does not certify the application's behavior.

**Execution and truth.** Run relevant baseline tests. Where feasible, write
acceptance/regression tests before implementation and observe the intended RED
failure; isolate expected failures from the normal green suite. Setup/import
errors are not valid RED proof. Mark PASS, FAIL, BLOCKED, NOT RUN and justified
N/A honestly. Planning can specify later tests, but cannot claim they passed.
During authorized implementation, prove RED -> GREEN, verify critical real
boundaries and the mounted UI, review the change, and update the packet.
Document existence, coverage percentages, mocks, or this marker cannot prove
runtime correctness. Distinguish PLAN READY, IMPLEMENTATION VERIFIED and
DEPLOYED; never promise perfect or bug-free software.

**Authorization.** A build request authorizes planning followed by the requested
implementation once readiness is established; do not add a routine permission
stop. Plan-only, audit-only, "do not build", and "stop and wait" remain bounded.
Ask only for missing consequential decisions or actions requiring approval.
Keep project-specific design, privacy, billing, production and spend rules.
Do not transfer SwanStudios branding or private context into other projects.
