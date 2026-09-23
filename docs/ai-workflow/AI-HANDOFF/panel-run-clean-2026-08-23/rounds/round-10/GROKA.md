# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-10\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7248 in / 9275 out · **Cost:** ~$0.0700 · **Wall:** 123.6s · **finish:** stop

---

Round 10 correctness attack: state machines, races, identity, Postgres uniqueness, and unproven joins. I adopt the candidate except F3’s blanket null-target rule, which is a wrong state machine.

**F1 — still MAJOR, AGREE.** `AiCommandAuditLog.mjs:24-91` records actor, role, resolved target, operation ID, outcome, hash, duration. It has no `action_id` and no unique idempotency key. `aiCommandRoutes.mjs:111-145` accepts `selectedClientId` and `useCoachCommand.ts:96,170,207` posts execute/confirm/cancel with no client-generated action id in evidence. Retry, double-tap, or offline replay can mint two successful mutations. Constraint 3–4 and 6 are unsatisfied until a unique key and a single receipt exist.

Fix: add `action_id` (UUID) UNIQUE on `AiCommandAuditLog`. Executor does `INSERT … ON CONFLICT (action_id) DO NOTHING RETURNING *`; on conflict return the existing receipt; if row is `pending`, return `409 IN_FLIGHT` or wait — never start a second execute. Terminal states `applied|failed|denied` are immutable. Return that receipt to `useCoachCommand` before any UI “saved”.

**F2 — still MAJOR, AGREE.** `commandExecutor.mjs:309-343` resolves IDs then executes. Packet does not show a capability check in that critical section, nor a denial-shaped receipt. A resolve-then-later-execute hop is TOCTOU: entitlement can change, or a denied op can still look like success.

Fix: after identity resolution, in the same critical section as the write, check the capability registry + `ensureClientAccess`. On deny: insert audit row `outcome=denied`, return denial receipt, do not mutate.

**F3 — MAJOR, REJECT as written.** Canonical user-PK identity is correct. Universal `400 TARGET_REQUIRED` on null is not.

Evidence: conversation create *accepts* `targetUserId` at `aiChatRoutes.mjs:308-344`, it does not require it. `CoachCommandCenterPage.tsx:34-43` is a first-class client mode (`isClientMode`). Question 5 defines an answer-only class. Trainer/admin talk-first questions need not bind a client. Blind 400 breaks those paths; allowing raw null on mutations breaks constraint 2.

Replacement contract:
1. Resolve first: client/self-service → `targetUserId = actor.id` (ignore any other id). Admin/trainer → supplied id, else null.
2. Mutating / client-scoped capabilities: if still null → `400 TARGET_REQUIRED`.
3. Answer-only / non-scoped: null is legal; do **not** inherit a stale `selectedClientId`.
4. Persist only a users-PK (FK to `users.id` when non-null). Receipts echo `{alias, resolvedUserId}` or explicit `target=null`.
5. Bind chat and command to one server context + `contextVersion`. `useAIChat` (`targetUserId`) and `useCoachCommand` (`selectedClientId`) are two writers today; reject mismatched target or stale version so a tab cannot chat client A and execute client B.

**F6 — still MAJOR, AGREE.** `coachProposalRoutes.mjs:30-54` “claims pending then apply” is two steps. Two approvers can both pass `ensureClientAccess` and both apply.

Fix: one transaction: `UPDATE … SET status='applying' WHERE id=$1 AND status='pending' RETURNING *`. Zero rows → load current row and return its durable receipt (idempotent), no second apply. Apply + write `applied|failed` receipt in that same transaction (or transactional outbox). Never “claimed” outside the write txn.

**F5, F4, F7, F8, F10, F11, F9 — AGREE.** Intake/proposals (`coachIntakeRoutes.mjs:23-25`, `coachProposalRoutes.mjs:15-16`) lack the `aiChatRoutes.mjs:466` family and any TTL; intake otherwise becomes unbounded memory (constraint 1). Offline queue is absent (constraint 6) — IndexedDB keyed by `actionId`, UI only `queued|sending|verified`, reconcile exactly once via F1. Spike is only evidenced as fail-closed `GET /`; inventory every method to disabled-404. Header “review-gated writes” is uncited against `/api/ai-command/execute`. Debate start `aiDebateRoutes.mjs:57-76` resolves client context without `ensureClientAccess`. `SwanCoachAssistantPage` is unmounted (`UniversalDashboardLayout.routes.tsx:98,177,203` mount `CoachCommandCenterPage`) but still referenced. Hive doc `APP-AI-HIVE-MIND.md:7-22` contradicts `routes.mjs:630-634`.

**Admin scope / mount order — close the pending ruling.** `clientResolver.mjs:110-166` trainer-scoped, admin not: INTENTIONAL POLICY, not a defect, iff every mutating write still carries explicit target (corrected F3), audit tags `actorRole=admin, scope=unbounded`, and F2 still gates. Express specific-before-prefix at `routes.mjs:630-634` is correct; not a defect.

**Not claimed (no packet SQL).** No raw-SQL excerpt → no SQLi finding. `AiConversation.mjs:24-83` has both `messages` and `messageCount` — probe the persist path for JSON RMW lost-update before treating it as a built defect.

Hermes/debate stay isolated until a probe shows they share this identity/receipt machine. Do not unify them on paper.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: AiCommandAuditLog.mjs L24-91 + aiCommandRoutes.mjs L111-145 + useCoachCommand.ts L96,170,207: no actionId unique key, no idempotent executor, no authoritative receipt — retries duplicate writes | F2=MAJOR: commandExecutor.mjs L309-343: resolve-then-execute with no in-section capability/access check; deny must audit+return denial receipt | F3=MAJOR: AiConversation.mjs L24-83 + aiCommandRoutes.mjs L111-145 + clientResolver.mjs L110-166 + aiChatRoutes.mjs L308-344: identity must be a single users-PK with class-gated nulls and a shared contextVersion across chat/command — not blanket TARGET_REQUIRED | F4=MAJOR: (no existing code) + constraint 6: no actionId-keyed offline queue; UI must not claim saved without receipt | F5=MAJOR: coachIntakeRoutes.mjs L23-25 + coachProposalRoutes.mjs L15-16 vs aiChatRoutes.mjs L466: missing middleware/TTL parity; intake can become permanent memory | F6=MAJOR: coachProposalRoutes.mjs L30-54: claim-then-apply race; need UPDATE WHERE status='pending' in one txn + idempotent receipt | F7=MINOR: aiStreamSpikeRoutes.mjs + routes.mjs L630: only GET / evidenced fail-closed; other methods need disabled-404 | F8=MAJOR: packet header 'review-gated writes' uncited against /api/ai-command/execute | F9=MINOR: APP-AI-HIVE-MIND.md L7-22 runtime drift vs routes.mjs L630-634 | F10=MAJOR: aiDebateRoutes.mjs L57-76 start path resolves client context without ensureClientAccess | F11=MINOR: SwanCoachAssistantPage still referenced while UniversalDashboardLayout.routes.tsx L98,177,203 mount CoachCommandCenterPage
rebuttals: F3=REJECT: blanket 400 TARGET_REQUIRED on null contradicts optional targetUserId at aiChatRoutes.mjs:308-344, client-mode coerce at CoachCommandCenterPage.tsx:34-43, and answer-only class; require target only on mutating/client-scoped ops, coerce client→actor.id, allow explicit null on answer-only, bind chat+command with contextVersion | F1=AGREE | F2=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE
open: Q1=confirm answer-only may persist target=null (no stale selectedClientId inherit) vs force trainers to always bind a client | Q2=do Hermes/debate join the actionId/receipt machine or stay isolated pending probe | Q3=admin unbounded scope in clientResolver.mjs:110-166 closed here as policy+audit-tag — other seats confirm | Q4=probe AiConversation.messages writer for JSON RMW lost-update (messages+messageCount at L24-83)
consensus_block: REJECT F3-as-written; all other candidate items adopted. FIX BEFORE BUILD: F1 — AiCommandAuditLog.mjs:24-91 add action_id UUID UNIQUE; commandExecutor INSERT ON CONFLICT DO NOTHING RETURNING and replay existing receipt (409 IN_FLIGHT if pending); aiCommandRoutes.mjs:111-145 + useCoachCommand.ts:96,170,207 accept/return that receipt before any saved UI. F3-CORRECTED — single canonical targetUserId users-PK (FK when non-null); client role coerced to actor.id; mutating/client-scoped ops 400 TARGET_REQUIRED if unresolved; answer-only allows explicit null and must not inherit stale selectedClientId; receipts echo alias+resolved PK or target=null; chat+command share server context+contextVersion, reject mismatch. F2 — capability+ensureClientAccess in the same critical section as the write at commandExecutor.mjs:309-343; denial writes audit and returns denial receipt. F6 — coachProposalRoutes.mjs:30-54 single txn UPDATE … WHERE status='pending' RETURNING; zero rows returns existing applied/failed receipt; apply+receipt durable together. F5 — copy aiChatRoutes.mjs:466 middleware family + TTL onto coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16; parity table gate. MUST-FIX PER SLICE: F4 IndexedDB queue keyed by actionId; UI states queued/sending/verified only; reconcile replays once via F1. F7 spike method inventory + disabled-404 every method. F10 ensureClientAccess on aiDebateRoutes.mjs:57-76 start. F11 fence SwanCoachAssistantPage, migrate tests, cite or drop locks. F8 cite review-gate code or strike header claim. F9 archive/rewrite hive doc. ACCEPTED AS INTENTIONAL (ruling closed): admin unbounded scope at clientResolver.mjs:110-166 is policy, not defect, iff F3-CORRECTED target is explicit on mutating writes, audit tags actorRole=admin scope=unbounded, and F2 still gates; Express specific-before-prefix at routes.mjs:630-634 is correct practice, not a defect. RESIDUAL RISKS: constraints 2/3/4/6 unverifiable until F1/F3-CORRECTED/F4 land; absence-based MAJORs need live probes; Hermes/debate classification unresolved (do not false-unify); AiConversation.messages persist path unproven against lost-update; acceptance criterion 7 (44px/WCAG) has zero packet artifacts and stays on the blueprint verification matrix.
=== END-VERDICT ===
