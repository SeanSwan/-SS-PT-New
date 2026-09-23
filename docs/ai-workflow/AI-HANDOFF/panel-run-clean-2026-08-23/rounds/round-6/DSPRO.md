# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-6\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6486 in / 5305 out · **Cost:** ~$0.0065 · **Wall:** 118.6s · **finish:** stop

---

As the Inference Auditor, I’ve examined the consensus candidate against the code evidence in the packet. The candidate is largely consistent with the packet’s documented gaps, but it fails to address the two unresolved findings explicitly carried forward from previous rounds. The running state lists:

- `backend/models/AiConversation.mjs L24-83`
- `backend/models/AiConversation.mjs L24-83 + frontend/src/hooks/useAIChat.ts L425,448`

These are not mentioned, classified, or fixed in the candidate. The candidate’s F3 touches `targetUserId` in the model but does not resolve the specific defect(s) at those lines. The candidate’s F4 addresses offline queuing but does not directly fix the `useAIChat.ts` lines. Therefore the candidate is incomplete as a ruling; it must incorporate fixes for these unresolved items before it can be adopted.

I **REJECT** the candidate’s completeness on this ground and raise a new MAJOR finding (F12). All other items in the candidate are supported by packet evidence and I adopt them.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F12=MAJOR: consensus candidate does not address unresolved findings backend/models/AiConversation.mjs L24-83 and frontend/src/hooks/useAIChat.ts L425,448; must include fixes
rebuttals: F0=REJECT: consensus candidate incomplete — unresolved findings from running state not resolved
open: Q1=What are the specific defects at AiConversation.mjs L24-83 and useAIChat.ts L425,448 that need fixing?
consensus_block: FIX BEFORE BUILD: F1 (add actionId unique key + idempotent executor + receipt return in AiCommandAuditLog.mjs/aiCommandRoutes.mjs:111-145/useCoachCommand.ts:96,170,207), F3 (single canonical targetUserId user-PK identity; server-reject null targets with 400 TARGET_REQUIRED; receipts echo alias+resolved PK), F2 (capability registry checked post-resolution pre-execution in commandExecutor.mjs:309-343; denial writes audit row and returns denial-shaped response), F6 (conditional UPDATE ... WHERE status='pending' transaction + idempotent apply + durable applied/failed receipt at coachProposalRoutes.mjs:30-54), F5 (apply aiChatRoutes.mjs:466 middleware family + TTL to coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16; parity table gate). MUST-FIX PER SLICE: F4 (IndexedDB intent queue keyed by actionId; UI states queued/sending/verified only; reconcile replays exactly once), F7 (spike method inventory + disabled-404 on every method), F10 (ensureClientAccess on aiDebateRoutes.mjs:57-76 start path), F11 (fence SwanCoachAssistantPage, migrate tests, cite or drop 'locks'), F8 (cite the review-gate code or strike header claim), F9 (archive/rewrite hive doc). MUST-FIX UNRESOLVED: F12 (resolve AiConversation.mjs L24-83 and useAIChat.ts L425,448 defects; specify exact fix). ACCEPTED AS INTENTIONAL (pending panel ruling): admin unbounded scope in clientResolver.mjs:110-166 IF ruled policy and tagged in audit; Express specific-before-prefix mount order at routes.mjs:630-634 is correct practice, not a defect. RESIDUAL RISKS: constraints 2/3/4/6 unverifiable until F1/F3/F4 land; all absence-based MAJORs require live probes confirming, not assuming; Hermes/debate classification unresolved; acceptance criterion 7 (44px/WCAG) has zero packet artifacts and must be carried entirely by the blueprint verification matrix.
=== END-VERDICT ===
