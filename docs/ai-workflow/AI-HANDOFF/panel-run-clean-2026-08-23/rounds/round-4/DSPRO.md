# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-4\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6804 in / 4493 out · **Cost:** ~$0.0056 · **Wall:** 97.8s · **finish:** stop

---

As the inference auditor, I’ve cross-checked the consensus candidate against the code packet. The builder’s local-verification claims are largely accurate, and the proposed fixes align with the evidence. However, I’ve identified one additional MAJOR defect not covered by the consensus: the denormalized `messageCount` field in `AiConversation.mjs` risks stale-state inconsistency because the code does not guarantee atomic updates when messages are appended. This is a happy-path-only logic flaw that could cause the UI to display an incorrect message count. I therefore adopt the consensus candidate in full but add this new finding, which triggers DISPUTE status.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91 + aiCommandRoutes.mjs L111-145 + useCoachCommand.ts L96,170,207: missing actionId unique key, idempotent executor, and receipt return | F3=MAJOR: AiConversation.mjs L24-83 + aiChatRoutes.mjs L308-344: no canonical targetUserId identity; null targets not rejected with 400 TARGET_REQUIRED; receipts don't echo alias+resolved PK | F2=MAJOR: commandExecutor.mjs L309-343: capability registry not checked post-resolution pre-execution; denial doesn't write audit row or return denial-shaped response | F6=MAJOR: coachProposalRoutes.mjs L30-54: no conditional UPDATE ... WHERE status='pending' transaction, idempotent apply, or durable applied/failed receipt | F5=MAJOR: coachIntakeRoutes.mjs L23-25 + coachProposalRoutes.mjs L15-16: missing aiChatRoutes.mjs L466 middleware family (subscription, rate-limit, PII) and TTL; no parity table gate | F4=MAJOR: frontend (no file): no IndexedDB intent queue keyed by actionId; UI states lack queued/sending/verified only; reconcile replays not exactly-once | F7=MAJOR: aiStreamSpikeRoutes.mjs (entire file): spike method inventory missing; disabled-404 not enforced on every method | F10=MAJOR: aiDebateRoutes.mjs L57-76: ensureClientAccess not called on start path | F11=MAJOR: SwanCoachAssistantPage (legacy, no route mount): not fenced; tests not migrated; 'locks' claim not cited or dropped | F8=MAJOR: CoachCommandCenterPage.tsx (header claim): review-gate code not cited; claim unsubstantiated | F9=MAJOR: APP-AI-HIVE-MIND.md L7-22: active doc with runtime drift; must archive/rewrite | F12=MAJOR: backend/models/AiConversation.mjs L24-83 + frontend/src/hooks/useAIChat.ts L425,448: denormalized messageCount on same row as messages array; no atomic update guarantee, risking stale-state inconsistency
rebuttals: (none)
open: Q1=Should messageCount be removed and computed from messages array length, or must atomic updates be enforced? Q2=Can admin unbounded scope in clientResolver.mjs L110-166 be accepted as policy with audit tagging, or does it require explicit panel ruling?
=== END-VERDICT ===
