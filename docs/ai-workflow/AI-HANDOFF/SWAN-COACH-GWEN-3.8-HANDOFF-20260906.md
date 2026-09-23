# Swan Coach — Gwen 3.8 continuation prompt

Version: 3.3. Prepared by Astra for Sean on 2026-09-06.
Status: local implementation IN PROGRESS; no deployment.
Purpose: paste the prompt below into Gwen 3.8. This file is a launcher for the
canonical packet, not a competing blueprint or a claim of completed software.

## Canonical handoff

Read both files completely:

- [Execution handoff and exact next slice](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906/docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/31-gwen-execution-handoff.md)
- [Domain, testing, privacy and operations contract](C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906/docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/32-gwen-domain-and-verification-contract.md)

The handoff links the existing architecture, actual desktop/mobile wireframes,
Mermaid flow/state/sequence/data diagrams, 127-entry dashboard audit, 24 domain
contracts, prior reviews, implementation checkpoints and preserved test evidence.

## Paste-ready prompt

You are Gwen 3.8, continuing Astra's Swan Coach implementation for Sean.
Sean authorizes planning, review, implementation and local verification of the
remaining slices, back to back. Follow this exact architecture and evidence.
Do not stop at another plan or ask permission for each routine implementation step.
Do not skip verification to satisfy the phrase "doesn't have to think": when the
actual code contradicts a handoff assumption, record and resolve that specific
difference without replacing the architecture or silently weakening a gate.

Start with Mega Blueprints. Read applicable AGENTS.md/CLAUDE.md, the installed
non-vibe-coding skill, current coordination lanes and these TWO canonical files:

C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906/docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/31-gwen-execution-handoff.md

C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906/docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/32-gwen-domain-and-verification-contract.md

Read their complete required source order, especially checkpoints 29/30, actual
workout integration 25/26/28, architecture 11–16, dashboard/domain audit 18/19,
nested-workspace audit 21, and the separate Command Center UI decision packet.
These v3.3 handoffs supersede older Luna kickoff instructions and stale status
paragraphs. Do not revive obsolete Jarvis v2 planning authority.

### Work in the correct lane

Runtime worktree:
C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906

Expected branch: codex/swan-coach-astra-owned-20260906
Expected HEAD: b88dd9e5c894908d9f193411fe66117294d190ef

The primary checkout is C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT; it holds
coordination and separate UI work, not this runtime lane. The earlier
tmp/worktrees/swan-coach-universe-20260904 is a preserved integration input.
Astra observed 134 dirty status entries before this documentation pass.
The actual uncommitted files are essential; checking out HEAD alone loses them.
Cached origin/main was 53120649f356c3efccee32872b530096d386642f, 70 commits behind
this lane and 27 commits ahead of it. This is not a current remote/deploy claim.

Check current status, dependencies, ownership and mounted callers before edits.
Preserve and hash source artifacts; claim exact files. No destructive reset,
blind branch copy, broad staging, production database tests or secret copying.
Existing local app configuration can target production.

### Preserve completed work

Astra locally implemented and independently verified:

1. Atomic proposal claim, canonical workout save and APPLIED state in one writer
   transaction, with current-access checks and publication after commit succeeds.
2. Strict semantic read-back of real form/session/log identities, owners, date,
   exercises, units and sets in a read-only repeatable-read PostgreSQL snapshot.
3. Server-versioned workout intents, encrypted drafts, actual exercise-library
   resolution, guarded receipt promotion, same-proposal recovery and honest
   saved-but-unverified/unknown outcomes.
4. Shared input provenance: omitted/null/undefined inputMode becomes unknown;
   explicit text/voice/ui remains explicit.

The new workout entry flag remains OFF by default. Do not turn it on to make a
demo work. Stored v2 receipts must remain readable and recoverable when entry is
disabled. Existing manual workout, billing/credit, attendance and plan semantics
must survive. Kilograms are explicitly blocked until a complete unit conversion
and chart contract is verified; never silently label kg values as pounds.

### Build G01 first

Connect the existing proposal card/service to truthful receipt and recovery UX.
Refresh the actual route -> mounted component -> service -> endpoint -> writer
and model receipt before editing. Use the exact paths and GW01–GW05 cases in 31.

The public intent's receipt state is intent.result.state, not intent.state.
Read both top-level approval intent and nested detail proposal.intent.
A verified receipt means "Saved and checked." committed_unverified means
"Saved; checking result." A saved:true WORKOUT_RESULT_UNAVAILABLE response means
the workout saved but verification is unavailable. WORKOUT_COMMIT_UNKNOWN or a
lost response means check the existing proposal/intent, without another save.

Preserve lookup identity, including proposalId when intentId is absent.
Prevent repeat approval, stale-prop resurrection, duplicate clicks and stale
actor/target responses. Hide inaccessible private details after revocation.
Missing or malformed proof must never produce a verified celebration.
Preserve legacy non-workout proposal actions.

Before runtime edits, freeze the independent acceptance gate and prove the
intended RED. Use the real service adapter with intercepted HTTP and the mounted
transcript/card, not only a mocked hook. Add real isolated transaction evidence
for claims about duplicate effects. Then implement, prove GREEN, review, update
the same packet and continue.

### Continue the ordered slices

- G02: finish provenance/focus/generation and stored confirmation-policy parity.
- G03: stable task/draft/request identities and upstream deduplication. The narrow
  staff workout-drafts API described in 31 is PLANNED, not present today; extend
  the existing transactional persistence path, never introduce a second writer.
- G04: complete shared Session Desk, Logger bridge, Floor Mode and result timeline.
  Reconcile the earlier partial draft UI and separate primary-checkout refinement.
- G05: one bounded provider/privacy boundary and authorized evidence reads.
- G06: one foreground voice lifecycle, explicit send and reliable capture cleanup.
- G07: real workout/progress evidence and deterministic, unit-safe metrics.
- G08: connect all 24 domains in the specified waves, accounting for every audited
  admin, trainer, client and general User dashboard entry and nested workspace.
- G09: opt-in scoped memory after adjudicating the existing CoachFact branch.
- G10: opt-in quiet in-app briefings with consent, freshness and delivery checks.
- G11: current-main integration, real boundary/browser/evaluation/performance,
  migration/restore/rollback evidence and the required final review chain.

### Execute Astra's product vision

One task, one selected target, one editable workout and one truthful result.
Desktop uses a bounded conversation beside the contextual work panel.
Mobile uses Talk / Workout / Results views of the same shell-owned task.
Changing tabs must preserve the draft; changing actor or target must not leak it.
A review action must carry the actual workout, not merely insert revision text
into the chat. Do not create separate draft stores in each dock.

Use Swan's existing styled-components, tokens and primitives, 44px controls,
visible focus, clear errors and reduced motion. Verify phone, QHD and 4K layouts.
The Coach should encourage and explain without diagnosis, shame, hidden
psychological profiling or claims of consciousness. Provider content is untrusted
data; model output never creates its own permission or proof of success.

### Verification and delivery

The packet supplies exact existing commands, proposed G01 cases, traceability,
performance budgets, rollback behavior and operational ownership. Follow them.
Preserved PostgreSQL evidence is 13 atomic, 15 semantic and 24 intent cases;
these are prior local results. Fresh handoff preparation reran 59 helper/planning
checks. Counts overlap and are not coverage percentages.

Remaining G01+ acceptance, authenticated whole-dashboard flows, Redis concurrency,
the complete Session Desk and release acceptance are not proven by those counts.
Use your own labeled disposable loopback database for destructive synthetic
fixtures; the earlier test container was stopped and removed. No production DB,
provider spend or outbound messages for local verification.

After every slice, update the same packet with exact changed paths, requirement
and acceptance IDs, commands/exit codes, real versus mocked boundaries, hostile
findings, rollback behavior and the next slice. Preserve immutable review evidence.
Keep implementation verification distinct from plan readiness and deployment.
Follow the existing reviewer/Final Decider chain; an unavailable reviewer is not
approval. Do not push main, deploy, migrate production, activate live writes,
spend on providers or send messages without the required explicit authorization.
Do not create a continuity closeout unless Sean asks.

Your first response should identify the verified lane and current baseline,
name the G01 gate and begin that work. Continue back to back through authorized
slices, stopping dependent work only for a genuine unresolved consequential
decision or external approval requirement.

## Verification record

The current docs-only evidence and integrity receipt are under the canonical
packet's evidence/gwen-handoff-* files. Structural readiness verifies references
and traceability, not the unbuilt application's behavior. No new Mermaid render
or authenticated browser run is claimed in this handoff.

