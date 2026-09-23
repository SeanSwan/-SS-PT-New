# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-4\REVIEW-DOC.md
**Tokens:** 6517 in / 10945 out (reasoning: 8386) | total 17462
**Wall:** 130.4s

---

# Round 4 — GLM 5.3: correctness / security / schema truth / 8 criteria, line by line

## 1. Candidate audit — what I verified and adopt

I traced every FIX item in the consensus candidate to packet artifacts. All hold:

| Item | Verified against |
|---|---|
| F1 | Packet §Receipt/idempotency boundary: `AiCommandAuditLog.mjs:24-91` "has no `action_id` or unique idempotency key"; `aiCommandRoutes.mjs:111-145` accepts `selectedClientId`; `useCoachCommand.ts:96,170,207` execute/confirm/cancel literals. Adopt. |
| F2 | Probe table: `commandExecutor.mjs:309-343` resolves selected IDs; "server entitlement behavior for every command family is not yet proven." Adopt. |
| F6 | `coachProposalRoutes.mjs:30-54`; probe row demands "Replay/concurrency... durable applied/failed receipt." Adopt. |
| F5 | `aiChatRoutes.mjs:466` (subscription, rate-limit, PII) vs `coachIntakeRoutes.mjs:23-25` (protect + role + JSON limit only) and `coachProposalRoutes.mjs:15-16` (protect + role only). Intake carries **health data** without the PII middleware family — F5 stays FIX BEFORE BUILD. Adopt. |
| F4 | Constraint 6 vs zero queue artifacts; `useCoachCommand.ts` POSTs directly; `aiWorkoutEvents.ts:121-128` returns a dispatcher boolean only. Adopt. |
| F7 | `routes.mjs:630`; only "GET /" is evidenced as `spikeEnabled`+`adminOnly`-gated. Adopt. |
| F10 | `aiDebateRoutes.mjs:57-76` accepts/resolves client context; packet itself flags "direct `clientId` path needs an explicit access probe." Adopt. |
| F8, F9, F11 | Header claims "review-gated writes" and "route-mount locks" with no file:line; `APP-AI-HIVE-MIND.md:7-22` vs `routes.mjs:630-634/378-379`; SwanCoachAssistantPage classified "legacy but still referenced," no mount found. Adopt. |

Mount-order acceptance stands: `routes.mjs:630-634` mounts `/api/ai-chat/stream-spike` before `/api/ai-chat` because the prefix router would otherwise swallow the spike path — correct practice, not a defect.

## 2. REJECT — F3 as worded

**F3's "server-reject null targets with 400 TARGET_REQUIRED" is wrong as an unconditional rule.** Two packet cites:

- `aiChatRoutes.mjs:308-344` accepts `targetUserId` **for admin/trainer** — the client role is not in that list; client self-service legitimately sends no target.
- `CoachCommandCenterPage.tsx:34-43` isolates client mode (`isClientMode`) as a separate path.

Unconditional TARGET_REQUIRED 400s every normal client-mode request — it bricks client self-service, violating the owner outcome's four-surface requirement. **Replacement (strictly stronger):** role-conditional target rule — (a) client lanes force `targetUserId = authenticated user PK` server-side; a client-supplied foreign `targetUserId` returns **403**, never silent override; (b) admin/trainer lanes require an explicit target → 400 `TARGET_REQUIRED` when absent; (c) receipts echo alias + resolved PK unchanged. Also fold one live probe into F3: the packet cites a trainer access check at `aiChatRoutes.mjs:610-625` (messages) but **cites none at conversation creation `:308-344`** — probe or cite.

## 3. New findings from my lens

**F12 = MAJOR — schema truth: single-row message log with denormalized counter.** `AiConversation.mjs:24-83` places `messages`, `messageCount`, and `lastMessageAt` on one row; `useAIChat.ts:425,448` appends via POST to `/api/ai-chat/conversations/${convId}/messages` on every send. Three engine-independent defects: (1) `messageCount` can drift from `messages.length` with no cited reconciliation — two representations of one fact on one row; (2) concurrent sends from stale tabs — packet Question 4's own scenario — race on append+count, losing or duplicating messages, breaking the owner outcome's "conversation continuity"; (3) unbounded row growth is a storage failure mode (hard write-failure at doc cap if MongoDB; row bloat otherwise). Constraint 3's "memory is not domain truth" softens blast radius but does not license silent message loss. **Fix — WHAT:** split messages into a child store keyed `(conversationId, seq)` with a unique index making appends idempotent per F1's `actionId`; `messageCount` maintained by atomic increment or derived; `AiConversation` becomes a header row (`userId, role, context, targetUserId, status, metadata, lastMessageAt`). **WHERE:** `AiConversation.mjs:24-83` + new message model + the append handler behind `useAIChat.ts:425,448`. **HOW:** backfill split, read API shape unchanged.

**F13 = MINOR — kill-switch parity.** `aiCommandRoutes.mjs:110` evidences a lane kill switch; no kill-switch artifact is cited for `/api/ai-chat` (`aiChatRoutes.mjs:283,466`), `/api/coach/intake` (`:23-25`), or `/api/coach/proposals` (`:15-16`). Constraint 8 requires kill switches before any UI modification. Fix: replicate the `:110` flag pattern per lane and add a row to F5's parity table gate.

## 4. The eight acceptance criteria, line by line

| # | Criterion | Packet evidence | Ruling |
|---|---|---|---|
| 1 | Least-privilege | `aiChatRoutes.mjs:610-625` trainer gate cited; command families unproven (`commandExecutor.mjs:309-343`); debate start gap (`:57-76`); admin unscoped (`clientResolver.mjs:110-166`) | **PARTIAL** — gated on F2/F3/F10 + admin-scope policy ruling |
| 2 | Wrong-client mutation catastrophic | Target identity split across `targetUserId` (conversations) and `selectedClientId` (commands); no receipt echo; proposals replay/concurrency unproven | **UNPROVEN** — F1/F3/F6 |
| 3 | Receipts are truth | `AiCommandAuditLog.mjs:24-91` — no idempotency key; `aiWorkoutEvents.ts:121-128` — boolean only | **AFFIRMATIVELY VIOLATED TODAY** — F1 |
| 4 | UI never says saved early | Same evidence; no durable receipt reaches the UI in any packet artifact | **AFFIRMATIVELY VIOLATED TODAY** — F1+F4 |
| 5 | Server-side entitlement | `protect` present on all five lanes (`aiChatRoutes:283`, `aiCommandRoutes:110`, `coachIntakeRoutes:23-25`, `coachProposalRoutes:15-16`, `aiDebateRoutes:54`); entitlement depth unproven | **PARTIAL** — authn proven, authz depth not (F2/F10) |
| 6 | Offline/degraded story | Zero queue/reconcile artifacts anywhere in packet | **ZERO EVIDENCE** — F4 designs it; must land in slice 1, not "per slice" whenever convenient |
| 7 | 44px/WCAG/QA standards | No token, control-size, contrast, or QA artifact cited anywhere | **ZERO EVIDENCE** — carried entirely by final-package item 8's browser responsive/accessibility row |
| 8 | Ox Alpha redaction | Packet constructed canary-redacted | **MET by process** — not a code artifact |

Hostile scoreboard: **zero of eight provable today**; two affirmatively violated (3, 4); two with zero artifacts (6, 7). Any blueprint claiming current compliance with criteria 3/4/6/7 is manufacturing consensus.

## 5. Unchanged from candidate

Accepted-as-intentional items (admin scope conditional on policy ruling + audit tagging; mount order), and all residual risks, stand as written — plus one addition: the 0-of-8 criteria scoreboard above becomes a blueprint verification-matrix input, and absence-based MAJORs still require live probes, not assumption.

=== VERDICT ===
status: DISPUTE
confidence: 91
findings: F12=MAJOR: backend/models/AiConversation.mjs L24-83: messages+messageCount+lastMessageAt denormalized on one row with appends via useAIChat.ts L425,448 POSTs — counter drift, stale-tab append races (packet Q4's own scenario), unbounded row growth; fix = child message store keyed (conversationId, seq) with unique idempotent index + atomic/derived count | F13=MINOR: kill-switch parity — aiCommandRoutes.mjs L110 has lane kill switch; none cited for aiChatRoutes L283/466, coachIntakeRoutes L23-25, coachProposalRoutes L15-16
rebuttals: F1=AGREE | F2=AGREE | F3=REJECT-AS-WORDED: unconditional 400 TARGET_REQUIRED bricks client self-service — aiChatRoutes.mjs L308-344 accepts targetUserId only for admin/trainer and CoachCommandCenterPage.tsx L34-43 isolates client mode; replace with role-conditional rule (client lanes force self PK, foreign target 403; admin/trainer lanes 400 TARGET_REQUIRED; receipts echo alias+resolved PK) | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE
open: Q1=panel rules F12 MAJOR vs MINOR given constraint-3 memory carve-out | Q2=confirm admin unbounded resolver scope as policy with audit tagging | Q3=Hermes + ai/debate classification pending | Q4=trainer access check at conversation creation aiChatRoutes.mjs L308-344 — probe or cite
consensus_block: DISPUTE — adopt candidate verbatim EXCEPT: (a) F3 amended to role-conditional target rule: client lanes force targetUserId=authenticated PK server-side with 403 on foreign target; admin/trainer lanes return 400 TARGET_REQUIRED on absent target; receipts echo alias+resolved PK; add live probe for trainer access check at conversation creation aiChatRoutes.mjs:308-344. (b) ADD F12 before build: split AiConversation.mjs:24-83 into header row + child message store keyed (conversationId, seq) with unique idempotent index; messageCount atomic-or-derived; backfill migration, read API unchanged. (c) ADD F13 to F5 parity table: lane kill switches on ai-chat/intake/proposals matching aiCommandRoutes.mjs:110 pattern. All other FIX-BEFORE-BUILD and PER-SLICE items (F1, F2, F4, F5, F6, F7, F8, F9, F10, F11), accepted-as-intentional rulings, and residual risks unchanged; new residual: acceptance-criteria scoreboard is 0-of-8 provable today (3/4 affirmatively violated, 6/7 zero artifacts) and must anchor the blueprint verification matrix.
=== END-VERDICT ===
