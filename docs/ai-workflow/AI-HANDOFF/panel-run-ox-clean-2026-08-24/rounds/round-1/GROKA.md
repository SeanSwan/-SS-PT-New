# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-1\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 5506 in / 9197 out · **Cost:** ~$0.0660 · **Wall:** 174.2s · **finish:** stop

---

Round 1, correctness seat. The packet’s own evidence already falsifies a single authoritative action machine. I am not reviewing UX chrome or product tone. I am reviewing whether the mounted code can keep one client, one action, one durable state under concurrency, retry, role switch, and confirm/cancel.

Builder-facing claims that the surface is “review-gated,” that client scope is server-validated, and that conversation is not domain truth are testable. The excerpts contradict the first two and leave the third unenforced.

---

**F1 — MAJOR — no idempotent action receipt; retries are not a function**

`backend/models/AiCommandAuditLog.mjs:24-91` records actor, role, resolved target, operation ID, outcome, error, parameter hash, duration. Packet states it has **no `action_id` and no unique idempotency key**. `frontend/src/utils/aiWorkoutEvents.ts:121-128` returns only a dispatcher boolean. `useCoachCommand.ts:96,170,207` exposes execute/confirm/cancel as three independent HTTP verbs.

Without a unique `(actor, idempotency_key)` or `action_id` constraint, two confirms, a refresh-retry, a double-tap, or an offline replay are three inserts and — if any dispatcher is not itself idempotent — two domain writes. Constraint 2 (wrong-client / duplicate mutation is catastrophic) and constraint 6 (degraded gym-floor must reconcile) are already broken at the schema. An audit log is not a receipt and not a state machine.

**Fix:** Add `action_id UUID PRIMARY KEY` and `idempotency_key TEXT NOT NULL` with `UNIQUE (actor_id, idempotency_key)` on `AiCommandAuditLog` (or a new `AiAction` table this log points at). Columns: `state`, `target_client_id`, `operation`, `conversation_id`, `epoch`, `request_hash`. `execute` is `INSERT … ON CONFLICT (actor_id, idempotency_key) DO UPDATE … RETURNING` the same row. `confirm`/`cancel` address `action_id` only. Receipt shape is `{action_id, state, target_client_id, operation, version, outcome}`. UI may show “saved” only on `state='applied'` from that row.

---

**F2 — MAJOR — caller-supplied client id; admins are unscopeable**

`aiCommandRoutes.mjs:111-145` accepts `selectedClientId`. `commandExecutor.mjs:309-343` resolves those caller IDs. `clientResolver.mjs:110-166` scopes trainers but **not admins beyond role**. `aiChatRoutes.mjs:308-344` independently accepts `targetUserId` for admin/trainer. `AITerminalPanel.tsx:116-139` sends `clientId || null`.

This is three client-identity channels plus a null. Constraint 2 requires explicit, server-validated, observable client scope. An admin mutation that trusts a body field, and a trainer path that can send `null`, is an implicit “any/none” write scope. Stale tab, impersonation leftover, or a swapped `selectedClientId` on confirm is a wrong-client write. Packet itself says entitlement for every command family is unproven and a denied op must not mint a success receipt — that contract is absent from the model.

**Fix:** Introduce `CoachContextBinding(actor_id, role, target_client_id, conversation_id, epoch, expires_at)` created only after `ensureClientAccess`. Mutating command families reject `selectedClientId == null` for every role, including admin. Admin “any client” is search/read, not write. `confirm`/`cancel` do not accept a new `selectedClientId`; they load `target_client_id` from the action row and re-run `ensureClientAccess` on that stored id. `clientResolver.mjs:110-166` must apply the same client ACL to admin as trainer for writes.

---

**F3 — MAJOR — four write lanes, zero shared state machine**

Mounts: `backend/core/routes.mjs:378-379` (intake, proposals), `:630-634` (stream-spike, chat, command, hermes, debate). Models: `AiConversation.mjs:24-83` (`status`, embedded `messages`, `targetUserId`) vs `AiCommandAuditLog.mjs:24-91` (outcome, no FK to conversation or proposal). Proposal path “claims pending rows before apply” (`coachProposalRoutes.mjs:30-54`) with replay/concurrency **unproven**. Chat memory is allowed to diverge from commands by the packet’s own risk table.

Legal transitions are not encoded anywhere: draft → awaiting_confirm → queued → applied | failed | cancelled | expired. Nothing stops confirm-after-cancel, apply-after-reject, or a chat turn emitting a command while a proposal for the same workout is claimed. That is a cycle/split-brain hazard: conversation can spawn a proposal that spawns a command that writes a conversation. No FK, no state guard, no single apply transition.

This contradicts the header claim that `CoachCommandCenterPage` is a “review-gated writes” shell: `useCoachCommand.ts:96` can `execute` on a separate lane.

**Fix:** One `AiAction` row is the only object allowed to mutate domain tables. Chat, command, intake, and proposals attach `action_id`. Apply is one transaction: `UPDATE ai_actions SET state='applied' WHERE id=$id AND state IN ('awaiting_confirm','queued') RETURNING *` then domain write then receipt. Competing lanes become adapters, not authorities. Classify `/api/hermes` and `/api/ai/debate` as non-canonical until they emit the same action row or are kill-switched from Coach UI.

---

**F4 — MAJOR — confirm/cancel have no proven legal-transition predicate**

`useCoachCommand.ts:96,170,207` = `/api/ai-command/execute|confirm|cancel`. Audit log stores `outcome` after the fact (`AiCommandAuditLog.mjs:24-91`), not a pre-transition `state` with a `WHERE state = expected`. Two in-flight confirms, or confirm racing cancel, both can succeed at HTTP level and both can invoke the dispatcher. Packet requires that a denied operation cannot mint a success receipt. There is no row to deny against.

**Fix:** `state` column with a CHECK of allowed values. Each verb is one conditional update:

- confirm: `UPDATE … SET state='queued' WHERE action_id=$id AND state='awaiting_confirm' RETURNING *`
- cancel: `UPDATE … SET state='cancelled' WHERE action_id=$id AND state IN ('awaiting_confirm','queued') RETURNING *`
- 0 rows → 409 + current receipt, never a success.

Same pattern for proposal claim at `coachProposalRoutes.mjs:30-54`: `UPDATE … SET status='claimed', claimed_by=$uid WHERE id=$id AND status='pending' RETURNING *` inside the apply transaction; partial unique index on active claims.

---

**F5 — MAJOR — context has no epoch; in-flight requests survive role/client/tab switch**

`CoachCommandCenterPage.tsx:34-43` derives role from `useAuth()`, then `useState` for `activeTab` coerced once. No generation counter. `AITerminalPanel.tsx:116-139` sends whatever `clientId` is current when the request fires. Conversation create stamps `targetUserId` at `aiChatRoutes.mjs:308-344`; later command can send a different `selectedClientId` (`aiCommandRoutes.mjs:111-145`).

Race: trainer has client A conversation open, switches to B, an in-flight A message and a B command land; or a stale mobile tab posts A after the desktop session moved to B. Pronouns, “this client”, and confirm all bind to the wrong row. Constraint 2 + question 4 (rapid switches, stale tabs, concurrency) are unmet.

**Fix:** Server-issued `epoch` on every context bind. Every `/api/ai-chat/conversations/:id/messages` and `/api/ai-command/*` body must echo `epoch`. Mismatch → 409 `CONTEXT_STALE`, no write, UI re-anchors. Conversation `targetUserId` is immutable after create; a client switch opens a new conversation or a new bind, it does not rewrite the old one.

---

**F6 — MAJOR — conversation document is a lost-update and FK hole**

`AiConversation.mjs:24-83` holds `messages`, `messageCount`, `lastMessageAt`, `status`, `metadata` on one row. Packet does not show a `version` column, a child `AiMessage` table, or `UPDATE … WHERE version=$v`. Concurrent turns (two devices, stream + POST, trainer + admin) last-write-wins the JSON blob and skew the denormalized counters. There is no FK from a message to the action it proposed, so reconciliation of “memory vs domain” (constraint 3, question 3) cannot be a query; it is a guess.

`targetUserId` / `userId` FK-to-users is not in the excerpt. Orphans and cross-tenant ids are representable.

**Fix:** `AiMessage(conversation_id FK REFERENCES ai_conversations ON DELETE RESTRICT, seq, role, body, action_id NULLABLE FK, created_at)` with `UNIQUE(conversation_id, seq)`. Counters via trigger or `COUNT(*)`. `ai_conversations.target_user_id` and `user_id` are `NOT NULL` FKs (self-service client: `target_user_id = user_id`). Optimistic `version INT` on the conversation for metadata edits only. Messages are never stored as a rewritten array.

---

**F7 — MAJOR — offline/retry path does not exist; reconnect will duplicate**

Constraint 6: cloud round-trip cannot be the sole way to log core workout facts. Canonical write path is `useAIChat.ts:217,425,448` POST `/api/ai-chat/conversations…` and `useCoachCommand.ts:96` execute. No intent/outbox table appears in the model list. Combined with F1 (no idempotency) and F4 (no conditional apply), a gym-floor queue implemented later against this schema will replay as new actions.

`dispatchAIWorkoutEvent` (`aiWorkoutEvents.ts:121-128`) is a local boolean. Treating it as “queued” would lie (constraint 4). Treating it as nothing means there is no degraded log.

**Fix:** `AiOfflineIntent(intent_id UUID PK, actor_id, target_client_id, idempotency_key UNIQUE, payload_hash, state queued|sent|applied|rejected|duplicate, created_at, applied_action_id FK)`. Reconcile is `INSERT action ON CONFLICT idempotency_key` then map intent → action receipt. UI states: `queued-local`, `sent`, `applied`, `rejected`, `duplicate` — never “saved” on local dispatch.

---

**F8 — MINOR — proposal claim/apply TOCTOU is specified in English, not in SQL**

`coachProposalRoutes.mjs:30-54` “claims pending rows before apply” and calls `ensureClientAccess`. Packet lists replay/concurrency as a required live probe, i.e. not evidenced. If claim and apply are two statements without `SELECT FOR UPDATE` / conditional `UPDATE … RETURNING`, two reviewers apply once each.

**Fix:** One transaction, conditional claim as in F4, persist `applied_receipt_id`. Second reviewer gets 409 with the first receipt.

---

**F9 — MINOR — denormalized conversation counters and unconstrained `status`**

`AiConversation.mjs:24-83`: `status`, `messageCount`, `lastMessageAt` with no CHECK/enum and no transition function in the packet. Illegal `status` values and counter drift are representable. Same class of bug as F4, lower blast radius (read-path lies, not double write).

**Fix:** Postgres enum or CHECK; transitions in one `UPDATE … WHERE status = $from`. Drop denormalized counters or maintain them in the message insert trigger (F6).

---

**F10 — NOTE — SQL injection surface is unmapped, not disproven**

No query text is in the packet. Attacker-controlled identifiers that must be probed as bound parameters, never interpolated: `targetUserId` (`aiChatRoutes.mjs:308-344`), `selectedClientId` (`aiCommandRoutes.mjs:111-145`), `convId` in `useAIChat.ts:425,448`, debate `clientId` (`aiDebateRoutes.mjs:57-76`). `eventName` in `aiWorkoutEvents.ts:121-128` is an object-key lookup, not SQL; keep it on a literal allow-list. This is a probe gate, not a confirmed injection.

---

**F11 — NOTE — Hive Mind doc is not a state machine and will mis-route if treated as one**

`docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22` (Gemini/Qwen consensus) vs mounted lanes at `routes.mjs:630-634` plus `:378-379`. If a builder implements “complex = hive” beside command/proposal apply, a second unreceipted writer appears. Classify the doc **stale / non-runtime**. Capability routing belongs in the registry that emits `AiAction`, not in that file.

---

**F12 — NOTE — `SwanCoachAssistantPage` is a second, unmounted conversation state**

Packet: no route-tree mount; still referenced by tests/hooks. A test or deep link that talks to the old page will create `AiConversation` rows the command center cannot see, then command against a different `targetUserId`. Migration classification is required before any write-path change. Do not delete this pass; do not let it call `/api/ai-command`.

---

Intentional (not defects): stream-spike mounted first (`routes.mjs:630`) is fail-closed and not a write path. Shared `AITerminalPanel` as a shell is fine; the defect is missing context/receipt contracts behind it, not the panel itself. Role-aware tab coercion at `CoachCommandCenterPage.tsx:34-43` is a UI filter, not an entitlement gate — that is correct only if the server remains the gate (it currently does not, F2).

Residual risk: packet is static excerpts. Live probes still required for the cross-client matrix, whether confirm re-resolves `selectedClientId`, whether proposal claim is actually transactional, and whether any dispatcher returns success after a failed domain write.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs:24-91: no action_id/idempotency unique key; execute/confirm/cancel and retries cannot be a function; audit row is not a receipt | F2=MAJOR: clientResolver.mjs:110-166 + aiCommandRoutes.mjs:111-145 + aiChatRoutes.mjs:308-344 + AITerminalPanel.tsx:116-139: three client-id channels plus null; admins unscopeable; confirm can rebind client | F3=MAJOR: backend/core/routes.mjs:378-379,630-634: chat/command/intake/proposals/hermes/debate are separate writers; no AiAction state machine; contradicts review-gated-write claim | F4=MAJOR: useCoachCommand.ts:96,170,207 + AiCommandAuditLog.mjs:24-91: confirm/cancel have no UPDATE…WHERE state=expected; double-confirm and confirm-after-cancel can both mint success | F5=MAJOR: CoachCommandCenterPage.tsx:34-43 + AITerminalPanel.tsx:116-139: no context epoch; in-flight chat/command survive client/role/tab switch and split targetUserId vs selectedClientId | F6=MAJOR: backend/models/AiConversation.mjs:24-83: embedded messages + denormalized counts, no version/FK to actions or users; concurrent turns last-write-wins; memory cannot reconcile to domain | F7=MAJOR: useAIChat.ts:217,425,448 + missing outbox model: constraint-6 offline path absent; any later queue against F1 will duplicate workout writes | F8=MINOR: coachProposalRoutes.mjs:30-54: claim-then-apply concurrency unproven; two reviewers can apply one proposal | F9=MINOR: AiConversation.mjs:24-83: status unconstrained; illegal transitions representable | F10=NOTE: targetUserId/selectedClientId/convId/debate clientId SQL construction not in packet — probe parameterization, do not assume safe | F11=NOTE: APP-AI-HIVE-MIND.md:7-22 vs routes.mjs:630-634: stale consensus doc must not become a second unreceipted writer | F12=NOTE: SwanCoachAssistantPage unmounted but referenced — second conversation state if any hook still posts
rebuttals: (none)
open: Q1=Does confirm/cancel handler re-read selectedClientId or bind to execute-time resolved client? Packet does not include that function body — other seats must not assume either. | Q2=Are proposal claim+apply one transaction with conditional UPDATE, or two steps? | Q3=Do hermes/debate dispatchers write the same domain tables as command/proposals? If yes they are competing apply paths (promote F3). | Q4=Is AiConversation.messages JSONB or a hasMany? Excerpt lists a field named messages — schema probe required before F6 fix lands. | Q5=Security seat: admin unscope (F2) + missing receipt (F1) is the wrong-client write. Do not dilute to UX. | Q6=Architecture seat: adopt single AiAction apply transition or formally reject and name the alternate truth source.
consensus_block: N/A — round 1 independent correctness ballot; no running consensus to adopt. Proposed adopt list if other seats converge: F1-F7 must-fix before any Coach UI write-path change; F8-F9 per-slice; F10-F12 probes/classification. Exact fixes: (F1) AiAction/AiCommandAuditLog action_id+UNIQUE(actor_id,idempotency_key)+receipt; (F2) fail-closed client bind for all roles, confirm/cancel ignore new selectedClientId; (F3-F4) one conditional-UPDATE apply/cancel; (F5) server epoch on every write; (F6) AiMessage child table+FKs+version; (F7) AiOfflineIntent outbox. Intentional: stream-spike fail-closed; terminal shell; client-side tab filter. Residual: live cross-client/concurrency probes still required.
=== END-VERDICT ===
