# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-6\REVIEW-DOC.md
**Tokens:** 6011 in / 11679 out (reasoning: 9048) | total 17690
**Wall:** 146.5s

---

## GLM 5.3 — Round 6 — Full-spectrum hostile pass: correctness, security, schema truth, 8 constraints line-by-line

### Position on the consensus candidate

Adopt F2, F3, F4 as written. **Reject the F1 fix mechanism as specified and substitute an amended one.** The F1 *finding* stands — it is the packet's own admission ("Receipt and idempotency boundary": `AiCommandAuditLog.mjs:24-91` "has no `action_id` or unique idempotency key"; the retry/idempotency contract "remain[s] unproven and must be designed by the panel before implementation"). But the consensus fix — "enforce insertion idempotency in the command executor" via a UNIQUE column on the audit log — fails its own acceptance criterion (1) under exactly the concurrency constraint 6 mandates. Carrying this as a REJECT; status DISPUTE.

---

### F1 — Why the consensus fix mechanism is defective (schema truth + concurrency)

**Schema truth.** The packet's field list for `AiCommandAuditLog.mjs:24-91` is: actor, role, resolved target client, operation ID, **outcome, error code, parameter hash/redaction, duration**. Every one of those fields is written *after* execution completes — `duration` and `error code` can only exist post-hoc. There is no PENDING/in-flight status in the enumerated schema. Therefore the audit row does not exist during execution.

**The race the fix leaves open.** Enforcing "check audit table → execute → insert audit row" is check-then-act:

1. POST `/api/ai-command/execute` with client key K arrives (`useCoachCommand.ts:96`); executor queries `commandIdemKey = K` → no row → executes → side effect commits.
2. Offline queue replay / user double-tap delivers K again *before* step 1's insert lands → no row found → executes again → **double mutation** (wrong-client or duplicate workout write risk, constraint 2/6).
3. Second INSERT then violates UNIQUE; the client receives a 500-style error *after* its side effect committed — the precise "unverifiable success/failure" state constraint 4 and constraint 6 forbid.

Constraint 6 explicitly requires "queue/reconcile, idempotency, duplicate prevention" — offline gym-floor replay is the *primary* traffic pattern this key exists for. A fix that only guards the post-hoc insert loses the race that matters.

**Security defect in the fix as written.** A globally unique client-generated key, replayable by anyone who obtains it, lets one authenticated actor harvest another actor's receipt (which contains resolved target client + parameter hash). The key must be scoped by actor at lookup.

**Amended fix — WHAT / WHERE / HOW:**

- **WHAT:** Idempotency enforced at *intake*, atomically, with the audit row as backstop — not the sole guard.
- **WHERE:** `backend/models/AiCommandAuditLog.mjs:24-91` + the executor path behind `backend/routes/aiCommandRoutes.mjs:110-145`.
- **HOW:** (a) Add `commandIdemKey UUID` with `UNIQUE(actorId, commandIdemKey)` (allows NULL backfill on legacy rows); add `status` enum `PENDING | SUCCESS | FAILED | CANCELLED` to the model. (b) Executor's first action is a transactional INSERT of the row with status PENDING, keyed by the client-supplied idem key from the `/execute` payload (`useCoachCommand.ts:96,170,207` must plumb it; audit any existing retry/queue logic per the consensus's own residual risk). Duplicate POST hits the constraint atomically → executor returns the existing row's receipt: **HTTP 409, body `{duplicate: true, receipt}`**, zero new side effects. (c) Receipt lookup is always scoped `WHERE actorId = authenticated actor AND commandIdemKey = K`; mismatched actor → 403, never a receipt. (d) `confirm`/`cancel` (`useCoachCommand.ts:170,207`) validate status transitions — replaying a CANCELLED/FAILED key returns that terminal receipt; only PENDING can confirm. (e) Migration: backfill `commandIdemKey` from the existing operation ID where unique, else NULL.

**Acceptance criterion (1), sharpened:** two simultaneous POSTs with the same key produce exactly one execution; the loser receives the original receipt (409 + body) with zero side effects; replay under a different actor 403s. Add these as negative contract tests in the verification matrix.

---

### The 8 non-negotiable constraints, line by line

| # | Constraint | Packet evidence | Verdict |
|---|---|---|---|
| 1 | Least-privilege | `clientResolver.mjs:110-166` scopes trainers "but not admins beyond role" | OPEN-PROBE — admin entitlement per command family unproven; blueprint must schedule the cross-client matrix. Not a new finding; packet already mandates the live probe. |
| 2 | Wrong-client mutation catastrophic | Caller-supplied `selectedClientId` at `aiCommandRoutes.mjs:111-145`; resolved target recorded in audit log L24-91 | PARTIALLY COVERED — F1 amendment binds key to actor + resolved target; recoverability/undo remains a blueprint slice. |
| 3 | Memory ≠ truth; durable receipts are truth | Audit log L24-91 field set; packet's own "unproven" admission | COVERED by amended F1 — receipts now exist for PENDING/FAILED/CANCELLED, not just completed runs. |
| 4 | No "saved" before authoritative write | `aiWorkoutEvents.ts:121-128` returns only a browser dispatcher boolean | RESIDUAL (consensus already carries it) — the boolean must never gate a success UI state; blueprint action-lifecycle vocabulary must say so. |
| 5 | Server-side entitlement, not shell inference | `protect` present at `aiChatRoutes.mjs:283`, `aiCommandRoutes.mjs:110`, `coachProposalRoutes.mjs:15-16`; per-dispatcher re-check unproven | OPEN-PROBE — same matrix as #1; a denied operation must not mint a success receipt (now testable via F1's receipt contract). |
| 6 | Offline/degraded story | `/execute|confirm|cancel` retry surface `useCoachCommand.ts:96,170,207` | F1's intake-claim mechanism is the duplicate-prevention core; queue/reconcile lifecycle remains blueprint item (final package §4 diagram). The consensus's audit-insert-only version FAILS this line — basis of my REJECT. |
| 7 | React/TS, tokens, 44px, WCAG | No component-level evidence in packet either direction | NO FINDING — unverifiable from packet; must be carried into wireframes (final package §5). |
| 8 | Ox Alpha canary redaction | Process constraint only | NO FINDING — not code-reviewable. |

---

### Agreements

**F2 — AGREE.** `AITerminalPanel.tsx:116-139`: the `requestContext` branch sends 7 positionals (`text, context, label, clientId, 'both', null, requestContext`); the fallback sends 4. Identical user sends produce divergent server-visible envelopes. Fix as consensus specifies (`buildChatParams` helper, base object identical in both branches, `requestContext` strictly additive), plus the already-noted explicit options-object type on `useAIChat.ts`. Acceptance criterion (2) sharpened: *"both branches produce an identical base param object (context, clientId, mode); `requestContext` is the only permitted difference."*

**F3 — AGREE.** `APP-AI-HIVE-MIND.md:7-22` describes a Gemini/Qwen free-consensus routing that matches no mounted lane in `routes.mjs:630-634`. Mark DORMANT, link the governing blueprint, remove from the active architecture index — consistent with the packet's own surface-classification demand to "reconcile or explicitly retire."

**F4 — AGREE.** The packet cites the mount block twice: `routes.mjs:625-634` (early excerpt) vs `:630-634` (evidence-gate refresh, which "must govern the next panel run" and whose 5-line range matches the 5 mounts exactly). Adopt 630-634 as authoritative.

---

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no unique idempotency key on the command lane; retries/offline replays via useCoachCommand.ts L96/L170/L207 can double-execute mutations and mint two receipts, violating constraints 3/6 | F2=MAJOR: frontend/src/components/AITerminalPanel.tsx L116-139: positional call drift — requestContext branch passes 7 args (mode 'both', null, requestContext) vs 4-arg fallback, so identical sends create divergent conversation envelopes | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: stale free-consensus routing contradicts mounted lanes (routes.mjs L630-634) and must be retired from the active index | F4=NOTE: packet cites the mount block as both routes.mjs L625-634 and L630-634; adopt L630-634 per the governing evidence-gate refresh
rebuttals: F1=REJECT-FIX-MECHANISM: finding stands but consensus fix fails its own acceptance criterion (1) — audit fields (outcome/error/duration) prove the row is written post-execution, so concurrent duplicate POSTs both pass the no-row check, both execute, and only the second INSERT fails; amend to transactional intake-time INSERT (status PENDING, UNIQUE(actorId, commandIdemKey), 409 + original receipt on replay, actor-scoped lookup, confirm/cancel status-transition validation) | F2=AGREE | F3=AGREE | F4=AGREE
open: Q1=seats must choose: extend AiCommandAuditLog with PENDING status (one table, backfill migration) vs new AiCommandReceipt model — decide before round 9 blueprint | Q2=who owns the cross-client entitlement matrix probe (clientResolver.mjs L110-166 admin path, aiCommandRoutes.mjs L111-145 per-dispatcher re-check) in the PR-slice ordering
consensus_block: CONDITIONAL RULING (signs as CONSENSUS the moment F1's mechanism is amended): F1 — add `commandIdemKey UUID UNIQUE(actorId, commandIdemKey)` plus `status` enum PENDING/SUCCESS/FAILED/CANCELLED to AiCommandAuditLog.mjs L24-91; executor transactionally inserts PENDING row at intake before side effects; duplicate POST returns HTTP 409 with the original receipt and zero new side effects; lookup always actor-scoped (mismatch = 403); confirm/cancel validate status transitions; backfill key from operation ID where unique. F2 — buildChatParams helper at AITerminalPanel.tsx L124-133 producing an identical base object in both branches, requestContext strictly additive; explicit options-object typing on useAIChat.ts. F3 — mark APP-AI-HIVE-MIND.md DORMANT, link governing blueprint, drop from active architecture index. F4 — single authoritative citation routes.mjs L630-634. Acceptance: (1a) two simultaneous same-key POSTs → one execution, loser gets 409 + original receipt, no second row; (1b) different-actor replay → 403; (2) contract test proves identical base params across both panel branches; (3) doc removed from active index. Residual risks: entitlement matrix for admin command families unproven until the cross-client probe runs; aiWorkoutEvents.ts L121-128 boolean must never gate success UI; receipt retention policy undefined; retry/queue logic audit for key plumbing still owed.
=== END-VERDICT ===
