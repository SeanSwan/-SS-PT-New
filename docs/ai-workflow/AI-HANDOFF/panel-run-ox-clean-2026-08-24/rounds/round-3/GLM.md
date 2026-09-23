# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-3\REVIEW-DOC.md
**Tokens:** 6289 in / 14208 out (reasoning: 10829) | total 20497
**Wall:** 167.3s

---

# GLM 5.3 — Round 3: Full-Spectrum Hostile Review

Stance held: correctness, security, schema truth, and the 8 non-negotiable constraints line by line.

## 0. Position on the running consensus

I adopt the candidate's three *defects* as real and evidenced. I **REJECT two of its three fixes as specified** and one acceptance criterion as written. I carry one new MAJOR the candidate wrongly demoted to "residual risk." Per rule 3, that makes this a DISPUTE round.

---

## 1. F1 — REJECT the fix mechanism: the audit log is the wrong enforcement point for idempotency

**Evidence:** `backend/models/AiCommandAuditLog.mjs L24-91`, per the packet's receipt-boundary section, "records actor, role, resolved target client, operation ID, **outcome, error code**, parameter hash/redaction, and duration." It is an append-only record **including failures**. The consensus fix ("adding commandIdemKey UUID UNIQUE to AiCommandAuditLog model and enforce insertion idempotency") breaks three ways:

1. **Audit completeness destroyed.** A UNIQUE(key) on a log that must record failed attempts means a legitimate retry with the same key either cannot insert its audit row, or is short-circuited by key-match. Either way you lose the retry's audit trail on a safety-critical lane.
2. **Poisoned-key replay.** If key-match returns "the original receipt," a transient first-attempt failure permanently returns a FAILED receipt for that key. The candidate's own acceptance criterion (1) — "duplicate command submission returns original receipt" — **passes in this broken state**. The criterion as written certifies the bug.
3. **No execute-once.** Audit-insert uniqueness constrains audit rows, not the mutation. Two concurrent duplicates through `/api/ai-command/execute` (mount: `backend/core/routes.mjs L630-634`; resolution: `commandExecutor.mjs L309-343`) can both execute the domain write before either audit insert lands. Check-then-act on a log table is not idempotency — it's audit-once with double mutation.

**Fix (engineer-applied):**
- **WHAT:** Transactional intent table; audit log stays append-only.
- **WHERE:** New `AiCommandIntent` model + the execute lane at `backend/routes/aiCommandRoutes.mjs L110-145`.
- **HOW:** `AiCommandIntent { idemKey UUID, actorUserId, commandRoute, paramHash, resolvedTargetUserId, status: pending|committed|failed, receiptPayload, createdAt }` with `UNIQUE(actorUserId, idemKey)` (never a bare global UNIQUE — a client-generated key must be namespaced per actor and treated as idempotency token only, never authorization). Execute handler: single transaction → insert intent with `ON CONFLICT DO NOTHING`; on conflict, load existing: `committed` + paramHash + resolvedTarget match → return stored receipt 200; mismatch → 409; `pending` → 202 same pending receipt; `failed` → 409 with failure body, client may re-issue under a new key. Mutation and `intent→committed` transition commit atomically. `AiCommandAuditLog.mjs L24-91` keeps all current fields, gains `intentId` FK, **no** UNIQUE on key.

**Criterion (1) rewritten line by line:** duplicate of COMMITTED → original receipt, no re-execution; duplicate of PENDING → same pending receipt, no double execution; duplicate of FAILED → failure receipt + new-key re-issue allowed; concurrent duplicates execute exactly once (concurrency test required).

---

## 2. F2 — AGREE the defect and fix shape; AMEND criterion (2), which proves the wrong thing

**Evidence:** `frontend/src/components/AITerminalPanel.tsx L116-139` — the `requestContext` branch passes 7 positional args (`..., clientId || null, 'both', null, requestContext`); the default branch passes 4. The `'both'` visibility/mode literal exists in one branch only; the other inherits whatever default `sendMessageWithConversation` (`frontend/src/hooks/useAIChat.ts L448`) applies — unstated in the packet.

The options-object refactor is correct. But **"tests prove both branches send identical context mode" proves consistency, not correctness** — both branches could be identically wrong. Amend: the integration test must assert the **literal expected mode value** against the server-persisted payload (`useAIChat.ts L448` → `/api/ai-chat/conversations/${convId}/messages` → `AiConversation.mjs L24-83` `context`/`messages` fields), for both branches, plus presence/absence of `requestContext` per branch. Also fold the duplicated label construction (`${displayLabel} — ${context}` appears in both branches) into the helper object so the signature at `useAIChat.ts L448` migrates to a single options parameter — that is the actual anti-drift fix; a helper at the call site alone leaves the 7-positional-arg signature armed for the next caller.

---

## 3. F3 — REJECT "mark DORMANT": the packet forbids asserting what was not probed

**Evidence:** `docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22` describes the Gemini→Qwen→Gemini Pro consensus. The packet's own surface table classifies it "**active reference doc with runtime drift**" and question 9 requires seats to "state missing evidence plainly." No packet line evidences whether any runtime consumer implements that routing chain. Marking it DORMANT by fiat is manufactured certainty — the exact failure mode the evidence gate was written to prevent.

**Fix:** Header banner `SUPERSEDED-PENDING-PROBE → <blueprint>`; repo-wide probe for consumers of the hive-mind routing chain; retirement to DORMANT/RETIRED only on a zero-consumer result. **Criterion (3) amended:** "zero runtime consumers reference the routing chain AND the doc carries the superseded banner" — a doc-only criterion is satisfiable by editing a file while the code still routes.

---

## 4. F4 — NEW MAJOR, wrongly parked as "residual risk": the dispatch boolean has no non-receipt contract

**Evidence:** `frontend/src/utils/aiWorkoutEvents.ts L121-128` — `dispatchAIWorkoutEvent` returns a bare `boolean` ("returns only whether a named dispatcher handled the event"). The packet itself states the boundary: "The panel must not infer a committed workout write from this event acknowledgement." Nothing in the evidenced code *enforces* that boundary — no type, no naming, no gate — and this is the **only** gym-floor/offline-adjacent path in the packet (constraint 6). A missing safety contract on the only evidenced path violates constraint 4 ("UI cannot say an action is saved before an authoritative write") as a latent defect.

**Fix:** Return a named `DispatchAcknowledgment` type (`{ handled: true, channel: 'browser-dispatch' } | { handled: false }`) with doc-comment "not a write receipt" at `aiWorkoutEvents.ts L121-128`; lint rule banning "saved/logged/recorded" UI copy gated on this return in `AITerminalPanel.tsx L116-139`; offline queue reuses F1's `idemKey` for reconcile. Downgrade to NOTE requires evidence of an existing gating mechanism — none is in the packet.

---

## 5. The 8 constraints, line by line (remit)

| # | Constraint | Verdict | Evidence |
|---|---|---|---|
| 1 | Least-privilege health data | **UNPROVEN** | `clientResolver.mjs L110-166` scopes trainers, "not admins beyond role"; `aiCommandRoutes.mjs L111-145` takes caller `selectedClientId`. Gate: per-command-family entitlement matrix; "denied op cannot mint success receipt" (packet's own probe row). |
| 2 | Explicit, server-validated client scope | **PARTIAL** | `AiConversation.mjs L24-83` has `targetUserId`; creation accepts it (`aiChatRoutes.mjs L308-344`); trainer check at `:610-625`. No evidence of **per-message/per-command re-resolution** after creation or post-revocation. Criterion: re-resolve at request time. |
| 3 | Memory ≠ domain truth | **HOLDS so far** | No packet evidence of domain reads from `AiConversation` messages/metadata; blueprint adds a negative test. |
| 4 | No "saved" before authoritative write | **AT RISK → F4** | `aiWorkoutEvents.ts L121-128` + packet's own warning paragraph. |
| 5 | Server-enforced entitlement | **BASELINE GOOD** | Every lane protect-ed: `aiChatRoutes:283`, `aiCommandRoutes:110`, `coachIntakeRoutes:23-25`, `coachProposalRoutes:15-16`, `hermesRoutes:43,90,127,142`, `aiDebateRoutes:54`; hermes/debate classification pending per surface table — classify before the blueprint adopts them. |
| 6 | Offline gym-floor | **UNSATISFIED** | Receipt-boundary section: contract "unproven and must be designed"; only evidenced path is the browser bridge (F4). Ties to F1's intent table. |
| 7 | 44px / WCAG / dark tokens | **NO EVIDENCE** | Zero styling/a11y excerpts in packet; verification matrix must add a11y/responsive gates — compliance cannot be asserted. |
| 8 | Ox Alpha redaction | **SATISFIED** at process level | Packet header construction. |

---

## 6. Sweep of remaining running-state items

- **Mount-line conflict (F5, MINOR):** the identical 5-statement block (`stream-spike`, `ai-chat`, `ai-command`, `hermes`, `ai/debate`) is cited as both `backend/core/routes.mjs L625-634` and `:630-634` within one packet. The excerpt shows exactly five `app.use` lines, self-consistent with `630-634`; `625-634` implies 10 lines not shown. Fix: builder verifies governing range in slice 1; blueprint carries one citation.
- **Middleware asymmetry (F6, MINOR):** `aiChatRoutes.mjs L283` (protect) / `L308-344` (creation accepts `targetUserId`) vs `L466` (subscription + rate-limit + PII on the message lane). Nothing evidences creation carries the same rate-limit/subscription stack — unproven-safe spam/entitlement surface. Probe + parity criterion; not MAJOR (no proven defect, only asymmetry of evidence).

---

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: consensus fix puts UNIQUE commandIdemKey on an append-only log that records failed rows (outcome/error-code fields) — UNIQUE drops retry audit rows or replays FAILED receipts, and audit-insert uniqueness gives no execute-once for the mutation through /api/ai-command/execute | F2=MAJOR: frontend/src/components/AITerminalPanel.tsx L116-139: 7-arg vs 4-arg positional drift confirmed ('both'/null/requestContext only in one branch); options-object fix agreed but criterion (2) proves branch-equality, not correctness | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: 'mark DORMANT' asserted without the consumer probe the packet's own evidence gate requires | F4=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: dispatchAIWorkoutEvent returns a bare boolean with no typed non-receipt contract on the only evidenced gym-floor path — violates constraint 4 unless 'saved' copy is gated on a server receipt | F5=MINOR: backend/core/routes.mjs: same 5-statement mount block cited as both L625-634 and L630-634 in one packet; one citation is wrong | F6=MINOR: backend/routes/aiChatRoutes.mjs L283/L308-344 vs L466: creation lane evidenced under protect only while message lane carries subscription+rate-limit+PII — middleware parity unproven | F7=NOTE: packet-wide: zero evidence for constraint 7 (44px/WCAG/tokens); verification matrix must add a11y/responsive gates
rebuttals: F1=REJECT: fix mechanism — move idempotency to a transactional AiCommandIntent table (UNIQUE(actorUserId,idemKey), paramHash+resolvedTarget match on replay, mutation+committed-transition in one transaction); audit log stays append-only with intentId FK; criterion (1) must split committed/pending/failed replay semantics | F2=AGREE: defect and fix shape adopted; criterion amended to assert literal expected mode against server-persisted AiConversation payload via useAIChat.ts L448 | F3=REJECT: DORMANT without probe manufactures certainty; SUPERSEDED-PENDING-PROBE until a zero-consumer grep of the Gemini→Qwen→Gemini Pro chain; criterion (3) must test code consumers, not just doc absence | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE
open: Q1=does any seat defend audit-log-unique over intent-table given the failed-row replay and concurrent double-execute paths | Q2=which slice owns the live probes: middleware parity L283/L466, per-message target re-validation L610-625, hive-mind consumer grep, mount-line reconciliation | Q3=F4 severity — downgrade from MAJOR requires evidence of an existing gating mechanism, none is in the packet
consensus_block: AMENDED CANDIDATE (I sign CONSENSUS next round if F1-mechanism, F3-classification, and criterion rewrites stand): (a) F1: create AiCommandIntent with UNIQUE(actorUserId,idemKey)+paramHash+resolvedTargetUserId+status+receiptPayload; execute lane at aiCommandRoutes.mjs L110-145 enforces insert-or-replay in one transaction with the mutation; AiCommandAuditLog.mjs L24-91 stays append-only + intentId FK; acceptance: committed-duplicate returns original receipt, pending-duplicate returns pending without re-execution, failed-duplicate returns 409 + new-key re-issue, concurrent duplicates execute once (concurrency test). (b) F2: options-object signature at useAIChat.ts L448, single call shape in AITerminalPanel.tsx L116-139; acceptance: integration test asserts literal expected mode persisted to AiConversation for both branches. (c) F3: APP-AI-HIVE-MIND.md L7-22 banner SUPERSEDED-PENDING-PROBE; DORMANT only after zero-consumer probe; acceptance: no runtime consumer of the routing chain + banner present. (d) F4: typed DispatchAcknowledgment at aiWorkoutEvents.ts L121-128; 'saved' copy gated on server receipt; lint enforcement in AITerminalPanel.tsx. Residual risks: constraint-1/2 entitlement and per-message re-validation probes remain open gates (F6, clientResolver.mjs L110-166); offline queue must reuse idemKey; constraint-7 a11y evidence absent until verification matrix runs.
=== END-VERDICT ===
