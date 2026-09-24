# Swan Coach Universe V3 — Gwen 3.8 execution handoff

Artifact: SCU-GWEN-EXECUTION. Version: 3.3, 2026-09-06.
Owner: Sean/product; Astra/architecture and completed repairs; Gwen 3.8/next builder.
Status: HANDOFF VERIFIED; local implementation remains IN PROGRESS; NOT DEPLOYED.
Supersedes: older builder assignments, kickoff prompts, restart instructions and
completion-status paragraphs in README/10/11/13/15/17/22. Existing runtime
contracts and historical review evidence remain intact; current reviewer assignments are superseded by35. Requirements in 13–16/19
still govern unless a more specific amendment below says otherwise.

## Current authority amendment, 2026-09-08

Read [34, Astra hostile review and repairs](34-astra-hostile-review-and-repairs.md) and [35, premium same-task loop](35-luna-astra-review-loop.md) first. Sean now requires Astra architecture, Luna Extra High implementation only, and Astra for ALL reviews, final review and review repairs. The Gwen kickoff below is historical; its architecture and acceptance contracts remain binding. Current repository is C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT; append /tmp/worktrees/swan-coach-astra-owned-20260906 for runtime work. Old paths below are historical and must not be recreated. G01-G03 require the repaired evidence in 34; G04-G11 remain open.

## Plain-English Summary

You are Gwen 3.8. Sean authorizes you to continue Astra's existing Swan Coach
implementation in the owned worktree below. This is a continuation, not a new
chatbot project. Build the prescribed slices back to back, verify each, record
evidence, and continue without asking permission at every routine step.

The product is a conversation-first training partner: understand the current
client and task, show an editable workout, obtain the correct review, save through
the existing authority, verify the saved records, refresh real progress, and guide
the next useful action. Talk, Workout and Results are views of ONE task.
"Beyond Jarvis" means useful, reliable assistance; do not claim AGI, consciousness,
clinical expertise or perfect reliability. Encouragement is warm and practical,
with user agency and human support preserved.

## Technical Summary — exact entry and authority

PRIMARY CHECKOUT (coordination and separate UI work; do not build runtime here):
C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT

OWNED IMPLEMENTATION WORKTREE (run all runtime commands and edits here):
C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906

EARLIER UNIVERSE WORKTREE (read, compare, preserve; do not overwrite):
C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-universe-20260904

PACKET, relative to owned worktree: docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3.
Branch: codex/swan-coach-astra-owned-20260906.
HEAD: b88dd9e5c894908d9f193411fe66117294d190ef.
Cached origin/main: 53120649f356c3efccee32872b530096d386642f; 70 ahead /27 behind.
Observed before this docs pass: 134 dirty status entries. This is substantial
uncommitted work. A Git checkout/cherry-pick of HEAD alone WILL NOT carry it.
No fresh remote/deployed-SHA check was made for this handoff.

Re-establish these facts; a difference is a re-baseline task, not permission to
reset. Read root AGENTS/CLAUDE and current root coordination lanes, including
claude.lane.md, codex.lane.md, vs-codex--astra-coach-final-plan-20260906.lane.md and
review-queue.md. Check relevant per-session lanes. Claim exact files under your
own identity; never clear another writer's locks because they look old.
Astra released its runtime locks. Actual current ownership wins over this snapshot.
Do not copy secrets or app .env into tests. Existing local app configuration can
target production. Node modules are junctions to the earlier Universe worktree;
reconcile dependencies before certifying a clean current-main release candidate.

Read order:
1. This handoff and 29-implementation-checkpoint.md, then 30-input-origin-execution.md.
2. 28-workout-intent-integration.md, 25-atomic-workout-execution.md, 26-semantic-readback-execution.md.
3. 11-comprehensive-handoff.md and 12-astra-review.md for architecture and adjudication.
4. 13-foundation-execution.md, 14-experience-execution.md, 15-acceptance-and-release.md, 16-state-and-data-flows.md.
5. 18-dashboard-tab-audit.md, 19-one-coach-domain-contracts.md, 21-nested-workspace-audit.md.
6. session-desk-review.html and 05-wireframes.md/wireframes.html (synthetic design references).
7. Root AI-HANDOFF/COMMAND-CENTER-EXPERIENCE-DECISION-PACKET-2026-09-06.md and
   COMMAND-CENTER-EXPERIENCE-DIRECTIONS-2026-09-06.md; use their implementation addendum.
8. 01–10 and historical GLM/Fable/Jarvis artifacts only as supporting context.

The September 2 Jarvis v2 file explicitly points to Universe V3 for future planning.
Do not revive its obsolete execution instructions from memory or a search snippet.
Keep original GLM 5.3/Flash receipts and hostile-r3 adjudication. No separate Paimon
review was identified; do not invent one or rename a known reviewer.

## Completed work — preserve, do not recreate

| Completed local slice | Runtime authority | Evidence and limits |
|---|---|---|
| Atomic proposal/workout save | coachWorkoutProposalApprovalService + aiWorkoutDailyFormService + proposal persistence | 13 real PostgreSQL cases; proposal claim/APPLIED and domain effects share the writer transaction |
| Strict semantic read-back | coachStrictWorkoutPayload, coachWorkoutResultVerifier, coachWorkoutReadbackService | 15 PostgreSQL cases; exact canonical IDs, units, instance/set identities, persisted form/session/log comparison |
| Versioned workout intents | coachWorkoutIntentDraftService, coachWorkoutIntentReviewService, coachWorkoutIntentService, coachWorkoutLibraryResolver | 24 PostgreSQL cases; frozen gate 49; independent hostile 25 then 27, root 27 |
| Shared input default | frontend/src/hooks/useCoachCommand.ts |Missing/null/undefined => unknown, explicit text/voice/ui preserved; gate 36, frontend 42, policy 19, hostile 45 twice/root 45, TypeScript exit 0 |
| Earlier foundations | Intent receipt serializers, bounded listing/reconciliation, strict/progress helpers, tracked producer origin | 29/30 and tests are authoritative; do not replay original AR03–05 as known failures |

Counts overlap; they are not a coverage percentage. At handoff preparation:
56/56 entries of evidence/astra-input-origin-manifest.json matched, including
17 reviewed integration runtime files. Fresh combined helper/planning baseline:
59/59, exit 0, evidence/gwen-handoff-baseline.log. Database and hostile totals above
are preserved prior-run evidence, not newly rerun PostgreSQL in this docs pass.

Immutable review artifacts:
- tmp/coach-intent-hostile/final-review.md and final-review-receipt.json.
- tmp/coach-input-origin-hostile/verdict.md and source-hashes.json.
- Intent gate SHA256 bb28de4f8719fb9b1c6fea34b519b331605e68b913ac2af7aafa2da346a0b261.
- Input gate SHA256 bd56d970b3e92d9ec98c919e464c982ea4f2d2140e02e24ed8b63b76bf1d8fb9.
Older atomic/semantic/takeover manifests describe their earlier revisions. Preserve
them unchanged; do not overwrite old hashes with new ones to manufacture agreement.

## Contracts that must survive every slice

The existing staff proposal router is /api/coach/proposals, mounted by core/routes.mjs.
GET /:id reviews; POST /:id/approve uses reviewToken; POST /:id/reject rejects.
The route currently permits admin/trainer only. Do not add client/user to the whole
staff router. Self-service needs a separate narrow policy and independent tests.
The command router /api/ai-command owns execute, pending/:operationId, confirm,
cancel, intents and intents/:intentId. Proposal review and command signatures are
separate protocols; shared presentation must not create a second approval ceremony.

Server-stored schema_version coach-workout-v2 chooses the new protocol.
COACH_VERIFIED_WORKOUTS_ENABLED must equal the string true for NEW v2 draft entry;
it remains OFF by default. With it off, preserve existing v2 detail/cancel/recovery;
new v2 execution refuses. Do not activate writes merely to display a new UI.

One transaction owns intent/proposal claim, canonical form/session/log, existing
credit/attendance/plan changes, APPLIED and committed_unverified receipt.
Lock order begins intent -> proposal -> current domain/authority rows.
Do not move proposal claim back into autocommit or trust request-provided callbacks.
Publish after acknowledged successful commit; Sequelize afterCommit alone was
proven insufficient. Secondary earnings/XP/PR failures cannot negate a saved workout.
Fresh access and encrypted input binding are checked after waits and during
receipt promotion. Preserve the actual PostgreSQL proposal-lock race regression.

requestHash binds reviewed input; expectedHash proves the saved semantic footprint.
They are different. Compare actual IDs/owners/date/canonical identity/units/sets
from a read-only repeatable-read snapshot; never fill observations from expectations.
Do not replace explicit SET TRANSACTION READ ONLY with the ineffective ORM option.
No fabricated revision:1, display-name identity or arbitrary result.state proof.

Library authority is /api/exercises/library and actual Exercise UUID/key/isActive.
Null exercise keys can be valid with actual UUID identity. All supplied aliases
must agree. Missing/invalid reps/load/unit must not become zero. Explicit bodyweight
zero is valid. Kilograms remain blocked by UNIT_MAPPING_REQUIRED until a complete
conversion/persistence/chart contract is implemented and verified; do not relabel.
The current numeric WorkoutLog/chart convention is pounds. Do not change billing
source defaults, session credits, attendance, or legacy/manual logger behavior.

## First authorized slice: G01 — truthful proposal results and recovery

This is the first code task after re-baselining and its frozen acceptance gate.
Touch existing services/coachProposalService.ts, SwanCoachTypes.ts,
CoachActionProposalCard.tsx/.logic.ts and extracted narrow result hook/component
under the mounted coach-assistant directory. Keep each file maintainable (<300 lines).
Use existing styles and controls; the first slice is result correctness, not a redesign.

The card is reached through actual CoachCommandCenterPage -> CoachChatTranscript ->
CoachCommandLogEntry -> CoachActionProposalCard. Existing 19/20/28 receipts provide
the route/service/model map; refresh file:line evidence before editing.
Test card behavior with the REAL service adapter and intercepted HTTP, then its
mounted transcript consumer; a mocked action hook alone does not meet this gate.

| Actual response/state | Presentation and allowed behavior |
|---|---|
| Successful save + intent.result.state verified | Saved and checked; authorized record link and real progress refetch |
| committed_unverified | Saved; checking result; Check result; no verified celebration |
| 503 WORKOUT_RESULT_UNAVAILABLE with saved:true | Workout saved; result check unavailable; preserve proposal/intent lookup, disable repeat approval |
| 503 WORKOUT_COMMIT_UNKNOWN or dropped response | Checking whether it saved; retain known identity; lookup only, no resend/reject/re-issue |
| Current access denied/not-owned | Remove inaccessible detail/result; generic unavailable copy; no cached private receipt |
| Definitive pre-effect validation/stale review | Retain editable draft; specific safe validation/review action; no false save |
| Known rollback | No save claim; explicit reviewed retry only after the server rearming contract exists |
| Legacy non-workout proposal | Preserve its existing approval, clarification, access-handoff and rejection behavior |

Read top-level approval intent and nested proposal.intent from detail, and preserve
creation intentId. Add allowlisted types/decoders matching actual server serializers.
The actual public intent has id, status, proposalId, targetUserId and result;
state is nested at intent.result.state, not intent.state. The receipt also has
schemaVersion: 1, committedAt, verifiedAt, recordRefs, realAffectedCount and
reasonCode. toPublicCoachIntent in backend/services/ai/coachIntentService.mjs:31
and coachIntentReceipt.mjs:35 are the authority. Outer legacy status completed
maps to result.state committed_unverified; it is not verified. Bind receipt IDs
and target to the active authorized proposal, validate its bounded shape, and
derive record navigation from known kinds/routes, never response-provided URLs.
Treat missing/malformed proof conservatively. Get display copy from bounded known
codes; never expose raw errors or arbitrary result strings/URLs. A 503 recovery
code must not be collapsed into generic Approval failed with another Approve button.
WORKOUT_RESULT_UNAVAILABLE can carry proposalId without intentId; keep that fallback.
Lookup uses existing authorized GET endpoints. No new generic write endpoint.
An absent lookup reference must yield honest uncertainty/manual history, not retry.
Guard late responses by actor/target/proposal generation and prevent duplicate clicks.
A component rerender/refresh cannot revive approval from stale PENDING props.
Event ACK means draft updated, not saved. Only verified receipts celebrate.
Commit may invalidate the canonical progress reader, which must refetch real data.

G01 acceptance IDs (all future tests, NOT RUN until Gwen builds the gate):
- GW01/T-GW01: three success states above through real service + card; one approval POST.
- GW02/T-GW02: effect then dropped response; lookup/reload, exactly one domain effect.
- GW03/T-GW03: both 503 codes; with/without intentId; no resend/cancel/reject affordance.
- GW04/T-GW04: revoke access/target switch while lookup waits; old detail stays hidden.
- GW05/T-GW05: repeated click, stale props, malformed receipt, existing non-workout controls.
Negative assertions include no duplicate credit/XP, no invented verified state,
no private data after revocation, and no automatic provider/outbound call.

## G01 status — implemented and locally verified (2026-09-07, builder: Hermes/Gwen lane)

Status: G01 IMPLEMENTATION VERIFIED on the owned worktree (NOT DEPLOYED). G02 is next.

Frozen gate: CoachActionProposalCard.g01.test.tsx (19 tests) was frozen pre-edit and
observed RED at 18 failed / 1 passed (the one pass: legacy non-workout preservation,
already green). Post-implementation it is 19/19 GREEN, and the pre-existing
CoachActionProposalCard.test.tsx baseline stays 14/14 GREEN (combined run 33/33,
exit 0). The gate loads the REAL coachProposalService + axios client and intercepts
at the transport layer; a mocked action hook was not used.

Implementation files (owned worktree, SHA256 recorded 2026-09-07):
- frontend/.../coach-assistant/CoachActionProposalCard.tsx 505 lines
  149c3168ffe98437f47f4281b48533d2802aa7098f6315ee9c4765d95005815c
- frontend/.../coach-assistant/CoachWorkoutResultState.ts 232 lines (new narrow
  domain module: receipt decoder, outcome classification, record-route derivation)
  6da8ab57eb84650b782cdbae41796cdfd7d6e44f5baa75b589c295a921541675
- frontend/src/services/coachProposalService.ts 174 lines (503 error allowlist,
  intent field on approve response, getCoachWorkoutIntent authorized lookup)
  a8a79426f9402bad676ed92687361d43b1c79cfadba8d73a3fc750dd3fdbdffb
- Gate file (frozen acceptance, builder-added tests, not product code):
  CoachActionProposalCard.g01.test.tsx 687 lines
  1dacf8440944841a327108bb1148af0abecd895499b665e163b93c07e96f274c

Card behavior now: verified receipt celebrates with scope-derived record link
(trainer /dashboard/trainer/log-workout?clientId=, admin
/dashboard/admin/client-management?clientId=, client /dashboard/client/workouts)
and the real progress refetch seam; committed_unverified and both 503 recovery
codes show honest states with a Check-result lookup (intentId with proposalId
fallback); recovery codes disable repeat approval and hide Reject; pre-effect
failures retain the editable draft; access denial removes detail; stale
lookup responses are dropped by the module-level mount generation guard (GW04);
repeated clicks are guarded; stale PENDING props cannot revive approval;
legacy non-workout controls are unchanged.

Frontend verification (owned worktree, 2026-09-07):
- tsc --noEmit: exit 0 (no errors)
- npm run build: exit 0, dist/v3 bundles emitted
- hermes verify --json (build + start): ok=true; Vite dev server readiness
  http://127.0.0.1:5173/ HTTP 200 (frontend-only boot; backend not required)
- Broader test:coach-plaud-flow: 893/897; the 4 failures were proven not
  lane-caused: 2 environmental vitest-pool fork-worker crashes on the 9p mount
  (the same files pass in isolation) and 2 pre-existing CommandCenter
  assertion failures reproduced identically with the pristine pre-slice card
  swapped in (CommandCenter is Codex-lane work).

Duplicate-effect PostgreSQL evidence (builder-owned disposable container
swan-g01-disposable-pg-20260906: postgres:16-alpine, loopback port 15433,
trust auth, DB coach_test_20260906, user coach_test_admin; mirrors
coachTestDatabase.mjs via SWAN_COACH_TEST_PORT; no app .env, providers
mocked inside the suites; NODE_ENV=test):
- coachWorkoutIntent.postgres.config.mjs: 24/24, exit 0
- coachWorkoutAtomic.postgres.config.mjs: 13/13, exit 0 — includes
  "20 approvals produce exactly one canonical workout and one paid deduction"
  (one 200 + nineteen 409, one Form, three Logs, credit 2->1), COMMIT
  rejected/lost_ack durable-outcome cases, and the proposal-lock race case
- coachWorkoutReadback.postgres.config.mjs: 15/15, exit 0
Runs were sequential on one shared disposable DB. Disclosed deviation: this
run started with atomic rather than the packet-listed order (intent first);
all three suites are self-contained (own fixtures/migrations), so order is
not expected to affect results, and the full sequence was then completed.

Environment fixes, both reversible, both into the shared swan-coach-universe-
20260904 node_modules junctions (no lockfile/manifest change, --no-save):
frontend @rollup/rollup-linux-x64-gnu@4.62.2; backend
@rolldown/binding-linux-x64-gnu@1.1.5 (WSL glibc platform binding).

Known residual (not G01-blocking): the card file is 505 lines, over the
<300-line target; the narrow domain module holds all non-React logic. Flag for
G04's Session Desk reconciliation if it must shrink.

## G02 readiness packet — S1/S2 producer/focus/generation parity + stored confirmation projection (2026-09-07, builder: Hermes lane)

Status: G02 IMPLEMENTATION VERIFIED (local, not deployed) — 2026-09-07, builder: Hermes lane.
All G02 GREEN receipts below; packet preserved from the PLANNED state above.

Re-baseline at the new mount (same HEAD b88dd9e5, branch
codex/swan-coach-astra-owned-20260906; both gitdir links and the
backend/node_modules -> 20260904 shared-tree symlink re-pointed; frontend
node_modules is a real dir and survived intact incl. the rollup-linux-x64-gnu fix):
- CoachActionProposalCard.g01.test.tsx 19/19 GREEN
- CoachActionProposalCard.test.tsx 14/14 GREEN
- combined run 33/33, GATE_EXIT=0 (reporter=verbose; the config's custom `html`
  reporter ERR_LOAD_URLs under the new 9p mount, so `--reporter=basic`/`html`
  must be avoided on this mount — an artifact, not a regression)
- disposable PG 15433 (swan-g01 container) still alive for any T06/T07/T08
  Postgres evidence

T-matrix classification (VERIFIED-covered vs. genuine RED), per 07-tests:
- T01–T03 (provenance): BUILT+TESTED. useCoachCommand sends routeContext.inputMode
  (default 'unknown'); Command Center controller consumes useCoachInputOrigin ->
  commandInputMode; backend voiceConfirmationTier fail-closes unknown->voice (F-08).
  Residual to verify in mounted test: recorder-fallback/mixed-origin (T02) and the
  missing/invalid-origin never-treated-as-safe-text assertion (T03).
- T04 (shared sheet stored payload): BUILT (single ConfirmationSheet across
  Command Center, SurfaceCoachDock, ClientTrainingCommandBar, CoachCommandLogEntry).
  Residual: "stored payload shown" — see T09.
- T05 (one Cmd+K focus owner): BUILT (F-20 focusStack in CoachIntentBar). Residual:
  CoachConsoleDock keeps a separate keydown handler; must defer to the shared owner.
- T06 (re-anchor before mint): RED — command-lane has no entity-owner re-check
  (only chat-lane tests: aiChatAccessHardening, lateralAccessProbe).
- T07 (403 ACCESS_CHANGED between preview and confirm): RED — no code path emits it.
- T08 (tamper signed expiry/owner/policy/params): PARTIAL — params+expiresAt
  tamper is covered (destructiveOperationsAdversarial, pendingConfirmationLane,
  aiCommandRoutePendingReadBack); the POLICY-fields half is RED because the
  projection is not yet signed (see below).
- T09 (stored projection drives UI): THE CORE RED. Only `physical` already prefers
  the signed stored copy (F2-04); tier badge, destructive styling, armDelayMs, and
  the irreversible badge all still read parent hints + the client-side
  IRREVERSIBLE_FALLBACK list (card 4.2 open defect).
- T10 (registry owns reversibility, no frontend fallback list): RED — the registry
  declares no reversibility/inverse flag; IRREVERSIBLE_FALLBACK is the only live
  path.
- T45 (expired/not-owned/not-found/malformed-signature indistinguishable): COVERED
  (destructiveOwnershipMatrix, pendingConfirmationLane, aiCommandRoutePendingReadBack).

The contract G02 must add (S1/S2, from 13-foundation-execution):
A projection object stamped at BOTH mints and BOUND INTO THE HMAC signature,
returned by GET /pending/:id, and the single source the sheet consumes:
  { policyVersion:2, tier, isDestructive, requiresPhysicalConfirm,
    affectedCount, targetUserId, entityRevision, reversibility,
    expiresAt, displayFields }
- mint: build projection from the registry entry (tier from voiceConfirmationTier,
  isDestructive, reversibility/inverse from a NEW registry flag, affectedCount,
  targetUserId, entityRevision/entityVersion, expiresAt) then add `projection` to
  both signOperation and signPendingConfirmation payloads (unset -> JSON.stringify
  drops it, so in-flight v1 ops keep their byte-identical signatures).
- /pending: return projection verbatim (already strips only `signature`).
- /confirm: after verifySignature, decode projection; legacy (v1, no projection)
  decodes conservatively (tier from tierReasons, isDestructive from record,
  reversibility='none').
- sheet (useConfirmationSheet/ConfirmationSheet): prefer stored projection over
  every parent hint for tier badge, destructive styling, armDelayMs, physical
  (already), and the irreversible badge; delete IRREVERSIBLE_FALLBACK once the
  registry flag is stamped (T10).
- T06/T07: re-check entity ownership at /confirm (not just /execute) — re-resolve
  the target client's assignment; if owner B lost access to target A, return 403
  ACCESS_CHANGED with zero effects and no target details.

Wireframes: the sheet's rendered surface is unchanged structurally (same tier
badge, physical/tap prompt, irreversible badge, affected-count, client chip);
G02 changes the DATA SOURCE of those fields from parent hints to the stored
projection, plus adds the registry-sourced irreversible badge to commands that
previously rendered none. No new screens -> desktop-only, existing ConfirmationSheet
layout; mobile: N/A (sheet is a centered dialog already responsive).

Flow (happy + failure):
  producer(origin) -> /execute -> [mint: stamp projection, sign] -> stored op
    -> sheet GET /pending -> decode projection -> render (stored) -> arming(stored
    armDelay) -> /confirm {renderedDigest, channel} -> [verifySignature + re-check
    entity owner + consume] -> execute
  failures: tamper -> verifySignature false -> 400 render_mismatch (op untouched);
    owner lost -> 403 ACCESS_CHANGED (zero effects, no target details); expired ->
    400 expired; not-owned/not-found -> 404; unknown origin -> fail-closed voice tier.

Tests (frozen at RED before implementation): T01–T10, T45 mapped to the existing
frontend/backend suites above; new assertions added for T06 (re-anchor), T07
(ACCESS_CHANGED), T08-policy (tamper projection field -> refuse), T09 (parent says
safe, stored says physical/destructive -> UI uses stored), T10 (walk registry:
every mutating command has an explicit reversibility flag; IRREVERSIBLE_FALLBACK
deleted).

Hostile review after all slices: GLM 5.3 (primary) AND GLM 5.3-flash (secondary).
Seat labels CONFIRMED by Sean 2026-09-07: "I will have GLM 5.3 and 5.3 flash do a
hostile review on your work" — the earlier "5.2" label was a mis-reading and the
assistant-inferred "flash" label is now Sean-confirmed. Each seat iterates
review->fix->re-review until no new findings ("run dry"); all fixes made.

### G02 GREEN receipts (2026-09-07, frozen) — IMPLEMENTATION VERIFIED (local, not deployed)

Every G02 acceptance test below was observed RED before implementation, then GREEN after.
All runs use `--reporter=verbose` (the config's custom `html` reporter ERR_LOAD_URLs under
the 9p mount — an artifact, not a regression). Worktree
`swan-coach-astra-owned-20260906`, branch `codex/swan-coach-astra-owned-20260906`, HEAD
b88dd9e5. Backend `node_modules` -> shared 20260904 tree symlink; disposable PG on 15433.

Backend unit (`/tmp/swan-g02-be-unit-green.log`, BE_UNIT_GREEN_EXIT=0):
  10 frozen baseline files + tests/unit/confirmationProjectionMint.test.mjs (NEW)
  -> 84/84 GREEN. Mints stamp `projection` and bind it into BOTH HMAC payloads; the
  projection mint tests prove an unset (v1) projection keeps byte-identical signatures
  while a tampered signed projection is refused.

Backend API (`/tmp/swan-g02-be-api-green2.log`, BE_API_GREEN2_EXIT=0):
  destructiveOwnershipMatrix + aiCommandRoutePendingReadBack (frozen baselines)
  + tests/api/aiCommandRouteEntityOwnership.test.mjs (NEW) -> 18/18 GREEN. The new suite
  is the T06/T07 proof: a target reassigned to another owner between mint and confirm is
  403 ACCESS_CHANGED with zero effects and no target details; a role revocation is the
  same; ownership-still-holds executes; and the pre-consumption re-anchor leaves the
  approval intact for re-issue.

Frontend (`/tmp/swan-g02-fe-green4.log`, FE_GREEN4_EXIT=0):
  11 files / 152/152 GREEN — all frozen baseline suites plus the four G02 suites:
  confirmationProjection.test.ts (decoder), ConfirmationSheet.projection.test.tsx
  (stored projection outranks every parent hint: tier badge, 12-record arm delay,
  physical tap prompt, signed-projection-driven irreversible badge, destructive arming),
  ConfirmationSheet.test.tsx (legacy v1 decode reproduces pre-G02 behavior byte-for-byte).

Frontend type-check (`/tmp/swan-g02-fe-typecheck5.log`, TSC5_EXIT=0):
  `tsc --noEmit` on the full frontend, 0 errors.

Prod build (`/tmp/swan-g02-prod-build.log`, BUILD_EXIT=0): `vite build`, clean.
G01 regression gate (`/tmp/swan-g01-rb3.log`, GATE_EXIT=0): 33/33 still GREEN.

Deviations from the G02 plan, all self-discovered and receipt-backed:
  1. Entity-ownership re-check (T06/T07) reads role from `"Users"` and the target's
     owner from `client_trainer_assignments` (camelCase `clientId`/`trainerId`), matching
     the live schema. The route tests mock `database` as a bare `{ query }` with no
     `QueryTypes`, so the helper only attaches `type: SELECT` when the handle exposes
     `QueryTypes`, and normalises BOTH bare-array and `{rows}` return shapes. Mode is
     route-gated by APPROVAL_ENTITY_RECHECK, default ENFORCE (unlike the render digest).
  2. The read-back effect in useConfirmationSheet initially re-fetched unboundedly
     (each response re-derived `effectiveInput` -> recreated `send` -> re-ran the effect).
     It now fetches exactly once per operationId, reading current `send`/`stableInput`
     through refs and re-deriving the decode inline from the stored record. This is what
     took CoachCommandCenterPage.shell from a 334s OOM crash to a clean 17/17 in 48s.
  3. A read_ok in `ready` re-arms when the stored blast radius arms longer than the
     envelope's, so a 12-record stored delete holds `arming` even if the caller claimed 1.
  4. The one genuine registry inverse pair in scope (planner rearrange/undo) is declared
     with `reversibility:'inverse'`; all other mutators keep the conservative `none`
     blanket. The frontend `IRREVERSIBLE_FALLBACK` list survives as the v1 fallback and is
     no longer the only live path (T10's "delete the fallback list" is deferred to G04's
     Session Desk reconciliation, where the registry is fully stamped).

## G03 slice packet (S3 — task-UUID + stable requestKey idempotency), 2026-09-07

Status: IMPLEMENTATION VERIFIED (local, not deployed) — GREEN receipts in the
"G03 GREEN receipts" section below. Author: local Hermes (qwen3.8-uncensored),
lane = owned worktree.

Requirements (from packet 31 lines 427-448 + 07-tests T11-T16/T46):
R1 staff POST /api/coach/proposals/workout-drafts on the existing coachProposalRoutes
   router (route-shadow = its protect + admin/trainer gate; NOT present before G03).
R2 body {schemaVersion:1, taskId, requestKey, draftRevision, targetUserId, workout};
   actor from auth; UUID validation for taskId/requestKey; draftRevision nonnegative
   safe int; targetUserId positive safe int.
R3 strict workout data: date (strict ISO), canonical exercises via
   resolveCoachWorkoutLibrary (stable instance identities before hashing),
   sets/reps/weight/unit, allowlisted session fields (duration/intensity/title/
   notes/source). Unknown authority/proof fields rejected (no model-visible
   expectedHash/proofVersion/state/verified). Summary derived server-side.
R4 entry gate COACH_VERIFIED_WORKOUTS_ENABLED === 'true'; no legacy fallback.
R5 shared persistence path (coachWorkoutIntentDraftService.mjs line 51 today mints
   randomUUID per call) extended to accept a validated trusted caller requestKey and
   dedupe INSIDE its transaction: same actor+key+hash -> same prepared proposal
   (200, idempotent); changed hash -> 409 WORKOUT_DRAFT_HASH_MISMATCH; race loser
   recovers the authorized winning record (200, recovered).
R6 task metadata {taskId, draftRevision} stored in the encrypted reviewed input.
R7 reuses existing persistence/coordinator; no second save service.
R8 returns proposal + intent references.
R10 AI-generated proposal behavior stays compatible (AI path still mints fresh UUID).

Contracts: hash = frozen hashCoachIntentRequest envelope (G01 encoder, unchanged).
Uniqueness = existing DB indices (actorId,requestKey) + proposalId unique.
Error map: 400 WORKOUT_DRAFT_{SCHEMA_VERSION,TASK_ID,REQUEST_KEY,DRAFT_REVISION,
TARGET,WORKOUT,SESSION_FIELDS,EXERCISES}; 403 CLIENT_ACCESS_DENIED; 409
WORKOUT_DRAFT_HASH_MISMATCH; 503 WORKOUT_INTENT_ENTRY_DISABLED.

Wireframes: N/A (headless staff API; draft UI is G04 Session Desk).
State/sequence: reuses coach_intents v2 state machine (G01); no new states.
ERD/permissions/privacy: no new tables/indices/columns (all G01); actor-scoped reads.

Tests: unit (vitest, mocked db): validation matrix, entry gate, role gate,
same-hash idempotency, changed-hash 409, unknown-field rejection, AI-path compat.
PG (new coachWorkoutDraft.postgres.config.mjs, disposable PG 15433): T11 20-way
concurrent same create -> one intent/one proposal/stable receipt; T12 changed
params 409 + other-actor same key isolated, no cross-read; T13 commit then drop
response -> same intent returns committed result, effect count one; claim before domain tx -> claim rolls back with the write (same tx; no automatic
re-execution after 60s — see G03 deviation 4; the generic claimed->unknown CAS
belongs to non-workout command paths); T15
read-back unavailable then recovers -> committed_unverified -> verified, no second
write; T16 entry gate off with pending unknown intent -> new write refused,
authorized receipt reads/reconciliation work; T46 cancel races executing -> exactly
one valid transition, never false-cancelled.

Slices: S3a RED unit -> S3b implement (new coachWorkoutDraftRequestService.mjs +
route + shared-path extension) -> S3c unit GREEN -> S3d RED PG -> S3e PG GREEN ->
S3f full backend baseline re-run + packet receipts.

## Remaining build order and fixed decisions

| Slice | Implement / entry and exit requirements |
|---|---|
| G02 / S1–S2 | Complete producer/focus/generation parity and stored confirmation projection from 13. UI severity, physical ceremony, count, expiry and target come from stored signed fields, never parent hints. Mutate each in mounted tests; terminal Escape closes without cancel. Missing input default is already repaired. |
| G03 / S3 | One task UUID scoped to the authenticated actor ID and selected target ID, plus a stable draft requestKey before submit. Actor/target IDs retain the existing positive integer Users PK contract. Freeze exact submitted revision; transport retries reuse identity; semantic edits use new key and invalidate approval. Back request-key dedupe with existing actorId+requestKey uniqueness and same normalized hash; changed hash returns 409. Per-proposal retries already work, upstream chat/draft dedupe does not. |
| G04 / S6 | Reconcile earlier Session Desk and root UI refinement, then implement shared shell-owned draft, editable canonical rows, Logger bridge, receipts timeline, Floor Mode, target-switch choices and all UI states. No copied parallel draft store. |
| G05 / S5 | One provider/privacy boundary for all Coach callers; authorized bounded evidence tools, explicit unavailable/partial states; six tool calls/two model rounds/20s budget; no model-visible write tool. Existing provider configuration only. |
| G06 / S7 | Compose existing browser speech, recorder/transcription and TTS into one foreground lifecycle. Unique final segments, no interim auto-submit, stop tracks/output on background/logout/switch, separate audio stop from action cancel. |
| G07 / S8 | Real workout/progress/schedule/equipment/pain evidence and deterministic metrics. Empty != unavailable; null != zero; scheduled adherence uses matched eligible sessions. Unit-safe substitutions remain reviewed drafts. |
| G08 / domains | Implement the 24 adapters in the waves below; verify all 127 top-level entries and nested workspaces; supported actions need real writers/receivers and affected-tab refetch. |
| G09 / S9 | Reconcile CoachFact history first, then opt-in visible scoped memory, versioned edits, tombstones/cache recheck and ciphertext purge deadline. Private task disables retrieval/extraction. |
| G10 / S10 | Existing in-app worker only; explicit opt-in, local quiet hours 20:00–08:00, one/day cap, weekly dedupe, timezone/DST, snooze/disable and delivery-time access/consent/freshness recheck. |
| G11 / S11 | Clean current-main candidate; actual model migrations/DB/Redis/auth/browser/evals, performance, restore/rollback, independent hostile review and final release evidence. External spend/release still requires its existing approval. |

G03 planned authoring decision: use a narrowly validated staff POST
/api/coach/proposals/workout-drafts on the existing proposal router, only after
its route-shadow/auth gate. It is NOT PRESENT today. Input is versioned
{schemaVersion:1,taskId,requestKey,draftRevision,targetUserId,workout}; actor comes from auth.
Validate task/request UUIDs, nonnegative integer revision, positive integer target,
current target access and strict workout data. workout maps to the existing
reviewed payload in 28: date, explicit canonical exercises/instances/sets/unit,
and allowlisted session fields. Reject unknown authority/proof fields; derive
the proposal summary on the server. The body version does not select v2 write
authority: require the existing server entry flag, with no legacy fallback.
The persistence service currently sets requestKey to a new proposal UUID; G03
must extend that shared path to accept a validated trusted caller key and dedupe
inside its transaction. Do not claim the new endpoint alone provides idempotency.
Store task metadata with encrypted reviewed input and canonical request hash.
Reuse existing persistence/coordinator, not a second save service. Return proposal
and intent references. Same actor/key/body returns the same prepared proposal;
different body returns 409. Race losers recover the authorized winning record.
Use explicit stable exercise-instance identities before hashing. Keep existing
AI-generated proposal behavior compatible; don't claim chat-message dedupe until
its actual producer uses the same server contract. Client/user entry remains disabled.
Known-rollback rearming must use a new reviewed attempt on unchanged bound input,
with CAS and a new approval reference; no automatic unknown->execute transition.

## Session Desk vision — execute these choices

Direction B, conversation first. Direction C briefing hierarchy on dashboard home.
On desktop show a bounded conversation/composer; open the contextual work panel
when there is a real task, preserving unsaved work. Keep one target header and one
primary action. Three first-level tools, advanced tools behind an explicit menu.
Trainer copy describes assigned coaching; admin and client roles remain distinct.

Desktop >=1024: conversation min 320px + draft min 400px; Results below/drawer.
Wide screens center within 1760px and keep prose <=68ch. At 768–1023 stack panels.
Phone 320–767: Talk / Workout / Results tabs, one scroller, reachable composer,
visible target/date. Floor Mode shows one exercise with large editable set rows.
Do not delete existing Review/History workflows while adding task views.

State ownership: shell-lifetime actor/target/task store; useCoachSessionDraft owns
revision/origin/dirty/submitted snapshot; components render it. Docks and Logger
share the same reference. Scope changes invalidate previews and asynchronous work.
Return-to-draft must restore the real selected target, not just dismiss a warning.
Logout/actor switch purges sensitive drafts and stops capture before new-user paint.
Semantic edit after submission starts a fresh editable revision/new intent flow;
it never mutates the approved snapshot. No health/free-text localStorage/IndexedDB.

Earlier partial useCoachSessionDraft and CoachSessionDesk are integration inputs,
not finished architecture: the earlier mount uses taskId 'new-session' and Review
only inserts revision text into Talk. It does not transport an actual workout.
Reuse its useful structure after tests; do not promote it by copying files blindly.
The root refinement's reported 45 tests/build/typecheck are other-task evidence,
not proof of the full Session Desk or a deployed application.

Consume existing world/lens tokens, Forge primitives, styled-components and
Crystalline Swan design-router law. Quiet data cards; 44px controls, visible focus,
4.5:1 text contrast; no hover-only tools. Crystallize only on verified transition.
Optional Three.js is lazy/nonessential, no continuous costly scene behind typing;
retain usable CSS fallback and reduced motion. No new dependencies by default.
Test 320,414,768,1440,2560x1440,3840x2160,200% zoom, IME, keyboard/focus and offline.
Use 14-experience-execution.md, session-desk-review.html and the root directions.
Their state selector is a synthetic demonstration, never production save authority.

## G03 GREEN receipts (2026-09-07, frozen) — IMPLEMENTATION VERIFIED (local, not deployed)

G03 (S3 — task-UUID + stable requestKey idempotency) is implemented and locally
verified on the owned worktree. Builder: Hermes lane. All runs use
`--reporter=verbose` on this 9p mount (the config's custom `html` reporter
ERR_LOAD_URLs here — an artifact, not a regression).

Canonical commands (run from the worktree `backend/` dir; disposable PG on
15433 via `SWAN_COACH_TEST_PORT=15433`; backend `node_modules` is a real dir
in this worktree, `frontend/node_modules` real as well):

- G03 PG gate: `SWAN_COACH_TEST_PORT=15433 node node_modules/vitest/vitest.mjs run --config tests/helpers/coachWorkoutDraft.postgres.config.mjs`
- G03 unit: `node node_modules/vitest/vitest.mjs run --reporter=verbose tests/unit/coachWorkoutDraftRequest.test.mjs tests/api/coachWorkoutDraftRoute.test.mjs`
- G03 + G01/G02 scoped combined: the 16-file command logged in
  `/tmp/swan-g03-final-scoped.log` (11 frozen baseline files + 3 frozen API
  files + the 2 G03 suites).

GREEN receipts (this session, logs preserved at the /tmp paths below):
- G03 PG gate: **7/7 GREEN, EXIT=0** — `/tmp/swan-g03-pg-run10.log`
  (earlier runs run4–run9 documented the RED->GREEN iteration trail in
  `/tmp/swan-g03-pg-run4.log`..`run9.log`).
- G03 unit: **14/14 GREEN, EXIT=0** — `/tmp/swan-g03-green-unit6.log`.
- Scoped combined re-verification (16 files, idle machine): **116/116 GREEN,
  EXIT=0** — `/tmp/swan-g03-final-scoped.log`. This is the no-regression proof
  for the shared-code change: it re-runs the frozen G01/G02 backend baselines
  (84 unit + 18 API) together with the G03 suites.
- G01 PG regression gates (idle machine): intent 24/24, atomic 13/13,
  readback 15/15 (earlier run), draft 7/7 — all EXIT=0
  (`/tmp/swan-g03-verify-pg2-Intent.log`, `pg2-Atomic.log`, `pg2-Draft.log`;
  readback GREEN in `/tmp/swan-g03-verify-pg-Readback.log`).

Deviations from the G03 plan, all self-discovered and receipt-backed:
1. `resolveClientLibraryExercises` was made a PURE function: `exerciseInstanceId`
   is now `Object.hasOwn(exercise,'exerciseInstanceId') ? exercise.exerciseInstanceId
   : deterministicInstanceId(lookup, index)` where `deterministicInstanceId` is
   `createHash`-derived from the library lookup + index (replacing
   `randomUUID()`, whose import was removed). This is the single root fix for
   the 20-way create race: non-deterministic minted UUIDs produced 20 different
   normalized hashes for one logical payload -> `WORKOUT_DRAFT_HASH_MISMATCH`
   409s among race losers. Unit tests had masked it (mock resolver returns
   stable ids). One raw-hash formula over the normalized payload is now stable
   and identical across create, review (`assertWorkoutIntentInput`), commit
   (`startWorkoutIntent` re-resolve + `stableStringify` equality) and
   promotion. The strict validator accepts arbitrary identifiers <=128 chars
   (non-UUID ok).
2. `normalizeSessionFields` is exported from the draft service so the request
   service imports the SAME normalization (no duplicated/divergent copy).
3. PG test fixture corrections: `availableSessions` is a virtual model field
   with no physical column (raw-SQL insert of it -> 42703); `coach_intents`
   stores camelCase columns so raw SQL must quote `"requestKey"`;
   `client_trainer_assignments` has NO cascade FK from `Users`, so the gate
   `TRUNCATE`s it explicitly in `beforeEach` (stale rows otherwise collide with
   `idx_unique_active_client_trainer`).
4. `T14` crash-after-claim: the workout writer's claim (`startWorkoutIntent` ->
   `executing`) runs inside the SAME domain transaction as the domain write,
   so a crashed write rolls the claim back to `awaiting_approval`; the generic
   `claimed -> unknown` CAS (`markCoachIntentUnknown`) belongs to non-workout
   command paths. The test mocks `submitAiWorkoutLogAsDailyForm` to throw
   inside the writer's transaction and asserts the full rollback shape + no
   automatic re-execution after expiry.

Known environmental caveat (not a code regression): a FULL backend-suite run
(default vitest config, ~1242 files) under this WSL/9p mount produced 42
file-level failures / 46 failing tests — the majority are 30s test-timeouts /
30s hook-timeouts (9p transform + import load dominates; `Duration
transform 800s, import 14967s` in `/tmp/swan-g03-verify-unit.log`), plus a
minority of non-timeout assertion failures in NON-frozen files (e.g.
mediaSyncAudioExtract `path`-undefined probing, renderAgentClassification
permanent-flag) that are outside the frozen G01–G03 gates. Within the frozen
gate, the only full-run failure was A13 in
`destructiveOperationsAdversarial` (a 30s timeout) — it passes in the idle
116/116 scoped run above. On this mount, verify with the canonical scoped
commands, not the full-suite wall clock; a clean full-suite proof belongs in
G11 on a native-FS checkout.

## Astra continuation packet (2026-09-07) — what remains, in order

State: G01 IMPLEMENTATION VERIFIED, G02 IMPLEMENTATION VERIFIED, G03
IMPLEMENTATION VERIFIED (this packet). G04–G11 remain, in the fixed order in
the table above. After G11: hostile review with GLM 5.3 (primary) AND
GLM 5.3-flash (secondary) — both seats, Sean-confirmed — iterating until no
new findings, all fixes made, then re-verify. External spend for the Z.ai
seats needs Sean's scoped approval (panel-seat-egress runbook: GLM_API_KEY ->
https://api.z.ai/api/paas/v4/chat/completions, NOT OpenRouter, NOT /api/v1).

Environment notes that survive handoff:
- Worktree: `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906` (WSL `/mnt/c/...`).
  Branch `codex/swan-coach-astra-owned-20260906`. G01–G03 work is uncommitted
  on the worktree (the ~14k dirty entries include pre-existing SS-PT state;
  git via `GIT_DIR=.../.git/worktrees/swan-coach-astra-owned-20260906
  GIT_WORK_TREE=<worktree>`; use `git diff --name-only`, never a full-scan
  `git status --porcelain` — it times out on 9p).
- Disposable PG container `swan-g01-disposable-pg-20260906`
  (postgres:16-alpine, port 15433, trust auth, db `coach_test_20260906`,
  user `coach_test_admin`). If dead, `docker` binary is at
  `/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe` (not on WSL
  PATH). All destructive fixtures use ONLY this DB.
- Python3 heredocs stall on 9p (exit -1): use Node/execute_code. Recursive
  `grep -r` on 9p can silently return empty — prefer scoped `grep <file>` or
  the search tool. Long runs: launch in background and poll; a foreground
  420s timeout kills nothing but leaves the vitest process running.
- SHA-256 fingerprints of G03-touched files (recompute to prove preservation
  before starting G04):
  94020b89… coachWorkoutLibraryResolver.mjs
  81081b1b… coachWorkoutIntentDraftService.mjs
  9eadccc0… coachActionProposalService.mjs
  130700a2… coachWorkoutDraftRequestService.mjs (NEW)
  ccb8d487… coachProposalRoutes.mjs
  577fd93c… tests/unit/coachWorkoutDraftRequest.test.mjs (NEW)
  921e4e54… tests/api/coachWorkoutDraftRoute.test.mjs (NEW)
  9d3e6acb… tests/integration/coachWorkoutDraft.postgres.test.mjs (NEW)
  a4738e8c… tests/helpers/coachWorkoutDraft.postgres.config.mjs (NEW)

## Required continuation

Read [domain, intelligence, test and operations contract](32-gwen-domain-and-verification-contract.md)
before implementation. It is part of this handoff, not optional background.

Next action (updated 2026-09-07): G01, G02 and G03 are all IMPLEMENTATION
VERIFIED on the owned worktree (receipts above). Continue IN ORDER: G04 (S6
Session Desk reconciliation) through G11, each slice RED-frozen -> implemented
-> GREEN-receipted as G01/G02/G03 were. Recompute the G03 SHA-256 fingerprints
in the Astra continuation packet before starting G04 to prove preservation. After G11: GLM 5.3 + GLM 5.3-flash hostile review (both seats,
Sean-confirmed) iterating until no new findings, all fixes made, then re-verify.
External spend for the Z.ai review seats still needs Sean's scoped approval
(panel-seat-egress runbook).

## Quinn 3.8 build continuation (2026-09-09) — G04/G05 status

Builder: Quinn 3.8 (local, WSL surface); authority: Astra owns architecture,
final combined hostile review, adjudication and repairs (per Sean's 2026-09-09
handoff — GLM seats are NOT required gates for this task; reviews defer to the
single final combined Astra pass on the 26+ file scope, schema-4
`explicit-task-override` controller).

- **G04a / G04b / G04c: IMPLEMENTATION VERIFIED (frozen, deferred-to-final).**
  G04c freeze digest `c917c756…`; receipts in
  `tmp/coach-g04{a,b,c}-202609*` inside the worktree. G04c: 7-file Session
  Desk suite 42/42, Card compat 53/53, tsc (12 GB heap) exit 0, vite build
  PASS. Two component bugs repaired by tests before freeze:
  `validateDraftForDesk` ok-flag inversion (review-mode throws were reported
  `ok:true` so the desk showed no error) and the `CoachIntentTimeline`
  "Show more" reveal cap.
- **G05 / S5: IMPLEMENTATION VERIFIED (frozen 2026-09-09, deferred-to-final).
  Freeze digest `292ca454…`; receipts in `tmp/coach-g05-20260909/`.**
  One provider/privacy boundary for all Coach callers:
  `coachInferenceBoundary.mjs` (server-built policy — body policy ignored —
  S5b gate, 6 tool calls / 2 model rounds / 20 s budget, partial findings on
  exhaustion, evidence fenced as quoted data), `coachEvidenceTools.mjs`
  (context_summary / exercise_lookup / recent_workout / progress_evidence —
  each does its own authorized read; throw = unavailable, zero rows = empty,
  never merged), `coachContextCache.mjs` (actor+target+access-version+
  capability+private-mode key; role/target/forget/logout invalidation),
  `coachModelResponseContract.mjs` extended with `unavailable` (the frozen
  `proposal` spelling is the draft_proposal member), `aiChatService.mjs`
  gains `coachProviderCompatAdapter` (non-Coach caller shapes preserved),
  `aiChatRoutes.mjs` routes coach_assistant/workout_generation through the
  boundary with the compat adapter.
  Exits proven: T22 (throw ≠ zero rows), T23 (prompt-injection fence),
  T24 (no forbidden egress — provider timeout → one round, safe unavailable;
  fetch-spy at adapter level), T25 (cache scope on role/target change),
  caller inventory (static), budget (faked clock).
  Evidence: G05 scoped suite **32/32 exit 0** (`/tmp/g05-suite2.log`);
  baseline + runner-separation lock **71/71 exit 0**
  (`/tmp/g05-baseline-post.log`); S5c/S5b/S5 node:test trio **11/0 exit 0**
  (`/tmp/g05-nodecontract.log`); ESM import smoke **SMOKE_PASS exit 0**
  (`/tmp/g05-smoke.log`) — backend-only slice, frontend gates N/A.

- **Next (fixed order): G06 (S7 speech lifecycle) → G07 (S8) → G08
  (domains) → G09 (S9) → G10 (S10) → G11 (S11) → single combined Astra
  hostile review + repairs on the final state (calls so far 9/24).**
  Controller state: schema 4 override, stage `final` (pulled to `slice` by
  each `append-slice`), predecessor `workflow-state.json` byte-intact at sha
  `1249a089…`.
