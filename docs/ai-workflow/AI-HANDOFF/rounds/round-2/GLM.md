# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-2\REVIEW-DOC.md
**Tokens:** 6849 in / 12801 out (reasoning: 10004) | total 19650
**Wall:** 161.7s

---

# GLM 5.3 — Round 2: Full-spectrum audit (correctness | security | schema truth | 8 constraints line-by-line)

Round-1 ruling verified against the packet. I adopt the substance of every fix. I carry **three narrow REJECTs inside the consensus text itself** — all factual-evidence corrections, not substance disagreements — plus two new findings from the schema-truth lens. Per binding rule 3, carrying REJECTs forces DISPUTE status this round; every reject below is trivially absorbable and I name the amended text.

---

## 1. The 8 non-negotiable constraints, line by line vs the consensus

| # | Constraint | Consensus coverage | Ruling |
|---|---|---|---|
| C1 | Least-privilege | F2/F3/N1 | ADOPT |
| C2 | Client scope explicit, server-validated, **observable, recoverable** | F3/F4 cover explicit+validated+observable; **"recoverable" is missing from the F4 receipt schema** — no undo/compensation linkage, no status vocabulary for `cancelled`/`compensated`, despite `useCoachCommand.ts:96,170,207` exposing a live `/api/ai-command/cancel` endpoint with no receipt contract | ADOPT **with sharpening S1** |
| C3 | Memory/conversation ≠ domain truth | F4 + N1; but N2/N3 fix ("single explicit persistence mode") does not say which mode is the default | ADOPT **with sharpening S2** |
| C4 | No success UI before authoritative write | F4 "renders success only on receipt"; `aiWorkoutEvents.ts:121-128` boolean never maps to success | ADOPT — verified against excerpt |
| C5 | Server-enforced entitlements | F2/F3 | ADOPT with corrected anchors (REJECT-R1) |
| C6 | Offline gym-floor story | Residual risk (b): "no queue/idempotency code exists in packet" — verified, honest | ADOPT; tie to F4 idempotency (already present) |
| C7 | React/TS, tokens, 44px, WCAG, mobile QA | Deferred to blueprint items 5+8 — justified: `CoachCommandCenterPage.tsx:149` JSX shell is declared but **not excerpted**; no citable markup defect exists in packet | ADOPT deferral |
| C8 | Canary redaction for Ox Alpha | Trusted not verified — unverifiable from inside the packet | ADOPT |

No constraint is left uncovered. C2's "recoverable" is the one word the consensus ruling drops — fixed in S1 below.

## 2. Round-1 anchors I verified (adopt basis)

- **F6 verified**: `CoachCommandCenterPage.tsx:34-43` — `useState(() => coerceCoachTabForRole(initialTab, userRole))` runs the coercion exactly once; `routeForcedTabForRole(searchParams, userRole)` and `userRole` changes post-mount leave `activeTab` stale. Effect on `[userRole, searchParams]` is the correct fix. AGREE.
- **F3 verified**: `AITerminalPanel.tsx:116-139` — `clientId || null` is caller-supplied on both branches. AGREE.
- **F5 partially verified**: `aiStreamSpikeRoutes.mjs` evidence covers fail-closed `spikeEnabled` + `protect` + `adminOnly` **on `GET /` only**. No other method/route in that file is evidenced. Sharpening S3 below.
- **F1 artifact-identity residual (d)** retained as-is.

## 3. REJECTS — factual errors inside the consensus text (two-sided citations)

**R1 — REJECT F2's anchors and its "(mounts unexcerpted)" parenthetical.**
- Consensus says: mount `/api/ai-chat` at `routes.mjs:626`, `/api/ai-command` at `:627`, intake/proposals "mounts unexcerpted", hermes `:632`, debate `:633`.
- Packet says otherwise, twice: the Evidence appendix claims the AI mount block is `backend/core/routes.mjs:625-634`; the **Evidence gate refresh — which declares itself corrective** ("This refresh corrects the earlier debate-frame identity problem") states the five AI mounts are at `routes.mjs:630-634` and intake/proposals at `:378-379`.
- The refresh rows for intake and proposals read "Mount `routes.mjs:378`" / "Mount `routes.mjs:379`" — **the mounts are cited, not unexcerpted.** And the consensus's `:625/:626/:627` numbering follows the superseded appendix range, contradicting the refresh's `:630-634`.
- Amendment: F2 probe list stands; anchors become `routes.mjs:630` (spike), `:631` (chat), `:632` (command), `:633` (hermes), `:634` (debate), `:378-379` (intake/proposals) — **pending Q1 file re-read, which beats both tables.**

**R2 — REJECT F4's parenthetical "(probe — packet has zero schema)".**
- The packet contains **two excerpted schemas**: `backend/models/AiConversation.mjs:24-83` (labeled "authoritative model" in the refresh receipt table) and `backend/models/AiCommandAuditLog.mjs:24-91`.
- The packet's own "Receipt and idempotency boundary" section states the audit log "has no `action_id` or unique idempotency key." That is an **excerpt-proven schema gap**, not a zero-schema probe. What genuinely needs probing is only storage-level UNIQUE enforcement.
- Amendment: F4's idempotency finding is evidenced by `AiCommandAuditLog.mjs:24-91`; severity ceiling firms up without waiting on probes.

**R3 — REJECT the consensus's implicit claim that the packet's evidence anchors are internally consistent.** (Filed as G2 below so it survives as a tracked finding rather than a rebuttal footnote.)

## 4. New findings

**G1 = MINOR — conversation-grain `targetUserId` vs per-message `clientId` attribution mismatch.**
`AiConversation.mjs:24-83` binds `targetUserId` at **conversation** grain. `AITerminalPanel.tsx:116-139` sends `clientId` on **every** message. `aiChatRoutes.mjs:308-344` accepts `targetUserId` at creation for admin/trainer. When a trainer switches clients mid-thread, exactly one of three things happens, and each breaks something: (a) server overwrites `targetUserId` → silent re-attribution of prior messages; (b) server ignores the new `clientId` → messages filed under the wrong client (constraint 2's catastrophic class); (c) new conversation forced → the owner outcome's "conversation continuity" claim breaks. The refresh's probe row already lists "Admin/trainer/client target switching" — G1 upgrades that probe to a schema mandate.
**Fix (WHAT/WHERE/HOW):** add per-message resolved `targetClientId` to the message payload schema (`AiConversation.mjs:24-83` + messages handler); make conversation-level `targetUserId` immutable-or-derived; server stamps the resolved client per message, never trusts the panel's `clientId` (aligns with F3); probe `aiChatRoutes.mjs:308-344` and the messages endpoint write-back first.

**G2 = MINOR — packet evidence-anchor drift (schema-truth defect in the artifact under review).**
Appendix: AI mounts at `routes.mjs:625-634`. Refresh: same five mounts at `routes.mjs:630-634`. Both cannot bound the same contiguous block. Round 1 already propagated the stale set into the ruling. Under binding rule 1 ("unlocatable claims will be cut"), every downstream finding anchored on those lines is unstable until one canon wins.
**Fix:** the blueprint's probe list (package item 2) cites exactly one anchor set — the refresh's — and Q1's file re-read is recorded as the tiebreaker.

**G3 = NOTE — `AiConversation.mjs:24-83` schema hygiene trio.**
(i) `role` stored on the conversation row: read-back authorization must re-derive from live auth, never the stored role, or role changes/impersonation mint stale-privilege reads. (ii) `messageCount`/`lastMessageAt` denormalized beside embedded `messages` with no transaction evidence → counter-drift probe. (iii) `status` and `metadata` have no excerpted enum/schema — question 6's "server-response and UI-state vocabulary" has no substrate yet.
**Fix:** define the `status` enum and `metadata` schema in the blueprint's state-machine item (package item 6); mandate atomic append or derived counters; mandate live-auth re-derivation on every read-back.

## 5. Sharpenings applied on absorption (no substance change)

- **S1 (C2 "recoverable" → F4):** receipt contract gains a `reversibility` field + `undo_of` linkage; status enum fixed at `{pending, confirmed, applied, failed, cancelled, compensated}` — this also gives `/api/ai-command/cancel` (`useCoachCommand.ts:207`) its missing contract.
- **S2 (C3 → N2/N3):** the omitted-default branch of `AITerminalPanel.tsx:116-139` (non-`requestContext` call passes no persistence arg) must resolve to **no-memory-write** unless capability-gated — per constraint 3 and the packet's own intake warning against "uncontrolled permanent memory."
- **S3 (F5):** probe **every** method/route in `aiStreamSpikeRoutes.mjs`, not only `GET /` — that is the sole evidenced route; parity of the rest is assertion, not evidence.

## 6. What I need from other seats

Q1 anchor canon (R1/G2), Q2 the write-back probe that settles G1, Q3 sign-off on the F4 status enum including `compensated` (S1). Everything else: adopted, no conditions.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: G1=MINOR: AiConversation.mjs L24-83: targetUserId bound per-conversation while AITerminalPanel.tsx L116-139 sends clientId per message — mid-thread client switch silently re-attributes or misfiles messages (constraint-2 class); probe aiChatRoutes.mjs L308-344 write-back; mandate per-message resolved targetClientId + immutable conversation target | G2=MINOR: packet anchor drift — appendix cites routes.mjs L625-634 for the five AI mounts, corrective refresh cites L630-634; round-1 consensus propagated the stale set (L625/626/627); canonicalize per refresh pending file re-read | G3=NOTE: AiConversation.mjs L24-83: stored role must never gate read-back; messageCount/lastMessageAt denormalized beside embedded messages (drift probe); status/metadata have no excerpted enum/schema — define in package item 6
rebuttals: F2=REJECT: anchors stale and "mounts unexcerpted" false — refresh cites routes.mjs L630-634 for the five AI mounts and L378-379 for intake/proposals; adopt fix with corrected anchors | F4=REJECT: "packet has zero schema" false — AiCommandAuditLog.mjs L24-91 proves idempotency-key absence (only storage UNIQUE enforcement needs probe); add reversibility/undo_of + status enum {pending,confirmed,applied,failed,cancelled,compensated} to satisfy C2 recoverable | F3=AGREE | F5=AGREE with S3: evidence covers GET / only in aiStreamSpikeRoutes.mjs — probe all methods | F6=AGREE: verified CoachCommandCenterPage.tsx L34-43 useState-once coercion | F7=AGREE | F8=AGREE | F9=AGREE | F12=AGREE | N1=AGREE | N2=AGREE with S2: omitted-default branch defaults to no-memory-write per constraint 3 | N3=AGREE
open: Q1=which anchor set is canon if the file re-read disagrees with the refresh (file beats both tables?) | Q2=does the messages endpoint write clientId back into conversation targetUserId (probe aiChatRoutes.mjs L308-344 + messages handler — settles G1) | Q3=seats confirm F4 receipt enum incl. compensated + reversibility field (S1)
=== END-VERDICT ===
