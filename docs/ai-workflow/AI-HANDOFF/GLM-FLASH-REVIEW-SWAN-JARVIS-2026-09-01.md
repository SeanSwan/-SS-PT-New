# HOSTILE REVIEW PACKET — Swan Coach Brain ("Jarvis and beyond") — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/92a4dea8-4074-4f1c-8888-da2d80f87efb/scratchpad/glm-packet-full-v2.md
**Tokens:** 39757 in / 21982 out (reasoning: 15271) | total 61739
**Wall:** 735.1s

---

# PART 1 — HOSTILE REVIEW OF THE CURRENT BRAIN (new findings, continuing F-numbering)

## F18 · P0 · LIVE (exploitability [INFERENCE]) · The confirm lane's authority was checked at mint time, and possibly never again

The `/execute` pipeline runs 11 steps including stepRBAC, stepWriteKillSwitch, and stepResolveClient. The `/confirm` route (aiCommandRoutes.mjs:365-385) passes **only `operationId` and `req.user`** to `executeConfirmedOperation` (aiCommandRoutes.mjs:376). Inside `destructiveOperations.mjs`, verification checks exactly three things: existence (L144), expiry (L149), ownership (`operation.createdBy !== userId`, L155), and HMAC (L166). It does **not** re-check the actor's current role, current assignment to the target client, or the write kill switch.

Three concrete windows, all bounded by the 120s TTL but all real:

1. **Role TOCTOU** — trainer mints `deactivate_client`, admin demotes them, trainer confirms. If `executeConfirmedOperation` doesn't re-run stepRBAC, a revoked actor executes a trainer-only write.
2. **Assignment TOCTOU** — trainer unassigned from client mid-window; confirm executes on a now-unassigned client. This is the repo's #1 defect class (cross-client identity) wearing a confirmation costume: the confirm is properly actor-bound but possibly not *scope*-bound at execution time.
3. **Kill-switch bypass** — `AI_COMMAND_WRITES_ENABLED=false` is enforced in the pipeline (`stepWriteKillSwitch`, commandLaneControls.mjs:11-13). If the confirm path dispatches directly without re-entering the pipeline, the write kill switch stops *new* destructive commands but not *already-minted* ones. The lane-pause switch (`aiCommandLaneKillSwitch` IS on the confirm route, L365) partially covers this — but the write-level switch is the one ops reaches for during an incident.

The HMAC at L39 covers `createdBy` — it binds the op to its creator, not the creator to their *current* authority. Those are different claims.

[INFERENCE] on items 1–3: the packet does not include `executeConfirmedOperation`'s body. Verify: `grep -n "executeConfirmedOperation" -A 80 backend/services/ai/commandExecutor.mjs` and confirm whether it re-enters stepRBAC/stepWriteKillSwitch/`assertAssignmentOrAdmin` or dispatches frozen params straight to `DISPATCHERS`. If it re-checks nothing, this is P0 and joins the standing P0 as its second half: **deploy/restart voids approvals (known), and anything that *doesn't* void them may execute under stale authority (this)**.

## F19 · P1 · LATENT · The cross-client alarm is unreachable by construction — two modules quietly guarantee it never fires

`resolveCommandClientId` (clientScope.mjs:12-14) collapses params→ctx *before* anything downstream sees both candidates: `ctx.resolvedClient?.id ?? params.clientId`. So by the time stepConfirmation mints an op, there is only **one** client id in the world.

Now look at `voiceConfirmationTier.mjs:113-120`: the `cross_client` deliberate trigger requires *both* `lockedClientId` and `targetClientId` to be non-null **and different**. If the tier is ever computed from post-collapse values — which is the only natural wiring, since the collapse already happened — the mismatch case ("cancel Jordan's session" while Kayla is locked) is *incapable of being detected*, because Jordan was silently discarded upstream. The tier contract's most important escalation is dead code the day it's wired, and nobody will notice because the tests will pass two identical ids.

The frontend mirrors the same blind spot symmetrically: `intentBarState.ts:96` defines `unresolvedClient` as both-null; the **locked=null + target=B** case gets `chipTone: 'unlocked'` (L100) — the quiet "nothing selected" tone — while `effectiveClientId` (L113-115) silently returns B. The file's own doctrine (L95: "surface it, never default it"; L108-111: "when they disagree the UI must have already escalated") is only half-implemented: *disagreement with nothing locked* produces no alarm state at all. The operator sees a neutral chip while a specific record is targeted.

Fix shape: `resolveCommandClientId` must return **both** candidates with a `collapsedFrom` marker; the tier check and the chip consume the *pre-collapse* pair; only then collapse. Wire nothing through `voiceConfirmationTier` until this lands, or C3's headline guarantee is theater.

Verify: `grep -rn "resolveVoiceConfirmationTier\|resolveCommandClientId" backend/services/ai --include=*.mjs | grep -v test` (expect: zero tier callers — dormant, per F9 — and the collapse as described).

## F20 · P1 · LATENT · `role_not_permitted` escalates to *deliberate* instead of *refusal* — confirmation is not authorization

voiceConfirmationTier.mjs:131-135: when the actor's role isn't in `roleRequired`, the tier escalates to DELIBERATE — "requires an explicit spoken yes" (L29-30). That's a category error. A client who says "delete the workout" must not be walked into a confirmation flow for a command they are forbidden to run; the correct output is a refusal, full stop. The house law (clients read + do, never decide) makes this auto-reject-class: as specified, the C3 contract turns an authorization failure into a *negotiation*, and ConfirmationSheet (P1.1) will happily render "Say yes to cancel the session" at a client — teaching every actor that gates are persuadable. The tier order needs a rank above DELIBERATE: `refusal`, with reason codes. See Part 3, Mechanism 3.

## F21 · P1 · LIVE seam, exploitability [INFERENCE] · `AI_SUBMIT_WORKOUT` is an auto-commit path while its review UI is flag-dark

`aiWorkoutEvents.ts` dispatches `AI_SUBMIT_WORKOUT` (L25, L150-152) as an ordinary ack-contract event; the backend's FRONTEND_DISPATCH escape (aiCommandRoutes.mjs:277-289) serves it with no confirmation as long as `requiresConfirmation` is falsy. If the registry marks `submit_workout` (or its equivalents) FRONTEND_DISPATCH/non-confirming, then voice → classifier → window event → **training record committed**, with no review step — and the component built to be that review step (ReviewDecodedWorkout) is dark behind VOICE_MODE_V2. That violates "nothing auto-commits" on the highest-frequency write in the product. Verify: `grep -rn "submit_workout\|AI_SUBMIT_WORKOUT" backend/services/ai/commandRegistry/` — check `method` and `requiresConfirmation` on every hit. If any hit is non-confirming, this is P1 today, not latent.

## F22 · P2 · LIVE · `/cancel` bypasses the kill switch and the rate limiter

Compare guards: `/execute` L154 (`protect, aiCommandLaneKillSwitch, aiCommandRateLimiter`), `/confirm` L365 (same), `/cancel` L389 — **`protect` only**. Consequences: (a) when the lane is paused for an incident, cancels still mutate pending-op state and the response text ("Operation not found or already expired") still leaks op-state behavior; (b) no rate limit on an authenticated endpoint whose failed attempts are **unaudited** (recordCommandAudit fires only on `cancelled === true`, L398-406) — probing is invisible. No existence oracle exists (ownership failure and not-found return identically, L279), which is correct — but wrap it in the same guards anyway. A kill switch that doesn't kill the whole lane is a footnote waiting to become an incident.

## F23 · P2 · LIVE · The kill switches disable only on the exact lowercase string `'false'`

commandLaneControls.mjs:20 and :30 — `!== 'false'`. The file's own comment celebrates that a typo can never cause an outage; the inverted property is that a typo can never *stop* one. `False`, `FALSE`, `' false '`, `0` all leave the lane hot. During an incident, the operator who types `AI_COMMAND_WRITES_ENABLED=False` into Render gets silence instead of a pause. For a kill switch, availability-of-disable dominates. Parse case-insensitively with trim, log a startup warning on *any* recognized-but-noncanonical value, and add a `/health` field reporting effective switch state so the `/health` endpoint (L468-477, which currently doesn't check the switches either) tells the truth during an incident.

## F24 · P1 · LATENT (goes LIVE at P0.2) · The per-user pending cap is an O(n) Map scan that the Redis migration will silently kill

`getPendingCount` (destructiveOperations.mjs:291-299) iterates the in-memory Map, filtering by expiry. It enforces the 5-pending cap at L87-91 and L199-203 *and* backs `/health` (aiCommandRoutes.mjs:474). The S2 plan ("move pendingOps to ioredis, atomic GETDEL") is a key-value transplant; nothing in it naturally reproduces a per-user *count with expiry filtering*. If the port is naive, the cap stops binding — which removes both the memory-exhaustion guard and one of the few friction points against mint-spam. This must be an explicit acceptance criterion on P0.2, not a discovered regression. Also: the ioredis client in session.mjs is the **session** store client — sharing one Redis for sessions and approvals couples failure domains; require a logical DB index (or separate URL) and an alert on approval-store errors. Verify branch state: `git diff origin/main...claude/jarvis-audit-correction-20260821 -- backend/services/ai | grep -n "MAX_PENDING\|getPendingCount"`.

## F25 · P2 · LIVE · DELETE got a scope law; UPDATE/DEACTIVATE/LOCK got nothing, and the blast-radius cap counts metadata

The explicit-scope requirement (L69-77) applies to `type === 'DELETE'` only. An unscoped `UPDATE` or `DEACTIVATE` — `params: {}` — passes prepare without comment. The bulk cap (L80-84) measures `affectedRecords.length`, which is **caller-supplied preview metadata**, not a property of the endpoint's semantics; and nothing at execute time reconciles `affectedCount` against actual rows affected. A receipt that says "Would affect 0" while the endpoint touches 40 is worse than no receipt. [INFERENCE] that `executeConfirmedOperation` doesn't reconcile (the packet doesn't include it): verify with the F18 command, looking for any comparison of the handler's result count to `operation.affectedCount`. Fix: require scope for every destructive type, and make the executor's receipt carry the *real* count.

## F26 · P2 · LIVE · Confirmation is consumed before the outcome exists — the module trains confirm-fast behavior

`verifyAndRetrieveOperation` deletes the op at L180 **before** the caller executes it (retrievePendingConfirmation likewise, L265). A transient failure downstream burns the user's confirmation; the only recovery is full re-issue — against a 10/min command rate limit and a 120s TTL, from a card that has already flipped to "Re-issue command." Combined with F14 (docks can't confirm at all) and the two-tap arming gate (confirmState.ts:71-78, 3s window), the system's actual lesson to users is: *confirm quickly and hope*. That is habituation engineering. Single-use consumption is correct for replay-safety — keep it — but the failure path must return a structured `expired_burned` receipt with a one-tap re-mint carrying the original frozen params (they're signed; reuse them), not a fresh conversational round-trip.

## F27 · P2 · LIVE · The day-brief degrades by omission — the pain flag can vanish silently mid-session

`buildTrainerDayContext` batch queries swallow failures with `.catch(() => [])` (coachContextEngine.mjs:277-291) and return **no dataQuality** (L319) — unlike `buildCoachContext`, which returns it (L230). If the pain query fails, "active pain" flags silently disappear from the exact surface a trainer glances at between sets. Also `LIMIT 20` (L265) truncates with no "and N more" marker. A brief that can't say "I could not load pain data" will one day be the brief that didn't mention a pain flare. Port the dataQuality discipline; render degraded domains as explicit absence, per the intakeCoverage pattern.

## F28 · P2 · LIVE ([INFERENCE] on the exact failure mode) · The dock's chat-fallback branch may be dead code, and its Send button can eat input silently

The dock checks `result.type === 'fallback_to_chat'` (useSurfaceCoachDock.ts:153), but the route returns `type: 'chat'` with `fallbackToChat: true` (aiCommandRoutes.mjs:252-263). Unless `useCoachCommand` normalizes — verify: `grep -n "fallback_to_chat" frontend/src/hooks/useCoachCommand.ts` — that branch never runs, and a successful chat fallback falls through to L170-172: `pushReceipt({ ok: false, text: result.message })` where `message` is `null` for plain chat intents (L257). Net: the coach *answered*, and the dock renders an empty failure row. Separately: `handleSubmit` returns silently when `requireClient && selectedClientId == null` (L134) — Send does nothing, no receipt, no aria-live — and `setVoiceError` is deliberately voided (L100-103), so transient recognition failures are invisible. Three small lies in the module whose entire job is truthful receipts.

## F29 · P2 · LIVE · `ctx.user` carries `firstName`/`lastName` into the pipeline — confirm nothing serializes them into prompts

aiCommandRoutes.mjs:192-197 constructs the actor with names attached. The pipeline is disciplined about *client* PII; the actor's own name is lower-risk but the house law is zero-PII, IDs only. [INFERENCE] that no prompt consumes them — verify: `grep -rn "firstName\|lastName" backend/services/ai --include=*.mjs | grep -v test | grep -iv "deIdentify\|sanitize"`. If debate routing or classifier prompts embed `user.firstName`, that's a law violation with a one-line fix; if nothing does, the names are still a loaded gun for the P2.5.1 consolidation.

## F30 · P2 · LIVE · `previousContext` is instruction-shaped frontend-controlled text entering the classifier prompt

aiCommandRoutes.mjs:74-85 caps it at 2000 chars and runs the identity sanitizer — which strips client identity, **not instruction-shaped content**. The planner's structural snapshot is the intended payload; a crafted string is a prompt-injection lane into intent classification. Mitigation is real: the classifier's output then passes the full 11-step pipeline, so an injected intent is still bound by stepRBAC/stepResolveClient — this lane can misdirect *within the actor's own authority*, not escape it. Still: fence it (delimit + "data, not instructions" framing) when P2.5.3 builds the delimiting stage; do the same for `goals.title` **and `goals.description`** (coachContextEngine.mjs:89 — F8 named the title; the description flows raw too).

## F31 · P1 · LIVE ([INFERENCE] on policy contents) · The `not_wired → chat` fallback hands refused commands to the one lane with no receipt discipline

The `not_wired` receipt pattern exists so no command can fake execution (commandDispatcher.mjs:12-15) — and then aiCommandRoutes.mjs:290-299 routes selected not-wired intents into the chat lane, which has no confirmation infrastructure, no `not_wired` concept, and a ~890-line context monolith. If `commandFallbackPolicy.mjs` admits any write-adjacent type, the user gets conversational improv where the design promised an honest refusal. Verify: `cat backend/services/ai/commandFallbackPolicy.mjs`. This is S5's honest catalog problem alive on main, not just stranded.

---

**Status of round-1 findings:** F1–F7, F9–F17 confirmed against source; F8 **extended** (description field, coachContextEngine.mjs:89) and its correction accepted (deterministic brief today, injection lane at P2.5.3 — the delimiting stage must land *in* P2.5.3, not after). F3 **extended**: there are not two context assemblies but **three** — `enrichWithUserData` (chat), `coachContextEngine` (2 commands), and `buildCommandContextEnvelope` (command lane, aiCommandRoutes.mjs:212-226, with its own authz via `assertAssignmentOrAdmin`, L225). Three authorization models for overlapping data. The consolidation slice must name all three.

---

# PART 2 — ATTACK ON THE UPGRADE PLAN

**1. P0.4 flips PLANNER_IA_V2 while the contraindication screen is dark (P3.4 comes later).** The state map says the plan_edit referee's `contraindicated` verdict is reserved and NASM-CES/pain screening is unwired. The plan flips the planner IA in week one-ish and wires its safety screen in Phase 3. That is "ship the effector, backorder the guardrail." Reorder: P3.4's referee wiring (it's a bounded slice: nasmCesPolicy + pain profile into an existing verdict slot) becomes a **precondition** of the PLANNER_IA_V2 flip, not a Phase 3 item.

**2. P0.4 flips VOICE_MODE_V2 before any tier consumer exists.** VOICE_MODE_V2 boots the voice pipeline with whatever confirmation dialect JarvisVoiceMode invented pre-C3 — exactly the per-surface drift `voiceConfirmationTier.mjs` was written to kill (its header says so, L7-12). Flip order must be: ConfirmationSheet (P1.1) → tier observe (P1.3) → tier enforce → *then* VOICE_MODE_V2. As drafted, the plan re-creates the four-registry problem at the interaction layer and then has to migrate it.

**3. The Coach Gate is born waived.** P0.1 lands S4a/S4b CI as a required check — against a `known-failing-baseline.json` that the state map says already fails on main. Day one is a choice: block everything, or normalize waivers. Refresh the baseline **in the same landing** as the gate or the gate's required-check status is fiction. Related: P0.3 (set the env key, flip branch protection) is hours of work with zero code risk and is inexplicably ordered *after* the multi-week rebase. It's step zero: setting `OPERATION_SIGNING_KEY` in Render alone kills the random-bytes half of the standing P0 today.

**4. Phase 2 (effector) precedes Phase 2.5 (context/consent/model truth).** The effector multiplies the blast radius of every upstream lie: it turns context errors into navigation, prefills, and panel-opens. Running it on a context layer with three authorization models (F3 extension), no consent parity (F7), and no delimiting stage (F8) is building the actuator before the spine. P2.5.3 + the F8 delimiting stage and P2.5.4 (consent — it's one middleware application, small) must land **before or with** P2.1. Also verify H6 actually survives the P0.1 rebase before P2.3 promises to "keep H6's safety gate" — the branch is ~250 commits behind; if S2/S11 re-derive instead of rebase, P2.3's premise needs a fallback statement the plan doesn't have.

**5. P3.1 (coach_facts read path) can outrun P3.2 (ack seam) and drink from a lying seam.** The known residual — an ATTEMPTED save acks true, then the server rejects, across 4 command families — is precisely the input coach_facts extraction would learn from. Order inside Phase 3 must be: ack seam fix → facts S2/S3. As drafted they're siblings with no stated dependency, and S1's "truth mechanism is human approval" claim is undermined if the *proposals* being approved carry pre-contaminated outcome beliefs.

**6. P0.5 lands a Sean-gated ruling as if decided.** The boards say the coach_facts projection-vs-independent-belief ruling is *pending*; the plan text asserts the ruling ("ruling: it is the NON-PROJECTABLE half…"). That's decision-smuggling into a migration-bearing slice. Make it an explicit decision request with the migration gated on the answer.

**7. P1.1 doesn't say where ConfirmationSheet mounts — which is the whole ballgame.** F14 is the live killer: surface docks render `confirmation_required` as dead-end plain text (useSurfaceCoachDock.ts:170-172). If the One Module mounts only in the Command Center, C5's beautiful bar recreates the dead end with better chrome and the ≤2s gym-floor loop stays broken. P1.1's acceptance criteria must include: rendered in `SurfaceCoachDock` flows, collects the deliberate voice yes *at the dock*, and fixes F17's focus/aria-live gaps **before** it becomes the only gate — otherwise one inaccessible component makes every gated action inaccessible simultaneously.

**8. Missing slices:** (a) rollback/observability for P0.2's Redis move — GETDEL + eviction policy + alerting, per F24; (b) a budget/retry-storm policy for P2.5.1 — routing chat through providerRouter's retry machinery can *multiply* spend on provider flaps; the 35s/30s Render-timeout tuning deserves a stated SSE interaction plan for P2.5.5 (streaming holds connections; the concurrent lock math changes); (c) a disposition for the F28 class of dock receipt bugs — the plan polishes the backend gate while the frontend receipt layer lies in three small ways.

**9. Over-engineered for 1 trainer + small roster — cut or park:** P2.5.2 (multi-model debate: fix the *trust signal* by labeling consensus as single-reviewer, spend the multi-model money never); P4.4 (BYOM: de-identified health-structured payloads to arbitrary user endpoints is still health-data egress with no logging SLA — park behind a scale trigger); P2.3's "unblock ~8 FRONTEND_DISPATCH commands" (eight full registry+dispatcher+test slices for gym-floor convenience — take the three hottest by intent-log frequency, which the coachIntentRecorder data already gives you). Every cut feeds P1/F14, which is where the product actually bleeds.

---

# PART 3 — BETTER THAN JARVIS: five mechanisms

Movie-Jarvis has one principal, a screenwriter's memory, no receipts, and no ability to refuse Tony. Swan Coach's structural advantages are exactly those four gaps. What follows builds on existing seams only.

### M1 — The Receipt Envelope (deepens P4.1)
**Build:** every terminal outcome emits a typed envelope — `{commandType, tier, tierReasons[], doctrineVerdicts[], dataQuality[], actorId, targetClientId, operationId, outcome, realAffectedCount, undoToken?}` — stamped in `stepExecute`/`executeConfirmedOperation`, persisted alongside AiCommandAuditLog, rendered by a `ReceiptChip` (replacing prose "Done — …"). "Show your work" expands doctrine verdicts + the context engine's own `dataQuality` array — the honest-degradation signal already exists and is currently thrown away (F27).
**Seam:** AiCommandAuditLog (real, L131-class), `coachEventLog` outcome typing, ExecutionResultCard.
**New risk:** the envelope echoes DB strings (goals titles) into UI — render as text nodes only, and role-scope the expanded view (client receipts never render trainer-only verdict fields).
**Test:** golden scenario per command family asserting envelope presence; property test that serialized envelopes across all fixtures contain zero `firstName`/`lastName`/email substrings; a11y: chip announces outcome once (aria-live), undo covered by 44px rules (F17).

### M2 — Truthful memory as a server-side ledger, not a browser log
**Build:** one append-only `coach_intents` table written at every terminal outcome, typed believed/pending/failed exactly like `coachMemoryProjection.ts` — and carrying the ack-seam two-phase rule at the DB level (`accepted` → `outcome` within TTL, else auto-`failed`). The context engine reads it into prompts as a **system-authored, fenced block**: "ACTION LEDGER — ground truth; claim no action not present." This dissolves the split brain (frontend event log vs server audit) and makes "Coach can never report an attempted save as applied" a schema property instead of a prompt plea.
**Seam:** P3.2's ack work + AiCommandAuditLog + `coachContextEngine` as sole prompt reader.
**New risk:** ledger fields must be enum/ID-typed — free text (notes) stays out, or you've built a persistent injection store; cap prompt block to last-N per client.
**Test:** the S3-residual red test (attempted save acks true → server rejects) must flip the row to `failed` and the next prompt must contain it as failed; fencing test that no user free-text reaches the block un-delimited.

### M3 — Refusal as a first-class verdict (extends P4.3, fixes F20)
**Build:** add `refusal` above `deliberate` in the tier order. Triggers: `role_not_permitted`, contraindicated (P3.4's reserved verdict), consent-withdrawn, quiet-hours, trainer-indispensability. Refusals render as deterministic cards with reason codes — never chat prose — and are counted by reason in `/metrics/summary` (the route exists, aiCommandRoutes.mjs:424-436) so over-refusal is observable, with a receipted human-override path.
**Seam:** `voiceConfirmationTier.mjs` escalation order, `stepConfirmation` short-circuit, ConfirmationSheet's RefusalCard variant, plan_edit referee's reserved severity.
**New risk:** refusal-wording drift across surfaces — one template module, strings reviewed once; over-refusal eroding trust — mitigated by the counters.
**Test:** actor×command×context matrix asserting no refusal ever reaches a confirmation UI; an eval set of "train through the pain" utterances yielding the card, not prose. This is the axis Jarvis cannot touch: a coach-brain that says "don't train today" *and shows you why* is more trustworthy than one that never says no.

### M4 — Session pre-flight (anticipation without mind-reading; extends P3.3/P4.5)
**Build:** when `selectedClientId` changes on a surface dock, emit one dismissible chip: a deterministic checklist projected from data the context engine *already loads* for `brief_client` — active pain flags, credit count, plan staleness, last-workout delta — each item linking via `audiencePath` (intentBarState.ts:125-128) to its surface. Zero new inference; pure projection; trainer-side only (clients get nothing proactive without their own toggle — consent axis).
**Seam:** `dispatchBriefClient`, the dock receipt sink (`pushSurfaceCoachReceipt` exists, useSurfaceCoachDock.ts:44-46), intentBarState routing.
**New risk:** chip fatigue — one per client-switch, suppressed when zero flags. **Hard dependency:** F13/the cross-client chip must land *first* or pre-flight flags attach to the wrong person's bar — which would make the anticipation layer the new wrong-client vector.
**Test:** fixture client with active pain + 0 credits → both flags with source domains; clean client → no chip; degraded pain domain (F27) → "pain data unavailable" row, not silence.

### M5 — Undo as a real primitive, not a promised token
**Build:** the ConfirmationSheet plan promises "undo token on fire_and_forget"; make it real. Each wired write dispatcher registers a compensating handler (`log_workout → delete by row-id captured at execute`; `create_availability_override → delete by id`). Undo tokens are short-lived signed ops reusing the destructiveOperations HMAC machinery with `type:'UNDO'` — and the route already accepts `entityId`/`entityVersion` (aiCommandRoutes.mjs:157-158): refuse the undo if the row mutated since execution.
**Seam:** destructiveOperations (new op kind), the DISPATCHERS map (compensation registry), AiCommandAuditLog (orig↔undo linkage).
**New risk:** compensations are writes — they get receipts and rate limits too; undo-of-undo is out of scope by construction (`type:'UNDO'` ops are not undoable; the receipt says so).
**Test:** execute→mutate→undo refuses with reason; execute→undo→state byte-equal; TTL expiry → honest "window closed" message. This converts the fire_and_forget tier from "trust me" to "always reversible" — the single biggest trust delta vs a movie butler who just does things.

**One design note binding M3 to voice:** a deliberate *spoken* yes must be bound to the target, not merely detected — ConfirmationSheet should require an echo nonce ("say *confirm 4-7*", derived from a hash of the operationId) so background speech, a misheard "yeah," or another person's voice cannot satisfy the deliberate tier. Test: noise corpus (applause, "no", wrong nonce) never confirms. Split the sheet's file along state-machine / cards / voice-binding seams to hold the 300-line cap, styled-components + palette tokens throughout, `prefers-reduced-motion` on the arming animation.

**The pitch, compressed:** Jarvis earns trust because the script says he's trustworthy. Swan Coach earns it because every action carries a receipt (M1), memory it cannot lie with (M2), the ability to refuse with reasons (M3), anticipation grounded in projections rather than vibes (M4), and reversal instead of apology (M5). Every one of those is a schema, a seam that already exists, and a test — which is what makes it production truth rather than movie magic.
