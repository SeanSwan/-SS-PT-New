# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-2\REVIEW-DOC.md
**Tokens:** 6871 in / 17087 out (reasoning: 13744) | total 23958
**Wall:** 217.6s

---

# GLM 5.3 — Round 2: Full-Spectrum Audit of the Consensus Candidate

Stance held: correctness, security, schema truth, and the 8 acceptance criteria (packet §"Non-negotiable constraints") line by line.

**Ruling on the candidate:** I adopt F1–F11 verbatim with engineering endorsements below. I REJECT the candidate's silent drop of the round-1 schema-truth finding (running state, last two entries) and carry it as **F12 (new MAJOR)**, plus **F13 (new MAJOR)** for the unmet "recoverable" limb of constraint 2. That makes this a DISPUTE, not manufactured consensus.

## 1. Adopted fixes — WHAT / WHERE / HOW

- **F1** — Add `action_id` (unique, non-null) + unique index to `AiCommandAuditLog.mjs` (migration DDL must enter packet evidence — see F12); executor at `aiCommandRoutes.mjs:111-145` returns the existing receipt on conflict (idempotent), returns `{action_id, operation_id, resolved targetUserId, status, error_code, at}`; `useCoachCommand.ts:96,170,207` keys all retries on `action_id`, no blind re-POST on ambiguous failure.
- **F2** — Registry lookup inserted in `commandExecutor.mjs:309-343` after ID resolution, before dispatch; denial writes an audit row (`outcome='denied'`) and returns a denial-shaped body — a denied operation can never mint a success receipt.
- **F3** — `targetUserId` (user PK) is the sole canonical identity. Admin/trainer: null target → `400 TARGET_REQUIRED` at `aiCommandRoutes.mjs:111-145` and `aiChatRoutes.mjs:308-344`. **Strengthening:** client role resolves target server-side from the auth token and discards body-supplied `selectedClientId`/`clientId` — the packet is silent on how `clientResolver.mjs:110-166` treats the client role (it documents trainer scoping and admin non-scoping only), so self-resolution must be explicit. Receipts echo alias + resolved PK.
- **F4** — IndexedDB intent outbox keyed by `action_id`; UI states queued/sending/verified/failed only; reconcile dedupes through F1's server key. **Add:** the candidate omits the latency budget demanded by Question 6 — blueprint must set it.
- **F5** — Copy the `aiChatRoutes.mjs:466` middleware family to `coachIntakeRoutes.mjs:23-25` and `coachProposalRoutes.mjs:15-16`; add the JSON body limit to proposals (intake has it at `:23-25`, the proposals row at `:15-16` shows none). **Correction:** the packet shows no TTL at `aiChatRoutes.mjs:466` — retention must be specified fresh (intake probe row "Retention/purge"), not "copied."
- **F6** — Transactional `UPDATE ... WHERE id=? AND status='pending'`; rowcount 0 → return prior receipt; durable applied/failed receipt. Incomplete without F13.
- **F7** — Verb inventory on `aiStreamSpikeRoutes.mjs`; kill-switch 404 on every verb, not only the documented `GET /`.
- **F8** — Cite gate code on `CoachCommandCenterPage` or strike "review-gated writes." The only review-gate evidence in the packet is `coachProposalRoutes.mjs:30-54`; the command-center write path (`useCoachCommand.ts:96`, execute) has no cited gate.
- **F9** — Archive or rewrite `APP-AI-HIVE-MIND.md:7-22` against the mounted reality of `routes.mjs:630-634`.
- **F10** — `ensureClientAccess` on `aiDebateRoutes.mjs:57-76` start path, matching the proposal lane's own service behavior.
- **F11** — Fence/retire `SwanCoachAssistantPage`, migrate its self-referencing tests, cite the route-lock or drop the word "locks."

Accepted-as-intentional items retained: admin unbounded scope (conditional on an explicit round-3 ruling, not silence) and the `routes.mjs:630-634` mount order (correct Express practice; a prefix mount at `/api/ai-chat` would only shadow the spike if it defined `/stream-spike`, which the packet does not show).

## 2. Rejection + new MAJORs

**F12 = MAJOR (schema truth; REJECT of candidate omission).** `AiConversation.mjs:24-83` declares `userId` and `targetUserId` as bare fields. The packet contains **no SQL/migration/association text anywhere** (running state: "no SQL text in packet") establishing FK targets, `ON DELETE` behavior, or uniqueness. Consequences: user deletion orphans conversations (with health-laden `context`/`messages` — a retention/privacy failure under constraint 1), orphans `AiCommandAuditLog` rows (breaking constraint 2's observability durability), and leaves the intake↔proposal identity chain unstated (`coachIntakeRoutes.mjs:27-33` ↔ `coachProposalRoutes.mjs:30-54`), permitting dangling/cyclic pending proposals. The candidate's F3 fixes identity *vocabulary*, not referential *integrity*. Fix: ship DDL evidence in the packet (FKs, ON DELETE RESTRICT/CASCADE decisions, unique keys) as a build gate alongside F1's migration.

**F13 = MAJOR (constraint 2 "recoverable").** `useCoachCommand.ts:96,170,207` exposes exactly `execute|confirm|cancel`. Cancel is pre-apply; there is **no post-apply undo/correction contract anywhere in the packet**. The packet's own path table contradicts the candidate's completeness: the `/api/coach/proposals` row states "Proposal state needs one authoritative action, **undo**, and review contract." Fix: compensating-write undo action class with its own durable receipt, wired into F6's apply path; acceptance criterion: any applied proposal/command has a reversible path that itself produces an audit row.

## 3. The 8 acceptance criteria, line by line

| # | Verdict today | Evidence | Findings |
|---|---|---|---|
| 1 least-privilege | **FAIL** | `clientResolver.mjs:110-166` admins unscoped; `aiDebateRoutes.mjs:57-76` start unresolved; `coachIntakeRoutes.mjs:23-25`/`coachProposalRoutes.mjs:15-16` lack PII middleware | F2, F5, F10, pending ruling |
| 2 wrong-client (explicit/validated/observable/recoverable) | **FAIL all four limbs** | explicit: three vocabularies (`selectedClientId` `aiCommandRoutes.mjs:111-145`; `targetUserId` `AiConversation.mjs:24-83`; `clientId` `AITerminalPanel.tsx:116-139`); validated: no registry `commandExecutor.mjs:309-343`; observable: no `action_id` `AiCommandAuditLog.mjs:24-91`; recoverable: no undo `useCoachCommand.ts:96,170,207` | F3, F2, F1, F13 |
| 3 memory ≠ truth | **FAIL** | Packet's own "Receipt and idempotency boundary" admits the contract is unproven; `aiWorkoutEvents.ts:121-128` boolean is not a receipt | F1, F4 |
| 4 no premature "saved" | **FAIL-risk** | `aiWorkoutEvents.ts:121-128` returns dispatcher bool; no verified-state render exists in packet | F4 |
| 5 server-enforced entitlement | **PARTIAL** | Gates proven at `aiChatRoutes.mjs:283,466,610-625`; command-lane entitlement "not yet proven" (probe table); `CoachCommandCenterPage.tsx:34-43` role logic is client-side and cannot substitute | F2, F5, F10 |
| 6 offline/degraded | **FAIL** | Only evidenced write paths are cloud round-trips (`useCoachCommand.ts:96`; `useAIChat.ts:217,425,448`); the browser bridge (`aiWorkoutEvents.ts:121-128`) is local but not durable | F4 |
| 7 44px/WCAG/tokens | **NO EVIDENCE** | Zero styling artifacts; all UI excerpts are logic-only | carried by blueprint matrix (adopted) |
| 8 Ox Alpha canary | **N/A (process)** | Header sanitization assertion; no code excerpt contradicts | — |

## 4. Builder-claim tests (rule 5)

1. Header "review-gated writes" on `CoachCommandCenterPage` vs `useCoachCommand.ts:96` execute with no gate excerpt → contradiction stands (F8).
2. Header "route-mount **locks** say `/coach-assistant` mounts CoachCommandCenterPage" vs refresh "No route-tree mount or lazy export was found" for the Swan page → the "locks" claim asserts evidence the packet lacks (F11).
3. Header mounts table vs `UniversalDashboardLayout.routes.tsx:98/177/203` → consistent, no finding.
4. Header "approval service calls `ensureClientAccess` and **claims pending rows** before apply" → the claiming mechanism's atomicity is exactly what F6 challenges; treat as unproven assertion, add to probe matrix (replay/concurrency row already requires it).

## 5. What other seats must decide

- Q1: Rule admin unbounded scope (`clientResolver.mjs:110-166`) — policy with audit tagging, or defect. Silence is not a ruling.
- Q2: Classify `/api/hermes` (`hermesRoutes.mjs:43,90,127,142`) and `/api/ai/debate` — operator-only lane vs coach capability; determines whether F10 suffices or the lane must be fenced from dashboards entirely.
- Q3: `/api/ai-command/confirm` handler semantics are unexcerpted (`useCoachCommand.ts:170`): does execute stage and confirm commit, or does execute write immediately? This changes where F1's idempotency key must live.
- Q4: Who owns AC7's verification-matrix rows given zero packet artifacts — every seat claiming compliance must cite or concede.

=== VERDICT ===
status: DISPUTE
confidence: 91
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: no action_id/unique idempotency key; retries via useCoachCommand.ts L96,170,207 can double-apply | F2=MAJOR: commandExecutor.mjs L309-343: no capability registry post-resolution pre-execution; denied op can mint success | F3=MAJOR: aiCommandRoutes.mjs L111-145 vs AiConversation.mjs L24-83 vs AITerminalPanel.tsx L116-139: three identity vocabularies; null targets pass; client-role resolution unstated | F4=MAJOR: aiWorkoutEvents.ts L121-128: browser boolean only; no offline intent queue (AC6) | F5=MAJOR: coachIntakeRoutes.mjs L23-25 + coachProposalRoutes.mjs L15-16: missing aiChatRoutes.mjs L466 middleware family; proposals lack JSON limit | F6=MAJOR: coachProposalRoutes.mjs L30-54: pending-claim atomicity unproven; no durable applied/failed receipt | F7=MINOR: aiStreamSpikeRoutes.mjs: kill-switch evidenced on GET / only; verb inventory unproven | F8=MAJOR: packet header 'review-gated writes' on CoachCommandCenterPage vs useCoachCommand.ts L96 execute with no cited gate | F9=MINOR: docs/ai-workflow/references/APP-AI-HIVE-MIND.md L7-22 vs routes.mjs L630-634 stale doc | F10=MAJOR: aiDebateRoutes.mjs L57-76: start path resolves clientId without evidenced ensureClientAccess | F11=MINOR: SwanCoachAssistantPage test-referenced, no route mount; 'locks' claim uncited | F12=MAJOR: AiConversation.mjs L24-83: userId/targetUserId FK/ON DELETE/uniqueness unevidenced, no SQL text in packet; user-delete orphans conversations/audit/pending proposals; intake↔proposal identity chain unstated (coachIntakeRoutes.mjs L27-33 ↔ coachProposalRoutes.mjs L30-54) | F13=MAJOR: useCoachCommand.ts L96,170,207: execute|confirm|cancel only, no post-apply undo/correction; packet proposals row itself demands 'undo'; AC2 'recoverable' unmet
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE: add client-role server-side self-resolution, discard body IDs | F4=AGREE: add latency budget; depends on F1 | F5=AGREE: TTL not evidenced at aiChatRoutes.mjs L466, specify retention fresh | F6=AGREE: incomplete without F13 undo | F7=AGREE | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE | F12=NEW: candidate dropped round-1 schema-truth finding | F13=NEW
open: Q1=panel ruling: admin unbounded scope in clientResolver.mjs L110-166 policy or defect | Q2=classify /api/hermes and /api/ai/debate: operator lane vs coach capability | Q3=/api/ai-command/confirm semantics unexcerpted (useCoachCommand.ts L170): stage-then-commit or immediate write | Q4=ownership of AC7 44px/WCAG verification rows with zero packet artifacts
consensus_block: PROPOSED ROUND-3 CANDIDATE (amends current block): keep FIX BEFORE BUILD F1/F3/F2/F6/F5 and per-slice F4/F7/F10/F11/F8/F9 exactly as endorsed above (F3 strengthened with client-role self-resolution; F5 corrected on TTL provenance). ADD to FIX BEFORE BUILD: F12 — packet must ship DDL/migration evidence for AiConversation.mjs L24-83 (userId/targetUserId FKs, ON DELETE decision, unique keys) and the intake↔proposal identity chain (coachIntakeRoutes.mjs L27-33 ↔ coachProposalRoutes.mjs L30-54) before any build slice touches identity; ADD F13 — compensating-write undo/correction action class with durable receipt, wired into F6's apply path. RETAIN accepted-as-intentional (admin scope conditional on explicit Q1 ruling; mount order correct). RESIDUAL RISKS unchanged plus: constraints 2/3/4/6 unverifiable until F1/F3/F4/F13 land; absence-based MAJORs (F2/F4/F7/F10/F12/F13) confirmed by live probes, not assumption; Hermes/debate classification open (Q2); confirm-semantics open (Q3); AC7 carried entirely by blueprint verification matrix (Q4).
=== END-VERDICT ===
