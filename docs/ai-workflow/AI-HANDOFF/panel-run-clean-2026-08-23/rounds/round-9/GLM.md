# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-9\REVIEW-DOC.md
**Tokens:** 6639 in / 11923 out (reasoning: 9437) | total 18562
**Wall:** 144.3s

---

# GLM 5.3 — Round 9: Full-Spectrum Audit of the Consensus Candidate

Stance held: correctness, security, schema truth, and the eight acceptance criteria line by line. Round 9 duty: audit the candidate ruling, draft the integrated deltas, retain disputes with evidence. The candidate is 90% sound; it contains one procedural defect that forces DISPUTE: **it silently dropped a live running-state finding** ("no FK/ON DELETE evidence for conversation/audit targets") that survived eight rounds. Rule 3 permits adopt-or-REJECT, not silent omission. I restore it as F12 and add its direct corollary F13.

## A. The eight acceptance criteria, line by line

Mapping: the panel's working acceptance criteria = the eight Non-negotiable Constraints (the candidate itself cites "acceptance criterion 7 (44px/WCAG)").

| # | Criterion | Packet evidence | Candidate coverage | Verdict |
|---|---|---|---|---|
| 1 | Least-privilege on health/identity | `aiChatRoutes.mjs:283,610-625`; `clientResolver.mjs:110-166`; `coachIntakeRoutes.mjs:23-25`; `aiDebateRoutes.mjs:54` | F2, F5, F10 + admin-scope ruling | COVERED |
| 2 | Wrong-client mutation: explicit / server-validated / **observable / recoverable** | `AiCommandAuditLog.mjs:24-91` (records actor/target/outcome, no idempotency, params hashed/redacted); `aiWorkoutEvents.ts:121-128` | F1/F2/F3/F6 cover explicit+validated+observable | **PARTIAL — recoverable leg has no data path. New F12/F13** |
| 3 | Receipts are truth, memory is not | `AiConversation.mjs:24-83` is a memory store; `AiCommandAuditLog.mjs:24-91` the truth candidate | F1 | COVERED once F1 lands |
| 4 | No "saved" UI before authoritative write | `aiWorkoutEvents.ts:121-128` returns a dispatcher boolean only | F4 verified-only states | COVERED — add explicit ban: `dispatchAIWorkoutEvent` return may never map to a `verified` state |
| 5 | Server-enforced entitlement | `clientResolver.mjs:110-166` (trainer-scoped, admin unbounded); `commandExecutor.mjs:309-343` | F2 + admin ruling below | COVERED |
| 6 | Offline/degraded gym floor | Zero artifacts; running state: "(no existing code)" | F4 must-fix-per-slice | COVERED as build requirement; unverifiable pre-build (residual, agreed) |
| 7 | 44px/WCAG/dark-first/QA | Zero packet artifacts | Residual → verification matrix | COVERED as residual (agreed) |
| 8 | Ox Alpha prompt retention | Process constraint, no code surface | — | N/A in code; handoff note only, no finding possible |

**AC2 is the gap.** "Observable" is satisfied by the audit row; "recoverable" is not — a row whose parameters exist only as "hash/redaction" (`AiCommandAuditLog.mjs:24-91`, packet's own words) cannot drive a compensating action, and unproven FK/ON DELETE means user deletion can orphan or strand the trail entirely.

## B. Candidate items F1–F11: audit confirms

- **F1 AGREE** — packet's Receipt/idempotency section states verbatim: "no `action_id` or unique idempotency key" at `AiCommandAuditLog.mjs:24-91`.
- **F2 AGREE** — `commandExecutor.mjs:309-343` resolves IDs; no post-resolution capability gate is evidenced.
- **F3 AGREE** — `aiChatRoutes.mjs:308-344` accepts `targetUserId`; `AITerminalPanel.tsx:116-139` ships `clientId || null`.
- **F4 AGREE** — constraint 6 has zero code; states `queued/sending/verified` match AC4/AC6.
- **F5 AGREE** — middleware asymmetry verified: `aiChatRoutes.mjs:466` (subscription + rate-limit + PII) vs `coachIntakeRoutes.mjs:23-25` and `coachProposalRoutes.mjs:15-16` (protect + role auth only).
- **F6 AGREE** — `coachProposalRoutes.mjs:30-54` "claims pending rows" per packet, but replay/concurrency/durable receipt are listed as unproven probes; conditional `UPDATE ... WHERE status='pending'` is the correct closure.
- **F7 AGREE, with added teeth** — because `routes.mjs:630` mounts the spike **before** the `/api/ai-chat` prefix, any method not explicitly handled on the spike router falls through to chat handlers. A GET-only guard leaves POST/PUT/DELETE `/api/ai-chat/stream-spike` reaching `aiChatRoutes`. F7's "disabled-404 on every method" is therefore a correctness requirement, not hygiene.
- **F8 AGREE** — "review-gated writes" appears in the header narrative with no file:line.
- **F9 AGREE** — `APP-AI-HIVE-MIND.md:7-22` describes a runtime the route tree contradicts.
- **F10 AGREE** — `aiDebateRoutes.mjs:57-76` accepts/resolves client context with no evidenced access check on the start path, while status/result/stream carry ownership middleware.
- **F11 AGREE** — evidence-gate refresh found "no route-tree mount or lazy export" for `SwanCoachAssistantPage`, yet the header still asserts "route-mount locks"; cite or drop.

**Accepted-as-intentional — my seat records its ruling to close the pending items:**
- **Admin unbounded scope (`clientResolver.mjs:110-166`): ACCEPT as policy** with three binding conditions, all derivable from F3: (a) every admin cross-client action resolves to a user PK and the audit row records actor role + resolved PK; (b) `400 TARGET_REQUIRED` kills null-target writes; (c) admin UI shows an explicit target banner echoing alias+PK from F1 receipts. Fail any condition → restrict the resolver.
- **Mount order `routes.mjs:630-634`: AGREE, not a defect** — specific-before-prefix is required Express practice and is load-bearing for F7 as argued above.

## C. New findings (the DISPUTE cargo)

**F12 = MAJOR — schema truth: zero FK/ON DELETE evidence on the two truth tables.**
WHERE: `backend/models/AiConversation.mjs:24-83` (`userId`, `targetUserId`); `backend/models/AiCommandAuditLog.mjs:24-83` (actor, resolved target).
CLAIM: The packet presents both models as field lists with no referential-integrity or deletion semantics. User deletion can orphan conversations and either strand or cascade-erase the audit trail — the exact artifact AC2 designates "observable, recoverable." This item is in RUNNING STATE; the candidate dropped it without a REJECT.
FIX (single migration **co-landed with F1** — same table, one ALTER pass):
- `ai_command_audit_logs`: `FK actor → users.id ON DELETE RESTRICT`; `FK target_user → users.id ON DELETE RESTRICT` (the trail must survive user deletion); plus F1's `UNIQUE(action_id)` and F13's column.
- `ai_conversations`: `userId` per retention ruling (CASCADE or archive); `targetUserId → users.id ON DELETE RESTRICT` with an explicit `status='target_deleted'` transition — deliberately **not** `SET NULL`, because F3 forbids minting ambiguous null targets on read.
- Pre-merge probe: `SHOW CREATE TABLE ai_conversations, ai_command_audit_logs`; `PRAGMA foreign_key_list(...)`. If FKs already exist, F12 collapses to NOTE and the migration carries only F1/F13.

**F13 = MINOR — redaction defeats recoverability.**
WHERE: `AiCommandAuditLog.mjs:24-91` — packet: "parameter hash/redaction."
CLAIM: A hashed/redacted parameter set cannot reconstruct or compensate a wrong-client mutation; AC2's "recoverable" leg has no data path.
FIX: F1's receipt contract gains `reversal_payload` (encrypted pre-image or compensating-action descriptor per operation family; null on denial rows per F2). Verification matrix gains a round-trip test: mutate → decrypt payload → compensate → verify.

## D. Drop-in amendment for round 10

```
FIX BEFORE BUILD: F1 (+F1b: co-migration on AiCommandAuditLog.mjs L24-91 & AiConversation.mjs L24-83 —
FK actor/target→users ON DELETE RESTRICT preserving the audit trail; conversations targetUserId RESTRICT
with status='target_deleted' transition, never SET NULL; probe SHOW CREATE/PRAGMA before merge),
F13 (reversal_payload encrypted pre-image/compensating descriptor in the F1 receipt — hashed params
cannot satisfy AC2 'recoverable'), [F2, F3, F5, F6 unchanged].
RESIDUAL RISKS: + F12/F13 are absence-based: probe schema first; collapse to NOTE if FKs already declared.
```

Slice ordering delta: the schema migration precedes or lands with F1's executor changes — never after.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F12=MAJOR: backend/models/AiConversation.mjs L24-83 + AiCommandAuditLog.mjs L24-91: zero FK/ON DELETE evidence on userId/targetUserId/actor/resolved-target references — user deletion orphans conversations or strands/erases the audit trail, breaking AC2 observable+recoverable; restore the running-state item the candidate silently dropped; fix = co-migration with F1 (RESTRICT on audit targets, status='target_deleted' for conversations, never SET NULL) | F13=MINOR: AiCommandAuditLog.mjs L24-91: parameter hash/redaction removes reversal data — AC2 'recoverable' has no data path; add encrypted reversal_payload to the F1 receipt contract
rebuttals: F1=AGREE: 'no action_id or unique idempotency key' is packet-verbatim | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE: middleware asymmetry verified at aiChatRoutes L466 vs coachIntakeRoutes L23-25/coachProposalRoutes L15-16 | F6=AGREE | F7=AGREE: fall-through to /api/ai-chat prefix makes method-wide 404 a correctness need | F8=AGREE | F9=AGREE | F10=AGREE | F11=AGREE | admin-scope=ACCEPT with 3 binding conditions (PK-resolved + audited, TARGET_REQUIRED, target banner) | mount-order=AGREE not a defect
open: Q1=round 10 must merge F12/F13 via the supplied drop-in language | Q2=seats to confirm the 3-condition admin-scope ruling or restrict clientResolver.mjs L110-166 | Q3=assign owner for the pre-merge schema probe (SHOW CREATE/PRAGMA) before the F1 migration
=== END-VERDICT ===
