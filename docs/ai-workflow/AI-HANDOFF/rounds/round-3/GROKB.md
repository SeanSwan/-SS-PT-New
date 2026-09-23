# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-3\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7198 in / 10314 out · **Cost:** ~$0.0761 · **Wall:** 177.2s · **finish:** stop

---

The consensus candidate is mostly the right security contract. I will not rubber-stamp two false-success claims inside it.

**Held:** F2/F3/F4 remain the write-safety core. Caller-supplied `clientId` / `targetUserId` / `selectedClientId` (AITerminalPanel.tsx:119,133; aiChatRoutes.mjs:308-344; aiCommandRoutes.mjs:111-145) plus `clientResolver.mjs:110-166` role-only admin path is a Constraint-2 trust-boundary break. `dispatchAIWorkoutEvent` boolean (aiWorkoutEvents.ts:121-128) and `AiCommandAuditLog.mjs:24-91` (no `action_id`, no UNIQUE idempotency key) are false-success, not receipts. Spike-before-chat mount order (routes.mjs excerpt) is correct Express path handling; it is not an entitlement proof. Offline must never land in `AiConversation.messages/status` (AiConversation.mjs:24-83). N1 still required: the in-page dispatcher is an unauthenticated capability surface until gated.

**REJECT F2 locators.** Consensus cites `/api/ai-chat` at routes.mjs:626 and `/api/ai-command` at :627, and calls intake/proposals “unexcerpted.” The evidence-gate table contradicts that on both points: stream-spike/chat/command/hermes/debate mounts are `backend/core/routes.mjs:630-634` (first excerpt labels the same block `:625-634` — packet-internal drift, not a third mount list); intake/proposals are mounted at `:378-379` with handler evidence `coachIntakeRoutes.mjs:23-25` and `coachProposalRoutes.mjs:15-16`. Adopting 626/627 or “unexcerpted” would bake false locators into the blueprint. Finding stands; citations must be the evidence-gate lines. Extend the F3 probe to `aiDebateRoutes.mjs:57-76` (same caller-supplied client-context class).

**REJECT F8 “settles.”** That word is false-success language. RUNNING STATE still lists both items unresolved. Packet proves exactly three mounts — UniversalDashboardLayout.routes.tsx:98 admin, :177 trainer, :203 client — all to `CoachCommandCenterPage`. Owner names four dashboards (admin, trainer, client, **user**). `normalizeCoachCommandRole` / `isClientCoachRole` (CoachCommandCenterPage.tsx:35-37) are named, not excerpted. Until those bodies are in the packet, user→client alias vs missing `/dashboard/user/coach-assistant` is an open trust-boundary classification, not a settlement. `SwanCoachAssistantPage` is correctly **legacy but still referenced**; “referenced by its own tests” is not a file:line, so a CI false-success finding is not yet locatable — it is a required probe, not a close.

**Endorse (apply, do not re-derive):**
- F2 WHAT: entitlement middleware on every write-capable router. WHERE: routes.mjs:630-634 (`/api/ai-chat/stream-spike`, `/api/ai-chat`, `/api/ai-command`, `/api/hermes`, `/api/ai/debate`) and :378-379 (`/api/coach/intake`, `/api/coach/proposals`). HOW: live probe; any router that fails is BLOCKED from writes until gated.
- F3 WHAT: server-resolved client set only. WHERE: delete `clientId` args at AITerminalPanel.tsx:119 and :133; collapse `targetUserId` (aiChatRoutes.mjs:308-344) and `selectedClientId` (aiCommandRoutes.mjs:111-145) and debate `clientId` (aiDebateRoutes.mjs:57-76) into one server-issued context token; `clientResolver.mjs:110-166` existence+tenant check admins, not role-only. Receipts bind server `client_id` never client-claimed.
- F4 WHAT: receipt + CAS. WHERE: new store, not AiCommandAuditLog.mjs:24-91. HOW: `{action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE, provenance chat|command|workout-bridge|intake|proposal, status}`; machine `draft→pending_confirm→applied|denied|cancelled|failed`; AITerminalPanel success only on receipt; `dispatchAIWorkoutEvent` boolean never maps to success. DDL migrate (UNIQUE + status) **before** any seed; never seed then UNIQUE-migrate.
- F5/F6/N1/N2/N3/C6: adopt as written, with F5 including non-GET paths under the spike mount (only `GET /` is evidenced as `protect`+`adminOnly`).

No new MAJOR. Residual (d)(e)(f) and C8 stand. Stored `AiConversation.role` (AiConversation.mjs:24-83) must not authorize; that is unproven and stays open.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F2=MAJOR: routes.mjs L630-634 and L378-379: write-capable Coach routers lack a proven shared entitlement gate; failing probe is BLOCKED from writes | F3=MAJOR: AITerminalPanel.tsx L119,L133 + aiChatRoutes.mjs L308-344 + aiCommandRoutes.mjs L111-145 + clientResolver.mjs L110-166 + aiDebateRoutes.mjs L57-76: caller-supplied client identifiers cross the trust boundary; admins role-only | F4=MAJOR: AiCommandAuditLog.mjs L24-91 + aiWorkoutEvents.ts L121-128: no UNIQUE idempotency receipt; dispatcher boolean is false-success | F5=MINOR: routes.mjs L630 stream-spike: only GET / evidenced as protect+adminOnly; non-GET path auth unproven | F6=MINOR: CoachCommandCenterPage.tsx L38-42: activeTab not re-coerced on [userRole, searchParams] | F8=MINOR: UniversalDashboardLayout.routes.tsx L98,L177,L203: 3 mounts vs owner 4 dashboards; SwanCoachAssistantPage legacy, CI tests uncited | N1=NOTE: dispatcher registry needs capability-token + schema + provenance + result enum | N2=NOTE: AITerminalPanel.tsx L116-139 dual send paths need one persistence mode and defined failures | C6=NOTE: offline queue must not be AiConversation.mjs L24-83
rebuttals: F2-locators=REJECT: consensus routes.mjs:626/:627 and intake/proposals unexcerpted are false; evidence gate is :630-634 and :378-379 with coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16 | F8=REJECT: "settles" is false-success; RUNNING STATE unresolved; normalizeCoachCommandRole body not excerpted so user≡client is unproven | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | N1=AGREE | N2=AGREE | C6=AGREE | F10=AGREE struck | F11=AGREE struck
open: Q1=excerpt normalizeCoachCommandRole/isClientCoachRole/routeForcedTabForRole to decide user≡client vs missing /dashboard/user/coach-assistant | Q2=cite SwanCoachAssistantPage test file:line; unmounted-page tests are CI false-success if they pass | Q3=receipt DDL migrate UNIQUE+CAS before any seed; never seed-then-UNIQUE | Q4=confirm AiConversation.role (AiConversation.mjs:24-83) never authorizes a request
=== END-VERDICT ===
