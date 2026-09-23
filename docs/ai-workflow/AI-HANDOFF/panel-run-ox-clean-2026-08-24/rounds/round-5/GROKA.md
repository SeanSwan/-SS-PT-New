# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-5\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6412 in / 9462 out · **Cost:** ~$0.0694 · **Wall:** 178.1s · **finish:** stop

---

The candidate is not adoptable as written. F1’s remedy is a correctness defect if implemented as specified; the unresolved `AiConversation` state machine was dropped. F2–F4 stand.

**F1 defect stands; F1 remedy is REJECTED.** `AiCommandAuditLog.mjs:24-91` records actor, role, resolved target client, operation ID, outcome, error code, parameter hash, duration — and has no `action_id` and no unique idempotency key. `useCoachCommand.ts:96,170,207` exposes execute/confirm/cancel against that hole. That is a real MAJOR.

The prescribed fix — add a global `commandIdemKey UUID UNIQUE`, client-generated, “return the original receipt” — is the wrong contract:

1. **Wrong table.** The model is an audit log. A UNIQUE idempotency key turns an append-only trail into the command-instance store. A retry after success must not erase the retry attempt; confirm/cancel (`useCoachCommand.ts:170,207`) need a single instance row with a state machine, not a second audit insert and not a silent overwrite of the first.
2. **Unbound UNIQUE is a wrong-client / cross-actor receipt replay.** Constraint 2: wrong-client mutation is catastrophic. On conflict the handler would return whoever first inserted that UUID. The log already has actor + resolved target client (`AiCommandAuditLog.mjs:24-91`); the unique key must be scoped and the conflict path must re-check both. `aiCommandRoutes.mjs:111-145` accepts caller `selectedClientId`; `clientResolver.mjs:110-166` scopes trainers but not admins. An unbound hit can return another client’s receipt or skip the entitlement re-check the packet still marks unproven (`commandExecutor.mjs:309-343`).
3. **No insert-before-execute state machine.** Insert-after-execute double-runs the dispatcher on a retry. Insert-pending-then-execute requires `pending|succeeded|failed|cancelled`. Acceptance criterion (1) (“return original receipt, no new row”) is false for in-flight rows (must not return a success that has not been verified — constraint 4) and false for failed rows (replay policy is unspecified; offline queue residual then mints duplicates).
4. **Postgres race under default READ COMMITTED.** Concurrent INSERT of the same key: loser raises unique_violation; a following SELECT cannot see the winner’s uncommitted row. The candidate specifies neither `INSERT … ON CONFLICT DO NOTHING RETURNING *` then SELECT, nor a 409-pending retry. AC(1) is therefore unimplementable as stated.
5. **Parameter hash must not be the key.** Identical intentional repeats (two “log this set” commands) share a hash; using it would collapse distinct actions.

Required F1 fix, not the candidate’s: introduce a command-instance row (do not overload the audit log) with `commandIdemKey UUID NOT NULL`, `UNIQUE(actorId, commandIdemKey)`, persisted `targetClientId`, `status` check-constrained to `pending|succeeded|failed|cancelled`, nullable `conversationId` FK. Executor: insert `pending` first; `ON CONFLICT (actorId, commandIdemKey) DO NOTHING`; re-read; if actor/target mismatch → 403; if `pending` → 409; if terminal → return that receipt and append a new audit row. Never execute before the pending row exists. Client persists the key in any offline queue before first POST. Failed keys are not reused.

**F5=MAJOR (new; dropped from the candidate).** `AiConversation.mjs:24-83` has `userId`, `role`, `context`, `targetUserId`, `messages`, `status`, `metadata`, `messageCount`, `lastMessageAt` — no idempotency key, no version/etag, no unique session tuple, no FK to the command instance. Create is `useAIChat.ts:217`; posts are `:425,:448`. Chat and command are two unjoined state machines. A lost create + retry forks conversations; a client switch between fork and `selectedClientId` diverges scope (constraint 2). `messages` + `messageCount` without a proven row-per-message table or version column is an unproven lost-update under concurrent posts. Fix: `conversationIdemKey UUID NOT NULL`, `UNIQUE(userId, conversationIdemKey)`; nullable `AiCommandAuditLog.conversationId` / command-instance FK; message append isolated (messages table + FK, or JSONB with `version` CAS); create is idempotent on that key.

**F2=AGREE.** `AITerminalPanel.tsx:116-139` — requestContext branch passes `'both', null, requestContext`; the other omits them. Positional drift is real. Fix at L124-133: one `buildChatParams({ text, context, title, clientId, mode, requestContext })` object; both branches call the same helper; type `useAIChat.ts` so a missing `mode` cannot compile.

**F3=AGREE.** `APP-AI-HIVE-MIND.md:7-22` is runtime-drift vs `routes.mjs:630-634` and intake/proposals at `:378-379`. Mark DORMANT; remove from the active architecture index; link the blueprint.

**F4=AGREE.** Authoritative mount is `backend/core/routes.mjs:630-634` (evidence-gate table). Retire L625-634 as a citation. Not a runtime defect.

Not accepted as fixed by this candidate: action/receipt lifecycle, offline reconcile, per-family entitlement on `commandExecutor.mjs:309-343`, Hermes/debate classification.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/idempotency key and no command-instance state machine for execute/confirm/cancel (useCoachCommand.ts L96,L170,L207) | F2=MINOR: frontend/src/components/AITerminalPanel.tsx L116-139: positional sendMessageWithConversation branches disagree on mode/options | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: stale Gemini/Qwen consensus vs mounted lanes at routes.mjs L630-634 and L378-379 | F4=NOTE: backend/core/routes.mjs: authoritative mount is L630-634; L625-634 is a stale citation | F5=MAJOR: backend/models/AiConversation.mjs L24-83: no idempotency/concurrency token and no FK/join to command instances; useAIChat.ts L217/L425/L448 is an unjoined retry-unsafe state machine
rebuttals: F1=REJECT: defect stands but a global UNIQUE client UUID on the audit log is the wrong table, unbound (cross-actor/cross-client receipt replay), insert-after-execute races, and READ COMMITTED unique_violation cannot implement AC(1) | F2=AGREE | F3=AGREE | F4=AGREE | F5=REJECT: candidate dropped this unresolved model; not covered by F1–F4
open: Q1=failed idempotency keys reusable or mint-new-key-only | Q2=AiConversation.messages JSONB vs hasMany (lost-update) | Q3=clientResolver.mjs L110-166 admin unscope intentional | Q4=hermes/debate inside or outside the brain boundary
consensus_block: NOT ADOPTED. Replacement ruling: keep F2 helper-object fix at AITerminalPanel.tsx L124-133 + typed useAIChat.ts; keep F3 DORMANT + delist APP-AI-HIVE-MIND.md; keep F4 citation L630-634 only. Replace F1 remedy: do not UNIQUE the audit log; add a command-instance entity with commandIdemKey UUID NOT NULL, UNIQUE(actorId, commandIdemKey), persisted targetClientId, status CHECK (pending|succeeded|failed|cancelled), nullable conversationId FK; insert pending first with ON CONFLICT DO NOTHING RETURNING, re-read, 403 on actor/target mismatch, 409 if pending, return terminal receipt and append a new AiCommandAuditLog row; never execute before pending exists; offline queue persists the key before first POST; failed keys are not reused. Add F5: conversationIdemKey UUID NOT NULL UNIQUE(userId, conversationIdemKey); isolate message append; FK-join conversation to command instance. AC: (1) duplicate execute with same (actorId, key) returns the same instance receipt, one instance row, extra audit rows only; concurrent dup under READ COMMITTED does not double-execute; actor/target mismatch is 403; (2) both AITerminalPanel branches send identical typed params; (3) hive-mind doc delisted; (4) retry create conversation with same key returns the same row. Residual: per-family entitlement probe on commandExecutor.mjs L309-343 / clientResolver.mjs L110-166; full offline reconcile; Hermes/debate classification.
=== END-VERDICT ===
