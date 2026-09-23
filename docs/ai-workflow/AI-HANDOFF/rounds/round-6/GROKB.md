# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-6\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 8518 in / 8694 out · **Cost:** ~$0.0690 · **Wall:** 116.8s · **finish:** stop

---

Round 6, attack lens: trust boundaries, path handling, data-truth, false-success language.

The candidate is mostly the right security contract. F2/F3/F4/F5/N1/C6 are locatable and I adopt them. I do not adopt F13 as a MAJOR. That is an over-claim of a UI-contract break the excerpt does not prove — exactly the false-success failure mode this seat is here to cut.

**Adopted, with engineer fixes (unchanged)**

F2 — entitlement is per-router, not inherited from the dashboard shell (constraint 5). Probe and gate each mount: `/api/ai-chat` (`routes.mjs:626` / evidence-gate `:630`), `/api/ai-command` (`:627`), `/api/coach/intake` + `/api/coach/proposals` (`:378-379`), `/api/ai-chat/stream-spike` (`:625` with F5), `/api/hermes` (`:632`), `/api/ai/debate` (`:633`). Any router that fails the probe is BLOCKED from write capability until gated.

F3 — caller-supplied client scope is a trust-boundary break (constraint 2). `AITerminalPanel.tsx:119,133` sends `clientId || null`. `aiChatRoutes.mjs:308-344` accepts `targetUserId`. `aiCommandRoutes.mjs:111-145` accepts `selectedClientId`. `clientResolver.mjs:110-166` existence+tenant-checks trainers only. HOW: delete the `clientId` argument at `:119` and `:133`; collapse `targetUserId` and `selectedClientId` into one server-issued context token; receipts bind that token’s `client_id`, never the client-claimed value; resolver must existence+tenant check admins, not role-only; probe that `AiConversation.targetUserId` (`AiConversation.mjs:24-83`) cannot authorize a later domain write.

F4 — false-success is the live contract break (constraint 4). `dispatchAIWorkoutEvent` (`aiWorkoutEvents.ts:121-128`) returns a dispatcher boolean. `AiCommandAuditLog.mjs:24-91` has outcome/hash and no `action_id` / UNIQUE idempotency key. `useCoachCommand.ts:96,170,207` can fire execute|confirm|cancel as independent POSTs. HOW: new receipt `{action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE, provenance chat|command|workout-bridge, status}`; CAS `draft→pending_confirm→applied|denied|cancelled|failed`; UI may render success only on `applied`; the boolean must never map to success; do not reuse the audit log as that contract.

F5 — spike is mounted on the chat prefix (`routes.mjs:625` / `:630`) before `/api/ai-chat`. Packet says fail-closed + `protect` + `adminOnly` and no DB write. Still probe auth parity and keep the kill switch before any product streaming claim. Path order is correct (more-specific prefix first); do not invert it.

F6 — `CoachCommandCenterPage.tsx:38-42` coerces `activeTab` only in the `useState` initializer. Re-coerce in an effect on `[userRole, searchParams]`.

N1 — dispatcher registry (`aiWorkoutEvents.ts:121-128`) needs capability-token gate + payload schema + provenance audit + result enum (absorbs N4). Until that lands, residual (e) stands: unauthenticated in-page capability surface.

N2/N3 — single explicit persistence mode and defined failure states at `AITerminalPanel.tsx:116-139`.

C6 — offline queue is a separate durable store. `AiConversation.messages/status` (`AiConversation.mjs:24-83`) is memory, not a queue (constraint 3, 6).

F7/F8/F9/F12, F10/F11 STRUCK, C7/C8 — adopt as written.

**REJECT F13 as MAJOR**

`AITerminalPanel.tsx:116-139` shows two uncaught `await sendMessageWithConversation(...)` calls. It does not show a success toast, saved-label, or status flip. The network owner is `useAIChat.ts:217,425,448` (evidence-gate). Residual (g) already admits the hook may wrap the call. A missing local `try/catch` is not a proven violation of constraint 4. Promoting it to MAJOR is itself false-success language: we would be asserting a contract break we have not located.

F13 is absorbed into N2/N3 as a probe: excerpt `useAIChat` error/return contract; if the hook already surfaces failure, no additional wrap; if the panel paints success on settle-without-receipt, that is F4, not a new finding.

**New NOTE (does not flip more than the REJECT already does)**

F14 NOTE — intra-router gate split. Evidence-gate: create accepts `targetUserId` at `aiChatRoutes.mjs:308-344`; trainer target-client access is cited at `:610-625`. F2’s probe list must include create-path vs subsequent-path entitlement parity. If create can bind `AiConversation.targetUserId` without the `:610-625` gate, memory becomes an unauthorized scope oracle for later command/proposal writes. Not raised as MAJOR: the packet’s static result still says “auth and trainer access gates are present” for the router as a whole; this is a required probe, not a proven hole.

F15 NOTE — CI/assert gap. Packet has zero test that a denied operation cannot mint `outcome=success` on `AiCommandAuditLog.mjs:24-91` or a 2xx from `useCoachCommand.ts:96,170,207`. Package item 8 must include that negative assert before any write-capable slice.

No migrate→seed→migrate evidence exists in this packet (residual d still governs artifact identity). No new MAJOR.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F2=MAJOR: routes.mjs L626-633+L378-379: per-router entitlement unproven; fail-closed block writes until gated | F3=MAJOR: AITerminalPanel.tsx L119,L133 + aiChatRoutes.mjs L308-344 + aiCommandRoutes.mjs L111-145 + clientResolver.mjs L110-166: caller-supplied clientId; receipts must bind server-resolved client_id | F4=MAJOR: AiCommandAuditLog.mjs L24-91 + aiWorkoutEvents.ts L121-128 + useCoachCommand.ts L96,L170,L207: no receipt/idempotency; boolean dispatch and audit outcome are not success | F5=MAJOR: routes.mjs L625/L630: spike-lane auth-parity probe + kill switch before enable | F6=MINOR: CoachCommandCenterPage.tsx L38-42: activeTab coerced only at useState init | F14=NOTE: aiChatRoutes.mjs L308-344 vs L610-625: create-path targetUserId vs later trainer access check unproven coherent | F15=NOTE: no negative assert denied-command cannot mint success (AiCommandAuditLog.mjs L24-91 / useCoachCommand.ts L96,L170,L207) | N1=NOTE: aiWorkoutEvents.ts L121-128: capability-token + schema + provenance + result enum | N2=NOTE: AITerminalPanel.tsx L116-139: single persistence mode + defined failure states | C6=NOTE: AiConversation.mjs L24-83: offline queue must not be messages/status
rebuttals: F13=REJECT: AITerminalPanel.tsx L116-139 has uncaught await but no success-render; network owner is useAIChat.ts L217,L425,L448; residual (g) already flags possible wrap — not a proven constraint-4 break; absorb into N2/N3 probe | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | N1=AGREE | N2=AGREE | N3=AGREE | C6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F12=AGREE
open: Q1=does aiChatRoutes create (L308-344) invoke the L610-625 trainer access gate? | Q2=does useAIChat already wrap sendMessageWithConversation (F13 residual g)? | Q3=AiConversation write-SQL / version column for lost-update (residual f) | Q4=retire or capability-classify APP-AI-HIVE-MIND.md before builder treats Gemini/Qwen consensus as a bypass lane
consensus_block: DISPUTE — adopt candidate verbatim except F13. F13 is not MAJOR; fold into N2/N3 as a useAIChat.ts:217,425,448 error-contract probe. Keep F2/F3/F4/F5/F6/N1/N2/N3/C6/F7-F9/F12 and F10/F11 STRUCK as written. Add F14 (create vs L610-625 entitlement parity inside F2 probes) and F15 (negative assert: denied cannot mint success). FIXES unchanged for F2 (per-router probe; block writes on fail), F3 (delete clientId at AITerminalPanel.tsx:119,133; server-issued context token; resolver existence+tenant for admins), F4 (new receipt+UNIQUE idempotency_key+CAS; boolean never equals success; do not reuse AiCommandAuditLog.mjs:24-91), F5 (auth-parity probe + kill switch; do not invert mount order), F6 (effect on [userRole, searchParams]). Residuals (a)-(f) stand; drop (g) as a MAJOR residual, keep it as the N2/N3 probe.
=== END-VERDICT ===
