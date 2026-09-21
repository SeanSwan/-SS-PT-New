---
name: Mega Blueprints
alwaysApply: true
---

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
pre-2026-09-19 locations. Full rule text: `docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md`
in the SS-PT checkout (`<REPO>/docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md`, where
`<REPO>` is that checkout's root), and Rule 86 in `<REPO>/CLAUDE.md` / `AGENTS.md` / `CODEBUDDY.md`.

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
