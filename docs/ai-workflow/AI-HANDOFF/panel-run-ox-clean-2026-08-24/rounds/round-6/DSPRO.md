# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-6\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6266 in / 4557 out · **Cost:** ~$0.0174 · **Wall:** 203.4s · **finish:** stop

---

I adopt the consensus candidate verbatim—its fixes for idempotency (F1), argument drift (F2), dormant doc (F3), and mount citation (F4) are all supported by the packet evidence. However, I am adding one new MAJOR finding (F5) that the consensus missed: the command lane’s client resolver fails to scope admin operations, violating the non-negotiable wrong-client constraint. This is a high-severity safety defect that must be fixed before any unified-brain implementation.

**New MAJOR finding (F5):**  
- **Claim:** Admin commands lack mandatory client-scope validation, enabling wrong-client mutation.  
- **Evidence:** The packet’s route probe table states `clientResolver.mjs:110-166` scopes trainers but not admins beyond role. `commandExecutor.mjs:309-343` resolves selected IDs but does not enforce that an admin-supplied `selectedClientId` is valid and authorized. The non-negotiable constraint #2 requires explicit, server-validated client scope.  
- **Fix:** In `backend/resolvers/clientResolver.mjs`, add an admin path that validates the target client exists and is within the admin’s tenancy; reject commands with missing or invalid client scope. In `backend/services/commandExecutor.mjs`, enforce that every command carries a resolved, authorized client ID before execution.  
- **Severity:** MAJOR (breaks safety contract).

All other consensus items stand. The residual risks already note that the full action/receipt lifecycle and offline reconciliation need definition, which covers the receipt-storage gap I considered; thus I do not elevate that to a separate finding.

=== VERDICT ===
status: CONSENSUS
confidence: 94
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: missing unique idempotency key | F2=MAJOR: frontend/src/components/AITerminalPanel.tsx L124-133: argument drift between sendMessageWithConversation calls | F3=MAJOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22: documented architecture conflicts with runtime | F4=MINOR: backend/core/routes.mjs L630-634: mount-block citation needs authoritative range | F5=MAJOR: backend/resolvers/clientResolver.mjs L110-166 and backend/services/commandExecutor.mjs L309-343: admin commands lack client-scope validation, risking wrong-client mutation
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=NEW
open: Q1=Does the idempotency fix require storing the full original receipt in the audit log, or is the row sufficient? Q2=Should the clientResolver fix also apply to /api/ai/debate and /api/hermes admin paths?
consensus_block: Adopt the integrated ruling with the following additions. Fix F1: add `commandIdemKey` UUID UNIQUE column to AiCommandAuditLog model (L24-91) and enforce insertion idempotency in commandExecutor using a client-generated key; reject duplicates with the original receipt. Fix F2: refactor AITerminalPanel.tsx L124-133 to always pass mode and options via a helper object (e.g., `buildChatParams`) to eliminate argument drift. Fix F3: mark APP-AI-HIVE-MIND.md DORMANT and link to the new blueprint. Fix F4: use the authoritative mount range L630-634 from the expanded snippet. Fix F5 (new): enforce client-scope validation for admin commands in clientResolver.mjs and commandExecutor.mjs; reject any command without a validated target client. Acceptance criteria: (1) duplicate command POST returns original receipt and no new row; (2) test proves both branches of AITerminalPanel send identical context/mode; (3) reference doc removed from active architecture index; (4) admin command without valid client scope returns 4xx and logs a security event. Residual risks: panel must define full action/receipt lifecycle and offline reconciliation; existing retry/queue logic must be audited for new idempotency key; function signature in useAIChat.ts should be explicitly typed; admin scoping must be verified across all command families and related lanes (debate, hermes).
=== END-VERDICT ===
