# HOSTILE REVIEW PACKET — Swan Coach Brain ("Jarvis and beyond") — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/92a4dea8-4074-4f1c-8888-da2d80f87efb/scratchpad/glm-packet-full.md
**Tokens:** 30299 in / 20576 out (reasoning: 14013) | total 50875
**Wall:** 345.2s

---

# PART 1 — CURRENT BRAIN: NEW FINDINGS (F13–F22, extending F1–F12)

---

**F13 · P1 · LIVE · The confirmation sheet cannot echo what will execute — there is no read-back of the stored payload.**
`preparePendingConfirmation` returns only `{operationId, description, expiresAt}` (destructiveOperations.mjs:233). The stored `confirmedParams` are a *transformed* copy of intent params — `clientId` is injected server-side at :209 after a shallow spread (:207). Meanwhile the `confirmation_required` response the UI actually renders from echoes `ctx.intent?.params` (aiCommandRoutes.mjs:320), *not* the stored object. Two artifacts, one shown to the human, one executed — and they diverge by construction (at minimum by scoped `clientId`, plus any stepConfirmation transforms). For the destructive path the HMAC binds the stored params but the *display* is reconstructed client-side from a different object. There is no `GET /ai-command/pending/:id` anywhere in aiCommandRoutes.mjs (routes are execute/confirm/cancel/metrics/commands/health only), so P1.1's "echoes resource/target/fields exactly" has **no backend primitive to build on**. This is the seam where a stale tab can display op A's params while confirming op B's operationId — nothing server-side detects the mismatch.
**Fix:** owner-gated read-back endpoint returning the stored op (minus signature), and `/confirm` must verify a digest of what was rendered (see Part 3, M1).

---

**F14 · P2 · LIVE · The kill switch is a gate that only sometimes binds: `/cancel` runs naked.**
`/execute` (:154) and `/confirm` (:365) carry `aiCommandLaneKillSwitch, aiCommandRateLimiter`. `/cancel` (:389) carries `protect` only. commandLaneControls.mjs:9–13 claims "the whole command lane returns 503" — false for cancel. Blast radius is self-griefing (ownership check destructiveOperations.mjs:279), so P2, but it's the exact class F1/H7 exist to close: per-route guard adoption as convention, not enforcement. Move the guards to the router level or a shared middleware chain.

---

**F15 · P1 · LIVE · The context engine converts outages into lies: degraded domains read as clean absence.**
coachContextEngine.mjs:181–185 — a rejected domain loader becomes `results[domain] = []` with a `dataQuality: 'degraded'` footnote that nothing downstream is forced to render. A `pain` table error produces "no active pain." Worse in the day sheet: the pain-flags query `.catch(() => [])` (coachContextEngine.mjs:283–291) silently strips `active pain` flags — a trainer walks into a session unflagged *because the database blinked*. Same softness at :208–209 where a missing profile row degrades to `level: 1` rather than unknown. This is a fail-open in the **truthful memory** layer itself: the projection cannot distinguish "measured zero" from "couldn't measure," and `brief_client`/`brief_my_day` are LIVE consumers (state map). Every downstream ambition — P3.4 pain screening, P4.2 absence-naming — inherits this hole.
**Fix:** trivalent domain results `{value, veracity: measured|absent|unavailable}` (Part 3, M2); degraded renders as "unavailable," never as empty.

---

**F16 · P1 · LATENT · The named-but-unlocked client is the hole in BOTH cross-client alarms.**
voiceConfirmationTier.mjs:113–120 fires `cross_client` only when `lockedClientId !== null && targetClientId !== null` and they differ; :124–127 fires `unresolved_client` only when *both* are null. The between-case — **a voice command names client 47 while nothing is locked** — escalates to nothing beyond the command's own tier. intentBarState.ts mirrors the hole: `crossClient` (:92–93) is false whenever `lockedClientId === null`. But voice naming an unanchored client is precisely the misheard-pronoun/wrong-record case the tier doc calls "catastrophic" (:110–112) — it just arrives without a dashboard lock to compare against. When P1.3 flips enforcement on, this is a live deliberate-tier bypass for the highest-risk input mode.
**Fix:** new escalation reason `unlocked_target`: `targetClientId !== null && lockedClientId === null` → deliberate, and require a physical (non-voice) confirm channel (Part 3, M3).

---

**F17 · P2 · LATENT (P1 the day P0.2 ships) · The HMAC signs the wrong fields and currently guards nothing.**
Payload is `{id, type, endpoint, commandType, params, createdBy}` (destructiveOperations.mjs:31–38). **`description` and `affectedRecords` are unsigned** — the two fields the human actually reads. Today this is moot because `verifySignature` re-serializes the server-held Map object (:42–45); the signature never authenticates anything in transit — the op never leaves the process, the client gets only the UUID. The HMAC is security theater in the current topology. It becomes *load-bearing and wrong* the moment P0.2 round-trips ops through Redis: a serialization bug or Redis-side tamper can alter what the approver reads while verification passes. Same slice must fix: (a) sign `description` + hash of `affectedRecords`; (b) the shallow params copy at :207 shares nested references with caller state — post-mint mutation of nested objects is invisible and unsigned on the `pending_confirmed` kind, which has **no integrity binding at all** (kind marker :213, no signature path). Decide the model: either server-state + GETDEL (HMAC redundant, keep for audit) or stateless signed tokens (then sign *everything* human-visible).

---

**F18 · P1 · LATENT · [INFERENCE] The client-scope law is a per-dispatcher convention, not an executor gate.**
clientScope.mjs:12–13 resolves `ctx.resolvedClient?.id ?? params.clientId` — the fallback direction means that when nothing is route-resolved, **the classifier's extracted number becomes the write target**. The envelope authorizes the *selected* client (aiCommandRoutes.mjs:225, `authorizeClient: assertAssignmentOrAdmin`), but a client id minted inside `params` by the LLM never passes that envelope. commandDispatcher.mjs:366–375 invokes handlers with no executor-side re-scoping — correctness depends on each write dispatcher *remembering* to call `resolveCommandClientId`. This is the exact seam where the repo's #1 defect class (cross-client identity confusion, H1/SWA-192 lineage) regenerates every time a new dispatcher is added.
**Verify:** `grep -rl "resolveCommandClientId" backend/services/ai/dispatchers/` vs. the list of write-capable handlers in commandDispatcher.mjs:222–335; and read `stepResolveClient` in commandExecutor.mjs to confirm whether `params.clientId` is access-checked when `resolvedClient` is null. Any write dispatcher absent from the grep is an unscoped write.

---

**F19 · P2 · LIVE · The registry's self-description is falsified by its own code — four official command counts.**
Header claims 119 across "14 categories" (index.mjs:8–19) while logging a live count at :84 over **20** `register*()` calls (:61–80); voiceConfirmationTier.mjs:16–17 claims "19 registries: 134 commands, 8 destructive, 44 confirmation-gated"; the state map counts 139 types / 112 wired / 27 unwired. When safety metadata ("8 destructive") is hand-maintained prose adjacent to a live registry, every gate audit inherits the drift — two commit messages already quoted a stale count (index.mjs:9–12 admits this). **Fix:** derive counts, destructive tally, and confirmation-gated tally from `getAllCommands()` at boot and emit them in `/health`; delete the prose numbers.

---

**F20 · P1 · LATENT · The frontend_dispatch lane instructs the client to execute LLM-shaped payloads with no server-side gate on main.**
aiCommandRoutes.mjs:277–289: a `not_wired` + `FRONTEND_DISPATCH` + non-confirmable command returns `success: true, event, payload: ctx.intent?.params` — classifier-extracted params, identity-sanitized but not structurally bounded, promoted to an executable browser event. H6 (frontend-dispatch safety gate) sits stranded on the correction branch (state map). Exposure depends on the frontend consumer's allowlist — **[INFERENCE]**: read the `aiWorkoutEvents` consumer(s) in frontend to determine whether arbitrary `event` names are honored. Also note the tier asymmetry inside the same branch: confirmable FRONTEND_DISPATCH commands fall to the honest `not_wired` path while non-confirmable ones execute — a two-class UX invented per-command.

---

**F21 · P2 · LATENT · [INFERENCE] Aliased command types share handlers but live in registry-land where their safety flags can diverge; `undefined` defeats the honesty backstop.**
`assign_trainer`/`assign_client_to_trainer` → same handler (commandDispatcher.mjs:238–239); `view_today_sessions` alias (:309). If the two registry entries differ in `destructive`/`roleRequired`, the same handler executes under the weaker definition — a gate that binds only for the spelling the user didn't use. **Verify:** grep both type strings across `commandRegistry/*.mjs` and diff their `CommandDefinition`s. Separately, the route's honesty backstop keys on `ctx.result === null` (aiCommandRoutes.mjs:329) — a handler resolving `undefined` (not null) sails through as `executed` with no result. Add a dispatcher contract test: every entry in DISPATCHERS returns an object or throws.

---

**F22 · P2 · LIVE · The pending-op budget is a habituation accelerator under voice cadence.**
Cap of 5 shared across *both* kinds (getPendingCount iterates all `pendingOps.values()` regardless of kind, destructiveOperations.mjs:291–299; enforced at :87–91 and :199–203) with a 120s TTL (:14) that the sheet will inevitably render as a countdown. Two failure modes: (a) a voice session doing repeated read_back confirmations jams on "Too many pending operations" mid-set [INFERENCE on which commands are confirmable — verify via `GET /api/ai-command/commands` `requiresConfirmation` field]; (b) a visible 120-second fuse on a *deliberate* tier pressures exactly the yes-click the tier exists to slow. Destructive deliberation and fire-hose confirmables should not share one budget or one clock.

---

# PART 2 — THE UPGRADE PLAN, ATTACKED

**2.1 — P0.3 is sequenced last inside Phase 0; it must be first, full stop.** Landing P0.1 (a 19-commit security rebase ~250 commits behind main) into a repo with branch protection OFF means the correction itself merges un-CI'd, and any concurrent push both bypasses review and — via the restart — voids in-flight approvals (F2's interlock). Branch protection + fixed baseline precede the merge or the merge is another unprotected push.

**2.2 — Coach Gate as required check will deadlock on a red main.** The map records `known-failing-baseline.json` stale — *main fails its own existing gate*. Adding S4a/S4b as a required check on top of an already-failing baseline forces either `continue-on-error` (gate neutered at birth) or an unmergeable repo. Fix/refresh the baseline inside P0.1, before enabling the check in P0.3.

**2.3 — P0.4 flips VOICE_MODE_V2 before P1.1 exists. That re-creates the four-registry confirmation drift C3 was written to kill.** Voice-on with no unified ConfirmationSheet means the voice surface ships its own ad-hoc confirmations — the exact failure voiceConfirmationTier.mjs:7–10 documents. Correct order: land correction → S1/S2 → P1.1/P1.2 → *then* flip VOICE_MODE_V2. PLANNER_IA_V2 and PLANNER_LENS_STYLES are safe to flip earlier; split P0.4 into two tranches.

**2.4 — P0.2 under-specifies the Redis seam; GETDEL has a griefing edge.** If ops are keyed `pending:{opId}` and ownership is checked *after* GETDEL, any authenticated user who learns an opId (it's in the /execute response JSON) consumes the op and the creator's confirm fails as "expired." Key must be `pending:{userId}:{opId}` (actor-bind *in the key*, not post-hoc). Also unstated: the cleanup timer (destructiveOperations.mjs:20–28) becomes dead code against Redis TTL — delete it; per-user cap semantics must move from O(n) Map scan (:291–299) to a per-user counter or the `/health` endpoint (:474) becomes a full-store scan. **Acceptance test the plan omits:** mint on instance A, confirm on instance B must PASS — that exact two-terminal e2e is the P0's regression test. And P0.2 must fold in F17 (sign `description`/`affectedRecords`, kill the shared-reference shallow copy) or the migration ships a new tamper seam with the fix.

**2.5 — P0.5 lands coach_facts S1 before the context consolidation (P2.5.3) that its read path (P3.1 S3) depends on.** Risk: a *third* context assembler grows in the gap. If S1 lands, gate it with an explicit "no readers until P2.5.3" marker (the repo already has the labeled-dormant convention, voiceConfirmationTier.mjs:39–52).

**2.6 — Phase 3 has a truth dependency inverted: P3.2 must precede P3.1's S2.** Extraction (S2) will read command outcomes to form durable beliefs. The map records the acknowledgement seam as LIVE-broken: an attempted save the server rejects still acks `true`, shared by 4 command families. Extract memory from lying acks first and **coach_facts poisons itself with fabricated successes** — a truthful-memory system trained on a false event stream. Fix the ack seam (accepted → outcome settle) *before* the first extraction run, not after S3.

**2.7 — P1.3 doesn't name the invocation point for the tier resolver — that's where it will be subverted.** If tiers are computed client-side (frontend supplies `lockedClientId`/`actorRole` ctx), the deliberate tier is spoofable to fire_and_forget. Resolve server-side in stepConfirmation using the route-normalized `selectedClientId` (aiCommandRoutes.mjs:177) as `lockedClientId`. The route already carries a `source` token in ROUTE_CONTEXT_KEYS (:87) — thread `inputMode` through it now so M3 (below) is possible later.

**2.8 — P1.1 needs two primitives the plan doesn't list:** the stored-payload read-back endpoint (F13) and a server-verified render digest on `/confirm`. Without them, "echoes exactly" is a frontend promise about backend state.

**2.9 — P2.1 (UiIntent) is missing the two controls that matter: a velocity budget and prefill provenance.** An allowlist bounds *verbs* but prefill carries *values* — and those values will be model-generated from retrieved text. Attack chain: prompt-injected `goals.title` (F8's lane) → model proposes `prefill_form` for a client-facing message with injected content → trainer confirms what looks like their own draft. The plan's "diff chip" (P2.2) must become mandatory provenance tagging: every prefill value labeled model-composed vs copied-from-record, rendered differently (Part 3, M5).

**2.10 — P2.3 leaves a double path.** After moving the ~8 FRONTEND_DISPATCH commands server-side, the aiCommandRoutes.mjs:277–289 branch must be deleted or the ungated lane (F20) survives beside the gated one. Also: every moved command must be *re-tiered* — server-side execution changes its confirmation class. Plan is silent on both.

**2.11 — P2.5.1 and P2.5.2 are one slice, not two.** The hand-rolled chain lives inside `sendChatMessage` (aiChatService L2035) and debateOrchestrator.mjs:448 calls that same function — re-routing chat without preserving the `(messages, {maxTokens, temperature})` contract breaks debate in the same deploy that "fixes" it.

**2.12 — P2.5.4 as written goes dark or goes wrong.** Applying `requireAiConsent` to coach chat with no consent backflow bricks every existing user on deploy. Worse, today's middleware is actor-scoped; `brief_client`'s *subject* is the client — the gate must check the **subject's** consent, not the trainer's. Specify subject-scoped consent + a consent-prompt migration, or this slice ships as an outage.

**2.13 — P2.5.5 (SSE) before debate/approval state externalization multiplies the P0 class.** `activeDebates` and `pendingOps` are in-memory (map); streaming long debates on Render multi-instance with sticky-session-less load balancing is a scheduled 502. Externalize state first (P0.2 does ops; debates don't appear anywhere in the plan — add it or cut SSE).

**2.14 — Over-engineering for a 1-trainer SaaS:** P4.4 (BYOM) — cut or demote to admin-only; a per-user model slot for a small client base is privacy surface (whose key, whose egress consent) with no demonstrated demand. P2.5.2's true 3-model debate is 3× cost/latency for an audience of one — the cheaper honest fix is to stop rendering "consensus" language for a single model and reserve multi-model for destructive-proposal review only. SSE is a want, not a need, this quarter. Conversely **under-engineered:** Phase 0 contains no dead-weight deletion (F12) — every future audit will re-excavate MasterPromptModelManager; deleting it is the cheapest review-debt payoff available and belongs in P0.

**2.15 — No rollback story for P0.2.** Redis approval store cutover needs a shadow-read period (write Map+Redis, read Redis, compare) or the first Redis blip voids all confirmations — recreating the P0 with a different hostname.

---

# PART 3 — BETTER THAN JARVIS: SIX MECHANISMS

Movie-Jarvis's real weakness: his competence is unfalsifiable. Nothing he says carries a receipt, his memory is whatever the scene needs, and he never has to show Tony a diff. Every mechanism below is built to make the brain's work *checkable by a busy human in 3 seconds* — and each names the new risk it opens, because every trust mechanism is also an attack surface.

---

**M1 — Proof-of-Render confirmations + blast-radius arm delay.**
*Build:* (a) `GET /ai-command/pending/:operationId` (owner-gated) returning the stored op verbatim; (b) `/confirm` requires `renderedDigest = SHA-256(canonical(type, target, affectedCount, description, param-subset) + operationId)` — server recomputes from the *stored* op and rejects mismatches as `render_mismatch` with an audit row; (c) the confirm chip arms after a dwell proportional to blast radius (affectedCount 1–3 → instant; >3 or destructive → 2–4s disabled chip with the records visibly loading).
*Seam:* destructiveOperations.mjs:141–183 (verify path) + the new read-back route from F13.
*Kills:* stale-tab cross-op confirms (F13), display/execute divergence bugs becoming silent, countdown-pressure clicks (F22).
*New risk (stated honestly):* the digest proves the *client had* the true payload, not that a human read it — an XSSed client computes digests fine. It is an integrity check, not an attestation; do not let the receipt claim otherwise. Arm-delay degrades for screen readers — announce record list before chip state.
*Test:* e2e — mint op, render tab A with op A, switch DOM to op B's params, confirm with A's operationId and B's digest → 400 + audit. Unit — destructive op with affectedCount 12 → chip disabled <3s.

---

**M2 — Trivalent memory: the projection that cannot believe an outage.**
*Build:* every contextEngine domain returns `{value, veracity: 'measured'|'absent'|'unavailable', checkedAt}`; degraded loaders hard-fail to `unavailable` (fixing F15 at :181–185 and the day-sheet `.catch(() => [])`); briefs render absence-naming ("no pain on record" vs "pain status unavailable since 10:02"). `dataQuality` graduates from footnote to data.
*Seam:* coachContextEngine.mjs DOMAIN_LOADERS/summarize* + coachMemoryProjection.ts types.
*Why it beats Jarvis:* his memory is a screenwriter's convenience; this memory's *ignorance is typed and timestamped*. A trainer who acts on "no active pain" during a pain-table outage was lied to by silence; this makes silence impossible.
*New risk:* consumers flattening tiers back to truthy/falsy — mitigate with a lint rule banning `.length`/truthiness on domain values outside summarizers, and an eval fixture with an injected DB failure asserting the word "unavailable" appears.
*Test:* unit — pain loader rejects → `context.pain.veracity === 'unavailable'` and brief text contains "unavailable," never "no active pain." Golden eval — poisoned-connection fixture included in the gate.

---

**M3 — Channel-split authority: voice proposes, glass disposes.**
*Build:* thread `inputMode` (voice|text|ui) through routeContext (`source` token already whitelisted, aiCommandRoutes.mjs:87) into stepConfirmation. Rule: any write where `targetClientId !== lockedClientId` **or** target-named-while-unlocked (F16) **and** `inputMode === voice` escalates to `deliberate+physical` — confirm chip must be tapped or the target digit typed; a spoken "yes" is structurally insufficient because the same ears that misheard the command are confirming it. This is the house law "voice widens input, never authority" made mechanical instead of aspirational.
*Seam:* voiceConfirmationTier.mjs:96–156 (add the escalation reasons), intentBarState.ts:92–96 (mirror), ConfirmationSheet (P1.1).
*Why it beats Jarvis:* Jarvis executes on one voice; Swan Coach requires the *mishearing channel* to never be the *authorization channel* for identity-crossing writes.
*New risk:* provenance spoofing (client claims `text` for a voice utterance) — acceptable, since an attacker controlling the client is past this gate anyway; log inputMode on every audit row so drift is visible.
*Test:* red-first — voice utterance naming unlocked client 47 with a write verb returns `confirmation_required` with `physical: true`; same utterance with 47 locked returns standard tier.

---

**M4 — The veto ledger: a brain that says "don't train today" with versioned receipts.**
*Build:* complete P3.4 as a *ledger*, not a check: every contraindication verdict (nasmCesPolicy + active pain profile) is an append-only row `{clientAlias, region, doctrineVersion, sourceRows, issuedAt, supersededAt}`; the planner consults it at proposal time AND the executor re-checks at ConfirmationSheet time (defense in depth). The trainer's override is itself a first-class ledger event with actor id — override is allowed, invisible override is not. Rest-day proposals render as cards whose only actions are acknowledgement — the brain that says no *never* auto-executes the no.
*Seam:* planEditDoctrineService.mjs:30 (reserved `contraindicated` verdict), client pain domain from M2, nextBestActionService crons (P3.3).
*Why it beats Jarvis:* Jarvis never refuses Tony. A production coach's core value is the refusal — but a refusal without a citation is a nag; with `doctrineVersion` + source rows it's an audit trail a trainer can defend.
*New risk:* liability shape-shifting — an outdated doctrine version silently vetoing or allowing; mitigate by rendering the version on the card and failing *closed* (veto) when the ledger itself is `unavailable` (M2 applies to the veto too).
*Test:* active knee pain → generated plan containing lunges → verdict `contraindicated` → write attempt without override fails closed with receipt; override event appears in the tape with actor id; ledger-outage fixture → proposal blocked with "screening unavailable," not allowed through.

---

**M5 — UI-as-effector with a kinetic budget and provenance-tagged prefill.**
*Build:* extend P2.1's UiIntent with `{origin: user|model, cause: receiptId, ttl: 30s}` and a per-surface velocity budget (server-minted token count in the receipt chain, e.g., 5 effects/min): budget-exceeded intents are logged to coachEventLog as `budget_exceeded`, not rendered. Every prefill value carries provenance — model-composed vs copied-from-record — rendered as visually distinct chips. The sheet shows "3 of 5 UI actions this minute."
*Why this matters more than the allowlist:* the allowlist bounds what the UI can be told to do; the budget bounds *how hard the machine can push*, which is the actual habituation variable. Making pushiness visible is itself anti-habituation — a brain that's always rearranging the room gets muted; one with a visible allowance gets trusted.
*Seam:* aiWorkoutEvents families + coachEventLog receipts (both exist), UiIntent registry from P2.1.
*New risk:* client-side budget spoofing — explicitly documented as UX hygiene only; all *writes* remain server-gated regardless (the budget is not a security control and must never be cited as one). Prefill provenance must survive copy events or it's decoration.
*Test:* inject via `goals.title` a payload that emits 10 navigate intents → first N render, rest logged `budget_exceeded`; prefill provenance chip unit test; ttl expiry when surface changes.

---

**M6 — Undo as inverse-command + the irreversible registry + the scrubbable tape.**
*Build:* the P1.1 "undo token" is not magic revert — it's a signed *proposal* of the inverse command `{inverseCommandType, params, ofReceiptId, expiresAt}` minted at execute time and run through the **same pipeline** (RBAC, tiers, confirmation if the inverse is destructive). A static registry marks commands with no inverse (`notify_client` — the email already left) and the ConfirmationSheet must display **"cannot be undone" before execution**, not in the apology after. Layer the receipts (P4.1) as a scrubbable per-(actor, surface) tape — "show your work" becomes a timeline, not an accordion.
*Seam:* destructiveOperations mint path (the inverse proposal is a `pending_confirmed` op — the machinery exists), coachEventLog sequencing, AiCommandAuditLog.
*Why it beats Jarvis:* his redos are plot devices; theseundos carry the same HMAC/actor-bind/tier discipline as the do — undo can never become a lower-security side door around the write gates (the classic undo vulnerability).
*New risk:* inverse-parity bugs — an inverse that doesn't truly restore (soft-delete vs hard-delete mismatch); mitigate with per-command inverse round-trip tests in the registry contract. The tape must not become a surveillance surface for admins over trainers — scope tape visibility to the actor's own events plus admin audit view with cause.
*Test:* `log_workout` undo → delete-log inverse proposed *through the pipeline* with read_back tier; `notify_client` sheet shows the no-undo badge pre-confirm; audit asserts the inverse op's createdBy equals the original actor.

---

**Coda — wit on a leash.** Jarvis's dry humor builds affinity; in a safety context it erodes it. Make tone a *rendering tier over receipts*, never a prompt-level persona that can leak into decision text: `fire_and_forget` receipts may be witty; `read_back` plain; `deliberate` and refusal cards warm-formal, zero joke tokens — enforced by golden fixtures, not vibes. The brain earns its personality in the moments with no stakes, and forfeits it exactly when the trainer is about to press the button.

---

## Verdict summary

Part 1: the standing P0s are confirmed, but the *next* generation of bugs is already visible and unclaimed — F13 (no stored-payload echo), F15 (outage-as-absence in the live briefs), F16 (named-but-unlocked), F18 (client-scope as convention) — all sitting on the seams between prior fixes, exactly where the last four reviews found their live bugs. Part 2: the plan's Phase 0 ordering inverts its own dependencies (protection and baseline before merge; ack-truth before memory extraction; ConfirmationSheet before voice flag-flip) and P0.2 as written would ship a fresh tamper seam (F17) with the fix. Part 3: the differentiator isn't more capability — it's *falsifiable* capability: digested renders, typed ignorance, split channels, versioned refusals, metered pushiness, gated undo. Jarvis asks to be trusted; each of these is a machine that hands over the receipts instead.
