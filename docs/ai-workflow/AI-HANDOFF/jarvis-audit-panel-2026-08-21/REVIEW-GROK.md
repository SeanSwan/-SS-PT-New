# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** c:/tmp/ss-jarvis-audit-20260821/.panel/PACKET.md
**Seed:** (none)
**Tokens:** 6158 in / 5254 out · **Cost:** ~$0.0438 · **Wall:** 85.9s · **finish:** stop

---

# Hostile review: Jarvis Readiness Audit vs. origin/main @ 66ffde607

The audit did not read the confirm path. It invented a P0, then prescribed building the protocol that is already shipped. It spent its architecture budget on a greenfield “SwanRuntime” while the actual security-critical store is an in-process `Map` signed with a per-process random key. Rank the findings by what the files say, not by the Jarvis story.

---

## 1. FALSE or stale claims

**P0 “client-supplied `confirmation.confirmed === true` bypass” — FALSE.**  
`POST /confirm` takes `{ operationId }` only. Repo-wide grep for a client-authored confirmation boolean in the command lane is empty (the one `confirmed === true` hit is an unrelated list filter in `session.service.mjs`). `destructiveOperations.mjs` already does what Phase 0 says to “replace” the boolean with: HMAC over `{id,type,endpoint,commandType,params,createdBy}`, `timingSafeEqual`, 120s TTL, actor-bound retrieve, one-time `pendingOps.delete` on every retrieve path, params frozen at mint, write kill-switch re-checked at execute, unscoped DELETE rejected, `MAX_AI_BULK_DELETE=50`, `MAX_PENDING_PER_USER=5`. The “appears to accept” wording is a confession that this was inferred, not read. **This P0 does not exist at the named commit.** Ranking a non-bug as the headline critical finding discredits the rest of the severity ladder.

**P1 “usePremiumTTS is disabled and simulates speaking with a timer” — FALSE / stale.**  
`usePremiumTTS.ts` calls real `window.speechSynthesis` (`getVoices`, `speak`, `cancel`). No `simulat|setTimeout|disabled` in that file. Phase 0 “Remove or rename simulated TTS” and the “internally contradictory voice” P1 are both built on a ghost. Browser TTS vs. Gemini upload vs. one-shot vs. continuous recognition is fragmentation, not a fake-audio lie.

**P1 “generate a capability truth report” as greenfield — STALE / mis-scoped.**  
`commandExecutionLane.mjs` already classifies every command into `server_dispatch | debate_async | manual_only | frontend_event | chat_fallback | not_wired`. `commandRegistryCoverage.test.mjs` already fails if anything lands in raw `not_wired` and pins exact lane membership. The 119-vs-134 drift is self-documented in `commandRegistry/index.mjs`. The work is **promote the existing lock into a versioned, UI-consumed manifest**, not invent a registry the repo already has.

**Phase 0 “add a server-side kill switch” — already present for the path that matters.**  
`executeConfirmedOperation` re-checks the write kill switch, so an op minted before a flip does not execute after. “Add adversarial tests for client-authored confirmation booleans” tests a path that does not exist.

**Phase 0 completion gate “no sensitive command may execute from a client-authored boolean” — already the current contract.** Treating it as future work is how you get a nine-file rewrite instead of fixing the store the contract sits on.

**“Confirmation is bound to the command center rather than following the user”** is a UX complaint, not a protocol gap. The protocol is server-side and actor-bound. Cross-surface *display* of a pending `operationId` is a frontend wiring task, not a new approval engine.

---

## 2. What is actually real (and ranked correctly)

**Branch protection off + eval-only gate — real P0, strongest finding in the document.**  
`ai-eval-gate.yml` runs `npm run eval` and nothing else. Four workflows total. `protected: false`, empty required checks, enforcement off. Direct push to main is the agent safety boundary, and it is open. Correctly P0.

**CI surface is a toy relative to the scripts that already exist — real P0/P1.**  
Backend already has unit/API/eval/drift/provider-comparison/lint. None of it is required. Command-registry coverage lock is the one test that would actually stop silent capability drift, and it is not in the gate.

**Frontend UI authority is four allowlisted workout events — real, correctly described.**  
`AI_ADD_EXERCISE | AI_LOAD_TEMPLATE | AI_UPDATE_SET | AI_TOGGLE_NASM_ITEM`. “Change the UI at will” is not implemented. That is a product-scope fact, not a vulnerability.

**In-memory transcription rate counter + localStorage frontend quota — real P1, under-ranked relative to the twin defect they missed.** They saw the Map pattern in the wrong place.

**134 definitions ≠ 134 executable capabilities — real observation.** They just failed to notice the lane classifier and the lock test already encode it.

**Chat/command separation, RBAC, client-access checks, honest `not_wired` — correctly praised.** Then Phase 1 proposes to collapse that separation into one runtime. The audit argues against its own best finding.

---

## 3. What the audit missed (the actual P0)

**Ephemeral HMAC secret + in-process approval store.**  
`OPERATION_SECRET = process.env.OPERATION_SIGNING_KEY || crypto.randomBytes(32).toString('hex')`  
`pendingOps = new Map()` with an inline comment that Redis is disabled in production.

This is the security-critical twin of the transcription Map they dinged as P1:

- Unset `OPERATION_SIGNING_KEY` → secret is **per process**. Restart/deploy silently invalidates in-flight approvals. Two instances cannot verify each other’s signatures.
- `pendingOps` is per-process. Mint-on-A / confirm-on-B → “Operation not found or already expired.” Under horizontal scale the destructive-confirm lane is non-deterministic. Not a bypass — an availability/integrity failure of the *only* approval protocol.
- The repo’s own design doc (`GOD-LEVEL-AI-UPGRADE-PROMPT-V3.md`) requires `process.env.OPERATION_SIGNING_KEY` with **no fallback** and lists it in `REQUIRED_ENV`. Shipped code silently degrades. That is a production-config footgun, not a missing feature.
- They audited in-memory Maps and stopped at the rate limiter. They did not open the file that actually signs destructive ops.

Further misses the seed implies:

- **Silent env degradation as a class.** If signing-key fallback shipped, assume other “required” secrets do the same. Audit never asked “what happens when Redis/signing key/kill-switch env is unset.”
- **Existing mitigations they didn’t credit**, which changes the residual-risk picture: actor-binding, TTL, one-time consume, param freeze, bulk-delete cap, pending-per-user cap, unscoped-delete throw, kill-switch re-check. The remaining hole is **shared durable store + required secret**, not “invent two-phase commit.”
- **Coverage lock is not in CI.** They want a truth report; the lock test that would enforce it is not a required check. That is the actionable half of their P1, and they buried it under a greenfield manifest.
- **Confirm-path multi-instance failure mode is operator-hostile.** Users will re-approve, double-submit, or conclude the feature is broken. That is how people bypass safety UX, not `confirmed:true`.

Vision gaps they mixed into “critical findings” (no SwanRuntime, no memory tiers, no proactive event engine, clients don’t get the operator shell) are product roadmap. They are not defects at 66ffde607. Mixing them with the open-main P0 is how a 45/100 Jarvis score ate a real production-safety review.

---

## 4. Proposed architecture: over-engineered, discards working code

`SwanRuntime` + UI intent bus + event engine + six memory tiers + WebRTC voice + sandbox-branch design agent is a product vision taped onto a readiness audit.

It **discards or wraps-to-death** what already works:

- Deliberate chat vs. command split (“one of the strongest parts”) becomes “temporarily adapters, eventually all call the runtime.” That is a rewrite of the safety boundary.
- `commandExecutionLane` + coverage lock become a new `capabilityResolver` / `capability registry` with `{execute, verify, compensate, observability, availability}` on every noun. The registry already has risk, roles, confirmation, schemas, undo, dry-run. Duplicate it and the lock test dies of neglect.
- HMAC two-phase commit becomes `approvalEngine.mjs` in a nine-file `backend/services/swanRuntime/` tree. The bug is the Map and the random key, not the absence of a class named `SwanTurn`.
- Four allowlisted UI events become a `SwanUiIntent` union that can reorder dashboards. That is a new product, not a fix. Correct next step for UI authority is still: grow the allowlist with schema + receipt + undo, one event at a time, behind the existing dispatcher.
- `SwanContextEnvelope` as a versioned uber-payload is a plausible later consolidation. It is not blocking the signing-key / Redis / branch-protection work, and it does not require a runtime god-object first.
- Phase 5 “sandbox agent edits a temporary branch → screenshots → PR” is not in the dependency graph of anything that is broken.

**Right pieces, wrong packaging:** one voice-state machine (without the fake-TTS premise), Redis/DB for *all* in-process Maps (approvals first, quotas second), promote lane lock → UI manifest, protect main, keep chat/command split, keep server-issued `operationId` confirm. Do not insert a runtime that owns “intent resolution, context loading, task planning, tool selection, policy, approval, execution, verification, receipts, memory, streaming, cancellation.” That is how you get a second command lane with none of the tests.

Scores (72 / 58 / 45) are unfalsifiable Jarvis aesthetics. They hid that the confirmation protocol they called P0 is already the one they recommended.

---

## 5. Corrected fix list (dependency-ordered, severity-ranked)

**P0-1 — Stop shipping a per-process approval secret.**  
Require `OPERATION_SIGNING_KEY` at boot. No `crypto.randomBytes` fallback. Fail closed, matching the design doc `REQUIRED_ENV`. Rotate once, document it, add a boot test that refuses to listen if unset/short.

**P0-2 — Move `pendingOps` off the process.**  
Durable shared store (Redis if that is the existing cache, else DB table) for pending destructive ops: same HMAC payload, same 120s TTL, same actor-bind, same one-time delete, same per-user cap. Multi-instance mint/confirm must work. This is the actual confirmation P0.

**P0-3 — Protect `main`.**  
Turn on branch protection. Required checks, no direct push, no admin bypass for the AI lane. Empty `required_checks` is the only finding in the audit that is both true and currently exploitable as process, not as code.

**P0-4 — Make the eval workflow a real gate, then require it.**  
`ai-eval-gate.yml` (or a Coach workflow) must run, and GitHub must require: `npm run eval`, backend unit including `commandRegistryCoverage.test.mjs`, TypeScript, frontend production build. Do not add E2E/visual/secret-scan until this lands or the gate stays theater. Dependency: P0-3 is useless if the required check is still eval-only.

**P1-1 — Same Map/localStorage pattern, now that the approval store is fixed.**  
Transcription rate limit → Redis/DB with user/tenant/feature dimensions. Frontend localStorage quota stays UI-only; server enforces. Do not treat this as equal to P0-2; a reset rate counter is abuse-control, a reset approval store is the safety protocol.

**P1-2 — Promote the existing lane lock into a generated manifest.**  
Emit the already-computed `server_dispatch | … | not_wired` map as a versioned artifact the UI reads. Command center / terminal / dock advertise from that file. Do not greenfield a capability registry. Wire the coverage test into P0-4 so a new undispatched command fails the required check.

**P1-3 — Config/boot audit for silent degradation.**  
Grep every `process.env.X || <generated or in-memory fallback>` in `backend/services/ai`. Signing key is the prototype. Redis-disabled-in-production is the comment that should have started the audit.

**P1-4 — Voice: one state machine, no fake-TTS work item.**  
Unify recognition mode and TTS behind explicit states (`UNAVAILABLE | PERMISSION_REQUIRED | READY | LISTENING | … | SPEAKING`). `SPEAKING` only if `speechSynthesis` (or a future server TTS) is actually playing — which `usePremiumTTS` already does. Do not “remove simulated TTS.” Do not start WebRTC/ephemeral credentials until P0 store + CI exist; that is Phase-later product.

**P2-1 — Grow UI authority on the existing allowlist, not a bus.**  
If the product needs more than four workout events, add typed events to the current classifier/eligibility path with schema, role, receipt, undo. No `SwanUiIntent` union, no model-driven CSS, no dashboard-rewriting. React still owns the tree.

**P2-2 — Context envelope as a shared helper, not a runtime.**  
If selected-client / equipment / session actually diverge across docks (verify with a test, don’t assume), extract one builder used by command center, terminal, and surface dock. Do not wait on `SwanRuntime.runTurn`.

**Do not do now:** `backend/services/swanRuntime/` (nine files), collapsing chat+command into one brain, six memory tiers, proactive event engine, client-facing operator shell, sandbox-branch design agent, “spoken text as authorization” redesign (the current protocol already forbids it). Those discard working lanes and compete with P0-1–P0-4 for the only people who can set `OPERATION_SIGNING_KEY` and GitHub rulesets.

**Order:** P0-1 and P0-2 are code; P0-3 is GitHub; P0-4 needs P0-3 and the coverage test; P1-1 reuses the Redis/DB decision from P0-2; P1-2 feeds P0-4; P1-3 is a grep once P0-1’s pattern is established; P1-4 / P2-* only after the approval store is shared and main is actually gated.

The audit’s correct instinct — don’t market 134 schemas as 134 capabilities, don’t let main be a firehose, don’t trust client UI as a security boundary — is already how the command lane is built. The job is to stop the signing key from being `randomBytes(32)`, stop pending ops living in a `Map`, and turn the lock tests on. Everything else in that target architecture is a different product.
