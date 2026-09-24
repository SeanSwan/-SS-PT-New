# Swan Coach G02 confirmation robustness

Artifact SCU-G02-36. Version 1, 2026-09-08. Owner Sean; architect and repair owner Astra; required tests Luna Extra High. Status PLAN READY after the linked baseline and integrity gate; implementation and review NOT RUN at authoring.
This is the next slice in 34/35, amending G02 in 13/31/32. It does not replace the Universe packet. G04-G11 and the separate provider harness remain open.

## Baseline and preservation

Exact worktree: C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906.
Branch codex/swan-coach-astra-owned-20260906, HEAD b88dd9e5c894908d9f193411fe66117294d190ef plus inherited tracked/untracked work. Cached origin/main only; no remote or deployment refresh.
The old task cwd is deleted. Explicit workdir is required. Windows Git understands the relocated .git pointer; WSL Git needs explicit GIT_DIR/GIT_WORK_TREE. Tests use existing WSL Node22.23.2/Linux dependencies. No install or application env copying.
Lane digest found no fresh foreign locks. Native session lane s01a07fb8 claims only this slice. Earlier review source is preserved, not overwritten.
Evidence base: tmp/coach-g02-robustness-20260908. preservation.json hashes 21 current source/plan files and two retained isolated restores, all verified. New plan/receipt files have no previous bytes. Existing native vault hook is absent in this worktree; explicit scoped snapshot used. Native workflow enforcement is UNPROVEN pending a real sentinel; enrollment is not enforcement proof.
Luna baseline: four CoachConfirm suites,63 PASS, exit0 (149.44s). WSL baseline source /tmp/swan-coach-g02-baseline-20260908-zwIqfb; log SHA256 2e65a7b494132fa6c6e2a5e23b71709935d59a1c46ce2588d9bc5abcc2277ed8. Initial WSL access denial was setup failure, not behavioral RED.

## Requirements, acceptance and boundaries

User/job/outcome: an authorized operator confirms exactly the stored action currently displayed, with its actual policy and target, or receives safe recovery. Parent hints and retired operations never authorize a different action.
Roles: existing trainer/admin/client authorization remains server-owned. Astra makes architecture/review/repair decisions; Luna Extra High writes/runs required tests here. No new permission question between authorized slices.

| Requirement | Measurable acceptance | Tests |
|---|---|---|
| G02-Q01 | Only absent own projection property uses legacy; present-invalid never enables or POSTs confirmation | R01,R02,R10 |
| G02-Q02 | Valid real producer shapes display stored count/target; conflicting optional duplicate facts refuse | R02,R10 |
| G02-Q03 | Exact read response ID and per-lifetime read/digest/timer ownership; A-B-A gets a fresh lifetime | R03,R04,R05 |
| G02-Q04 | One synchronous action latch; no duplicate/competing confirm/cancel, no retired callback/UI effects | R06,R07,R08,R09 |
| G02-Q05 | Existing safe legacy, physical-channel, refusal/retry and recovery semantics remain; existing UI accessible at mobile/desktop | R01,R09,R10,COMPAT,TYPES,BROWSER |

Scope is existing confirmation decoder/hook/render plus focused tests. Backend signing, authorization, SQL, provider selection, proposal/intent authority, digest wire format, global stores, and later Session Desk work are non-goals.
Forbidden effects: no confirm POST from invalid/mismatched/loading/retired state; no foreign details; no automatic mutation retry; no second action from same ready closure; no old completion callback after replacement/unmount; no DB/provider/production access.
Assumptions: this gates accidental/stale client behavior. The server remains authoritative against forged clients. Aborting local interest cannot undo a POST already sent. No unresolved product decision in this slice.

## Architecture and exact caller path

Mounted caller CoachCommandLogEntry.tsx passes confirmation.operationId to an unkeyed ConfirmationSheet. The sheet reads useConfirmationSheet; it obtains the stored object from GET /api/ai-command/pending/:operationId, derives policy via confirmationProjection, hashes the existing renderDigest subject, then POSTs /api/ai-command/confirm. Cancel uses /api/ai-command/cancel.
Backend pending lookup is owner gated. buildConfirmationProjection in backend/services/ai/confirmationProjection.mjs is the shape authority. Pending mint stamps count1 inside projection and omits top-level count; destructive mint may repeat it.
Decoder owns pure validation and returns explicit invalid output without throwing inside rendering. Hook owns one current operation lifetime, immutable admitted operation/digest/policy tuple and synchronous action latch. Existing pure state machine retains ceremony and terminal semantics. Sheet owns only presentation and focus.
A generation is local to this hook, not global or persisted. An effect-only reset is insufficient: rendering also masks state not owned by current ID/generation. A component key alone does not protect direct hook consumers or late callbacks.
Keep server-matching renderDigest format unchanged. Existing digest excludes projection; HMAC binds projection server-side. This gate does not claim full projected-field render proof or human attention.

## Frozen projection contract

Absent means no own projection property. Explicit null/undefined, array, primitive, empty object, unknown version, invalid required fields are invalid; no coercion, fallback tier or zero substitution.
Required v2 fields: exact number policyVersion2; tier one of fire_and_forget/read_back/deliberate/refusal; true booleans isDestructive/requiresPhysicalConfirm; finite nonnegative integer affectedCount; targetUserId explicit null or positive safe integer; nonempty opaque entityRevision string; reversibility none/inverse/compensation; nonempty parseable expiresAt string; non-array displayFields object.
displayFields must contain description and commandType as string or explicit null; affectedCount equal to projection count; targetUser equal to projection target. Extra keys allowed. No new projection ID, UUID syntax, createdBy requirement or entityRevision format. entityRevision is identity metadata, not a DB revision.
When duplicated top-level facts exist, validate consistency of affectedCount, requiresPhysicalConfirm, destructive, description, commandType, clientId, expiresAt. Missing duplicates remain valid; expiry compares instants, optional nullable producer fields use only actual producer normalization. No new universal params.clientId schema.
refusal remains parseable but is unavailable at hook admission and cannot confirm. Expiry remains subject to current server authority; no new TTL protocol.
Legacy rendering/policy stays as before when projection is genuinely absent.

## State ownership and effects

1. On committed operation-ID change or unmount, retire generation and arm timer; initialize loading/null operation/null digest/clear error. Mask prior data even before passive effect reset.
2. Read captures requested ID/generation. Require record object and string id exactly equal to requested ID. Validate before publication. Await digest locally, recheck ownership after every await and before every write. Publish admitted tuple consistently before arming/ready.
3. Timer belongs to admitted generation/policy. Replacement receives full delay; stable inline parent rerenders neither refetch nor restart.
4. Confirm requires current admitted ID, digest, ready state and permitted channel. Claim synchronous latch before POST; capture immutable ID/digest/generation tuple.
5. Duplicate confirmation and cancel during submitting are no-ops even within one turn. Existing explicit pre-consumption refusal may release for user retry; ambiguous/terminal outcomes never automatically repeat.
6. Late submit success/error after switch/unmount cannot update sheet, call onDone or unlock replacement.
7. Cancel shares latch, blocks other actions and invalidates read/digest/timer immediately. Only current cancellation can call onCancel once. Late cancel cannot dismiss replacement.
8. Invalid projection, mismatched read or digest failure maps to existing unavailable state with no exposed details/target/policy from invalid or retired operation.

## Desktop/mobile wireframes and states

Existing 05/14 wireframes, session-desk-review.html and 16 diagrams remain canonical.
This unchanged-layout confirmation delta has actual low fidelity layouts:

Desktop:
+------------------------------------------------+
| Confirm Swan Coach action             [tier]    |
| [Client target]                                |
| Action: stored description   Affects: N records |
| Stored irreversible/physical warning if needed |
| [arming progress or status / recovery message]  |
| [Confirm] [Cancel]  OR [Re-issue]/[Close]        |
+------------------------------------------------+

Mobile (existing responsive sheet):
+---------------------------+
| Confirm action    [tier]  |
| [Client target]           |
| Action: stored description|
| Affects: N records        |
| Warning/status wraps      |
| [Confirm] [Cancel]        |
| or [Recovery control]     |
+---------------------------+

Loading/partial read/digest: generic Pending action, no admitted tier/target/details/warnings, Confirm disabled. Empty/missing/malformed/denied/read failure: unavailable with existing bounded recovery; no target leak. Valid ready: actual stored target/count, existing ceremony. Success: existing done. Unknown: no repeat guidance/history check. Cancel/defer: existing dismissal only when current. Retry: explicit existing safe pre-effect or fresh-request recovery.
Keep one polite live region; existing focus entry/recovery and keyboard controls; no hover dependence. Verify44px actions and no horizontal overflow at390/1440. Broader screen-reader/authenticated shell journeys remain later release gates.

## Flowchart, sequence, applicability

~~~mermaid
flowchart TD
  I[Operation ID committed] --> R[Retire old lifetime and load]
  R --> V{Matching read and valid policy?}
  V -->|No| U[Unavailable with bounded recovery]
  V -->|Yes| D[Digest admitted stored object]
  D -->|Failed| U
  D -->|Current tuple| A[Arm current generation]
  A --> C{Ready and permitted channel?}
  C -->|No| A
  C -->|Yes and latch free| P[POST immutable ID and digest]
  P -->|Current known success| S[Done once]
  P -->|Current pre-effect refusal| A
  P -->|Current unknown or terminal| H[Check history; no repeat]
  R -->|Cancel| X[Latch cancel and retire continuations]
  A -->|Cancel or defer| X
  X -->|Current completion| E[Dismiss once]
  R -->|ID changes| I
  D -->|ID changes| I
  A -->|ID changes| I
  P -->|ID changes or unmount| Z[Ignore late UI effects]
  U -->|Explicit recovery| I
  H -->|Read-only history| E
  S -->|Rollback candidate needed| B[Restore isolated source snapshot and rerun gates]
~~~

Mermaid source supplied; renderer availability not established at authoring. Existing renderer-supported preview can be shown in the task; no renderer claim from Markdown existence.
State/sequence: applicable, steps above and canonical16. Permissions/privacy: applicable, unchanged server owner/actor/target boundary plus no stale detail/callback leakage; synthetic transport only. ERD/migration: N/A delta, no storage change; inherited ledger/proposal/workout model remains binding. Provider flows: N/A delta, no provider calls. Operations/rollback: applicable below.

## Executable tests and traceability

Luna owns required tests; Astra owns these already-identified review repairs. New focused tests are explicitly invoked apart from normal suite until RED->GREEN. Tests use real decoder/hook/sheet and deterministic deferred synthetic transport/digest/timers. No fake source-text assertions as runtime proof.

| Test | Requirement | Action and expected observation |
|---|---|---|
| R01 | Q01,Q05 | Absent legacy confirms; explicit null/undefined and malformed required fields produce zero POST |
| R02 | Q01,Q02 | Producer-shaped pending/destructive positive fixtures; omitted duplicate accepted; conflicting duplicate refused; count1 displayed |
| R03 | Q03 | Foreign returned ID yields unavailable, no foreign detail, no arm or POST |
| R04 | Q03 | Switch A-B during read/digest and A-B-A; retired resolutions rejected; submitted B ID/B digest only |
| R05 | Q03 | Switch during arming; full B delay; inline rerenders retain one read/timer |
| R06 | Q04 | Two same-turn confirms and competing cancel yield exactly one confirm POST |
| R07 | Q04 | Switch/unmount during submit; old success/error suppressed; current unknown cannot replay |
| R08 | Q04 | Cancel during read/digest; duplicate actions blocked; old cancellation cannot dismiss B |
| R09 | Q04,Q05 | Current explicit pre-effect refusal allows user retry; terminal denial does not; channel controls green |
| R10 | Q01,Q02,Q05 | Mounted sheet/caller has valid count, bounded invalid recovery/focus/live status, no old target, exact payload |
| COMPAT | Q05 | Original four63-case suites plus relevant CoachCommandLogEntry/shared-sheet caller regressions remain green |
| TYPES | Q05 | Existing frontend TypeScript command exits0 after change |
| BROWSER | Q05 | Real scoped browser component at390/1440: valid/invalid/switch states, keyboard/recovery/no overflow, synthetic network |

Commands from frontend under WSL: node node_modules/vitest/vitest.mjs run src/components/CoachConfirm/confirmationProjection.robustness.test.ts src/components/CoachConfirm/ConfirmationSheet.robustness.test.tsx --reporter=verbose --maxWorkers=1; then same runner on existing four suites and exact mounted caller regressions discovered through rg.
Types: node --max-old-space-size=12288 node_modules/typescript/bin/tsc --noEmit --pretty false.
Build: node node_modules/vite/bin/vite.js build --outDir ../tmp/coach-g02-robustness-20260908/frontend-dist (required final scoped verification).
Browser: adapt existing tmp/coach-astra-hostile-20260908/browser-card-review.mjs as isolated synthetic Confirm sheet harness; never app/customer credentials.
At authoring: baseline PASS; new RED/green/types/build/browser NOT RUN. Test fixture edits require documented real-producer mismatch and retained originals. No setup/import failure counts as RED.
Unit/component and client transport contract apply. DB/provider/migration/Redis/performance load tests are N/A for this frontend-only delta; existing backend must remain untouched. Server authorization/atomicity evidence stays inherited, not freshly verified. Timeout/interruption/races covered above. Structural checker alone cannot prove behavior.

## Slices, operations, review and readiness

Entry: preserved baseline + Astra contract + valid plan receipt. Slice G02-R: Luna required RED tests -> Astra repairs -> fresh scoped green/caller/types/build/browser -> frozen manifest -> independent Astra hostile review. Findings stay within same slice; Astra repairs and reruns affected gates before new immutable review. Only then G04a per35.
Owned production files: frontend/src/components/CoachConfirm/confirmationProjection.ts, useConfirmationSheet.ts, ConfirmationSheet.tsx. confirmationSheetState.ts only if existing state semantics require narrow compatibility; no new state model. Owned tests: existing decoder/projection tests and two new robustness files above, plus narrowly necessary caller fixture correction proven against actual producer. Report scope expansion before editing.
Preserve original tests; evidence resides only in scoped tmp directory and amendment36. README gets a verified-snapshot-backed current-entry link after the gate.
Performance: no new dependency; one GET and one digest per lifetime, at most one action POST; bounded local memory/timer, no polling. Existing2500/3500ms ceremony rules and canonical15 release budgets remain. Owner Sean for operations; Astra for repair evidence.
Signals: existing unavailable/refusal/unknown status and exact action counts. No raw target, payload or credential logging. Rollout remains local; no commit/push/deploy/production write.
Rollback: preserve this source snapshot; restore into isolated candidate, verify hashes and focused compatibility. Never overwrite mixed live checkout or try to undo a domain mutation through source restore.
Hostile architecture challenges: parent fallback, zero substitution, early data publication, effect-only reset, same-turn double actions, stale cancel/read/digest/submit, partial synthetic projection fixture drift, and digest-protocol scope. All explicitly bound above.
Model selection reuses Sean's Astra-only review authority; no GLM/other reviewer or paid fallback. Native Codex metadata records root Astra xhigh, architect Astra high, builder Luna xhigh. This is routing metadata, not independent provider telemetry. Subscription snapshot shows available allowance and zero extra credits.
v3 controller/enrollment will bind native session01a07fb8-5d55-7651-aabb-528f05f73c6e. Native hook loading remains UNPROVEN until sentinel; do not claim enforcement. Historical reviews in34/35 remain preserved, and task-wide caps must include them. Current G02 allows at most3 rounds, root remaining review admissions7 after conservatively counting5 historical reviews, one in flight,8000 output tokens including reasoning,600s/call, zero paid API.
Readiness receipt links this plan, preserved inputs, actual baseline and future tests honestly. PLAN READY is not implementation verification. Next authorized work: required RED tests, then Astra G02 repair. G04 and full Swan Coach completion remain open.

