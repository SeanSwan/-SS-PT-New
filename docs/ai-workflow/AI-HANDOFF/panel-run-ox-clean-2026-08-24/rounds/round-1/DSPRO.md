# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-1\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 5430 in / 7431 out · **Cost:** ~$0.0103 · **Wall:** 160.9s · **finish:** stop

---

**Inference auditor stance:** Verify the builder’s local-verification claims against the code *as provided in the packet*, applying the highest evidence bar. Only path‑level, type‑drift, stale‑state, or happy‑path‑only defects backed by specific file/line excerpts count.

### Verified findings

**F1 – MAJOR: AiCommandAuditLog lacks idempotency key, violating the safe‑write contract**
- **Evidence**  
  Packet text under “Receipt and idempotency boundary” states:  
  `backend/models/AiCommandAuditLog.mjs:24-91` records actor, role, resolved target client, operation ID, outcome, error code, parameter hash/redaction, and duration. It explicitly says **“It has no `action_id` or unique idempotency key.”**  
  This directly undermines non‑negotiable constraints 4 (UI must not claim save without authoritative write) and 6 (offline/degraded story), and the panel’s own requirement that every action must have a durable, server‑side receipt with idempotency. A duplicate command could be processed without detection.

- **Fix**  
  `backend/models/AiCommandAuditLog.mjs`: add a `commandIdemKey` (UUID) column, make it unique per client scope, enforce `INSERT … ON CONFLICT DO NOTHING` for retry‑safe idempotency. The frontend must generate and pass this key; the backend must reject duplicates with the same key and return the original receipt.

**F2 – MINOR: Inconsistent `sendMessageWithConversation` invocation may drop required mode/scope**
- **Evidence**  
  `AITerminalPanel.tsx:116‑139` (packet excerpt) shows two call signatures:
  ```ts
  // With requestContext
  sendMessageWithConversation(
    text, context, `${displayLabel} — ${context}`,
    clientId || null, 'both', null, requestContext,
  );
  // Without requestContext
  sendMessageWithConversation(
    text, context, `${displayLabel} — ${context}`,
    clientId || null,
  );
  ```
  The second call omits `'both'` (mode) and `null` (options). If the function signature defaults to a single‑context mode, that branch could break the intended dual‑context (client + trainer) requirement, causing stale or wrong‑client context in the AI terminal. The code reveals a happy‑path assumption that the missing arguments are safe.

- **Fix**  
  `AITerminalPanel.tsx` lines ~125‑135: refactor to pass the same explicit arguments in both branches; use a named‑parameter object or a small helper to guarantee that `mode` and `options` are never omitted. Document the contract of `sendMessageWithConversation` in the hook.

**F3 – NOTE: Un‑reconciled “App AI Hive Mind” document creates stale‑state risk**
- **Evidence**  
  The packet itself identifies the conflict between the older `docs/ai-workflow/references/APP-AI-HIVE-MIND.md` (lines 7‑22 describe a Gemini->Qwen->Gemini consensus) and the current multi‑route architecture. The builder hasn’t classified or retired this document; leaving it as an “active reference” could mislead implementers into believing a unified consensus pipeline already exists.

- **Fix**  
  Add a header to `APP-AI-HIVE-MIND.md` marking it **DORMANT / NOT CURRENT RUNTIME** and reference the new brain blueprint. Treat this as a stale documentation bug.

---

=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: missing idempotency key (no action_id) – breaks safe-write contract, duplicate commands possible | F2=MINOR: frontend/src/components/AITerminalPanel.tsx L124-133: inconsistent sendMessageWithConversation call omits mode/options in non-requestContext branch – may drop dual-context scope | F3=NOTE: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: stale reference doc conflicts with current routes, never classified as dormant
rebuttals: (none)
open: Q1=Should the missing idempotency key be considered a must‑fix before any implementation slice, or can it be designed later at risk of re‑work? Q2=Is the legacy AITerminalPanel invocation a product‑level issue or a code‑cleanliness item that can be deferred?
consensus_block: F1: add `commandIdemKey UUID NOT NULL UNIQUE` to AiCommandAuditLog, enforce idempotent insertion, require client‑generated key; F2: refactor AITerminalPanel.tsx L124-133 to always pass mode and options, use a helper object; F3: mark APP-AI-HIVE-MIND.md as DORMANT and link to new blueprint. Acceptance criteria: (1) duplicate command submission returns original receipt; (2) AITerminalPanel tests prove both branches send identical context mode; (3) the reference doc no longer appears in active architecture docs. Residual risk: the panel must still define the full action/receipt lifecycle and offline reconciliation, which this fix only partially addresses.
=== END-VERDICT ===
