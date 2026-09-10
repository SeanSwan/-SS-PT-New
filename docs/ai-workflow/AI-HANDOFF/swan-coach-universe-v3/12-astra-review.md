# SCU-ASTRA-REVIEW — findings that govern the build

Owner: Astra. Version: 3.2. Effective: 2026-09-06 UTC.
Status: runtime REVISE; findings apply to b88dd9e5c.
Supersedes: inference that prior green helper suites completed the integration.

## Review scope and method

Inspected actual page/dock confirmation, command routes, intent model/service,
workout proposal approval/persistence, daily-form writer/payload normalizer,
read-back verifier, progress calculator and packet contracts. Re-ran eight
existing Node suites: 32/32 pass. Added ten independent assertions against real
pure runtime functions: AR01–AR08 fail; AR09–AR10 controls pass at reviewed HEAD.
No production data, application boot, customer conversation or paid model call.

The new tests prove bounded defects, not a live exploit or end-to-end outage.
Route integrations that do not yet exist cannot be called deployed regressions.

## Findings and exact disposition

| ID | Severity / confidence | Evidence at reviewed HEAD | Required repair / proof |
|---|---|---|---|
| AF01 | P1 VERIFIED behavior | aiWorkoutDailyFormPayloadService.mjs:107–144 strips exerciseId/exerciseKey/unit; AR01 | S4 strict versioned adapter persists canonical identity and explicit unit |
| AF02 | P1 VERIFIED behavior | Same file:93–104 maps invalid load to 0; AR02 | Strict Coach path rejects invalid/missing load; preserve deliberate bodyweight zero |
| AF03 | P1 VERIFIED behavior | coachIntentService.mjs:72 falls back to completedAt for any status; AR03 | Failed/cancelled/refused receipts never acquire committedAt |
| AF04 | P1 VERIFIED behavior | toCoachIntentReceipt trusts result.state; AR04 | Derive public truth from controlled persisted transitions and proof fields |
| AF05 | P1 VERIFIED behavior | reconcileCoachIntent promotes any found:true; AR05 | Compare identity, target, proposal, footprint and revision before promotion |
| AF06 | P2 VERIFIED behavior | coachProgressEvidence uses max(scheduled, completed); AR06 | Never change source denominator; require matched scheduled-session identities |
| AF07 | P1 VERIFIED behavior | Verifier falls back to exerciseName; AR07 | Name is presentation only; require canonical ID/key |
| AF08 | P2 VERIFIED behavior | Verifier accepts repeated setNumber; AR08 | Unique positive set ordinals per exercise instance, exact footprint comparison |
| AF09 | P1 VERIFIED source | Approval service claims proposal before calling writer; updates APPLIED after writer commit | One transaction for claim, domain effect, proposal result, intent receipt; crash tests |
| AF10 | P1 VERIFIED integration gap | Approval writer call omits coachIntent; hook accepts caller result without actual IDs | Pass trusted coordinator context; construct receipt from writer-created records |
| AF11 | P1 VERIFIED source | ConfirmationSheet uses input tier/physical/destructive; hook arms using stableInput | Stored policy drives rendering, arming and channel in one normalized projection |
| AF12 | P2 VERIFIED source | Terminal-blocked sheet still enters Confirm/Cancel branch | Terminal Close/Check result only; assert no cancel POST and working focus |
| AF13 | P2 VERIFIED source | Intent list while-loop can scan all revoked targets with per-row access calls | Bounded authorization-aware pagination; query/row budget plus cursor tests |
| AF14 | P1 VERIFIED contract drift | C4 snake-case proposal differs from camel-case five-status model; verifier requires absent model version | Explicit migration/compatibility map; no invented column; content revision digest |
| AF15 | P1 VERIFIED source | Provider boundary optional; aiChatService still owns other provider loop | Every Coach inference path adopts one policy; forbidden failover negative control |
| AF16 | P2 VERIFIED documentation | Old readiness mixes baseline/current, source sentinels and complete slices | 11 and 17 are current authority; record only fresh evidence |

Files above are relative to backend/services/ai unless named otherwise:
payload/writer live in backend/services/workout; confirmation in
frontend/src/components/CoachConfirm; route in backend/routes/aiCommandRoutes.mjs.
Source hashes in the Astra evidence receipt freeze the exact inspected content.

## Fresh independent R3 review integration

[R3 report](evidence/hostile-r3-review.md) and its diagnostic were provided by a
separate local review task. Astra reran the diagnostic: all three reproductions
observed. Its successful exit means defects reproduced, not acceptance passed.

| Review ID | Disposition | Build/test mapping |
|---|---|---|
| R3-1 / P1 | Accept: lost response becomes false "No data was changed" plus resend; no stable request key | S3 unknown outcome; T13/T14; mounted hook/action retry test |
| R3-3 / P1 | Accept: default useWorkoutLoggerDictation omits provenance and shared hook substitutes text | S1 producer sweep; T01–T03; actual default Logger path |
| R3-2 / P2 | Same defect as AF13; independent query-count corroboration, not another finding | S3 finite scan budget; T16 and cursor-continuation test |

Both glm-5.3 and glm-5.3-flash supplied valid requested/served artifacts to that
review task. RI02 in review-integration.test.mjs verifies their hashes against
the original panel receipt. These are advisory packet-only reviews; unsupported
P0/auth/concurrency allegations were rejected by the local reviewer. Shared role
UI does not prove missing backend authorization, findOrCreate is not proven racy
from a packet assertion, and existing proposal authorities must not be replaced
by a command-route-only writer. No additional provider call was made here.

Earlier "no fresh GLM answer" statements describe this task's initial review
stage. They are superseded by the provided R3 artifacts, not an invented rerun.
AR11 also reproduced a UUID mismatch under AF14: the real DailyWorkoutForm key
is UUID, while the verifier accepted only positive integers. See 17 for repairs.

## Why these defects matter together

A natural-language workout could lose its exercise identity and units before it
reaches storage. An optional receipt hook cannot fix that. Separately, a result
object could say verified without the domain read-back that the product promises.
Connecting these helpers unchanged would make a fluent assistant misleading.

The first deliverable must therefore bind canonical draft data to one transaction
and one independently read persisted footprint. More model rounds, a different
model brand, or a prettier chat window cannot supply those guarantees.

## Prior reviews preserved and adjudicated

- Fable 5.1 v2, historical GLM-5.3 and Flash reviews remain useful source inputs.
  Existing expiry-signing, digest telemetry, physical-channel and recovery fixes
  are preserved. Their historical pass/fail labels are not current certificates.
- The proposal claim already uses conditional UPDATE RETURNING. Reject the claim
  that it is merely an unguarded SELECT; accept the narrower transaction gap AF09.
- The baseline gate compares failed-file identities, not only counts. Its remaining
  limitation is failures inside an already-baselined file; compare test IDs there.
- GLM and Flash share a provider lineage. Do not count them as two independent
  architectures agreeing. This historical limitation is superseded by the paired
  R3 artifact receipt above; Astra did not dispatch additional provider calls.
- Prior Astra rounds found and repaired defects, but the next attempted independent
  round was usage-blocked. This root review supplies new evidence, not a retroactive
  pass for that missing round. Prior defect totals are not reused without a ledger.
- No reviewed artifact identified as Paimon was found in the earlier scoped search.
  Do not infer that name is Fable, or invent a reviewer/model result.

## Scope decisions

Retain one Coach workspace; do not replace the chat stack or launch a public
operator agent. Keep exercise-library, proposal review, billing and native logger.
A server command catalog is not permission to expose every command to the model.
Hermes commands, shell execution, broad account administration and new autonomous
financial actions remain outside the public Coach tool allowlist.

Expose capabilities only when server activation, authenticated role and the real
adapter all permit them. Every action card must have a mapped domain owner.
A missing owner resolver disables that new capability; it does not grant globals.

## Research check and design inference

The reviewed primary-source guidance supports small composable workflows and
measuring agent outcomes rather than fluent text. This informs the deterministic
writer and independent read-back architecture.
[Anthropic: effective agents](https://www.anthropic.com/engineering/building-effective-agents),
[Anthropic: agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

OpenAI's AgentKit announcement currently carries a June 3, 2026 winding-down
notice for Agent Builder and Evals. Do not choose those hosted products as a new
mandatory dependency for this build.
[OpenAI: AgentKit](https://openai.com/index/introducing-agentkit/).

Session Desk, correction-as-conversation, and a source-linked training timeline
are Astra's Swan-specific recommendations. No claim that these patterns establish
AGI or that any model is universally best is made.

## Gate

REVISE runtime until the applicable AR tests and real integration tests pass.
Plan completeness and release readiness are separate decisions. Fresh checks after
each repair must cover both the changed boundary and its actual consumer.
