# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-9\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7032 in / 8518 out · **Cost:** ~$0.0650 · **Wall:** 155.4s · **finish:** stop

---

The candidate is not adoptable as written. It silently drops a constraint-3/4 receipt hole, specifies an idempotency “fix” that is not a correct state machine, and leaves four client-identity names unjoined. Those are correctness defects, not residual polish.

**F1 REJECT (fix as specified is unsafe).** `AiCommandAuditLog.mjs L24-91` has actor, role, resolved target, operation id, outcome, param hash — and no `action_id` / idempotency key. That defect is real. The proposed cure is not.

- Audit-after-execute cannot be the idempotency store. Two in-flight POSTs with the same client key both execute, then one unique-violates. The loser then SELECTs a row that may still be uncommitted or absent. Constraint 4 is already broken: work happened twice.
- Postgres UNIQUE on a nullable `commandIdemKey` admits any number of NULLs. Existing rows and any insert that omits the key bypass the contract. Acceptance criterion (1) is then optional, not enforced.
- Global UNIQUE on a client-generated UUID is a wrong-client machine. Trainer runs command for client A with key K; UI reuses K after a client switch to B; server returns A’s original receipt into B’s shell. Constraint 2.
- Returning the “original receipt” with no state field lets a *pending* row be presented as saved. Same constraint-4 violation the workout bridge already has.

Required protocol, not a column: reserve-before-execute `CommandReceipt` with states `pending → executing → succeeded|failed|cancelled`, `commandIdemKey UUID NOT NULL`, UNIQUE `(actorId, targetClientId, commandIdemKey)`, command fingerprint `(operationId, targetClientId, paramHash)` stored on the row. `INSERT … ON CONFLICT` returns the existing row. Fingerprint mismatch → 409. Terminal success is only `succeeded` after the domain write verifies. Duplicate POST returns that row and inserts no second row.

**F7 MAJOR — candidate dropped this.** `aiWorkoutEvents.ts L121-128` returns only whether a named browser dispatcher ran. Packet text is explicit: this is not a durable write; the UI must not infer a committed workout from the boolean. Constraints 3, 4, and 6 (gym-floor offline) all sit on this function. Burying it under “panel must define lifecycle later” leaves the only offline-shaped path as a success-shaped ack with no server receipt and no idempotency key. That is a must-fix before any logger-bridge slice, not a residual.

**F8 MAJOR — identity key split.** Authoritative fields in the packet are four different names for one scope:

- `AiConversation.mjs L24-83` `targetUserId`
- `aiCommandRoutes.mjs L111-145` `selectedClientId`
- `aiDebateRoutes.mjs L57-76` `clientId`
- `AITerminalPanel.tsx L116-139` `clientId` (and `clientId || null`)

F5 and F6 patch two call sites and leave debate/hermes plus the UI adapter on other names. There is no single FK target, no join key, no proven equality. A chat created for `targetUserId=A` can legally dispatch `/api/ai-command` with `selectedClientId=B` and `/api/ai/debate` with `clientId=C`. That is the wrong-client mutation path. Fix: one canonical `targetClientId` (FK to the user/client row) on conversation, command, debate, hermes, audit/receipt, and the terminal helper; reject any write whose resolved id ≠ that key.

**F5/F6 AGREE on the hole, not on “reject every admin command without a client.”** `clientResolver.mjs L110-166` scopes trainers and stops at role for admins. `commandExecutor.mjs L309-343` resolves caller-supplied ids. `aiChatRoutes.mjs L308-344` accepts `targetUserId` for admin/trainer. Those are MAJOR. A blanket “no target → 4xx” will also 4xx legitimate non-client admin capabilities unless a registry marks which operations require a target. Write-time re-check is mandatory: resolve-then-mutate without a second `ensureClientAccess` at the domain write is TOCTOU if assignment changes between resolve and apply.

**F2 AGREE.** `AITerminalPanel.tsx L116-139`: the `requestContext` branch passes `'both', null, requestContext`; the other branch stops at `clientId || null`. Positional drift is a conversation-identity fork. `buildChatParams` plus an explicit `useAIChat.ts` signature is the fix. Acceptance (2) stands.

**F3 AGREE / F4 AGREE.** `APP-AI-HIVE-MIND.md L7-22` is not the mounted runtime (`routes.mjs L630-634`: stream-spike → chat → command → hermes → debate; intake/proposals at L378-379). Mark DORMANT. Use L630-634 as the mount range.

**F9 MAJOR — also dropped.** Surface table: `SwanCoachAssistantPage` is unmounted but still referenced by its own tests. Candidate neither classifies nor sequences tests. Deleting or ignoring it without a test-plan slice breaks the build contract. Slice 0: move or retire those tests before any deletion.

No SQL-concatenation surface is visible in the packet; I am not inventing injection. Missing FKs from audit/conversation target ids to the user row are unproven in the excerpts and stay an open probe, not a finding.

Corrected must-fix order: F7 receipt contract on the workout bridge → F8 single `targetClientId` FK → F1 reserve-before-execute receipt table (not a unique column on the audit log) → F5/F6 scope gates with capability registry + write-time re-check → F2 helper → F9 test slice → F3/F4 doc/mount hygiene.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no idempotency key and no pending-to-terminal receipt state; retry can double-execute | F2=MINOR: frontend/src/components/DashBoard/AITerminalPanel.tsx L116-139: positional sendMessageWithConversation branches disagree on mode/options | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: hive-mind consensus is not the mounted runtime | F4=NOTE: backend/core/routes.mjs L630-634: this range is the authoritative mount order | F5=MAJOR: backend/services/clientResolver.mjs L110-166 + commandExecutor.mjs L309-343: admins not client-scoped; caller-supplied ids resolve without write-time re-check | F6=MAJOR: backend/routes/aiChatRoutes.mjs L308-344: conversation create accepts targetUserId without admin scope proof | F7=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: boolean dispatcher ack is not a server receipt; UI can assert saved; violates constraints 3/4 | F8=MAJOR: AiConversation.mjs L24-83 targetUserId vs aiCommandRoutes.mjs L111-145 selectedClientId vs aiDebateRoutes.mjs L57-76 clientId vs AITerminalPanel.tsx L116-139 clientId: four client-scope names; no single FK/join; cross-lane wrong-client write | F9=MAJOR: SwanCoachAssistantPage (surface table): still referenced by own tests; deletion without test-plan slice breaks build
rebuttals: F1=REJECT: UNIQUE commandIdemKey on AiCommandAuditLog is not a receipt protocol — insert-after-execute double-runs under concurrent retry; UNIQUE allows multiple NULLs so the key is optional; global UNIQUE on a client UUID returns the original receipt across client switches (wrong-client); a pending row returned as success violates constraint 4. Replace with reserve-before-execute CommandReceipt (pending|executing|succeeded|failed|cancelled), commandIdemKey UUID NOT NULL, UNIQUE (actorId, targetClientId, commandIdemKey), fingerprint mismatch 409, ON CONFLICT return that row's actual state | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE
open: Q1=is AiCommandAuditLog the idempotency store or is a separate CommandReceipt table required | Q2=canonical targetClientId FK name and join across chat/command/debate/hermes/UI | Q3=which admin capabilities are allowed without a target client | Q4=SwanCoachAssistantPage retire vs shim and which tests move first | Q5=which UI callers treat dispatchAIWorkoutEvent(true) as saved
=== END-VERDICT ===
