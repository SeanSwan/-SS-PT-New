# Swan Coach Unified Brain — OX Reconciliation Packet

This is a sanitized, provider-neutral reconciliation packet. It contains no credentials, customer records, private identifiers, transcripts, cookies, database URLs, or raw provider error payloads. It is a blueprint-input artifact only; it authorizes no source edits, migrations, deployment, or feature enablement.

## Authority and review status

- The earlier clean three-seat run (GLM 5.3, Grok 4.6, DeepSeek V4 Pro) established the baseline `FIX BEFORE BUILD / REVISE` ruling.
- A fresh packet-fingerprinted run then included all four requested model families: GLM 5.3, Grok 4.6, DeepSeek V4 Pro, and Ox Alpha.
- The fresh run completed all 10 rounds at `MAXROUNDS / DISPUTE`, with 4/4 responses in round 10 and approximately `$0.7420` tracked spend under a `$1.40` hard cap.
- OX returned valid machine-readable verdicts in rounds 2, 6, and 10. Other OX rounds include upstream-pool failures or a timeout; those are transport gaps, not inferred opinions.
- Therefore OX is a real review input, but the panel did not reach unanimous consensus. The blueprint must preserve `FIX BEFORE BUILD / REVISE` and incorporate the amendments below before any build slice is approved.

## OX findings that change or tighten the blueprint

### OX-A — Receipt-backed idempotency is not optional

Evidence: `backend/models/AiCommandAuditLog.mjs:24-91` is described as holding actor, role, resolved target, operation, outcome, error code, parameter hash/redaction, and duration, but not a receipt payload. OX found that a bare unique key or post-execution audit insert cannot satisfy “duplicate command returns the original receipt.”

Required blueprint amendment:

- Use a durable receipt payload in the audit record or a sibling receipt table.
- Scope uniqueness to the authenticated actor/tenant and command key (for example `actor_id + command_idem_key`), never a globally forgeable client key.
- Use insert-first conflict handling (`ON CONFLICT DO NOTHING`/equivalent, then select the original receipt) before command side effects; no check-then-insert race.
- Persist the key at intent creation so offline retries reuse it after a crash.
- Acceptance: concurrent duplicate POSTs produce one execution and byte-identical original receipts for both responses; a different actor using the same raw key is isolated.

### OX-B — Restore the browser-event receipt contract

Evidence: `frontend/src/utils/aiWorkoutEvents.ts:121-128` returns only a dispatcher boolean. OX says this cannot be treated as save proof and must remain a dispatch hint until a server receipt verifies the write.

Required blueprint amendment:

- Restore this as a must-fix, separate from the command idempotency work.
- Event dispatch may attach a pending intent ID, but UI “Saved/Verified” state must require a server receipt from the authoritative write lane.
- Acceptance: a UI test fails when only the browser acknowledgement exists and passes only after a verified server receipt.

### OX-C — Widen context and scope checks across every caller

Evidence: `AITerminalPanel.tsx:116-139` and `CoachCommandCenter.actions.ts:203-204` both reach the shared chat signature. OX says fixing only the terminal panel leaves the canonical Coach Command Center path exposed to argument drift.

Required blueprint amendment:

- Define one typed `buildChatParams`/equivalent at the shared hook boundary (`useAIChat.ts`) and use it at every `sendMessageWithConversation` caller.
- Test identical context and mode across all callers, not only the terminal-panel branches.
- Probe ownership on `/api/ai-chat/conversations/:convId/messages`, not only creation-time `targetUserId` checks; reads and updates need the same actor/client scope.
- Probe admin target scope for command, chat, intake, proposal, debate, and related lanes.

### OX-D — Canonical target-client vocabulary must be explicit

Evidence: `AiConversation.mjs:24-83` uses `targetUserId`; `aiCommandRoutes.mjs:111-145` uses `selectedClientId`; `aiDebateRoutes.mjs:57-76` and `AITerminalPanel.tsx:116-139` use `clientId`.

Required blueprint amendment:

- Define one server-owned canonical target-client context key and identity meaning.
- Provide explicit mapping shims at lane boundaries until callers are migrated.
- Reject cross-lane mismatches with `409 TARGET_MISMATCH`, a denial receipt, and UI re-anchor.
- Do not call the system a unified brain until the shared boundary is proven; otherwise label the name as an aspirational blueprint title.

### OX-E — Legacy and reference drift must be part of the build gates

Required blueprint amendment:

- `SwanCoachAssistantPage` retirement requires a test-plan slice before deletion or fencing changes; surviving test references must be resolved without breaking the build.
- `APP-AI-HIVE-MIND.md:7-22` is dormant runtime-drift documentation and must be linked to or replaced by the new blueprint, not treated as active runtime truth.
- Intake/proposal lanes need per-client scope probes equal to command/chat scope checks.
- Use `backend/core/routes.mjs:630-634` as the canonical API mount citation in the blueprint; keep intake/proposals at `:378-379`.

## Synthesis instructions for the final AI blueprint

The final synthesizer must merge the baseline F1–F13 plan with OX-A through OX-E, preserve all `PROBE`/`UNKNOWN` labels, and not invent runtime behavior. The revised blueprint must include:

1. A ruling that remains `FIX BEFORE BUILD / REVISE`, with OX transport gaps disclosed.
2. A single canonical identity/context contract and mapping strategy.
3. A receipt store/payload and exactly-once idempotency design with actor-scoped uniqueness and offline key persistence.
4. Browser-event, chat-append, admin-scope, intake/proposal, debate, and legacy-test acceptance gates.
5. Updated Mermaid diagrams, role wireframes, state machines, PR slices, verification matrix, hostile findings, and builder order.
6. Explicit non-goals: no product-code edits in synthesis, no Hermes/Coach merge, no streaming claim before F7 evidence, no deletion of legacy surfaces during blueprint work.

## Final decision boundary

No Swan Coach implementation begins from this packet alone. The revised AI blueprint is the design authority. A builder may start only after the revised blueprint’s evidence gate is satisfied and the user explicitly authorizes the first implementation slice.
