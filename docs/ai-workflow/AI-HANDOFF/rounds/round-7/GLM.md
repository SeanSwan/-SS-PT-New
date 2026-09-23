# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-7\REVIEW-DOC.md
**Tokens:** 6925 in / 12274 out (reasoning: 9818) | total 19199
**Wall:** 155.8s

---

# GLM 5.3 — Round 7 — Full-spectrum pass: correctness, security, schema truth, and the 8 acceptance criteria line by line

The round-6 block is substantively the strongest ruling so far. I ran it against my remit — every one of the 8 packet constraints, every cited anchor re-verified against the packet — and it fails three tests it must pass before round 9: it carries **wrong line anchors in its own fix instructions**, its flagship F4 contract **omits the "recoverable" clause of constraint 2**, and its F4 provenance field is **client-forgeable as specified**. Carrying one REJECT-plus-correction and one new MAJOR: DISPUTE.

## 1. The 8 acceptance criteria, line by line, against the block

| # | Constraint (packet header) | Block coverage | Ruling |
|---|---|---|---|
| 1 | Least-privilege for health/training/identity/history | F2 per-router probes + F3 server-resolved client set | Covered, ceilings unproven = residual (a). Adopt. |
| 2 | Client scope "explicit, server-validated, observable, **and recoverable**" | Explicit: F3 collapse of `targetUserId` (aiChatRoutes.mjs:308-344) + `selectedClientId` (aiCommandRoutes.mjs:111-145) into one server-issued context token. Validated: clientResolver.mjs:110-166 admin existence+tenant fix. Observable: F4 receipts. Recoverable: **ABSENT** — see F14. | Partial. |
| 3 | Memory is not domain truth | C6 (offline queue never AiConversation.messages, AiConversation.mjs:24-83) + F4 + the packet's own receipt-boundary admission (AiCommandAuditLog.mjs:24-91: no `action_id`, no unique idempotency key) | Covered. Adopt. |
| 4 | No success UI before authoritative write | F4 receipt-gated render; aiWorkoutEvents.ts:121-128 boolean never maps to success; N2/N3 failure states + F13 try/catch | Covered. Adopt. |
| 5 | Server-enforced entitlement | F2 probe-and-block per router + clientResolver fix | Covered pending probes. Adopt. |
| 6 | Offline/degraded gym-floor story | C6 mandate + residual (b) honesty that no queue/idempotency code exists | Covered as mandate; **replay-dedup hole** — see N5. |
| 7 | React/TS, tokens, 44px, WCAG, QA | C7 deferral to blueprint items 5+8; all excerpts TS/TSX; no citable defect | Adopt deferral. |
| 8 | Ox Alpha process constraint | Not code-reviewable | Nothing to add. |

Constraint 2 is the break. The packet's own questions (#5: "confirmation, **undo**, cancel, and receipts") and behavior spec ("undo/correction paths") demand reversal semantics. The consensus F4 status machine `draft→pending_confirm→applied|denied|cancelled|failed` terminates at `applied` with no exit. AiCommandAuditLog.mjs:24-91 records `outcome` with zero reversal/compensation linkage. Implemented as written, F4 ships receipts for catastrophic-class wrong-client mutations that are observable but **not recoverable** — the exact failure mode the owner declared non-negotiable. This is precisely the false-unification-class defect round 10 exists to catch; better to catch it in round 7.

## 2. New findings

**F14 (MAJOR) — unrecoverable action contract.** WHAT: per-capability reversibility class. WHERE: F4/N1 spec, landing in blueprint item 6 (state machines). HOW: N1 dispatcher registry declares `reversible | compensable | irreversible` per capability; reversible/compensable actions gain `applied→reversal_requested→reversed` transitions keyed to the original `action_id`; irreversible capabilities are confirm-gated by default and their receipts carry `irreversible=true` so the UI must render undo-unavailable rather than silence. Evidence: packet constraint 2 and Q5 vs F4 enum; AiCommandAuditLog.mjs:24-91 (outcome-only).

**F15 (MINOR) — forgeable provenance.** AITerminalPanel.tsx:116-139 passes the caller-built `requestContext` verbatim into `sendMessageWithConversation`. F4's provenance field (`chat|command|workout-bridge`) is therefore client-assertable unless derived server-side; a forged provenance poisons the audit receipt — the one artifact constraint 3 makes truth. Fix: provenance is assigned **by the server at dispatch resolution** — route lane yields chat|command, dispatcher-registry identity yields workout-bridge — and client-supplied provenance keys are stripped at the route boundary (aiChatRoutes.mjs:308-344, aiCommandRoutes.mjs:111-145). Fold into N1's schema-validation scope.

**N5 (NOTE) — idempotency key origination.** F4's `UNIQUE(idempotency_key)` cannot dedupe C6 offline replays if the key is minted per send attempt. Mint the key on-device at intent creation (AITerminalPanel.tsx:116-139 is the send site; AiCommandAuditLog.mjs:24-91 shows no key field exists today) and reuse it across retries.

## 3. REJECT — F2's line anchors (substance adopted)

The packet's Evidence Gate refresh — explicitly marked **canonical** and stated to "govern" — pins the AI-lane mounts at `routes.mjs:630-634` (spike :630, chat :631, command :632, hermes :633, debate :634) and **intake/proposals at :378-379**. The block cites :625/:626/:627/:632/:633 (putting command's line on hermes) and calls intake/proposals "mounts unexcerpted" — falsified by the canonical table. The bad anchors appear copied from the appendix excerpt header (:625-634) that the refresh superseded. Unchecked, round 9's blueprint and the builder's probe list (package item 2) point at wrong lines. F2's substance — probe every enumerated router, block ungated write capability — stands; anchors corrected.

## 4. Verified adoptions

F3 (delete clientId args at AITerminalPanel.tsx:119/:133; context-token collapse; clientResolver admin tenant check), F5, F6, F13, F7/F8/F9/F12 probe list, N2/N3, C6, the struck F10/F11, C8-as-trusted, C7 deferral, and residual risks (a)-(g) — re-checked against cited lines; no contradiction located. One schema-truth clarification for the record: "packet has zero schema" overstates — AiConversation.mjs:24-83 and AiCommandAuditLog.mjs:24-91 are model field definitions; what's absent is DDL/migration proof of constraints. F4's probe target is the migration layer, residual (f)'s is the write-SQL excerpt.

=== VERDICT ===
status: DISPUTE
confidence: 91
findings: F14=MAJOR: F4 receipt contract: packet constraint 2 requires scope actions "recoverable" and Q5 mandates undo, but the F4 machine draft→pending_confirm→applied|denied|cancelled|failed has no exit from applied and AiCommandAuditLog.mjs:24-91 records outcome with no reversal linkage — F4 as written ships unrecoverable catastrophic-class mutations | F15=MINOR: AITerminalPanel.tsx:116-139 passes caller-built requestContext verbatim, making F4's provenance field client-forgeable — assign provenance server-side at dispatch resolution (route lane + N1 dispatcher identity), strip client provenance keys at aiChatRoutes.mjs:308-344 and aiCommandRoutes.mjs:111-145 | N5=NOTE: mint idempotency_key on-device at intent creation (AITerminalPanel.tsx:116-139) and reuse across retries, else F4 UNIQUE(idempotency_key) cannot dedupe C6 offline replays
rebuttals: F2=REJECT anchors-only: canonical Evidence Gate refresh pins mounts at routes.mjs:630-634 (spike 630/chat 631/command 632/hermes 633/debate 634) and intake/proposals at :378-379 — block's :625/:626/:627/:632/:633 and "mounts unexcerpted" are wrong per the governing table; substance adopted with corrected anchors | F3=AGREE | F4=AGREE extended per F14/F15 | F5=AGREE | F6=AGREE | F13=AGREE | F7/F8/F9/F12=AGREE | N1=AGREE absorbs F15 | N2=AGREE | N3=AGREE | C6=AGREE amended per N5 | F10/F11-strike=AGREE | C7=AGREE | C8=AGREE
open: Q1=is F14 reversibility blueprint-blocking (item 6) or per-slice acceptance? | Q2=seats confirm refresh anchors :630-634/:378-379 govern over appendix header :625-634 | Q3=probe useAIChat.ts:217,425,448 for existing send-failure wrapping (residual g) | Q4=any seat holding out-of-packet evidence of existing undo/compensation would void F14 — produce it or accede
consensus_block: AMENDED CANDIDATE (dispute carried on F2-anchors/F14/F15/N5): ADOPT the round-6 block verbatim — all fixes (F2,F3,F4,F5,F6,F13,N1,N2,N3,C6), accepted-as-intentional items (F7/F8/F9/F12 admissions, F10/F11 struck, C8 trusted-not-verified, C7 deferral), residual risks (a)-(g) — PLUS: (1) F2 anchors corrected to routes.mjs:630-634 and :378-379 per the canonical refresh; intake/proposal mounts are cited, not unexcerpted. (2) F14 — N1 registry declares reversibility class reversible|compensable|irreversible per capability; reversible/compensable gain applied→reversal_requested→reversed keyed to original action_id; irreversible capabilities confirm-gated by default with receipt irreversible=true and UI rendering undo-unavailable; lands in blueprint item 6. (3) F15 — provenance assigned server-side at dispatch resolution; client-provided provenance keys stripped at route boundaries; absorbed into N1 validation scope. (4) N5 — idempotency_key minted on-device at intent creation and reused across retries so UNIQUE dedupes C6 replays; lands with F4/C6 in items 3/6/7. (5) Residual risk (h) added: until F14 lands, no packet path provides post-applied recovery for wrong-client writes.
=== END-VERDICT ===
