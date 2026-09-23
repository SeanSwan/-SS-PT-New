# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-3\REVIEW-DOC.md
**Tokens:** 6783 in / 10243 out (reasoning: 8085) | total 17026
**Wall:** 130.8s

---

# GLM 5.3 — Round 3: Full-spectrum audit (correctness / security / schema truth / 8 acceptance criteria line-by-line)

## 1. Consensus adoption ledger

I adopt the round-2 candidate's substance. Per-item, under my lens:

- **F1 AGREE** — `AiCommandAuditLog.mjs:24-91` provably has no `action_id`/idempotency key (packet §"Receipt and idempotency boundary"). Extension filed below as N1.
- **F2 AGREE** — `commandExecutor.mjs:309-343` resolves caller IDs but no capability registry exists between resolution and execution; denial-with-audit-row is the correct shape.
- **F4, F5, F6, F7, F8, F9, F10, F11 AGREE** — all map to packet-cited gaps (`coachIntakeRoutes.mjs:23-25` / `coachProposalRoutes.mjs:15-16` lack the `aiChatRoutes.mjs:466` middleware family; `aiDebateRoutes.mjs:57-76` start path unproven; `aiWorkoutEvents.ts:121-128` returns a browser boolean; header "review-gated writes" uncited at `useCoachCommand.ts:96`; `APP-AI-HIVE-MIND.md:7-22` contradicts `routes.mjs:630-634/378-379`; `SwanCoachAssistantPage` referenced by tests with no mount).
- **Accepted-as-intentional AGREE** — Express specific-before-prefix at `routes.mjs:630-634` is correct mount semantics, not a defect. Admin-unbounded scope in `clientResolver.mjs:110-166` accepted only with the audit-tag condition already stated.

## 2. One REJECT: F3's mechanism is wrong, not its goal

**F3 core (canonical user-PK identity) is adopted. The blanket "server-reject null targets with 400 TARGET_REQUIRED" is rejected on both-sides packet evidence:**

- `AITerminalPanel.tsx:116-139` ships `clientId || null` — **null is a first-class value in the shared terminal**.
- `aiChatRoutes.mjs:308-344` accepts `targetUserId` **only for admin/trainer** — null-target client conversations are the shipped shape, and the header table mounts `CoachCommandCenterPage` for client self-service (`UniversalDashboardLayout.routes.tsx:203`).

A blanket 400 on null breaks every client-mode terminal invocation. **Replacement fix (F3′):**
- **WHERE:** `aiChatRoutes.mjs:308-344` (create), `aiCommandRoutes.mjs:111-145` (execute), receipts at `useCoachCommand.ts:96,170,207`.
- **HOW:** client role + null target → server resolves to authenticated user's PK (never trusts a client-supplied self-target); client role + explicit other-target → `403 TARGET_FORBIDDEN`; admin/trainer + unresolvable target → `400 TARGET_REQUIRED`; all receipts echo `{requestedAlias, resolvedUserPK}`.

## 3. New findings from my lens

**N1 = MAJOR — recoverability is unachievable in the current schema, and F1 as written does not fix it.** `AiCommandAuditLog.mjs:24-91` stores parameters as **hash/redaction only**. Constraint 2 requires wrong-client mutations be *recoverable*; a hashed parameter row cannot drive reversal, and no undo/compensating artifact exists anywhere in the packet. F1 adds idempotency, not recovery.
- **Fix:** extend the F1 receipt model with `action_id` (unique), `idempotency_key`, encrypted compensating/undo payload (PII-redacted), `applied_at`, `verified_at`. Audit hash retained for correlation only.
- **Acceptance:** a live drill reverses a wrong-client mutation using the receipt alone.

**N2 = MINOR — `AiConversation.mjs:24-83` `role` column semantics are undefined** (actor-role-at-creation vs live). If any authz path trusts stored `conversation.role` instead of the live token role (`aiChatRoutes.mjs:283` protect), a demoted admin retains old privileges on existing conversations. Unproven, so MINOR + mandatory probe: role-change demotion test (admin→trainer) on an existing conversation must fail cross-client access.

## 4. The 8 acceptance criteria, line by line

| # | Constraint | Packet evidence | Verdict under my lens |
|---|---|---|---|
| 1 | Least-privilege | Intake admin/trainer-only (`coachIntakeRoutes.mjs:23-25`); trainer target check (`aiChatRoutes.mjs:610-625`) | **Unmet pending F2/F10** + cross-client matrix probe |
| 2 | Wrong-client mutation: explicit/validated/observable/**recoverable** | Trainer scope `clientResolver.mjs:110-166`; audit `AiCommandAuditLog.mjs:24-91`; **no recovery artifact** | Observable via F1; **recoverable only via N1** |
| 3 | Memory ≠ truth; receipts = truth | `aiWorkoutEvents.ts:121-128` boolean-ack is the only bridge receipt; chat/proposal divergence acknowledged in AI-path table | Covered by F1+F4; reconciliation stays blueprint duty |
| 4 | No "saved" before verified write | No packet artifact shows the violating copy (absence-based) | Covered by F4 UI vocabulary; probe render paths in `AITerminalPanel.tsx` |
| 5 | Server-enforced entitlement | Registry absent (`commandExecutor.mjs:309-343`); Hermes reachability unclassified (`hermesRoutes.mjs:43,90,127,142`) | Covered by F2/F5 + Hermes classification |
| 6 | Offline/degraded core logging | Logger surface exists ("routes into workout logger context") but is unnamed as authoritative offline path | F4 covers AI queue; blueprint must name the **manual logger as the offline-authoritative fallback** |
| 7 | 44px/WCAG/tokens/responsive | **Zero artifacts in packet** | Unverifiable here; must be carried by the verification matrix — concur with residual risk |
| 8 | Ox Alpha redaction | Packet contains no creds/PII/logs | Compliant; no finding |

## 5. Open questions for the panel

- Q1: Does any seat hold evidence an authz path reads `AiConversation.role` (N2 probe)?
- Q2: Is admin-unbounded resolution (`clientResolver.mjs:110-166`) policy-tag sufficient, or does it need a per-command cap?
- Q3: Does any seat object to naming the manual workout logger the C6 offline-authoritative path?

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: N1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91 (packet §Receipt/idempotency boundary): params stored hash/redaction-only, no compensating/undo payload anywhere — constraint-2 "recoverable" unachievable even after F1; extend receipt schema (action_id unique, idempotency_key, encrypted undo payload, applied_at, verified_at; live reversal drill as acceptance) | N2=MINOR: backend/models/AiConversation.mjs L24-83: role column semantics undefined; add mandatory probe that authz reads live token role (aiChatRoutes.mjs L283) never stored conversation.role — demotion retention risk
rebuttals: F3=REJECT: blanket 400 TARGET_REQUIRED on null targets breaks client self-service — AITerminalPanel.tsx L116-139 ships clientId||null and aiChatRoutes.mjs L308-344 accepts targetUserId only for admin/trainer, so null-target client conversations are the shipped shape; adopt canonical-PK core, replace mechanism: client+null→resolve to self PK server-side, client+other→403 TARGET_FORBIDDEN, admin/trainer+unresolvable→400 TARGET_REQUIRED | F1=AGREE (extend per N1) | F2=AGREE | F4=AGREE | F5=AGREE | F6=AGREE (acceptance = DB-enforced conditional UPDATE WHERE status='pending', not read-then-write) | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE
open: Q1=any seat evidence authz reads AiConversation.role instead of live token role (N2) | Q2=admin-unbounded resolution at clientResolver.mjs L110-166: policy-tag sufficient or per-command cap required | Q3=name manual workout logger the C6 offline-authoritative path in the blueprint
consensus_block: PROPOSED AMENDED CONSENSUS (for round-4 adoption): round-2 candidate stands verbatim EXCEPT (1) F3 mechanism replaced by role-aware target resolution — client role: null target resolves server-side to authenticated user PK, explicit other-target 403 TARGET_FORBIDDEN; admin/trainer: unresolvable target 400 TARGET_REQUIRED; receipts echo requestedAlias+resolvedUserPK at aiChatRoutes.mjs L308-344, aiCommandRoutes.mjs L111-145, useCoachCommand.ts L96,170,207; (2) F1 receipt schema extended per N1 (action_id unique, idempotency_key, encrypted compensating/undo payload, applied_at, verified_at; audit hash correlation-only; acceptance = live drill reverses a wrong-client mutation from receipt alone); (3) N2 demotion probe added to verification matrix (admin→trainer on existing conversation must fail cross-client access); (4) blueprint names manual workout logger as offline-authoritative path for constraint 6. All other items (F2, F4-F11), accepted-as-intentional rulings, and residual risks carried verbatim from round-2 candidate.
=== END-VERDICT ===
