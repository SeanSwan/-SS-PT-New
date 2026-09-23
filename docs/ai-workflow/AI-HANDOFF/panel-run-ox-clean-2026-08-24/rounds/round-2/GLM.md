# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-2\REVIEW-DOC.md
**Tokens:** 6437 in / 12148 out (reasoning: 9254) | total 18585
**Wall:** 141.9s

---

# GLM 5.3 — Round 2: Full-Spectrum Hostile Review

Stance applied: correctness, security, schema truth, and the eight non-negotiable constraints line by line. Verdict on the round-1 candidate: **DISPUTE** — one REJECT (F1's mechanism), two adoptions (F2, F3 with strengthened acceptance criteria), plus new MAJORs my remit requires the candidate to absorb.

## 1. REJECT of candidate F1 — the audit log is the wrong table for idempotency

The candidate says: add `commandIdemKey UUID NOT NULL UNIQUE` to `AiCommandAuditLog`, "enforce idempotent insertion." Three defects, all locatable:

1. **Audit suppression.** `backend/models/AiCommandAuditLog.mjs L24-91` is the append-only record of actor/role/target/operation/outcome/error/duration. A UNIQUE key on that table means a retry-after-failure with the same key either throws (attempt goes unrecorded — audit loss, violating constraint 2's "observable") or forces key rotation (dedup silently defeated). An audit log must record *every* attempt, including duplicates and failures. Dedup belongs on a command ledger, not the audit trail.
2. **Receipt non-reconstructability — schema truth.** The row stores `parameter hash/redaction`, not a result payload. The candidate's own AC-1 ("duplicate command submission returns original receipt") is unsatisfiable from a row that cannot reconstruct the receipt. The packet's "Receipt and idempotency boundary" section states this contract "remains unproven and must be designed by the panel" — the candidate designed it into the one table that cannot hold it.
3. **Unscoped client-generated key.** "Require client-generated key" with a global UNIQUE constraint allows receipt lookup/enumeration across actors unless uniqueness and lookup are scoped `(actorId, commandIdemKey)` and the return path verifies ownership.

**Replacement (adopt AC-1 verbatim, change the mechanism):** new `backend/models/AiCommandReceipt.mjs` — `commandIdemKey UUID NOT NULL`, `UNIQUE(actorId, commandIdemKey)`, `status pending|committed|failed|cancelled`, `requestHash`, `resultPayload JSONB`, `targetClientId`, `conversationId`, timestamps. Insert-first (`ON CONFLICT DO NOTHING` then SELECT) serializes concurrent duplicates and returns the original receipt including payload. `AiCommandAuditLog.mjs L24-91` gains `commandIdemKey` as a **non-unique indexed** column so every attempt stays audited.

## 2. Adoptions

- **F2 AGREE** (`AITerminalPanel.tsx L116-139`, refactor site `L124-133`): the excerpt shows two call shapes — a 7-arg branch hardcoding `'both'` and a `null` placeholder, and a 4-arg branch omitting mode entirely. AC-2 ("both branches send identical context mode") is a test that **fails today** — that is what makes it a valid criterion. Apply as one call site with an options object `{text, context, title, clientId, mode: 'both', requestContext: requestContext ?? null}`.
- **F3 AGREE, strengthened** (`APP-AI-HIVE-MIND.md L7-22`): no mount in `routes.mjs L630-634` implements hive-mind routing, so DORMANT is plausible — but the candidate's AC-3 only checks doc-to-doc cross-references. Add: grep runtime for hive/qwen/consensus references; zero live references (or explicit classification) before the DORMANT stamp. Marking a doc dormant without probing whether its routing policy lives in code is a documentation-truth defect, not a resolution.

## 3. New findings the candidate omits (my remit)

- **F4 MAJOR — admin entitlement gap.** `clientResolver.mjs L110-166` "scopes trainers but not admins beyond role," and `aiCommandRoutes.mjs L111-145` accepts caller-supplied `selectedClientId` on the mutation lane. The admin path reaches `commandExecutor.mjs L309-343` resolution with no entitlement gate beyond role. The packet's own probe table demands a "cross-client read and write matrix by role" — unproven on a privileged lane is a MAJOR, not a probe footnote. Fix: entitlement matrix in the command policy gate before resolution; admin branch resolves via explicit scope (single-client+reason | broadcast), never role alone; denied operation mints no receipt.
- **F5 MAJOR — receipt/undo/offline absent.** `useCoachCommand.ts L96,170,207` exposes execute|confirm|cancel; `AiCommandAuditLog.mjs L24-91` has no `action_id`; `aiWorkoutEvents.ts L121-128` returns only a browser dispatcher boolean. No compensation/undo contract, no offline intent queue anywhere in the packet. This is the superset F1 only partially addresses; the candidate's own residual-risk sentence concedes it. It must be a numbered fix, not a residual note: action lifecycle + offline queue keyed to the same `commandIdemKey`; no UI "saved" state before a verified receipt.
- **F6 MINOR — dual conversation truth.** `AiConversation.mjs L24-83` lists `messages` as a field on the conversation row while `useAIChat.ts L448` posts to `/conversations/${convId}/messages`. If both stores exist, conversation memory can diverge from itself. Probe which store serves reads; blueprint must declare one authoritative message store.
- **F7 MINOR — middleware coverage on creation.** `aiChatRoutes.mjs L308-344` (creation accepting `targetUserId`) is cited 158 lines before `:466` (subscription/rate-limit/PII middleware). If router middleware is positional in Express, the creation path bypasses rate-limit/PII. Probe declaration order; close or fix.
- **F8 NOTE — packet citation drift.** The same `routes.mjs` mount block is cited as `L625-634` (appendix) and `L630-634` (gate refresh). A packet whose own line anchors disagree cannot safely anchor edits. Re-verify and standardize before any fix lands.

## 4. The eight acceptance criteria, line by line

| # | Constraint | Evidence | Status |
|---|---|---|---|
| 1 | Least-privilege | `clientResolver.mjs L110-166` trainer-only scoping; `aiDebateRoutes.mjs L57-76` direct clientId path unprobed | **FAIL-UNPROVEN** — admin ungated beyond role (F4) |
| 2 | Wrong-client mutation: explicit, validated, observable, recoverable | `aiCommandRoutes.mjs L111-145` + `AiCommandAuditLog.mjs L24-91` | **PARTIAL** — observable yes; recoverable/undo absent (F1, F5) |
| 3 | Receipts are truth, memory is not | `AiCommandAuditLog` no idem key; `aiWorkoutEvents.ts L121-128` boolean | **VIOLATED today** — packet admits contract unproven |
| 4 | No "saved" before authoritative write | dispatcher boolean is the only ack path shown | **UNPROVEN hazard** — no honest-state vocabulary in packet |
| 5 | Server-enforced entitlement | `aiCommandRoutes.mjs L110` protect+kill+rate; dispatcher recheck "not yet proven" | **UNPROVEN** — denied op must not mint success receipt |
| 6 | Offline/degraded gym-floor | zero queue/reconcile/idempotency evidence; bridge is browser-local | **ABSENT** |
| 7 | React/TS, tokens, 44px, WCAG | no UI evidence in packet | **NO EVIDENCE** — blueprint duty |
| 8 | Ox Alpha canary redaction | packet construction, no code artifact | **SATISFIED** (process-level) |

Criteria 1–6 map directly to F1/F4/F5 fixes; 7–8 carry into the blueprint without code findings.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/idem key, and candidate F1's UNIQUE commandIdemKey on this append-only audit table makes retries/failures unrecordable while the redacted parameter hash cannot reconstruct the receipt AC-1 promises | F2=MINOR: frontend/src/components/AITerminalPanel.tsx L116-139: dual sendMessageWithConversation shapes — 7-arg branch hardcodes 'both'+null, 4-arg branch omits mode; identical-mode test fails today | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: hive-mind routing has no implementing mount in routes.mjs L630-634; dormancy criterion must include runtime reference grep, not only doc cross-links | F4=MAJOR: clientResolver.mjs L110-166 + backend/routes/aiCommandRoutes.mjs L111-145: admin path scoped by role only while caller-supplied selectedClientId reaches commandExecutor.mjs L309-343 — cross-client mutation entitlement unproven (constraints 1,5) | F5=MAJOR: frontend/src/hooks/useCoachCommand.ts L96,170,207 + backend/models/AiCommandAuditLog.mjs L24-91 + frontend/src/utils/aiWorkoutEvents.ts L121-128: execute|confirm|cancel with no durable receipt, no undo/compensation, no offline queue (constraints 2,3,4,6) | F6=MINOR: backend/models/AiConversation.mjs L24-83: `messages` on the conversation row vs useAIChat.ts L448 posting to /conversations/${convId}/messages — dual conversation truth; probe read path | F7=MINOR: backend/routes/aiChatRoutes.mjs L308-344 vs L466: creation handler cited before subscription/rate/PII middleware application point — if router middleware is positional, creation bypasses it; probe order | F8=NOTE: routes.mjs mount block cited as both L625-634 and L630-634 within the same packet — citation drift; re-verify before edits
rebuttals: F1=REJECT: candidate mechanism conflates append-only audit with dedup ledger and stores no result payload, making its own AC-1 unsatisfiable as designed; replace with dedicated receipts ledger | F2=AGREE: helper-object refactor at L124-133, test pins mode in both branches | F3=AGREE: mark DORMANT plus runtime grep criterion
open: Q1=approve AiCommandReceipt ledger replacing audit-log unique key | Q2=define admin entitlement policy for clientResolver admin branch | Q3=confirm aiChatRoutes middleware declaration order covers L308-344 | Q4=set SwanCoachAssistantPage retirement slice
consensus_block: FINDINGS TO FIX: (1) F1-replacement: new backend/models/AiCommandReceipt.mjs with commandIdemKey UUID NOT NULL, UNIQUE(actorId, commandIdemKey), status pending|committed|failed|cancelled, requestHash, resultPayload JSONB, targetClientId, conversationId, timestamps; insert-first ON CONFLICT DO NOTHING then SELECT so concurrent duplicates return the original receipt incl. payload; AiCommandAuditLog.mjs L24-91 gains commandIdemKey as NON-unique indexed column so every attempt stays audited; AC-1 unchanged and now satisfiable. (2) F2 per candidate at AITerminalPanel.tsx L124-133: single options-object call {text, context, title, clientId, mode:'both', requestContext: requestContext ?? null}; AC-2 unchanged (test fails today, valid). (3) F3 per candidate, AC-3 strengthened: runtime grep for hive/qwen/consensus references must return zero live references or explicit classification before APP-AI-HIVE-MIND.md is marked DORMANT. (4) F4: entitlement matrix enforced in the command-lane policy gate before commandExecutor.mjs L309-343 resolution; clientResolver.mjs L110-166 admin branch must resolve via explicit admin scope (single-client+reason | broadcast), never role alone; AC: cross-role read/write matrix test passes; denied operation mints no receipt. (5) F5: blueprint must define full action lifecycle (answer/draft/reversible/confirm/privileged/async/denied) and offline intent queue keyed to the same commandIdemKey; no UI saved-state before verified receipt (constraints 4,6). (6) F6/F7/F8: named probes — conversation read-path store, middleware declaration order, mount-block line re-verification — closed before build slice 1. ACCEPTED AS INTENTIONAL: stream-spike fail-closed kill switch (aiStreamSpikeRoutes); proposal pending-row claim pattern (coachProposalRoutes.mjs L30-54) retained as the concurrency model to generalize. RESIDUAL RISKS: dispatcher-level access recheck unproven per packet probe table; SwanCoachAssistantPage retirement undecided (running state); F6/F7 are probe-backed candidates, not confirmed defects; all static findings require the live probe pass before implementation authorization.
=== END-VERDICT ===
