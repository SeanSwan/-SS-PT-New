# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-9\REVIEW-DOC.md
**Tokens:** 7155 in / 14409 out (reasoning: 11083) | total 21564
**Wall:** 175.0s

---

# GLM 5.3 — Round 9: Full-Spectrum Audit, Erratum, and the C6×F4 Closure

Adopting the round-8 candidate. My round-9 work as the correctness/security/schema seat: (1) the 8-constraint line-by-line audit my remit demands, (2) a schema-truth pass over the three model excerpts, (3) resolution of both running-state unresolved items. No REJECTs — one erratum, one binding closure, two new findings below MAJOR-threshold of the existing set.

## 1. The 8 non-negotiable constraints, line by line

| # | Constraint | Packet evidence | Consensus item | Status after R9 |
|---|---|---|---|---|
| 1 | Least-privilege | `aiChatRoutes.mjs:283` protect; `:610-625` trainer target-client check; `clientResolver.mjs:110-166` admin = role-only | F2 + F3 | Closed pending probes (residual a) |
| 2 | Wrong-client mutation catastrophic | `AITerminalPanel.tsx:119,133` caller clientId; `aiCommandRoutes.mjs:111-145` selectedClientId | F3 | Closed pending probes |
| 3 | Conversation ≠ domain truth | `aiWorkoutEvents.ts:121-128` boolean-only; packet's own "Receipt and idempotency boundary" admission (`AiCommandAuditLog.mjs:24-91` has no action_id/key) | F4 | Closed by design; zero code exists yet |
| 4 | No "saved" before authoritative write | Same as #3; F4's "renders success only on receipt" | F4 | Closed by design |
| 5 | Server-enforced entitlements | `hermesRoutes.mjs:43,90,127,142` guards; `aiDebateRoutes.mjs:54` guard, `:57-76` clientId path unprobed; intake `coachIntakeRoutes.mjs:23-25` | F2 enumeration | Closed pending probes |
| 6 | Offline gym-floor logging | **No queue/idempotency code anywhere in packet** (residual risk b admits it) | C6 + F4 — **unbound until this round** | **CLOSED NOW — see §4** |
| 7 | React/TS, tokens, 44px, WCAG, mobile QA | All excerpts TS/TSX; JSX shell at `CoachCommandCenterPage.tsx:149` not excerpted — no styling/markup evidence exists | C7 deferral | Deferral stands; blueprint items 5+8 must make 44px/WCAG/mobile **hard gates**, not aspirations |
| 8 | Ox Alpha redaction | No credentials/PII in any excerpt reviewed — consistent with claim | C8 | Trusted, unverified — stands |

Constraint #6 was the last open line. It closes below.

## 2. Schema-truth pass

- **`AiConversation.mjs:24-83`**: `userId, role, context, targetUserId, messages (embedded), status, metadata, messageCount, lastMessageAt`. No `version` (F14 fixes). **New C10**: `messageCount`/`lastMessageAt` are denormalized counters beside the embedded `messages` array — two truths inside one model. If F14 lands OCC without mandating a *compound* conditional update, a version bump can still coexist with stale counters. Fix folded into F14 HOW (see consensus_block).
- **`AiCommandAuditLog.mjs:24-91`**: actor/role/resolved-client/opId/outcome/error/param-hash/duration — append-only evidence, no `action_id`, no idempotency key. Consensus F4 correctly refuses to reuse it as the receipt/state contract. Endorsed.
- **Identifier split**: the same concept — "which client is this action about" — is carried as `targetUserId` (`aiChatRoutes.mjs:308-344`), `selectedClientId` (`aiCommandRoutes.mjs:111-145`), and `clientId` (`aiDebateRoutes.mjs:57-76`), all caller-supplied. Three names, zero schema-level assertion of same-entity/tenant. F3's collapse into one server-issued context token is the correct schema fix; my audit adds that the debate lane's `clientId` path must join the collapse (it's in F2's probe list already).

## 3. Erratum C9 — line-cite drift resolved

The packet carries **two incompatible line maps for the same five mounts**: the appendix excerpt header says `backend/core/routes.mjs:625-634` (spike :625, chat :626, command :627, hermes :632, debate :633), while the Evidence gate refresh says "`routes.mjs:630-634` mounts stream-spike, chat, command, Hermes, and debate in that order" and separately pins "Mount `routes.mjs:630`" for the spike, plus intake `:378` / proposals `:379`. The round-8 candidate cites the superseded appendix numbers in F2/F5, and calls intake/proposals "mounts unexcerpted" when the refresh supplies pins (excerpt absent, pins present).

Ruling: the **refresh governs** — its own text says it "records the route/handler evidence that must govern the next panel run." Re-pin: spike `:630`; chat/command/hermes/debate `:631/:632/:633/:634` (derived by order from the refresh's range — build-time probe confirms); intake `:378`, proposals `:379`. F2/F5 substance untouched. This closes running-state item 2.

**Correctness guard for the blueprint**: the spike-before-chat mount order is *required*, not cosmetic — `app.use('/api/ai-chat', …)` prefix-matches `/api/ai-chat/stream-spike`, so narrow-mount-first must be preserved verbatim in any migration reorder. Do not let a cleanup PR "fix" it.

## 4. C6×F4 binding — closing running-state item 1

The round-8 text had F4 (UNIQUE idempotency_key + CAS) and C6 (separate durable store) as siblings with no wire between them. The hole: a reconcile replay after an ambiguous response re-sends the workout fact, and nothing in the candidate forces the replay to hit the UNIQUE constraint or to be answered by read-back instead of re-execution. Against constraint #2 ("catastrophic") and #6, I formalize the binding:

1. **Enqueue (offline, client)**: mint `idempotency_key = UUIDv4` at *enqueue*, never at send. Queue entry: `{idempotency_key, capability, payload, payload_hash, actor, claimed_client_id, created_at, status: queued→draining→sent→acked|ambiguous}`.
2. **Drain**: one send carrying the key. Timeout/ambiguous → status `ambiguous`, retry the *same* key.
3. **Server**: INSERT into the F4 action table under `UNIQUE(idempotency_key)`. Duplicate key → SELECT the existing row, return the existing receipt flagged `replayed: true` — **never re-execute**. CAS guarantees one terminal transition (`applied|denied|cancelled|failed`).
4. **Workout-bridge**: `dispatchAIWorkoutEvent` (`aiWorkoutEvents.ts:121-128`) stays a UI hint; the enqueue record is the pending fact; the receipt row is the only apply-truth.
5. **UI honesty (constraint #4)**: "applied (replayed)" renders distinctly from "applied (new)".
6. **Proof obligation**: failure-injection suite in package item 8 — duplicate drain, partial-response-then-retry, dual-tab drain of one queue, kill-switch mid-drain. Without these the binding is untested design (new residual h).

## 5. Remaining doc disposition

**C11 (NOTE)**: `APP-AI-HIVE-MIND.md:7-22` describes a free Gemini/Qwen consensus that contradicts the mounted five-lane runtime (`routes.mjs:630-634` + intake/proposals `:378-379`). Package item 2 must classify it **retired-as-runtime-truth**, demoted to historical reference with a redirect banner pointing at the blueprint. It must not survive as an alternate implementation authority.

## 6. Handoff to round 10

Attack surface I could not close statically: the binding in §4 has no code to test against (honest residual); the true `routes.mjs` line numbers need a build-time read; whether `coachProposalRoutes.mjs:30-54`'s pending-claim runs through the F4 CAS lane or its own path — excerpt absent, I asserted it must join, round 10 should demand the excerpt.

=== VERDICT ===
status: CONSENSUS
confidence: 93
findings: C6=MAJOR: AiConversation.mjs L24-83 × F4: offline reconcile replay unbound to UNIQUE(idempotency_key) — double-applies core workout facts (constraint #6); fix = enqueue-minted key + duplicate→read-back(replayed) + CAS single terminal transition | C9=MINOR: routes.mjs excerpt header :625-634 vs Evidence gate refresh :630-634/'Mount routes.mjs:630' — drift; refresh governs, re-pin F2/F5 cites, intake :378 proposals :379 pins exist | C10=MINOR: AiConversation.mjs L24-83: messageCount/lastMessageAt denormalized beside embedded messages — F14 HOW must mandate one compound conditional UPDATE | C11=NOTE: APP-AI-HIVE-MIND.md L7-22: free-consensus doc contradicts mounted five-lane runtime — retire-as-runtime-truth in package item 2
rebuttals: F2=AGREE (substance intact; line pins corrected per C9) | F3=AGREE | F4=AGREE (extended: proposals pending-claim joins CAS lane) | F5=AGREE (pins corrected per C9) | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F12=AGREE | F13=AGREE | F14=AGREE (HOW extended per C10) | N1=AGREE | N2=AGREE | N3=AGREE | C7=AGREE | C8=AGREE
open: Q1=round 10 must adversarially replay the C6×F4 binding (duplicate drain after partial HTTP response, dual-tab drain, kill-switch mid-drain) | Q2=build-time probe must confirm actual routes.mjs lines — packet carries two maps | Q3=does coachProposalRoutes.mjs:30-54 pending-claim run through the F4 CAS lane — excerpt absent
consensus_block: ADOPT round-8 candidate verbatim with amendments (C6-binding, C9 erratum, C10 extension, C11 disposition). FIXES: F2 — entitlement middleware per router, re-pinned to Evidence gate refresh: /api/ai-chat routes.mjs:631, /api/ai-command :632, /api/coach/intake :378, /api/coach/proposals :379, /api/ai-chat/stream-spike :630 (with F5), /api/hermes :633, /api/ai/debate :634 (chat/command/hermes/debate lines derived by order from refresh range :630-634; build probe confirms); failing router BLOCKED from write capability until gated. F3 — delete clientId args at AITerminalPanel.tsx:119,133; collapse targetUserId (aiChatRoutes.mjs:308-344) + selectedClientId (aiCommandRoutes.mjs:111-145) + debate clientId (aiDebateRoutes.mjs:57-76) into one server-issued context token; clientResolver.mjs:110-166 does existence+tenant checks for admins, not role-only. F4 — receipt {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE, provenance chat|command|workout-bridge, status enum}; CAS draft→pending_confirm→applied|denied|cancelled|failed; AiCommandAuditLog.mjs:24-91 NOT reused; AITerminalPanel success only on receipt; dispatchAIWorkoutEvent (aiWorkoutEvents.ts:121-128) never maps to success; coachProposalRoutes.mjs:30-54 pending-claim joins the same CAS lane. F5 — spike-lane auth parity probe; flag+kill switch before enable. F6 — CoachCommandCenterPage.tsx:38-42 re-coerce activeTab via effect on [userRole, searchParams]. F13 — try/catch around sendMessageWithConversation at AITerminalPanel.tsx:116-139; failure state per N2/N3. F14 — AiConversation.mjs:24-83: version field + OCC, EXTENDED (C10): one compound conditional UPDATE = append message + increment messageCount + stamp lastMessageAt + bump version; no path updates counters without version bump. N1 — capability-token gate + payload schema validation + provenance audit + result enum on dispatcher registry. N2/N3 — single explicit persistence mode + defined failure states. C6 — CLOSED by binding: offline queue is separate durable store (never AiConversation.messages/status); idempotency_key minted at enqueue; duplicate key → read-back existing receipt flagged replayed=true, never re-execute; workout facts get this lane first; UI renders applied(replayed) ≠ applied(new). MOUNT-ORDER RULING: spike-before-chat preserved — Express prefix shadowing makes narrow-first mandatory; migration must not reorder. ACCEPTED AS INTENTIONAL: F7/F8/F9 evidence-boundary admissions + probes into package item 2; F8 settles 4-named-surfaces vs 3-mounts and classifies SwanCoachAssistantPage; F10/F11 STRUCK; C8 redaction trusted not verified; C7 deferral with 44px/WCAG/mobile as hard acceptance gates in blueprint items 5+8; C11 APP-AI-HIVE-MIND.md:7-22 retired-as-runtime-truth in package item 2. CONSTRAINT AUDIT: all 8 non-negotiables closed on paper — #6 was last, closed this round. RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes return; (b) C6 offline is net-new design, no queue code in packet; (c) C8 unverified; (d) F1 artifact identity voids all findings if seeder packet was subject; (e) client event bus unauthenticated until N1; (f) AiConversation lost-update race pending write-SQL excerpt — addressed by F14+C10; (g) F13 may be pre-mitigated by useAIChat wrapper — probe; (h) C6 binding untestable until failure-injection suite (duplicate drain, partial-response retry, dual-tab drain, kill-switch mid-drain) runs — mandatory in package item 8; (i) routes.mjs true line numbers need build-time probe — packet carries two maps.
=== END-VERDICT ===
