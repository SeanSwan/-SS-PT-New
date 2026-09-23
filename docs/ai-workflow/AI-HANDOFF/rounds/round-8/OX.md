# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-8\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7132 in / 4505 out · **Cost:** ~$0.0000 · **Wall:** 199.8s · **finish:** stop

---

# Round 8 — Ox Alpha (fresh-eyes adversarial)

## What the other seats structurally miss

Seven rounds have converged on *prevention* contracts: entitlement gates (F2), server-resolved scope (F3), idempotency + CAS status machine (F4), dispatcher gating (N1). Every one of these is a **write-prevention** mechanism. What the packet's own constraints demand — and what no seat has closed — is **post-write recovery**. The running state still carries it as unresolved, and the round-8 consensus candidate silently fails to close it:

**The consensus F4 receipt contract does not contain a single reversal field.** Read the contract as written: `{action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE, provenance, status enum}`. The CAS machine `draft→pending_confirm→applied|denied|cancelled|failed` prevents double-execution — it does nothing for an action that has already landed `applied` against the wrong client. Packet constraint #2 states wrong-client mutation must be "**recoverable**"; debate question #5 demands "confirmation, **undo**, cancel, and receipts." The packet's own unresolved finding (`AiCommandAuditLog.mjs:24-91` "records outcome with no reversal linkage") is carried into round 8 and the proposed fix drops the exact property the finding names. F4-as-written therefore still ships unrecoverable catastrophic-class mutations; the unresolved item is not resolved by adoption, it is laundered.

**Fix (WHAT/WHERE/HOW):** extend the F4 receipt contract with `reversal_of` (nullable action_id), `reversed_by` (nullable action_id), `reversibility_class` ∈ {undoable, compensated_only, irreversible}, and `undo_deadline`. Storage: same receipt store as F4, with the FK/unique pair `(action_id)` unique on the receipt row and `reversed_by` constrained to reference an existing receipt of capability class `undo`. For `compensated_only` families (e.g., notification sends, external calls), require a compensating-action record referencing the original `action_id`; for `irreversible` families, the confirm step at `useCoachCommand.ts:207` (`/api/ai-command/confirm`) must present irreversibility before the write, and the UI success render gate (AITerminalPanel renders success only on receipt) must display the no-undo state. This slots into the already-agreed F4 storage change — no new subsystem.

Second gap, smaller and locatable: **rate-limit parity is evidenced on exactly two lanes.** `aiChatRoutes.mjs:466` (subscription/rate-limit/PII) and `aiCommandRoutes.mjs:110` (rate limit) show it; `coachProposalRoutes.mjs:15-16` shows only `protect` + authorization; `hermesRoutes.mjs:43,90,127,142` show only `protect` + ownership guard; `aiDebateRoutes.mjs:54` shows only `protect` + trainer/admin guard. Three authenticated write-capable lanes with no cited throttling is an unprobed abuse surface (debate spawns async jobs; proposals trigger apply services). Fold into the F2 probe list: rate-limit presence per router, not just entitlement middleware.

Everything else in the candidate I adopt: F2 router enumeration, F3 server-resolved clientId deletion at `AITerminalPanel.tsx:119,133` and the `clientResolver.mjs:110-166` existence+tenant hardening, F5 spike-lane flagging, F6 re-coercion effect, F13 try/catch, N1–N3, C6, and the accepted-intentional set including F10/F11 struck and residual risks (a)–(g).

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F14=MAJOR: AiCommandAuditLog.mjs L24-91 + consensus-F4 contract: receipt schema contains no reversal linkage (reversal_of/reversed_by/reversibility_class/undo_deadline); CAS machine blocks double-apply but leaves applied wrong-client mutations unrecoverable, violating packet constraint #2 "recoverable" and Q5 undo contract — the round-7 unresolved finding survives F4-as-written | F15=MINOR: coachProposalRoutes.mjs L15-16, hermesRoutes.mjs L43/90/127/142, aiDebateRoutes.mjs L54: excerpts cite only protect+authorization, no rate-limit middleware, versus aiChatRoutes.mjs:466 and aiCommandRoutes.mjs:110 which have it — three authenticated write-capable lanes with unproven throttling
rebuttals: F4=REJECT: the proposed receipt contract and CAS machine prevent duplicate execution but omit every reversal field; adopting it verbatim closes the idempotency half of the unresolved finding while abandoning the reversal-linkage half the finding explicitly names | F2=AGREE with amendment: extend probe list to rate-limit parity per router, not entitlement alone | F13=AGREE | F3=AGREE | F5=AGREE | F6=AGREE | N1=AGREE | C6=AGREE
open: Q1=which seat owns the reversibility classification per capability family (undoable vs compensated_only vs irreversible) and its acceptance criteria in package item 9 | Q2=is absent rate-limiting on proposals/hermes/debate intentional for internal operator lanes or a defect requiring middleware parity
consensus_block: DISPUTE RULING — adopt the round-8 consensus candidate verbatim EXCEPT F4, which is amended before adoption: receipt contract gains reversal_of (nullable), reversed_by (nullable, FK to an undo-class receipt), reversibility_class ∈ {undoable, compensated_only, irreversible}, undo_deadline; confirm handler at useCoachCommand.ts:207 surfaces irreversibility pre-write for irreversible families; AITerminalPanel success render (receipt-gated) displays no-undo state for irreversible and compensated_only classes; compensating-action records required for compensated_only families, keyed to original action_id. F2 probe list extended with rate-limit parity for /api/coach/proposals, /api/hermes, /api/ai/debate. All other fixes, accepted-intentional items, and residual risks (a)-(g) stand unchanged; residual risk (h) added: until F14 lands, any applied wrong-client mutation remains unrecoverable by design, so F14 is must-fix-before-build, not per-slice.
=== END-VERDICT ===
