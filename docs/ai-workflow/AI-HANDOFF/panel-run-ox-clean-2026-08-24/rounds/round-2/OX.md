# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-2\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 6558 in / 4370 out · **Cost:** ~$0.0000 · **Wall:** 142.4s · **finish:** stop

---

# Ox Alpha — Round 2 — Fresh-Eyes Adversarial

## Stance application: the defect class the consensus structurally misses

The consensus candidate fixes **schema and UI plumbing**. The defect class it misses is **check-vs-effect ordering and key-trust boundaries**: every fix it proposes validates state *after* the dangerous operation has already run, or trusts a client-supplied value that the packet never proves is safe to trust. Three MAJORs below are all instances of that one class.

---

### F1 (MAJOR) — Consensus F1's fix enforces idempotency at the wrong point in time
**Claim:** Adding `commandIdemKey UUID NOT NULL UNIQUE` to `backend/models/AiCommandAuditLog.mjs:24-91` does **not** satisfy acceptance criterion (1) "duplicate command submission returns original receipt." The audit log is a post-hoc record (it stores outcome, error code, duration — i.e., it is written *after* execution). The packet contains **zero evidence of any pre-dispatch lookup** by an idempotency key: `aiCommandRoutes.mjs:110` shows only `protect`, lane kill switch, rate limit; `:111-145` shows normalization/resolution of `selectedClientId`; nothing between route entry and `commandExecutor.mjs:309-343` consults a dedupe store. Therefore the enforceable sequence today is: execute side effects → attempt audit insert → UNIQUE violation on retry. Result: **double mutation with a suppressed receipt** — strictly worse than the current behavior, because the retry now errors instead of logging. The DB constraint is necessary but must be paired with a pre-execution `SELECT … FOR UPDATE`/advisory-lock keyed on the idem key, returning the original receipt row on hit, all before `commandExecutor` is invoked.

### F2 (MAJOR) — Consensus F1's key design is spoofable across actors
**Claim:** A bare `UNIQUE(commandIdemKey)` with a **client-generated** key creates a cross-actor collision/replay vector: actor B can submit actor A's previously-used key with a different payload; the insert is rejected and A's legitimate retry is suppressed (or B's command rides A's receipt). The packet gives no evidence of per-actor namespacing (`AiCommandAuditLog.mjs:24-91` fields are actor, role, resolved target, operation ID, outcome — no composite-key concept). Required shape: `UNIQUE(actor_id, command_idem_key)`, plus a decision on whether the key is client-minted (then namespaced server-side) or server-minted on first submission and echoed back. Additionally `NOT NULL` requires an explicit backfill/default for existing rows — the packet's model excerpt shows no such column, so the migration contract is unstated.

### F3 (MAJOR) — Message-append authorization is unevidenced; cross-client conversation injection cannot be excluded
**Claim:** `frontend/src/hooks/useAIChat.ts:448` posts to `/api/ai-chat/conversations/${convId}/messages`. The packet evidences `protect` at `aiChatRoutes.mjs:283`, subscription/PII middleware at `:466`, and a trainer target-client check at `:610-625` — but the refresh table ties `:308-344` to conversation **creation** accepting `targetUserId`. No excerpt demonstrates an **ownership check on appending to an existing `convId`**. Per my remit (probe parameterization, do not assume safe): any authenticated user who learns or guesses a `convId` may be able to inject messages into another user's/trainer's conversation thread, poisoning the very "conversation memory" the owner constraints say is not domain truth but which feeds every downstream proposal. Classify MAJOR until the ownership middleware is produced.

### F4 (MINOR) — The packet contradicts itself on the governing mount-block lines
**Claim:** "Backend action-route mount order" cites `backend/core/routes.mjs:625-634`; the Evidence Gate Refresh table cites `routes.mjs:630-634` for the same mounts. Both excerpts show identical content, but one citation is wrong, and the packet's own rule set demands locatable evidence — an orchestrator cutting on line precision will cut one of the two governing excerpts arbitrarily. Fix: reconcile to the true file lines once and propagate.

### F5 (MINOR) — Unchecked cast plus boolean-only return makes the workout bridge unfalsifiable
**Claim:** `frontend/src/utils/aiWorkoutEvents.ts:121-128`: `dispatch(payload as AIEventPayload)` accepts any shape without validation, and the return value conflates "dispatcher exists and ran" with "payload was valid/actionable." A caller cannot distinguish handled-valid from handled-garbage, which directly undermines constraint #6's degraded-mode story: the offline queue will enqueue garbage indistinguishably from good intents.

### F6 (MINOR) — Header claim vs. packet's own evidence (rule 5)
**Claim:** The subject is titled "Swan Coach Unified Brain," a testable assertion; the packet's Surface Classification table states the four core lanes "**cannot be called 'one brain' until a shared boundary is proven**." The code evidence (separate mounts `routes.mjs:630-634`, separate models `AiConversation.mjs:24-83` vs `AiCommandAuditLog.mjs:24-91`, divergent contracts per the probe table) contradicts the title. Cite both sides: title asserts unity; classification table disproves it. The blueprint must either earn the name or rename the effort.

---

## On the consensus candidate

- **F1 (idem key): REJECT as specified** — see my F1/F2 above. Adopt the intent, replace the mechanism: composite unique `(actor_id, command_idem_key)`, pre-execution lookup before `commandExecutor.mjs:309-343`, original-receipt return on hit, stated backfill for `NOT NULL`.
- **F2 (AITerminalPanel L124-133 helper): AGREE** — the two branches at `AITerminalPanel.tsx:116-139` pass `'both', null, requestContext` positionally vs. omitting trailing args; a single helper object eliminates drift. Acceptance criterion (2) stands.
- **F3 (dormant APP-AI-HIVE-MIND.md): AGREE** — `docs/ai-workflow/references/APP-AI-HIVE-MIND.md:7-22` describes a Gemini/Qwen consensus that matches none of the six mounted lanes; DORMANT + link-out is correct. Acceptance criterion (3) stands.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F1=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91 + backend/routes/aiCommandRoutes.mjs L110-145: consensus idempotency fix enforces UNIQUE at insert time but no pre-dispatch lookup exists anywhere in packet — retries re-execute side effects via commandExecutor.mjs L309-343 then fail insert, causing double mutation with suppressed receipt | F2=MAJOR: backend/models/AiCommandAuditLog.mjs L24-91: bare UNIQUE(client-generated commandIdemKey) enables cross-actor key replay/suppression; requires UNIQUE(actor_id, command_idem_key) plus stated backfill for NOT NULL on a column the model does not currently have | F3=MAJOR: frontend/src/hooks/useAIChat.ts L448 + backend/routes/aiChatRoutes.mjs L283/L466/L610-625: message-append to /conversations/${convId}/messages has no evidenced ownership middleware (creation-time target check at L308-344/L610-625 does not cover append) — cross-client conversation injection cannot be excluded | F4=MINOR: backend/core/routes.mjs mount block cited as both L625-634 and L630-634 within the same packet — one citation is wrong, reconcile governing lines | F5=MINOR: frontend/src/utils/aiWorkoutEvents.ts L121-128: unchecked `payload as AIEventPayload` cast plus boolean-only return conflates handled-valid with handled-garbage, breaking degraded/offline queue integrity (constraint 6) | F6=MINOR: packet title asserts "Unified Brain" while Surface Classification table states lanes "cannot be called 'one brain' until a shared boundary is proven" — header claim contradicted by packet's own evidence (rule 5)
rebuttals: F1=REJECT: DB UNIQUE constraint fires after execution; without pre-execution keyed lookup the fix produces double-mutation-plus-error, failing its own acceptance criterion (1) | F2=AGREE | F3=AGREE
open: Q1=who owns the pre-execution idempotency check — route layer (aiCommandRoutes.mjs) vs executor entry (commandExecutor.mjs) — and what locks it | Q2=produce the convId-append ownership middleware excerpt or confirm absence and classify as must-fix-before-build | Q3=retirement decision for SwanCoachAssistantPage and whether any surviving hook still posts to legacy endpoints (dual-write divergence)
consensus_block: REQUIRED when status is CONSENSUS — N/A for DISPUTE; disputed amendments: (a) replace consensus F1 mechanism with composite UNIQUE(actor_id, command_idem_key) + pre-execution lookup returning original receipt before commandExecutor.mjs L309-343 runs, with explicit backfill plan for NOT NULL; (b) keep consensus F2 and F3 verbatim; (c) add F3/F5/F6 to must-fix/probe list before slice 1.
=== END-VERDICT ===
