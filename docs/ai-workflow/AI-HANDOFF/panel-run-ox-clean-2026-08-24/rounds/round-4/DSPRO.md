# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-4\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6604 in / 5318 out · **Cost:** ~$0.0087 · **Wall:** 104.5s · **finish:** stop

---

The consensus candidate’s fixes are directly supported by the packet evidence and address the cited defects. I find no contradiction, missing evidence, or new major defect that would justify rejection; thus I adopt the candidate verbatim.

**Verification against code:**

- **F1 (idempotency):** `AiCommandAuditLog.mjs` L24‑91 defines no unique idempotency key, only an `operation ID` that is not guaranteed to prevent duplicates. The fix adds a `commandIdemKey` UUID UNIQUE column, and the executor must enforce idempotency—exactly what the model’s missing contract demands.  
- **F2 (argument drift):** `AITerminalPanel.tsx` L116‑139 shows two different call signatures to `sendMessageWithConversation` (one with extra `'both', null, requestContext`). This is unambiguous argument drift; the helper‑object refactor (`buildChatParams`) eliminates it.  
- **F3 (doc staleness):** `APP‑AI‑HIVE‑MIND.md` describes a Gemini‑Qwen‑Gemini consensus while the runtime has separate chat, command, intake, proposal, Hermes, and debate routes. The document is stale; marking it dormant is correct.  
- **F4 (line citation):** The evidence gate refresh pins the authoritative mounting range as `backend/core/routes.mjs:630‑634`; the earlier `L625‑634` citation is a minor inconsistency and rectified by using the narrower range.

All fixes are actionable, locatable, and preserve the builder’s stated intent. The residual risks correctly flag aspects not yet covered by this ruling (action/receipt lifecycle, retry audit, signature typing). No rejection is warranted.

=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: Missing unique idempotency key allows duplicate command audit entries | F2=MAJOR: frontend/src/components/AITerminalPanel.tsx L124-133: Argument drift between two sendMessageWithConversation calls risks incorrect parameter passing | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md: Architecture document conflicts with runtime lanes; must be marked DORMANT | F4=MINOR: backend/core/routes.mjs L625-634: Mount block line citation inconsistent; correct to L630-634
rebuttals: (none)
open: Q1=Remaining unresolved findings from running state must be addressed: frontend/src/utils/aiWorkoutEvents.ts L121-128 (no server‑side receipt for durable write), backend/routes/aiChatRoutes.mjs L308-344 vs L466 (cross‑client access verification), and others.
consensus_block: Adopt the integrated ruling. Fix F1 by adding a `commandIdemKey` UUID UNIQUE column to AiCommandAuditLog model (L24-91) and enforce insertion idempotency in the command executor using a client-generated key; reject duplicate submissions with the original receipt. Fix F2 by refactoring AITerminalPanel.tsx L124-133 to always pass mode and options via a helper object (e.g., `buildChatParams`) to eliminate argument drift. Fix F3 by marking APP-AI-HIVE-MIND.md DORMANT and linking to the new blueprint. Fix F4 by rectifying the mount-block line citation to one authoritative range (L630-634 as per the expanded snippet). Acceptance criteria: (1) duplicate command POST returns the original receipt and no new row; (2) a test proves both branches of AITerminalPanel send identical context/mode; (3) the reference doc is removed from active architecture index. Residual risks: the panel must still define the full action/receipt lifecycle and offline reconciliation; any existing retry/queue logic must be audited for the new idempotency key; and the function signature in useAIChat.ts should be explicitly typed to prevent future drift.
=== END-VERDICT ===
