# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-5\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6348 in / 5304 out · **Cost:** ~$0.0086 · **Wall:** 114.0s · **finish:** stop

---

### Round 5 — DeepSeek V4 Pro (Inference Auditor)

I verify the builder’s local-verification claims against the provided evidence. The consensus candidate addresses four findings; I examine each against the code excerpts, checking for happy-path-only logic, type drift, and stale-state bugs.

---

#### F1 — Missing idempotency key in AiCommandAuditLog
- **Evidence**  
  `backend/models/AiCommandAuditLog.mjs` L24‑91 lists audit fields but no unique idempotency key column.  
  `commandExecutor.mjs:309‑343` (referenced) resolves client IDs but performs no duplicate‑receipt check.  
  The packet states: “`AiCommandAuditLog` … has no `action_id` or unique idempotency key … the required authoritative action receipt and retry/idempotency contract remain **unproven**.”  
- **Claim**  
  Adding a `commandIdemKey` UUID UNIQUE column and enforcing insertion idempotency in the command executor will prevent duplicate command receipts.  
- **Auditor’s assessment**  
  The code currently **lacks** the column; there is no contradictory logic that would break if the column is added. The fix is necessary and sufficient for the model layer. The typo in the column name (“idem” vs “idempotency”) is a naming drift, but the functional intent is clear. No happy‑path failure or stale‑state condition is introduced by this change.  
  **Verdict**: ACCEPT.

---

#### F2 — Argument drift in AITerminalPanel
- **Evidence**  
  `AITerminalPanel.tsx` L124‑133 shows two calls to `sendMessageWithConversation`:
  - When `requestContext` exists, it passes `'both', null, requestContext`.
  - Without `requestContext`, it passes only `clientId || null`, omitting the mode and options.
  The signature is not shown, but the second call relies on default behaviour that may differ from the explicit `'both', null` used in the other branch. This is a type/path drift.  
- **Claim**  
  Refactor to always pass mode and options via a helper object (`buildChatParams`) to eliminate argument drift.  
- **Auditor’s assessment**  
  The code exhibits a genuine drift: one branch sets explicit context‑mode; the other doesn’t. If the default ever changes or the function signature evolves, the two paths will diverge silently. The proposed refactor eliminates that risk. No evidence contradicts the fix.  
  **Verdict**: ACCEPT.

---

#### F3 — Active reference doc with runtime drift
- **Evidence**  
  `docs/ai-workflow/references/APP-AI-HIVE-MIND.md` L7‑22 describes a free Gemini/Qwen/Gemini consensus, while the mounted runtime includes chat, command, intake, proposals, Hermes, and debate lanes. The packet classifies it as “active reference doc with runtime drift.”  
- **Claim**  
  Mark the document DORMANT and link to the new blueprint.  
- **Auditor’s assessment**  
  This is a documentation hygiene fix. The codebase is not altered; no stale‑state or type drift is introduced. It aligns the documentation surface with the current architecture.  
  **Verdict**: ACCEPT.

---

#### F4 — Stale route‑mount citation
- **Evidence**  
  The packet and earlier rounds cited `backend/core/routes.mjs` L625‑634; the actual authoritative mount block is L630‑634 (the snippet shows stream‑spike, chat, command, Hermes, debate). L625‑629 are not part of the block.  
- **Claim**  
  Rectify the line citation to the single authoritative range L630‑634.  
- **Auditor’s assessment**  
  This is a simple evidence correction. No code change; no impact on behaviour.  
  **Verdict**: ACCEPT.

---

**New findings from inference audit**  
None. The consensus fixes are sound and do not introduce new stale‑state, type‑drift, or happy‑path‑only logic gaps against the provided code.

---

### VERDICT

=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: missing idempotency key column to prevent duplicate command receipts | F2=MAJOR: frontend/src/components/AITerminalPanel.tsx L124-133: argument drift in sendMessageWithConversation calls leads to inconsistent mode/options | F3=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: documentation describes free consensus system in tension with current architecture, should be marked DORMANT | F4=MINOR: backend/core/routes.mjs L625-634: stale citation range; L630-634 authoritative
rebuttals: (none)
open: Q1=verify that client-side idempotency key generation and transmission is integrated into the command endpoint design; Q2=confirm that the helper object for sendMessageWithConversation is explicitly typed to prevent future drift
consensus_block: Adopt the integrated ruling. Fix F1 by adding a `commandIdemKey` UUID UNIQUE column to AiCommandAuditLog model (L24-91) and enforce insertion idempotency in the command executor using a client-generated key; reject duplicate submissions with the original receipt. Fix F2 by refactoring AITerminalPanel.tsx L124-133 to always pass mode and options via a helper object (e.g., `buildChatParams`) to eliminate argument drift. Fix F3 by marking APP-AI-HIVE-MIND.md DORMANT and linking to the new blueprint. Fix F4 by rectifying the mount-block line citation to one authoritative range (L630-634 as per the expanded snippet). Acceptance criteria: (1) duplicate command POST returns the original receipt and no new row; (2) a test proves both branches of AITerminalPanel send identical context/mode; (3) the reference doc is removed from active architecture index. Residual risks: the panel must still define the full action/receipt lifecycle and offline reconciliation; any existing retry/queue logic must be audited for the new idempotency key; and the function signature in useAIChat.ts should be explicitly typed to prevent future drift.
=== END-VERDICT ===
