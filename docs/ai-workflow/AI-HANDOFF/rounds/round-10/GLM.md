# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-10\REVIEW-DOC.md
**Tokens:** 7191 in / 9542 out (reasoning: 6564) | total 16733
**Wall:** 98.2s

---

# GLM 5.3 — Round 10 (final): Full-spectrum attack pass, then verdict

Stance held: correctness, security, schema truth, and the 8 non-negotiables line by line. Round-10 protocol requires me to attack the draft for the eleven named failure modes. I ran that attack; every mode is either closed by a pinned fix in the candidate or explicitly carried as a residual risk with a probe owner. I carry **zero REJECTs and zero new MAJORs**. Both running-state unresolved items are resolvable from the packet itself. Adoption, not dispute.

## 1. Round-10 attack sweep — eleven vectors, coverage check

| Attack vector | Coverage | Evidence |
|---|---|---|
| False unification | CLOSED | Packet surface table refuses "one brain" until shared boundary proven; hermes/debate held separate-pending; F8 settles 3-mounts/4-surfaces and classifies `SwanCoachAssistantPage` as legacy-but-referenced (no route-tree mount found — matches packet classification). |
| Duplicate pipelines | CLOSED | F3 collapses `aiChatRoutes.mjs:308-344` (`targetUserId`) + `aiCommandRoutes.mjs:111-145` (`selectedClientId`) + `aiDebateRoutes.mjs:57-76` (`clientId`) into one server-issued context token; F4 folds `coachProposalRoutes.mjs:30-54` pending-claim into the single CAS lane. |
| Wrong-client writes | CLOSED on paper | F3 token + `clientResolver.mjs:110-166` existence+tenant checks for admins (packet probe table admits current behavior "scopes trainers but not admins beyond role"); F4 receipt carries server-resolved `client_id`. Severity ceiling honestly deferred to residual (a). |
| Stale context | CLOSED | F6: effect on `[userRole, searchParams]` re-coercing `activeTab` at `CoachCommandCenterPage.tsx:38-42` — the excerpt shows one-shot `useState` coercion at L42 with no re-coerce path. Defect is real; fix is minimal. |
| Silent mutation | CLOSED | F4: `AITerminalPanel.tsx:116-139` success renders only on receipt; `aiWorkoutEvents.ts:121-128` dispatcher boolean explicitly never maps to success. |
| Privilege bypass | CLOSED on paper | F2 per-router entitlement middleware across `routes.mjs:630-634` and `:378-379`; F5 spike parity probe (`aiStreamSpikeRoutes` shows `adminOnly` on `GET /` only — parity for other verbs/subpaths is a legitimate probe); hermes `:633` and debate `:634` gated, matching the probe table's "verify no public dashboard reaches operator-only semantics." |
| Offline/retry duplicates | CLOSED by binding | C6: idempotency key minted at enqueue, UNIQUE, duplicate → read-back `replayed=true`, never re-execute; dual-tab drain in the mandatory failure-injection suite. |
| Mobile failure | CLOSED as gate | C7: 44px/WCAG/mobile as hard acceptance gates in package items 5+8. |
| Misleading copy | CLOSED | N2/N3 + item 6 state vocabulary; `applied(replayed) ≠ applied(new)` rendering is the honest-copy contract for constraint 4. |
| Inaccessible interactions | CLOSED as gate | C7, same lines. |
| Unverifiable success | CLOSED | F4; `AiCommandAuditLog.mjs:24-91` correctly NOT reused — packet's own receipt-boundary section states it has no `action_id` or unique idempotency key. |

Mount-order ruling endorsed on correctness grounds: narrow-first (`spike` at `:630` before `chat` at `:631`) is robust-by-construction regardless of whether `aiChatRoutes` carries an internal catch-all terminator. Mandatory, not stylistic.

## 2. Eight non-negotiables, line by line

1. **Least privilege** — F2 + F3 + N1; middleware evidence exists per lane (`aiChatRoutes.mjs:283,466,610-625`; `aiCommandRoutes.mjs:110`; `coachIntakeRoutes.mjs:23-25`; `coachProposalRoutes.mjs:15-16`) but per-family entitlement is unproven → residual (a). Closed on paper.
2. **Wrong-client mutation** — F3 token, F4 receipt `client_id`, CAS states incl. `cancelled`. Closed on paper.
3. **Memory ≠ truth** — F4 receipts + C6 separate durable store (never `AiConversation.messages/status`, fields at `AiConversation.mjs:24-83`); audit log excluded as truth source. Closed.
4. **No premature success** — receipt-gated success at `AITerminalPanel.tsx:116-139`; `aiWorkoutEvents.ts:121-128` excluded. Closed.
5. **Server-side entitlements** — F2; failing router blocked from write capability until gated. Closed pending probes.
6. **Offline story** — C6 binding, workout facts first, failure-injection suite mandatory in item 8. Closed on paper; residuals (b)+(h) keep it honest.
7. **Implementation standards** — C7 hard gates in items 5+8. Closed as process.
8. **Redaction to Ox Alpha** — C8 trusted-not-verified; not code-verifiable. Residual (c).

Constraint audit confirms: all 8 closed on paper, none closed on false evidence.

## 3. Resolution of the two unresolved running-state items

- **`routes.mjs` 625-634 vs 630-634** — RESOLVED. The Evidence gate refresh self-declares governance ("must govern the next panel run") and pins `:630-634` + `:378-379`; both packet maps agree on ORDER (spike→chat→command→hermes→debate), so only the appendix's line numbers are stale. F2's per-router pinning (630/631/632/633/634) is the derived consequence; residual (i)'s build-time probe stays as the hard confirmation. Logged as N4.
- **`APP-AI-HIVE-MIND.md:7-22`** — RESOLVED. Packet classification ("active reference doc with runtime drift... must reconcile or explicitly retire") is satisfied by C11's retire-as-runtime-truth disposition in package item 2. No runtime claim is being made from that document.

## 4. Residual risks

All nine residuals (a)–(i) stand unchanged. None is closable from packet evidence; each has a named probe or gate owner in the package items. That is the correct final-round posture: converged rulings, explicit unknowns.

=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F2=MAJOR: core/routes.mjs:630-634,378-379: per-router entitlement middleware; failing router blocked from writes | F3=MAJOR: aiChatRoutes.mjs:308-344 + aiCommandRoutes.mjs:111-145 + aiDebateRoutes.mjs:57-76: caller-supplied client identity; one server-issued context token; clientResolver.mjs:110-166 admin tenant checks | F4=MAJOR: AiCommandAuditLog.mjs:24-91: no action_id/idempotency; receipt+CAS lane, audit log NOT reused | F5=MINOR: aiStreamSpikeRoutes: auth-parity probe + kill switch before enable | F6=MINOR: CoachCommandCenterPage.tsx:38-42: re-coerce activeTab via effect [userRole, searchParams] | F13=MINOR: AITerminalPanel.tsx:116-139: try/catch on sendMessageWithConversation | F14=MAJOR: AiConversation.mjs:24-83: version field + OCC compound conditional UPDATE (C10) | N1=NOTE: capability-token gate + schema validation + provenance + result enum | N2/N3=NOTE: single persistence mode + defined failure states | N4=NOTE: routes.mjs 625-634 vs 630-634 resolved — refresh governs, build probe confirms (residual i)
rebuttals: F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F13=AGREE | F14=AGREE with C10 extension | C6=AGREE binding | C10=AGREE | C11=AGREE | MOUNT-ORDER=AGREE | F10/F11=AGREE struck | F7/F8/F9=AGREE as evidence-boundary admissions
open: Q1=build probe must confirm per-router line pinning (residual i) before F2 middleware lands | Q2=package item 8 must schedule the C6 failure-injection suite (duplicate drain, partial-response retry, dual-tab drain, kill-switch mid-drain) as a release gate
consensus_block: ADOPT round-8 candidate with C6-binding, C9 erratum, C10 extension, C11 disposition, plus round-10 resolutions N4 and hive-mind retirement. FIXES: F2 — entitlement middleware per router, pinned to Evidence gate refresh: /api/ai-chat routes.mjs:631, /api/ai-command :632, /api/coach/intake :378, /api/coach/proposals :379, /api/ai-chat/stream-spike :630 (with F5), /api/hermes :633, /api/ai/debate :634 (lines derived by order from refresh range :630-634; build probe confirms); failing router BLOCKED from write capability until gated. F3 — delete clientId args at AITerminalPanel.tsx:119,133; collapse targetUserId (aiChatRoutes.mjs:308-344) + selectedClientId (aiCommandRoutes.mjs:111-145) + debate clientId (aiDebateRoutes.mjs:57-76) into one server-issued context token; clientResolver.mjs:110-166 does existence+tenant checks for admins, not role-only. F4 — receipt {action_id, capability, server-resolved client_id, actor, idempotency_key UNIQUE, provenance chat|command|workout-bridge, status enum}; CAS draft→pending_confirm→applied|denied|cancelled|failed; AiCommandAuditLog.mjs:24-91 NOT reused; AITerminalPanel success only on receipt; dispatchAIWorkoutEvent (aiWorkoutEvents.ts:121-128) never maps to success; coachProposalRoutes.mjs:30-54 pending-claim joins the same CAS lane. F5 — spike-lane auth parity probe; flag+kill switch before enable. F6 — CoachCommandCenterPage.tsx:38-42 re-coerce activeTab via effect on [userRole, searchParams]. F13 — try/catch around sendMessageWithConversation at AITerminalPanel.tsx:116-139; failure state per N2/N3. F14 — AiConversation.mjs:24-83: version field + OCC, EXTENDED (C10): one compound conditional UPDATE = append message + increment messageCount + stamp lastMessageAt + bump version; no path updates counters without version bump. N1 — capability-token gate + payload schema validation + provenance audit + result enum on dispatcher registry. N2/N3 — single explicit persistence mode + defined failure states. C6 — CLOSED by binding: offline queue is separate durable store (never AiConversation.messages/status); idempotency_key minted at enqueue; duplicate key → read-back existing receipt flagged replayed=true, never re-execute; workout facts get this lane first; UI renders applied(replayed) ≠ applied(new). MOUNT-ORDER RULING: spike-before-chat preserved — Express prefix shadowing makes narrow-first mandatory; migration must not reorder. N4 (round-10): routes.mjs line-map drift resolved — Evidence gate refresh (:630-634, :378-379) governs per its own declaration; appendix :625-634 stale; build probe per residual (i). ACCEPTED AS INTENTIONAL: F7/F8/F9 evidence-boundary admissions + probes into package item 2; F8 settles 4-named-surfaces vs 3-mounts and classifies SwanCoachAssistantPage; F10/F11 STRUCK; C8 redaction trusted not verified; C7 deferral with 44px/WCAG/mobile as hard acceptance gates in blueprint items 5+8; C11 APP-AI-HIVE-MIND.md:7-22 retired-as-runtime-truth in package item 2. CONSTRAINT AUDIT: all 8 non-negotiables closed on paper — #6 last, closed by C6 binding. RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes return; (b) C6 offline is net-new design, no queue code in packet; (c) C8 unverified; (d) F1 artifact identity voids all findings if seeder packet was subject; (e) client event bus unauthenticated until N1; (f) AiConversation lost-update race pending write-SQL excerpt — addressed by F14+C10; (g) F13 may be pre-mitigated by useAIChat wrapper — probe; (h) C6 binding untestable until failure-injection suite (duplicate drain, partial-response retry, dual-tab drain, kill-switch mid-drain) runs — mandatory in package item 8; (i) routes.mjs true line numbers need build-time probe — packet carries two maps (resolved to refresh by N4, probe still mandatory).
=== END-VERDICT ===
