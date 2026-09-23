# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-1\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 8082 in / 10831 out · **Cost:** ~$0.0810 · **Wall:** 171.8s · **finish:** stop

---

The consensus candidate is **not adoptable verbatim**. The packet’s own evidence-gate refresh already falsifies three locators the candidate still ships as engineer-applicable fixes, and the conversation-scope state machine is a distinct wrong-client defect the candidate never names.

**REJECT F2 line map + “mounts unexcerpted”.** Candidate F2 tells an implementer to probe `/api/ai-chat` at `routes.mjs:626`, `/api/ai-command` at `:627`, spike at `:625`, Hermes at `:632`, debate at `:633`, and treats intake/proposals as unexcerpted. The packet contradicts itself and the candidate:

- First excerpt header: `backend/core/routes.mjs:625-634` with five consecutive `app.use` calls (spike → chat → command → hermes → debate). Consecutive-from-625 would be `:625/:626/:627/:628/:629`, not `:632/:633`.
- Evidence-gate refresh (authoritative later table): the same block is `routes.mjs:630-634`, spike mount `:630`, intake `:378`, proposals `:379`. Consecutive-from-630 is `:630/:631/:632/:633/:634`.
- Intake/proposals are **not** unexcerpted: `coachIntakeRoutes.mjs:23-25` (`protect` + admin/trainer + JSON limit) and `coachProposalRoutes.mjs:15-16` / `:30-54` (approval + `ensureClientAccess` + pending-row claim).

Shipping F2 with those line numbers breaks rule 1/6. Finding stands; locator must be the evidence-gate table, verified against the file, not the 625-based guess.

**REJECT F3 as frontend-only.** Replacing `clientId || null` in `AITerminalPanel.tsx:116-139` does not close constraint 2. Server excerpts already accept caller-claimed targets:

- `aiChatRoutes.mjs:308-344` — conversation create accepts `targetUserId` for admin/trainer.
- `aiCommandRoutes.mjs:111-145` — accepts `selectedClientId`.
- `commandExecutor.mjs:309-343` — resolves those selected IDs.
- `clientResolver.mjs:110-166` — scopes trainers, **not admins beyond role**.
- `aiDebateRoutes.mjs:57-76` — accepts/resolves `clientId`.

An admin token plus an arbitrary UUID is an any-client write under the static result already recorded. Fix must bind **every** write path to a server-resolved permitted-client set; receipts never echo the client-claimed id.

**REJECT F4’s “packet has zero schema”.** We have schema: `backend/models/AiCommandAuditLog.mjs:24-91` records actor, role, resolved target, operation ID, outcome, error code, parameter hash, duration — and **no** `action_id` and **no** unique `idempotency_key`. That is a proven UNIQUE-constraint hole, not a probe-for-absence. Retries, double-confirm (`useCoachCommand.ts:96,170,207` execute/confirm/cancel), and any future offline queue (residual C6) will duplicate applies until the table grows a real unique key. `dispatchAIWorkoutEvent` (`aiWorkoutEvents.ts:121-128`) remaining a boolean is still correctly banned as a success signal.

**NEW MAJOR F13 — conversation identity is not client-immutable.** `AiConversation.mjs:24-83` stores `userId`, `role`, `context`, `targetUserId`, `messages` on one row. `useAIChat.ts:217,425,448` creates a conversation then posts messages. `AITerminalPanel.tsx:116-139` sends a **per-message** `clientId` into that hook, with two different call arities (`'both'` + `requestContext` vs 4-arg default). No excerpted invariant keys an open conversation to one resolved target, and no excerpted reject fires when body clientId ≠ `conversation.targetUserId`. Rapid client switch / stale tab (F6) / reused conversation is a cross-client memory contamination cycle: messages for B land on a row whose `targetUserId` is A; a later command that trusts conversation scope mutates A. That is constraint 2 + 3, and it is not “probe memory→domain write.”

**AGREE** F5 (spike is fail-closed / `adminOnly` / no DB write per `aiStreamSpikeRoutes` — still flag + kill switch before product use), F6 (`useState` initializer at `CoachCommandCenterPage.tsx:34-43` runs once; role or `searchParams` change leaves a stale tab — re-coerce, but only when `userRole` changes or a *forcing* query param is present; do not clobber manual tab on unrelated searchParams identity), F7/F8/F9/F12 as excerpt/probe work, N1 (registry must also be a `Map` or `Object.create(null)` — `dispatchers[eventName]` on a plain object treats `constructor` as a function), N2/N3 (single explicit persistence mode; `'both'` is undefined and dangerous until the signature is excerpted). F10/F11 stay struck. C7/C8 stay as stated.

No SQLi finding: zero query text in packet. Parameterization of `targetUserId` / `selectedClientId` / `clientId` is a required probe, not a cited injection.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F2=MAJOR: backend/core/routes.mjs L630-634+L378-379: entitlement probe/block still required on every write router, but candidate line map is wrong | F3=MAJOR: AITerminalPanel.tsx L116-139 + aiChatRoutes.mjs L308-344 + aiCommandRoutes.mjs L111-145 + clientResolver.mjs L110-166: caller-claimed target IDs accepted; admin unscope is a static result | F4=MAJOR: AiCommandAuditLog.mjs L24-91 + aiWorkoutEvents.ts L121-128: no action_id/UNIQUE idempotency_key; boolean dispatch must never map to UI success | F5=MAJOR: routes.mjs stream-spike mount + aiStreamSpikeRoutes fail-closed/adminOnly: probe auth parity; flag+kill switch before enable | F6=MINOR: CoachCommandCenterPage.tsx L34-43: activeTab useState init-only; stale tab after role/searchParams change | F13=MAJOR: AiConversation.mjs L24-83 + useAIChat.ts L217,425,448 + AITerminalPanel.tsx L116-139: conversation row not immutable-scoped to one targetUserId; per-message clientId can contaminate another client's memory/actions | N1=NOTE: aiWorkoutEvents.ts L121-128: capability-token + schema + provenance + result enum; registry must be Map/null-prototype | N2=NOTE: AITerminalPanel.tsx L116-139: two send arities ('both'+requestContext vs 4-arg default) is an undefined persistence state machine | N5=NOTE: no SQL text excerpted; probe parameterized queries on targetUserId/selectedClientId/clientId
rebuttals: F2=REJECT: candidate cites routes.mjs:625/626/627/632/633 and 'intake/proposals unexcerpted'; evidence-gate puts spike at :630, block at :630-634, intake :378, proposals :379 with handler excerpts — consecutive-from-625 also cannot yield hermes:632 | F3=REJECT: frontend clientId swap does not close server acceptance of targetUserId/selectedClientId or admin unscope at clientResolver.mjs:110-166 | F4=REJECT: 'packet has zero schema' is false; AiCommandAuditLog.mjs:24-91 proves UNIQUE idempotency_key is absent — ADD constraint, do not probe for existence | F5=AGREE | F6=AGREE | F7=AGREE | F8=AGREE | F9=AGREE | F12=AGREE | N1=AGREE | N2=AGREE | N3=AGREE | F10=AGREE-STRUCK | F11=AGREE-STRUCK
open: Q1=other seats: adopt evidence-gate locators as the only F2 line table? Q2=is F13 absorbed into F3 or kept as its own conversation-identity invariant + FK/unique on (userId,targetUserId,context)? Q3=F6 effect deps: userRole + forcing-param only, or raw searchParams? Q4=proposal claim UPDATE-WHERE-pending (coachProposalRoutes.mjs:30-54) — excerpt the SQL/locking or leave as probe?
consensus_block: N/A — DISPUTE. Corrected ruling if promoted: FIX F2 using evidence-gate mounts only (/api/ai-chat/stream-spike routes.mjs:630, /api/ai-chat+/api/ai-command+/api/hermes+/api/ai/debate in :630-634, /api/coach/intake :378, /api/coach/proposals :379); BLOCK write capability on any router that fails live entitlement probe. FIX F3 at every caller-claimed id site listed above; receipts bind server-resolved client_id; admin must still resolve through permitted-client set. FIX F4 by adding action_id + UNIQUE idempotency_key on AiCommandAuditLog (or successor receipt table); UI success only on receipt; dispatch boolean never equals saved. FIX F5 flag+kill switch. FIX F6 re-coerce activeTab on userRole or route-forced tab only. FIX F13: conversation identity includes server-resolved targetUserId; switch client => switch/resume conversation; reject message/command when body target ≠ row targetUserId; add DB invariant (FK to users + uniqueness of active conversation per user/target/context). N1/N2/N3 as candidate plus Map/null-proto registry and one explicit persistence mode. F7/F8/F9/F12 excerpts into package item 2. ACCEPTED: F10/F11 struck; C7/C8 as candidate. RESIDUAL: (a) F2/F3 ceilings until probes; (b) C6 offline has no queue code and is unsafe until F4 UNIQUE exists; (c) C8 unverified; (d) F1 artifact identity; (e) unauthenticated in-page dispatcher until N1; (f) unexcerpted proposal-claim race; (g) unexcerpted SQL parameterization.
=== END-VERDICT ===
