# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-3\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 5075 in / 3912 out · **Cost:** ~$0.0000 · **Wall:** 146.6s · **finish:** stop

---

# Ox Alpha — Round 3 — Fresh-Eyes Adversarial

## Stance application

Rounds 1–2 converged on entitlement middleware, receipts, mount-order auth, and route inventory. That is a *server-trust* defect class. My remit is the class those stances structurally miss: **client-side contract divergence and dead reactive state — defects provable from the excerpts alone, without any server probe.** Two such defects survive scrutiny; one of them tops the unresolved-findings list yet was silently dropped from the consensus candidate's numbered rulings. That omission is itself a process defect I am correcting.

## New findings

**N1 — MAJOR — AITerminalPanel.tsx L116–133: the two `sendMessageWithConversation` call sites are mutually inconsistent, and the inconsistency is provable without knowing the true signature.**
The `requestContext` branch (L117–125) passes 7 args: `(text, context, label, clientId || null, 'both', null, requestContext)`. The fallback (L127–131) passes 4: `(text, context, label, clientId || null)`. Exactly three outcomes exist:
(a) the hook declares ≥7 params — then the fallback path silently drops the `'both'` channel argument and the 6th param, meaning the two branches execute **different persistence/channel semantics** for the same user action depending on whether `requestContext` happens to be set;
(b) the hook declares 4 params — then the 7-arg call's extras are discarded, meaning `requestContext` is **never transmitted** and the entire request-context feature is dead code presenting as functional;
(c) params 5–6 have defaults matching `'both'`/`null` — the only non-defective case, and the packet contains zero evidence for it.
Under (a) and (b) this is a correctness break; under all three cases the packet fails its own standard (Rule 5: builder claims are testable). The consensus candidate carries this item in RUNNING STATE but issued **no numbered ruling for it** — an unadjudicated MAJOR cannot silently exit the ledger. Fix: probe the `useAIChat` / `sendMessageWithConversation` declaration; whichever call site mismatches gets corrected to the declared signature; if (a), the fallback must be made explicitly identical in intent (`..., 'both', null`) or the divergence documented as deliberate with a comment and test.

**N2 — MINOR — CoachCommandCenterPage.tsx L38–40: `routeForcedTab` is consumed only inside the `useState` initializer; URL-driven tab changes are dead after mount.**
L38 computes `routeForcedTab = routeForcedTabForRole(searchParams, userRole)` on every render, but L40–43 seed `activeTab` once. A deep link (`/dashboard/trainer/coach-assistant?tab=tools`) navigated while the component is already mounted updates `searchParams`, recomputes `routeForcedTab`, and the value is discarded — the tab does not change. This extends F6 (which covers only `userRole` changes) to the second reactive input. Fix: same effect site as F6 — an effect keyed on `[searchParams, userRole]` that re-coerces `activeTab` when `routeForcedTab` changes, preserving user-initiated local tab switches (only override when the forced value differs from current).

**N3 — MINOR — aiWorkoutEvents.ts L121–124: the boolean return conflates "no dispatcher registered" with dispatch outcome, and the payload cast is unchecked.**
`if (!dispatch) return false; return dispatch(payload as AIEventPayload);` — a caller receiving `false` cannot distinguish an unregistered event name (wiring bug, should be loud in dev) from a handler rejecting the payload. The `as AIEventPayload` cast admits any shape at every call site. F4 correctly demotes this dispatch to queued-intent rendering; N3 adds that the queued-intent telemetry must record *which* failure occurred, or offline reconciliation (Constraint 6) cannot distinguish "event lost" from "event rejected." Fix: return a discriminated result `{status: 'dispatched' | 'unregistered' | 'rejected'}` and validate payload against the event's type guard before cast.

## On the consensus candidate

Adopted verbatim: F1–F9, the ACCEPTED-AS-INTENTIONAL clause, and RESIDUAL RISKS (a)–(d). No REJECTs — each cited line checks out against the packet excerpts. One amendment demanded by Rule 3: the candidate's silence on the AITerminalPanel divergence is corrected by N1 entering the ledger as a numbered MAJOR with a mandatory pre-blueprint probe gate.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: N1=MAJOR: AITerminalPanel.tsx L116-133: 7-arg vs 4-arg sendMessageWithConversation branches are mutually inconsistent; under any signature except defaulted-params-exactly-matching, one call site is wrong (dead requestContext or divergent 'both'/channel semantics); probe hook declaration before blueprint | N2=MINOR: CoachCommandCenterPage.tsx L38-40: routeForcedTab consumed only in useState initializer; searchParams-driven tab changes dead after mount; extend F6 effect to [searchParams, userRole] | N3=MINOR: aiWorkoutEvents.ts L121-124: boolean return conflates unregistered-dispatcher with handler rejection; unchecked payload cast; queued-intent telemetry must discriminate failure modes for offline reconcile
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE
open: Q1=do seats accept N1 as a mandatory pre-blueprint probe gate (hook signature declaration) alongside F2/F5 probes | Q2=is N2 folded into the F6 fix slice or tracked as its own PR-sized item
consensus_block: COMPLETE RULING (round-1 base + round-3 amendments). TO FIX BEFORE BUILD: F2 server entitlement middleware on every /api/ai-chat, /api/ai-command, /api/coach/* route; probe all four routers' middleware stacks. F3 server-resolved permitted clientId set per session; explicit rejection error code; every receipt binds {principal, clientId, capability}. F4 server receipt contract (receipt id, idempotency key, verified state); UI success renders only on receipt; aiWorkoutEvents.ts:121-128 renders as queued-intent, never success. F5 probe spike router auth at routes.mjs:625; feature flag + kill switch or policy-wrapped parent mount. N1 probe sendMessageWithConversation declaration; correct the mismatched call site in AITerminalPanel.tsx L116-133; acceptance criterion: both branches compile against the declared signature and a contract test asserts identical channel/persistence semantics modulo requestContext. F1 orchestrator corrects round frame or supplies seeder packet; until then findings apply to Swan Coach packet as delivered. TO FIX PER SLICE: F6+N2 single effect at CoachCommandCenterPage.tsx keyed [searchParams, userRole] re-coercing activeTab; preserve local tab switches. F7 add /api/hermes and /api/ai/debate to classification+probe list. F8 SwanCoachAssistantPage route inventory; redirect+deprecate if mounted. F9 verify review-gated writes by probe before blueprint reliance. N3 discriminated dispatch result {dispatched|unregistered|rejected} + payload type-guard in aiWorkoutEvents.ts. ACCEPTED AS INTENTIONAL: Evidence Boundary admissions (F7/F8/F9/F10/F11) are honest gaps provided probes enter final package item 2. RESIDUAL RISKS: (a) F2/F3 downgrade VIOLATED→UNPROVEN only with probe evidence, never to safe; (b) Constraint 6 offline design rests entirely on new work; (c) Constraint 8 redaction trusted not verified; (d) artifact identity voids all findings if seeder packet was true subject; (e) NEW: normalizeCoachCommandRole(undefined) during auth hydration is unproven — probe default-role path for tab/coercion leakage before build.
=== END-VERDICT ===
