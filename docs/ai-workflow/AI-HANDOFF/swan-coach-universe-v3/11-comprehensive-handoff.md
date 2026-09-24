# Swan Coach — Astra's implementation contract

Artifact: SCU-HANDOFF. Owner: Sean/product, Astra/architecture, Gwen 3.8/next builder.
Version: 3.3. Effective: 2026-09-06; supersedes 3.2 executor/status paragraphs.
Status: implementation IN PROGRESS; reviewed local slices in29/30, not deployed.
Current executor entry: [Gwen handoff](31-gwen-execution-handoff.md) and
[mandatory domain/test contract](32-gwen-domain-and-verification-contract.md).
Sean explicitly requested this transfer after Astra's verified repairs. The full
admin/trainer/client/user scope and Astra's architectural decisions remain intact.
Supersedes: the previous version of this handoff and conflicting execution/status
instructions in this packet's v3.0 documents. Runtime authorities remain intact.

## Plain-English Summary

Build a training partner that can move from conversation to an editable workout,
save through Swan's existing reviewed workflow, prove what saved, and guide the
next training action. The signature experience is **Session Desk**: Talk, Workout,
and Results are three views of one task. Floor Mode enlarges its set controls.

Astra's review found useful foundations and material remaining defects. Do not
restart the bot or replay already-built foundation cards. Finish the reliable
workout vertical slice, then voice, training intelligence, visible memory and
quiet in-app check-ins. The ordered work below is intended to run back to back.

## Technical Summary

Build location:
`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906`

Branch: `codex/swan-coach-astra-owned-20260906`.
Sean explicitly authorized takeover. The previous worktree received concurrent
edits during verification, so 108 task files were copied and hash-verified into
this separate worktree. Its tmp/coach-isolation-receipt preserves the captured
source. Continue only here; do not overwrite the earlier writer's worktree.
See [takeover source receipt](23-takeover-source-receipt.md) for this delta.
Latest implementation/test state: [implementation checkpoint](29-implementation-checkpoint.md).
Completed next slices: [atomic workout/proposal](25-atomic-workout-execution.md) and
[semantic read-back](26-semantic-readback-execution.md), followed by
[versioned workout intents](28-workout-intent-integration.md). The original
[takeover verification](24-takeover-verification.md) remains historical evidence.
The shared command default is repaired in [input provenance](30-input-origin-execution.md).
That receipt supersedes stale ownership blockers and test counts in17/22.
Reviewed runtime HEAD: `b88dd9e5c894908d9f193411fe66117294d190ef`.
Origin main freshly observed through `git ls-remote`:
`53120649f356c3efccee32872b530096d386642f`.
Merge-base: `4c2fd507e7e956a3a947c3a972229afbec927e90`.
Runtime branch is 70 commits ahead / 27 behind that ref. This is local development,
not deployed evidence. Recheck these values before implementation.

Pre-review dirt: ACTIVE-INDEX.md, README.md, this handoff, and
evidence/glm-blueprint-review-packet-20260905.md. They were already changed/untracked.
This review preserves the index, README and GLM packet; do not stage them incidentally.
The shared checkout is a different, heavily dirty branch and is not the build base.

## Read order and authority

1. This file: scope, defaults, current status, continuation rules.
2. [Astra findings and adjudication](12-astra-review.md).
3. [Exact foundation work: S0–S5](13-foundation-execution.md).
4. [Exact experience work: S6–S10](14-experience-execution.md).
5. [Acceptance, evaluation and release: S11](15-acceptance-and-release.md).
6. [State machines, transactions and data flows](16-state-and-data-flows.md).
7. [Fresh evidence and readiness limitations](17-astra-readiness.md).
8. [Interactive synthetic wireframe](session-desk-review.html).
9. [Every dashboard route/tab](18-dashboard-tab-audit.md) and
   [One Coach domain contracts](19-one-coach-domain-contracts.md).
10. [Nested workspace audit](21-nested-workspace-audit.md) and
    [Latest implementation verification](29-implementation-checkpoint.md).

Keep 01-audit through 10-readiness as baseline/history and detailed R01–R13 /
T01–T48 reference material. This 3.2 set wins on a stated conflict. It does not
rewrite historical review results. Earlier lane ownership is superseded in this
isolated candidate by Sean's explicit takeover instruction; historical copies
and the previous worktree remain preserved.
Their stale completion statements must not overrule this handoff.

## What is actually built

| Slice | Evidence-backed status at reviewed HEAD | Remaining exit |
|---|---|---|
| S0 | Historical baseline/history captured; main drift verified | Candidate reconciliation; real schema/Redis/DB receipts |
| S1 | Provenance helpers and mounted shared controls exist | All-surface behavior, target-switch and focus ownership proof |
| S2 | Registry policy metadata and signing repairs exist | Entity-owner resolvers; stored policy governs every visible control |
| S3 | Bounded receipt services and atomic v2 proposal/intent integration verified locally | Task-level authoring identity; consistent mounted cancel/recovery UX |
| S4 | Strict library resolution, canonical transaction and actual-model read-back verified in25/26/28 | Full mounted save/receipt/progress journey; separately authorized self-service policy |
| S5 | Context, provider and response helpers exist | Every Coach caller adopts policy; bounded tool loop and privacy proof |
| S6 | Synthetic wireframe; partial draft-only earlier-worktree desk and separate root UI refinement | Reconcile candidates; shared shell task, real edit/save/results, Floor Mode |
| S7 | Existing dictation/recorder/TTS paths | One composed foreground voice lifecycle; no write replay |
| S8 | Opt-in metric helper exists | Correct denominator/empty semantics and canonical data adapter |
| S9 | Separate CoachFact history exists | Reconcile actual branch; consent, scoped memory, forget/cache tests |
| S10 | Plan only | Consent-aware in-app worker and cancellation |
| S11 | Test matrix and historical checks exist | Real acceptance corpus, browser/DB proof and release receipt |

No full S0–S11 completion is certified. Source-regex checks and helper tests do not
prove an authenticated user saved a workout. Full frontend TypeScript validation
passed in30; that receipt is not authenticated-browser or release proof.

## Decisions Astra makes for this build

- Choose **Session Desk B** as the implementation direction under Sean's request
  to use Astra's recommendations. Floor Mode is part of it; no separate chatbot.
- Reuse existing domain writers, frontend stack, exercise library, voice capture,
  chart consumers, notification workers and provider configuration.
- Build workout draft → approved save → independent read-back first. Hide new
  capabilities that lack their own complete path; no inert or simulated controls.
- One active task per actor/target in the desk. Multiple persisted receipts can be
  inspected; parallel mutable client drafts are deferred.
- Sensitive draft content is memory-only. Reload recovery means server receipts
  and safe metadata; never promise recovery of unpersisted health/free-text data.
- General encouragement is included. Clinical/therapeutic functionality is outside
  this release. No emotional-dependency optimization or claim of AGI/sentience.
- No new vendor, paid inference run, outbound messaging channel, autonomous
  financial operation, or production activation is needed to build local slices.
- Memory/proactivity use conservative OFF defaults until their explicit consent
  and release gates pass. Existing trained-client domain facts stay authoritative.

These decisions replace avoidable "ask the architect" stops. Production release,
new provider/data-egress policy, and sensitive offline persistence remain separate
decisions because their effects extend beyond the local build.

## Execute back to back

Re-baseline ownership, current source/evidence and candidate/main delta. Do not
reproduce already-repaired cases as expected failures. Follow31's G01–G11 sequence:
receipt/recovery UI first, then stored policy, task authoring identity and Session
Desk, followed by inference/voice/evidence/domain/memory/briefing and release gates.
Each card uses RED → implement → GREEN → hostile self-review → evidence.
When its exit passes, record it and continue; do not ask permission at every card.

S0-R can finish the read-only delta without merging. Local isolated development
may continue on the reviewed branch once owned-file conflicts are resolved.
Create/reconcile a current-main integration candidate before integration acceptance;
do not silently graft this old branch onto main or promise its whole ancestry ships.
A locked runtime file blocks that file's edit, not independent test/spec work.
Use the repo coordination mechanism; never silently clear another agent's claim.

No automatic push, live migration or deployment. Local commit timing follows
current repo review/Final Decider policy and explicit file staging. A card receipt
does not grant a production operation. If a gate requires unavailable infrastructure,
report it as BLOCKED, retain the failure evidence, and continue only independent
work; do not skip the gate or relabel a mock as its replacement.

## Exact first-session deliverables for Gwen

1. Baseline receipt: HEAD/ref/dirty paths, owned lane, source hash comparison.
2. Existing scoped suites rerun with actual exit; G01 future REDs frozen and observed
   by ID. No environment file or production database imported.
3. Source/model/route map for receipt/recovery UI. Preserve the proven workout
   transaction; proposal approval and command confirmation remain separate protocols.
4. Integration delta identifying all relevant main-only changes and CoachFact
   successors. Disposition per file/commit; preserve unrelated changes.
5. First repaired batch: G01 real service/card/transcript recovery tests and their
   implementation. Continue the remaining sequence in31 after its verified exit.

## Executor kickoff

Use the complete prompt in31 and mandatory annex32. Build only in the Astra-owned
worktree named there. Older Luna prompts naming the earlier Universe worktree are
superseded; that tree remains an input to reconcile, not an authorized overwrite.

## Preservation and delivery

The pre-edit planning snapshot verified 909 entries and two isolated sample
restores. Portable discovery omitted this untracked handoff; it received a separate
byte-for-byte snapshot and restore check before replacement. See 17 for hashes.
After Sean's explicit build request, Astra also repaired the unlocked strict
workout payload, verifier and progress helpers, plus default Logger dictation.
See 29 for the latest checks; 22 and 17 record earlier verification boundaries.
No production schema mutation or release is claimed. The local backend integration
is verified within25/26/28; full mounted authoring/recovery integration remains open.
