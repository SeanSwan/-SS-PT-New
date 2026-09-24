# SCU-BUILD-A — foundation cards for Luna

Owner: Codex architect; Luna future builder. Version: 3.0. Status: implementation in progress — S1, S2 policy metadata, S3 receipt reads, S4 verifier/writer hook, and S5a–S5c boundary contracts GREEN; S2/S3 write integration, S4 real read-back, provider caller adoption, and S6–S11 pending.
Historical planning snapshot: implementation was previously unauthorized; Sean authorized the implementation pass on 2026-09-04.
Supersedes: v2 open foundation cards; do not revert the September repairs.

## Common execution contract

One card at a time, split into named substeps below. Before each edit: fresh lane
digest, baseline SHA, explicit file claim, and current mounted caller receipt.
Create behavior tests first. Any material source/contract discrepancy is a plan
defect: record exact evidence and return to architect; never improvise a new API.
No new dependencies, generic state bus, broad refactor, billing changes, automatic
commit, merge, provider spend, flag flip or production write under this document.
Files listed NEW are proposed; existing files must be rechecked at S0.

Each exit records changed files, command/exit/count, runtime source paths, remaining
gates and one next card. A passing helper test never substitutes for its caller.
Use synthetic test accounts and isolated services. All files stay ≤300 lines;
extract by existing domain pattern, not arbitrary abstraction. Stop at card exit.

## S0 — establish the real integration base

Goal: preserve the branch’s work and prove what is missing before any implementation.
Files: this package’s evidence; existing v2/reviews; no runtime changes.
1. Resolve current remote main and latest Coach branch; record merge-base and
   commit containment. Confirm original development worktree state with its owner.
2. Run current scoped tests and classify existing failures by identity. Inventory
   all global/docked Coach mounts, including user role and mobile entry.
3. Trace workout proposal → daily form → session/log → canonical progress query.
   Quote actual model columns and mount order; do not guess new SQL field types.
4. Inspect coach_facts branch `21ed0554b` and successor commits; establish schema
   compatibility and consumer state. Record decision without cherry-picking it.
5. Prepare clean integration branch from then-current main only after branch owner
   reconciliation. The current detached planning worktree is not a release branch.
Tests: T43–T44 prepared; no live Redis/DB access assumed. Exit: reproducible
integration delta, current failure manifest, and exact proposed S1 file list.
Rollback: no runtime effect. Stop: unresolved ownership, baseline drift or schema.

## S1 — preserve voice origin and mount the shared controls

Files: `frontend/src/hooks/useCoachCommand.ts`; `CoachCommandCenter.actions.ts`,
`.controller.ts`, `.voiceCapture.ts`, `CoachConsoleDock.tsx`, `CoachCommandLogEntry.tsx`
under `Pages/coach-assistant/`; `components/CoachDock/useSurfaceCoachDock.ts`,
`SurfaceCoachDock.tsx`; `components/CoachIntentBar/CoachIntentBar.tsx`.
NEW narrowly scoped `frontend/src/hooks/coachInputOrigin.ts` if no equivalent exists.
Backend adapter: `backend/routes/aiCommandRoutes.mjs` origin validation only.

S1a: maintain provenance state with draft content. Browser and recorder callbacks
mark voice; typed edits to dictated content mark mixed; clear resets origin.
Thread origin explicitly through every submit path. Remove default text for
unspecified provenance; legacy callers receive unknown-channel policy.
S1b: integrate existing CoachIntentBar with current catalog/voice/send callbacks;
do not remove capabilities from CoachConsoleDock. Give focus ownership one cleanup
path based on visible surface, not merely the last hidden component mounted.
S1c: adapt active ConfirmationCard consumers to ConfirmationSheet preserving
callbacks and proposal review distinction. Do not delete old files in this card.
Contract: C1/C3; no changes to approved action semantics or domain payloads.
Tests: T01–T05; actual UI capture → intercepted HTTP → executor tier fixture.
Acceptance: mounted page and all inventoried docks work at 414px and keyboard-only;
typed same-client path stays low-friction; voice origin survives recorder fallback.
Rollback: revert mounts and input changes together, disable voice-origin writes;
never restore safe-text fallback while allowing voice writes.

## S2 — one server-owned action and confirmation policy

Files: `backend/services/ai/commandRegistry/*` scoped entries, `commandExecutor.mjs`,
`dispatchers/clientScope.mjs`, `operationSigning.mjs`, `renderDigest.mjs`,
`destructiveOperations.mjs`, `pendingConfirmations.mjs`, `routes/aiCommandRoutes.mjs`;
frontend `CoachConfirm/useConfirmationSheet.ts`, `ConfirmationSheet.tsx`,
`confirmationSheetState.ts`, `utils/renderDigest.ts` and shared digest fixture.

S2a: inventory every entity command’s owner resolver from actual dispatcher queries.
For plan/post/permission IDs load owner and version; no requiresClientRef shortcut.
Missing entity denies; owner mismatch re-anchors; role/assignment rechecked at confirm.
S2b: registry declares reversibility; stored op includes policy version and display
fields. Bind to signature and digest. Eliminate frontend fallback as an authority.
S2c: derive all warning/arming/count/target/allowed-mode rendering from stored policy;
unknown count displays unknown. Keep client channel honestly declared, not attested.
Contract: C2–C3. Preserve observed digest metrics and expiry-signing repair.
Tests: T06–T10,T45; include route-level owner lookup and full mounted sheet test.
Acceptance: every registry mutation has explicit policy; invalid signature or
stale entity cannot consume approval; all digest producers agree on JSON payload.
Rollback: stop new mints, expire old approvals, keep safe read-back; do not accept
unsigned new policy fields. Enforce flags remain unchanged without activation review.

## S3 — durable result and uncertainty coordinator

NEW: `backend/models/CoachIntent.mjs`, dated additive migration (name assigned only
at implementation), `backend/services/ai/coachIntentService.mjs`,
`coachIntentReconciliation.mjs`, `backend/routes/coachIntentReadRoutes.mjs`.
Modify explicit model registration/associations after schema audit; command routes
mount read routes under `/api/ai-command` without shadowing existing endpoints.
Existing `AiCommandAuditLog` stays append-only telemetry, not a mutable receipt store.

S3a: migration + model + unique actor/key request-hash claim. Review exact field
types, foreign keys, retention and index behavior against disposable PostgreSQL.
S3b: stable result/read API and transitions; test concurrent claim/cancel/timeout.
Writes require capability activation and ledger availability. Return safe reason codes.
S3c: reconciliation with bounded read-only retries; preserve unknown after deadline.
Do not dispatch a domain effect from reconciler. Link existing operation/proposal ID.
Contract: C4–C8. Approval consumption is not result truth.
Tests: T11–T16,T46, including 20 concurrent real database requests and killed response.
Acceptance: one committed effect, same semantic receipt, no auto-reissue after crash;
current access controls apply to replay/read/list before pagination.
Rollback: stop new write intents; keep ledger and reconciler; no destructive down SQL.
Stop: schema/migration gate not approved or domain atomicity cannot be demonstrated.

## S4 — workout vertical slice, from draft to verified progress

Existing authority: `backend/services/ai/coachActionProposalApprovalService.mjs`,
`coachActionProposalPersistenceService.mjs`, `backend/services/workout/aiWorkoutDailyFormService.mjs`;
frontend `utils/aiWorkoutEvents.ts`, actual Logger event consumer located at S0,
`hooks/useCoachCommand.ts`, command result presentation and progress invalidation.
NEW `backend/services/ai/coachWorkoutResultVerifier.mjs` if no real equivalent exists.

S4a: link intent to existing proposal, draft revision, exercise IDs, account timezone
and explicit units. Do not replace `/api/exercises/library` or workout body format.
S4b: add receipt persistence to the daily-form writer’s OWN transaction using a
narrow explicit hook/transaction interface. Preserve its existing accounting code.
S4c: independent authorized read of resulting form/session/log; compare IDs,
versions, sets and units; mark verified and invalidate real progress queries.
S4d: event acknowledgement updates draft only. Stop “Done”/“Saved” copy based on
dispatch boolean; render committed/unknown/verified states and recoverable drafts.
Tests: T17–T21; fixture verifies form/session/log coherence and untouched credit rules.
Acceptance: one real disposable-DB workout completes and survives reload/lost
response; unauthorized direct AI writes retain 409 SWAN_COACH_REVIEW_REQUIRED.
Rollback: disable Coach workout-write capability; native manual logging survives.

## S5 — one evidence-aware context and provider boundary

Files: `backend/services/ai/contextEngine/coachContextEngine.mjs`, domain loaders,
`backend/services/aiChatService.mjs`, `backend/services/ai/providerRouter.mjs`,
existing prompt composition/de-identification callers, `frontend/src/hooks/useAIChat.ts`.
S5a: add domain state/source/asOf contract; translate current dataQuality without
losing degraded status. Required safety domain unavailable blocks dependent plans.
S5b: route chat via providerRouter with compatibility adapter for debate consumers;
carry privacy/capability/budget policy; no new external provider or credential.
S5c: bounded read-tool loop with explicit final answer/proposal/clarification union;
assert model output cannot set actor, role, approval or database result.
Tests: T22–T25. Acceptance: unavailable pain never becomes no pain; unauthorized
data never reaches any provider; budget exhaustion leaves manual workflow intact.
Rollback: disable new inference features; do not fall back to a less private route.

Implementation note: S5a now has a pure evidence envelope and is returned by the
existing context reader. It preserves degraded status, source, and freshness and
fails closed when a required domain is not healthy. The optional provider-router
policy path and bounded conversation response union are also present; existing
non-Coach router callers retain their current result shapes. Full chat caller
adoption and tool-loop execution remain open.
