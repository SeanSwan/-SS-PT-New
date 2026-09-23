# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-10\REVIEW-DOC.md
**Tokens:** 6953 in / 10024 out (reasoning: 7471) | total 16977
**Wall:** 135.8s

---

# GLM 5.3 — Round 10 Final Attack: Full-Spectrum Ruling

My remit is correctness, security, schema truth, and the 8 acceptance criteria line by line. I have re-audited the consensus candidate against the packet. I adopt it almost entirely — but the round-10 mandate ("attack the draft for … wrong-client writes, stale context …") exposes one hole the fix list does not close, and it sits squarely on constraint 2. I carry it as a new MAJOR. Status is therefore DISPUTE.

---

## 1. The 8 acceptance criteria, line by line, against packet evidence

| # | Criterion (packet "Non-negotiable constraints") | Packet evidence | Verdict |
|---|---|---|---|
| C1 | Least-privilege for health/identity/history | `protect` present on every evidenced lane (`aiChatRoutes.mjs:283`, `aiCommandRoutes.mjs:110`, `coachIntakeRoutes.mjs:23-25`, `coachProposalRoutes.mjs:15-16`, `hermesRoutes.mjs:43,90,127,142`, `aiDebateRoutes.mjs:54`); BUT `clientResolver.mjs:110-166` leaves admins unbounded beyond role, and per-family command entitlement is explicitly "not yet proven" (probe table) | **NOT MET** until F2 + F5 land; admin scope acceptable only under the consensus's policy+audit-tag condition (note: `AiCommandAuditLog.mjs:24-91` already records "resolved target client", so the tagging condition is satisfiable by the existing model) |
| C2 | Wrong-client mutation must be explicit, server-validated, observable, **recoverable** | Explicit: `AiConversation.mjs:24-83` `targetUserId`; observable: audit log actor/role/resolved-target; but NO `action_id` (packet's own "Receipt and idempotency boundary" section), no coherence check between the two identity channels (my F12), and no undo artifact anywhere (my F13) | **NOT MET** until F1/F3/F6 **plus F12**; recoverability currently unowned |
| C3 | Memory ≠ truth; verified server state + durable receipts are truth | Packet states verbatim the receipt/idempotency contract is "unproven and must be designed"; `aiWorkoutEvents.ts:121-128` returns a browser dispatcher boolean only | **NOT MET** until F1; the workout bridge boolean must never satisfy a "saved" render (F4 UI vocabulary) |
| C4 | UI cannot claim saved before authoritative write | Zero UI-state artifacts in packet; only `useCoachCommand.ts:96,170,207` literals exist | **UNVERIFIABLE from packet** — must be carried by the verification matrix exactly like C7; F4's `queued/sending/verified` vocabulary is the contract |
| C5 | Role boundaries enforced server-side, not by dashboard shell | `CoachCommandCenterPage.tsx:34-43` role logic is client-side only; server gaps: `aiDebateRoutes.mjs:57-76` start path, spike non-GET methods (only `GET /` evidenced gated), entitlement registry absent | **NOT MET** until F2/F7/F10 |
| C6 | Degraded/offline story for gym floor | Running state itself records "(no existing code) + constraint 6"; the only local path evidenced (`aiWorkoutEvents.ts:121-128`) is browser dispatch, not durable logging | **NOT MET — largest build gap**; F4 IndexedDB queue is the design contract, not a fix to existing code |
| C7 | React/TS, styled-components, tokens, 44px, WCAG, QA | Zero styling/UX artifacts in the packet — no component CSS, no token file, no QA doc | **UNVERIFIABLE**; consensus residual risk already carries this — I extend it: **C4 is equally artifact-less** and must be listed beside it |
| C8 | Ox Alpha receives only the canary-redacted packet | Packet header: sanitized, no credentials/records/logs | **MET by construction**; not code-testable |

**Criteria score: 0 of 8 pass today.** C1/C2/C3/C5 are blocked on named fixes; C6 is absent; C4/C7 are matrix-owned; C8 is process-met. This is consistent with the consensus candidate's residual-risk framing — with C4's addition.

## 2. New finding F12 — cross-lane target coherence is unenforced (MAJOR)

The consensus fix F3 unifies *naming* (`targetUserId` vs `selectedClientId`) but not *binding*. Two caller-supplied identity channels remain independent:

- Conversation lane: `AiConversation.mjs:24-83` binds `targetUserId` at creation (`aiChatRoutes.mjs:308-344`, admin/trainer).
- Command lane: `aiCommandRoutes.mjs:111-145` accepts `selectedClientId` per request; `commandExecutor.mjs:309-343` resolves it with no cited cross-check against any conversation binding.
- `AITerminalPanel.tsx:116-139` sends chat with `clientId || null` per message — a third per-call channel.

**Attack path:** trainer holds a conversation bound to Client A; stale tab or rapid client switch posts `/api/ai-command/execute` with `selectedClientId=B`. Nothing cited in the packet rejects the divergence. F1's receipt and F3's canonical field make the wrong-client write *observable* — after it happens. Constraint 2 demands server *validation*, not post-hoc legibility.

**Fix (WHAT/WHERE/HOW):**
- WHERE: `commandExecutor.mjs:309-343` + `aiCommandRoutes.mjs:111-145`.
- WHAT: when a `conversationId` is supplied, derive the command target from the conversation's `targetUserId`; a per-request client ID that diverges returns `409 TARGET_MISMATCH`, writes a denial audit row (per F2's denial shape), and mints no success receipt. Client-switch in the UI forces a re-anchor (new conversation binding) before any privileged action — this is question 4's re-anchor contract made executable.
- Acceptance probe: conversation bound to A, execute with B as trainer → 409 + denial audit row; same call with matching target → single idempotent receipt (with F1).

## 3. New finding F13 — recoverability is unowned (MINOR)

The "/api/ai-command/*" row names execute/confirm/**cancel**; `useCoachCommand.ts:207` confirms cancel is the only reversal literal. Cancel is pre-execution. No undo/compensation artifact exists in any evidenced lane, and no required probe mentions it. Constraint 2's "recoverable" therefore has zero owner. Fix: final package item 6 must specify per-action-class undo/compensation with a named acceptance test; until then, every applied write under this blueprint must be classified non-recoverable in its receipt.

## 4. Ledger against the consensus candidate

- **Adopt verbatim:** F1, F2, F4, F5, F6, F7, F8, F9, F10, F11; both accepted-as-intentional rulings (admin scope conditioned on policy+audit tag — tagging already satisfiable per `AiCommandAuditLog.mjs:24-91`; Express specific-before-prefix mount order at `routes.mjs:630-634` is correct practice, and I explicitly REJECT any framing of it as a defect).
- **Adopt with a mandatory scoping amendment (Q1):** F3's `400 TARGET_REQUIRED` must apply to admin/trainer actor classes only. Client self-service is a canonical mount (`UniversalDashboardLayout.routes.tsx:203`) and `AITerminalPanel.tsx:116-139` legitimately sends `clientId || null`; a blanket null-rejection breaks client mode. Client actors resolve target to caller PK server-side.
- **New:** F12 (MAJOR), F13 (MINOR).
- **Residual risks, amended:** add C4 beside C7 as artifact-less and matrix-owned; C8 met by construction; F12 gates constraint 2 alongside F1/F3.

I REJECT nothing in the candidate — the candidate is incomplete, not wrong. That distinction is why this is a DISPUTE carrying F12 rather than a rejection round.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F12=MAJOR: AiConversation.mjs L24-83 + aiChatRoutes.mjs L308-344 + aiCommandRoutes.mjs L111-145 + commandExecutor.mjs L309-343: conversation targetUserId and per-request selectedClientId are independent caller-supplied channels with no cited coherence check; stale-selection wrong-client write survives F1/F3; fix=derive target from conversation binding, 409 TARGET_MISMATCH + denial audit on divergence, UI re-anchor on client switch | F13=MINOR: packet '/api/ai-command/*' row + useCoachCommand.ts L207: cancel is pre-execution only; zero undo/compensation artifact means constraint 2 'recoverable' is unowned; fix=package item 6 per-action-class undo with acceptance test, receipts classify non-recoverable until then
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE with Q1 amendment: TARGET_REQUIRED must scope to admin/trainer only; client self-service (routes.tsx L203 mount, AITerminalPanel L116-139 null clientId) resolves to caller PK or client mode breaks | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE | admin-scope-accepted=AGREE (audit tag already satisfiable per AiCommandAuditLog L24-91) | mount-order-as-defect=REJECT: specific-before-prefix at routes.mjs L630-634 is correct Express practice | F12=NEW | F13=NEW
open: Q1=F3 TARGET_REQUIRED actor-class scope ruling | Q2=whether F12 joins FIX BEFORE BUILD (it gates constraint 2 with F1/F3) | Q3=undo/compensation ownership in package item 6 | Q4=whether matrix ownership suffices to pass artifact-less criteria C4 and C7
consensus_block: AMENDED (DISPUTE carriage): Adopt the candidate verbatim with two amendments. (1) ADD F12 to FIX BEFORE BUILD: commandExecutor.mjs:309-343 + aiCommandRoutes.mjs:111-145 derive command target from the conversation's targetUserId when conversationId is present; divergent per-request client ID returns 409 TARGET_MISMATCH, writes a denial audit row, mints no success receipt; UI client-switch forces re-anchor before privileged actions; acceptance probe = trainer execute against conversation-bound A with selectedClientId B yields 409 + denial row, matching target yields exactly one idempotent receipt. (2) AMEND F3: 400 TARGET_REQUIRED applies to admin/trainer actors only; client self-service resolves target to caller PK server-side. (3) ADD F13 to must-fix-per-slice/blueprint: package item 6 defines per-action-class undo/compensation with acceptance tests; receipts mark non-recoverable until landed. (4) AMEND residual risks: acceptance criteria 4 and 7 both have zero packet artifacts and are carried entirely by the blueprint verification matrix; criterion 8 is met by packet construction; 0 of 8 criteria pass today. All other candidate items — F1, F2, F4, F5, F6, F7, F8, F9, F10, F11, both accepted-as-intentional rulings, remaining residual risks — adopted unchanged.
=== END-VERDICT ===
