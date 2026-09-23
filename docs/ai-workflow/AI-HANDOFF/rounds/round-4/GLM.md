# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-4\REVIEW-DOC.md
**Tokens:** 7123 in / 10481 out (reasoning: 7757) | total 17604
**Wall:** 115.4s

---

# GLM 5.3 — Round 4: Full-Spectrum Adjudication (correctness / security / schema truth / 8 constraints line-by-line)

## A. The 8 non-negotiable constraints, line by line against packet evidence

| # | Constraint | Governing packet evidence | Verdict | Owning item |
|---|---|---|---|---|
| 1 | Least-privilege health data | `protect` proven on all six lanes: aiChatRoutes.mjs:283; aiCommandRoutes.mjs:110; coachIntakeRoutes.mjs:23-25; coachProposalRoutes.mjs:15-16; hermesRoutes.mjs:43,90,127,142; aiDebateRoutes.mjs:54 | **PARTIAL** — authN proven, entitlement matrix unproven; sharpest gap is clientResolver.mjs:110-166 resolving admins by role only, no existence/tenant check | F2, F3 |
| 2 | Wrong-client mutation catastrophic | Three caller-supplied scope channels: AITerminalPanel.tsx:119,133 (`clientId`), aiCommandRoutes.mjs:111-145 (`selectedClientId`), aiChatRoutes.mjs:308-344 (`targetUserId`); zero server-issued binding; AiCommandAuditLog.mjs:24-91 has no `action_id` | **FAIL as coded** — the exact catastrophe vector the constraint names exists end-to-end | F3, F4, +N5 |
| 3 | Memory ≠ domain truth | AiConversation.mjs:24-83 embeds `messages` + stored `messageCount`/`lastMessageAt`; packet admits receipt/idempotency contract "unproven" | **FAIL as coded** — no receipt contract; audit log lacks action_id/idempotency key | F4, residual (f) |
| 4 | No "saved" before authoritative write | aiWorkoutEvents.ts:121-128 returns only a dispatcher boolean; AITerminalPanel.tsx:116-139 shows a send path with no receipt gate | **FAIL as coded** — the boolean is the only workout-bridge acknowledgement | F4 |
| 5 | Server-enforced roles, not shell | CoachCommandCenterPage.tsx:34-43 role logic is client-side; server middleware present per lane but matrix unproven | **PARTIAL** — client role logic is UX-only (acceptable); F6 is client correctness, not security | F2, F6 |
| 6 | Degraded/offline gym-floor | useAIChat.ts:217,425,448 — the sole message path is cloud POST; no queue/idempotency code exists (residual risk b) | **FAIL/ABSENT** — constraint violated by construction; not merely "deferred" | C6, +N7 |
| 7 | React/TS, tokens, 44px, WCAG, QA | All excerpts TS/TSX; zero 44px/WCAG/styled-components evidence in packet | **UNVERIFIED** — no citable code defect | C7 |
| 8 | Ox Alpha redaction | No credentials/client names visible in any excerpt | **TRUSTED, NOT VERIFIED** | C8 |

Constraints 2, 3, 4, 6 fail against the code as packaged; 1 and 5 are partial; 7 and 8 are unverifiable. All failures map onto adopted findings — no eighth constraint exposes a defect the consensus missed.

## B. Schema-truth pass

1. **Zero schema in packet** — confirmed: no migration/DDL excerpt exists anywhere; F4's "probe UNIQUE(idempotency_key)" stance is honest and must survive to round 10.
2. **AiConversation.mjs:24-83** carries `targetUserId` as a first-class column. Once F3's server-issued context token lands, this column becomes a **second, parallel client-scope authority** that handlers can write independently of the token — the stored row can then disagree with the session's bound scope. The running state already bars the token from `metadata`; the `targetUserId` column is the same drift class one field over.
3. **AiCommandAuditLog.mjs:24-91** correctly ruled out as the F4 receipt contract (no action_id, no unique key) — packet states this itself; adopt.

## C. New findings this round

- **N5 (MINOR — schema truth):** AiConversation.mjs L24-83 — `targetUserId` must become a token-derived read-only projection after F3; no handler may write it directly, or chat history renders under a stale scope.
- **N6 (MINOR — evidence truth in the consensus text itself):** the candidate cites `/api/ai-chat` at routes.mjs:626, `/api/ai-command` :627, stream-spike :625, hermes :632, debate :633, and calls intake/proposals "mounts unexcerpted." The 2026-08-23 Evidence Gate Refresh explicitly supersedes these: mounts are **routes.mjs:630-634** (stream-spike :630, ai-chat :631, ai-command :632, hermes :633, ai/debate :634) and intake/proposals at **:378-379** with handler-level `protect` + admin/trainer authorization (coachIntakeRoutes.mjs:23-25, coachProposalRoutes.mjs:15-16). The stale cites are pre-refresh drift; if they enter package item 2, round 10 verification will cut them as unlocatable.
- **N7 (NOTE):** Constraint 6 is not "deferred work" — it is a present-tense violation: the only message path (useAIChat.ts:217,425,448) is a cloud round-trip. The C6 durable store must be sequenced as an early blueprint slice immediately after F4 receipts (queue replay is unsafe without idempotency_key), not a late phase.

## D. Adjudication of the consensus candidate

**ADOPT the ruling in full — no REJECTs, no new MAJORs.** Three evidence-backed sharpenings appended (N5, N6, N7), continuing the round-3 precedent of "adopted verbatim with endorsed sharpenings." N6 corrects citation drift inside the adopted text without changing any fix's substance.

Fix endorsements, engineer-form:

- **N6 — WHAT:** canonical mount citations. **WHERE:** package item 2. **HOW:** replace :625/:626/:627/:632/:633 with routes.mjs:630-634 per-line map above and :378-379 for intake/proposals; delete "(mounts unexcerpted)"; only refresh-dated line cites enter the final package.
- **N5 — WHAT:** single scope authority. **WHERE:** AiConversation.mjs:24-83. **HOW:** post-F3, `targetUserId` is a projection of the server-issued token's client_id, written only by token issuance; add to the F4 migration slice.
- **N7 — WHAT:** sequencing. **WHERE:** package item 7. **HOW:** C6 durable local store slice ordered directly after F4 receipts; acceptance criterion: network-down gym-floor log shows honest "pending" state, replays exactly once via idempotency_key.

=== VERDICT ===
status: CONSENSUS
confidence: 91
findings: N5=MINOR: AiConversation.mjs L24-83: targetUserId column becomes a second client-scope authority after F3 token lands; must be token-derived projection, never handler-written | N6=MINOR: routes.mjs L630-634,L378-379: consensus mount cites (:625,:626,:627,:632,:633 + "mounts unexcerpted") are stale pre-refresh drift vs governing Evidence Gate Refresh | N7=NOTE: useAIChat.ts L217,425,448: sole message path is cloud POST — constraint-6 offline store is a present violation, must be early slice after F4, not deferred
rebuttals: F2=AGREE (cites corrected per N6) | F3=AGREE (+N5 storage rule) | F4=AGREE | F5=AGREE | F6=AGREE | F7/F8/F9/F12=AGREE | N1/N2/N3=AGREE | C6=AGREE (+N7 sequencing) | C7=AGREE | C8=AGREE
open: Q1=seats confirm refresh line map (routes.mjs:630-634, :378-379) as the only governing cites in package item 2 | Q2=schema ruling for blueprint item 6: retire AiConversation.targetUserId column entirely vs keep as token-derived projection
consensus_block: ADOPTED in full with N5/N6/N7 appended; no rejections, no new MAJORs. FIXES: F2 — probe entitlement middleware per router with corrected cites: /api/ai-chat (routes.mjs:631), /api/ai-command (:632), /api/coach/intake + /api/coach/proposals (:378-379, protect+admin/trainer auth at coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16), /api/ai-chat/stream-spike (:630 with F5), /api/hermes (:633), /api/ai/debate (:634); any router failing probe is BLOCKED from write capability until gated. F3 — replace caller-supplied clientId (AITerminalPanel.tsx:119,133) with server-resolved permitted-clientId set; collapse targetUserId (aiChatRoutes.mjs:308-344) and selectedClientId (aiCommandRoutes.mjs:111-145) into one server-issued context token; clientResolver.mjs:110-166 existence+tenant checks admins, not role-only; probe no memory→domain write cycle. F4 — receipt contract {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE at storage (probe — zero schema in packet), provenance chat|command|workout-bridge, status enum}; AITerminalPanel renders success only on receipt; dispatchAIWorkoutEvent boolean (aiWorkoutEvents.ts:121-128) never maps to success; CAS machine draft→pending_confirm→applied|denied|cancelled|failed; do not reuse AiCommandAuditLog.mjs:24-91. F5 — spike-lane auth parity probe; flag + kill switch before enable. F6 — CoachCommandCenterPage.tsx:38-42 re-coerce activeTab via effect on [userRole, searchParams]. F7/F8/F9/F12 — probes + excerpts into package item 2; F8 settles 4-named-surfaces vs 3-mounts (:98,:177,:203) and classifies SwanCoachAssistantPage. N1 — capability-token gate + payload schema + provenance audit + result enum on dispatcher registry. N2/N3 — single explicit persistence mode in AITerminalPanel.tsx:116-139; defined failure states. C6 — offline queue is separate durable store, never AiConversation.messages/status. N5 — AiConversation.targetUserId (AiConversation.mjs:24-83) becomes token-derived read-only projection; no direct handler writes. N6 — final package cites only refresh-dated mount lines (routes.mjs:630-634, :378-379). N7 — C6 store sequenced immediately after F4 in package item 7; acceptance: offline log = honest pending state + exactly-once replay via idempotency_key. ACCEPTED AS INTENTIONAL: evidence-boundary admissions behind F7/F8/F9; F10/F11 STRUCK; C8 redaction trusted not verified; C7 consistency with a11y/44px/mobile deferred to blueprint items 5+8. RESIDUAL RISKS: (a) F2/F3 ceilings unproven until probes; (b) C6 offline is net-new design, no queue code in packet; (c) C8 unverified; (d) F1 artifact identity — if seeder packet was the true subject all findings void; (e) until N1 lands, client event bus is unauthenticated in-page capability surface; (f) AiConversation embedded messages + no version is unproven lost-update race pending write-SQL excerpt; (g) N5 projection rule depends on F3 token landing first — until then targetUserId remains a stale-scope read path for chat history rendering.
=== END-VERDICT ===
