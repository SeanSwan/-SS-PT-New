# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-10\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7032 in / 11617 out · **Cost:** ~$0.0836 · **Wall:** 232.7s · **finish:** stop

---

The candidate is not safe to adopt as written. It patches two authz holes and one audit column, then parks the actual correctness contract (action state machine, receipt vs browser ack, identity unification, retry races) as “residual.” That is false unification: the packet’s constraints 3, 4, and 6 stay broken.

## REJECT the F1 *mechanism* (finding stands; fix is wrong)

`AiCommandAuditLog.mjs L24-91` records actor, role, resolved target, operation ID, **outcome**, error, param hash, duration. It has no `action_id` and no idempotency key. That defect is real.

Putting `commandIdemKey UUID UNIQUE` on that table and “return the original receipt” is an incorrect state machine:

1. **Failed outcome becomes terminal.** The log row includes `outcome`. A UNIQUE key occupied by a transient failure makes AC1 (“duplicate POST returns original receipt and no new row”) block a legitimate retry. Idempotency is “same intent,” not “first write wins forever.”
2. **In-flight race.** Two retries under READ COMMITTED: T1 INSERT uncommitted, T2 INSERT → Postgres `23505`. T2 SELECT by key sees nothing until T1 commits. Candidate specifies neither `INSERT … ON CONFLICT` nor `SELECT FOR UPDATE` on the 23505 path. The loser can mint a second semantic execution or return an empty receipt.
3. **NULL UNIQUE.** Postgres UNIQUE allows multiple NULLs. A nullable column means omitted keys get no idempotency. Candidate does not require `NOT NULL`.
4. **Global UNIQUE is the wrong constraint.** Lookup-by-key-only lets a client replay someone else’s UUID and read their receipt. Constraint must be `UNIQUE (actor_id, command_idem_key)` and every fetch must be actor-scoped.
5. **Audit log is the wrong root.** An append-only outcome log is not `queued | executing | succeeded | failed | cancelled`. The packet already says the receipt contract is unproven and must be designed before implementation.

**WHAT / WHERE / HOW (replace candidate F1):**
- Add `AiCommandAction` (not a UNIQUE bolt-on to `AiCommandAuditLog.mjs L24-91`): `action_id UUID PK`, `actor_id` FK, `command_idem_key UUID NOT NULL`, `target_client_id` FK, `status TEXT CHECK IN ('queued','executing','succeeded','failed','cancelled')`, `receipt JSONB`, `UNIQUE (actor_id, command_idem_key)`.
- Keep `AiCommandAuditLog` append-only with `action_id` FK (every transition).
- `commandExecutor.mjs L309-343`: bind parameters only; `INSERT … ON CONFLICT (actor_id, command_idem_key) DO NOTHING RETURNING *`; on miss, `SELECT … FOR UPDATE` actor-scoped; if `failed`, allow retry update; if `executing|succeeded|cancelled`, return that receipt; never start a second executor.
- AC1 must be split: duplicate-while-terminal-success → original receipt, zero new action rows; duplicate-while-failed → retry permitted; duplicate-while-executing → same in-flight receipt, no second side effect.

## New MAJOR — candidate dropped the workout false-success path

`frontend/src/utils/aiWorkoutEvents.ts L121-128` returns only whether a named **browser** dispatcher ran. Constraints 3 and 4: conversation/UI events are not domain truth; the UI cannot say saved before an authoritative write. Running state already had this; the candidate deleted it.

**WHAT / WHERE / HOW:** Change `dispatchAIWorkoutEvent` to a discriminated result (`{kind:'dispatched', eventName, clientDispatchId}` | `{kind:'unhandled'}`). Ban `if (dispatchAIWorkoutEvent(...))` as “saved” in the type system. UI may show queued/local only. Saved/confirmed requires a server action receipt from `/api/ai-command` or the workout write path.

## New MAJOR — fragmented client identity (FK / join truth)

Same session can name the client four ways:

| Field | Site |
|---|---|
| `targetUserId` | `AiConversation.mjs L24-83` |
| `selectedClientId` | `aiCommandRoutes.mjs L111-145` |
| `clientId` | `aiDebateRoutes.mjs L57-76` |
| `clientId` | `AITerminalPanel.tsx L116-139` |

F5 and F6 gate each lane locally. They do not create one `targetClientId` that a FK can enforce. Chat scoped to A + command scoped to B is still a wrong-client write. You cannot join conversation memory to command receipts without a mapping table that does not exist in the packet.

**WHAT / WHERE / HOW:** One server type `{ targetClientId: UUID }` produced only by `clientResolver.mjs L110-166`. Persist that column name on conversation, command action, debate job. Reject any request that carries two disagreeing identifiers. Pin scope on the session and require an explicit re-anchor on switch.

## New MAJOR — authorize-on-create is not a chat state machine

F6 at `aiChatRoutes.mjs L308-344` is necessary and insufficient. Trainer re-check is only cited at `:610-625`. Create-gated then message/read/update by `convId` is classic TOCTOU/IDOR: mint or guess a conversation whose `targetUserId` is out of scope. Residual “also do read/update” is not an acceptance criterion.

**HOW:** Every chat verb (create, get, list, message POST, update, stream) must call the same resolver against `conversation.targetClientId`. Out-of-scope → 4xx + security audit row. AC5 stays; add AC6 for read/update/message.

## New MAJOR — `SwanCoachAssistantPage` tests

Surface table: no route mount, **still referenced by its own tests**. Delete/retire without a test-plan slice fails CI. Candidate is silent. Classification already said do not delete on the evidence pass; the blueprint must schedule retirement.

**HOW:** Slice 0: skip or retarget those tests to `CoachCommandCenterPage` (`UniversalDashboardLayout.routes.tsx:98/177/203`). Build stays green. Then retire.

## F2 / F3 / F4 / F5 / F6

- **F2 AGREE.** `AITerminalPanel.tsx L116-139`: 7-arg branch (`'both', null, requestContext`) vs 4-arg branch. `buildChatParams` plus an explicit `useAIChat.ts` typed signature. AC2 stands.
- **F3 AGREE** that `APP-AI-HIVE-MIND.md L7-22` is not runtime truth. Candidate contradicts itself: F3 = mark DORMANT + link; AC3 = “removed from active architecture index.” Do the first, not a silent delete.
- **F4 AGREE.** Authoritative mounts are `backend/core/routes.mjs L630-634` (stream-spike, chat, command, hermes, debate); intake/proposals at `:378-379`. Citation only.
- **F5 AGREE** fail-closed on unvalidated admin target (`clientResolver.mjs L110-166`, `commandExecutor.mjs L309-343`). Do not invent a second “admin may omit client” path unless a capability flag `requiresClientScope=false` is proven per command family. Denied command still writes an audit row (`outcome=denied`) or AC4’s “logs a security event” is non-durable.
- **F6 AGREE** on create; elevate the rest of the chat lifecycle (see above).

## Edge cases the candidate does not close

- Offline/degraded (constraint 6) is left as residual. Two devices, two idempotency keys, one intent → duplicate domain writes. The action table + device-scoped queue + reconcile-by-`(actor_id, command_idem_key)` is mandatory in this ruling, not a later panel homework.
- Proposal path (`routes.mjs:379`, claim-before-apply) still has no compare-and-set/replay token in this ruling. Lost-update remains a required probe, not a claimed fix.
- Client-generated keys and all client IDs must be bound parameters. Packet shows no raw SQL; do not add a speculative injection finding, but the F1 insert path is the injection surface if anyone interpolates the UUID.

=== VERDICT ===
status: DISPUTE
confidence: 91
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/idempotency; UNIQUE commandIdemKey on audit log is the wrong state machine (failed rows terminal, 23505 race, NULL UNIQUE hole, global key receipt leak) | F2=MINOR: frontend/src/components/DashBoard/AITerminalPanel.tsx L116-139: sendMessageWithConversation arity/mode drift across branches | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: stale Gemini/Qwen consensus vs mounted chat/command/intake/proposal/hermes/debate lanes | F5=MAJOR: backend/services/clientResolver.mjs L110-166 + commandExecutor.mjs L309-343: admin commands resolve caller-supplied IDs without client-scope entitlement | F6=MAJOR: backend/routes/aiChatRoutes.mjs L308-344: admin conversation create accepts unvalidated targetUserId | F7=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: dispatcher boolean is not a server receipt; UI can assert saved off a browser ack (constraints 3/4); candidate dropped this | F8=MAJOR: AiConversation.mjs L24-83 targetUserId vs aiCommandRoutes.mjs L111-145 selectedClientId vs aiDebateRoutes.mjs L57-76 clientId vs AITerminalPanel.tsx L116-139 clientId: fragmented identity blocks FK alignment and allows cross-lane wrong-client writes | F9=MAJOR: SwanCoachAssistantPage still referenced by own tests (surface table): deletion without test-plan slice breaks build | F10=MAJOR: backend/routes/aiChatRoutes.mjs L308-344 vs L610-625: authorize-on-create-only; admin read/update/message have no proven targetClientId re-check
rebuttals: F1=AGREE: defect real; REJECT proposed HOW (UNIQUE on audit log); require AiCommandAction status machine + UNIQUE(actor_id, command_idem_key) + ON CONFLICT/FOR UPDATE | F2=AGREE | F3=AGREE: mark DORMANT+link; REJECT AC3 silent removal | F4=AGREE | F5=AGREE: fail-closed; denied must persist audit outcome=denied | F6=AGREE: create gate necessary; not sufficient without F10
open: Q1=Which command families (if any) are system-scoped and must set requiresClientScope=false? | Q2=Is proposal claim-before-apply already CAS/replay-token or a lost-update race? | Q3=Do hermes + debate adopt the same targetClientId FK or remain separate tenancy?
=== END-VERDICT ===
