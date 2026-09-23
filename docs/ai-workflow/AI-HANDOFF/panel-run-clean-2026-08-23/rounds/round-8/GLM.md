# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-8\REVIEW-DOC.md
**Tokens:** 6371 in / 7249 out (reasoning: 4970) | total 13620
**Wall:** 82.2s

---

# GLM 5.3 — Round 8: Full-Spectrum Adoption with Two Evidence-Backed Amendments

I adopt the consensus candidate. No REJECTs survive packet scrutiny, and no new MAJOR clears the evidence gate (every candidate absence-claim I probed — retention on `AiConversation.messages`, spike non-GET methods, debate ownership — is either already carried by F5/F7/F10 or must wait for live probes per the residual-risk clause). I carry **two amendments** that tighten fix specs against packet-internal evidence, plus one NOTE.

## The 8 acceptance criteria, line by line (my remit)

| # | Constraint (packet, "Non-negotiable constraints") | Carrier in ruling | Verdict |
|---|---|---|---|
| 1 | Least-privilege for health/training/identity/history | F2 registry at `commandExecutor.mjs:309-343`; F5 parity (`aiChatRoutes.mjs:466` vs `coachIntakeRoutes.mjs:23-25`, `coachProposalRoutes.mjs:15-16`); F10 (`aiDebateRoutes.mjs:57-76`) | Covered |
| 2 | Wrong-client mutation catastrophic: explicit, server-validated, observable, recoverable | F3 canonical PK identity; F2 post-resolution gate; F6 conditional apply at `coachProposalRoutes.mjs:30-54`; F1 audit receipt = observable/recoverable | Covered |
| 3 | Memory ≠ truth; verified state + durable receipts are truth | F1 receipt return; F6 durable applied/failed receipt; `aiWorkoutEvents.ts:121-128` boolean stays non-authoritative | Covered |
| 4 | UI never claims saved before authoritative write | F4 UI states queued/sending/verified only, gated on F1 receipt | Covered |
| 5 | Server-enforced roles, not shell inference | F2 + F5 + F10; mount order `routes.mjs:630-634` ruled correct (specific-before-prefix) | Covered |
| 6 | Offline/degraded gym-floor story | F4 IndexedDB queue keyed by actionId, exactly-once reconcile — impossible until F1 unique key lands, so F1-before-F4 ordering in the candidate is mandatory | Covered |
| 7 | React/TS, tokens, 44px, WCAG, dual QA | Zero packet artifacts (no wireframe/CSS evidence anywhere in packet) | **Unverifiable in packet** — residual risk correctly assigned to blueprint verification matrix |
| 8 | Ox Alpha receives only canary-redacted packet | Satisfied at process level by the packet header sanitization statement; no code artifact exists to audit | No finding possible |

## Amendment A — F3 null-target rule must not break client self-service

F3 as written ("server-reject null targets with 400 TARGET_REQUIRED") is over-broad against the packet's own evidence: `AITerminalPanel.tsx:116-139` sends `clientId || null` on the shared terminal path, and client-mode `CoachCommandCenterPage.tsx:34-43` routes self-service through the same lanes. A blanket 400 on null would reject legitimate self-scoped calls. Amended rule: **null target resolves server-side to the authenticated caller's user PK for self-scoped command families; 400 TARGET_REQUIRED applies only when the command family requires an explicit non-self target (admin/trainer acting on others)**. This preserves the candidate's core claim — single canonical PK identity, receipts echo alias + resolved PK — while keeping constraint 1 and the client self-service surface (Question 7) intact.

## Amendment B — attribution uses role-at-execution, never the conversation snapshot

Per the running state: `AiConversation.mjs:24-83` persists a `role` snapshot at conversation creation. Authorization and audit attribution for any executed command must read **role-at-execution from the `AiCommandAuditLog` row** (`AiCommandAuditLog.mjs:24-91` records actor and role). A stale conversation role snapshot must never gate or label a mutation — fold this into F1's executor spec and F2's post-resolution check. This is the schema-truth fix for the role-drift case: admin demoted mid-conversation, or a conversation created under trainer role reused post-elevation.

## Agreements and one NOTE

- **Accepted as intentional:** admin unbounded scope in `clientResolver.mjs:110-166` — I concur conditionally: acceptable only if the panel rules it policy AND the audit row tags admin-scope-widened resolutions; otherwise it violates constraint 2. Express mount order at `routes.mjs:630-634` is correct practice. Both carried to open questions.
- **New NOTE (F12):** `AiConversation.mjs:24-83` stores `messages`/`messageCount`/`lastMessageAt` with no retention contract anywhere in the packet. Required-final-package item 3 mandates retention design; flag it so the blueprint cannot ship without a messages TTL/purge spec. Absence-based, so NOTE only — live probe confirms.
- F8/F11 stand exactly as framed: "review-gated writes" and "route-mount locks" are header assertions with no file:line in the packet; cite or strike.

=== VERDICT ===
status: CONSENSUS
confidence: 93
findings: F1=MAJOR: AiCommandAuditLog.mjs:24-91 no action_id/unique idempotency key; idempotent executor + receipt return at aiCommandRoutes.mjs:111-145 and useCoachCommand.ts:96,170,207 | F2=MAJOR: commandExecutor.mjs:309-343 resolves IDs but no proven post-resolution capability gate; denial must audit + denial-shaped response | F3=MAJOR: target identity ambiguity aiChatRoutes.mjs:308-344 vs AiConversation.mjs:24-83; canonical PK + amended null-target rule | F4=MAJOR: no offline intent queue or honest UI truth states (constraint 6) | F5=MAJOR: middleware parity gap aiChatRoutes.mjs:466 vs coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16 | F6=MAJOR: coachProposalRoutes.mjs:30-54 replay/concurrency + durable applied/failed receipt unproven | F10=MAJOR: aiDebateRoutes.mjs:57-76 client start path lacks proven ensureClientAccess | F7=MINOR: aiStreamSpikeRoutes gating shown only on GET /; other methods unverified | F11=MINOR: SwanCoachAssistantPage legacy but referenced by tests/comments | F8=MINOR: 'review-gated writes' header claim uncited | F9=MINOR: APP-AI-HIVE-MIND.md:7-22 runtime drift | F12=NOTE: AiConversation.mjs:24-83 messages retention/TTD unspecified; blueprint item 3 must specify
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE-AMENDED: null target must server-resolve to caller PK for self-scoped families before any 400 TARGET_REQUIRED — AITerminalPanel.tsx:116-139 sends clientId||null and client self-service rides the same lanes | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | F10=AGREE | F11=AGREE | F8=AGREE | F9=AGREE
open: Q1=Panel ruling: is admin unbounded scope in clientResolver.mjs:110-166 policy (tag in audit) or a constraint-2 violation to fix | Q2=Classify /api/hermes and /api/ai/debate as canonical/legacy/dormant/competing vs public Coach | Q3=Does any file:line exist for the header's 'route-mount locks' and 'review-gated writes' claims, or are F8/F11 citations to be struck | Q4=Live-probe priority order once F1/F3/F4 land, since constraints 2/3/4/6 verification is blocked until then
consensus_block: REQUIRED ruling, adopted from round-7 candidate with two amendments:
FIX BEFORE BUILD: F1 — add actionId unique key + idempotent executor + receipt return in AiCommandAuditLog.mjs, aiCommandRoutes.mjs:111-145, useCoachCommand.ts:96,170,207. F3 — single canonical targetUserId user-PK identity; AMENDED null-target rule per AITerminalPanel.tsx:116-139: server resolves null to authenticated caller PK for self-scoped families, 400 TARGET_REQUIRED only where explicit non-self target is required; receipts echo alias + resolved PK. F2 — capability registry checked post-resolution pre-execution at commandExecutor.mjs:309-343; denial writes audit row and returns denial-shaped response; AMENDED: entitlement reads role-at-execution from the audit row, never the AiConversation.mjs:24-83 role snapshot. F6 — conditional UPDATE ... WHERE status='pending' transaction + idempotent apply + durable applied/failed receipt at coachProposalRoutes.mjs:30-54. F5 — apply aiChatRoutes.mjs:466 middleware family + TTL to coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16; parity table gate.
MUST-FIX PER SLICE: F4 (IndexedDB intent queue keyed by actionId; UI states queued/sending/verified only; reconcile replays exactly once; depends on F1). F7 (spike method inventory + disabled-404 on every method). F10 (ensureClientAccess on aiDebateRoutes.mjs:57-76 start path). F11 (fence SwanCoachAssistantPage, migrate tests, cite or drop 'locks'). F8 (cite review-gate code or strike header claim). F9 (archive/rewrite hive doc).
ACCEPTED AS INTENTIONAL (pending Q1 ruling): admin unbounded scope in clientResolver.mjs:110-166 IF ruled policy and tagged in audit; Express specific-before-prefix mount order at routes.mjs:630-634 is correct practice, not a defect.
RESIDUAL RISKS: constraints 2/3/4/6 unverifiable until F1/F3/F4 land; all absence-based MAJORs require live probes confirming, not assuming; Hermes/debate classification unresolved (Q2); acceptance criterion 7 (44px/WCAG) has zero packet artifacts and is carried entirely by the blueprint verification matrix; NEW: AiConversation messages retention contract (F12) must appear in blueprint target-architecture item 3.
=== END-VERDICT ===
