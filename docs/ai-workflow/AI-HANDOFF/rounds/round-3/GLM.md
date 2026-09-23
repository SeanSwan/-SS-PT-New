# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-3\REVIEW-DOC.md
**Tokens:** 6855 in / 14780 out (reasoning: 11611) | total 21635
**Wall:** 162.3s

---

# GLM 5.3 — Round 3 — Full-Spectrum Hostile Review (correctness / security / schema truth / 8 criteria line-by-line)

## 1. Citation audit of the round-2 candidate (before adopt/reject)

Every load-bearing citation in the candidate was re-checked against the packet:

| Candidate claim | Packet evidence | Result |
|---|---|---|
| F3 caller-supplied clientId at `AITerminalPanel.tsx:119,133` | Excerpt `AITerminalPanel.tsx:116-139`, two `sendMessageWithConversation` calls passing `clientId \|\| null` | VERIFIED |
| F3 server-side collapse `aiChatRoutes.mjs:308-344` / `aiCommandRoutes.mjs:111-145` | Refresh probes table: `targetUserId` accepted for admin/trainer at `:308-344`; `selectedClientId` accepted at `:111-145` | VERIFIED |
| F3 `clientResolver.mjs:110-166` admin role-only | Refresh: "scopes trainers but not admins beyond role" | VERIFIED |
| F4 `AiCommandAuditLog.mjs:24-91` has no `action_id`/idempotency key | Refresh "Receipt and idempotency boundary" states exactly this | VERIFIED |
| F4 `aiWorkoutEvents.ts:121-128` boolean-only dispatch | Excerpt confirms | VERIFIED |
| F6 one-shot `useState` coercion | `CoachCommandCenterPage.tsx:34-43`: `useState(() => coerceCoachTabForRole(initialTab, userRole))` — initializer never re-runs on role/param change | VERIFIED |
| F2 route anchors `625/626/627/632/633` | **CONTRADICTED — see F13 below** | FAILS |

## 2. REJECT — F3 fix is under-scoped and leaves the canonical surface exposed

The candidate's fix reads: *"delete clientId argument from sendMessageWithConversation call sites at AITerminalPanel.tsx:119 and :133."*

The packet's own canonical-surface receipt table states: **"`CoachCommandCenter.actions.ts:203-204` calls `sendMessageWithConversation`"** — classified **canonical**, i.e., the exact surface the blueprint targets first (`CoachCommandCenterPage` → controller → actions). The fix as written patches the shared panel and leaves the flagship path still transmitting a client-claimed `clientId`. Worse, the packet's Evidence boundary admits *"This packet does not claim every existing AI consumer is mapped"* — so a hardcoded two-site enumeration is unsound on the packet's own terms.

**Endorsed fix (engineer form):**
- **WHAT:** exhaustive call-site de-clientId-ing. **WHERE:** repo-wide. **HOW:** (a) grep-probe `sendMessageWithConversation(` across `frontend/src`; (b) minimum enumerated set = `AITerminalPanel.tsx:119,133` **+ `CoachCommandCenter.actions.ts:203-204`**; delete the `clientId` argument at every hit; (c) signature takes only the server-issued context token (already in F3); (d) CI grep gate failing the build if any call site passes a client-claimed id. The probe result list enters final package item 2.

I REJECT the F3 fix as scoped; I AGREE with the F3 finding itself and its server-side collapse.

## 3. New findings

**F13 (MINOR — evidence/schema-truth integrity): the packet contradicts itself on route anchors, and the candidate mixes both schemes.** The excerpt is labeled `backend/core/routes.mjs:625-634`; the Evidence gate refresh says "`routes.mjs:630-634` mounts stream-spike, chat, command, Hermes, and debate" and separately "Mount `routes.mjs:630`" for the spike. The candidate cites spike=625/chat=626/command=627 (excerpt scheme) but hermes=632/debate=633 (refresh scheme, off by one) — internally inconsistent for one consecutive five-line block. **Fix:** one probe re-pins the anchor table (mounts + intake `:378` / proposals `:379` per refresh); every final-package citation re-based to the verified anchors; F2's probe list survives with corrected anchors.

**F14 (MINOR — schema truth): `AiConversation.mjs:24-83` stores embedded `messages` AND separate `messageCount`/`lastMessageAt` — dual-write drift.** If appends are not transactional/derived, count and timestamp can diverge from the array (and from `useAIChat.ts:217,425,448`'s posted messages). Write-path SQL is unexcerpted (residual (f) already flags the lost-update race). **Fix:** extend the (f) probe to prove `messageCount`/`lastMessageAt` are derived or maintained in the same transaction as the append; otherwise blueprint item 6 mandates derived projections.

**F15 (MINOR — security): `AiConversation.mjs:24-83` `metadata` is caller-influenced free-form JSON adjacent to `targetUserId`.** F3's server-issued context token must be minted per-request from the authN session + resolved client set and stored server-side keyed by actor/session — **never** read from or persisted into `AiConversation.metadata`, or client-claimed data launders into "server-issued" state. **Fix:** declare `metadata` inert to authorization in blueprint item 6's context-lifecycle contract.

## 4. Endorsed amendments (sharpenings, not rejections)

- **F4 + reversal:** owner constraint 2 requires "recoverable" and question 5 requires "undo"; the candidate's status machine `draft→pending_confirm→applied|denied|cancelled|failed` has no reversal. Add optional `reversal_of_action_id`/`reversed_by` and status `applied_then_reversed` to the receipt contract.
- **C6 ↔ F4 join:** offline intents mint the F4 `idempotency_key` at creation time; server `UNIQUE(idempotency_key)` makes replay-after-reconcile dedupe by construction. Client may generate the key for dedupe only — never as capability.
- **C7 named probe:** before blueprint items 5+8 sign-off, grep `CoachCommandCenterPage.tsx:149+` (JSX shell begins at `:149` per refresh) and `AITerminalPanel.tsx:116-139` region for styled-components usage and 44px/min-height/contrast tokens. Without this, constraint 7 has zero citable evidence either way — C7's deferral is correct but must be probe-anchored, not open-ended.

## 5. The 8 acceptance criteria, line by line (seat remit)

| # | Constraint | Packet evidence | Consensus coverage | Ruling |
|---|---|---|---|---|
| 1 | Least-privilege | `protect` on all six lanes (refresh probes table); hermes `hermesRoutes.mjs:43,90,127,142` admin/trainer guard; debate `aiDebateRoutes.mjs:54` | F2 probe matrix; F3 closes `clientResolver.mjs:110-166` admin role-only gap | PROBE-GATED; known gap closed by F3 fix |
| 2 | Wrong-client mutation explicit/server-validated/observable/**recoverable** | `AITerminalPanel.tsx:119,133` caller clientId; `aiChatRoutes.mjs:308-344`; `aiCommandRoutes.mjs:111-145` | F3 — fix under-scoped (my REJECT); "recoverable" missing from F4 | FIX REVISED (§2, §4) |
| 3 | Memory ≠ domain truth | `AiConversation.mjs:24-83` embedded messages; `AiCommandAuditLog.mjs:24-91` not a receipt; `aiWorkoutEvents.ts:121-128` boolean | F4 + C6 + residual (f) | COVERED; F14 sharpens schema truth |
| 4 | No success before authoritative write | Refresh: receipt/idempotency contract "unproven and must be designed"; no excerpt shows a current false-success render | F4 render-on-receipt gate | DESIGN GATE; no citable current violation — stated honestly |
| 5 | Server-enforced entitlements | Refresh rows for intake `:23-25`, proposals `:15-16`; mounts `:378-379` | F2 cross-client read/write matrix by role | PROBE-GATED |
| 6 | Offline/degraded gym floor | **Zero offline code in packet** | C6 net-new + residual (b) | NET-NEW DESIGN; blocking for slice 1; sharpened with F4 key join |
| 7 | React/TS, tokens, 44px, WCAG | All excerpts TS/TSX; no styled-components/size/contrast evidence either way | C7 defer | UNPROVEN; named probe added (§4) |
| 8 | Ox Alpha canary redaction | Process constraint | C8 trusted-not-verified | PROCESS GATE; carried |

## 6. Running-state items

Both unresolved items are preserved, not settled by opinion: (a) owner names **four** dashboards; mounts exist for **three** (`UniversalDashboardLayout.routes.tsx:98,177,203`) — the "user" surface has zero mount evidence and needs a route-tree probe or an explicit merge-with-client declaration (F8); (b) `SwanCoachAssistantPage` — the refresh's "legacy but still referenced, no route-tree mount found" is adopted as **provisional** classification; retirement/migration decision stays with blueprint item 7, and the page must not be touched during evidence passes (refresh's own instruction). Residual risk (d) (artifact identity) is narrowed by the 2026-08-23 refresh but retained until the builder pins the same commit.

=== VERDICT ===
status: DISPUTE
confidence: 93
findings: F13=MINOR: routes.mjs excerpt L625-634 vs refresh L630-634 contradict on the same 5 mounts; consensus F2 mixes both schemes (spike/chat/command=625-627 excerpt scheme, hermes/debate=632-633 refresh scheme, off-by-one) — anchor truth must be probed and all citations re-based | F14=MINOR: AiConversation.mjs L24-83 embedded messages plus stored messageCount/lastMessageAt is a dual-write drift hazard; write-path SQL unexcerpted | F15=MINOR: AiConversation.mjs L24-83 metadata is caller-influenced JSON and must never source or store the F3 server-issued context token
rebuttals: F3=REJECT(fix-scope): fix deletes clientId only at AITerminalPanel.tsx L119,L133 while the refresh canonical table names CoachCommandCenter.actions.ts L203-204 as a sendMessageWithConversation call site — the canonical surface keeps transmitting client-claimed clientId; packet Evidence boundary admits AI consumers are not fully mapped, so a 2-site enumeration is unsound | F2=AGREE pending F13 anchor re-pin | F4=AGREE +add reversal_of_action_id/reversed_by and status applied_then_reversed per constraint-2 "recoverable" | F5=AGREE | F6=AGREE | F7/F8/F9/F12=AGREE as probes | N1/N2/N3=AGREE | C6=AGREE +offline intents mint the F4 idempotency_key at creation; UNIQUE dedupes replay | C7=AGREE +named probe CoachCommandCenterPage.tsx L149+ for styled-components/44px/contrast tokens | C8=AGREE | F13=NEW | F14=NEW extends residual (f) | F15=NEW
open: Q1=which routes.mjs anchor set is truth (625-629 vs 630-634) — probe re-pins, then re-base every final-package citation | Q2=owner names 4 dashboards, 3 mounts exist — does a user surface mount outside UniversalDashboardLayout.routes.tsx, or is user formally merged into client | Q3=AiConversation append SQL — transaction/version covering messages+messageCount+lastMessageAt (F14, residual f) | Q4=repo-wide sendMessageWithConversation call-site grep result (minimum adds CoachCommandCenter.actions.ts L203-204)
consensus_block: AMENDED CANDIDATE (round-2 ruling carried except as amended; conditional on F3-scope rejection being accepted): F3 fix amended — (1) enumerate sendMessageWithConversation call sites by repo grep, minimum set AITerminalPanel.tsx:119,133 + CoachCommandCenter.actions.ts:203-204, delete clientId argument at every hit; (2) CI grep gate banning client-claimed ids at any call site; (3) context token minted per-request server-side from authN session + resolved client set, never stored in or read from AiConversation.metadata (F15). F4 amended — receipt gains optional reversal_of_action_id/reversed_by + status applied_then_reversed (constraint 2 "recoverable", question 5 "undo"); all other F4 terms unchanged incl. UNIQUE(idempotency_key) and CAS status machine. C6 amended — offline intents carry the F4 idempotency_key from creation; server UNIQUE dedupes replay; client-generated keys are dedupe-only, never capability. C7 amended — named probe: CoachCommandCenterPage.tsx:149+ JSX and AITerminalPanel.tsx:116-139 region grepped for styled-components + 44px/min-height/contrast tokens, feeding blueprint items 5+8. NEW F13 — anchor-truth probe re-pins routes.mjs mount lines (excerpt 625-634 vs refresh 630-634) plus intake :378 / proposals :379; all final-package citations re-based; F2 probe list survives with corrected anchors. NEW F14 — write-SQL probe must prove messages append + messageCount/lastMessageAt are transactional or derived; else blueprint item 6 mandates derived projections. NEW F15 — AiConversation.metadata declared inert to authorization in context-lifecycle contract. ALL OTHER round-2 fixes, acceptances-as-intentional, and residual risks (a)-(f) carried unchanged, including C8 redaction unverified, offline net-new design, client event bus unauthenticated until N1, and artifact-identity risk (d) narrowed by the 2026-08-23 refresh but retained until commit pin.
=== END-VERDICT ===
