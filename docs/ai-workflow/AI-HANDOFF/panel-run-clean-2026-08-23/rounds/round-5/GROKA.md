# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-5\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7132 in / 9708 out · **Cost:** ~$0.0723 · **Wall:** 190.4s · **finish:** stop

---

Round 5, correctness lens. The candidate is mostly the right repair list. I will not rubber-stamp it. Two correctness holes are still being treated as residual paperwork instead of broken state machines.

**F5 as written does not close the kill-switch state machine.**  
`aiCommandRoutes.mjs:110` is the only cited lane kill switch (`protect` + kill switch + rate limit). `aiChatRoutes.mjs:283` is `protect` only; `:466` is subscription + rate-limit + PII. `coachIntakeRoutes.mjs:23-25` is `protect` + admin/trainer + JSON limit. `coachProposalRoutes.mjs:15-16` is `protect` + admin/trainer. Applying the `:466` family + TTL to intake/proposals does not create a coherent DISABLED state. After a command-lane kill, chat can still persist `AiConversation` rows (`useAIChat.ts:217,425,448`), intake can still write, proposals can still apply at `:30-54`. “AI off” is not a system state. That is a correctness defect, not a middleware-style nits. REJECT F5’s current HOW. Replace it with a single process-wide gate evaluated before any of those four routers write.

**F12 (new MAJOR) — conversation store is not concurrency-safe.** The candidate dropped it. Packet evidence is direct:

- Authoritative model `backend/models/AiConversation.mjs:24-83` keeps `messages` + `messageCount` + `lastMessageAt` on **one row**, plus `status`, with no version column, no unique open-thread key, and no message child table/FK shown.
- Canonical writers are concurrent POSTs at `frontend/src/hooks/useAIChat.ts:425,448` (create at `:217`), driven from `AITerminalPanel.tsx:116-139` and `CoachCommandCenter.actions.ts:203-204`.

Two tabs, a retry, or two Node workers doing read-modify-write on that JSON array lose a message and drift `messageCount`/`lastMessageAt`. That is a lost-update on the only conversation truth the Coach surface has. Constraint 3 says memory is not domain truth; it does not permit the memory row to corrupt itself. This is FIX BEFORE BUILD: the mounted brain’s first slice is this model.

Postgres-correct repair, not a redesign essay:
1. Child table `AiMessage(conversationId → AiConversations.id ON DELETE CASCADE, seq, role, body, createdAt)` and drop in-row `messages`.
2. Maintain `messageCount`/`lastMessageAt` by trigger, or stop storing them.
3. Partial unique index on open threads: `(userId, role, context, targetUserId) WHERE status = 'open'` so `:217` cannot fork split-brain conversations.
4. Interim-only alternative: atomic `UPDATE … SET messages = messages || $msg::jsonb, message_count = message_count + 1, last_message_at = NOW(), version = version + 1 WHERE id = $id AND version = $seen` and retry on 0 rows. Sequelize `instance.update({messages: [...old, next]})` is forbidden.

**F1 AGREE, but the HOW must be insert-before-mutate or it is theater.**  
`AiCommandAuditLog.mjs:24-91` has no `action_id` unique key. `aiCommandRoutes.mjs:111-145` + `useCoachCommand.ts:96,170,207` expose execute/confirm/cancel with no CAS. Unique column without insert-first still double-applies on crash-after-mutate. Required:

- `action_id UUID NOT NULL UNIQUE`.
- Status vocabulary: `pending|confirmed|cancelled|applied|failed` with legal edges only.
- `INSERT … status='pending'` first; unique violation returns the existing receipt and does **not** execute.
- `confirm`/`cancel`/`apply` are `UPDATE … WHERE action_id=$id AND status IN (<predecessors>) RETURNING *`; 0 rows → `409 CONFLICT` plus current row.
- Confirm-vs-cancel is a race F1’s unique key alone does not kill. Same transaction as the domain write.

**F6 AGREE — specify isolation, not “a transaction.”**  
`coachProposalRoutes.mjs:30-54` “claims pending rows” is an unverified builder sentence. Under READ COMMITTED, two approvals both see `pending`. Required SQL:

```sql
UPDATE coach_proposals
   SET status='applied', applied_at=NOW(), applied_by=$actor
 WHERE id=$id AND status='pending'
 RETURNING *;
```

0 rows: if already `applied` for the same `actionId`, return that receipt (idempotent replay); otherwise `409` with current status. Domain mutation and status CAS commit together. Concurrent approve+reject: exactly one winner. Crash between status flip and domain write is the reason they share one transaction, not two.

**F3 AGREE, expand the write set.** Canonical `targetUserId` (user PK) + `400 TARGET_REQUIRED` on null must bind every client-bearing write, not only command: `aiChatRoutes.mjs:308-344`, `aiCommandRoutes.mjs:111-145`, `aiDebateRoutes.mjs:57-76`, `AITerminalPanel.tsx:116-139` `clientId`. Receipts echo alias + resolved PK. Admin-unbounded (`clientResolver.mjs:110-166`) may stay policy **only if** F3 still forces an explicit target and the audit row tags `unboundedAdmin=true`. Null target + admin is an undefined scope, not a privilege.

**F2 AGREE.** Registry check after resolve, before mutate, in `commandExecutor.mjs:309-343`. Denial writes an audit row and returns a denial-shaped body. A denied op must be unable to mint `applied`. Re-check `ensureClientAccess` in the same transaction as the write (resolve-then-execute TOCTOU is still an open probe, not a shipped proof).

**F4, F7, F8, F9, F10, F11 AGREE** as MUST-FIX PER SLICE, with F4’s UI vocabulary locked to `queued|sending|verified` and reconcile keyed by `actionId` exactly once. Mount order `routes.mjs:630-634` stays intentional (specific-before-prefix). Spike remains fail-closed 404 on every method.

**SQL injection:** no raw SQL, identifier concat, or unparameterized JSON path is in the packet. I will not invent an injection MAJOR. Residual: live-probe every dynamic `clientId`/`targetUserId`/`actionId` predicate before build.

I am not adopting the candidate verbatim. F5’s HOW is wrong and F12 was dropped. That is a DISPUTE.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: AiCommandAuditLog.mjs L24-91 + aiCommandRoutes.mjs L111-145 + useCoachCommand.ts L96,170,207: no actionId UNIQUE, no insert-before-mutate, no CAS on confirm/cancel | F2=MAJOR: commandExecutor.mjs L309-343: capability/deny must run post-resolve pre-execute and write denial audit | F3=MAJOR: aiChatRoutes.mjs L308-344 + aiCommandRoutes.mjs L111-145 + aiDebateRoutes.mjs L57-76 + AITerminalPanel.tsx L116-139: split client identity (targetUserId vs selectedClientId vs clientId); null targets must 400 | F5=MAJOR: aiCommandRoutes.mjs L110 has lane kill switch; aiChatRoutes.mjs L283/466, coachIntakeRoutes.mjs L23-25, coachProposalRoutes.mjs L15-16 do not — :466 family is not a kill switch | F6=MAJOR: coachProposalRoutes.mjs L30-54: pending apply needs UPDATE…WHERE status='pending' plus same-tx domain write or concurrent approve/reject double-applies | F12=MAJOR: AiConversation.mjs L24-83 + useAIChat.ts L217,425,448: messages+messageCount+lastMessageAt on one row with no version/unique-open-thread/message FK; concurrent POSTs lost-update and fork conversations
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=REJECT: cited fix applies aiChatRoutes.mjs:466 subscription/rate-limit/PII+TTL; that is not the L110 kill switch; chat/intake/proposals still write after command-lane disable | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE
open: Q1=admin unbounded scope in clientResolver.mjs:110-166: policy or defect? only legal if F3 forces explicit targetUserId and audit tags it | Q2=Hermes vs debate vs Coach brain classification still unset | Q3=AiConversation: child messages table vs atomic JSONB|| + version — pick one before slice 1 | Q4=live-probe parameterized predicates (SQLi surface absent from packet, not proven clean) | Q5=acceptance 7 (44px/WCAG) still has zero packet artifacts
consensus_block: (not adopted)
=== END-VERDICT ===
