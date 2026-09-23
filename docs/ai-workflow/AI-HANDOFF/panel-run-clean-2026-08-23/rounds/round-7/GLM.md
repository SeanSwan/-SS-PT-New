# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\rounds\round-7\REVIEW-DOC.md
**Tokens:** 6121 in / 17535 out (reasoning: 14873) | total 23656
**Wall:** 205.4s

---

# GLM 5.3 — Round 7: Full-Spectrum Pass (correctness · security · schema truth · 8 criteria line-by-line)

## A. Candidate verdict in one line

Nine fixes adopted verbatim (F1, F2, F5, F6, F7, F8, F9, F10, F11), both accepted-as-intentional items under their stated conditions, and the residual-risk block. Two REJECTs (F3, F4 — both are contract bugs in the fix *text* that would ship real defects) and one new MAJOR (F12) plus three supporting findings (F13–F15). Status: **DISPUTE**.

## B. REJECTS

### REJECT F3 as written — "server-reject null targets with 400 TARGET_REQUIRED"

Unscoped, this bricks the canonical client surface on landing day. Both sides citable:

- `aiChatRoutes.mjs:308-344` — conversation creation "accepts `targetUserId` for admin/trainer"; the client path is **null-target by design**.
- `AITerminalPanel.tsx:116-139` — the shared terminal sends `clientId || null`; client mode is a normal-null producer, not an edge case.
- `UniversalDashboardLayout.routes.tsx:203` — `/dashboard/client/coach-assistant` mounts the same canonical `CoachCommandCenterPage`; client self-service is first-class.

**Amended contract (apply verbatim):**
- Admin/trainer lanes (`aiChatRoutes.mjs:308-344`, `aiCommandRoutes.mjs:111-145`): explicit target required; unresolved null → `400 TARGET_REQUIRED`.
- Client lane: server resolves target = authenticated user PK; any supplied non-self target → `403 TARGET_MISMATCH`. Never 400 on null.
- Receipts echo alias + resolved user PK — unchanged from candidate.

### REJECT F4 as written — "UI states queued/sending/verified only"

The packet's own Jarvis-behavior spec requires the UI to "distinguish … queued/offline intents, confirmed writes, and **failed/cancelled actions**." A state machine without `failed`/`cancelled`/`superseded` renders a dropped write as forever-sending or fake-verified — a direct constraint-4 violation. **Amended vocabulary:** `queued | sending | verified | failed | cancelled | superseded` (superseded fires when reconcile finds the actionId already applied). The bridge boolean at `aiWorkoutEvents.ts:121-128` may only ever render as queued/dispatched — the packet itself forbids reading it as write proof.

## C. New findings

### F12 — MAJOR — cross-lane receipt schism: constraint 3 gets zero or two truths

Evidence triangle, all from the packet's own field lists:
- `AiCommandAuditLog.mjs:24-91` — actor/role/resolved target/operation ID/outcome/error/param-hash/duration; **no actionId, no conversationId, no proposalId** (packet states the idempotency absence explicitly).
- `coachProposalRoutes.mjs:30-54` — proposals lane has its own claim-pending + apply path and (per F6) its own durable applied/failed receipt.
- `AiConversation.mjs:24-83` — conversation model carries no action linkage; chat memory cannot point at the receipt that superseded it.

**Claim:** one user intent traversing chat → proposal approval → mutation can mint **two** authoritative receipts (command lane + proposals lane) or **none**, with no join key to dedupe. Constraint 3 ("verified server state and durable action receipts are truth") fails with two candidate truths.

**Fix — WHAT/WHERE/HOW:** one actionId per user intent, one receipt authority per action. WHERE: `AiCommandAuditLog.mjs:24-91` (+`actionId UNIQUE NOT NULL`, +`conversationId` nullable, +`proposalId` nullable); `AiConversation.mjs:24-83` (metadata.actionId); `coachProposalRoutes.mjs:30-54` (persist actionId on the proposal row; apply receipt references it); `useCoachCommand.ts:96,170,207` (client-minted actionId on execute/confirm/cancel). HOW: actionId minted once at intent creation in the UI; the mutating lane alone writes the authoritative receipt, every other lane links; F4 reconcile joins on actionId. Depends on F1 landing first; F6's receipt must reference the same actionId or it becomes a second truth.

### F13 — MINOR — criterion 6 scope hole: the manual logger has zero artifacts

Constraint 6 protects "core workout facts" logging, not AI intents. F4's IndexedDB queue covers AI intents only. The packet's sole workout-logger evidence is the browser event bridge (`aiWorkoutEvents.ts:121-128`), which the packet itself classifies as not-durable-write-proof. **Fix:** blueprint offline slice adds a manual-logger persistence probe; acceptance: gym-floor capture survives reload/offline and reconciles exactly-once, independent of AI lanes.

### F14 — NOTE — stale-role attribution

`AiConversation.mjs:24-83` persists `role` on the conversation; role changes leave historical rows carrying the old role. Audit attribution must read role-at-execution from the audit row (`AiCommandAuditLog.mjs:24-91`), never the conversation snapshot. One sentence in the F1 receipt spec.

### F15 — NOTE — F1 implementation guard

`AiCommandAuditLog.mjs:24-91` already has an "operation ID." It is taxonomy, not idempotency. The F1 unique index goes on the client-minted actionId only; unique-indexing operationId would reject legitimate repeated operations (same op type, different intents).

## D. The eight acceptance criteria, line by line

| # | Packet anchors | Ruled by | Residual |
|---|---|---|---|
| 1 least-privilege | `aiChatRoutes.mjs:283,466,610-625`; `coachIntakeRoutes.mjs:23-25`; `coachProposalRoutes.mjs:15-16`; `hermesRoutes.mjs:43,90,127,142`; `aiDebateRoutes.mjs:54` | lane middleware + F2 + F10 | Admin unbounded (`clientResolver.mjs:110-166`) **cannot be silently "intentional" against a non-negotiable constraint** — requires owner sign-off → Q1 |
| 2 wrong-client mutation | F3(amended) + F2 + F6 + F10; packet's own required cross-client probe matrix for `/api/ai-command` | unverifiable until fixes land (residual adopted) | live probe gate |
| 3 receipts = truth | F1 + F6 + **F12(new)**; `aiWorkoutEvents.ts:121-128` explicitly not a receipt | F12 is the missing join | Q2 picks the minting lane |
| 4 UI honesty | F4(amended); bridge boolean renders queued/dispatched only | closed by amendment | — |
| 5 server-enforced roles | `CoachCommandCenterPage.tsx:34-43` role logic is presentation, not enforcement (constraint 5 forbids shell inference) | F2 registry | Hermes/debate classification open (Q4) |
| 6 offline | F4 + **F13(new)** | F13 closes the logger artifact gap | probe required |
| 7 standards/44px/WCAG | zero artifacts (residual adopted) | blueprint verification matrix | F11 migrated tests must assert tokenized styles + 44px hit targets on `CoachCommandCenterPage`, else criterion 7 has no gate at slice time |
| 8 Ox Alpha canary | packet redacted by construction; holds on inspection | process control | re-run redaction gate at every packet refresh |

**F8 widened:** the header claim "routes into workout logger/planner context" has no line evidence either — cite-or-strike applies to it alongside "review-gated writes."

## E. Open questions

Q1 owner ruling on admin unbounded scope vs constraint 1 (signed policy exception or narrowing). Q2 which lane mints the single authoritative receipt for proposal-born actions — required to close F12. Q3 does client-role `/api/ai-command` execution exist, or is the client lane chat-only (scopes the amended F3). Q4 Hermes/debate classification, carried.

=== VERDICT ===
status: DISPUTE
confidence: 91
findings: F12=MAJOR: AiCommandAuditLog.mjs L24-91 + coachProposalRoutes.mjs L30-54 + AiConversation.mjs L24-83: no cross-lane actionId/correlation key; proposal-apply and command lanes can mint zero or two authoritative receipts — violates constraint 3 single-truth | F13=MINOR: constraint-6 gap — F4 queue covers AI intents only; manual workout-logger persistence has zero packet artifacts (sole logger evidence aiWorkoutEvents.ts L121-128, which packet says is not write proof) | F14=NOTE: AiConversation.mjs L24-83 persists role snapshot; attribution must use role-at-execution from audit row | F15=NOTE: AiCommandAuditLog.mjs L24-91 existing operation ID is taxonomy not idempotency; unique index only on client-minted actionId
rebuttals: F3=REJECT: unscoped '400 TARGET_REQUIRED' breaks canonical client surface (aiChatRoutes.mjs:308-344 accepts targetUserId only for admin/trainer; AITerminalPanel.tsx:116-139 sends clientId||null; UniversalDashboardLayout.routes.tsx:203 mounts client page) — role-scope it: admin/trainer 400 on unresolved null, client server-forces self + 403 on non-self | F4=REJECT: 'queued/sending/verified only' omits failed/cancelled/superseded required by packet Jarvis spec — silent-loss illusion violates constraint 4 | F1=AGREE | F2=AGREE | F5=AGREE | F6=AGREE (receipt must reference F12 actionId) | F7=AGREE | F8=AGREE (widen: also cite-or-strike 'routes into workout logger/planner context') | F9=AGREE | F10=AGREE | F11=AGREE (migrated tests assert tokens+44px for criterion 7) | admin-intentional=AGREE only conditional on Q1 owner sign-off
open: Q1=owner ruling: admin unbounded scope (clientResolver.mjs:110-166) vs non-negotiable constraint 1 — signed policy exception or narrowing | Q2=which lane mints the single authoritative receipt for proposal-born actions — required to close F12 | Q3=does client-role /api/ai-command execution exist or is client lane chat-only (scopes amended F3) | Q4=Hermes/debate classification (carried)
consensus_block: PROPOSED AMENDMENT (DISPUTE round) — adopt candidate verbatim with two edits + one addition. EDIT-1 (F3): role-scoped target contract — admin/trainer: explicit target required, 400 TARGET_REQUIRED on unresolved null; client: server resolves target=authenticated user PK, 403 TARGET_MISMATCH on any supplied non-self target; receipts echo alias+resolved user PK unchanged. EDIT-2 (F4): UI state vocabulary = queued|sending|verified|failed|cancelled|superseded; aiWorkoutEvents.ts:121-128 dispatch boolean renders only as queued/dispatched, never saved. ADD-F12: client-minted actionId per user intent; unique index on AiCommandAuditLog.mjs actionId (client UUID only, per F15); AiConversation.mjs metadata and coachProposalRoutes.mjs:30-54 proposal rows carry the same actionId; exactly one lane (the mutating lane) mints the authoritative receipt, all others link; F4 reconcile joins on actionId; depends on F1. ADD-F13: offline slice adds manual workout-logger persistence probe; acceptance: gym-floor capture survives reload/offline, reconcile exactly-once, independent of AI lanes. All other candidate items (F1,F2,F5,F6,F7,F8-widened,F9,F10,F11, accepted-as-intentional conditions, residual risks) carried unchanged.
=== END-VERDICT ===
