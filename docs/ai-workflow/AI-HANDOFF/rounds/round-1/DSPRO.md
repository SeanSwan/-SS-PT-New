# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-1\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 8100 in / 7660 out · **Cost:** ~$0.0070 · **Wall:** 164.6s · **finish:** stop

---

=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: F6=MAJOR: CoachCommandCenterPage.tsx L38-42: activeTab state initialized with userRole but not updated on role/searchParams change; stale-state contradicts role-aware claim | F2=MAJOR: packet prose: claims of route mounts and middleware lack code excerpts; evidence bar unmet | F3=MAJOR: AITerminalPanel.tsx L119,L133: caller-supplied clientId not server-resolved; potential cross-client mutation | F4=MAJOR: aiWorkoutEvents.ts L121-128: boolean return not a durable receipt; missing idempotency contract | F5=MAJOR: routes.mjs L625: stream-spike lane auth parity unverified
rebuttals: (none)
open: Q1=probe results for F2/F3/F5 severity; Q2=SwanCoachAssistantPage classification finalization
consensus_block: ADOPTED VERBATIM with two endorsed sharpenings; no rejections, no new MAJORs. FIXES: F2 — probe entitlement middleware per enumerated router: /api/ai-chat (routes.mjs:626), /api/ai-command (:627), /api/coach/intake + /api/coach/proposals (mounts unexcerpted), plus /api/ai-chat/stream-spike (:625 with F5), /api/hermes (:632), /api/ai/debate (:633); any router failing probe is BLOCKED from write capability until gated. F3 — replace caller-supplied clientId (AITerminalPanel.tsx:119,133) with server-resolved permitted-clientId set; receipts bind server-resolved client_id, never client-claimed; probe no memory→domain write cycle. F4 — receipt contract {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE at storage (probe — packet has zero schema), provenance chat|command|workout-bridge, status enum}; AITerminalPanel renders success only on receipt; dispatchAIWorkoutEvent boolean (aiWorkoutEvents.ts:121-128) never maps to success. F5 — probe spike-lane auth parity; feature flag + kill switch before enable. F6 — CoachCommandCenterPage.tsx:38-42 re-coerce activeTab via effect on [userRole, searchParams]. F7/F8/F9/F12 — probes + excerpts into final package item 2; F8 settles 4-named-surfaces vs 3-mounts and classifies SwanCoachAssistantPage. N1 — capability-token gate + payload schema validation + provenance audit + result enum on dispatcher registry (absorbs N4). N2/N3 — single explicit persistence mode in AITerminalPanel.tsx:116-139; defined failure states. ACCEPTED AS INTENTIONAL: evidence-boundary admissions behind F7/F8/F9 with probe list entering package item 2; F10/F11 STRUCK; C8 redaction trusted not verified; C7 consistency (all excerpts TS/TSX) with a11y/44px/mobile proof deferred to blueprint items 5+8 (no citable code defect). RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes return; (b) C6 offline is net-new design — no queue/idempotency code exists in packet; (c) C8 redaction unverified; (d) F1 artifact identity — if the seeder packet was the true subject, every finding here is void; (e) until N1 lands, the client event bus remains an unauthenticated in-page capability surface.
=== END-VERDICT ===
