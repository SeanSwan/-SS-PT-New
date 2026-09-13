# Delivery plan, operations and hostile review

Artifact: SWAN-AGENT-PLANNER-DELIVERY · v2.0 · 2026-09-06 · Owner: Sean
Status: planning only. This pass authorizes no application release.
Authority: [packet index](README.md).

## Governing artifacts and preservation

Preserve and incorporate the audit-main versions of:

- `docs/ai-workflow/AI-HANDOFF/JARVIS-ULTIMATE-BLUEPRINT-2026-07-31.md` and its
  incorporated `JARVIS-CONSULT-OPUS5-FULL-2026-07-31.md` for Planner scope,
  contexts, lens tokens, safety gates and review authority.
- `docs/ai-workflow/AI-HANDOFF/UNIFIED-WORKOUT-OS-FABLE-BLUEPRINT-2026-07-29.md`
  for assignment/logging/receipt invariants.
- `docs/ai-workflow/blueprints/WORKOUT-PLANNER-V2-MASTER-BLUEPRINT.md` as historical
  feature inventory; proposed libraries and old exercise counts are not current.
- Primary-checkout `SWAN-COACH-GWEN-3.8-HANDOFF-20260906.md` and its linked owned
  packet 31/32. Their implemented local work is a merge dependency, not live proof.

This packet is an additive expansion with one index, not a replacement of those
artifacts. Originals were not overwritten. Explicit local snapshots, SHA256
comparison and sample restores are recorded by `evidence/preservation.json`.
No claim of automatic Codex vault-hook execution, remote backup or off-machine
restore is made. New packet files can be retained without removing old plans.

## Ordered slices

Before any slice: refresh main, prove owned tree and mounted source, preserve
changes, freeze acceptance, run baseline and prove intended RED. Existing
Gemini review → Codex hostile input → Fable final decision/commit authority
remains. No OpenRouter inference, production generation or paid external reviewer was used. Codex and Mobbin research usage occurred.

| Slice | Exact work / dependency | Entry and exit evidence |
|---|---|---|
| P1 | Expose count/rotation in existing V2 Programming path; update Planner contexts/request helpers and server bounds. Preserve `endpointFor(scope)` | Entry: T-P01/T-P02 RED, source recheck. Exit: GREEN + mounted UI→request→validated response; omitted defaults unchanged |
| P2 | Resolve settings/presets and restore equipment controls to V2; add duration/constraints only as generator/validator supports them; Rolodex unknown-data treatment | Entry: P1 + trainer policy review. Exit: T-P03/04/06/13, context-switch tests, safe partial states |
| P3 | Typed blocks/sets and full-program edits through existing mutation, logger and PDF boundaries; progression preview | Entry: all consumer contracts inventoried. Exit: T-P05/07 plus current Plan vs Actual truth; cannot enable partial serialization |
| P4 | Saved-plan library, backup compare/snapshots and blend validation; preserve current lifecycle/primary semantics | Entry: P3 or compatible legacy-shaped subset. Exit: T-P08/09/10, real transaction/restore evidence |
| A1 | Human-owned agent grants, read-only capability registry, OAuth resource boundary and My agents UI | Entry: identity/retention/privacy decisions resolved. Exit: T-A01/02/10; zero writes available, revoke proven |
| A2 | Hermes + second-client compatibility, sanitized plan proposal tools and local-only conformance | Entry: A1; integrated Coach proposals verified; current plan writer reused. Exit: T-A03/04/05/06; human review binds payload |
| A3 | In-app local-device selector, pairing, outbound jobs, heartbeat, cancellation and recovery | Entry: A2 stable; companion packaging/OS support decision. Exit: T-A07/08 + sleep/restart/kill-switch drills |
| A4 | Optional consultant onboarding, export/recovery guide and temporary support consent | Entry: A2 stable. Exit: T-A09 with independent customer recovery |
| R1 | Current-main merge, real staging workflow, migration/restore, responsive/performance and review chain | Entry: selected slice gates GREEN. Exit: T-O01–04, exact deployed revision proof only after explicit release approval |

P1 is the recommended first implementation slice: useful on its own, small, and
already backed by real expected-failing tests. A1 can be planned independently
while P2/P3 mature. Do not combine all nine slices into one sprawling PR.
No dates or effort estimates are commitments; estimate each frozen slice after
its dependencies and unknowns are resolved.

## Operations and measurable budgets

Proposed budgets, to measure with named hardware/network fixtures:

- Rolodex: p95 query-to-painted-results ≤250ms with 1,000 exercises; no new
  main-thread task >50ms caused by filtering; virtualized DOM remains bounded.
- Editing: input acknowledgment ≤100ms; typed validation p95 ≤500ms for a single
  session. Whole 52-week validation may run as a bounded job with progress/cancel.
- Gateway: p95 authorization + dispatch overhead ≤250ms excluding domain I/O
  and model inference; reads capped/paginated. Start at 30 read calls/min and
  5 proposal calls/min per grant with a server-side global limiter.
- Local device: heartbeat every 30s while connected; unknown after 60s; offline
  after 90s. Visible pending feedback within 1s; first-output timeout 30s and
  total job timeout 120s initially, configurable only within bounded policy.
- One active write proposal application per target/plan revision. Queue ≤3
  pending jobs per connection. Exceeding bounds returns an actionable error.

Operational owner: Swan backend owner for gateway/persistence; frontend owner
for Planner state/UX; local user for device availability; Sean for training
policy and rollout. Logs use request/grant/job identifiers, action type, latency,
reason code and model-route category. No raw prompts, plan names or assessment
text. Logs are not a surrogate data export channel.

Metrics: setup completion, time to first valid draft, median manual edits before
save, useful accepted suggestions, permission denials, revision conflicts,
saved-but-unverified rates, device offline recovery and unexpected egress count
(target zero). Do not rank agent “intelligence” by token count or fabricated scores.

## Migration, compatibility and rollback

1. Add new connection/snapshot structures and expand plan schema readers first.
   Preserve current UUIDs, revision hashes, assignment types and completed logs.
2. Build migration against a synthetic disposable database; prove legacy
   fixtures and newly created versioned data can be read after flag rollback.
3. Keep agent connectivity default off behind separate read, propose and device
   flags. UI flags never substitute for server checks. Keep old MCP retired.
4. Roll out to Sean's synthetic/demo setup, then an explicit opt-in staff pilot,
   then opt-in clients. Entitlement/paid billing changes are a separate decision.
5. Kill switch revokes admission/new work and invalidates queued work. If a
   transaction has already committed, show the real saved result and offer a
   reviewed compensating revision; never pretend cancellation reversed it.
6. Roll back application behavior using flags and compatible binaries. Do not
   drop new tables/columns or erase user-created revisions during rollback.
7. Restore historical prescriptions into a new draft/revision. Restore database
   backups only into isolated verification resources during testing.

## Hostile review performed in this task

This is Codex's self-review/advisory input, not an independent paid reviewer or
Fable approval. Findings were addressed in the packet itself:

| Challenge | Evidence / decision |
|---|---|
| Does the plan target stale source? | Live page contradicted initial checkout. Fetched main and created detached snapshot; repeated baseline there. Initial 43 tests relabeled as older checkout context |
| Are backups, blending and revision control mistakenly proposed as new? | Current main and live UI prove them present. Blueprint now extends existing services and revision counters |
| Does “bring your agent” actually work inside the browser? | Split external MCP use from in-app device execution. A3 is explicit; A2 cannot claim the in-app outcome |
| Is “local” an unverifiable privacy promise? | Distinguish managed negative-control-tested profile from user-managed external agent; local SaaS data transport disclosed |
| Can external agents bypass trainer restrictions? | Grant intersection, current policy, server validation and human-bound approval; no activate tool |
| Would richer prescriptions lose data downstream? | Feature stays gated until logger/PDF/Coach/plan serializers agree; unsupported shapes reject rather than flatten |
| Does backup refresh destroy rollback ability? | Snapshot prior prescription; use existing lifecycle, not a second primary-plan field |
| Can result streaming or client switching corrupt the wrong draft? | Task/target/version identity and interruption/replay tests bind updates; source badge mismatch remains an unproven bug hypothesis |
| Are evidence files proving more than they test? | Separate source/live observation, mocked baseline, RED tests, prototype rendering and unrun real-boundary gates |
| Is the project now a generic agent marketplace? | Start with training capabilities and two verified clients. Defer marketplace/billing/general execution |

## Decisions still required before affected slices

| Decision | Recommendation | When needed |
|---|---|---|
| OAuth authorization component | Use an established compatible implementation with audited discovery, token lifecycle and revocation | Before A1 code; provider/library choice not established by this audit |
| Exportable training context and retention | Minimized pseudonymous fields; no raw clinical/freeform data; 02 contains proposed limits | Before A1 releases sensitive reads |
| Companion packaging and OS support | Hermes-first; Windows first based on actual customer hardware; second OS only after installer/recovery proof | Before A3 |
| Final visual direction | Training Workbench, retaining existing lens/world skins | Before substantial styling |
| Training policy thresholds | Preserve existing approved doctrine; Sean reviews additions | Before P2/P3 progression/safety behavior |
| Unclear dictated phrase | Covers NASM/OPT and observed intelligence entry point; await clarification for any other named component | Does not block P1 |

## Applicability and readiness disposition

Requirements, blueprint, contracts, flowchart, desktop/mobile wireframes, state,
sequence, ERD, permissions, privacy, test plan, traceability, slices, hostile
review, preservation and operations all apply and are supplied. Model training,
fine-tuning/dataset evaluation, media generation and destructive filesystem
migration are N/A: this work connects inference and training workflows, not
model weights, video creation or file cleanup.

Readiness checker evaluates references/structure only. Final disposition:
**AUDIT + BLUEPRINT COMPLETE; implementation and deployment NOT RUN.**
Next authorized work in this turn is packet inspection/review. Proposed next
implementation is P1, subject to the user's subsequent build direction and the
existing Final Decider chain. A1/A3 decisions do not prevent P1 from being concrete.


## September 7–8 v2 addendum

The canonical direction is Training Studio with optional Program Map. Read 08-design-synthesis.md for the governing visual decisions, 09-model-connections-and-budgets.md for default Coach/personal OpenRouter/local policy and durable spending controls, and 10-coach-privacy-audit.md for current-source privacy gaps and release prerequisites. Earlier baseline results remain dated historical evidence. This pass changes the blueprint and synthetic preview only.
