# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-10\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6828 in / 3815 out · **Cost:** ~$0.0000 · **Wall:** 123.4s · **finish:** stop

---

# Ox Alpha — Round 10, Fresh-Eyes Adversarial

The consensus candidate is substantively sound on F1–F6, but it fails as an *integrated* ruling: it silently drops two running-state items, and its flagship fix (idempotency) is specified in a way that cannot pass its own acceptance criterion. I carry one REJECT and two new MAJORs — status is DISPUTE, with amendments ready to absorb.

## Findings

**F1 (MAJOR) — The candidate silently drops the workout-event receipt-contract MAJOR.**
Running state (rounds answered: 9) explicitly carries: *"aiWorkoutEvents.ts L121-128 dispatcher boolean has no receipt contract; success-shaped return lets UI assert saved off a browser ack, violating constraints 3/4 — running-state item the candidate dropped silently."* The candidate's fix set (F1–F6) and residual risks contain zero references to `frontend/src/utils/aiWorkoutEvents.ts` or the Workout Logger terminal bridge. Packet evidence stands: `aiWorkoutEvents.ts:121-128` returns only a dispatcher boolean; the packet itself states "the panel must not infer a committed workout write from this event acknowledgement" and constraint 4 forbids UI claiming saved before authoritative verification. A final package that ships without a receipt/verification contract for this bridge certifies a known constraint violation. This is exactly the false-unification class Round 10 exists to catch.

**F2 (MAJOR) — Fix F1 as written cannot satisfy acceptance criterion 1.**
Criterion 1: "duplicate command POST returns original receipt and no new row." Three defects in the fix spec:
1. `backend/models/AiCommandAuditLog.mjs:24-91` records actor, role, resolved target, operation ID, outcome, error code, param hash/redaction, duration — **no receipt/response payload storage**. An audit row cannot "return the original receipt"; the fix needs a receipt store (or a receipt-payload column) keyed by the idempotency key. The packet's own boundary section confirms: "the required authoritative action receipt and retry/idempotency contract remain **unproven**."
2. A bare client-generated UUID is forgeable and retry-hostile: a buggy or malicious client mints a fresh key per attempt and dedup never fires. The key must be bound server-side to (actor, operation family, parameter hash) — the param-hash field already exists at L24-91 and is unused by the fix.
3. "Enforce insertion idempotency" without specifying upsert/`ON CONFLICT DO NOTHING`-then-select semantics leaves the check-then-insert race wide open under concurrent duplicate POSTs — precisely the retry scenario the fix targets.

**F3 (MINOR) — Residual-risk list omits two carried items.**
(a) `SwanCoachAssistantPage` deletion/build risk: running state carries "deletion without test-plan slice breaks build"; packet classifies it "legacy but still referenced … referenced by its own tests." The candidate's residuals say nothing about the test-plan slice required before retirement. (b) Intake/proposals per-client scoping: `routes.mjs:378-379` mounts both lanes; `coachIntakeRoutes.mjs:23-33` shows role gates but the probe table itself lists retention/purge and intake-to-proposal identity as unproven — absent from residuals while debate/hermes lanes are named.

**F4 (MINOR) — Identifier-vocabulary drift left unrepaired.**
Running state carries the four-way drift: `AiConversation.mjs:24-83` `targetUserId` vs `aiCommandRoutes.mjs:111-145` `selectedClientId` vs `aiDebateRoutes.mjs:57-76` `clientId` vs `AITerminalPanel.tsx:116-139` `clientId`. Fixes F5/F6 patch authorization per lane but preserve four names for one concept — the exact substrate for the next wrong-client bug. The blueprint's "context keys" deliverable (Required final package §3) must mandate one canonical target-client key; the candidate never says so.

## Rebuttals to candidate
- REJECT the candidate's implicit completeness claim (it presents as "the integrated ruling" while dropping F1 above and the residuals in F3). Everything else — F1's idempotency direction, F2's `buildChatParams`, F3 dormancy, F4 mount range, F5/F6 scope enforcement — AGREE with the amendments below.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: candidate drops the carried receipt-contract MAJOR (dispatcher boolean treated as save-proof violates constraints 3/4); final package ships a known violation | F2=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: Fix F1 cannot meet acceptance criterion 1 — no receipt-payload storage, unbound forgeable client UUID, unspecified upsert semantics leave concurrent-duplicate race | F3=MINOR: consensus-candidate residual-risks: omits SwanCoachAssistantPage test-plan slice (build break on deletion) and intake/proposals per-client scoping probe (routes.mjs L378-379, coachIntakeRoutes.mjs L23-33) | F4=MINOR: backend/models/AiConversation.mjs L24-83 vs aiCommandRoutes.mjs L111-145 vs aiDebateRoutes.mjs L57-76 vs AITerminalPanel.tsx L116-139: four names for target-client identity preserved by F5/F6; blueprint must mandate one canonical context key
rebuttals: F1=REJECT: candidate claims integrated-ruling status while silently dropping a running-state MAJOR with direct packet evidence (aiWorkoutEvents.ts L121-128, constraint 4 language in packet) | F2=REJECT: fix-as-specified is unfalsifiable against its own criterion 1 given the L24-91 schema excerpt | F3=AGREE-with-amendment | F4=AGREE-with-amendment | F5=AGREE | F6=AGREE
open: Q1=who owns the receipt-store schema (new table vs AiCommandAuditLog extension) and its retention policy | Q2=does the offline queue derive idempotency keys device-side (sync-stable across retries) or server-side | Q3=which slice retires SwanCoachAssistantPage tests without breaking the build
consensus_block: Adopt candidate F1–F6 WITH AMENDMENTS: (A) Restore the workout-event receipt contract as Fix F7: aiWorkoutEvents.ts L121-128 dispatch must return/attach a pending-intent ID; logger bridge may not surface "saved" until a server receipt from /api/ai-command or the workout write lane verifies the mutation; add acceptance criterion (6): UI save-assertion test fails when only the browser ack is present. (B) Amend Fix F1: extend AiCommandAuditLog.mjs L24-91 (or sibling receipts table) with commandIdemKey UNIQUE + stored receipt payload; bind uniqueness server-side to (actorId, operationId, parameterHash — hash field already at L24-91); implement insert-first upsert (ON CONFLICT DO NOTHING → select original row) so concurrent duplicates resolve to one row; acceptance criterion 1 unchanged. (C) Add residual risks: SwanCoachAssistantPage retirement requires a test-plan slice before any deletion (build contract); intake (coachIntakeRoutes.mjs L23-33) and proposal (coachProposalRoutes.mjs L15-16, handlers L30-54) lanes need per-client scope probes equal to F5/F6. (D) Blueprint deliverable §3 must define ONE canonical target-client context key replacing targetUserId/selectedClientId/clientId drift, with a mapping shim per lane. All five original acceptance criteria retained verbatim.
=== END-VERDICT ===
