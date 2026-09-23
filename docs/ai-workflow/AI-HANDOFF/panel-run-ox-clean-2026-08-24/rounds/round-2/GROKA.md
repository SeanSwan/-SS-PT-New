# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-2\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6734 in / 7657 out · **Cost:** ~$0.0592 · **Wall:** 136.3s · **finish:** stop

---

The consensus candidate is too narrow and F1’s proposed schema is Postgres-incorrect. The packet’s own receipt gate already says the action/receipt contract is unproven (`AiCommandAuditLog.mjs:24-91`, `aiWorkoutEvents.ts:121-128`). Three cosmetic patches do not close wrong-client writes, lost updates, or command-transition races.

**REJECT consensus F1 (fix shape, not the defect).**  
`AiCommandAuditLog.mjs:24-91` is an append-only attempt log: actor, role, resolved target, operation ID, outcome, error, param hash, duration. It has no `action_id` and no idempotency key. Putting `commandIdemKey UUID NOT NULL UNIQUE` on *that* table is wrong:

- UNIQUE on an audit table forbids a second row for the same logical command, so retries/failures cannot be logged.
- `NOT NULL` on a populated table with no DEFAULT fails the migration (build contract).
- UNIQUE without `INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING *` (then SELECT) does not implement “return original receipt” under concurrency — the loser raises `23505`.
- A client-minted UUID is not idempotent unless the client persists it across refresh/crash. The candidate’s AC (1) assumes that outbox and does not specify it.

Correct relation split: a receipt/command table owns identity + status; the audit log FKs to it and stays INSERT-only.

**AGREE F2 / F3** as far as they go. They do not touch the state machines below.

**New MAJOR — caller-supplied client id, admin unscoped.**  
`aiCommandRoutes.mjs:111-145` accepts `selectedClientId`. `clientResolver.mjs:110-166` scopes trainers but not admins beyond role. Packet: “server entitlement behavior for every command family is not yet proven.” Constraint 2: wrong-client mutation is catastrophic. Stale tab / rapid switch / forged body can mint a success receipt on the wrong client; denied ops must not write audit-success.

**New MAJOR — conversation row is a lost-update race.**  
`AiConversation.mjs:24-83` keeps `messages`, `messageCount`, `lastMessageAt` on one row. No version, no unique `(userId, role, context, targetUserId)`, no message child table, no FK to a command receipt. Concurrent `POST /api/ai-chat/conversations/${convId}/messages` (`useAIChat.ts:425,448`) is read-modify-write. `messageCount` can diverge from `messages`. Chat memory cannot be reconciled to domain truth (constraint 3).

**New MAJOR — execute/confirm/cancel has no transition guard.**  
`useCoachCommand.ts:96,170,207` hits `/api/ai-command/execute|confirm|cancel`. No command row, no `status` CHECK, no `UPDATE … WHERE status = 'pending'`. Double-confirm, confirm-after-cancel, and cancel-after-success are undefined. Audit-log insert cannot serialize those transitions.

**New MAJOR — `targetUserId` bind-once.**  
`aiChatRoutes.mjs:308-344` accepts `targetUserId` on create. Trainer access is cited at `:610-625` (different handler). If create does not call the same gate, the row stores an unauthorized target and later messages inherit it (TOCTOU / sticky scope). Parameterization of `targetUserId` / `selectedClientId` / `convId` / debate `clientId` is **not in the packet** — do not assume it is safe; probe, do not invent injection.

**New MAJOR — no shared context/receipt key across lanes.**  
Chat (`targetUserId`), command (`selectedClientId`), debate (`aiDebateRoutes.mjs:57-76` `clientId`), proposals (`routes.mjs:379`) are separate identities. No server-owned `(actor, role, client, session, actionId)` tuple. UI-event `true` from `aiWorkoutEvents.ts:121-128` is not a write. Offline retry (constraint 6) will duplicate.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/idempotency key; UNIQUE on this audit table is the wrong Postgres model (blocks retry rows, breaks migration, 23505 under race) | F2=MINOR: frontend/src/components/AITerminalPanel.tsx L116-139: requestContext branch passes mode 'both'+options, else omits them — conversation mode fork | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: Gemini/Qwen consensus is not mounted runtime (backend/core/routes.mjs L630-634) | F4=MAJOR: clientResolver.mjs L110-166 + aiCommandRoutes.mjs L111-145: caller selectedClientId; trainers scoped, admins not; per-family re-check unproven — wrong-client success receipt | F5=MAJOR: backend/models/AiConversation.mjs L24-83: messages+messageCount+lastMessageAt on one row, no version/unique/FK; concurrent POST useAIChat.ts L425,448 lost-update | F6=MAJOR: useCoachCommand.ts L96,170,207 execute|confirm|cancel with no status row or UPDATE WHERE status='pending' — double-confirm/cancel-after-success undefined | F7=MAJOR: aiChatRoutes.mjs L308-344 persists targetUserId; access check at L610-625 is a different handler — sticky unauthorized target | F8=MAJOR: no shared actionId across chat/command/debate/proposals; aiWorkoutEvents.ts L121-128 boolean is not a receipt — retry duplicates
rebuttals: F1=REJECT: defect real, fix wrong — do not UNIQUE commandIdemKey on AiCommandAuditLog; add receipt table + ON CONFLICT RETURNING + audit FK; client key requires durable outbox | F2=AGREE | F3=AGREE
open: Q1=parameterization of targetUserId/selectedClientId/convId/debate clientId not in packet — probe, do not assume safe | Q2=does conversation CREATE apply the L610-625 trainer gate? | Q3=SwanCoachAssistantPage still posting via leftover hook? | Q4=proposal claim-row concurrency/review-token binding
=== END-VERDICT ===
