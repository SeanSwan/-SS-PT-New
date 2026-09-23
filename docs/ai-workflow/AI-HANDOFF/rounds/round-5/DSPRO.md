# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-5\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 8006 in / 7799 out · **Cost:** ~$0.0072 · **Wall:** 194.4s · **finish:** stop

---

I adopt the consensus candidate verbatim and add one new MAJOR finding from the inference-auditor lens: the `AITerminalPanel.tsx` send path contains no error handling, a happy-path-only logic defect that can leave the UI in a false-success state, violating the non-negotiable constraint that the UI must not claim an action is saved without authoritative verification.

**New MAJOR finding (F13):**
- **File + line:** `AITerminalPanel.tsx:116-139` (the two `await sendMessageWithConversation(...)` calls).
- **Defect:** No `try/catch` or `.catch()` handler. If `sendMessageWithConversation` rejects (network failure, server error, etc.), the promise rejection is unhandled in the async handler. The UI receives no failure signal, so it cannot transition to an error state; it may remain in a loading/success posture, misleading the user into believing the message was sent or an action was saved.
- **Severity:** MAJOR — breaks the correctness contract “The UI cannot say an action is saved before an authoritative write and verification justify that state.”
- **Fix:** Wrap each call in a try/catch that sets a local error state and surfaces a user-visible failure message; ensure the terminal panel’s persistence mode (N2/N3) defines explicit failure states (e.g., `sending`, `sent`, `failed`).  
  **Where:** `AITerminalPanel.tsx:116-139`.  
  **How:**  
  ```ts
  try {
    await sendMessageWithConversation(...);
    // transition to sent state
  } catch (err) {
    // transition to failed state, show error toast/inline message
  }
  ```

All other items in the consensus candidate stand; I have no rejections. The new finding is additive and aligns with the already-endorsed N2/N3 (explicit persistence mode + defined failure states).

=== VERDICT ===
status: CONSENSUS
confidence: 93
findings: F13=MAJOR: AITerminalPanel.tsx L116-139: missing error handling on sendMessageWithConversation — unhandled rejection can leave UI in false-success state, violating "UI cannot say saved before authoritative write"
rebuttals: (none)
open: Q1=Does the existing useAIChat hook already wrap sendMessageWithConversation with error handling? (packet does not include hook implementation; probe required)
consensus_block: ADOPTED VERBATIM with one new MAJOR (F13). FIXES: F2 — probe entitlement middleware per enumerated router: /api/ai-chat (routes.mjs:626), /api/ai-command (:627), /api/coach/intake + /api/coach/proposals (mounts unexcerpted), plus /api/ai-chat/stream-spike (:625 with F5), /api/hermes (:632), /api/ai/debate (:633); any router failing probe is BLOCKED from write capability until gated. F3 — replace caller-supplied clientId (AITerminalPanel.tsx:119,133) with server-resolved permitted-clientId set; receipts bind server-resolved client_id, never client-claimed; probe no memory→domain write cycle. HOW: delete clientId argument from sendMessageWithConversation call sites at AITerminalPanel.tsx:119 and :133; collapse targetUserId (aiChatRoutes.mjs:308-344) and selectedClientId (aiCommandRoutes.mjs:111-145) into one server-issued context token; clientResolver.mjs:110-166 must existence+tenant check admins, not role-only. F4 — receipt contract {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE at storage (probe — packet has zero schema), provenance chat|command|workout-bridge, status enum}; AITerminalPanel renders success only on receipt; dispatchAIWorkoutEvent boolean (aiWorkoutEvents.ts:121-128) never maps to success. HOW: add UNIQUE(idempotency_key) and CAS status machine draft→pending_confirm→applied|denied|cancelled|failed so execute/confirm/cancel cannot both succeed; do not reuse AiCommandAuditLog.mjs:24-91 as that contract. F5 — probe spike-lane auth parity; feature flag + kill switch before enable. F6 — CoachCommandCenterPage.tsx:38-42 re-coerce activeTab via effect on [userRole, searchParams]. F13 — wrap sendMessageWithConversation calls in AITerminalPanel.tsx:116-139 with try/catch; surface failure state per N2/N3. F7/F8/F9/F12 — probes + excerpts into final package item 2; F8 settles 4-named-surfaces vs 3-mounts and classifies SwanCoachAssistantPage. N1 — capability-token gate + payload schema validation + provenance audit + result enum on dispatcher registry (absorbs N4). N2/N3 — single explicit persistence mode in AITerminalPanel.tsx:116-139; defined failure states (now includes F13 error handling). C6 — offline queue is a separate durable store, never AiConversation.messages/status (AiConversation.mjs:24-83). ACCEPTED AS INTENTIONAL: evidence-boundary admissions behind F7/F8/F9 with probe list entering package item 2; F10/F11 STRUCK; C8 redaction trusted not verified; C7 consistency (all excerpts TS/TSX) with a11y/44px/mobile proof deferred to blueprint items 5+8 (no citable code defect). RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes return; (b) C6 offline is net-new design — no queue/idempotency code exists in packet; (c) C8 redaction unverified; (d) F1 artifact identity — if the seeder packet was the true subject, every finding here is void; (e) until N1 lands, the client event bus remains an unauthenticated in-page capability surface; (f) AiConversation embedded messages + no version (AiConversation.mjs:24-83) is an unproven lost-update race pending write-SQL excerpt; (g) F13 error-handling gap may be partially mitigated if useAIChat already wraps the call — probe required.
=== END-VERDICT ===
