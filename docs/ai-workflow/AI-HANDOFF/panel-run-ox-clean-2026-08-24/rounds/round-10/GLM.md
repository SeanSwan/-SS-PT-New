# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-10\REVIEW-DOC.md
**Tokens:** 6707 in / 8027 out (reasoning: 5541) | total 14734
**Wall:** 97.0s

---

# GLM 5.3 — Round 10: Full-spectrum attack on the consensus candidate

My remit: correctness, security, schema truth, and the 8 non-negotiable constraints line by line. I attack the candidate draft on exactly those axes. The candidate is 80% sound. It has **two silent drops** of running-state items, **two correctness defects in its own fix text**, and **two missing acceptance criteria**. I adopt the rest.

---

## 1. Line-by-line audit of the candidate against the 8 constraints

**Constraint 1 (least privilege).** Partially served by F5 (`clientResolver.mjs L110-166` — packet states it "scopes trainers but not admins beyond role") and F6 (`aiChatRoutes.mjs L308-344` — creation "accepts `targetUserId` for admin/trainer"). The candidate honestly holds debate/hermes scoping as residual. ACCEPT with residual.

**Constraint 2 (wrong-client mutation: explicit, server-validated, observable, recoverable).** F5/F6 give validation; observability exists because `AiCommandAuditLog.mjs L24-91` already records actor, resolved target client, outcome, error code — criterion (4)'s "logs a security event" is implementable as a denied-outcome audit row. **Recoverability is nowhere in the candidate** — no undo/cancel/receipt-lifecycle criterion. Folded into restored F7 below.

**Constraints 3 + 4 (memory is not truth; no "saved" before authoritative write).** **FAILED by omission.** The running state's first item — `aiWorkoutEvents.ts L121-128`: `dispatchAIWorkoutEvent` returns a bare boolean from a named browser dispatcher — was dropped from the candidate's findings. The packet's own "Receipt and idempotency boundary" section states this contract is "unproven and must be designed by the panel before implementation," and the excerpt comment says the panel "must not infer a committed workout write from this event acknowledgement." The candidate's residual-risk line ("panel must define full action/receipt lifecycle") is **not a fix with an acceptance criterion** — it is a deferral wearing a finding's clothes. This is precisely the round-10 attack category "unverifiable success claims / silent mutation." REJECT the omission; restore as F7.

**Constraint 5 (server-enforced roles).** F5/F6 partial; read/update chat ops and debate/hermes stay residual. ACCEPT with residual.

**Constraint 6 (offline story; cloud round-trip not sole path).** The candidate has **no acceptance criterion** covering offline duplicate prevention or honest queued states. Offline retry is where F1's idem key and F7's queue states must interlock; without criterion (6) the builder can ship an idem key that only works online. Gap closed below.

**Constraints 7/8.** No packet evidence of standards or canary violations in the cited code; blueprint-scope only. No findings (absence of evidence in packet, not hedging).

---

## 2. Two silent drops — REJECTED

**F7 (restored, MAJOR): `frontend/src/utils/aiWorkoutEvents.ts L121-128`.** The success-shaped boolean lets any UI branch assert "saved" off a browser ack. Fix: (a) change the return to a branded `DispatchAck` type that no UI state machine may map to `saved/confirmed` — enforce with a unit test asserting zero components transition to saved on `DispatchAck`; (b) UI may render "saved" only from a server receipt keyed by F1's idem key, or "queued offline" only after durable local enqueue carrying that same key; (c) the receipt lifecycle must define undo/cancel/reconcile (closing the Constraint-2 recoverability hole).

**F8 (restored, MINOR): SwanCoachAssistantPage.** Packet surface table classifies it "legacy but still referenced… by its own tests" and forbids deletion during the evidence pass; the running state carries it. The candidate's blueprint presumably directs retirement — if the builder deletes without a test slice, the build breaks. Fix: one PR-sized migration slice that removes-or-classifies the page AND its test references together; acceptance criterion (7) below.

---

## 3. Two defects inside the candidate's own fix text

**F9 (NOTE, amends F1): retry freeze.** `AiCommandAuditLog.mjs L24-91` records **outcome and error code** — failure rows exist. F1 as written ("reject duplicates with the original receipt") means a client retrying a failed command under the same key gets the stale failure receipt forever (or a UNIQUE violation on re-insert). Retry becomes impossible — an offline/retry-duplicate fix that breaks retry. Amend: dedupe returns the original receipt only for **terminal-success or in-flight** keys; **terminal-failure** keys are re-claimable via compare-and-swap on the row (outcome `failed→pending`) or a superseding-attempt column; exactly one terminal-success receipt per key. Schema: `commandIdemKey` UUID **UNIQUE NULLable** (legacy rows lack it), transactional insert-or-select at the executor.

**F10 (NOTE, amends F5): self-scoped commands.** `commandExecutor.mjs L309-343` "resolves selected IDs" — selected-client is per-command optional. F5's absolute "reject any command without a validated target client" breaks every legitimately self-scoped command family. Amend: each command family declares `self-scoped` (target forbidden — reject if supplied) or `client-scoped` (validated target required — reject if absent). Criterion (4) applies to the mismatched combinations.

---

## 4. Adopted verbatim

F1 (as amended), F2 (`AITerminalPanel.tsx L124-133` — the excerpt shows two positional call shapes, 7-arg vs 4-arg; helper object kills the drift), F3 (`APP-AI-HIVE-MIND.md L7-22` DORMANT + delinked), F4 (authoritative `routes.mjs L630-634` per the refresh table), F5 (as amended), F6.

**Acceptance criteria: adopt (1)–(5), split (1) into 1a/1b per F9, add (6)** dispatcher boolean can never yield a saved/confirmed UI state; saved requires server receipt, queued-offline requires durable enqueue with idem key — **and (7)** SwanCoachAssistantPage retirement slice lands with its test references in the same PR, CI green, route grep shows no live mount.

**Residual risks carried unchanged from the candidate**, plus: F9's CAS claim path needs a concurrency test (two simultaneous retries on one failed key → exactly one execution).

=== VERDICT ===
status: CONSENSUS
confidence: 91
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no unique idempotency key; adopted AMENDED per F9 | F2=MINOR: frontend/src/components/DashBoard/AITerminalPanel.tsx L124-133: two positional call shapes drift; helper-object refactor adopted | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: doc contradicts mounted runtime; DORMANT+delink adopted | F4=NOTE: backend/core/routes.mjs L630-634: authoritative mount range adopted over L625 | F5=MAJOR: backend/services/clientResolver.mjs L110-166 + commandExecutor.mjs L309-343: admins unscoped beyond role; adopted AMENDED per F10 | F6=MAJOR: backend/routes/aiChatRoutes.mjs L308-344: admin targetUserId accepted unvalidated at creation; adopted | F7=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: dispatcher boolean is success-shaped; candidate dropped silently; RESTORED | F8=MINOR: SwanCoachAssistantPage legacy-but-test-referenced; candidate dropped retirement slice; RESTORED | F9=NOTE: F1-as-written freezes failed retries; model records outcome+errorCode so duplicate-replay returns stale failure receipt | F10=NOTE: F5-as-written rejects legitimately self-scoped command families with no target client
rebuttals: F7-omission=REJECT: residual-risk line is not a fix+acceptance criterion; packet receipt/idempotency section says contract must be designed; constraints 3/4/6 | F8-omission=REJECT: running state and packet surface table both carry it; deletion without test slice breaks build | F1=AMEND: original-receipt dedupe only on terminal-success/in-flight; failed keys re-claimable via CAS; column UNIQUE NULLable | F5=AMEND: per-family self-scoped vs client-scoped declaration; reject mismatched target combinations
open: Q1=builder probes commandExecutor dispatch table for legitimately self-scoped families before F5 amendment lands | Q2=debate/hermes lanes and chat read/update scoping remain residual per candidate
consensus_block: ADOPT candidate F1-F6 with amendments, RESTORE F7/F8. F1: add commandIdemKey UUID UNIQUE NULLable to AiCommandAuditLog (L24-91); executor dedupes by transactional insert-or-select; original receipt returned ONLY on terminal-success/in-flight; terminal-failure keys re-claimed via CAS failed-to-pending; exactly one terminal-success receipt per key. F2: buildChatParams helper object in AITerminalPanel.tsx L124-133; both branches identical context/mode. F3: APP-AI-HIVE-MIND.md marked DORMANT, removed from active architecture index, linked to blueprint. F4: authoritative mount range routes.mjs L630-634. F5: clientResolver.mjs L110-166 + commandExecutor.mjs L309-343 enforce per-family target policy — client-scoped requires validated target, self-scoped forbids one; mismatch returns 4xx + denied-outcome audit row (schema already supports via outcome/errorCode fields). F6: aiChatRoutes.mjs L308-344 validates targetUserId against admin scope; out-of-scope returns 4xx. F7: dispatchAIWorkoutEvent returns branded DispatchAck; no UI path maps it to saved/confirmed; saved requires server receipt (F1 key) or durable offline enqueue carrying same idem key; lifecycle defines undo/cancel/reconcile. F8: SwanCoachAssistantPage retirement/classification lands as one PR slice including its test references. ACCEPTANCE: (1a) duplicate terminal-success POST returns original receipt, no new row; (1b) retry after terminal-failure re-executes under same key, one final receipt; (2) test proves both AITerminalPanel branches send identical context/mode; (3) hive-mind doc out of active index; (4) mismatched-scope command returns 4xx + security audit event; (5) out-of-scope targetUserId conversation creation returns 4xx; (6) dispatcher boolean can never produce saved/confirmed UI state, verified by unit test on state machines; (7) SwanCoachAssistantPage slice green in CI, no live mount. RESIDUAL: chat read/update ops need same scope enforcement; debate/hermes lanes unprobed; retry/queue logic audit for idem key; useAIChat.ts explicit signature typing; offline reconcile + concurrency test on CAS claim; full action/receipt lifecycle and mobile/UX states remain blueprint scope.
=== END-VERDICT ===
