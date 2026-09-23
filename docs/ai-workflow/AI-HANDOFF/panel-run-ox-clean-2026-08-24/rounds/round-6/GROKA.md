# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-6\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6330 in / 8772 out · **Cost:** ~$0.0651 · **Wall:** 158.1s · **finish:** stop

---

The candidate’s F1 *problem* is real. The prescribed F1 *mechanism* is not. Under a correctness / state-machine / Postgres lens it ships a broken uniqueness contract and must be rejected.

## F1 REJECT — UNIQUE on `AiCommandAuditLog` cannot be the idempotency gate

Packet fact: `backend/models/AiCommandAuditLog.mjs:24-91` records actor, role, resolved target, operation ID, **outcome**, error code, parameter hash, duration. It has **no** `action_id` and **no** idempotency key. Packet fact: the command lane is three verbs — `useCoachCommand.ts:96,170,207` → `/api/ai-command/execute|confirm|cancel`. Packet fact: `commandExecutor.mjs:309-343` resolves caller-supplied IDs; `clientResolver.mjs:110-166` scopes trainers but not admins. Packet constraint 2: wrong-client mutation is catastrophic. Packet constraint 6: offline retry is required.

The candidate then says: add `commandIdemKey UUID UNIQUE` **to the audit log**, client-generated, “duplicate POST returns the original receipt and **no new row**.”

That design fails every state-machine check in this packet:

1. **Audit log is an outcome journal, not a command aggregate.** Outcome + error + duration are per-attempt fields. execute → confirm → cancel is a multi-transition lifecycle. UNIQUE on the log makes the second transition (`confirm` / `cancel`) unable to insert its audit row under the same key, or forces a new key and silently drops lifecycle idempotency. Acceptance criterion (1) “no new row” **forbids** the append-only trail the model already describes.

2. **Postgres READ COMMITTED does not make UNIQUE + “return original” atomic.**  
   T1 `INSERT` pending → T2 `INSERT` unique_violation → T1 `ROLLBACK` (executor crash, kill-switch, statement timeout) → T2 `SELECT` original → **no row**. Or T2 reads T1’s uncommitted-then-committed `pending` row and returns it as a “receipt” while the mutation is still in flight. The candidate specifies neither `INSERT … ON CONFLICT (command_idem_key) DO NOTHING RETURNING`, nor a `pending|confirmed|cancelled|failed` status, nor what a loser does when the winner is pending or rolled back.

3. **Unqualified “return the original receipt” is a wrong-client / stale-auth bug.** Client-generated UUID is attacker-controlled. On conflict the executor must **re-compare** `(actorId, targetClientId, operationId, paramHash)` and **re-run** entitlement (`clientResolver.mjs:110-166`, trainer vs admin). Mismatch → `409`, never another scope’s receipt. A trainer who lost client access must not be handed the old payload just because they still hold the key. Parameter hash already exists on L24-91 and is being ignored as a replay predicate.

4. **Failed-then-retry / offline in-doubt is undefined.** Constraint 6 requires gym-floor queue/reconcile. If the first attempt wrote a terminal `failed` audit row (or succeeded server-side and the client never saw the body), “return original, no new row” either freezes a failed workout log or hides a committed write. Partial unique index vs new key on failure is an explicit state-machine decision the candidate ducks.

**Correct fix (apply, do not re-derive):**
- **WHAT:** New command-header/receipt entity. `commandIdemKey UUID UNIQUE`, `status` (`pending|confirmed|cancelled|failed`), `actorId`, `targetClientId`, `operationId`, `paramHash`. `AiCommandAuditLog` stays append-only with FK `commandId` → header. Do **not** put UNIQUE on L24-91.
- **WHERE:** New model next to `backend/models/AiCommandAuditLog.mjs:24-91`; insert/conflict in `commandExecutor.mjs:309-343`; transitions on `aiCommandRoutes` execute/confirm/cancel (`useCoachCommand.ts:96,170,207`).
- **HOW:** Bound parameters only (no string-built SQL for the key or `selectedClientId` from `aiCommandRoutes.mjs:111-145`):

```sql
INSERT INTO command_receipt
  (command_idem_key, status, actor_id, target_client_id, operation_id, param_hash)
VALUES ($1, 'pending', $2, $3, $4, $5)
ON CONFLICT (command_idem_key) DO NOTHING
RETURNING *;
```

If no row returned: `SELECT` by key. Predicate mismatch → `409`. `pending` → `409` + retry-after (or wait on a transaction-level lock on that key). Terminal + predicate match → original receipt. `confirm`/`cancel` are `UPDATE … WHERE id=$id AND status='pending'` plus a **new** audit row. Replay always re-checks entitlement before returning or applying.

## F2 AGREE — positional drift is a live correctness split

`AITerminalPanel.tsx:116-139`: `requestContext` branch passes `clientId || null, 'both', null, requestContext`; else branch passes only `clientId || null`. Mode and the following positional slots diverge. Helper object (`buildChatParams`) plus an explicit `useAIChat.ts` typed signature is the right patch. Acceptance (2) stands. Residual: `clientId || null` still collapses `''` to unscoped; pin that in the helper.

## F3 AGREE / F4 AGREE

`docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22` is already classified “active reference doc with runtime drift” against mounted lanes at `backend/core/routes.mjs:630-634` (stream-spike, chat, command, hermes, debate) plus intake/proposals at `:378-379`. Mark DORMANT, drop from the active index, link the blueprint. Authoritative mount range is `backend/core/routes.mjs:630-634` (the `:625-634` caption is the same block; stop dual-citing).

## New MAJOR F5 — no command aggregate, so no receipt state machine

The packet’s own receipt boundary says the contract is **unproven and must be designed**. `aiWorkoutEvents.ts:121-128` returns a browser `boolean`. Chat posts `/api/ai-chat/conversations/${convId}/messages` (`useAIChat.ts:217,425,448`) with no `action_id` shared with the command lane. Constraint 3–4: conversation is not truth; UI must not claim saved without a server receipt. A UUID column on the audit log does not create: pending vs terminal states, confirm/cancel conflict, chat↔command identity, or offline reconcile. F1-as-written pretends it does.

I will not adopt the candidate verbatim. F2/F3/F4 can lock. F1’s schema and acceptance (1) cannot.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/idempotency key; UNIQUE-on-audit-log + "no new row" breaks execute/confirm/cancel and Postgres replay | F2=MAJOR: frontend/src/components/AITerminalPanel.tsx L116-139: positional sendMessageWithConversation drift (mode 'both'/null/requestContext vs omitted) | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: stale Gemini/Qwen consensus vs mounted multi-lane runtime | F4=NOTE: backend/core/routes.mjs L630-634: single authoritative mount range | F5=MAJOR: useCoachCommand.ts L96,170,207 + aiWorkoutEvents.ts L121-128: no command-header state machine; boolean dispatch and chat messages are not receipts
rebuttals: F1=REJECT: prescribed commandIdemKey UNIQUE on AiCommandAuditLog + return-original/no-new-row is an invalid aggregate; audit is per-outcome; ON CONFLICT without actor/target/operation/paramHash predicate and re-auth leaks or freezes receipts; in-flight/rollback/failed-retry/offline undefined under READ COMMITTED | F2=AGREE | F3=AGREE | F4=AGREE
open: Q1=other seats must accept a command-header table (status+UNIQUE key) with append-only audit FK, not UNIQUE on L24-91 | Q2=is same-key retry allowed after failed, or must the client mint a new key | Q3=must every idempotent replay re-run clientResolver entitlement before returning the original receipt
consensus_block: LOCK F2/F3/F4 as candidate. REPLACE F1: do not add UNIQUE to AiCommandAuditLog.mjs L24-91. Add command_receipt (commandIdemKey UUID UNIQUE, status pending|confirmed|cancelled|failed, actorId, targetClientId, operationId, paramHash); audit log stays append-only with FK commandId. Executor (commandExecutor.mjs L309-343) INSERT ON CONFLICT DO NOTHING with bound params; conflict SELECT must match actor+target+operation+paramHash else 409; pending -> 409 retry-after; confirm/cancel are conditional UPDATEs plus a new audit row; every replay re-checks clientResolver.mjs L110-166. Acceptance: (1) two concurrent execute POSTs with the same key yield one header row; loser gets original receipt only on predicate match else 409; audit may append replay/reject rows; (2) test both AITerminalPanel branches send identical context/mode via buildChatParams; (3) APP-AI-HIVE-MIND.md marked DORMANT and removed from active index; (4) second confirm is idempotent; confirm-vs-cancel on non-pending is a defined rejection. Residual: full action/receipt/offline reconcile still required; type sendMessageWithConversation in useAIChat.ts; pin clientId || null; audit any existing retry/queue for the header key; never treat aiWorkoutEvents.ts L121-128 boolean as a durable write.
=== END-VERDICT ===
