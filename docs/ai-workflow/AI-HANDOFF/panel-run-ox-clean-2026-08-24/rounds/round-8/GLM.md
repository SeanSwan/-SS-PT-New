# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-8\REVIEW-DOC.md
**Tokens:** 6253 in / 14035 out (reasoning: 10823) | total 20288
**Wall:** 172.1s

---

# GLM 5.3 — Round 8: Full-Spectrum Hostile Review (correctness, security, schema truth, acceptance criteria line-by-line)

## 0. Seat position

I adopt the consensus candidate's F2, F3, F4, F5, F6 **verbatim**. I carry **one mandatory amendment to F1's mechanism** and **two findings the candidate dropped or never had** — one of which (`aiWorkoutEvents.ts L121-128`) sits in the RUNNING STATE unresolved list and vanished from the candidate without a rejection. Per rule 3, carrying a new MAJOR puts me in DISPUTE. These are exact-contract items, not vibes; round 9 can absorb them in minutes.

The "8 acceptance criteria" in my remit = the packet's eight non-negotiable constraints. Audited line-by-line in §4. The candidate's five acceptance criteria leave constraints 3, 4, and half of 6 uncovered.

---

## 1. F1 AMEND (MAJOR): insert-only idempotency can pass criterion (1) while double-executing

**Claim:** The candidate's F1 text — "enforce insertion idempotency in commandExecutor… reject duplicates with the original receipt" — does not pin the ORDER of insert vs. execution. If the audit row is written after dispatch, two concurrent retries both resolve (`commandExecutor.mjs L309-343`), both execute the side effect, and the second INSERT loses the unique-key race — returning the original receipt with **no new row** (criterion 1 satisfied) while the mutation ran **twice**. That is precisely the constraint-6 failure class (offline queue replay, double-submit) the fix exists to kill.

**Evidence that the correct pattern already exists in this codebase:** the gate table for `/api/coach/proposals` (`coachProposalRoutes.mjs L30-54`) records that the approval service "claims pending rows before apply." Claim-before-apply is the in-repo precedent; commandExecutor should copy it, not invent insert-after-execute.

**Fix (engineer-grade):**
- **WHAT:** claim-first idempotency. **WHERE:** `backend/models/AiCommandAuditLog.mjs L24-91` (add `commandIdemKey` UUID UNIQUE, migration required); `backend/routes/aiCommandRoutes.mjs L111-145` (accept client key); `backend/services/commandExecutor.mjs L309-343`.
- **HOW:** (1) INSERT audit row `status=pending` under the unique key BEFORE any dispatcher runs; on conflict, return the existing receipt and **skip execution entirely**; (2) execute; (3) UPDATE the same row to `applied|failed` with outcome/error/duration (fields already exist per `AiCommandAuditLog.mjs L24-91`). Duplicate POST against a still-pending row returns **409 in-progress**, never success vocabulary.
- **Amended acceptance (1) → (7):** two concurrent POSTs with the same `commandIdemKey` execute the side effect exactly once, return one receipt, create no second row, and a duplicate against a pending row returns 409.

---

## 2. F7 (MAJOR): `aiWorkoutEvents.ts L121-128` — browser dispatcher boolean is one rename away from a fake "saved" state

**Claim:** `dispatchAIWorkoutEvent` returns a boolean meaning only "a named frontend dispatcher existed and handled the event" (`aiWorkoutEvents.ts L121-128`). The packet itself rules: "Browser event dispatch must never be mistaken for durable, server-authorized mutation" (Workout Logger terminal bridge row) and "the required authoritative action receipt and retry/idempotency contract remain unproven" (Receipt and idempotency boundary section). So today there is **no code path** by which a logger-bridge action can ever satisfy constraints 3 and 4 — and the exported contract's success-shaped boolean is the standing invitation to violate them. This item is in the RUNNING STATE; the candidate dropped it silently. Either fix it or reject it with evidence — it may not evaporate.

**Fix:**
- **WHERE:** `frontend/src/utils/aiWorkoutEvents.ts L121-128` and its consumers in the Logger terminal bridge / `AITerminalPanel` dispatch path (`AITerminalPanel.tsx L116-139` context).
- **HOW:** (1) change the return to a typed `{ dispatched: boolean }` (or rename to `dispatchAcknowledged`) so no caller can read it as `success`; (2) grep-gate: no UI string or state name derived from this return may contain saved/done/complete/logged — pending/local vocabulary only until a receipt arrives from the `/api/ai-command` lane (`useCoachCommand.ts L96,170,207` endpoints).
- **Acceptance (6):** a test proves no component renders a committed-write state sourced from the dispatcher boolean.

---

## 3. F8 (MINOR): three names for "which client does this AI action concern"

Schema truth: `AiConversation.mjs L24-83` says `targetUserId`; `aiCommandRoutes.mjs L111-145` says `selectedClientId`; `aiDebateRoutes.mjs L57-76` says `clientId`. F5 and F6 patch scope validation per-lane against three vocabularies — guaranteeing the fourth lane (Hermes, `routes.mjs L634`) reintroduces the bug.

**Fix:** `clientResolver.mjs L110-166` becomes the single emitter of a server-resolved `resolvedTargetUserId`; each route normalizes its alias at entry (`aiChatRoutes.mjs L308-344`, `aiCommandRoutes.mjs L111-145`, `aiDebateRoutes.mjs L57-76`) before validation. **Acceptance (8):** grep shows one canonical token across all three route files; denial behavior (4xx + audit row) is identical across lanes.

---

## 4. The 8 non-negotiable constraints, line-by-line vs. the candidate

| # | Constraint | Candidate coverage | Ruling |
|---|---|---|---|
| 1 | Least-privilege on health/training/identity/history | Criteria (4)(5); chat read/update deferred to residual risks; `aiChatRoutes.mjs L610-625` already checks trainer reads — extending to admin is cheap | **Gap half-closed:** promote "admin/trainer read/update of out-of-scope conversations → 4xx" from residual risk into criterion (8)'s scope |
| 2 | Wrong-client mutation: explicit, server-validated, observable, recoverable | F5+F6 validated; observable via `AiCommandAuditLog.mjs L24-91` (resolved target, param hash); recoverable = undo contract | OK for this slice; undo/rollback stays a blueprint obligation (final package item 6) — residual, stated |
| 3 | Memory ≠ truth; receipts = truth | **Nothing in criteria (1)-(5)** | **Gap → F7 + criterion (6)** |
| 4 | UI cannot claim saved pre-write | **Nothing** | **Gap → F7 + criterion (6)** |
| 5 | Server-enforced roles, not shell-inferred | Criteria (4)(5); mounts verified `routes.mjs L630-634`, `L378-379` | Adopted |
| 6 | Offline queue/reconcile, duplicate prevention | F1 as written under-specifies; offline store unnamed | **F1-AMEND + criterion (7)**; queue ownership → Q4 |
| 7 | React/TS, tokens, 44px, WCAG, dual QA | No criterion | No UI code in packet to defect on; becomes the wireframe acceptance gate (final package item 5) — Q4/open, stated plainly |
| 8 | Ox Alpha prompt retention | Process constraint | N/A to code; no packet evidence applies |

---

## 5. Adopted items, restated with exact anchors (no re-derivation)

- **F2** — `AITerminalPanel.tsx L116-139`: the `requestContext` branch passes 7 positional args (`'both', null, requestContext`), the default branch passes 4; drift is positional. `buildChatParams` helper, typed end-to-end into `useAIChat.ts L217,425,448`. Extend criterion (2): assert identical context, mode, **clientId, and requestContext forwarding**, not just context/mode.
- **F3** — `docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22` contradicts the mounted five-lane runtime (`routes.mjs L630-634`); mark DORMANT, link blueprint. Criterion (3) as written.
- **F4** — mount range `routes.mjs L630-634` (gate-refresh authority) over the excerpt's `L625-634` label. Adopted.
- **F5** — `clientResolver.mjs L110-166` scopes trainers "but not admins beyond role"; `aiCommandRoutes.mjs L111-145` takes caller `selectedClientId`. Fix at both files + `commandExecutor.mjs L309-343`; denial writes an `AiCommandAuditLog` row with `errorCode=CLIENT_SCOPE_DENIED` (that log already records outcome/error — criterion (4)'s "security event" lands there; no new channel needed).
- **F6** — `aiChatRoutes.mjs L308-344` accepts `targetUserId` for admin/trainer; trainer checks exist at `L610-625`; extend that exact pattern to admin creation. Criterion (5) as written.

---

## 6. Open for other seats

1. **Q1:** Define admin "valid client scope" — tenant-wide + existence check, or explicit admin↔client assignment? Criteria (4)/(5) tests are unwritable until this is chosen.
2. **Q2:** Live probe `aiDebateRoutes.mjs L57-76` direct `clientId` path for cross-client denial. If the probe fails, it joins the F5 class as a MAJOR in round 9 — the packet flags the gap but absence of proof is not yet proof of defect.
3. **Q3:** `SwanCoachAssistantPage` retire-vs-port must ship with its test-plan slice first (its own tests still reference it; bare deletion breaks build) — carried from RUNNING STATE, still undecided.
4. **Q4:** Name the offline pending-intent store and reconcile owner for the constraint-6 slice.

=== VERDICT ===
status: DISPUTE
confidence: 91
findings: F1-AMEND=MAJOR: commandExecutor.mjs L309-343 idempotency must be claim-first (INSERT pending row under UNIQUE commandIdemKey BEFORE dispatch; claim-before-apply precedent at coachProposalRoutes.mjs L30-54); insert-after-execute passes criterion 1 while double-executing under concurrent retry | F7=MAJOR: aiWorkoutEvents.ts L121-128 dispatcher boolean has no receipt contract; success-shaped return lets UI assert saved off a browser ack, violating constraints 3/4 — running-state item the candidate dropped silently | F8=MINOR: client-target trichotomy AiConversation.mjs L24-83 targetUserId vs aiCommandRoutes.mjs L111-145 selectedClientId vs aiDebateRoutes.mjs L57-76 clientId; normalize to one server-resolved resolvedTargetUserId from clientResolver.mjs L110-166
rebuttals: F1=AMEND: mechanism pinned claim-first, not rejected — criterion 1 must add exactly-once execution and 409-on-pending | F2=AGREE with criterion 2 extended to clientId+requestContext equality | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE
open: Q1=define admin "valid client scope" (tenant-wide existence vs explicit assignment) before F5/F6 acceptance tests | Q2=live-probe aiDebateRoutes.mjs L57-76 direct clientId cross-client denial; failure joins F5-class MAJOR in round 9 | Q3=SwanCoachAssistantPage retire-vs-port with test-plan slice first | Q4=assign offline pending-intent store + reconcile owner
consensus_block: PROPOSED INTEGRATION (adopt candidate F2-F6 verbatim; F1 amended; add F7, F8). Fixes: [F1] AiCommandAuditLog.mjs L24-91 add commandIdemKey UUID UNIQUE + migration; aiCommandRoutes.mjs L111-145 accept client key; commandExecutor.mjs L309-343 claim-first: INSERT pending -> execute -> UPDATE applied|failed; conflict returns existing receipt with NO execution; pending duplicate returns 409. [F2] AITerminalPanel.tsx L116-139 buildChatParams typed helper through useAIChat.ts L217,425,448. [F3] APP-AI-HIVE-MIND.md L7-22 mark DORMANT, link blueprint. [F4] mount authority routes.mjs L630-634. [F5] clientResolver.mjs L110-166 + commandExecutor.mjs L309-343: admin commands require server-resolved target client; denial = 4xx + AiCommandAuditLog row errorCode=CLIENT_SCOPE_DENIED. [F6] aiChatRoutes.mjs L308-344: extend L610-625 trainer-check pattern to admin conversation creation; out-of-scope targetUserId = 4xx. [F7] aiWorkoutEvents.ts L121-128 return typed {dispatched}; no success vocabulary in any consumer until /api/ai-command receipt. [F8] clientResolver.mjs emits single resolvedTargetUserId; all three route files normalize aliases at entry. Acceptance criteria: (1) duplicate command POST returns original receipt, no new row; (2) both AITerminalPanel branches send identical context, mode, clientId, requestContext; (3) HIVE-MIND doc out of active index; (4) admin command without valid client scope = 4xx + security audit row; (5) out-of-scope targetUserId conversation creation = 4xx; (6) no committed-write UI state derivable from dispatcher boolean; (7) concurrent duplicate commandIdemKey executes exactly once, 409 on pending; (8) single canonical target identifier across ai-chat/ai-command/ai-debate with identical denial semantics. Residual risks: undo/recovery contract deferred to blueprint state machines (constraint 2 "recoverable"); chat read/update admin scope promoted from residual into criterion 8 scope or explicitly re-deferred by round 9; debate/hermes lanes pending Q2 probe; offline queue owner pending Q4; UI standards (44px/WCAG) gate lands in wireframe slice; SwanCoachAssistantPage retirement undecided pending Q3.
=== END-VERDICT ===
