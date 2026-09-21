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

## Model assignment and per-slice hostile review (normative, v3.1)

Effective 2026-09-08. Sean's fixed sequence supersedes profile reselection,
Quinn fallback, and weaker legacy model defaults. “Huston review” in dictated
requests means hostile review.

### Fixed roles and model sequence
These are local defaults, subordinate to the latest explicit user instruction.
An explicit task-bound override of reviewer, cadence or cumulative call cap is
supported by schema-4 `migrate`/`override-init`; no repeated confirmation is
required. Preserve old state, session history and cumulative consumption. Never
relabel historical reviews as current approvals. This exception changes no
system, sandbox, provider, privacy or paid-spend boundary. See workflow-usage.md
for tested slice advancement, deferred final Astra review, and session rebind.

Architecture is owned by the exact included-subscription `gpt-6-astra` at
`xhigh`. The default bounded implementation builder is the exact
included-subscription `gpt-5.6-luna` at `xhigh`. A user-selected alternative
may change only the builder, and only after its exact identity, effort and
included subscription entitlement are verified. Before submission Luna may implement, run tests and debug within the unchanged Astra contract. Luna cannot own architecture decisions, issue review verdicts, adjudicate or approve its own slice. Astra owns post-review repairs and adjudication.

Every slice and the final combined state use this exact ordered review route:
`glm-5.3` advisory -> `glm-5.3-flash` advisory -> `gpt-6-astra` adjudication.
There is no reviewer-profile question, optional reviewer fan-out, GLM 5.2,
silent downgrade, or Quinn self-review fallback. A missing, unavailable or
unverified required seat is `BLOCKED` with a concrete handoff and preserved
state; it is never skipped or relabeled as approval.

The two GLM reviews are separate serial calls against the same frozen packet.
Use the existing guarded transports directly with the output cap:
`consult-glm.mjs --model glm-5.3 --max-tokens 8000`, then
`consult-ox.mjs --max-tokens 8000`. The historical `consult-panel.mjs`
`--seats` path hard-codes 34,000 tokens per seat and does not satisfy this
workflow; never call it uncapped or bypass its egress, consumption or
single-flight guards. Preserve both advisory reports and pass both to Astra.

Luna may request the supported Astra collaboration from its parent using the
exact model `gpt-6-astra`, `reasoning_effort:xhigh`, and a bounded/no-history
fork. Wait for the operation and record actual tool receipts, selected model,
effort and completion status. This collaboration does not switch the parent
model and does not authorize an invented API call; if the surface cannot
dispatch the exact seat, stop `BLOCKED` and provide the artifacts in a handoff.

Keep unknown identities disabled instead of guessing a model string. Review
outputs are advisory until Astra resolves every namespaced finding with
evidence. A final review covers the combined changes after the last slice.

### Subscription and privacy gates
A subscription is quota-limited, not unlimited or zero resource cost.
Standard OpenRouter credit usage is NOT a ChatGPT/Claude subscription route.
Never spend OpenRouter/API credits, purchased extra usage, auto-top-up, usage
reset credits, or paid fallback under this workflow. Those require a separate
explicit user authorization and a separately recorded policy revision.
Use only provider-supported included-subscription mechanisms. Never extract
or replay browser tokens or bypass a provider's authentication/usage limits.
Z.ai requires its supported coding-plan endpoint; a standard PAYG endpoint
does not qualify. Codex/Claude routes must establish included billing and
disable/deny extra usage before dispatch. If that cannot be proven, block the required route and preserve an exact handoff.

Before EACH dispatch validate the exact requested model, supported route and effort,
recipient authorization, final outbound privacy policy, current availability,
included entitlement, remaining quota, root budget, output bound and deadline.
Unknown billing or unknown allowance means unavailable. Cached availability
expires in five minutes. After execution verify the actual served identity before accepting its receipt. Never infer availability from a model name in a file.
Minimize and inspect the COMPLETE payload, including attachments/metadata.
Private client, child, family, medical, credentials or raw transcript material
stays local. Reviewer access never grants new disclosure or execution authority.
Do not copy private data into this workflow journal.

Unavailable required seats are `BLOCKED` with their exact preflight or
dispatch reason and a concrete handoff. Do not proceed with a degraded subset,
replace a seat with Quinn, or label missing evidence as approval. Preserve
work and stop when no verified required route remains.

### Required cycle for EVERY slice
1. Astra gpt-6-astra xhigh supplies requirements, boundaries, source authority, states,
   contracts, exact owned files, forbidden effects, test IDs and stop conditions.
2. Luna gpt-5.6-luna xhigh (or the explicitly selected verified subscription builder) implements only this slice; preserve unrelated changes.
3. Run required tests; freeze source, plan, policy, test evidence and revision.
4. Run the required hostile reviewers in clean contexts on that snapshot in
   order: GLM 5.3, GLM 5.3 Flash, then Astra.
5. Astra adjudicates each finding with reproduced evidence and owns repairs in
   the SAME slice, rerun tests, freeze a NEW revision and re-review it.
6. Advance only after the current revision passes tests, both GLM reports are
   complete, and Astra approves with every finding resolved or rejected with
   rationale and evidence. An older approval cannot apply to repaired code.
7. Repeat for the next slice. After the final slice run combined regression and
   the configured final review. Keep human commit/push/deploy authority separate.

Reviews are advisory, not votes. Majority agreement never erases a blocker.
Do not silently downgrade acceptance, weaken tests, hide dissent, drop a
finding, or mark a missing/partial review as approval. If a requested change
expands architecture, return it to the planner and invalidate affected reviews.

### Bounded execution and recovery
Default hard limits: 3 review rounds per slice, 12 review admissions per task,
one in-flight review, 8,000 output tokens and 600 seconds per review, $0 paid API.
These are conservative safety defaults, not a universal workload estimate.
At a cap, preserve work and replan with Sean; do not reset counters or create
child tasks to bypass a root limit. Model providers may count reasoning toward
output/allowance; the adapter must apply the bound to total billable output.

Every attempt binds task, slice, round, exact model, snapshot and idempotency ID.
Duplicate admission is rejected. A timeout does not prove no request ran.
Unknown execution holds the single-flight slot until a terminal adapter receipt
reconciles it; no paid retry or model switch during uncertainty. No retry timer,
automatic quota polling, automatic resume at reset, or Stop-hook continuation.
Unavailable required preflight blocks the route; privacy denial, unresolved execution,
invalid output and model mismatch must first be resolved, never laundered by
switching reviewers. Freeze/fix never reset cumulative call counters.

### Installed mechanism and usage
Read scripts/workflow.mjs and scripts/workflow-policy.mjs when integrating a
runner. The controller is LOCAL ONLY: it admits/records attempts but never
dispatches a model. Existing supported runners must explicitly perform their
own privacy/billing checks, honor the admission ID and return verified receipts.
Do not bypass their existing egress, quota or single-flight controls.

Create a task-local state JSON with init; include native session ID, canonical
repoRoot, taskId, strict default profile, explicit slices/allowed files, exact builder model/provider/billing/effort, planFiles, a hashed planReceipt and a hash-bound Astra plannerReceipt with actual tool evidence. Enroll its exact
absolute state path with scripts/workflow-hook.mjs enroll STATE.json. Enrollment
is by native session, never a shared process cwd. Status and snapshot are reads.
Use freeze with a hashed fresh passing test receipt, the common packet (plan/source/test hashes and exact file scope), the current builder or Astra repair execution receipt, and verified full inventory;
admit in the exact required order with seat/preflight/final-payload approval and exact native dispatch-input hash; review with a hashed complete
provider receipt including requested/served identities, actual tool evidence, packet and dispatch bindings, full output and measured token count; Astra-authorized fix; advance. Exact executable input/receipt shapes are in references/workflow-usage.md. pause/resume preserve counters. reconcile
requires terminal execution evidence. No automatic force-unlock or reset.

The native hook blocks enrolled task writes during frozen review, and rejects
direct file writes outside the current slice. Unknown execution commands in
frozen review block, apart from exact controller invocation and a small safe
read allowlist. This is an engineering workflow guard, NOT a security sandbox:
enrollment is instruction-driven, evidence can be forged by an actor allowed
to rewrite its files, arbitrary shell behavior is not fully statically known,
and unobserved/untrusted hooks provide no runtime enforcement claim.
Run native sentinel tests before claiming a surface is enforced. Newly added
Codex hooks require native trust. Existing sessions may need restart for new
callbacks; never claim a reminder update proves new callbacks loaded.

### Evidence, compatibility and review authority
The original ten-category artifact contract remains mandatory. Add workflow
receipt to readiness.json when claiming implementation complete; the readiness
validator rejects invalid workflow evidence. Older v1 plan receipts remain
readable and are not retroactively represented as fully reviewed builds.
Record planner/builder/reviewer identities, fixed route, tests, immutable
response hashes, all findings and final combined snapshot.
Never expose keys or private prompts in the receipt. Final readiness is based
on evidence, not a model's status word or the existence of this skill.

Official billing references:
- https://openrouter.ai/support
- https://docs.z.ai/devpack/tool/others
- https://docs.z.ai/api-reference/introduction






---

## Hostile Review Archive (Rule 86) — MANDATORY

**Every hostile review is filed to `Z:\HostileReviews`. A review that is not filed there
did not happen.**

A hostile review that lives only in a chat transcript is not findable by the next agent,
so the same defect gets re-found in new words and a stale `CLEAN` verdict gets read as
current. Before this rule, reviews were written wherever the session happened to be
working — `C:\tmp\`, `.ai-workflow/reviews/`, `docs/ai-workflow/reviews/`, root
`review-roundN-packet.md`, Hermes memos — and a `*hostile*` search across the SS-PT repo
alone returns **hundreds of files**, none of which is *the* place to look. (The measured breakdown is in the archive `README.md` §7 — re-derive it there. Do not copy a count into this rule: it drifted twice inside one session.) The fix is a single
archive with a fixed address and a fixed header.

**Before you review, look.**

```bash
node Z:/HostileReviews/query.mjs --subject "<subject>"
```

If a review exists, read it — your job is then to test whether its findings still hold
and whether the code has changed since, not to re-derive it. Re-reporting a settled
finding in new words is restatement, not review. The `--verdict CLEAN` list is the
dangerous one: those are the verdicts most likely to be stale and most likely to be
trusted.

**File at the end of the pass, before the completion claim.**

```bash
node Z:/HostileReviews/new-review.mjs \
  --subject "<what was reviewed>" --reviewer <agent> --seat "<harness / model>" \
  --repo <repo|n/a> --verdict <CLEAN|DEFECTS-FOUND|PARTIAL|INCONCLUSIVE> \
  --scope "In: <...>. Out: <...>."
node Z:/HostileReviews/reindex.mjs
```

- **The filename is the lookup key:** `<YYYY-MM-DD>-<HHMMSS>-<subject-slug>.md` — local
  date first, so a directory listing is already chronological, then the slug, so the
  subject is visible without opening the file. Lowercase `a-z0-9-` only, hyphens not
  spaces, ≤48 chars. The filename stem IS the `review_id`.
- **The header is the lookup surface:** YAML front-matter with the fixed key set —
  `review_id`, `date_local`, `date_utc`, `subject`, `reviewer_agent`, `reviewer_seat`,
  `round`, `repo`, `repo_path`, `branch`, `commit`, `scope`, `verdict`,
  `defects{critical,high,medium,low}`, `unproven`, `supersedes`, `superseded_by`, `tags`.
  `UNKNOWN` is not a verdict — use `INCONCLUSIVE` and say why. `unproven` is not optional;
  zero on a non-trivial review is a smell. `commit` matters: a verdict against a dirty tree
  is only valid for that tree.
- **Supersede, never correct.** A later round writes a NEW file with
  `supersedes: <old-review_id>` and sets `superseded_by` on the old one. Never edit a filed
  review into correctness, never append a second review to an existing file, and **never
  delete**. The record of what was believed at the time is the value.
  **The one edit that is required, not forbidden:** setting `superseded_by` on the old
  review is the backward half of the same link, not a correction — it changes no finding,
  no verdict and no count, and leaving it unset makes the older review still read as
  current. `new-review.mjs --supersedes` records the forward half; `relink.mjs` writes the backward half once the successor is published,
  and `reindex.mjs` reports a link that is not reciprocal.

**Protocol:** `Z:\HostileReviews\README.md` — the contract, the header schema, the query
recipes, the generated corpus counts (`census-hostile.mjs`), and the map of legacy
pre-2026-09-19 locations. Full rule text, by absolute path so it resolves from any project:
`C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT\docs\ai-workflow\references\HOSTILE-REVIEW-ARCHIVE.md`, and Rule 86 in
`C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT\CLAUDE.md` / `AGENTS.md` / `CODEBUDDY.md`.

**Numbering — why this rule is 86 and not 74.** The canonical sequence ends at Rule 85, and
Rule 74 is Proof-Before-Done. Rules 74–85 are absent here by design, so the gap is expected,
not a lost rule. **Do not renumber this rule down**, and do not "fix" the gap.

**Enforcement honesty (measured 2026-09-19).** Nothing here is a hook. The layers are this
block (boot context), the `hostile-review-archive` skill, `closeout-evidence-lock`, and the
tooling (`new-review.mjs`, `reindex.mjs`). `scripts/hooks/hermes-closeout-gate.mjs` enforces
review *debt* but has no notion of a filed `review_id`, and `.git/hooks/` is empty. So this
rule fires because an agent reads it, not because something forces it.

**Why:** Sean, 2026-09-19 — *"whenever we do a hostile review, that hostile review has to be
saved in the hostile review folder, and it needs to be dated... the header needs to be very
easy to be able to look up for other agents trying to find it. So that way if there were
some issues or things change or whatever, or we had different ideas, we can always just
have the agent just kind of just go look in this folder."*
