# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-1\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7960 in / 5497 out · **Cost:** ~$0.0000 · **Wall:** 269.5s · **finish:** stop

---

# OX ALPHA — ROUND 1, FRESH-EYES ADVERSARIAL

The running state shows every prior seat attacking the same three surfaces: the client-supplied `clientId` (AITerminalPanel.tsx:119,133), the mount-order block (routes.mjs:625-634), and the boolean event bridge (aiWorkoutEvents.ts:121-128). All correct. All incomplete. Below are the defect classes those stances structurally cannot see, each located in the packet.

## New findings

**NF1 — MAJOR: Two independent client-scope channels with no defined precedence.**
Every seat attacked the *message-level* caller-supplied `clientId`. Nobody attacked the *conversation-level* channel. The authoritative model carries `targetUserId` as a conversation field (`backend/models/AiConversation.mjs:24-83`), conversation creation accepts `targetUserId` for admin/trainer (`backend/routes/aiChatRoutes.mjs:308-344`), and then each subsequent message carries a *separate* per-call `clientId || null` (`AITerminalPanel.tsx:116-139`). Nothing in the packet states which channel wins when they diverge — e.g., a conversation created targeting client A receiving a message scoped to client B, or a message arriving with `clientId: null` against a conversation that has a bound `targetUserId`. This is a wrong-client-context vector orthogonal to F3's receipt fix: even a perfect server-resolved receipt contract does not resolve which scope governs the *conversation*. Constraint 2 demands client scope be "explicit, server-validated" — two unranked channels is not explicit. Fix: define one scope authority (conversation-bound `targetUserId`, server-resolved at creation, immutable without re-consent), demote per-message `clientId` to a *verification* field that must equal the bound value or hard-fail; excerpt the creation handler and message-append handler into package item 2 to prove it.

**NF2 — MINOR: Privacy-control asymmetry across lanes carrying the same health data.**
The packet's own middleware inventory cites PII middleware on exactly one lane: `/api/ai-chat` (`aiChatRoutes.mjs:466`). The command lane inventory lists protect, kill switch, rate limit (`aiCommandRoutes.mjs:110`) — no PII/redaction. Intake (health artifacts, audio: `coachIntakeRoutes.mjs:23-25`), proposals (health plans: `coachProposalRoutes.mjs:15-16`), Hermes, and debate rows likewise enumerate no PII middleware. Same data classes, unequal controls. Probe: confirm whether redaction lives inside handlers or is genuinely absent; until proven, C8 "redaction trusted not verified" must extend from audit logs to all five non-chat lanes.

**NF3 — MINOR: Kill-switch coverage is inverted — the toy lane has one, the production lanes' coverage is unproven.**
The synthetic SSE probe is fail-closed with a flag (`aiStreamSpikeRoutes.mjs`, per the refresh table) and the command lane has a kill switch (`aiCommandRoutes.mjs:110`). No kill switch is cited for `/api/ai-chat`, intake, proposals, Hermes, or debate. Constraint 8 requires kill switches "before any UI modification"; the highest-traffic lane is the one without cited emergency-off. Probe per lane; add a single global Coach kill switch above all six mounts in `backend/core/routes.mjs`.

**NF4 — NOTE: The unsound cast must be deleted, not merely gated.**
`return dispatch(payload as AIEventPayload)` (`aiWorkoutEvents.ts:121-128`) force-casts `unknown`, so TypeScript cannot catch payload-shape drift on any dispatcher. Consensus N1 adds runtime schema validation — correct — but the cast itself defeats the compile-time layer and should be removed (type the dispatcher registry as `Record<eventName, (p: AIEventPayload) => boolean>` and validate at the boundary), otherwise N1 ships alongside a standing type hole.

**NF5 — NOTE: Internal citation drift breaks rule-1 locatability.**
The excerpt block is headed `backend/core/routes.mjs:625-634` with stream-spike at 625; the evidence-gate refresh table cites the same mounts at `routes.mjs:630-634` with stream-spike at `:630`. Both cannot be the current line truth. Package item 2 must pin one canonical line map or every downstream probe cites a moving target.

**NF6 — NOTE: The authoritative conversation model has no concurrency anchor.**
`AiConversation.mjs:24-83` enumerates `userId, role, context, targetUserId, messages, status, metadata, messageCount, lastMessageAt` — no version, no updatedAt-based optimistic lock. Debate questions 3–4 require cross-device/concurrent reconciliation, but the model excerpt offers no anchor for detecting conflicting appends. Probe for a versioning mechanism; if absent, it is net-new design like C6 offline.

**NF7 — MINOR (sharpening of F3): falsy fallback silently downgrades scope to scopeless.**
`clientId || null` (`AITerminalPanel.tsx:119,133`) converts an explicit empty-string scope into `null` = "no client scope" instead of failing closed. In a system where constraint 2 calls wrong-client mutation catastrophic, an unset scope must be a loud error in privileged contexts, not a silent degrade. Fold into the F3 fix: server rejects scopeless writes where the capability requires a target.

## Relation to the consensus candidate

I ADOPT the consensus verbatim — F2–F9, F12, N1–N3, the struck items, and all residual risks are correctly scoped. My additions do not contradict it; they extend it: NF1 sits upstream of F3/F4 (scope authority precedes receipt binding), NF2/NF3 extend the F2 probe matrix to privacy and kill-switch parity, NF4 tightens N1, NF5/NF6 enter package item 2.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: NF1=MAJOR: AiConversation.mjs L24-83 + aiChatRoutes.mjs L308-344 + AITerminalPanel.tsx L116-139: dual client-scope channels (conversation targetUserId vs per-message clientId||null) with no defined precedence — wrong-client context vector upstream of F3 | NF2=MINOR: aiChatRoutes.mjs L466 vs aiCommandRoutes.mjs L110 / coachIntakeRoutes.mjs L23-25 / coachProposalRoutes.mjs L15-16: PII middleware cited only on chat lane; health-data lanes lack cited privacy controls | NF3=MINOR: aiStreamSpikeRoutes.mjs + aiCommandRoutes.mjs L110 vs uncited lanes: kill switch present on synthetic+command lanes, absent/unproven on ai-chat, intake, proposals, hermes, debate | NF4=NOTE: aiWorkoutEvents.ts L121-128: `payload as AIEventPayload` unsound cast defeats type contract; delete cast, not just gate | NF5=NOTE: packet excerpt header routes.mjs L625-634 vs refresh table L630-634: internal citation drift breaks locatability | NF6=NOTE: AiConversation.mjs L24-83: no version/optimistic-lock field for cross-device concurrent append | NF7=MINOR: AITerminalPanel.tsx L119,L133: `clientId || null` falsy fallback silently downgrades explicit-empty scope to scopeless instead of failing closed
rebuttals: (none)
open: Q1=which channel is scope authority when conversation targetUserId diverges from per-message clientId — rule needed before F3/F4 fixes land | Q2=does PII/redaction exist inside non-chat lane handlers, or is NF2 a real control gap | Q3=who owns the global Coach kill switch and where does it mount relative to routes.mjs L625-634
consensus_block: ADOPTED VERBATIM with additions: all F2-F9/F12/N1-N3 fixes, strikes, and residual risks stand unchanged. ADDITIONS: (1) NF1 — declare conversation-bound server-resolved targetUserId the sole scope authority; per-message clientId becomes a verification field that must match or hard-fail; excerpt creation (aiChatRoutes.mjs:308-344) and message-append handlers into package item 2. (2) NF2/NF3 — extend the F2 probe matrix: PII-middleware presence and kill-switch coverage per lane (/api/ai-chat, ai-command, coach/intake, coach/proposals, hermes, ai/debate); add global Coach kill switch above all mounts in backend/core/routes.mjs. (3) NF4 — delete the `as AIEventPayload` cast in aiWorkoutEvents.ts:121-128 as part of N1, typing the dispatcher registry directly. (4) NF5 — pin one canonical line map for routes.mjs mounts in package item 2. (5) NF6 — probe AiConversation for a concurrency/version anchor; if absent, classify as net-new design alongside C6 offline. RESIDUAL RISKS: consensus risks (a)-(e) stand, plus (f) NF1 severity ceiling unproven until the scope-precedence probe returns.
=== END-VERDICT ===
