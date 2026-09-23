# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-1\REVIEW-DOC.md
**Tokens:** 5185 in / 18061 out (reasoning: 13520) | total 23246
**Wall:** 222.4s

---

# GLM 5.3 — Round 1, Seat Filing

**Stance applied:** correctness, security, schema truth, and the eight Non-Negotiable Constraints treated as the acceptance criteria, line by line. All citations are from the packet's own excerpts and evidence-gate tables.

---

## A. The 8 constraints, line by line

| # | Constraint | Verdict | Evidence → findings |
|---|---|---|---|
| 1 | Least-privilege for health/training/identity | **UNMET on chat lane** | PII/subscription middleware sits behind the creation route (`aiChatRoutes.mjs:466` vs `:308-344`) → **F3**; admin resolver validates nothing (`clientResolver.mjs:110-166`) → **F7**; debate start path unprobed (`aiDebateRoutes.mjs:57-76`) → **F9** |
| 2 | Wrong-client mutation: explicit, server-validated, observable, recoverable | **UNMET** | Scope is caller-supplied per lane with no cross-lane binding → **F2**; creation accepts `targetUserId` before the only cited access check → **F6**; no `action_id`, no undo/replay protection → **F1, F5** |
| 3 | Server state + durable receipts are truth, not conversation memory | **UNMET — no receipt schema exists** | `AiCommandAuditLog.mjs:24-91` is audit, not receipt (packet's own admission: no `action_id`/idempotency key) → **F1**; `AiConversation.mjs:24-83` has no staleness/invalidation linkage to domain writes → **F12** |
| 4 | UI must not claim saved before authoritative write | **UNMET** | `aiWorkoutEvents.ts:121-128` returns a boolean that cannot express "verified durable write" → **F4**; `clientId \|\| null` silently drops scope → **F8** |
| 5 | Role/entitlement enforced on server, not shell | **PARTIAL** | Guards cited at `aiChatRoutes.mjs:283`, `aiCommandRoutes.mjs:110`, `coachIntakeRoutes.mjs:23-25`, `coachProposalRoutes.mjs:15-16` — but creation-path gap (**F6**) and stored `role` provenance unproven (**F11**) |
| 6 | Offline/degraded core logging; cloud round-trip not sole path | **UNMET by absence** | The only logger mechanism cited is browser dispatch (`aiWorkoutEvents.ts:121-128`) — no queue, no idempotency key, no reconcile contract anywhere in the packet. Currently a cloud round-trip IS the only path to durable workout facts. Covered by **F1+F4** fixes |
| 7 | React/TS, tokens, 44px, WCAG, responsive QA | **NO LOCATABLE EVIDENCE either way** | Nothing in the packet tests or shows UI-standard compliance. I will not absolve or condemn unverifiable claims (rule 4) → **Q4** |
| 8 | Ox Alpha prompt retention / redaction | Process-level, satisfied by packet construction | Not code-verifiable; no finding |

---

## B. Findings

**F1 — MAJOR — No action identity or idempotency anywhere in the write path.**
Evidence: `AiCommandAuditLog.mjs:24-91` records actor/role/target/operation-ID/outcome/error/param-hash/duration and — per the packet's own receipt-boundary section — "has no `action_id` or unique idempotency key." `useCoachCommand.ts:96,170,207` exposes execute|confirm|cancel; a retried `confirm` or double-click mints two fresh operation IDs, both "successful." `coachProposalRoutes.mjs:30-54` claims pending rows before apply with no cited replay-safe applied/failed receipt.
Breaks: constraints 2 (recoverable), 3 (receipts as truth), 6 (offline duplicate prevention).
Fix: add `action_id` (client-generated UUID, `unique: true`, indexed) to `AiCommandAuditLog.mjs` schema block L24-91; `confirm`/`execute` in `aiCommandRoutes.mjs` perform insert-once semantics (duplicate `action_id` returns the existing receipt, never re-executes); proposal apply at `coachProposalRoutes.mjs:30-54` writes a durable applied/failed receipt keyed by proposal id with the domain mutation.

**F2 — MAJOR — Client scope is caller-supplied per lane; no server-side binding between chat target and command target.**
Evidence: `AITerminalPanel.tsx:116-139` sends `clientId || null`; `aiCommandRoutes.mjs:111-145` accepts `selectedClientId`; `commandExecutor.mjs:309-343` resolves those caller IDs; `AiConversation.mjs:24-83` stores `targetUserId`. Nothing cited binds a command to its conversation's `targetUserId`. Wrong-client path: coach chats about client A, command lane carries stale `selectedClientId` B, resolver resolves B (trainer legitimately owns both) → authorized mutation on the wrong client, no red flag. The packet's own risk column admits "Command state must share identity, context, consent, and receipt semantics with chat" — the builder's admission, formalized.
Breaks: constraint 2 (explicit + server-validated).
Fix: `aiCommandRoutes.mjs:111-145` requires `conversationId`; `commandExecutor.mjs:309-343` resolves target from `AiConversation.targetUserId` as authoritative, treats body `selectedClientId` as a claim that must match or return 409 with both IDs logged; `AITerminalPanel.tsx:116-139` sends `conversationId` as the scope token, not a bare `clientId`.

**F3 — MAJOR — Subscription/rate-limit/PII middleware registered after the creation route it must cover.**
Evidence: creation at `aiChatRoutes.mjs:308-344` (accepts `targetUserId`); the middleware chain is cited at `:466`. In Express registration order, a `use` at 466 cannot execute for a route matched and handled at 308. Two disjuncts, both defects: (a) the ordering is real and creation runs with `protect` (:283) only — no PII scrubbing, no rate limit on an endpoint that takes a `targetUserId` (enumeration oracle); or (b) `:466` is a per-route chain, in which case the refresh-table claim "applies subscription, rate-limit, and PII middleware" as a lane property is false as written.
Breaks: constraint 1; rule-5 contradiction with the refresh table's own /api/ai-chat row.
Fix: hoist the `:466` chain to immediately after `protect` at `:283`, or attach it per-route to `:308-344`; verify with a route-order test asserting creation requests traverse the PII middleware.

**F4 — MAJOR — Workout bridge's boolean contract cannot express a verified durable write.**
Evidence: `aiWorkoutEvents.ts:121-128` — `dispatchAIWorkoutEvent` returns only whether a named dispatcher existed and handled the payload. The type has no channel for failure-with-reason, queued, or server-verified status. Any consumer of this API is structurally forced into unverified success.
Breaks: constraints 4 and 6.
Fix: return a discriminated union `{status: 'dispatched'|'queued'|'failed'|'verified', actionId?}`; UI may render "queued/verifying" states and may only render "saved/logged" when `actionId` matches a server receipt from F1's schema.

**F5 — MAJOR — Audit schema cannot reconstruct cross-lane attribution.**
Evidence: `AiCommandAuditLog.mjs:24-91` field list contains no `conversation_id`, `proposal_id`, or `client_request_id`, while the system's three id spaces (conversation, operation, proposal per `coachProposalRoutes.mjs:30-54`) are unlinked.
Breaks: constraint 2 ("observable") and final-package item 8 (audit/observability). Post-incident forensics — "which chat instructed this mutation?" — is impossible by schema.
Fix: add `conversation_id`, `proposal_id?`, `client_request_id` to the audit schema; one linkage write per action.

**F6 — MAJOR — Trainer target-client access check cited ~300 lines after the endpoint that accepts `targetUserId`.**
Evidence: creation accepting `targetUserId` at `aiChatRoutes.mjs:308-344`; the only cited trainer target-client check sits at `:610-625`. Same Express-order logic as F3: as cited, creation of a conversation scoped to a non-owned client's `targetUserId` is unguarded — a cross-client metadata write with health context, and a target-existence oracle via creation success.
Breaks: constraints 1, 2, 5; rule-5 contradiction with "Auth and trainer access gates are present."
Fix: call `ensureClientAccess` inside the `:308-344` creation handler before persist; better, promote it to a scope-guard middleware directly after `:283` so every route below inherits.

**F7 — MINOR — Admin path in the resolver validates nothing.**
Evidence: `clientResolver.mjs:110-166` "scopes trainers but not admins beyond role." Admin-supplied IDs resolve silently — no existence/liveness/consent validation cited. Admin may be entitled to all clients, but silent acceptance of any ID (typo, stale dropdown) is the wrong-client front door, compounded by F2.
Fix: resolver validates existence + active status and returns the resolved entity for audit; capability registry decides admin command families (packet's own required probe at the `/api/ai-command` row).

**F8 — MINOR — Silent scope drop and PII-in-title in the shared terminal.**
Evidence: `AITerminalPanel.tsx:116-139` — `clientId || null` coerces absence to an unscoped send; the conversation title is `${displayLabel} — ${context}`, embedding a client display label into a listable title field; the `'both'` literal (5th arg) has undefined persistence semantics in the packet.
Fix: require explicit `clientId` or an explicit `unscoped` flag the server validates per role; move display labels out of titles; document or remove `'both'`.

**F9 — MINOR (probe-gated) — Debate start path resolves direct `clientId` with no cited access check.**
Evidence: `aiDebateRoutes.mjs:54` guard is trainer/admin; `:57-76` accepts/resolves client context; ownership middleware is cited only on status/result/stream. An async health-analysis engine is mounted (`routes.mjs:634`) whose creation-path cross-client authorization is unproven — the packet's own probe column admits it.
Fix: `ensureClientAccess` at the `:57-76` resolution; live probe: trainer cross-client start must 403.

**F10 — MINOR — HIVE-MIND doc is an executable-looking policy that routes health data to free external tiers.**
Evidence: `APP-AI-HIVE-MIND.md:7-22` (free Gemini/Qwen consensus, labels workout generation and progress analysis complex) vs the actual mounted lanes (`routes.mjs:378-379, 630-634`). The packet classifies it "active reference doc with runtime drift." A builder following it egresses client workout/progress data to free third-party tiers with no cited consent/retention basis — constraint 8 territory.
Fix: blueprint must explicitly retire or rewrite the doc before slice 1; until then it is a live policy hazard, not stale paper.

**F11 — MINOR (probe-gated) — Stored `role` provenance unproven.**
Evidence: `AiConversation.mjs:24-83` persists a `role` field; the packet never shows the creation handler (`aiChatRoutes.mjs:308-344`) deriving role from the authenticated principal rather than the body. If body-supplied, constraint 5 is broken at the schema.
Fix: derive `role` exclusively from `protect`'s principal at `:308-344`; reject body `role`.

**F12 — MINOR — Conversation schema has no retention/invalidation hooks.**
Evidence: `AiConversation.mjs:24-83` — embedded `messages` array plus `messageCount`, no TTL, no archival field, no staleness linkage to domain writes. Constraint 3's reconciliation ("memory is not truth") has no schema support; unbounded array growth is a correctness/ops drift.
Fix: add invalidation metadata (`supersededBy`/`domainVersion`) and a retention field; move history overflow out of the embedded array.

**F13 — NOTE — Citation drift inside the packet.** Same mount block cited as `routes.mjs:625-634` (header excerpt) and `:630-634` (refresh table). Reconcile before round 2; citation integrity is load-bearing in this debate.

**F14 — NOTE (accepted) — Spike mount order.** `routes.mjs:630-631` mounts stream-spike ahead of `/api/ai-chat`; shadowing discipline required for any future subpath, but the fail-closed `spikeEnabled` + `protect` + `adminOnly` on GET / is a verified acceptable pattern as cited. No change demanded.

**F15 — NOTE — `SwanCoachAssistantPage` is unmounted but referenced by tests/hooks.** Dead-but-referenced AI surface is drift bait; blueprint must schedule retirement or remount classification. No runtime defect claimed.

---

## C. Rule-5 contradictions (claim vs cited lines)

1. Refresh table: "Auth and trainer access gates are present" for `/api/ai-chat` — vs `:308-344` creation preceding both `:466` middleware and `:610-625` access check. The claim is not established for the creation endpoint (**F3, F6**).
2. Packet caption on the workout bridge: "the panel must not infer a committed workout write" — vs the API shape at `aiWorkoutEvents.ts:121-128`, which makes honoring that warning structurally impossible for consumers (**F4**).
3. "One brain" framing — vs four unlinked id spaces and an audit schema with no lane linkage (**F5**).

---

## D. Seat positions on the 9 questions (security/schema-relevant only)

- **Q1:** The single-brain boundary is the server-owned ActionService: `action_id` is the only truth token; capability registry and policy gates are server-side; UI adapters (including `AITerminalPanel`) never mint scope — they carry `conversationId`.
- **Q5:** Action classes are meaningless until F1/F4 land — confirmation, undo, and receipts all key off `action_id`.
- **Q9:** Canonical set agreed as packaged; Hermes/debate stay "pending probe" (**F9, Q3**); HIVE-MIND must be retired (**F10**).

=== VERDICT ===
status: CONSENSUS
confidence: 90
findings: F1=MAJOR: AiCommandAuditLog.mjs L24-91: no action_id/idempotency key; execute|confirm|cancel (useCoachCommand.ts L96,170,207) can double-apply; proposals claim-before-apply (coachProposalRoutes.mjs L30-54) has no replay-safe receipt | F2=MAJOR: aiCommandRoutes.mjs L111-145 + AITerminalPanel.tsx L116-139 + AiConversation.mjs L24-83: client scope is caller-supplied per lane with no server binding of conversation targetUserId to command target — authorized wrong-client mutation path | F3=MAJOR: aiChatRoutes.mjs L308-344 vs L466: subscription/rate-limit/PII middleware registered after creation route — creation path runs protect-only | F4=MAJOR: aiWorkoutEvents.ts L121-128: dispatch returns boolean only; contract cannot express verified durable write or failure — honest-UI contract unimplementable | F5=MAJOR: AiCommandAuditLog.mjs L24-91: no conversation_id/proposal_id/client_request_id linkage — cross-lane attribution and forensics impossible | F6=MAJOR: aiChatRoutes.mjs L308-344 vs L610-625: targetUserId accepted at creation; only cited trainer-client check sits ~300 lines later — cross-client conversation creation unguarded | F7=MINOR: clientResolver.mjs L110-166: admin path resolves any ID with no existence/liveness/consent validation | F8=MINOR: AITerminalPanel.tsx L116-139: clientId||null silently drops scope; displayLabel PII embedded in conversation title; 'both' arg undefined | F9=MINOR: aiDebateRoutes.mjs L57-76: start path resolves direct clientId; ownership middleware only cited on status/result/stream — cross-client start unproven | F10=MINOR: APP-AI-HIVE-MIND.md L7-22: free Gemini/Qwen policy contradicts mounted lanes (routes.mjs L378-379,630-634); following it egresses health data to free tiers | F11=MINOR: AiConversation.mjs L24-83: stored role provenance unproven at creation (aiChatRoutes.mjs L308-344) | F12=MINOR: AiConversation.mjs L24-83: embedded messages array with no retention/invalidation/staleness linkage fields | F13=NOTE: routes.mjs mount block cited as both L625-634 and L630-634 within the same packet | F14=NOTE: routes.mjs L630-631: stream-spike mounted before /api/ai-chat — shadowing discipline; fail-closed spikeEnabled+adminOnly accepted | F15=NOTE: SwanCoachAssistantPage unmounted but test/hook-referenced — retirement decision required
rebuttals: (none)
open: Q1=who owns the per-command-family dispatcher access-recheck probe matrix (commandExecutor.mjs L309-343) | Q2=confirm AiConversation.role derives from auth principal, not body | Q3=classify /api/hermes (operator-only vs coach-reachable) before blueprint drafting | Q4=constraint-7 UI standards (44px/WCAG/tokens) have no locatable evidence in the packet — assign the responsive/accessibility probe owner
consensus_block: REQUIRED-RULING (round-1 proposal).
MUST-FIX BEFORE BUILD (exact fixes):
- F1: add action_id (client UUID, unique, indexed) to AiCommandAuditLog.mjs L24-91; insert-once semantics on execute/confirm in aiCommandRoutes.mjs; durable applied/failed receipt keyed by proposal id at coachProposalRoutes.mjs L30-54.
- F2: require conversationId in aiCommandRoutes.mjs L111-145; commandExecutor.mjs L309-343 resolves target from AiConversation.targetUserId authoritatively; body selectedClientId mismatch = 409 with both IDs logged; AITerminalPanel.tsx L116-139 sends conversationId as scope token.
- F3: hoist the L466 middleware chain to immediately after protect (L283) or attach per-route to L308-344; add route-order test proving creation traverses PII/rate-limit middleware.
- F6: call ensureClientAccess inside the L308-344 creation handler; promote to scope-guard middleware after L283.
- F4: aiWorkoutEvents.ts L121-128 returns {status: dispatched|queued|failed|verified, actionId?}; "saved/logged" UI copy permitted only on actionId-matched server receipt.
- F5: add conversation_id, proposal_id?, client_request_id to AiCommandAuditLog.mjs L24-91; one linkage write per action.
PROBE-GATED (prove or fix before relevant slice): F7 admin resolver existence/liveness validation; F9 ensureClientAccess on aiDebateRoutes.mjs L57-76 start path; F11 role derived from protect principal at creation; F10 retire/rewrite HIVE-MIND doc before slice 1.
ACCEPTED AS INTENTIONAL: F14 spike lane (fail-closed, adminOnly); intake/proposal admin-trainer guards as cited (coachIntakeRoutes.mjs L23-25, coachProposalRoutes.mjs L15-16).
RESIDUAL RISKS: constraint 6 is unmet by total absence — no offline queue exists anywhere in the packet; offline design is blueprint work, not a code fix. Constraint 7 UI standards unverifiable from packet (Q4). Hermes classification open (Q3). F12 retention schema and F15 legacy-page retirement deferred to blueprint slices. F13 citation drift must be reconciled by the builder before round 2 quoting.
=== END-VERDICT ===
