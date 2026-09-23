# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-8\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7338 in / 9802 out · **Cost:** ~$0.0733 · **Wall:** 97.7s · **finish:** stop

---

Round 8, correctness lens. I adopt the candidate except the F4 HOW and residual (f). Those two are wrong on the packet.

F4 as written is still a broken state machine. Constraint 2 requires wrong-client mutation to be recoverable. Constraint 4 forbids minting success before a verified domain write. The candidate machine is `draft→pending_confirm→applied|denied|cancelled|failed`. `applied` is terminal. There is no `applying`, no undo edge, no compensating FK. That ships unrecoverable catastrophic-class mutations — the still-open item.

Evidence. `AiCommandAuditLog.mjs:24-91` records actor, role, resolved target, operation ID, outcome, error code, parameter hash, duration. Packet gate: no `action_id`, no unique idempotency key, no reversal linkage. `aiWorkoutEvents.ts:121-128` returns a dispatcher boolean. `useCoachCommand.ts:96,170,207` are three independent HTTP paths (`execute|confirm|cancel`) with no shared CAS row in this packet. Interleave is legal on the evidence: both confirm and cancel can read `pending_confirm` and both return success while a domain write lands. UNIQUE(idempotency_key) alone does not close this.

Three further holes in the F4 HOW, all locatable:

1. Postgres truth: `UNIQUE(idempotency_key)` without `NOT NULL` allows multiple NULLs. Packet has zero receipt schema. A nullable unique key is not an idempotency contract.
2. The audit log already has a parameter hash (`AiCommandAuditLog.mjs:24-91`). The F4 field list drops it. Distinct keys + same `(capability, client_id, parameter_hash)` mint duplicate applied mutations. The replacement is weaker than the log it forbids reusing.
3. Crash mid-write: `pending_confirm→applied` has no in-flight state. A crash after domain write and before receipt, or the reverse, violates constraint 4 either as a silent mutation or as a success with no write. `applying` + idempotent re-entry is the missing edge.

Legal machine, one row, one CAS:

`draft → pending_confirm|cancelled|failed`
`pending_confirm → applying|denied|cancelled|expired|failed`
`applying → applied|failed` (retry stays `applying`, same key; `applying ↛ cancelled`)
`applied → undo_requested → reversing → reversed|reverse_failed`

SQL shape: `UPDATE action_receipts SET status=$next, version=version+1 WHERE action_id=$id AND status=$expected AND version=$v`. `idempotency_key TEXT NOT NULL UNIQUE`. `reverses_action_id` self-FK with `CHECK (reverses_action_id IS NULL OR reverses_action_id <> action_id)`. Partial unique on `reverses_action_id` so one open reverse per parent (cycle break). Partial unique on `(capability, client_id, parameter_hash) WHERE status IN ('draft','pending_confirm','applying')`. `applied` minted only in the same transaction as the verified domain write. Undo is a new compensating row plus parent transition — never DELETE health/training rows. Do not reuse `AiCommandAuditLog.mjs:24-91` as this table; it may append-only mirror, including reversals, keyed by `action_id`.

`dispatchAIWorkoutEvent` boolean (`aiWorkoutEvents.ts:121-128`) never maps to success. `AITerminalPanel` renders saved only on `receipt.status==='applied'`.

F15 elevates residual (f). The “unproven pending write-SQL” hedge is false. The authoritative model is the contract: `AiConversation.mjs:24-83` lists `userId, role, context, targetUserId, messages, status, metadata, messageCount, lastMessageAt`. No `version`. `messages` and `messageCount` are a two-field invariant with no CAS token. Writers are `useAIChat.ts:425,448` (`POST /api/ai-chat/conversations/${convId}/messages`). Concurrent tabs/devices are a lost-update and a `messageCount ≠ messages.length` break. Fix: `version INTEGER NOT NULL DEFAULT 0`; one-statement `UPDATE ... SET messages = messages || $msg, messageCount = messageCount + 1, version = version + 1, lastMessageAt = now() WHERE id=$id AND version=$expected`; 409 on zero rows. Never read-modify-write `messages` in process memory.

No SQL-injection finding. Packet has no query construction to cite.

Adopted without change: F2 probes and write-block, F3 server-resolved client + `clientResolver.mjs:110-166` existence+tenant for admins, F5 spike kill-switch, F6 tab re-coerce, F13 try/catch, F7/F8/F9/F12 probes, N1–N3, C6, struck F10/F11, intentional C7/C8.

=== VERDICT ===
status: DISPUTE
confidence: 91
findings: F4=MAJOR: AiCommandAuditLog.mjs L24-91 + useCoachCommand.ts L96,170,207 + aiWorkoutEvents.ts L121-128: no shared CAS receipt; execute/confirm/cancel can all succeed; outcome/boolean is not a receipt | F14=MAJOR: AiCommandAuditLog.mjs L24-91: outcome with no reversal/compensating FK; F4 machine terminals at applied and drops parameter_hash already on this model — unrecoverable duplicate catastrophic mutations | F15=MAJOR: AiConversation.mjs L24-83: embedded messages+messageCount, no version; concurrent POST useAIChat.ts:425,448 lost-update + invariant break | F3=MAJOR: AITerminalPanel.tsx L119,133 + clientResolver.mjs L110-166: caller-supplied clientId; admins role-only | F13=MAJOR: AITerminalPanel.tsx L116-139: uncaught sendMessageWithConversation | F6=MINOR: CoachCommandCenterPage.tsx L38-42: activeTab not re-coerced on role/searchParams
rebuttals: F4-HOW=REJECT: draft→pending_confirm→applied|denied|cancelled|failed has terminal applied, no applying, no undo FK, nullable UNIQUE trap, dropped parameter_hash from AiCommandAuditLog.mjs:24-91 | residual-f=REJECT: AiConversation.mjs:24-83 authoritative field list omits version — not pending write-SQL; elevate F15 | F2=AGREE | F3=AGREE | F5=AGREE | F6=AGREE | F13=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F12=AGREE | N1=AGREE | N2=AGREE | N3=AGREE | C6=AGREE | F10=AGREE-STRUCK | F11=AGREE-STRUCK
open: Q1=accept F15 without write-SQL excerpt | Q2=undo policy for health rows: compensate vs tombstone | Q3=applying+same-txn vs outbox 2PC for domain writes
consensus_block: ADOPT CANDIDATE except F4 HOW and residual (f). REPLACE F4 HOW with F14 machine: one action_receipts row {action_id PK, idempotency_key TEXT NOT NULL UNIQUE, capability, server-resolved client_id, actor, parameter_hash, provenance chat|command|workout-bridge, status, reverses_action_id self-FK CHECK <> action_id, compensating_action_id, conversation_id, version}. Edges: draft→pending_confirm|cancelled|failed; pending_confirm→applying|denied|cancelled|expired|failed; applying→applied|failed (retry stays applying; applying↛cancelled); applied→undo_requested→reversing→reversed|reverse_failed. CAS: UPDATE SET status=$next, version=version+1 WHERE action_id=$id AND status=$expected AND version=$v. Partial UNIQUE(reverses_action_id) one open reverse. Partial UNIQUE(capability, client_id, parameter_hash) WHERE status IN (draft,pending_confirm,applying). applied minted only in same txn as verified domain write. Undo = new compensating row, never DELETE health/training. Do not reuse AiCommandAuditLog.mjs:24-91 as this contract. AITerminalPanel success only on receipt.status==='applied'; dispatchAIWorkoutEvent boolean (aiWorkoutEvents.ts:121-128) never maps to success. F15 HOW: AiConversation.mjs:24-83 add version; atomic JSONB append + messageCount+1 + version+1 WHERE version=$expected; 409 on miss; no in-memory RMW. KEEP F2/F3/F5/F6/F13/F7-F9/F12/N1-N3/C6 and struck F10/F11, C7/C8 intentional. RESIDUAL: (a) F2/F3 ceilings unproven until probes (b) C6 offline net-new (c) C8 redaction unverified (d) F1 artifact identity (e) N1 ungated event bus (g) F13 maybe wrapped by useAIChat — probe. DROP residual (f); it is F15.
=== END-VERDICT ===
