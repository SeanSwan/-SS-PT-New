# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-1\REVIEW-DOC.md
**Tokens:** 5185 in / 15389 out (reasoning: 11210) | total 20574
**Wall:** 182.3s

---

# GLM 5.3 — Round 1: Full-Spectrum Hostile Review (correctness / security / schema truth / the 8 constraints line by line)

The packet's own evidence is internally consistent on routes and mounts. The defects are in what the evidence **fails to establish**: no idempotency, no receipt contract, split client-identity namespaces, health lanes without PII parity, and zero offline path. I hold those against the 8 non-negotiable constraints, which I treat as the acceptance criteria.

---

## A. The 8 acceptance criteria, line by line

| # | Constraint | Verdict | Evidence |
|---|---|---|---|
| 1 | Least-privilege over health/training/identity | **PARTIAL** | Lane-level `protect` + role guards exist everywhere (`aiChatRoutes.mjs:283,466`; `aiCommandRoutes.mjs:110`; `coachIntakeRoutes.mjs:23-25`; `coachProposalRoutes.mjs:15-16`; `hermesRoutes.mjs:43,90,127,142`; `aiDebateRoutes.mjs:54`). But PII middleware is evidenced **only** on the chat lane (`aiChatRoutes.mjs:466`) while the health/audio lanes carry the most sensitive data → **F5**. Operation-level entitlement unproven → **F2**. |
| 2 | Wrong-client mutation catastrophic; scope explicit/server-validated/observable/recoverable | **UNPROVEN = FAIL** | `AiCommandAuditLog.mjs:24-91` has no `action_id`/idempotency key (packet admits this); `clientResolver.mjs:110-166` "scopes trainers but not admins beyond role"; identity namespaces split (`clientId` / `selectedClientId` / `targetUserId`) → **F1, F3**. |
| 3 | Memory ≠ truth; durable receipts are truth | **UNPROVEN = FAIL** | No receipt contract exists anywhere in the packet. `AiConversation.mjs:24-83` persists `messages` with no invalidation/attribution contract vs server state. Covered by **F1**. |
| 4 | UI cannot claim "saved" before authoritative write + verification | **UNPROVEN = FAIL** | The only write ack in evidence is a browser boolean: `aiWorkoutEvents.ts:121-128`. Packet itself concedes this "must not" count as a write proof — and offers no alternative that does. → **F1, F4**. |
| 5 | Entitlements enforced server-side, not by dashboard shell | **PARTIAL** | Lane-level proven. But the packet's own probe row admits "server entitlement behavior for every command family is not yet proven" and "a denied operation cannot mint a success receipt." Tab coercion in `CoachCommandCenterPage.tsx:34-43` is UX only → **F2**. |
| 6 | Offline/degraded gym-floor logging; cloud not sole path | **NO EVIDENCE = FAIL** | Every evidenced write path is HTTP (`useCoachCommand.ts:96,170,207`; `useAIChat.ts:217,425,448`) or a browser event (`aiWorkoutEvents.ts:121-128`). No queue, no local store, no reconcile contract in the packet → **F4**. |
| 7 | React/TS, styled-components, 44px, WCAG, desktop/mobile QA | **NO ARTIFACTS** | Zero accessibility/44px/contrast evidence in the packet. Blueprint's verification matrix (final package #8) must carry this; nothing to review yet → NOTE. |
| 8 | Ox Alpha receives only canary-redacted packet | **NOT CODE-VERIFIABLE** | Process criterion; out of scope for source findings. |

Constraints 2, 3, 4, 6 are not merely "pending design" — the packaged evidence actively forecloses meeting them today.

---

## B. Findings with fixes

### MAJOR

**F1 — No idempotency key or action receipt anywhere in the command lane.**
Evidence: `backend/models/AiCommandAuditLog.mjs:24-91` (packet's Receipt-and-idempotency section states: "no `action_id` or unique idempotency key"); `frontend/src/utils/aiWorkoutEvents.ts:121-128` returns only a boolean. Any retry — timeout, double-tap, reconnect replay — re-executes and produces two legitimate-looking audit rows. Cannot satisfy observable/recoverable (constraint 2), receipts-as-truth (3), or verified "saved" UI (4).
Fix (engineer-applied):
- WHERE: `backend/models/AiCommandAuditLog.mjs` schema + `backend/routes/aiCommandRoutes.mjs:111-145` + `frontend/src/hooks/useCoachCommand.ts:96,170,207`.
- WHAT/HOW: add `actionId` (client UUIDv4) with unique index; executor is idempotent on `actionId` within a window — conflict returns the stored outcome instead of re-executing; `execute|confirm|cancel` all reference `actionId`; responses return `{actionId, status: received|executed|denied|failed, receiptRef}`; frontend persists `actionId` before dispatch for reconciliation.

**F2 — Entitlement is lane-level only; admin scope unbounded; per-dispatcher re-check unproven.**
Evidence: `aiCommandRoutes.mjs:110` (protect + kill switch + rate limit), `:111-145` (accepts `selectedClientId`), `commandExecutor.mjs:309-343` (resolves IDs), `clientResolver.mjs:110-166` ("scopes trainers but not admins beyond role"). Packet's own probe row: "server entitlement behavior for every command family is not yet proven… a denied operation cannot mint a success receipt." A trainer token scoped by `clientResolver` plus one dispatcher that forgets to re-check = wrong-client write. This is constraint 5's exact failure shape.
Fix: capability registry (operation → allowed roles → target-relation requirement) evaluated **after** resolution and **before** execution in `commandExecutor.mjs`; denied outcome writes an audit row with `outcome=denied` and the API returns a denial-shaped response that the frontend cannot render as success. Admin overreach stays permitted but is tagged in the audit log as explicit policy, not absence of checks.

**F3 — Client identity split across three namespaces with silent null-target send.**
Evidence: `AITerminalPanel.tsx:116-139` sends `clientId || null`; `AiConversation.mjs:24-83` stores `targetUserId`; `aiCommandRoutes.mjs:111-145` accepts `selectedClientId`; audit log records "resolved target client." The packet nowhere proves these share one key namespace (auth-user PK vs client-row PK). If `clientId` in the terminal is a Client-entity PK and `targetUserId` is a user PK, a trainer chatting about client A can execute a command resolving to client B. Also: `|| null` means an absent scope silently degrades to unscoped instead of failing loudly — the packet's own Jarvis-behavior list forbids "silently crossing scopes."
Fix: canonical target identity = user PK (`targetUserId`) across all lanes; `clientId`/`selectedClientId` accepted only as server-resolved aliases; any target-scoped operation with null/unresolvable target returns `400 TARGET_REQUIRED` (at `aiChatRoutes.mjs:308-344` and the command resolver), and the UI renders an explicit choose-client state. Receipts echo both alias and resolved user PK.

**F4 — Constraint 6 (offline) is failed by construction in current evidence.**
Evidence: the only workout-write channels in the packet are HTTP (`useCoachCommand.ts:96,170,207`) and a browser event dispatcher that is in-memory only (`aiWorkoutEvents.ts:121-128`). No local durable store, no queue, no reconcile contract appears anywhere. The packet's probe tables list no offline probe at all.
Fix: blueprint slice anchored at `frontend/src/utils/aiWorkoutEvents.ts:121-128` and `useCoachCommand.ts:96`: durable intent queue (IndexedDB) keyed by the `actionId` from F1; browser dispatch stays UI-only and may never render "saved"; on reconnect, replay via idempotent execute. Acceptance: airplane-mode log set shows "queued (N)" with zero success copy, and replays exactly once.

**F5 — PII/redaction middleware parity fails exactly on the health lanes.**
Evidence: `aiChatRoutes.mjs:466` applies subscription + rate-limit + PII middleware to chat. `coachIntakeRoutes.mjs:23-25` shows only protect + role auth + JSON limit — on the lane carrying health intake and **audio**. `coachProposalRoutes.mjs:15-16` shows protect + role only. Redaction exists only as audit-log parameter hashing (`AiCommandAuditLog.mjs:24-91`), not on intake artifacts. Constraint 1 names health data explicitly; the most sensitive lane has the least evidenced protection, and the packet's own intake risk column warns against "uncontrolled permanent memory."
Fix: apply the chat lane's middleware family (`aiChatRoutes.mjs:466` pattern) plus retention/TTL headers to `coachIntakeRoutes.mjs:23-25` and `coachProposalRoutes.mjs:15-16`; middleware-parity table becomes a green gate in the verification matrix.

**F6 — Proposal approval concurrency/replay is asserted, not evidenced.**
Evidence: `coachProposalRoutes.mjs:30-54` handlers; the packet claims "approval service calls `ensureClientAccess` and claims pending rows before apply" — with **no excerpt**, while its own probe row demands "Replay/concurrency, review-token binding… durable applied/failed receipt." A non-transactional "claim" plus two racing approvers = double-applied plan. Under constraint 2's catastrophic class, unevidenced is a defect.
Fix: conditional state transition (`UPDATE … WHERE id=? AND status='pending'`, require rowCount=1) inside a transaction; apply idempotent by proposal id; replayed approvals return the existing receipt; durable applied/failed row before UI success.

### MINOR

**F7 — Spike lane method coverage unevidenced beyond `GET /`.** `routes.mjs:630` mounts `/api/ai-chat/stream-spike` in the production stack; `aiStreamSpikeRoutes.mjs` gating is evidenced for `GET /` only (fail-closed `spikeEnabled`, `protect`, `adminOnly`). Probe must inventory all methods/paths in that router and verify disabled-404 on each. Mount order itself (specific-before-prefix) is correct Express practice — no finding there.

**F8 — Header claim "review-gated writes" is unsubstantiated.** The canonical-route section asserts `CoachCommandCenterPage` "represents itself as a talk-first review/history/tools shell with review-gated writes." The page excerpt (`CoachCommandCenterPage.tsx:34-43`) shows role/tab logic only; its evidenced write paths are message posts (`useAIChat.ts:217,425,448`) and raw command HTTP (`useCoachCommand.ts:96,170,207`). No gate excerpt exists. Per rule 5: cite the gate code or strike the claim from the header.

**F9 — Hive-mind doc asserts a pipeline absent from runtime.** `docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22` (Gemini/Qwen consensus) vs `routes.mjs:630-634` and `:378-379` (six other lanes, no evidenced consensus invocation). An implementer reading the doc builds the wrong brain. Fix: move to `docs/archive/` or rewrite to describe one internal capability; blueprint must record the retirement.

**F10 — Debate lane direct-`clientId` path lacks evidenced access check.** `aiDebateRoutes.mjs:57-76` "accepts/resolves client context" while ownership middleware is evidenced only for status/result/stream; the packet itself says "direct `clientId` path needs an explicit access probe." Fix: `ensureClientAccess` on the start path, mirroring the proposal approval pattern; probe trainer cross-client start denial.

**F11 — Legacy `SwanCoachAssistantPage` remains live-weight.** Classification table: no route mount found, yet "referenced by its own tests, child comments, and historical hooks," and the header's word "route-mount locks" cites no lock code. Fix: blueprint slice 1 fences it — route-tree grep for static imports, migrate or delete its tests, and replace "locks" with cited guard evidence.

### NOTE

**F12 — Undefined-role fail mode.** `CoachCommandCenterPage.tsx:34` `normalizeCoachCommandRole(authUser?.role)` — optional chaining means `undefined` flows in; no default is evidenced. Require least-privilege default + probe.
**F13 — Denormalization invariant.** `AiConversation.mjs:24-83` stores embedded `messages` plus `messageCount`/`lastMessageAt` — two sources of truth for one fact, no evidenced atomic update invariant. Require single-writer update or drop the counters.
**F14 — No retention/TTL on conversation or intake memory.** `AiConversation.mjs:24-83` has no retention field; intake audio retention is an open probe. Escalates to MAJOR if the probe finds no purge.

---

## C. Residual risks even after fixes

- Admin-unbounded scope (F2) is plausibly intended; the panel must rule policy, not assume.
- Hermes (`hermesRoutes.mjs:43,90,127,142`) and debate lanes remain classification-pending; the unified-brain boundary must fence them before any UI wiring.
- All MAJORs except F1/F3 rest partly on absence-of-evidence in a sanitized packet; live probes must confirm, not assume, before build slices start.

=== VERDICT ===
status: CONSENSUS
confidence: 87
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/idempotency key; retries double-execute mutations and no receipt contract exists (constraints 2/3/4) | F2=MAJOR: clientResolver.mjs L110-166 + aiCommandRoutes.mjs L110-145: entitlement is lane-level only; admin unscoped, per-dispatcher re-check unproven, denied op may mint success receipt (constraint 5) | F3=MAJOR: AITerminalPanel.tsx L116-139 vs AiConversation.mjs L24-83 vs aiCommandRoutes.mjs L111-145: client identity split across clientId/selectedClientId/targetUserId namespaces plus silent null-target send; wrong-client correlation unproven (constraint 2) | F4=MAJOR: useCoachCommand.ts L96,170,207 + aiWorkoutEvents.ts L121-128: no offline/degraded write path exists; cloud round-trip is the only evidenced workout-write channel (constraint 6 failed) | F5=MAJOR: coachIntakeRoutes.mjs L23-25 + coachProposalRoutes.mjs L15-16: PII/rate/retention middleware evidenced only on aiChatRoutes.mjs L466; health/audio lanes lack parity (constraint 1) | F6=MAJOR: coachProposalRoutes.mjs L30-54: 'claims pending rows' asserted with no excerpt and no transactional/replay evidence; concurrent approvals can double-apply | F7=MINOR: routes.mjs L630 + aiStreamSpikeRoutes.mjs: gating evidenced only for GET /; full method inventory + disabled-404 probe required | F8=MINOR: packet header 'review-gated writes' claim on CoachCommandCenterPage: no gate excerpt exists; cite or strike (rule 5) | F9=MINOR: APP-AI-HIVE-MIND.md L7-22 vs routes.mjs L630-634/L378-379: doc asserts pipeline absent from runtime; archive or reconcile | F10=MINOR: aiDebateRoutes.mjs L57-76: direct clientId start path lacks evidenced ensureClientAccess; cross-client denial probe required | F11=MINOR: SwanCoachAssistantPage: legacy, unmounted, still test/hook-referenced; 'route-mount locks' claim uncited; fence and retire in slice 1 | F12=NOTE: CoachCommandCenterPage.tsx L34: undefined-role normalizer fail mode unevidenced; require least-privilege default | F13=NOTE: AiConversation.mjs L24-83: messages + messageCount dual truth without evidenced atomic invariant | F14=NOTE: AiConversation.mjs L24-83: no retention/TTL on conversation/intake memory; escalates to MAJOR if no purge found
rebuttals: (none)
open: Q1=do seats accept absence-of-evidence MAJORs (F4 offline, F5 PII) or demote to must-probe MINORs pending live probes | Q2=is admin-unbounded clientResolver scope intended policy or defect — panel must rule | Q3=canonical target identity: user PK (my proposal) vs client PK — other seats pick | Q4=do /api/hermes and /api/ai/debate join the unified brain boundary or get fenced as operator lanes
consensus_block: FIX BEFORE BUILD: F1 (add actionId unique key + idempotent executor + receipt return in AiCommandAuditLog.mjs/aiCommandRoutes.mjs:111-145/useCoachCommand.ts:96,170,207), F3 (single canonical targetUserId user-PK identity; server-reject null targets with 400 TARGET_REQUIRED; receipts echo alias+resolved PK), F2 (capability registry checked post-resolution pre-execution in commandExecutor.mjs:309-343; denial writes audit row and returns denial-shaped response), F6 (conditional UPDATE ... WHERE status='pending' transaction + idempotent apply + durable applied/failed receipt at coachProposalRoutes.mjs:30-54), F5 (apply aiChatRoutes.mjs:466 middleware family + TTL to coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16; parity table gate). MUST-FIX PER SLICE: F4 (IndexedDB intent queue keyed by actionId; UI states queued/sending/verified only; reconcile replays exactly once), F7 (spike method inventory + disabled-404 on every method), F10 (ensureClientAccess on aiDebateRoutes.mjs:57-76 start path), F11 (fence SwanCoachAssistantPage, migrate tests, cite or drop 'locks'), F8 (cite the review-gate code or strike header claim), F9 (archive/rewrite hive doc). ACCEPTED AS INTENTIONAL (pending panel ruling): admin unbounded scope in clientResolver.mjs:110-166 IF ruled policy and tagged in audit; Express specific-before-prefix mount order at routes.mjs:630-634 is correct practice, not a defect. RESIDUAL RISKS: constraints 2/3/4/6 unverifiable until F1/F3/F4 land; all absence-based MAJORs require live probes confirming, not assuming; Hermes/debate classification unresolved; acceptance criterion 7 (44px/WCAG) has zero packet artifacts and must be carried entirely by the blueprint verification matrix.
=== END-VERDICT ===
