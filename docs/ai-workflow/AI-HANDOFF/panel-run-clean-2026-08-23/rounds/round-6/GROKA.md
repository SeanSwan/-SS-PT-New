# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-6\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6506 in / 7081 out · **Cost:** ~$0.0553 · **Wall:** 141.0s · **finish:** stop

---

Round 6, correctness seat. I adopt the candidate except where the conversation-lane identity/state machine was left unresolved. F3’s *intent* is right; its listed fix sites are not a complete identity contract. That gap is a new MAJOR, not a residual risk.

**Adopted (verbatim intent, my-lens verified):**
- **F1** — `AiCommandAuditLog.mjs:24-91` has actor/role/target/operation/outcome and **no** `action_id` / unique idempotency key. `useCoachCommand.ts:96,170,207` can therefore confirm/cancel/retry a different logical action than the one the UI thinks it sent. Unique `(actionId)` + executor no-op on duplicate + receipt return is the only Postgres-true fix.
- **F6** — `coachProposalRoutes.mjs:30-54` “claims pending then apply” is still TOCTOU unless the claim is `UPDATE … WHERE id=$1 AND status='pending'` in one transaction that also writes the durable applied/failed receipt. Two trainers, two tabs, or a retry will double-apply without that predicate.
- **F2 / F5 / F4 / F7 / F10 / F11 / F8 / F9** — no correctness contradiction in the packet. Mount order at `routes.mjs:630-634` is specific-before-prefix; not a defect.
- Admin unbounded scope at `clientResolver.mjs:110-166` stays **intentional-if-policy**, not a silent accept.

**REJECT F3 as specified (scope, not intent).** F3’s sites are `AiCommandAuditLog` / `aiCommandRoutes.mjs:111-145` / `useCoachCommand.ts:96,170,207`. The authoritative conversation row is a second identity plane:

`AiConversation.mjs:24-83` fields: `userId`, `role`, `context`, `targetUserId`, `messages`, `status`, `metadata`, `messageCount`, `lastMessageAt`.

`useAIChat.ts:217,425,448` creates then POSTs `/api/ai-chat/conversations` and `/conversations/${convId}/messages`. Create accepts `targetUserId` at `aiChatRoutes.mjs:308-344`. A third resolver sits at `aiDebateRoutes.mjs:57-76`. Three resolvers, one name, no shared unique key, no FK to `AiCommandAuditLog`. That is the split-brain constraint 3 forbids. F3 as written does not close it.

**F12 MAJOR (the unresolved running-state item).** The model list at `AiConversation.mjs:24-83` does not encode a state machine or a SQL-safe append:

- No unique/idempotency column. Concurrent `POST …/messages` (`useAIChat.ts:425,448`) against an embedded `messages` blob + denormalized `messageCount` is a lost-update race unless the handler is a single parameterized `JSONB ||` / child-row `INSERT` with `(conversationId, seq)` unique. Packet does not show that handler. The schema as listed cannot enforce it.
- `targetUserId` is present and not stated `NOT NULL`. Same wrong-client bind as F3, on the chat row that outlives the command.
- `status` has no CHECK and no documented transitions. `role` is snapshotted; a later demotion does not re-ground the row.
- No FK from a turn to an action receipt. Constraint 3: memory is not truth. The model cannot point at truth.
- `metadata` is an untyped bag — a second place a client id can bypass `commandExecutor.mjs:309-343`.

**Fix (apply, do not re-derive):**
1. `AiConversation.mjs:24-83` — `userId` and `targetUserId` UUID `REFERENCES users(id)`. Self-service: `targetUserId := userId`. Else `NOT NULL`. Reject null/cross-scope at `aiChatRoutes.mjs:308-344` with `400 TARGET_REQUIRED` / `403`.
2. Child table `AiConversationMessage (conversationId, seq, clientMessageId, body, createdAt)` with `UNIQUE(conversationId, clientMessageId)` and `UNIQUE(conversationId, seq)`. Or one `UPDATE … SET messages = messages || $1::jsonb, "messageCount" = "messageCount" + 1, "lastMessageAt" = now() WHERE id = $2 AND "messageCount" = $3 RETURNING` (watermark = lost-update fence). Never client-supplied `messageCount`.
3. `status TEXT CHECK (status IN ('active','archived','failed'))`; transitions only in a server function.
4. Optional `actionId` on turns that proposed/executed; FK to the F1 unique key. Receipts echo alias + resolved PK (F3).
5. `useAIChat.ts:217,425,448` — send `clientMessageId`; treat only a server receipt as “saved” (constraint 4).

**F13 MINOR:** `useAIChat.ts:217` then `:425,448` is create-then-append with no compensating delete. Crash after create leaves `messageCount=0` orphans and extra identity rows. Fold into the same transaction or a reaper keyed by `id` + `messageCount=0` + age.

No SQLi finding: packet never shows string-concat SQL. Do not invent one. Live probe the three resolvers for bound parameters.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F12=MAJOR: backend/models/AiConversation.mjs L24-83 + useAIChat.ts L425,448 + aiChatRoutes.mjs L308-344: no unique/idempotency key, no user/action FKs, nullable targetUserId, embedded messages+denormalized messageCount, status with no CHECK/transitions — lost-update on concurrent POSTs and split-brain vs command/debate resolvers (constraints 3/4) | F13=MINOR: useAIChat.ts L217 then L425,448: non-atomic create-then-append orphans conversations on post failure
rebuttals: F1=AGREE | F2=AGREE | F3=REJECT: intent correct but listed sites omit AiConversation.mjs:24-83 / aiChatRoutes.mjs:308-344 / useAIChat.ts:217,425,448 / aiDebateRoutes.mjs:57-76 — three resolvers, one name, no shared PK/FK | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE
open: Q1=absorb F12 into FIX-BEFORE-BUILD as conversation half of F3, or keep separate | Q2=admin unbounded scope at clientResolver.mjs:110-166 policy yes/no + audit tag | Q3=Hermes/debate classification | Q4=confirm messages storage (JSONB vs child table) from full model not excerpted | Q5=conversation.role snapshot vs live role for entitlement
consensus_block: FIX BEFORE BUILD: F1 (actionId unique + idempotent executor + receipt in AiCommandAuditLog.mjs/aiCommandRoutes.mjs:111-145/useCoachCommand.ts:96,170,207), F3+F12 (single canonical targetUserId user-PK on BOTH command and AiConversation.mjs:24-83; NOT NULL / self:=userId; server 400 TARGET_REQUIRED; one resolver used by aiChatRoutes.mjs:308-344, commandExecutor.mjs:309-343, aiDebateRoutes.mjs:57-76; receipts echo alias+PK; message append via child UNIQUE(conversationId,clientMessageId) or watermarked JSONB || WHERE messageCount=$n RETURNING; status CHECK; optional actionId FK to F1), F2 (capability registry post-resolution pre-exec in commandExecutor.mjs:309-343; denial audits + denial-shaped response), F6 (UPDATE … WHERE status='pending' in one txn + idempotent apply + durable applied/failed receipt at coachProposalRoutes.mjs:30-54), F5 (aiChatRoutes.mjs:466 middleware+TTL on coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16; parity table gate). MUST-FIX PER SLICE: F4 (IndexedDB queue keyed by actionId; UI queued/sending/verified; reconcile once), F13 (atomic create+first-message or orphan reaper), F7 (spike method inventory + disabled-404), F10 (ensureClientAccess on aiDebateRoutes.mjs:57-76 start), F11 (fence SwanCoachAssistantPage, migrate tests, cite or drop 'locks'), F8 (cite review-gate code or strike header), F9 (archive/rewrite hive doc). ACCEPTED AS INTENTIONAL (pending Q2): admin unbounded scope clientResolver.mjs:110-166 IF policy and audit-tagged; Express specific-before-prefix at routes.mjs:630-634 is not a defect. RESIDUAL RISKS: constraints 2/3/4/6 unverifiable until F1/F3/F12/F4 land; absence-based MAJORs need live probes (incl. bound SQL on all three resolvers); Hermes/debate classification unresolved; WCAG/44px has zero packet artifacts — carry on blueprint verification matrix.
=== END-VERDICT ===
