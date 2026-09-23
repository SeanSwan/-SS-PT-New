# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-5\REVIEW-DOC.md
**Tokens:** 7693 in / 15017 out (reasoning: 11515) | total 22710
**Wall:** 174.0s

---

# GLM 5.3 — Round 5 — Full-Spectrum Review (correctness / security / schema truth / 8-AC line-by-line)

## 0. Position

Round-4 candidate is adopted **verbatim**: all fixes (F2, F3, F4, F5, F6, N1, N2/N3, C6), all "accepted as intentional" rulings, all six residual risks. Zero REJECTs, zero new MAJORs. I carry three additive sharpenings, all MINOR — none disturbs a fix's substance; two of them repair the citation frame and completeness of the ruling itself, which is squarely my remit.

## 1. Adoption ledger (verified against packet before adoption)

| Adopted item | Packet verification |
|---|---|
| F2 entitlement probes | Refresh table: `aiChatRoutes.mjs:283` protect, `:466` subscription/rate/PII, `:610-625` trainer target check; `aiCommandRoutes.mjs:110` protect+kill-switch; `coachIntakeRoutes.mjs:23-25`, `coachProposalRoutes.mjs:15-16` admin/trainer gates. Probe-and-block rule is the only posture consistent with constraint 5. |
| F3 caller-supplied clientId | `AITerminalPanel.tsx:116-139` passes `clientId \|\| null` into `sendMessageWithConversation`; `aiChatRoutes.mjs:308-344` accepts `targetUserId`; `aiCommandRoutes.mjs:111-145` accepts `selectedClientId`; refresh states `clientResolver.mjs:110-166` "scopes trainers but not admins beyond role." All four cites verified. One endorsed addition to the HOW: the server-issued context token must also be the **only** source for `AiConversation.targetUserId` at creation (`AiConversation.mjs:24-83` field list), and the `:610-625` per-message target check must extend to admin existence+tenant, mirroring the clientResolver fix — otherwise the token is minted once but the persisted conversation row keeps a client-claimed value. |
| F4 receipt contract | Packet's own admission: `AiCommandAuditLog.mjs:24-91` "has no action_id or unique idempotency key"; `aiWorkoutEvents.ts:121-128` returns a dispatcher boolean. CAS machine + UNIQUE(idempotency_key) endorsed unchanged. |
| F5/F6/N1/N2-N3/C6 | `aiStreamSpikeRoutes` fail-closed `spikeEnabled` (refresh); `CoachCommandCenterPage.tsx:34-43` one-shot `useState` coercion (async auth hydration makes role undefined at first coercion — the effect fix is correct); `dispatchAIWorkoutEvent` casts `payload as AIEventPayload` with zero validation (unauthenticated in-page bus, residual e); two divergent send call-shapes in `AITerminalPanel.tsx:116-139`; `AiConversation.mjs:24-83` embeds `messages`+`status` (C6 + residual f). |

Rule-5 sweep: the refresh's builder admissions ("receipt contract… unproven and must be designed by the panel") contradict no excerpt — F4 already captures the gap. No new header-contradiction finding.

## 2. M1 (new, MINOR) — The ruling's own mount-line anchors are forked and internally incoherent

The packet carries **two incompatible line frames for the same five-mount block**:

- **Frame A** — excerpt header `backend/core/routes.mjs:625-634` (5 contiguous mounts): spike 625, chat 626, command 627, hermes 628, debate 629.
- **Frame B** — Evidence gate refresh (dated 2026-08-23, self-described correction): "routes.mjs:**630-634** mounts stream-spike, chat, command, Hermes, and debate in that order": spike 630, chat 631, command 632, hermes 633, debate 634.

The round-4 candidate cites spike `:625`, chat `:626`, command `:627` (**Frame A**) but hermes `:632`, debate `:633` (**matches neither** — Frame B says 633/634). Six anchors, no single frame that satisfies them. The fork has already propagated into the running-state ledger, which lists both `routes.mjs L625-634` and `routes.mjs L630-634` as unresolved anchors.

This is not pedantry: final package item 7 demands "exact routes/services to probe/change," and rule 1 cuts unlocatable claims. A blueprint with phantom line numbers fails its own evidence gate.

**Fix — WHAT:** pin one frame and repoint every F2/F5 anchor to it. **WHERE:** all citations of the mount block in package items 2 and 7. **HOW:** one probe — `sed -n '620,640p' backend/core/routes.mjs` — settles it in seconds; until the probe returns, **Frame B is presumed governing** (it is the later, dated correction), so the canonical anchors become: spike `routes.mjs:630`, chat `:631`, command `:632`, hermes `:633`, debate `:634`, intake `:378`, proposals `:379`. Internal-route cites (`aiChatRoutes.mjs:308-344`, `:610-625`; `aiCommandRoutes.mjs:111-145`; `clientResolver.mjs:110-166`) are refresh-sourced and unaffected.

## 3. M2 (new, MINOR) — The ruling is silent on a disposition the packet mandates: the Hive Mind doc

The packet twice forces a decision: "Decide whether it is active runtime truth, planned policy, stale documentation, or one internal capability" and the surface table: "The next blueprint **must reconcile or explicitly retire** this document" (`docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22`). That is a testable assertion about the blueprint — and the round-4 candidate, the blueprint's precursor, contains no item owning it. F7/F8/F9/F12 cover surfaces and mounts, not this doc. An active reference describing a Gemini→Qwen→Gemini free-consensus brain that matches none of the five mounted lanes is precisely the "alternate product direction" vector constraint 9 exists to close.

**Fix — WHAT:** classify and dispose. **WHERE:** `APP-AI-HIVE-MIND.md:7-22`, disposition recorded in package item 2's classification table. **HOW:** probe the import graph for any runtime module implementing/importing the hive-mind consensus chain; classification defaults to **STALE-DOCUMENTATION-PENDING-PROBE** with default disposition **RETIRE-AND-REDIRECT** (doc header redirects to package item 3's capability registry) unless the probe finds a live import, in which case it is a bounded internal capability behind the N1 gate, not a parallel brain.

## 4. M3 (new, MINOR) — Acceptance-criteria traceability: the 8 constraints, line by line

The ruling's fixes are sound but unmapped to the eight non-negotiables. My remit requires the mapping; the builder handoff (package item 10) cannot verify acceptance without it.

| AC | Constraint | Owning finding(s) | Acceptance test | Gap today |
|---|---|---|---|---|
| 1 | Least-privilege production SaaS | F2 + F3 | Role×router×read/write probe matrix, deny-by-default; admin existence+tenant check live in `clientResolver.mjs:110-166` | Entitlement unproven across `routes.mjs:630-634` + `:378-379` routers |
| 2 | Wrong-client mutation catastrophic | F3 + F4 | Cross-client write attempt yields denial receipt only, bound to **server-resolved** client_id; no path mints success on denial (refresh's own probe requirement) | `clientId` caller-supplied at `AITerminalPanel.tsx:119,133`; `targetUserId`/`selectedClientId` accepted at `aiChatRoutes.mjs:308-344` / `aiCommandRoutes.mjs:111-145` |
| 3 | Memory ≠ domain truth | C6 + F4 | No domain-write path sources from `AiConversation.messages`/`status`; receipts are the only success proof | `messages`+`status` embedded, no version field (`AiConversation.mjs:24-83`, residual f) |
| 4 | No "saved" before authoritative write | F4 | Zero success UI state reachable without a receipt; `dispatchAIWorkoutEvent` boolean never renders success | `aiWorkoutEvents.ts:121-128` returns bare boolean |
| 5 | Server-enforced entitlements | F2 | Any router failing probe is write-blocked until gated | Probes not yet run |
| 6 | Offline gym-floor story | C6 | Durable queue store with `UNIQUE(idempotency_key)` + reconcile lifecycle diagram (package items 4/6) | **Zero queue code exists** — design-gate only (residual b) |
| 7 | Standards: TS/styled/44px/WCAG/mobile | C7 → **sharpened** | A11y/44px/mobile matrix (item 8) run against a **cited control inventory**: add two probes — full `AITerminalPanel.tsx` excerpt and `CoachCommandCenterPage.tsx:149+` (JSX shell begins there per refresh; not in packet) | No JSX excerpts in packet — deferral was evidence-bound; now it is a named probe, not a shrug |
| 8 | Redaction (Ox Alpha) | C8 | None possible in-packet | Trusted-not-verified (residual c) |

## 5. Residual risks — carry (a)–(f) unchanged, add one

- **(g)** Hive-mind disposition unproven until the M2 import-graph probe returns; until then a stale orchestration spec remains live in the repo.

=== VERDICT ===
status: CONSENSUS
confidence: 90
findings: F2=MAJOR(adopted): per-router entitlement unproven — routes.mjs:630-634+:378-379 (Frame B); write-block until probed | F3=MAJOR(adopted): caller-supplied clientId — AITerminalPanel.tsx:119,133; aiChatRoutes.mjs:308-344; aiCommandRoutes.mjs:111-145; clientResolver.mjs:110-166 admin role-only; add: token is sole source of AiConversation.targetUserId, per-message check extended to admins | F4=MAJOR(adopted): no action receipt/idempotency — AiCommandAuditLog.mjs:24-91 lacks action_id+unique key; aiWorkoutEvents.ts:121-128 boolean never maps to success; CAS draft→pending_confirm→applied|denied|cancelled|failed | F5=MINOR(adopted): spike-lane auth-parity probe, routes.mjs:630 (renumbered per M1), flag+kill switch before enable | F6=MINOR(adopted): stale activeTab — CoachCommandCenterPage.tsx:38-42 effect on [userRole, searchParams] | N1=NOTE(adopted): capability-token gate + schema validation on aiWorkoutEvents.ts dispatcher registry (absorbs N4) | N23=MINOR(adopted): single explicit persistence mode + defined failure states, AITerminalPanel.tsx:116-139 | C6=MINOR(adopted): offline queue is separate durable store, never AiConversation.messages/status (AiConversation.mjs:24-83) | M1=MINOR(new): mount-line frame fork — packet excerpt routes.mjs:625-634 vs refresh :630-634; round-4 anchors (625/626/627 + 632/633) match no single frame; pin via sed probe, Frame B presumed | M2=MINOR(new): consensus silent on mandated APP-AI-HIVE-MIND.md:7-22 disposition — classify STALE-PENDING-PROBE, default RETIRE-AND-REDIRECT into package item 2 | M3=MINOR(new): AC1-AC8 traceability matrix added; AC7 probes add full AITerminalPanel.tsx + CoachCommandCenterPage.tsx:149+ JSX
rebuttals: (none)
open: Q1=one sed probe on routes.mjs settles mount frame (A=625-629 vs B=630-634) | Q2=hive-mind import-graph probe decides RETIRE vs RECONCILE | Q3=F2/F3 severity ceilings once entitlement probes return
consensus_block: ADOPT round-4 candidate VERBATIM with three additive sharpenings, zero rejections. FIXES (anchors normalized to Frame B per M1): F2 — entitlement probe per router (/api/ai-chat routes.mjs:631, /api/ai-command :632, /api/coach/intake :378, /api/coach/proposals :379, /api/ai-chat/stream-spike :630 with F5, /api/hermes :633, /api/ai/debate :634); failing router = write-blocked until gated. F3 — delete clientId arg at AITerminalPanel.tsx:119,133; collapse targetUserId (aiChatRoutes.mjs:308-344) + selectedClientId (aiCommandRoutes.mjs:111-145) into server-issued context token; clientResolver.mjs:110-166 existence+tenant checks admins; ADD: token is sole source of AiConversation.targetUserId; per-message target check (aiChatRoutes.mjs:610-625) covers admins. F4 — receipt {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE, provenance chat|command|workout-bridge, status enum} + CAS state machine; AITerminalPanel renders success only on receipt; do not reuse AiCommandAuditLog.mjs:24-91. F5 — spike parity probe + flag/kill switch. F6 — re-coerce activeTab via effect on [userRole, searchParams] at CoachCommandCenterPage.tsx:38-42. N1 — capability-token gate + payload schema validation + provenance + result enum on dispatcher registry (absorbs N4). N2/N3 — single persistence mode, AITerminalPanel.tsx:116-139. C6 — offline queue separate durable store, never AiConversation.messages/status. M1 — run sed -n '620,640p' routes.mjs; repoint all item-2/item-7 anchors to the winning frame (Frame B presumed). M2 — hive-mind import-graph probe; default RETIRE-AND-REDIRECT (redirect header → package item 3 capability registry) unless live import found, then bounded capability behind N1 gate. M3 — AC1-AC8 matrix (section 4) enters package item 10 as the acceptance gate; AC7 adds probes: full AITerminalPanel.tsx + CoachCommandCenterPage.tsx:149+ JSX. ACCEPTED AS INTENTIONAL: unchanged from round 4 (evidence-boundary admissions F7/F8/F9 + probe list into item 2; F10/F11 struck; C8 trusted; C7 deferred — now with named probes per M3). RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes; (b) C6 offline is net-new design, zero queue code in packet; (c) C8 redaction unverified; (d) F1 artifact identity void-risk; (e) client event bus unauthenticated until N1; (f) AiConversation embedded messages + no version — lost-update race pending write-SQL excerpt; (g) hive-mind disposition open until M2 probe.
=== END-VERDICT ===
