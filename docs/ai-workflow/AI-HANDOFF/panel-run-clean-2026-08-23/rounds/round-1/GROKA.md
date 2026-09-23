# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-1\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 5506 in / 6718 out · **Cost:** ~$0.0511 · **Wall:** 95.5s · **finish:** stop

---

# Round 1 — Correctness attack (state machines, races, scope binding, SQL truth)

Lens is correctness only. Product taste, visual UX, and “Jarvis feel” are out of scope except where they encode a false state.

The packet already admits the receipt/idempotency contract is **unproven**. That is not a note. Combined with three write lanes, caller-supplied client IDs, a denormalized conversation row, and a browser event that returns a boolean, the current runtime cannot satisfy constraints 2, 3, 4, or 6. Extending `CoachCommandCenterPage` on top of this is a correctness failure, not a missing feature.

---

## F1 MAJOR — No idempotency key; retries are not a function

`backend/models/AiCommandAuditLog.mjs:24-91` records actor, role, resolved target client, operation ID, outcome, error code, parameter hash, duration. Packet states it has **no `action_id` and no unique idempotency key**. Frontend `aiWorkoutEvents.ts:121-128` returns only a dispatcher boolean. Constraint 6 requires offline/degraded gym-floor logging; constraint 4 forbids “saved” before an authoritative write.

Without a unique `(actor, action_id)` or client-supplied idempotency key enforced in Postgres (`UNIQUE`), a retry, double-tap confirm, offline flush, or replay of `/api/ai-command/execute|confirm` (`useCoachCommand.ts:96,170,207`) can commit the same mutation twice. An audit row is not a receipt and is not a uniqueness barrier. Parameter hash is not an idempotency key: equivalent payloads from two legitimate actions collide; retried actions with clock/metadata drift miss.

**Fix:** Add `action_id UUID NOT NULL` (client-generated) + `UNIQUE (action_id)` on the command receipt table (not only the audit log). `execute`/`confirm` must `INSERT … ON CONFLICT (action_id) DO UPDATE` and return the **same** durable receipt. Offline queue keys by `action_id`. UI may show “saved” only after that row is `committed`/`verified`.

---

## F2 MAJOR — Four write authorities, zero shared action state machine

Mounted lanes (`backend/core/routes.mjs:630-634` and `:378-379`):

| Lane | Entry | Mutation style |
|---|---|---|
| `/api/ai-chat` | `useAIChat.ts:217,425,448` | conversation + `targetUserId` |
| `/api/ai-command` | `useCoachCommand.ts:96,170,207` | execute/confirm/cancel |
| `/api/coach/intake` | `coachIntakeRoutes.mjs:23-33` | queue/health/audio |
| `/api/coach/proposals` | `coachProposalRoutes.mjs:15-16,30-54` | claim + apply |

Packet classification: **competing/shared capability lanes** with different context, auth, and receipt contracts. There is no shared `action_id`, no single status vocabulary, no cross-lane exclusion.

Race that is legal today: chat drafts a plan for client A while command confirm writes a workout for A while proposal approval applies a third write for A. Conversation memory (`AiConversation.mjs:24-83` `messages`) is not invalidated by command/proposal outcomes. Constraint 3 (“conversation is not domain truth”) is unimplemented: there is no reconciliation state machine, so the UI can narrate a write that another lane cancelled.

**Fix:** One server-owned `CoachAction` state machine: `draft → queued → awaiting_confirm → committed | failed | cancelled | denied`, keyed by `action_id`, with `lane` as an attribute not an authority. Chat/intake may only mint `draft`. Command/proposal apply are the only transitions into `committed`, and they serialize on `(target_client_id, action_class)` where the class is a domain write.

---

## F3 MAJOR — `execute` / `confirm` / `cancel` have no proven exclusive transition

Three endpoints exist (`useCoachCommand.ts:96,170,207`; mount `routes.mjs:632`). Packet does **not** show a status column, `SELECT FOR UPDATE`, or compare-and-swap on a command row. `AiCommandAuditLog` is append-only outcome logging, not a state row.

Legal interleavings:

1. `confirm` ∥ `cancel` — both can succeed; one write lands, UI shows the other.
2. `confirm` ∥ `confirm` — double apply (amplifies F1).
3. `execute` already mutated, then `cancel` returns 200 — domain and receipt diverge.
4. `execute` is prepare-only, but a client treats execute ACK as saved — constraint 4 break.

This is an incomplete state machine, not an unknown. Three verbs without a single row and legal-transition table cannot be correct under concurrency.

**Fix:** Persist `coach_commands(action_id PK, status, target_client_id, payload_hash, result_receipt)`. Transitions only via
`UPDATE … SET status=$next WHERE action_id=$id AND status=$expected`.
Illegal transition → `409` + current row. `cancel` is a no-op success only from `draft|queued|awaiting_confirm`. Never from `committed`.

---

## F4 MAJOR — Proposal “claim then apply” is an unproven exclusive claim

`coachProposalRoutes.mjs:30-54`: approval “claims pending rows before apply” and calls `ensureClientAccess`. No isolation level, no `FOR UPDATE SKIP LOCKED`, no claim token, no unique partial index such as
`UNIQUE (id) WHERE status = 'pending'`.

Two trainers (or admin + trainer) approving the same proposal, or a retry of the same approval, can both pass `ensureClientAccess`, both observe `pending`, both apply. That is a classic lost-claim / double-apply race. Packet itself lists “Replay/concurrency” as a required live probe — meaning the exclusive claim is **not** in evidence.

**Fix:** `UPDATE proposals SET status='applying', claimed_by=$uid, claimed_at=now() WHERE id=$id AND status='pending' RETURNING *`. Zero rows → stop. Apply inside the same transaction. Terminal `applied|failed` with receipt. Partial unique index on in-flight rows if a client-scoped singleton is required.

---

## F5 MAJOR — Caller-supplied client ID + admin unscope = wrong-client write

Evidence chain:

- `AITerminalPanel.tsx:116-139` sends `clientId || null`.
- `aiCommandRoutes.mjs:111-145` accepts `selectedClientId`.
- `commandExecutor.mjs:309-343` “resolves selected IDs”.
- `clientResolver.mjs:110-166` **scopes trainers but not admins beyond role**.
- Chat create accepts `targetUserId` for admin/trainer (`aiChatRoutes.mjs:308-344`); trainer gate only later at `:610-625`.

Constraint 2: wrong-client mutation is catastrophic; scope must be server-validated.

Defects:

1. **Admin path is unscope.** Any admin-shaped token plus an arbitrary `selectedClientId` / `targetUserId` is sufficient. Stale tab, copied link, or swapped client in a second dashboard is a successful write.
2. **TOCTOU across execute→confirm.** Resolve at execute; confirm is a different request. Packet does not show confirm re-binding the *resolved* client from the command row. Client switch between execute and confirm writes the wrong person.
3. **Conversation vs message scope drift.** Create binds `targetUserId` on `AiConversation`; later `sendMessageWithConversation` can pass a different `clientId`. Trainer check at `:610-625` is not evidence that `messages` are rejected when `clientId ≠ conversation.targetUserId`.

**Fix:** Server session context `(actor_id, role, bound_client_id, conversation_id, action_id)` is the only legal client source. `selectedClientId` is a *request* to rebind, not a write argument. Rebind is an explicit capability, audited, and must match `ensureClientAccess`. Persist `resolved_target_client_id` on the command row at execute; confirm/cancel use that column only. Message POST must `WHERE id=$conv AND target_user_id IS NOT DISTINCT FROM $client`.

---

## F6 MAJOR — `AiConversation.messages` + `messageCount` is a lost-update record

Model fields (`AiConversation.mjs:24-83`): `userId`, `role`, `context`, `targetUserId`, `messages`, `status`, `metadata`, `messageCount`, `lastMessageAt`.

`messages` and `messageCount` on the same row is a denormalized aggregate. Two concurrent POSTs to `/api/ai-chat/conversations/${convId}/messages` (`useAIChat.ts:425,448`) that read-modify-write a JSON/array `messages` column will drop one message; `messageCount` can disagree with `messages.length`. No version column, no `jsonb ||` atomic append, and no child `ai_messages` table with FK are in evidence.

This is Postgres truth: conversation continuity (owner outcome + constraint 3 reconciliation) is not serializable as specified.

**Fix:** Child table `ai_messages(id, conversation_id FK ON DELETE CASCADE, seq, role, body, created_at)` with `UNIQUE (conversation_id, seq)` and `INSERT` only. `messageCount`/`lastMessageAt` maintained by trigger, or dropped. Conversation `status` updates use `WHERE status=$expected`.

---

## F7 MAJOR — Browser dispatch ACK is not a write; any success path on it is a lie

`aiWorkoutEvents.ts:121-128`:

```ts
export function dispatchAIWorkoutEvent(eventName: string, payload: unknown): boolean {
  const dispatch = dispatchers[eventName];
  if (!dispatch) return false;
  return dispatch(payload as AIEventPayload);
}
```

Returns whether a named in-memory dispatcher ran. Constraint 4 + packet instruction: do not infer a committed workout write. Logger-bridge path in the architecture table is exactly this. If `CoachCommandCenter` or the logger treats `true` as logged, the UI enters `saved` with no server row, no receipt, and no way to reconcile after refresh/offline (F1, F2).

**Fix:** Dispatcher may only emit UI intent (`queued_local`). Durable state waits for the command receipt in F1. Map `true` → `intent_accepted_locally`, never `committed`.

---

## F8 MINOR — Conversation `status` exists without a transition table

`AiConversation.mjs:24-83` has `status`. No legal values, no terminal states, no interaction with command/proposal status. Illegal combos (conversation `closed` + command `awaiting_confirm`, or `active` after target user deleted) are unenforceable.

**Fix:** Enum + CHECK + documented transitions. Cross-lane: committing a write must stamp conversation `metadata.last_committed_action_id` or invalidate the relevant turn.

---

## F9 MINOR — Frontend tab/role state can desync from server role

`CoachCommandCenterPage.tsx:34-43`: role from `authUser`, `useState` initial tab via `coerceCoachTabForRole`. Role change, impersonation end, or stale search param does not re-coerce except on remount. Server must still deny (constraint 5), but the page can display trainer tools and send command payloads the server should 403. Combined with F5 admin unscope, the stale client in that shell is enough.

**Fix:** Re-derive tab/capability set whenever `authUser.role` or bound client changes; on 403, force re-anchor, do not retry with the old `selectedClientId`.

---

## F10 MINOR — Hive-mind doc is a second, conflicting router

`docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22` (Gemini Flash vs Gemini→Qwen→Gemini Pro for “complex” workout/client/progress) vs mounted runtime (`routes.mjs:630-634`, intake/proposals at `:378-379`). If any caller still branches on that doc, capability routing and action class (answer vs privileged write) diverge from the command/proposal machines. Stale policy is a correctness bug when it selects a path that skips confirm.

**Fix:** Classify the doc **legacy**. Single capability registry decides model *and* action class. Doc must not remain an implicit router.

---

## F11 NOTE — SQL injection / bind contract unproven

No parameterized SQL appears in the packet. `targetUserId`, `selectedClientId`, `clientId`, conversation ids, and proposal ids cross from React into Express. Cannot claim injection; cannot claim safe binds. Required probe: every handler that touches those fields uses bound parameters / ORM bind, never string concat. Especially `clientResolver.mjs:110-166` and conversation lookup.

---

## F12 NOTE — FK / delete / cycle unstated

`AiConversation.userId` / `targetUserId` and audit `resolved target client` have no shown FK, `ON DELETE`, or restrict. User/client delete can orphan conversations and leave command confirm targeting a missing person (silent no-op or unexpected 500). Intake→proposal identity is listed as an unproven probe — that is an undeclared FK/cycle between artifacts.

**Fix:** Real FKs. `target_user_id` RESTRICT while `awaiting_confirm|applying`. Soft-delete clients must fail open commands, not apply.

---

## Classification (question 9, correctness only)

| Surface | Class | Correctness consequence |
|---|---|---|
| `CoachCommandCenterPage` + routes `:98/:177/:203` | canonical shell | Must not grow writes until F1–F7 exist |
| `SwanCoachAssistantPage` | legacy | Leave frozen; second shell would fork state |
| `/api/ai-chat`, `/api/ai-command`, `/api/coach/intake`, `/api/coach/proposals` | competing authorities | Must collapse under one action row |
| `/api/hermes`, `/api/ai/debate` | separate, unclassified | Must not mint Coach receipts until classified |
| `APP-AI-HIVE-MIND.md` | stale policy | Retire as router |
| `AiCommandAuditLog` | audit only | Not a receipt, not idempotent |
| `dispatchAIWorkoutEvent` | local intent bus | Never domain truth |

Missing evidence (do not invent): live cross-client matrix; whether `execute` mutates; claim SQL for proposals; message persist implementation; bind vs concat; confirm re-read of resolved client.

---

## Canonical brain boundary (question 1, correctness slice)

Server owns:

1. **Context key** `(actor_id, role, bound_client_id, session_id, conversation_id)` — client id never taken from the write body after bind.
2. **Capability registry** — action class: `answer | draft | reversible | confirm_required | privileged | async | denied`.
3. **Policy gate** — re-check on every transition, including admin (F5).
4. **Domain projections** — workouts, plans, intake, proposals are tables with FKs; chat `messages` are not.
5. **Receipts** — `action_id` unique, status CAS, audit as sidecar.
6. **UI adapters** — `CoachCommandCenterPage` / `AITerminalPanel` render receipt vocabulary only: `observed | inferred | draft | queued_offline | awaiting_confirm | committed | failed | cancelled | denied`.

Offline: queue `action_id`s; flush with the same CAS; UI stays `queued_offline` until `committed`. Duplicate prevention is the unique index, not a spinner.

Hive-mind / Hermes / debate are specialist *capabilities* behind the registry, not parallel brains.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs:24-91: no action_id/idempotency unique key; retries/offline/double-confirm can commit duplicate domain writes | F2=MAJOR: backend/core/routes.mjs:378-379,630-634 + useAIChat.ts:217,425,448 + useCoachCommand.ts:96,170,207: four mutation lanes share no action_id or status vocabulary; conversation memory cannot reconcile with command/proposal truth | F3=MAJOR: useCoachCommand.ts:96,170,207: execute/confirm/cancel have no persisted status row or CAS; confirm∥cancel and double-confirm are legal | F4=MAJOR: coachProposalRoutes.mjs:30-54: "claim pending then apply" has no FOR UPDATE/CAS/partial unique index in evidence; double-apply race | F5=MAJOR: clientResolver.mjs:110-166 + aiCommandRoutes.mjs:111-145 + AITerminalPanel.tsx:116-139 + aiChatRoutes.mjs:308-344: caller-supplied client IDs; admins unscoping; execute→confirm TOCTOU; conversation.targetUserId not proven bound on later messages | F6=MAJOR: backend/models/AiConversation.mjs:24-83: messages+messageCount on one row with no version/child-table/atomic append; concurrent POSTs lost-update | F7=MAJOR: frontend/src/utils/aiWorkoutEvents.ts:121-128: dispatcher boolean is not a server receipt; treating it as saved violates constraint 4 | F8=MINOR: AiConversation.mjs:24-83: status has no transition table or cross-lane coupling | F9=MINOR: CoachCommandCenterPage.tsx:34-43: local tab/role useState can stale across role/client rebind | F10=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22 vs routes.mjs:630-634: stale consensus router can skip confirm class | F11=NOTE: no SQL text in packet: bind vs concat for targetUserId/selectedClientId/clientId unproven | F12=NOTE: AiConversation userId/targetUserId FK/ON DELETE and intake↔proposal identity unstated; delete/orphan/cycle risk
rebuttals: (none)
open: Q1=Does execute mutate before confirm, or is it prepare-only? Packet lacks commandExecutor write path. | Q2=Are proposal claims SELECT FOR UPDATE / status CAS in the unshown service, or check-then-act? | Q3=Are AiConversation.messages a JSON column or a related table? F6 severity depends on that probe. | Q4=Must admin be bound to an explicit client (same as trainer) for every write class, or is unscope intentional for a subset? Constraint 2 vs clientResolver:110-166. | Q5=Are Hermes/debate allowed to emit CoachAction receipts or must they stay operator-only?
=== END-VERDICT ===
