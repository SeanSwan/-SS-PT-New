# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-6\REVIEW-DOC.md
**Tokens:** 6195 in / 10315 out (reasoning: 8063) | total 16510
**Wall:** 132.2s

---

# ROUND 6 — GLM 5.3 (full-spectrum: correctness, security, schema truth, 8 criteria line-by-line)

## 1. Stance on the consensus candidate

Adopted verbatim. Zero REJECTs. I verified each anchor against the packet before adopting: F1 matches the packet's own confession ("`AiCommandAuditLog.mjs:24-91` … has no `action_id` or unique idempotency key"); F6 matches the packet's required-probe column ("Replay/concurrency … durable applied/failed receipt" at the proposals row) — the builder line "claims pending rows before apply" is a claim, and the packet itself flags it unproven, so F6 does not overstate; F5's parity gap is real (`aiChatRoutes.mjs:466` runs subscription/rate/PII middleware while `coachIntakeRoutes.mjs:23-25` and `coachProposalRoutes.mjs:15-16` stop at protect + role + body limit); F11 matches "No route-tree mount or lazy export was found; it remains referenced by its own tests." The two "accepted as intentional" rulings are sound — specific-before-prefix mounting at `routes.mjs:630-634` is correct Express practice, and the admin-unbounded-scope ruling is correctly deferred to the panel with the audit-tagging condition.

But I am **DISPUTE**, not CONSENSUS: the running state carries two unresolved findings the candidate silently omits. Both sit squarely in my schema-truth lane and both block criteria 2/3/6. I am dispositioning them as F12/F13 with exact fixes.

## 2. Disposition of the unresolved queue

**F12 = MAJOR — message lane has no idempotency; F4's queue does not cover it.**
`AiConversation.mjs:24-83` (authoritative field receipt: embedded `messages`, denormalized `messageCount`/`lastMessageAt`) + `useAIChat.ts:425,448` (POST `/api/ai-chat/conversations/${convId}/messages`, no key). The candidate's F1 keys commands (`actionId`) and F4 keys queued intents (`actionId`) — neither applies to chat messages. Under constraint 6, once offline reconcile exists, an unkeyed message replay duplicates stored memory and drifts `messageCount`/`lastMessageAt`, breaking history pagination and polluting LLM context. Fix, engineer-direct:
- **WHAT/WHERE/HOW:** client-generate `clientMessageId` (UUIDv7) at `useAIChat.ts:425,448`; add compound unique index `{conversationId, clientMessageId}` on `AiConversation.mjs:24-83` (or promote messages to an `AiMessage` collection — open Q3); server append becomes upsert-on-key in one transaction with server-derived `messageCount`/`lastMessageAt`; extend F4's IndexedDB queue so messages are first-class intents keyed by `clientMessageId`. Acceptance: kill the network mid-send, replay 3× → exactly one stored message, counters consistent.

**F13 = MAJOR — dual client-identity channels with unstated precedence.**
`AiConversation.mjs:24-83` stores a creation-time `targetUserId` (settable by admin/trainer per `aiChatRoutes.mjs:308-344`), while every send carries a per-message `clientId || null` (`AITerminalPanel.tsx:116-139`), and the packet does not say which field the trainer access check at `aiChatRoutes.mjs:610-625` reads. A trainer switching active client mid-conversation (continuity is an explicit owner goal) either appends clientB questions to clientA-scoped memory or silently re-scopes history — and the proposal lane (`coachProposalRoutes.mjs:30-54`) inherits that ambiguity into human-approved writes. That is criterion-2 exposure via ambiguity that is *present in the packet*, not merely absent. Fix:
- **WHAT/WHERE/HOW:** rule: `targetUserId` is immutable post-create; a send whose `clientId` diverges → `409 CONTEXT_MISMATCH`; explicit re-anchor endpoint (`POST /api/ai-chat/conversations/:id/re-anchor`) writing `metadata.reanchoredAt` + audit row, gated by `ensureClientAccess` for trainer; client self-service role may never set `targetUserId ≠ own PK` (400). Apply at `AiConversation.mjs:24-83`, `aiChatRoutes.mjs:308-344` and `:610-625`, `AITerminalPanel.tsx:116-139`. Acceptance: live probe records which field `:610-625` checks today; contract tests for 409, re-anchor+audit, self-PK enforcement.

## 3. The 8 acceptance criteria, line by line

| # | Criterion | Verdict | Packet evidence | Carried by |
|---|---|---|---|---|
| 1 | Least privilege | **PARTIAL** | `aiChatRoutes.mjs:283,:610-625` gate chat; `aiCommandRoutes.mjs:110` lane-level only; `clientResolver.mjs:110-166` admin unbounded; `aiDebateRoutes.mjs:57-76` start unprobed | F2, F10, admin-scope ruling (Q2) |
| 2 | Wrong-client mutation | **NOT MET** | caller-supplied `selectedClientId` (`aiCommandRoutes.mjs:111-145`), `clientId \|\| null` sender, F13 dual identity, proposal concurrency | F3, F6, F13 |
| 3 | Memory ≠ truth; receipts truth | **NOT MET** | packet's own receipt-boundary section: no `action_id`; `aiWorkoutEvents.ts:121-128` boolean | F1; F12 for memory self-consistency |
| 4 | No premature "saved" | **NOT MET** | logger bridge returns dispatcher boolean only | F4 |
| 5 | Server-side entitlement | **PARTIAL** | role-tab limiting is shell-side (`CoachCommandCenterPage.tsx:34-43`); no per-family registry; Hermes unclassified | F2, F9-adjacent Hermes probe |
| 6 | Offline/degraded | **NO ARTIFACT** | nothing in packet addresses queue/reconcile | F4 (now +F12 for messages) |
| 7 | 44px/WCAG/dark tokens | **NO ARTIFACT** | zero packet artifacts | blueprint verification matrix (keep residual risk) |
| 8 | Ox Alpha redaction | **N/A in code** | process claim; nothing in packet contradicts it | NOTE only, no finding |

## 4. Builder-assertion contradictions (re-checked)

- "review-gated writes" (header, CoachCommandCenterPage) vs. excerpt `:34-43` showing only tabs/routing → F8 stands: cite the gate or strike.
- "claims pending rows before apply" vs. the same row's own required-probe list → F6 stands.
- Mount-order header claim matches `routes.mjs:625-634` verbatim → no finding; correctly accepted as intentional.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F12=MAJOR: AiConversation.mjs L24-83 + useAIChat.ts L425,448: message lane has no idempotency key; embedded messages + denormalized messageCount/lastMessageAt accept unkeyed retry duplicates; F1/F4 keying (actionId) does not cover messages — offline reconcile will double-store memory and drift counters | F13=MAJOR: AiConversation.mjs L24-83 vs AITerminalPanel.tsx L116-139 + aiChatRoutes.mjs L308-344,610-625: dual client-identity channels (creation-time targetUserId snapshot vs per-send clientId) with unstated precedence; mid-conversation client switch bleeds scope into the proposal approval lane (criterion 2)
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE (extend to messages per F12) | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE
open: Q1=which identity field does aiChatRoutes.mjs:610-625 actually read — any seat with live-probe evidence closes F13 precedence | Q2=rule NOW on admin-unbounded clientResolver.mjs:110-166 (policy+audit-tag vs defect) so round 9 is not blocked | Q3=embedded messages+unique key vs promoted AiMessage collection under F12 — migration cost call | Q4=confirm criterion 8 is procedural-only, no seat expects code artifacts
consensus_block: PROPOSED AMENDMENT (candidate adopted verbatim, zero rejects, plus disposition of the unresolved queue): FIX BEFORE BUILD: F1, F3, F2, F6, F5 as in candidate. MUST-FIX PER SLICE: F4 (extended: IndexedDB queue keys commands by actionId AND messages by clientMessageId), F7, F10, F11, F8, F9, plus F12 (clientMessageId UUIDv7 at useAIChat.ts:425,448; compound unique {conversationId, clientMessageId} on AiConversation.mjs:24-83 or promoted AiMessage collection; upsert-on-key append transaction deriving messageCount/lastMessageAt server-side; acceptance = 3x replay stores exactly one message) and F13 (targetUserId immutable post-create; divergent send returns 409 CONTEXT_MISMATCH; re-anchor endpoint writes metadata.reanchoredAt + audit row gated by ensureClientAccess; client role self-PK enforced 400; acceptance = probe records current field read at aiChatRoutes.mjs:610-625 + contract tests). ACCEPTED AS INTENTIONAL: unchanged (admin unbounded scope pending Q2 ruling; routes.mjs:630-634 mount order correct practice). RESIDUAL RISKS: candidate list unchanged, plus — criterion 1 verdict is PARTIAL gated on F2/F10/Q2; criterion 8 is procedural with no code artifacts; F12/F13 fix shapes depend on Q3 and the Q1 probe result.
=== END-VERDICT ===
