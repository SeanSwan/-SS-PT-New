# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-5\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7814 in / 4793 out · **Cost:** ~$0.0000 · **Wall:** 187.4s · **finish:** stop

---

# Round 5 — Ox Alpha (fresh-eyes adversarial)

## What the running consensus structurally cannot see

Four rounds of findings have converged on three defect classes: **entitlement gating (F2/F3)**, **receipt/idempotency contracts (F4)**, and **UI honesty/persistence (N2/N3/C6/F6)**. All three classes share a property: they inspect *paths that are named in the packet*. The class they structurally miss is **gating and controls whose absence is only visible by comparing two packet lines against each other** — i.e., defects provable from the packet's own evidence table without any new excerpt. Two such defects survive scrutiny:

---

### F13 — MAJOR: Conversation-creation entitlement is evidenced at the wrong handler from the write path

**Claim:** The packet's own probe table (`Evidence gate refresh`, `/api/ai-chat` row) states two facts side-by-side without ever asserting they connect:
- `aiChatRoutes.mjs:308-344`: "conversation creation accepts `targetUserId` for admin/trainer"
- `aiChatRoutes.mjs:610-625`: "checks trainer target-client access"

These are ~300 lines apart — different handler regions. Nothing in the packet places the `:610-625` access check *inside* the `:308-344` creation path. If it is not, a trainer mints a conversation bound to any `targetUserId` at creation time, and every subsequent message in that conversation inherits the poisoned scope — a standing cross-client read/write channel created in one unguarded call. Under Non-negotiable #1 (least privilege) and #2 (wrong-client mutation is catastrophic), an *unproven* gate on a write-scoping path is a MAJOR, not a probe footnote. Note the consensus F3 fix collapses `targetUserId` into a server-issued context token — correct, but it treats this as a client-trust problem; F13 is a server-side ordering problem that survives even if F3 lands (the creation handler must still re-validate whatever token arrives).

**Fix:** In `aiChatRoutes.mjs`, hoist the `:610-625` trainer target-client access check into middleware applied to the conversation-creation route in the `:308-344` region (and to any message-post route that accepts `targetUserId`); reject with 403 + audit row when the resolved target is outside the actor's permitted set. Acceptance criterion: creation with an out-of-scope `targetUserId` returns 403 and writes zero rows.

### F14 — MAJOR: Kill-switch coverage is asymmetric; four write-capable lanes have none evidenced

**Claim:** The packet evidences kill switches on exactly two lanes: the spike lane (`aiStreamSpikeRoutes.mjs` — fail-closed `spikeEnabled`) and the command lane (`aiCommandRoutes.mjs:110` — "lane kill switch"). For the remaining mounted write-capable routers the middleware lists contain **no kill switch**: `/api/ai-chat` (`aiChatRoutes.mjs:283` protect; `:466` subscription/rate-limit/PII — no lane flag), `/api/coach/intake` (`coachIntakeRoutes.mjs:23-25` — protect/authz/JSON limit only), `/api/coach/proposals` (`coachProposalRoutes.mjs:15-16` — protect/authz only), `/api/hermes`, `/api/ai/debate`. Non-negotiable #8 requires kill-switch controls "before any UI modification or app action." An incident in the proposal-approval lane (the highest-consequence write surface per its own probe row: "claims pending rows before apply") currently has no evidenced off-switch short of redeploy. This contradicts the packet's own constraint set — cite both sides: constraint #8 vs. the middleware inventories above.

**Fix:** Add an env-gated lane flag as the first middleware in each of the five ungated routers, mirroring the fail-closed `spikeEnabled` pattern already proven in `aiStreamSpikeRoutes.mjs`; default disabled-on-missing-config, surfaced through one ops endpoint. Acceptance criterion: flipping the flag returns 503 on every subpath of the lane within one request, with no partial-handler execution.

### F15 — MINOR: F4's UNIQUE(idempotency_key) is insufficient without key-generation ownership — and it must bind to C6

**Claim:** The consensus F4 mandates `UNIQUE(idempotency_key)` at storage but never assigns *who generates the key or when*. If the client mints a fresh key per attempt (the natural implementation given `useCoachCommand.ts:96,170,207` posts and zero queue code in packet), the UNIQUE constraint never fires — every retry looks like a new intent, and duplicate workout writes occur precisely in the offline/retry scenario C6 is supposed to cover. Residual risk (b) calls C6 "net-new design" but never connects it to F4. Sharpening, not rejection: the key must be generated **once at intent creation**, persisted client-side in the C6 durable store *before* first send, and reused verbatim across all retries; the server's UNIQUE constraint is then the backstop, not the mechanism.

---

## On the consensus candidate

Adopted verbatim: F2, F3, F4, F5, F6, F7/F8/F9/F12, N1, N2/N3, C6, all ACCEPTED-AS-INTENTIONAL items, and residual risks (a)–(f). No REJECTs — I probed F6's effect-based re-coercion (sufficient: `useState` initializer at `CoachCommandCenterPage.tsx:38-42` runs once, and an effect on `[userRole, searchParams]` covers the auth-load race), and residual risk (d) (correctly retained as epistemic, not factual).

=== VERDICT ===
status: DISPUTE
confidence: 78
findings: F13=MAJOR: aiChatRoutes.mjs L308-344 vs L610-625: trainer target-client access check is evidenced ~300 lines from the conversation-creation handler that accepts caller-supplied targetUserId; creation-path gating is unproven, leaving a one-call cross-client conversation-scope channel | F14=MAJOR: aiChatRoutes.mjs L283,L466 + coachIntakeRoutes.mjs L23-25 + coachProposalRoutes.mjs L15-16 (+hermes/debate): no kill switch evidenced on four write-capable lanes while spike (fail-closed spikeEnabled) and command (aiCommandRoutes.mjs L110) have one — contradicts Non-negotiable #8 | F15=MINOR: consensus-F4 + AiConversation.mjs L24-83/useCoachCommand.ts L96,L170,L207: UNIQUE(idempotency_key) without assigned key-generation ownership lets clients mint fresh keys per retry, defeating dedup exactly in the C6 offline scenario; key must be minted once at intent creation, persisted in the C6 store pre-send, reused across retries
rebuttals: (none)
open: Q1=does the aiChatRoutes.mjs L610-625 access check execute inside the L308-344 creation path (handler excerpt required)? | Q2=confirm kill-switch presence/absence per router via first-middleware excerpts for all five ungated lanes | Q3=does any seat hold schema evidence contradicting the zero-schema idempotency probe behind F4?
consensus_block: Adopt the round-4 consensus candidate VERBATIM (F2,F3,F4,F5,F6,F7/F8/F9/F12,N1,N2/N3,C6, accepted-intentional set, residual risks a–f) with three additions: F13 — hoist the L610-625 trainer target-client check into middleware on the conversation-creation route (L308-344 region) and any message route accepting targetUserId; out-of-scope target ⇒ 403 + audit row, zero rows written. F14 — add fail-closed env-gated lane flags as first middleware in aiChatRoutes, coachIntakeRoutes, coachProposalRoutes, hermesRoutes, aiDebateRoutes, mirroring the proven spikeEnabled pattern; acceptance = flag flip 503s every subpath in one request. F15 — amend F4's HOW: idempotency_key generated once at intent creation, persisted in the C6 durable store before first send, reused verbatim across retries; server UNIQUE is backstop only. No rejections; DISPUTE carried solely on the two new MAJORs.
=== END-VERDICT ===
