# SCU-AUDIT — current reality and adjudication

Owner: Codex. Version: 3.0, 2026-09-04. Status: source audit; live behavior unproven.
Supersedes: status assumptions in September v2; preserves original reviews.
All source paths below are relative to the isolated baseline root in README.

## Baseline and history

Shared checkout: `wip/comms-notifications-2026-07-05`, initially `a89cbf0f0`, 769
porcelain entries. Do not build or stage this unrelated working state.
Remote `git ls-remote origin refs/heads/main` returned `53120649f...`; the latest
Coach branch ends at `bfc7a78986` and is not contained by that main. Neither source
presence nor a local commit proves deployed behavior.

| Commit | Meaning | Treatment |
|---|---|---|
| `c9032974f` | September v1 and GLM review inputs | Historical design |
| `117e329a5` | Required signing key and signed approval fields | Preserve |
| `059fd17b6` | Redis approval-store adapter | Preserve; real Redis still needs evidence |
| `726a44674` | Fable 5.1 startup and destructive-scope repairs | Preserve |
| `d31841650e` | Fable 5.1 v2 blueprint | Prior execution plan; superseded here |
| `eedc565e7`–`177c974be` | Phase 1 metrics, read-back, tier, sheet, Lane work | Inspect mounts; do not infer completion |
| `8e4dd7ba6`–`df5ed3058` | GLM findings and subsequent local fixes | Reproduce each claim |
| `cdc9594d3` | Both September 3 round-2 reviews preserved | Advisory evidence |
| `bfc7a7898` | Health reporting stops advertising an inert flag | Latest inspected Coach commit |

`git log --all --source -- <v2 path>` identifies its origin as `d31841650e`.
The September GLM files identify glm-5.3 and glm-5.3-flash; their provider identity
metadata is inherited, not independently re-attested in this task. No new paid
review was called. No “Paimon” document was found in the searched handoff/blueprint
trees. Fable 5.1 is verified in the v2 authorship; name equivalence is only a guess.

## Canonical surface receipt

| Link | Baseline source evidence |
|---|---|
| Role route declarations | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:109,211,238` map admin/trainer/client `/coach-assistant` |
| Actual route render | `UniversalDashboardLayout.shell.tsx:133` mounts DashboardRoutes; `UniversalDashboardLayout.shellPieces.tsx:94–108` renders role path and `<Component />` |
| Page and composer | `Pages/coach-assistant/CoachCommandCenterPage.tsx:226` mounts `<CoachConsoleDock>` |
| Controller | `CoachCommandCenter.controller.ts:43–44,173` uses chat, commands, and voice capture |
| Command caller | `CoachCommandCenter.actions.ts:156` → `useCoachCommand.ts:120` literal `/api/ai-command/execute` |
| Confirmation caller | `CoachCommandLogEntry.tsx:145` mounts ConfirmationCard; `useCoachCommand.ts:220` posts `/api/ai-command/confirm` |
| Dock confirmation | `components/CoachDock/SurfaceCoachDock.tsx:116` mounts ConfirmationSheet → `useConfirmationSheet.ts:111,171` reads pending and confirms |
| Backend mounts | `backend/core/routes.mjs:442–443` intake/proposals, `:713` stream-spike, `:714` chat, `:715` command |
| Backend handlers | `backend/routes/aiCommandRoutes.mjs:165,439,461,638` execute/read-back/confirm/cancel |
| Conversation model | `backend/models/AiConversation.mjs:19–99`: id, userId, role, title, context, targetUserId, messages, status, metadata, messageCount, lastMessageAt; table ai_conversations |
| Command audit model | `backend/models/AiCommandAuditLog.mjs:24–98`: id, userId, userRole, commandType, targetClientId, destructive, requiresConfirmation, confirmationState, operationId, outcome, errorCode, paramsHash, paramsRedacted, durationMs |
| Workout authority | `coachActionProposalApprovalService.mjs:10–14` imports daily-form writer; `workout/aiWorkoutDailyFormService.mjs:96,178,209,253` transaction, session, form, commit |

Mount order matters: stream-spike precedes general ai-chat. Workout routes mount
`/api/workout` at 411 before `/api/workout/sessions` at 412; any future direct
workout adapter must complete that narrower shadow walk. This task does not claim
all workout endpoints were audited. Existing proposal route ownership is explicit
at `coachProposalRoutes.mjs:21,30,39,52` (detail/approve/clarification/reject).

## Surface classification

| Surface | Classification | Consequence |
|---|---|---|
| CoachCommandCenterPage | Canonical role-configured page | Main conversational workspace |
| SurfaceCoachDock | Canonical embedded component at inspected planner/bootcamp/pain mounts | Preserve local work and in-place review |
| ConfirmationCard | Active legacy implementation, rendered by Command Center | Migrate adapter; not safely deletable |
| ConfirmationSheet | Active in surface dock, absent from Command Center render chain | Convergence is incomplete |
| CoachIntentBar | Dormant; component/export and tests, no production JSX consumer found | Card 1.4 is not mounted completion |
| SwanCoachAssistantPage | Legacy, outside verified role route configuration | Preserve; deletion is separate |
| User-role global entry | Unproven | Must not inherit admin access; S1 verifies route and role policy |

## Findings that change this plan

| ID | Confidence / priority | Evidence and consequence | Card |
|---|---|---|---|
| A01 | VERIFIED source / P1 | Voice transcribes into text; actions caller omits inputMode; dock submits only selectedClientId/surface; useCoachCommand:129 defaults to text. Voice provenance is lost on these paths. | S1 |
| A02 | VERIFIED source / P1 | Above production mounts retain two ceremonies; Lane lacks a JSX consumer. Unit existence guards cannot prove adoption. | S1 |
| A03 | VERIFIED design gap / P1 | aiWorkoutEvents:113–128 acknowledgement is boolean. Audit model lacks unique intent/replay receipt. Consuming an approval is not proof a domain write committed. | S3–S4 |
| A04 | VERIFIED source / P1 | v2 3.1 auto-fails unsettled after 60s; v2 1.3 permits reissue after burn. Timeout cannot distinguish failed save from lost response. | S3 |
| A05 | VERIFIED source / P2 | aiChatService:2035 uses its own available-provider loop; contextEngine is separate. No single provider/context policy can yet be assumed. | S5 |
| A06 | VERIFIED source / P2 | nonceSatisfied has no production caller; latest sheet copy correctly removed spoken-confirm promise. | S7; keep tap-only until wired |
| A07 | VERIFIED source / P2 | irreversible field is forward-only; actual source is client fallback set in useConfirmationSheet. | S2 |
| A08 | PROBE / P1 | Entity-owned actions can skip requiresClientRef; complete owner/access mapping is not established by pair comparison. | S2 |
| A09 | VERIFIED source / P2 | Context engine keeps degraded metadata but substitutes []; preserve and carry quality into generated language. Do not claim it has no degradation system. | S5 |

## Prior-review adjudication

| Prior input | Disposition after inspecting latest branch |
|---|---|
| Fable F51-1 pre-listen signing/store gate | Preserve repair; real boot/Redis deployment still requires integration proof |
| GLM R2-2 / Flash F2-05 missing digest telemetry | Repaired in source: observe branch emits render_digest_absent_observed; default still observe, activation unknown |
| Flash F2-03 unsigned expiry | Repaired in both signature payloads; baseline tests exercise tampering |
| Flash F2-04 physical ceremony from stored operation | Hook enforces stored field, but sheet warning still reads input.physical; S2 unifies the rendered policy |
| GLM R2-3 / Flash F2-01 nonce without caller | Accept missing capability; copy fix is not voice implementation |
| GLM R2-1 non-clientRef identity | Retain as PROBE, not proven exploit; owner lookup + full route test required |
| GLM baseline is count-only | REJECT literal claim: test-baseline-gate.mjs computes failing path set and compares names. Retain narrower issue: new failures inside already-baselined files need separate case evidence |
| August OX receipt-backed idempotency and shared target context | Adopt; preserve conflict/denial receipts, do not introduce second approval authority |
| August OX proposal check-then-claim concern | Current claimPendingProposal:41–59 already uses conditional UPDATE RETURNING; do not rebuild a guard that exists |
| Multiple seats agreed | Not proof; GLM and Flash share provider lineage. Local source/behavior evidence decides |

## Non-destructive hygiene receipt

Root inventory, Coach filename inventory, route/surface comparison, and Git history
were inspected. Classifications: runtime files above are active/dormant/legacy;
v2 and August panels are active reference transitioning to historical; this
package is planned/unimplemented; evidence and HTML are QA/design artifacts.
Candidate separate cleanup: legacy Coach page family and duplicated confirmation
code, only after importer/mount sweep and approval. Nothing was moved or deleted.
Existing ignored tmp storage contains the isolated worktree and preservation;
no new root screenshot or log class was introduced, so no ignore change is needed.
