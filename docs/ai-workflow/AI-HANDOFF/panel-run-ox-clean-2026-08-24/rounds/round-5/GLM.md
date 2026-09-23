# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-5\REVIEW-DOC.md
**Tokens:** 6097 in / 9801 out (reasoning: 7159) | total 15898
**Wall:** 121.4s

---

# GLM 5.3 — Round 5 — Full-spectrum hostile review (correctness · security · schema truth · the 8 criteria)

## Seat position

I adopt the consensus goal-set but **REJECT the F1 mechanism as specified** and carry one new MAJOR (F5) against it. F2, F3, F4 are adopted with one sharpened test condition each. Status: DISPUTE.

---

## 1. The core defect this round: the consensus F1 fix fails its own acceptance criterion

The consensus candidate orders: *"add a `commandIdemKey` UUID UNIQUE column to AiCommandAuditLog model (L24-91) and enforce insertion idempotency in the command executor… reject duplicate submissions with the original receipt."*

Three packet-backed reasons this mechanism is unsafe as written:

**(a) Audit log ≠ dedup authority — dual-write gap.** The packet's own receipt section states `AiCommandAuditLog.mjs:24-91` "records actor, role, resolved target client, operation ID, outcome, error code, parameter hash/redaction, and duration" and the executor is a separate unit (`commandExecutor.mjs:309-343` resolves selected IDs). Nothing in the packet places command execution and audit insertion in one transaction. A crash between execute and audit-insert leaves **no key recorded**, so the retry re-executes — acceptance criterion (1) ("duplicate command POST returns the original receipt and no new row") is satisfiable *while still double-executing*. The UNIQUE column tests the audit path, not the execution path.

**(b) Burned-key / false-receipt failure mode.** The audit schema records `outcome` and `error code` — i.e., **audit rows exist for FAILED commands**. Under "reject duplicate submissions with the original receipt," a failed first attempt permanently poisons its key: every retry gets the failure receipt forever (retry lockout), or — if the executor treats receipt *presence* as success — the UI asserts a save that never happened. Either branch violates Constraint 4 ("UI cannot say an action is saved before an authoritative write") and Constraint 3 (receipts are truth only if they carry outcome, not existence).

**(c) Retention coupling.** Audit logs are the classic retention-purge target. If the dedup key lives only there, purging audit rows silently deletes the idempotency guarantee and replays begin re-executing.

**Replacement (engineering order):**
1. New status-bearing intent table (e.g., `AiCommandIntent`): `commandIdemKey` UUID UNIQUE (client-generated), `status ∈ {pending, executing, succeeded, failed, denied}`, `resolvedTargetUserId`, `outcomeRef`, timestamps. Created atomically *before* dispatch via insert-if-absent in the executor.
2. Retry semantics keyed on **status, not existence**: `succeeded` → return original receipt, zero new rows, no re-execution; `failed`/`denied` → return the failure/denial receipt, permit retry under a new key; `pending`/`executing` → 409 retry-after.
3. `AiCommandAuditLog` keeps `commandIdemKey` as an indexed **reference** column, not the UNIQUE dedup authority.
4. `denied` must be a first-class status so the packet's own probe requirement ("a denied operation cannot mint a success receipt") is structurally enforced — note `commandExecutor.mjs:309-343` resolves target *after* acceptance, so denial occurs post-key-creation and must be recorded, not burned.

This keeps consensus acceptance criterion (1) and makes it actually testable.

## 2. F2 adopted — but the test as written is unpassable without one probe

`AITerminalPanel.tsx:124-133`: branch 1 passes 7 positional args (incl. hardcoded `'both'` + `requestContext`); branch 2 passes 4. The packet **does not contain** `sendMessageWithConversation`'s signature or arg-5 default (packet cites `useAIChat.ts:217,425,448` only for conversation create/post). So "a test proves both branches send identical context/mode" cannot be authored yet. Fix stays (`buildChatParams` helper, always explicit mode/options); the test must (i) pin the actual default from `useAIChat.ts` first, and (ii) assert equality on shared dimensions with `requestContext` declared as the **sole permitted delta** — otherwise the assertion is trivially fakeable.

## 3. F3, F4 — adopted verbatim

- F3: `APP-AI-HIVE-MIND.md L7-22` Gemini/Qwen consensus vs the five mounted lanes (`routes.mjs:630-634`) and intake/proposals at `:378-379`. Mark DORMANT, link to blueprint, remove from active index. Testable as written.
- F4: `routes.mjs:630-634` is the single authoritative mount citation; the `:625-634` label is stale. Adopt.

## 4. The 8 acceptance criteria, line by line (seat remit)

| # | Criterion | Packet evidence | Ruling |
|---|---|---|---|
| 1 | Least privilege | Gates present: `aiChatRoutes.mjs:283,466,610-625`; `aiCommandRoutes.mjs:110`; `coachIntakeRoutes.mjs:23-25`; `coachProposalRoutes.mjs:15-16`. `clientResolver.mjs:110-166` scopes trainers, **not admins beyond role** | No violation found in packet; admin entitlement matrix remains a required live probe |
| 2 | Wrong-client mutation: explicit, server-validated, **observable, recoverable** | `selectedClientId` path is server-resolved (`aiCommandRoutes.mjs:111-145` → `commandExecutor.mjs:309-343`) | Observable = F1/F5 receipt contract. **Recoverable (undo) has no owner anywhere in the packet** — must be a named blueprint action class, not a residual risk |
| 3 | Memory ≠ truth | `aiWorkoutEvents.ts:121-128` returns a browser-dispatch boolean only | Consensus residual risk acknowledges; keep as binding design obligation |
| 4 | No false "saved" | Audit rows carry `outcome`/`error code` (`AiCommandAuditLog.mjs:24-91`) | **Directly violated by consensus F1 as written** (presence-as-success) — see F5 |
| 5 | Server-enforced roles | `CoachCommandCenterPage.tsx:34-43` role normalization is UI-only adaptation; gates at route layer | No violation; page-level role logic is legitimate shell adaptation |
| 6 | Offline/degraded | No queue/local-first evidence anywhere in packet | The client-generated idem key **is** the offline replay primitive — add acceptance criterion (1b): offline-queued duplicate replayed post-reconnect → exactly one execution, one row |
| 7 | React/TS, tokens, 44px, WCAG | No contrary UI evidence in packet | Unverifiable until wireframes (deliverable 5); defer |
| 8 | Ox Alpha canary | Packet construction | Satisfied |

## 5. Items the consensus leaves open that must not silently ride as "residual risks"

- **Undo/recoverability (C2)** — no packet path provides it; needs an owner and a slice.
- **`/api/hermes` + `/api/ai/debate` classification** — packet marks "classification pending"; `aiDebateRoutes.mjs:57-76` direct `clientId` path still needs the cross-client denial probe. Question 9 cannot be answered while these float.
- **Retention vs dedup** — retention purge must never delete intent rows inside the replay window.

---

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no unique idempotency key; command replay can double-execute and mint duplicate audit rows (carried, adopted) | F2=MINOR: frontend/src/components/AITerminalPanel.tsx L124-133: 4-vs-7 positional-arg drift; arg-5 default unverified in packet (adopted + probe) | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: stale model vs mounted 5-lane runtime routes.mjs L630-634 (adopted) | F4=NOTE: backend/core/routes.mjs L630-634: authoritative mount range; L625-634 label stale (adopted) | F5=MAJOR: commandExecutor.mjs L309-343 + AiCommandAuditLog.mjs L24-91: consensus F1 mechanism (audit-log UNIQUE col) lacks execution/audit atomicity and outcome branching; failed-attempt key-burn or presence-as-success receipt violates Constraints 3/4
rebuttals: F1-MECH=REJECT: audit log is not a dedup store — packet shows executor and audit as separate units with no transaction evidence; audit rows exist for failed outcomes so "reject duplicate with original receipt" either locks retry forever or fakes success; retention purge of audit rows silently deletes idempotency | F2=AGREE | F3=AGREE | F4=AGREE
open: Q1=other seats: adopt status-bearing AiCommandIntent table (pending/executing/succeeded/failed/denied) as F1 replacement, or counter with an atomic single-table design | Q2=classify /api/hermes and /api/ai/debate (canonical/legacy/dormant/competing) with the trainer cross-client start-denial probe on aiDebateRoutes.mjs L57-76 | Q3=which slice owns undo/recoverability required by Constraint 2
consensus_block: AMENDED RULING (F1 mechanism replaced; all else adopted).
F1 (goal adopted, mechanism replaced): create `AiCommandIntent` with client-generated `commandIdemKey` UUID UNIQUE + `status ∈ {pending, executing, succeeded, failed, denied}` + `resolvedTargetUserId` + `outcomeRef`; insert-if-absent atomically in commandExecutor.mjs before dispatch (target resolution at L309-343 happens post-insert; denials recorded as `denied` status, not key burns); AiCommandAuditLog.mjs L24-91 gains `commandIdemKey` as indexed reference only. Retry semantics by status: succeeded → return original receipt, no new row, no re-execution; failed/denied → return failure/denial receipt, allow new-key retry; pending/executing → 409 retry-after.
F2: AITerminalPanel.tsx L124-133 refactored to `buildChatParams(text, context, clientId, requestContext)` always passing explicit mode/options; test must first pin useAIChat.ts sendMessageWithConversation defaults, then assert shared-dimension equality with requestContext as the sole declared delta.
F3: APP-AI-HIVE-MIND.md marked DORMANT, linked to blueprint, removed from active architecture index.
F4: single authoritative citation routes.mjs L630-634 (intake/proposals at L378-379).
Acceptance criteria: (1) duplicate POST with same key after success → original receipt, zero new rows/ executions; (1b) offline-queued duplicate replayed after reconnect → exactly one execution and one row; (1c) failed first attempt + same-key retry → failure receipt, no false success, new-key retry permitted; (2) pinned-signature param-equality test across both AITerminalPanel branches; (3) doc removed from active index.
Accepted as intentional: page-level role normalization in CoachCommandCenterPage.tsx L34-43 as UI adaptation with server gates at route layer.
Residual risks: undo/recoverability owner undefined (Constraint 2); useAIChat.ts signature probe outstanding; /api/hermes + /api/ai/debate classification pending; admin cross-client entitlement matrix unproven (clientResolver.mjs L110-166); retention policy must never purge intent rows inside the replay window; offline queue design itself still owed in blueprint (Question 6).
=== END-VERDICT ===
