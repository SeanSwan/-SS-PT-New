# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-10\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7538 in / 11194 out · **Cost:** ~$0.0820 · **Wall:** 203.6s · **finish:** stop

---

Round-10 correctness pass (state machines, races, Postgres truth, injection surface). Packet evidence only.

**Adopted.** F2–F6, F13, F14, N1–N3, C9, C10, C11, mount-order (spike `@ routes.mjs:630` before chat `@ :631`). Express prefix shadowing makes that order mandatory; the 625–634 vs 630–634 split is the same five `app.use` calls under two headers — residual (i), not a second mount list.

**REJECT: “all 8 non-negotiables closed on paper.”** Constraints #2 and #4 are not closed on the offline path the candidate just invented.

C6 mints `idempotency_key` at enqueue and forbids writing `AiConversation.messages/status`. F3 deletes client-supplied ids (`AITerminalPanel.tsx:119,133`) and demands a *server-issued* context token, with `clientResolver.mjs:110-166` doing existence+tenant (packet: admins are role-only today). Those two bindings do not compose:

1. Offline enqueue cannot obtain a live server-validated scope. The last token on device is stale the moment the trainer switches clients, a tab impersonation ends, or access is revoked.
2. C6 specifies retry idempotency (`UNIQUE` key → read-back `replayed=true`). It does not specify drain-time re-resolve, nor a deny transition when snapshotted `client_id` ≠ currently authorized client. That is a wrong-client write (constraint #2, catastrophic).
3. “Minted at enqueue” is a random/synthetic key. Dual-tab or phone+tablet (`residual h`) mint two keys for one set and insert two workout facts. Postgres `UNIQUE(idempotency_key)` will not save you; you need a natural uniqueness predicate on the fact table.
4. Constraint #4 forbids presenting saved before an authoritative receipt. C6 never names the enqueue UI state. `queued` rendered as saved is a silent-mutation bug.

F4’s CAS `draft→pending_confirm→applied|denied|cancelled|failed` also has no apply-time re-check. Packet already shows the correct pattern at `coachProposalRoutes.mjs:30-54` (`ensureClientAccess` + pending-row claim). Draft-time `server-resolved client_id` is not a capability. TOCTOU between confirm and apply is a lost-entitlement race.

**F14/C10 SQL contract (endorse, do not re-derive).** `AiConversation.mjs:24-83` has `messages`, `messageCount`, `lastMessageAt` and no `version`. Concurrent `sendMessageWithConversation` (`AITerminalPanel.tsx:116-139` / `useAIChat.ts:217,425,448`) is a lost-update on JSON read-modify-write. Required write, one statement, bind params only — no string-built JSON:

```sql
UPDATE ai_conversations
SET messages = messages || $msg::jsonb,
    "messageCount" = "messageCount" + 1,
    "lastMessageAt" = NOW(),
    version = version + 1
WHERE id = $id AND version = $expected
```

0 rows → conflict, retry or fail. Never a second path that touches counters. `version BIGINT NOT NULL` backfilled to 1. `$msg` is a bound parameter; concatenating user text into SQL is the injection surface this seat will fail the slice on. Receipt insert is `INSERT … ON CONFLICT (idempotency_key) DO NOTHING` then `SELECT` — never `DO UPDATE`.

**C11.** `APP-AI-HIVE-MIND.md:7-22` is retired-as-runtime-truth. Not a second brain. Hermes/debate stay gated (`:633`, `:634`) and unclassified until package item 2 probes return.

No new packaged-code MAJOR beyond F15 (composition of existing F3 + C6 + missing drain re-anchor). F10/F11 stay struck.

=== VERDICT ===
status: CONSENSUS
confidence: 90
findings: F2=MAJOR: routes.mjs L630-634 + L378-379: write routers lack proven per-router entitlement gates | F3=MAJOR: AITerminalPanel.tsx L119,L133 + aiChatRoutes.mjs L308-344 + aiCommandRoutes.mjs L111-145 + aiDebateRoutes.mjs L57-76 + clientResolver.mjs L110-166: caller-supplied client ids; admin resolve is role-only | F4=MAJOR: AiCommandAuditLog.mjs L24-91 + aiWorkoutEvents.ts L121-128 + coachProposalRoutes.mjs L30-54: no action receipt/CAS/idempotency | F5=MINOR: routes.mjs L630: spike-lane auth parity unproven | F6=MINOR: CoachCommandCenterPage.tsx L38-42: activeTab not re-coerced on role/searchParams | F13=MAJOR: AITerminalPanel.tsx L116-139: uncaught sendMessageWithConversation rejection desyncs UI vs server | F14=MAJOR: AiConversation.mjs L24-83: messages/messageCount/lastMessageAt without OCC | F15=MAJOR: C6×F3 (AITerminalPanel.tsx L116-139 + clientResolver.mjs L110-166 + no queue in packet): offline drain after client-switch has no re-anchor/deny; #2+#4 open
rebuttals: F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F13=AGREE | F14=AGREE | F15=NEW-MAJOR: composition hole not closed by C6 mint-at-enqueue | C11=AGREE | C-AUDIT=REJECT: all-8-closed overclaims #2+#4 on offline path | C6-MINT=REJECT: synthetic enqueue key is retry-idempotent only; no semantic uniqueness; no drain re-resolve | F7=AGREE-intentional | F8=AGREE-intentional | F9=AGREE-intentional | F10=AGREE-struck | F11=AGREE-struck
open: Q1=build-time routes.mjs line probe (residual i) | Q2=useAIChat wrapper pre-mitigation of F13 (residual g) | Q3=C8 redaction still unverified
consensus_block: ADOPT round-8/9 candidate with C12 binding; C-AUDIT sentence replaced. FIXES: F2 — entitlement middleware per router, pinned to Evidence gate: /api/ai-chat/stream-spike routes.mjs:630 (with F5), /api/ai-chat :631, /api/ai-command :632, /api/hermes :633, /api/ai/debate :634, /api/coach/intake :378, /api/coach/proposals :379; ungated router BLOCKED from writes. F3 — delete clientId args at AITerminalPanel.tsx:119,133; collapse targetUserId (aiChatRoutes.mjs:308-344) + selectedClientId (aiCommandRoutes.mjs:111-145) + debate clientId (aiDebateRoutes.mjs:57-76) into one server-issued context token; clientResolver.mjs:110-166 existence+tenant for admins, not role-only. F4 — receipt {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE, provenance chat|command|workout-bridge, status enum}; CAS draft→pending_confirm→applied|denied|cancelled|failed; apply-time ensureClientAccess (copy coachProposalRoutes.mjs:30-54 claim pattern) on EVERY transition into applied — draft-time resolve is not authority; AiCommandAuditLog.mjs:24-91 NOT reused; AITerminalPanel success only on receipt; dispatchAIWorkoutEvent (aiWorkoutEvents.ts:121-128) never maps to success. F5 — spike auth-parity probe; flag+kill switch before enable. F6 — CoachCommandCenterPage.tsx:38-42 re-coerce activeTab via effect on [userRole, searchParams]. F13 — try/catch around sendMessageWithConversation at AITerminalPanel.tsx:116-139; failure states per N2/N3. F14+C10 — AiConversation.mjs:24-83 add version BIGINT NOT NULL backfill 1; ONE compound UPDATE: messages = messages || $msg::jsonb, messageCount = messageCount+1, lastMessageAt = NOW(), version = version+1 WHERE id=$id AND version=$expected; 0-row = conflict; bound params only; no path updates counters without version bump. N1 — capability-token gate + payload schema + provenance audit + result enum on dispatcher registry. N2/N3 — single explicit persistence mode + defined failure states. C6 as previously bound AND C12 (closes F15): (1) enqueue snapshots last server-issued context token + intended client_id, status=queued only — never applied/saved; (2) drain sends token+client through F2/F3 gate; existence+tenant fail OR snapshotted client ≠ authorized client → denied, no write; (3) idempotency_key persisted before first network attempt and reused on retry; INSERT receipt ON CONFLICT (idempotency_key) DO NOTHING then SELECT; replayed=true; never ON CONFLICT DO UPDATE; never re-execute; (4) workout facts ALSO have Postgres natural UNIQUE (server_resolved_client_id, workout_session_id, exercise_id, set_ordinal, occurred_at_trunc) so dual-tab/dual-device cannot double-insert with different synthetic keys; (5) UI vocab queued|syncing|applied|applied_replayed|denied|failed|cancelled — queued ≠ saved (constraint #4); (6) offline store is separate durable (never AiConversation.messages/status); workout facts use this lane first. MOUNT-ORDER: spike-before-chat preserved; migration must not reorder. ACCEPTED AS INTENTIONAL: F7/F8/F9 evidence-boundary admissions + probes into package item 2; F8 settles 4-named-surfaces vs 3-mounts and classifies SwanCoachAssistantPage; F10/F11 STRUCK; C8 redaction trusted not verified; C7 deferral with 44px/WCAG/mobile as hard gates in blueprint items 5+8; C11 APP-AI-HIVE-MIND.md:7-22 retired-as-runtime-truth in package item 2. CONSTRAINT AUDIT: #1 #3 #5 #7 #8 closed on paper; #6 closed only with C12; #2 and #4 closed on online CAS via F3+F4 apply-time re-check, and on offline path only after C12. RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes return; (b) C6/C12 offline is net-new design, no queue code in packet; (c) C8 unverified; (d) F1 artifact identity voids all findings if seeder packet was subject; (e) client event bus unauthenticated until N1; (f) AiConversation lost-update closed on paper by F14+C10, still needs the write-SQL excerpt in the implementing PR; (g) F13 may be pre-mitigated by useAIChat wrapper — probe; (h) C6/C12 untestable until failure-injection suite (duplicate drain, partial-response retry, dual-tab drain, kill-switch mid-drain, client-switch-between-enqueue-and-drain, natural-key collision) runs — mandatory in package item 8; (i) routes.mjs true line numbers need build-time probe — packet carries two maps of the same five mounts.
=== END-VERDICT ===
