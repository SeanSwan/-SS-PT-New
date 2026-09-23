# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-5\REVIEW-DOC.md
**Tokens:** 6831 in / 13116 out (reasoning: 10187) | total 19947
**Wall:** 154.5s

---

# GLM 5.3 — Round 5: Full-spectrum audit (correctness / security / schema truth / the 8 constraints line by line)

## §0 Stance on the consensus candidate

I adopt F1–F11, both "accepted as intentional" rulings, and the residual-risk paragraph verbatim, with three amendments: one scope fix to F3 (§4.1), one extension to F5 (§4.2), and **two restorations** — F12 and F13 — which were live in the running state and were silently dropped from the candidate without a fix slot or an "accepted as intentional" classification. Per rule 3 that puts me in DISPUTE, carried solely on those two items. Both land squarely in my remit (schema truth; safety contract).

---

## §1 The 8 non-negotiable constraints, line by line, against packet evidence

| # | Constraint | Packet evidence | Consensus coverage | Verdict |
|---|---|---|---|---|
| C1 | Least privilege on health/identity data | Lane-level auth everywhere: `aiChatRoutes.mjs:283` (protect) + `:466` (subscription/rate/PII); `aiCommandRoutes.mjs:110`; `coachIntakeRoutes.mjs:23-25`; `coachProposalRoutes.mjs:15-16`; `hermesRoutes.mjs:43,90,127,142`; `aiDebateRoutes.mjs:54`. But the packet's own probe row for `/api/ai-command` says "server entitlement behavior for every command family is not yet proven." | F2 registry + cross-client matrix probe | **Covered by F2** — per-method entitlement is the open half. |
| C2 | Wrong-client mutation catastrophic; scope explicit/server-validated/observable/recoverable | Trainer scoping exists: `clientResolver.mjs:110-166`, `aiChatRoutes.mjs:610-625`. Admin unbounded. `AiCommandAuditLog.mjs:24-91` records resolved target client. | F3 + admin-accepted-if-policy | **Covered by F3, condition in §4.3. "Recoverable" is NOT covered — see F13: no incident-halt control on the proposals mutation lane.** |
| C3 | Conversation/AI memory is not domain truth | `AiConversation.mjs:24-83` is the packet's own "authoritative model"; `aiWorkoutEvents.ts:121-128` returns a browser dispatcher boolean; `AiCommandAuditLog.mjs:24-91` has no idempotency key (packet states this directly). | F1 receipts; residual risk "unverifiable until F1/F3/F4 land" | **Covered by F1 for receipts — but the attribution half of C3 is additionally blocked by F12 (§2). Residual-risk list must add F12.** |
| C4 | UI cannot claim saved before authoritative write | `aiWorkoutEvents.ts:121-128` acknowledges dispatch only; no UI line in the packet maps that boolean to a "saved" state — so this is a design obligation, not a proven defect. | F1 receipt return + F4 "queued/sending/verified only" | **Covered; blueprint wireframes must make "verified" receipt-gated by name.** |
| C5 | Server-enforced entitlement | `commandExecutor.mjs:309-343` resolves IDs; no registry check cited between resolution and execution. | F2, checked post-resolution pre-execution, denial writes audit row | **Covered by F2.** |
| C6 | Degraded/offline story for gym floor | Zero offline artifacts in packet; per-message cloud POSTs at `useAIChat.ts:425,448` confirm cloud-round-trip dependency for chat. | F4 IndexedDB queue keyed by actionId; exactly-once reconcile depends on F1 | **Covered by F4; dependency ordering (F1 before F4 verification) is correct.** |
| C7 | React/TS, styled-components, dark tokens, 44px, WCAG, dual-QA | Zero artifacts in packet. | Residual risk: "carried entirely by the blueprint verification matrix" | **Adopted as NOTE. The matrix must name per-slice a11y/44px checks or C7 stays unverifiable at round 10 too.** |
| C8 | Ox Alpha receives only canary-redacted packet | Header asserts no credentials/client names; excerpts contain no contradiction. | — | **NOTE; no finding possible from inside the packet.** |

**Net: the candidate covers C1, C4, C5, C6 as well as static evidence allows. C2 has an uncovered half (F13). C3 has an uncovered half (F12).**

---

## §2 F12 (RESTORED, MAJOR) — schema truth: one row owns messages + messageCount + lastMessageAt

**WHERE:** `backend/models/AiConversation.mjs L24-83` (`messages`, `messageCount`, `lastMessageAt` on the conversation row); `frontend/src/hooks/useAIChat.ts L425,448` (per-message POST to `/api/ai-chat/conversations/${convId}/messages`).

**CLAIM:** Every append must mutate the single row that also owns the embedded array and both derived counters. Consequences: (a) concurrent appends from two tabs/devices (question 4's own scenario) contend on one row — any non-atomic update loses a message or drifts `messageCount`/`lastMessageAt` from `messages`; (b) per-message attribution of `targetUserId` is unrepresentable — `aiChatRoutes.mjs:308-344` allows admin/trainer target switching on the conversation, so one row silently mixes targets with no message-level provenance; (c) question 3's attribution/invalidation/freshness contract cannot be built on this shape. This is presence-based evidence (the fields exist at the cited lines; the POSTs exist at the cited lines) — the residual-risk "live probes required" clause for absence-based MAJORs does not apply.

This finding appears three times in the running state and received no slot in the candidate. That is a silent drop, not a ruling.

**FIX:** Split into an `AiMessage` child table keyed `(conversationId, seq)` with `role/author, content, resolvedTargetUserId, requestContext, createdAt`; conversation row keeps header fields only (`userId, role, context, targetUserId, status, metadata`), with `lastMessageAt` maintained in the append transaction and `messageCount` derived (`COUNT(*)`) or dropped. Dual-read migration (prefer table, fall back to array) so no big-bang rewrite. **Acceptance:** concurrency test — two simultaneous appends persist two rows with distinct `seq`, zero lost updates, counters consistent — attached to the verification matrix's existing concurrency row (required package #8).

---

## §3 F13 (RESTORED, MAJOR) — kill-switch parity was in the running state and fell out of the candidate

**WHERE:** `coachProposalRoutes.mjs L15-16` (middleware block: protect + admin/trainer only) and `:30-54` (approve/reject handlers — the mutation path); `coachIntakeRoutes.mjs L23-25`; `aiChatRoutes.mjs L283/466`; pattern proof at `aiCommandRoutes.mjs L110` (lane kill switch exists in this codebase) and the fail-closed `spikeEnabled` in `aiStreamSpikeRoutes.mjs`.

**CLAIM:** C2 requires client scope to be "recoverable," and question 8 requires kill-switch controls "before any UI modification or app action." The proposals lane mints domain mutations at `:30-54` and has no cited halt control; the packet's own middleware probe table documents exactly what each lane applies, and no switch is listed for chat, intake, or proposals. **Sharpest point:** F5 as written copies `aiChatRoutes.mjs:466`'s middleware family (subscription/rate/PII) into the parity gate — that family contains no kill switch — so F5's gate would certify parity of an incomplete set and pass a lane that cannot be halted during a wrong-client incident.

**FIX:** Fail-closed lane kill switch modeled on `aiCommandRoutes.mjs:110`, applied at the same middleware position as `coachProposalRoutes.mjs:15-16` and `coachIntakeRoutes.mjs:23-25`, returning `503 LANE_DISABLED`; on proposals, the switch check must precede F6's pending-row claim so a disabled lane can't half-claim. Extend F5's parity table with a kill-switch column covering all five lanes. **Acceptance:** parity table lists switch + disabled-state behavior per lane; one disabled-state test per mutation lane.

---

## §4 Amendments to adopted items

**4.1 F3 scope carve-out (AGREE-SCOPE):** `400 TARGET_REQUIRED` must apply only when role ∈ {admin, trainer} and context implies third-party scope — `aiChatRoutes.mjs:308-344` restricts target switching to admin/trainer, and client self-service is a canonical route (`UniversalDashboardLayout.routes.tsx:203` mounting `CoachCommandCenterPage`). F3 as literally written would break a canonical client route by demanding an explicit target the client cannot supply.

**4.2 F5 extension:** add the kill-switch column per §3; without it the parity gate is structurally incomplete.

**4.3 Admin-unbounded acceptance (AGREE-CONDITION):** acceptable only if (a) the blueprint's policy gate enumerates admin cross-client scope as written policy, and (b) every admin cross-client operation persists the resolved user PK into `AiCommandAuditLog.mjs:24-91`'s resolved-target fields — statically supported by the packet's audit description; probe confirms at runtime.

**4.4 AITerminalPanel null-coalescing:** `AITerminalPanel.tsx:116-139` passes `clientId || null`, which silently re-anchors to self-context on gym-floor client switches. F3's canonical identity + receipt echo covers this server-side; the blueprint must add a visible resolved-target indicator to the terminal header so the silent downgrade is at least observable.

---

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F12=MAJOR: backend/models/AiConversation.mjs L24-83: messages array + messageCount + lastMessageAt on one row; useAIChat.ts L425,448 per-message POSTs make every append a read-modify-write of that row — lost updates across tabs/devices, counter drift, no per-message targetUserId attribution (aiChatRoutes.mjs L308-344 allows mid-conversation target switching); blocks C3 attribution half and Q3 contract; running-state finding silently dropped from candidate | F13=MAJOR: coachProposalRoutes.mjs L15-16/:30-54 mutation lane has no kill switch (aiCommandRoutes.mjs L110 proves the pattern); F5's parity gate copies aiChatRoutes.mjs L466 family which contains no kill switch, so it certifies incomplete parity; violates C2 recoverability and Q8; also dropped from candidate
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE-SCOPE: TARGET_REQUIRED only for admin/trainer third-party scope (aiChatRoutes.mjs L308-344); client self-service at UniversalDashboardLayout.routes.tsx L203 keeps implicit self-target | F4=AGREE | F5=AGREE-EXTEND: add kill-switch column (F13) | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE | admin-unbounded=AGREE-CONDITION: written policy + resolved-PK audit tag per AiCommandAuditLog.mjs L24-91 | F12=RESTORE | F13=RESTORE
open: Q1=panel ruling: F12/F13 into FIX BEFORE BUILD (my vote: yes — Q3 attribution cannot be built on the current row; proposals lane needs incident halt before any UI action) or MUST-FIX PER SLICE | Q2=confirm F3 client-mode carve-out so a canonical route is not broken | Q3=Hermes/debate classification carried unchanged
consensus_block: ADOPTED EXCEPT: (1) RESTORE F12 to FIX BEFORE BUILD — split AiConversation L24-83 into header row + AiMessage child table (conversationId, seq, role, content, resolvedTargetUserId, requestContext, createdAt), counters derived/transactional, dual-read migration, concurrency acceptance test attached to verification matrix; (2) RESTORE F13 to FIX BEFORE BUILD — fail-closed kill switch per lane modeled on aiCommandRoutes.mjs L110 at coachProposalRoutes.mjs L15-16 and coachIntakeRoutes.mjs L23-25, switch check precedes F6 claim, F5 parity table gains kill-switch column with disabled-state test per lane; (3) F3 amended: 400 TARGET_REQUIRED applies only to admin/trainer third-party scope; client self-service (UniversalDashboardLayout.routes.tsx L203) keeps implicit self-target. All other candidate rulings (F1,F2,F4-F11, both intentional acceptances, residual risks) adopted verbatim, with residual risks extended: C3 attribution and C2 recoverability remain unverifiable until F12/F13 land alongside F1/F3/F4; C7 (44px/WCAG) stays zero-artifact and must be named per-slice in the blueprint verification matrix.
=== END-VERDICT ===
