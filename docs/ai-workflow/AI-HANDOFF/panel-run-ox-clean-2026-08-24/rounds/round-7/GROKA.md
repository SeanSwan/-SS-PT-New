# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-7\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6318 in / 7047 out · **Cost:** ~$0.0547 · **Wall:** 127.3s · **finish:** stop

---

The candidate is not safe to adopt as written. The defects it names are real; the prescribed HOW for F1 and F5 fails Postgres and state-machine truth, and the execute/confirm/cancel lane still has no transition contract. That is a correctness break, not a residual risk.

**F1 defect stands; F1 fix is wrong.** `AiCommandAuditLog.mjs:24-91` has actor, role, resolved target, operation ID, outcome, error code, parameter hash, duration — and neither `action_id` nor an idempotency key. That matches the packet’s own gate: receipt + retry contract is unproven. A bare `commandIdemKey UUID UNIQUE` does not satisfy acceptance criterion (1) under concurrency or under Postgres semantics.

- Postgres `UNIQUE` allows multiple NULLs. If the column is nullable, keyless inserts never collide and idempotency is optional in the only path offline retries will miss.
- Two in-flight POSTs with the same key: one insert wins, the other raises `23505`. Without `ON CONFLICT` or catch-`23505`-then-`SELECT` of the committed row, the loser 500s and a second row is not the only failure mode — the client retries again. Acceptance (1) is false until that path is specified.
- `READ COMMITTED`: the loser can miss the winner’s row until commit. The handler must retry the read, not return empty.
- Same key, different payload: returning the original receipt is a wrong-action receipt. The existing parameter hash on L24-91 is the compare key; mismatch must be 409, not a silent replay.
- Same key, failed outcome: “return original receipt” freezes a failure and makes gym-floor retry impossible unless the client mints a new key. That policy must be explicit or offline reconcile (constraint 6) is contradictory.
- Global UNIQUE + `SELECT WHERE commandIdemKey = $1` is an IDOR: a leaked or colliding UUID returns another actor’s receipt. Unique and lookup must be `(actorId, commandIdemKey)` (or equivalent tenant/actor composite), not a naked UUID.
- An append-only audit table is not a command ledger. Using it as the idempotency store mixes “never update” with “return the live receipt.” Either add a command ledger with status, or the audit row cannot be the state machine.

**F6 (new MAJOR): no command state machine.** `useCoachCommand.ts:96,170,207` exposes `/api/ai-command/execute|confirm|cancel`. The audit model records an outcome, not a row identity or legal transitions. Missing states: `queued | pending_confirm | executed | cancelled | failed`. Unspecified races: confirm∥cancel, double confirm, confirm-after-cancel, execute-after-cancel, execute twice without a key. Constraint 4 forbids the UI from claiming saved without a verified write; a boolean from `aiWorkoutEvents.ts:121-128` is already declared non-durable. Without transition guards and a receipt id, confirm/cancel cannot be made idempotent and F1’s key has nothing to bind to.

**F5 defect stands; “any command” is the wrong fail-closed.** `clientResolver.mjs:110-166` scopes trainers, not admins. `aiCommandRoutes.mjs:111-145` accepts caller `selectedClientId`; `commandExecutor.mjs:309-343` only normalizes it. Constraint 2: wrong-client mutation is catastrophic. Rejecting every admin command that lacks a client also breaks non-client families (Hermes is an operator queue; debate takes a direct `clientId` at `aiDebateRoutes.mjs:57-76`). Required contract: each command family declares scope (`client_required | client_forbidden | system`). `client_required` → client exists, not deleted, entitlement holds, bind into the receipt; `client_forbidden` → reject a supplied client id; unknown family → 4xx + security log. Existence check is a real FK/lookup, not “ID present.”

**Adopted without change:** F2 (`AITerminalPanel.tsx:116-139` — second call drops `'both'` and the following positionals; helper object is the fix). F3 (`APP-AI-HIVE-MIND.md:7-22` is documentation drift, not a mounted brain). F4 (authoritative mounts are `routes.mjs:630-634`; intake/proposals stay `:378-379`).

No SQL-injection claim: the packet does not show query construction. Do not invent one.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/idempotency key; audit row cannot prove duplicate POST returns original receipt | F2=MINOR: AITerminalPanel.tsx L116-139: requestContext branch passes mode 'both' and extra positionals; other branch omits them — argument-position drift | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: Gemini/Qwen consensus is not the mounted chat/command/intake/proposal/hermes/debate runtime | F4=NOTE: backend/core/routes.mjs L630-634: authoritative mount order is stream-spike, ai-chat, ai-command, hermes, debate | F5=MAJOR: clientResolver.mjs L110-166 + commandExecutor.mjs L309-343 + aiCommandRoutes.mjs L111-145: admins pass selectedClientId with no existence/entitlement bind; wrong-client write path | F6=MAJOR: useCoachCommand.ts L96,170,207 + AiCommandAuditLog.mjs L24-91: execute/confirm/cancel have no status identity or transition guards; confirm∥cancel and replay are undefined | F7=MAJOR: proposed F1 UNIQUE UUID is Postgres-false: NULLs do not collide; 23505 loser does not re-read; global key lookup is IDOR; same-key different param hash must 409
rebuttals: F1=REJECT: HOW incomplete — require NOT NULL composite UNIQUE(actorId, commandIdemKey), ON CONFLICT/23505+reselect under READ COMMITTED, param-hash 409 on mismatch, explicit failed-receipt retry policy, ledger not audit-as-state | F2=AGREE | F3=AGREE | F4=AGREE | F5=REJECT: do not reject every unscoped command; capability registry client_required|client_forbidden|system, unknown fail-closed 4xx+security log, existence+entitlement before receipt | F6=AGREE | F7=AGREE
open: Q1=command ledger vs audit-as-ledger | Q2=failed-command same-key: freeze vs new key | Q3=which command families are client_required vs system (hermes, debate, intake, proposals) | Q4=confirm/cancel idempotency key = execute key or child keys
consensus_block: (disputed — not adopted)
=== END-VERDICT ===
