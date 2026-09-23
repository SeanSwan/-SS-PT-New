# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-3\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7192 in / 12236 out · **Cost:** ~$0.0876 · **Wall:** 243.6s · **finish:** stop

---

The candidate is mostly right on entitlement probes, caller-supplied client IDs, receipts, and the stale-tab effect. It is wrong on two correctness points my lens will not park.

**REJECT F8 as settled.** `UniversalDashboardLayout.routes.tsx:98,177,203` prove three mounts of `CoachCommandCenterPage`, not four dashboards. Owner outcome and Q7 still name admin / trainer / client / user. The only role fork in packet is `CoachCommandCenterPage.tsx:34-43` (`normalizeCoachCommandRole` → `isClientCoachRole` → `coerceCoachTabForRole`). Those three functions are not excerpted. A boolean `isClientMode` cannot carry user-launcher vs client-self-service entitlements. `SwanCoachAssistantPage` is correctly labeled legacy-unmounted; that half is settled. The 4th role is not.

**REJECT residual (f) “unproven.” New MAJOR F14.** `AiConversation.mjs:24-83` is the schema: `messages` embedded, `messageCount` denormalized, `status` unversioned, no `version`/`updatedAt`. Any RMW append (live `useAIChat.ts:217,425,448` plus the C6 reconciler the candidate itself requires) loses the other writer’s messages and can desync `messageCount`. That is a lost-update by construction. Write-SQL would only name the ORM flavor; it cannot add a version column that the model does not have.

**F4 endorsed, HOW tightened (not a reject of F4).** `UNIQUE(idempotency_key)` plus a single-row flip does not make `execute|confirm|cancel` (`useCoachCommand.ts:96,170,207`) safe.

- CAS must be `UPDATE ... SET status=$next WHERE action_id=$id AND status=$expected RETURNING *`; 0 rows = 409. Do not reuse `AiCommandAuditLog.mjs:24-91`.
- `applied|denied|cancelled|failed` are terminal. Undo is a **new** receipt (`parent_action_id`), never `applied→cancelled`.
- Unique key is composite `(tenant_id, server_resolved_client_id, idempotency_key)`, not a global UNIQUE — global UNIQUE is a cross-tenant 409/DoS collision.

**F2 citation update (agree the finding).** Intake/proposals are no longer “unexcerpted”: `routes.mjs:378-379`, `coachIntakeRoutes.mjs:23-25`, `coachProposalRoutes.mjs:15-16` (`ensureClientAccess` + claim-before-apply). Packet contradicts itself on the AI mounts (`routes.mjs:625-634` excerpt vs evidence-gate `:630-634`). Paths govern; probes still required. Claim SQL must be proven as `UPDATE ... WHERE status='pending' RETURNING`, not check-then-act.

**N5 NOTE.** `AiConversation.status` (`:24-83`) and the F4 receipt enum are uncoupled machines. UI “saved” is illegal unless the receipt is terminal (constraint 4). Conversation status must not imply domain apply.

Adopted without change: F3 (delete `clientId` at `AITerminalPanel.tsx:119,133`; collapse `targetUserId` `aiChatRoutes.mjs:308-344` + `selectedClientId` `aiCommandRoutes.mjs:111-145`; `clientResolver.mjs:110-166` existence+tenant for admins), F5, F6 (effect on `[userRole, searchParams]` — impersonation/Q4 makes this safety, not UX), F7/F9/F12 probes, N1–N3, C6 (offline store ≠ `AiConversation.messages/status`), struck F10/F11, C7/C8 admissions.

No SQLi finding: zero query text in packet. Parameterization of `targetUserId` / `selectedClientId` / debate `clientId` is an open probe, not a defect claim.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F14=MAJOR: AiConversation.mjs:24-83: embedded messages+messageCount, no version; lost-update/desync under live chat + C6 reconciler | F8=NOTE: UniversalDashboardLayout.routes.tsx:98,177,203: 3 mounts proven; user-vs-client enum/entitlement unexcerpted | N5=NOTE: AiConversation.status vs F4 receipt enum uncoupled; UI saved requires terminal receipt
rebuttals: F8=REJECT: classification of SwanCoachAssistantPage is done; 4th role/user-launcher vs isClientMode is not settled | (f)=REJECT: model fields are sufficient evidence of lost-update; do not wait for write-SQL | F2=AGREE: retarget intake/proposals to routes.mjs:378-379; 625 vs 630 is packet citation drift | F3=AGREE | F4=AGREE: add terminal immutability + composite UNIQUE + UPDATE/RETURNING CAS | F5=AGREE | F6=AGREE | F10=AGREE-STRUCK | F11=AGREE-STRUCK
open: Q1=excerpt normalizeCoachCommandRole/isClientCoachRole/coerceCoachTabForRole — is user distinct from client? | Q2=AiConversation write path: JSONB RMW vs child-table+version | Q3=parameterization/SQLi probe on targetUserId/selectedClientId/clientId | Q4=proposal claim SQL is CAS or check-then-act (coachProposalRoutes.mjs:30-54) | Q5=which line table is authority for AI mounts, 625-634 or 630-634
consensus_block: DISPUTE — do not adopt candidate verbatim. Keep F2/F3/F4/F5/F6/N1/N2/N3/C6 and struck F10/F11. Amend F2 citations to routes.mjs:378-379 for intake/proposals; path names not line numbers are probe keys. Amend F4 HOW: new receipt table (not AiCommandAuditLog.mjs:24-91); UNIQUE(tenant_id, server_resolved_client_id, idempotency_key); CAS UPDATE ... WHERE status=$expected RETURNING *; terminal states immutable; undo=INSERT new row with parent_action_id. Elevate residual (f) to F14 MUST-FIX before multi-writer/offline work: AiConversation.mjs:24-83 add version (or child table ai_conversation_messages UNIQUE(conversation_id,seq)); UPDATE ... WHERE id=$id AND version=$seen; derive messageCount; C6 reconciler uses same CAS. F8 split: SwanCoachAssistantPage=legacy unmounted (accepted); 4-vs-3 remains open until role-enum excerpt. N5: conversation.status must not display applied. Residuals kept: (a)(b)(c)(d)(e). Drop (f).
=== END-VERDICT ===
