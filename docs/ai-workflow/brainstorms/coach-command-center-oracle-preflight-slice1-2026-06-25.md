# Coach Command Center Oracle Preflight - Slice 1

Date: 2026-06-25
Branch: codex/coach-command-oracle-slice1
Worktree: C:\tmp\sspt-coach-command-oracle-20260625

## Oracle Classification

| Recommendation | Verdict | Reason |
| --- | --- | --- |
| Run a required preflight gate before shell changes | ADOPT | Coach Command has overlapping chat, intake, PLAUD, command-lane, and admin controls; route/state/write proof is required before broad layout work. |
| Slice 1: Honest Thread and Composer Interactions | ADOPT | Directly addresses Sean's screenshot feedback: thread/history controls and action buttons must not cheaply dump canned text into the composer. |
| Remove prompt-only quick intents | ADOPT | The prior repair removed dock quick intents; this slice also removes the remaining Ops "Draft in chat" prompt-only button. |
| Preserve real route/workflow controls until replacements exist | ADOPT | Logger, Builder, Intake, PLAUD, History, command send, proposal approvals, and quick-client creation remain wired. |
| Do not build a general command/action framework | ADOPT | Slice stays inside existing controller/action/component contracts. |
| Do not blindly cherry-pick pending repair work | ADOPT | Worktree starts from the inspected repair commit and records the adopted hunks below. |
| Claim frontend-only is always low risk | REJECT | The frontend owns final write triggers and server calls; tests must prove behavior, not assume safety. |
| Per-thread draft storage now | REJECT | Premature. Thread identity is useful; draft persistence needs a later data contract. |
| Full chat-first shell rebuild now | DEFER | Needs Slice 1 verification first; larger layout can follow after behavior is honest. |
| Route prompt replacement with explicit Insert Draft | DEFER | `?teachPrompt=` and routed handoffs are existing contracts with tests; replacing them needs a separate migration. |
| Stale-request protection for rapid thread switching | NEEDS PROBE | `useAIChat.loadConversation` sets active conversation from async responses; rapid switching race should be tested before Slice 3. |
| Owner/admin account operations role proof | NEEDS PROBE | `AdminAccountSwitcher` is admin-only in this surface, but server owner allowlist behavior belongs to the separate owner-admin route/config audit. |

## Canonical Surface Receipt

- Route import: `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:116` lazy-loads `./Pages/coach-assistant/CoachCommandCenterPage`.
- Mounted admin route: `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:634` mounts `{ path: '/coach-assistant', component: CoachCommandCenterPage }` for admin.
- Mounted trainer route: `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:744` mounts the same page for trainer.
- Mounted client route: `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:769` mounts the same page for client.
- Legacy `/admin/*` redirect: `frontend/src/routes/DashboardRoutes.tsx:118` redirects to `/dashboard/admin/coach-assistant`.
- Mounted page/controller: `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx:45-49` creates `useCoachCommandCenterController({ userRole })`.
- Backend route mounts that matter to this surface: `backend/core/routes.mjs:294`, `372-380`, `623-625`, `680`.

## State Ownership Map

| State | Owner | Evidence |
| --- | --- | --- |
| Active conversation/thread id | `useCoachCommandCenterController` local state | `CoachCommandCenter.controller.ts:47-49`, `79-83` |
| Loaded messages | `useAIChat` active conversation/messages, projected through command logs | `CoachCommandCenter.controller.ts:127-133`; `frontend/src/hooks/useAIChat.ts:266-274`, `443` |
| Composer text | `commandText` in controller | `CoachCommandCenter.controller.ts:49`, `164-168`, `240`, `274`; `CoachConsoleDock.tsx:94-111` |
| Selected client | Route `clientId`, active thread target user, and effective label | `CoachCommandCenter.controller.ts:85-91`, `146-147` |
| Active tab/workspace | `CoachCommandCenterPage` `activeTab` | `CoachCommandCenterPage.tsx:52-55`, `112-125`, `174-180` |
| Intake queue selection | URL `intake`, `useCoachIntakeQueue`, and `CoachIntakeWorkspace` props | `CoachCommandCenter.controller.ts:46`, `233`; `CoachCommandCenterPage.tsx:197-205` |
| Intake review draft/proposal state | Proposal card local detail/review token/status state | `CoachActionProposalCard.tsx:47-63`, `76-105`, `136-159` |
| PLAUD upload/review state | Page upload request counter, action handler, embedded PLAUD workspace | `CoachCommandCenterPage.tsx:54-55`, `117-129`, `209-218`; `CoachCommandCenter.actions.ts:95-109`; `PlaudMergeWorkspace.tsx:42-67`, `163-171` |
| Owner/admin operations state | Admin account switcher visibility is path+role-gated in this surface | `CoachCommandCenterPage.tsx:56-58`, `158` |

## Mount / Effect Map

| Surface | Mount behavior | Network/effect behavior | Slice 1 result |
| --- | --- | --- | --- |
| Chat | Renders `CoachChatTranscript` and `CoachConsoleDock` only when `activeTab === 'chat'` | Route mount lists conversations once; routed/thread selection can load a thread | Preserved. Composer remains user-owned unless submitting, voice dictation, or explicit route prompt. |
| History | Renders `CoachCommandLeftRail` on history tab | Selecting a thread calls `loadConversation(thread.id)` and returns to chat | Preserved. Thread select no longer inserts prompt text. |
| Intake | Renders `CoachIntakeWorkspace` on intake tab | Queue hook loads actionable intake; intake prompt callbacks now update status only | Changed. Intake/workflow buttons no longer mutate composer text. |
| PLAUD | Renders embedded `PlaudMergeWorkspace` on PLAUD tab | Upload button switches tab, increments request, clicks embedded uploader | Preserved. No composer mutation. |
| Ops drawer | Renders `CoachCommandOpsRail` for non-client roles | Contains real links/actions plus quick-client write | Changed. Removed prompt-only `Draft in chat`; quick-client write no longer inserts canned text. |

## Write Trigger Map

| Trigger | Endpoint / write path | Guard observed | Slice 1 status |
| --- | --- | --- | --- |
| Composer submit | `useCoachCommand` posts `/api/ai-command/execute`; fallback posts `/api/ai-chat/conversations` and `/messages` | Command lane may require confirmation; chat write only after user submits typed text | Preserved |
| Command confirmation | `/api/ai-command/confirm`; cancel uses `/cancel` | `CoachCommandLogEntry` confirmation UI; backend `aiCommandRoutes` protected | Preserved |
| Quick client add | `coachCommandClientService` posts `/api/clients/onboard` | Name validation; backend mount `clientOnboardRoutes`; no workout write | Preserved, no composer injection |
| Proposal detail/approve/reject/clarification | `/api/coach/proposals/:id`, `/approve`, `/reject`, `/clarification-answer` | Detail load + review token required before approval | Preserved |
| Transcript upload/apply | `/api/workout-logs/upload`, then `adminClient.logWorkout` posts `/api/workout-forms` | Upload validates client/file; apply validates review/client/date/exercises | Preserved |
| PLAUD clip upload/merge/approval | `/api/plaud/clips/upload`, `/api/plaud/merge`, `/api/plaud/merge-requests/:id/approve` plus apply helpers | Client-side id/size guards; review UI gates logging | Preserved |
| Intake prompt/workflow buttons | Previously composer mutation only | No server write; now no composer mutation either | Changed |
| New conversation | `chat.newChat()` local state clear | No network write by itself | Changed: clears composer instead of inserting canned prompt |

## Role Map

| Role | Route | Tabs/controls | Server guard note |
| --- | --- | --- | --- |
| Admin | `/dashboard/admin/coach-assistant` | Chat, Intake, PLAUD, History, Ops drawer, AdminAccountSwitcher | Backend routes use protect/authorize/admin guards by endpoint; owner allowlist not changed in this slice. |
| Trainer | `/dashboard/trainer/coach-assistant` | Chat, Intake, PLAUD, History, Ops drawer | Workout/log/proposal endpoints use admin/trainer or relationship guards where applicable. |
| Client | `/dashboard/client/coach-assistant` | Chat, History only; no Ops/Intake/PLAUD | Client mode coerces tabs away from operator workspaces. |

## Branch Reconciliation

| Commit / hunk family | Verdict | Notes |
| --- | --- | --- |
| `85802a88b fix(coach-command): declutter guide and open history threads` | ADOPT | Removes dock quick intents, loads history threads, shifts heavy surfaces into tabs. This slice further tightens the remaining prompt-fill paths. |
| `7a8862426 feat(coach-command): surface active thread identity` | ADOPT | Keeps active-thread identity header and direct `threadId` route load tests. |
| Canned composer fill on new thread / quick client / workflow prompt | RECREATE | Existing repair did not cover these; patched in this slice. |
| General shell/layout rebuild | DEFER | Requires verified Slice 1 baseline first. |

## Slice 1 Stop Condition

Proceed to tests for Slice 1. Do not start Slice 2/5 in this branch until the focused shell/ops tests prove:

- thread/history selection loads real conversations without composer mutation;
- New Conversation clears to a blank composer;
- prompt-only Ops control is absent;
- intake workflow buttons do not mutate user-authored composer text;
- quick-client creation keeps real creation behavior but does not insert canned follow-up text;
- send still submits user-authored text through the existing command/chat path.