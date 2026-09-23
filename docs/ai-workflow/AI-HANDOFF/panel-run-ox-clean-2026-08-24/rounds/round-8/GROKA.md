# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-8\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6562 in / 7346 out · **Cost:** ~$0.0570 · **Wall:** 136.3s · **finish:** stop

---

Round 8, correctness lens. The candidate’s F2–F6 are locatable and should ship. I **REJECT F1 as specified** and I will not adopt the candidate while two RUNNING STATE defects stay unfixed: cross-lane client identity, and SwanCoachAssistantPage test-referenced retirement.

**REJECT F1 (idempotency contract is not Postgres-correct).**
`AiCommandAuditLog.mjs:24-91` has actor, role, resolved target, operation ID, outcome, param hash — and **no** `action_id` / unique idempotency key (packet Receipt boundary). Adding `commandIdemKey UUID UNIQUE` is not an idempotent write:

- Postgres `UNIQUE` allows **multiple NULLs**. Old rows and any insert that omits the key still duplicate.
- Two in-flight POSTs with the same key: the second hits unique_violation. Without `ON CONFLICT (commandIdemKey) DO NOTHING` + re-`SELECT` of the original row, the handler can 500 or insert a second logical command.
- A **client-generated** UUID that is not persisted with the queued command is regenerated after timeout → duplicate rows, AC(1) fails.
- Param hash is not a uniqueness key; it is not specified UNIQUE and collides across actor/target/operation.

Correct fix, not a new column slogan: `commandIdemKey UUID NOT NULL` with a real unique index (partial unique during backfill, then NOT NULL on the write path); insert `ON CONFLICT DO NOTHING` then return the existing receipt; client stores the key with the offline/retry queue item.

**AGREE F2.** `AITerminalPanel.tsx:116-139` (not just 124-133): `requestContext` branch passes `'both', null, requestContext`; the other branch stops at `clientId || null`. Positional drift is a state-machine bug — mode/options silently change by branch. `buildChatParams` + a typed `useAIChat` signature is the right patch. AC(2) must assert both branches emit identical `context` / `mode` / `clientId`.

**AGREE F3, F4.** Hive-mind doc is drifted vs `routes.mjs:630-634`. Use L630-634 as the mount authority. Mark `APP-AI-HIVE-MIND.md` DORMANT.

**AGREE F5, F6 — they do not close identity.**
`clientResolver.mjs:110-166` scopes trainers, not admins. `aiChatRoutes.mjs:308-344` accepts `targetUserId` for admin/trainer; trainer gate is only `:610-625`. Admin command/chat without a **validated existing client user** is a wrong-client write. Enforce in `clientResolver.mjs`, `commandExecutor.mjs:309-343`, and conversation create. 4xx + security log. Do **not** invent an “admin assignment list” the packet never defines: validate `target` exists, is a client-role user, and passes one entitlement function (admin-all vs assigned). Same function on read/update, not just create.

**NEW F7 MAJOR — unresolved identity split (FK / re-anchor).**
Same human client is three different request fields with no mapping contract:

| Lane | Field | Evidence |
|---|---|---|
| Conversation | `targetUserId` | `AiConversation.mjs:24-83` |
| Command | `selectedClientId` | `aiCommandRoutes.mjs:111-145`, `commandExecutor.mjs:309-343` |
| Debate | `clientId` | `aiDebateRoutes.mjs:57-76` |
| Terminal UI | `clientId` | `AITerminalPanel.tsx:116-139` |

No shared FK, no single resolver output, no invariant that chat memory, command audit, and debate job refer to one `clientUserId`. Stale-tab / dual-lane send can attach a command receipt to client A and conversation messages to client B. F5/F6 per-route checks do not fix that. Required: one server `ClientScope { clientUserId }` from one resolver; all lanes persist that value (aliases only inside the resolver); mismatch → 4xx.

**NEW F8 MAJOR — build contract.**
Surface table: `SwanCoachAssistantPage` is **legacy but still referenced** by its own tests. RUNNING STATE: deletion without a test-plan slice breaks the build. Candidate is silent. Classify **legacy-keep**; first PR that touches it must migrate/delete tests, then the page. CI green before and after.

**Still unclosed (correctness, not optional residual).**
`aiWorkoutEvents.ts:121-128` returns a dispatcher boolean. That is not a write receipt (constraint 4). `useCoachCommand.ts:96,170,207` exposes execute/confirm/cancel with **no** transition table (confirm-after-cancel, double-confirm, cancel-after-success). `AiConversation.mjs:24-83` denormalizes `messages` + `messageCount` + `lastMessageAt` with no transactional invariant. Offline queue + new idem key is a race until the queue is audited.

No SQLi surface is visible in the packet (Sequelize-style models, no interpolated SQL). I will not invent one.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no idempotency key; UUID UNIQUE without NOT NULL + ON CONFLICT + durable client key is not a correct Postgres idempotent insert (NULL duplicates, concurrent unique_violation, retry regenerates key) | F2=MAJOR: frontend/src/components/DashBoard/AITerminalPanel.tsx L116-139: requestContext branch passes mode 'both' and extra args; default branch omits them — positional drift | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: drifted vs mounted lanes; mark DORMANT | F4=NOTE: backend/core/routes.mjs L630-634: authoritative mount order (stream-spike, chat, command, hermes, debate) | F5=MAJOR: backend clientResolver.mjs L110-166 + commandExecutor.mjs L309-343: trainers scoped, admins not; caller-supplied selectedClientId can mint a success receipt | F6=MAJOR: backend/routes/aiChatRoutes.mjs L308-344: admin/trainer create accepts targetUserId; trainer gate only L610-625 — admin create is unscoped | F7=MAJOR: AiConversation.mjs L24-83 targetUserId vs aiCommandRoutes.mjs L111-145 selectedClientId vs aiDebateRoutes.mjs L57-76 clientId vs AITerminalPanel.tsx L116-139 clientId: no canonical ClientScopeId / FK mapping; cross-lane re-anchor undefined | F8=MAJOR: SwanCoachAssistantPage still referenced by own tests (surface table + running state); deletion without test-plan slice breaks build | F9=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: boolean dispatch ack is not a server receipt; execute/confirm/cancel has no state machine
rebuttals: F1=REJECT: candidate column is insufficient — UNIQUE allows multiple NULLs; no ON CONFLICT DO NOTHING + re-SELECT original receipt; client-generated key not bound to the queued command so retries duplicate | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F7=NEW | F8=NEW | F9=NEW
open: Q1=single ClientScopeId mapping + FK for conversation/command/debate/hermes | Q2=SwanCoachAssistantPage retire-after-tests slice vs legacy-keep | Q3=execute/confirm/cancel + offline queue state machine and who persists commandIdemKey | Q4=admin entitlement = all client users or assigned set (packet does not define assignment)
consensus_block: DISPUTE — do not adopt candidate verbatim. Keep F2-F6. Replace F1 with: AiCommandAuditLog.mjs L24-91 add commandIdemKey UUID NOT NULL + UNIQUE (partial unique during backfill); commandExecutor insert ON CONFLICT (commandIdemKey) DO NOTHING then SELECT original receipt; client persists key on the queued item. Add F7: one resolver emits clientUserId; AiConversation.targetUserId, command selectedClientId, debate clientId, terminal clientId must store that value or 4xx. Add F8: do not delete SwanCoachAssistantPage until a test-migration slice keeps CI green. Add F9: dispatchAIWorkoutEvent boolean is not a write; define execute/confirm/cancel transitions before implementation. AC add: (6) concurrent duplicate command POSTs = one row + identical receipts; (7) mixed targetUserId/selectedClientId/clientId in one session = 4xx or single resolved id on all three rows; (8) SwanCoachAssistantPage retirement PR includes test deletion/migration and passing CI. Residual: conversation messages vs messageCount invariant; hermes/debate live probes; typed useAIChat signature.
=== END-VERDICT ===
