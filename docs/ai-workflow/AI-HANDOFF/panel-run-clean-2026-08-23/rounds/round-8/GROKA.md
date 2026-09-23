# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-8\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6682 in / 9766 out · **Cost:** ~$0.0718 · **Wall:** 181.8s · **finish:** stop

---

Round 8, correctness lens only: state machines, races, Postgres uniqueness/NULL, identity binding, role-at-execution.

I adopt the candidate’s defect list and slice split except two prescribed fixes that are wrong on the packet’s own role/auth evidence, plus one missing MAJOR the running state already flagged and the candidate never numbered.

**REJECT F3’s unconditioned `400 TARGET_REQUIRED`.** Canonical `targetUserId` (user PK) and receipts that echo alias+resolved PK are correct. Blanket-null reject is not. Packet shows client self-service as a first-class mount (`UniversalDashboardLayout.routes.tsx:203`) and `CoachCommandCenterPage.tsx:34-43` derives `isClientMode` from auth role. Chat creation accepts `targetUserId` for admin/trainer only (`aiChatRoutes.mjs:308-344`). A client/user omitting the field is implicit self, not a missing target. Server must bind `targetUserId = auth.userId` for client/user and reject *mismatched* self-spoof with 403. Admin/trainer with unresolved/null target after alias resolution → `400 TARGET_REQUIRED`. Otherwise client Coach is a built-in contract break.

**REJECT F5’s “apply `:466` middleware family”.** Intake (`coachIntakeRoutes.mjs:23-25`) and proposals (`coachProposalRoutes.mjs:15-16`) are already `protect` + admin/trainer. Chat `:466` is subscription + rate-limit + PII on a mixed client/trainer lane. Blind-copy of a caller-subscription gate onto admin/trainer review writes can 402/403 the only review path. Packet does not show the subscription predicate is target-scoped. Exact fix: copy rate-limit + PII redaction + TTL/retention only; subscription may land only after a probe proves it keys on resolved target, not caller.

**AGREE F1, with Postgres/state-machine HOW the candidate left implicit.** `AiCommandAuditLog.mjs:24-91` has operation ID as taxonomy, no `action_id`, no unique idempotency key (packet receipt section). `UNIQUE(actionId)` alone is not idempotency: Postgres UNIQUE is NULLS DISTINCT, so NULL retries all insert. Required: `actionId` TEXT NOT NULL on new writes; `UNIQUE(actionId)`; execute/confirm/cancel (`aiCommandRoutes.mjs:111-145`, `useCoachCommand.ts:96,170,207`) reject missing `actionId` with 400. First-write-wins: same `actionId`, different payload → original receipt + mismatch flag, no mutate. Confirm/cancel are CAS, not new inserts:

`absent -execute→ pending | confirmed` (immediate only if registry says so)
`pending -confirm→ confirmed` (idempotent re-confirm)
`pending -cancel→ cancelled` (idempotent re-cancel)
`confirmed -cancel→ 409` / `cancelled -confirm→ 409` (no resurrection)

SQL shape: `UPDATE ... SET status=$next WHERE action_id=$id AND status=$expected RETURNING *` inside the same transaction as the domain write and audit row. Crash between flip and domain write is the F6 class of bug; one transaction or an `applying` + reclaim lease.

**AGREE F6.** `coachProposalRoutes.mjs:30-54` “claims pending then apply” is two steps. Collapse to one transaction: `UPDATE ... WHERE id=$id AND status='pending' RETURNING *` then domain apply then durable `applied|failed` receipt keyed by proposalId+actionId. Separate `claimed` without reclaim leaves crash-orphans. Replay returns the durable receipt; never a second apply.

**AGREE F2.** Registry check after `commandExecutor.mjs:309-343` resolution, before dispatch. Denial writes audit (`denied`, role-at-execution, resolved PK) and returns a denial-shaped body. No success receipt on deny.

**NEW MAJOR F12 — role snapshot is not entitlement.** `AiConversation.mjs:24-83` persists `role` with `userId`/`targetUserId`. Constraint 5: boundaries from the live principal, not a shell or a row written at conversation create. Attribution and allow/deny must use role-at-execution on the audit row (`AiCommandAuditLog.mjs:24-91`). `conversation.role` is history/display only. A later command that authorizes from the snapshot survives role change, impersonation end, or stale tab.

**AGREE remainder, no drift:** F4 IndexedDB queue keyed by `actionId`, UI `queued|sending|verified` only, reconcile replays once. F7 spike method inventory + disabled-404 every method. F10 `ensureClientAccess` on `aiDebateRoutes.mjs:57-76` start (mounted live with caller `clientId`; ownership on status/result/stream does not cover start). F11 fence `SwanCoachAssistantPage`, migrate tests, cite or drop “locks”. F8 cite review-gate code or strike header “review-gated writes” (`CoachCommandCenterPage` claim vs execute at `aiCommandRoutes.mjs:111-145`). F9 archive/rewrite `APP-AI-HIVE-MIND.md:7-22`. Admin unbounded *range* in `clientResolver.mjs:110-166` intentional only if policy-tagged on every audit row; F3 still forbids implicit/null admin target. `routes.mjs:630-634` specific-before-prefix is correct, not a defect.

**NOTE (not blocking):** packet shows no FK/ON DELETE for `AiConversation.targetUserId` or audit target. Blueprint must `REFERENCES users(id) ON DELETE RESTRICT` and keep audit rows after user delete (constraint 2 recoverable). `AiConversation.messages` as a column is a lost-update suspect under concurrent POSTs to `/api/ai-chat/conversations/:id/messages`; probe the persist path before calling it authoritative memory.

No SQL-injection finding: no raw SQL in packet; do not invent one.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: AiCommandAuditLog.mjs L24-91 + aiCommandRoutes.mjs L111-145 + useCoachCommand.ts L96,170,207: no actionId NOT NULL unique key; execute/confirm/cancel lack first-write-wins receipts and CAS status machine | F2=MAJOR: commandExecutor.mjs L309-343: capability check must run post-resolution pre-dispatch; deny audits and returns denial shape | F3=MAJOR: aiChatRoutes.mjs L308-344 + aiCommandRoutes.mjs L111-145 + clientResolver.mjs L110-166: split selectedClientId/targetUserId/clientId; canonical user-PK only | F6=MAJOR: coachProposalRoutes.mjs L30-54: claim-then-apply is racy; need transactional CAS WHERE status='pending' + durable applied/failed receipt | F12=MAJOR: AiConversation.mjs L24-83: persisted role is snapshot; must not authorize; role-at-execution lives on audit row | F5=MAJOR: coachIntakeRoutes.mjs L23-25 + coachProposalRoutes.mjs L15-16 vs aiChatRoutes.mjs L466: need rate-limit/PII/TTL parity, not blind subscription-family copy | F10=MAJOR: aiDebateRoutes.mjs L57-76: start accepts clientId without proven ensureClientAccess | F4=MINOR: offline queue must key actionId and expose queued/sending/verified only | F11=MINOR: SwanCoachAssistantPage still referenced while routes mount CoachCommandCenterPage | F7=NOTE: stream-spike needs method inventory + disabled-404 | F8=NOTE: header review-gated writes uncited | F9=NOTE: APP-AI-HIVE-MIND.md L7-22 runtime drift | F13=NOTE: no FK/ON DELETE evidence for conversation/audit targets
rebuttals: F3=REJECT: unconditioned 400 TARGET_REQUIRED breaks client implicit-self (routes.tsx:203, CoachCommandCenterPage.tsx:34-43, aiChatRoutes.mjs:308-344); bind self for client/user, TARGET_REQUIRED only for admin/trainer | F5=REJECT: :466 subscription predicate unproven as target-scoped; copying it onto admin/trainer intake/proposals can block review writes; take rate-limit+PII+TTL only | F1=AGREE | F2=AGREE | F6=AGREE | F4=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE | F12=AGREE
open: Q1=confirm F3 role-conditioned bind vs blanket TARGET_REQUIRED | Q2=probe :466 subscription key (caller vs target) before any copy | Q3=does any unshown handler authorize from conversation.role | Q4=Hermes/debate canonical vs competing; F10 stays live until classified | Q5=does command table already have status, or must F1 add pending/confirmed/cancelled/failed
=== END-VERDICT ===
