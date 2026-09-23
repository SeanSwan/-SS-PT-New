# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-4\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6666 in / 10267 out · **Cost:** ~$0.0747 · **Wall:** 193.9s · **finish:** stop

---

Round 4, correctness lens. I do not adopt the candidate verbatim.

**REJECT F1’s proposed fix** (the *gap* is real; the *mechanism* is wrong).

`AiCommandAuditLog.mjs L24-91` records actor, role, resolved target, operation ID, **outcome, error code, parameter hash, duration**. Those are post-execution fields. The packet states there is no `action_id` / idempotency key and that the receipt contract is **unproven**. Stamping `commandIdemKey UUID UNIQUE` onto that table and “rejecting duplicates with the original receipt” does not implement exactly-once.

Postgres truth:
1. Side effect then `INSERT` is a race. Two concurrent `POST /api/ai-command/execute` (`useCoachCommand.ts L96` + `aiCommandRoutes.mjs L110-145`) both mutate, then one `unique_violation`. UNIQUE fires **after** the double write.
2. Naive `UNIQUE` on a completed audit row makes failure sticky: a failed first attempt that wrote a row permanently blocks the same key; a failed first attempt that wrote **no** row does not collide, so retry double-executes. Partial unique (`WHERE status='succeeded'`) is not specified.
3. `INSERT … ON CONFLICT DO NOTHING RETURNING` + re-`SELECT` is required to return the original receipt. A UNIQUE constraint alone does not do that.
4. Client-minted UUID with no persist-before-POST contract is not an idempotency key. Offline/retry that remints (`aiWorkoutEvents.ts L121-128` is already a non-durable boolean) bypasses the constraint. The model already has a parameter hash; the candidate ignores it and also fails to bind `(actor, operation, targetClient)`.
5. Audit must stay append-only. Using it as the intent ledger conflates observability with the claim/execute state machine.

**Replacement (F1)** — WHAT / WHERE / HOW:
- WHAT: Add a **claimable receipt** table; keep audit append-only with an FK.
- WHERE: new `CommandReceipt` model; `AiCommandAuditLog.mjs L24-91` add `receiptId` FK; claim/execute in `commandExecutor.mjs` (packet: `L309-343`); accept key on `aiCommandRoutes.mjs L110-145`; client reuses one key in `useCoachCommand.ts L96,L170,L207`.
- HOW:
  - Columns: `id UUID PK`, `idempotencyKey UUID NOT NULL UNIQUE`, `actorUserId`, `targetClientId`, `operationId`, `requestHash`, `status TEXT CHECK (status IN ('accepted','executing','succeeded','failed','cancelled'))`, `result`, timestamps.
  - `BEGIN; INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING *;` else `SELECT FOR SHARE` by key.
  - Claim: `UPDATE … SET status='executing' WHERE id=$1 AND status='accepted' RETURNING *`. Zero rows → return in-flight/terminal receipt; **no** second side effect.
  - Side effects only after claim. Terminal `UPDATE` to `succeeded|failed`, then `INSERT` audit (no UNIQUE on the key).
  - `failed|cancelled` are terminal; replay requires a new key or explicit retry token. Do not silently re-run.
  - Client mints the key **once per intent**, persists it in any offline queue **before** first POST, reuses on retry.

**AGREE F2.** `AITerminalPanel.tsx L116-139`: `requestContext` branch passes `'both', null, requestContext`; the other branch stops at `clientId || null`. Positional drift is real. Fix: `buildChatParams` object at those call sites; type `sendMessageWithConversation` in `useAIChat.ts` (packet `L217,425,448`).

**AGREE F3.** `APP-AI-HIVE-MIND.md L7-22` is runtime-drift documentation. Mark DORMANT; drop from the active index.

**AGREE F4.** Evidence gate owns `backend/core/routes.mjs L630-634` (stream-spike → chat → command). `L625-634` is the stale citation. Mount order itself is correct (more-specific spike first).

**NEW MAJOR F5 — split client-scope state machines.**  
`AiConversation.mjs L24-83` has `targetUserId`. `aiChatRoutes.mjs L308-344` accepts `targetUserId`. Trainer access check is cited at `L610-625`, not at create. `aiCommandRoutes.mjs L111-145` accepts a **different** caller field, `selectedClientId`; `commandExecutor.mjs L309-343` + `clientResolver.mjs L110-166` resolve it (trainers scoped, admins not). `useAIChat.ts` and `useCoachCommand.ts` are separate API literals. No shared scope/receipt key. Constraint 2: wrong-client mutation is catastrophic. Chat can ground on client A and execute on client B.

Fix: one server-owned `ClientScope` middleware; conversation create at `L308-344` **must** run the `L610-625` check in-process; `execute` refuses unless `selectedClientId === conversation.targetUserId` when conversation-bound; every receipt stores the resolved target.

**NEW MAJOR F6 — execute/confirm/cancel is not a state machine.**  
Three endpoints (`useCoachCommand.ts L96,L170,L207`) and an outcome-only audit row. No proven `accepted→executing→succeeded|failed|cancelled` predicates. Concurrent confirm+cancel, confirm-after-success retry, cancel-after-execute, and in-flight duplicate POST are undefined. Candidate AC(1) (“duplicate POST returns original receipt, no new row”) does not name which verb or in-flight/failed behavior.

Fix: confirm/cancel are `UPDATE … WHERE id=$receipt AND status IN (allowed_from)` on the **same** receipt, not new UNIQUE inserts. Confirm allowed from `succeeded` (idempotent replay of receipt) or an explicit `awaiting_confirm` if that class exists; cancel allowed from `accepted|executing` only; both return the row that won the compare-and-swap.

**MINOR F8.** `AiConversation.mjs L24-83` co-locates `messages`, `messageCount`, `lastMessageAt` with no version/append contract. Concurrent `POST …/messages` (`useAIChat.ts L425,L448`) can lose updates or drift counters. Fix: append-only message rows (or `UPDATE … WHERE version=$n`) and derive counts from that write.

`aiWorkoutEvents.ts L121-128` stays residual: a dispatcher boolean is not a receipt and must not mint or satisfy `commandIdemKey`.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: post-outcome audit has no action_id/idempotency key; UNIQUE-on-audit cannot claim-then-execute | F2=MINOR: frontend/src/components/AITerminalPanel.tsx L116-139: non-requestContext sendMessageWithConversation omits mode/options | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: stale consensus doc vs mounted chat/command/intake/proposal/hermes/debate | F4=NOTE: backend/core/routes.mjs L630-634 is authoritative mount; L625-634 is stale citation | F5=MAJOR: AiConversation.mjs L24-83 targetUserId vs aiChatRoutes.mjs L308-344 vs aiCommandRoutes.mjs L111-145 selectedClientId: split caller-supplied client IDs, no shared scope/receipt | F6=MAJOR: useCoachCommand.ts L96,L170,L207 + aiCommandRoutes.mjs L110-145: execute/confirm/cancel lack claim/transition predicates | F8=MINOR: backend/models/AiConversation.mjs L24-83: messages/messageCount/lastMessageAt have no append/version contract under useAIChat.ts L425,L448
rebuttals: F1=REJECT: client UUID UNIQUE on AiCommandAuditLog is post-effect and racey; failed rows lock retries; reminted keys miss; replace with CommandReceipt claim machine + audit FK | F2=AGREE | F3=AGREE | F4=AGREE
open: Q1=Does aiChatRoutes create L308-344 invoke the trainer target check at L610-625 in-process? | Q2=sendMessageWithConversation default mode when trailing args omitted | Q3=New command_receipts table vs reuse /api/coach/proposals as the receipt store? | Q4=Who persists idempotencyKey for offline queue before first POST?
consensus_block: NOT ADOPTED. Keep F2/F3/F4 exactly. Replace F1 fix with CommandReceipt (idempotencyKey UNIQUE, status CHECK accepted|executing|succeeded|failed|cancelled, INSERT ON CONFLICT DO NOTHING then UPDATE claim WHERE status=accepted, side effects only after claim, audit FK append-only). Add F5 (single server ClientScope; execute refuses mismatched selectedClientId/targetUserId; create path must run L610-625). Add F6 (confirm/cancel are CAS transitions on the same receipt). F8 append/version messages. Residual: workout event boolean is not a receipt; offline key stability; live cross-client auth matrix still unproven.
=== END-VERDICT ===
