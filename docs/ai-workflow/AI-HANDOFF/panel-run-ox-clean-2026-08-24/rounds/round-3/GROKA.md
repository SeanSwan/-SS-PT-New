# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-3\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6622 in / 8756 out · **Cost:** ~$0.0656 · **Wall:** 163.8s · **finish:** stop

---

The candidate’s F1 “fix” is not a correctness repair. It is a new defect. I REJECT that mechanism and I will not adopt the candidate verbatim.

**REJECT F1 as specified — `AiCommandAuditLog.mjs` L24-91 is the wrong table and UNIQUE(client UUID) is the wrong state machine.**

Packet fact: L24-91 records actor, role, resolved target, operation ID, *outcome*, error code, parameter hash, duration. It has no `action_id` and no idempotency key. That gap is real. The prescribed cure is false:

1. **Category error.** An audit log is append-only history. `UNIQUE(commandIdemKey)` forbids a second row for the same key, so a failed attempt cannot be followed by a succeeded attempt without deleting or mutating the audit trail. Receipt identity and audit history are different relations. Putting both on L24-91 breaks one of them.
2. **Postgres UNIQUE truth.** A nullable UUID unique constraint admits duplicate `NULL` keys (`NULL IS DISTINCT FROM NULL` is false in a default UNIQUE). Backfill or any path that omits the key silently re-opens duplicates. The candidate does not specify `NOT NULL`, a partial unique index, or `ON CONFLICT`.
3. **In-flight race.** If the row is written *after* execute, two retries both miss and both execute. If the row is written first as a terminal outcome, there is no `pending` state and the second caller cannot distinguish “still running” from “done.” Acceptance criterion (1) — “duplicate submission returns original receipt” — is undefined for in-flight, failed, cancelled, and payload-mismatch duplicates.
4. **Failed-retry deadlock.** First insert outcome=error + UNIQUE key ⇒ every retry returns the failure forever. That is not idempotency; it is a stuck terminal state with no legal transition.
5. **Unbound client key.** A client UUID that is not locked to `(actor_user_id, operation_id, target_client_id, param_hash)` lets a reused key swallow a *different* command (silent drop / wrong receipt) and lets a new key double-apply the same command. The model already has a parameter hash at L24-91 and does not use it as a conflict predicate.
6. **No `ON CONFLICT` path in `aiCommandRoutes.mjs` L110-145.** Execute accepts `selectedClientId` and writes an audit outcome. There is no insert-pending / conflict-select / hash-compare / state-transition. A unique column without that handler is a constraint waiting to 500.

Correct fix, not a re-derivation:
- **WHAT:** New receipt row (do not unique-constrain the audit log). Fields: `idempotency_key UUID NOT NULL`, `actor_user_id`, `target_client_id`, `operation_id`, `param_hash`, `state TEXT CHECK (state IN ('pending','succeeded','failed','cancelled'))`. Unique `(actor_user_id, idempotency_key)`. Audit log stays insert-only, FK to receipt id.
- **WHERE:** New model beside `backend/models/AiCommandAuditLog.mjs` L24-91; enforce in `backend/routes/aiCommandRoutes.mjs` L110-145 (execute) and the confirm/cancel handlers behind `useCoachCommand.ts` L170 / L207.
- **HOW:** `INSERT … pending ON CONFLICT (actor_user_id, idempotency_key) DO NOTHING RETURNING *`. On conflict, `SELECT` and: pending → 202/409 same receipt; succeeded → original receipt **iff** `param_hash` matches else 409; failed/cancelled → do not replay; new attempt requires a new key. Never treat a client UUID as globally unique.

Until that state machine exists, criterion (1) is an incorrect contract and must not be accepted.

**AGREE F2 — `AITerminalPanel.tsx` L124-133 argument drift is real.**

Verified path: L116-123 passes `clientId, 'both', null, requestContext`; L129-133 omits mode and trailing args. That is arity drift on a shared chat entry point (`useAIChat.ts` L217/L425/L448).  
**WHAT:** One payload object. **WHERE:** L116-139. **HOW:** `{ text, context, title: \`${displayLabel} — ${context}\`, clientId: clientId || null, mode: 'both', attachment: null, requestContext: requestContext ?? null }` passed from both branches. Tests must assert identical `mode` on both arms (candidate AC-2 is fine).

**AGREE F3 — `docs/ai-workflow/references/APP-AI-HIVE-MIND.md` is not runtime.** Mounted truth is `routes.mjs` L630-634 (chat / command / hermes / debate) plus intake/proposals at L378-379. Mark DORMANT and stop treating L7-22 Gemini/Qwen consensus as architecture. Classification only; it does not close any state-machine hole.

**NEW/CARRIED MAJORS the candidate leaves open**

**F4 MAJOR — conversation create vs trainer ACL are different line ranges.**  
`aiChatRoutes.mjs` L308-344 accepts `targetUserId` for admin/trainer. Trainer target-client check is cited only at L610-625. `protect` is L283; subscription/rate-limit/PII is L466. The packet never shows CREATE under L610-625. Constraint 2 (wrong-client mutation) is unproven on the write that *creates* scoped memory.  
**WHAT:** Fail-closed `ensureClientAccess` (same helper as L610-625) inside L308-344 before insert. Client role: `targetUserId` must equal `req.user.id` or be rejected.  
**WHERE:** `backend/routes/aiChatRoutes.mjs` L308-344.  
**HOW:** No row is inserted until the ACL returns allow; denied must not mint an `AiConversation` (`AiConversation.mjs` L24-83).

**F5 MAJOR — execute/confirm/cancel has no legal transition table.**  
Frontend: `useCoachCommand.ts` L96 execute, L170 confirm, L207 cancel. Backend: L110-145 accepts `selectedClientId`; audit L24-91 stores an outcome with no `pending` and no unique action id. Concurrent confirm+cancel, confirm after cancel, double confirm, and execute retry are unspecified. Chat (`useAIChat.ts` L448) and command do not share an `action_id`, so conversation memory can assert a write the command lane never receipted (constraint 3).  
**WHAT:** Server-side state machine on the receipt row above.  
**WHERE:** `aiCommandRoutes.mjs` L110-145 + confirm/cancel.  
**HOW:** execute → `pending` (or auto-`succeeded` only for an explicit low-risk class); confirm: `pending→succeeded` only; cancel: `pending→cancelled` only; any other transition → 409, no domain write, no success receipt.

**F6 MAJOR — `aiWorkoutEvents.ts` L121-128 is still a boolean dispatcher.**  
`dispatchAIWorkoutEvent` returns whether a named browser function ran. Constraint 4 forbids “saved” before an authoritative write. The candidate buries this as residual risk. It is a must-fix contract, not a leftover. Logger/offline path (constraint 6) must enqueue an intent with the same actor-scoped idempotency key and flip UI to saved only on a `succeeded` receipt.

**F7 NOTE — route citation.** Governing mount is **`backend/core/routes.mjs` L630-634** (evidence-gate canonical; stream-spike at L630). The L625-634 label on the excerpt is the stale citation. Intake/proposals remain L378-379. Ownership order: stream-spike → ai-chat → ai-command.

**F8 MAJOR — `AiConversation.mjs` L24-83 embeds `messages` plus denormalized `messageCount`/`lastMessageAt`.**  
Concurrent `POST …/messages` (`useAIChat.ts` L448) against a JSON/array column is a lost-update race unless the update is a locked read-modify-write. Two devices / retry / double-click can drop a message or desync counts.  
**WHAT:** Child `AiMessage` table, `conversation_id` FK `ON DELETE CASCADE`, append-only INSERT, no in-row array.  
**WHERE:** replace `messages` at L24-83; write path at `aiChatRoutes.mjs` message handler used by L448.  
**HOW:** INSERT message; bump `lastMessageAt`/`messageCount` in the same transaction (`UPDATE … SET message_count = message_count + 1`). No unique-on-audit-log style shortcut.

I do not accept “these three fixes + residual risk” as the integrated ruling. F1’s prescribed unique key is unsafe to implement. F4–F6 and F8 remain blocking correctness holes.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: missing receipt/idempotency is real but candidate UNIQUE(client UUID) on the audit table is a wrong state machine (append-only vs receipt, NULL UNIQUE, in-flight race, failed-retry deadlock, unbound key, no ON CONFLICT in aiCommandRoutes.mjs L110-145) | F2=MINOR: frontend/src/components/AITerminalPanel.tsx L124-133: requestContext branch passes mode 'both' and extra args; other branch does not — fix with one payload object | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: not mounted runtime; mark DORMANT | F4=MAJOR: backend/routes/aiChatRoutes.mjs L308-344 vs L466 vs L610-625: CREATE accepts targetUserId; trainer ACL and PII/rate-limit are different line ranges — unproven wrong-client conversation insert | F5=MAJOR: frontend/src/hooks/useCoachCommand.ts L96,L170,L207 + backend/routes/aiCommandRoutes.mjs L110-145 + AiCommandAuditLog.mjs L24-91: no pending/succeeded/failed/cancelled transitions; confirm/cancel/execute races; no action_id shared with chat | F6=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: boolean dispatch is not a server receipt; cannot satisfy constraint 4/6 | F7=NOTE: backend/core/routes.mjs L630-634 governs (stream-spike at L630); L625-634 is the stale citation | F8=MAJOR: backend/models/AiConversation.mjs L24-83: embedded messages + denormalized counts are a lost-update race on useAIChat.ts L448
rebuttals: F1=REJECT: do not add commandIdemKey UUID UNIQUE to AiCommandAuditLog; that table must stay append-only; receipt needs NOT NULL actor-scoped key, param_hash bind, pending state, ON CONFLICT, and failed/cancelled must not replay | F2=AGREE | F3=AGREE
open: Q1=confirm whether CREATE at aiChatRoutes.mjs L308-344 is wired under the L610-625 ACL or only under L283 protect | Q2=is AiCommandAuditLog intended as audit-only (yes ⇒ never UNIQUE an idempotency key on it) | Q3=per-family execute two-phase vs auto-succeed, and offline queue key = same actor-scoped idempotency key?
consensus_block: (not adopted) Required ruling if other seats convert: (1) REJECT unique-on-audit-log; add a separate receipt row with idempotency_key UUID NOT NULL, UNIQUE(actor_user_id, idempotency_key), state CHECK pending|succeeded|failed|cancelled, param_hash bind, INSERT pending ON CONFLICT DO NOTHING then hash/state compare in aiCommandRoutes.mjs L110-145 and confirm/cancel; audit log stays insert-only FK to receipt. (2) AITerminalPanel.tsx L116-139 single payload with mode 'both'. (3) APP-AI-HIVE-MIND.md DORMANT. (4) Fail-closed ensureClientAccess inside aiChatRoutes.mjs L308-344. (5) Legal transitions only on receipt; illegal → 409 no write. (6) UI saved iff succeeded receipt; aiWorkoutEvents.ts L121-128 must not flip saved. (7) Governing mounts routes.mjs L630-634. (8) Split AiConversation.messages into append-only child rows. Residual: live ACL matrix, per-command-family entitlement, offline reconcile, retention/kill-switch still unproven.
=== END-VERDICT ===
