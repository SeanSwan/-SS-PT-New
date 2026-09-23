# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-7\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 5093 in / 4343 out · **Cost:** ~$0.0000 · **Wall:** 354.0s · **finish:** stop

---

# Ox Alpha — Round 7 — Fresh-Eyes Adversarial

## Structural observation first

Six rounds of unresolved findings cite exactly three locations: `AITerminalPanel.tsx:116-139`, `aiWorkoutEvents.ts:121-128`, and `CoachCommandCenterPage.tsx:38-42`. The panel has been tunnel-visioned on the client event-bus class. Holding the fresh-eyes lens, I re-read every excerpt in the packet without inheriting that fixation and found two defect classes **no seat has named**: falsy-coercion at the client-scope trust boundary, and the pre-auth role race in the controller mount. Both sit on lines the panel already cites but with mechanisms nobody extracted.

## New findings

**N5 = MAJOR — `AITerminalPanel.tsx:119` and `:129`: `clientId || null` silently coerces a present-but-falsy clientId to null at the trust boundary.**
Evidence: both call sites pass `clientId || null`. If `clientId` is `''` (cleared selector, reset form field, failed lookup), the expression evaluates to `null` — indistinguishable on the wire from "no client selected." Constraint 2 states client scope must be *explicit*; constraint 5 puts entitlement on the server. A null scope invites server-side default/self resolution instead of a hard rejection for scoped capabilities — precisely the wrong-client vector constraint 2 declares catastrophic. Fix: WHAT — replace `||` with `??` and add an explicit guard treating `''` as a defined error state (blocked send + surfaced error), never as null. WHERE — `AITerminalPanel.tsx:119` and `:129`. HOW — `const scopedClientId = clientId === '' ? BLOCKED : (clientId ?? null);` plus a contract test asserting `''` never serializes as `null` on the wire. Acceptance: injected empty-string clientId produces a visible blocked-send state, not a request.

**N6 = MAJOR — `CoachCommandCenterPage.tsx:35-36`: controller mounts under a fallback role before auth resolves.**
Evidence: `const { user: authUser } = useAuth();` returns undefined during auth load; `normalizeCoachCommandRole(authUser?.role)` therefore yields its fallback role; `useCoachCommandCenterController({ userRole })` mounts immediately with that fallback. F6 fixes tab re-coercion on `userRole` change but does nothing about controller effects/fetches fired under the transient role — wrong-scope reads, wasted calls, and error-message/timing leakage across role boundaries. Regardless of which direction the fallback points, mounting the controller under an unauthenticated default violates the role-grounding contract. Fix: WHAT — gate controller invocation on a resolved-auth predicate. WHERE — `CoachCommandCenterPage.tsx:35-36`. HOW — obtain `isAuthLoading`/`isAuthenticated` from `useAuth()`, return a loading shell until resolved, then invoke the controller with the final role; acceptance criterion: zero network requests issued with a fallback role (verifiable in the verification matrix, authorization row).

**N7 = MINOR — `AITerminalPanel.tsx:118` and `:128`: `` `${displayLabel} — ${context}` `` concatenates two distinct context keys into one lossy string.**
Evidence: both branches bake label and context into a single em-dash-delimited string passed positionally. This conflates identity keys used for attribution/reconciliation, and the delimiter is injectable from either field. Fix: pass a structured `{label, context}` through `sendMessageWithConversation`; fold the wire-format decision into F12's signature excerpt so the final package specifies one structured shape.

## Consensus disposition

I ADOPT the consensus candidate verbatim — F1–F12, N1–N4, accepted-as-intentional items, constraint mapping, and residual risks (a)–(e) — with two amendments: (i) N5 extends N2's call-shape unification (the unified shape must carry the tri-state clientId semantics, not just the persistence mode); (ii) N6 extends F6 (role re-coercion must be gated behind auth resolution, not merely reactive to `userRole` changes). No REJECTs; nothing in the candidate contradicts packet evidence.

Residual-risk addition: (f) until N5/N6 land, an empty clientId serializes as null scope and the controller issues fallback-role traffic — both are pre-receipt failure modes that server-side enforcement alone does not make observable.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: N5=MAJOR: AITerminalPanel.tsx L119,L129: clientId || null coerces empty-string scope to null at trust boundary, violating explicit-scope constraint 2 | N6=MAJOR: CoachCommandCenterPage.tsx L35-36: controller mounts under normalizeCoachCommandRole(undefined) fallback before auth resolves, firing wrong-role requests | N7=MINOR: AITerminalPanel.tsx L118,L128: displayLabel—context string concatenation conflates context keys, injectable delimiter
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE | F12=AGREE | N1=AGREE | N2=AGREE | N3=AGREE | N4=AGREE
open: Q1=does any seat hold packet evidence on useAIChat or useCoachCommandCenterController internals, or do both enter the F7-style probe list | Q2=what is normalizeCoachCommandRole's fallback value — determines whether N6 is degraded-UX or privilege-exposure, probe required either way
consensus_block: ADOPTED VERBATIM: F1-F12, N1-N4, accepted-intentional set, round-4 constraint mapping, residual risks (a)-(e). AMENDED: N2 unified call shape must also encode N5's tri-state clientId (explicit client | explicit none | blocked-on-empty, never silent null); F6 role re-coercion must be gated behind auth-resolution per N6, not merely reactive. NEW TO FIX BEFORE BUILD: N5 — AITerminalPanel.tsx:119,129 replace `clientId || null` with `??` plus empty-string guard producing blocked-send error state, contract test asserts '' never serializes as null; N6 — CoachCommandCenterPage.tsx:35-36 gate useCoachCommandCenterController on isAuthenticated/isAuthLoading with loading shell, acceptance: zero fallback-role network requests. NEW PER SLICE: N7 — AITerminalPanel.tsx:118,128 replace concatenated label string with structured {label, context}, folded into F12 signature excerpt. RESIDUAL RISK ADDED: (f) pre-N5/N6, empty clientId yields null scope and controller emits fallback-role traffic; server enforcement does not make these observable. All prior residual risks (a)-(e) stand unchanged.
=== END-VERDICT ===
