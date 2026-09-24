# Swan Coach approval lane — hostile round 2 packet — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-JARVIS-P1-ROUND2-BUNDLE.md
**Tokens:** 24131 in / 19739 out (reasoning: 15327) | total 43870
**Wall:** 651.0s

---

# Hostile Round 2 — Findings

I found what you asked for. Twice, actually. One of them is the same *species* as `allowedConfirmChannels`: hardened across multiple review rounds, negative-control-tested, lovingly documented — and never called by anything.

---

## F2-01 — The spoken-yes nonce ceremony is inert by construction. The deliberate tier's entire distinguishing control does not exist.

**Severity: HIGH · LIVE**
**Construct:** `frontend/src/components/CoachConfirm/confirmationSheetState.ts` — exports `spokenNonce()` and `nonceSatisfied()`. **Nothing imports them.** `useConfirmationSheet.ts` imports exactly `armDelayMs, canConfirm, channelPermitted, initialStateAfterRead, nextState, TERMINAL_GUIDANCE` — the nonce is absent. Server-side, `requiresSpokenYes` is returned by `resolveVoiceConfirmationTier` and then **discarded in `commandExecutor.stepConfirmation`**, which destructures `{ verdict }` and reads only `verdict.tier` and `verdict.physical`. Neither mint signs it, neither mint returns it, no envelope carries it, `/confirm` has no concept of it.

This is finding #1's exact fingerprint, three fingerprints deep:

- Exported pure functions with three rounds of hostile hardening (F-07: byte pairs not nibbles, homophones removed, "confirm"-anchored tail matching).
- Testable, and — per your evidence section — almost certainly *tested*, because the F-07 writeup is too detailed to be untested. Tests call `nonceSatisfied(transcript, id)` **directly**, which is precisely the bypass that hid the M3 bug: a unit test of a function cannot see that no production code path reaches the function.
- Documented as live ceremony: "Binding the phrase to THIS operation means the utterance cannot be produced by accident."

**Concrete failure scenario:** `TIER_DELIBERATE` exists so a destructive act needs "an explicit spoken yes" that ambient audio cannot satisfy. Today the entire voice confirm path is: surface hears anything it *locally* decides means "confirm" → `confirm(channel: 'voice')` → `channelPermitted` returns **true** (physical=false → voice is in `allowedConfirmChannels`) → POST /confirm with `confirmChannel: 'voice'` → server checks `requiresPhysicalConfirm` only → executes. A television saying "confirm" into a propped-up phone, or a trainer's set read-back if the local matcher is naive, authorizes a destructive write. The nonce — the *only* mechanism in the codebase that was designed to prevent exactly this — sits unused above the fold of the file that mocks unlabeled dormancy.

Note the asymmetry that gives it away: F-03 fixed `verdict.physical` (stamped, signed, enforced) and left its sibling `verdict.requiresSpokenYes` falling on the floor one line away. Half the M3 verdict got wired; the other half is decoration.

**Would a test have caught it?** An E2E speaking a bare "yes" at a deliberate op would (red — it confirms). Cheaper: `knip`/`no-unused-exports` lint — this is the third session finding that is literally an unconsumed export. Add the lint; it is the only control that would have caught all three.

---

## F2-02 — `requiresPhysicalConfirm = false` is a defaulted parameter at both mints. You applied "no default" to `inputMode` and left the same anti-pattern one door down.

**Severity: MEDIUM · LATENT (becomes LIVE the first time a second mint caller forgets the flag)**
**Construct:** `destructiveOperations.mjs` — `requiresPhysicalConfirm = false` in the `prepareDestructiveOperation` signature; same default in `preparePendingConfirmation`. Your own commandExecutor comment states the law: *"A default that assumes the SAFE answer turns 'nobody told us' into 'we checked'... Callers declare instead."* `false` is not the safe answer; it is the convenient one. Any current or future caller that mints without passing `verdict.physical` — a script route, a bulk tool, a second executor — gets a signed operation that says "no physical confirm needed," and the `/confirm` enforcement will faithfully honor it.

**Scenario:** a new route mints `delete_workout_plan` directly with six args, omitting the flag. Signature valid, channel check skipped, voice "yes" authorizes an identity-crossing delete. Every negative-controlled test still passes, because the tests exercise the flag *through* `stepConfirmation`, which passes it correctly — same blind spot as before.

**Would a test have caught it?** Making the parameter required (no default) is a one-line change that turns the entire class into a compile/Lint error. Do it. It is inconsistent to lecture about manufacturing 'text' while manufacturing `false`.

---

## F2-03 — `expiresAt` is outside both HMAC payloads. The approval validity window is unsigned.

**Severity: MEDIUM · LATENT (requires store write — the threat model you yourself used to justify signing `requiresPhysicalConfirm`)**
**Construct:** `operationSigning.mjs` — `signOperation` payload: id, type, endpoint, commandType, params, createdBy, description, requiresPhysicalConfirm, clientId, affectedHash. **No `expiresAt`.** `signPendingConfirmation`: same omission. Your F-03 comment argues: the store is editable by an attacker who reaches it, therefore security decisions in it must be signed. Expiry is a security decision in the same store — it is the difference between "this approval died 120 seconds ago" and "this approval is still live." The sheet even *tells the operator* "expired before it was used. Nothing happened" — a claim the HMAC does not back.

**Scenario:** attacker (or a buggy admin script, or a Redis migration gone wrong) edits `expiresAt` on a previously pending destructive op to +30 days. `verifySignature` passes — expiry isn't in the payload. The op sits valid indefinitely; the in-process sweep only deletes by the (now forged) timestamp; a durable store's PSETEX was set at mint but a long-lived Redis entry can be re-SET. The 120s window — the thing the UI promises — is advisory, not authenticated.

**Fix is one line per payload**, with the in-flight-op caveat you already handled once for F-03 (JSON.stringify drops undefined → version the payload or accept a signature break on deploy). **Would a test have caught it?** Yes, trivially: negative-control "tamper expiresAt in the store, expect verify false" — today that goes green, which is the bug.

---

## F2-04 — The sheet never reads the stored op's `requiresPhysicalConfirm`; the non-destructive envelope doesn't carry it. Card 1.1's law has an exception.

**Severity: MEDIUM · LIVE**
**Construct:** `useConfirmationSheet.ts` — `StoredOperation` interface has no `requiresPhysicalConfirm` field, and `input.physical` comes from the *parent*, i.e. the mint-time envelope. For destructive ops that envelope carries it in `details`. For **non-destructive** ops, `stepConfirmation`'s result is `{ type, message, operationId, expiresAt, command, params, isDestructive: false }` — **no `requiresPhysicalConfirm`**, even though `preparePendingConfirmation` returned it. The stored record (GET /pending) has it; the hook's interface doesn't declare it; nothing reads it.

**Scenario:** "log a pain note for Jordan" with Sarah locked → deliberate + physical stamped at mint. Dock surface (or any second consumer that builds `SheetInput` from the stored op — the architecture's stated source of truth) computes `physical: false` → `allowedConfirmChannels` includes 'voice' → operator speaks, client submits `confirmChannel: 'voice'` → server 400 `physical_confirm_required` *after* the arm delay, chip alarm never fired, error surfaces post-submit. The server catches it (good), but the ceremony — the entire point of stamping at mint — renders wrong on the lane "most confirmable commands take."

**Would a test have caught it?** Yes: integration test that mints a physical non-destructive op, GETs /pending, mounts the hook with `SheetInput` derived from the stored record, asserts voice is refused *client-side*. Red today. Fix: add the field to `StoredOperation`, prefer it over `input.physical`, and copy `requiresPhysicalConfirm` into the non-destructive envelope.

---

## F2-05 — Render digest ships observe-by-default, and the claimed observe telemetry does not exist. M1 is unenforced in production for any client that omits the digest.

**Severity: MEDIUM · LIVE**
**Construct:** `aiCommandRoutes.mjs` — `digestMode = ... === 'enforce' ? 'enforce' : 'observe'`. Missing digest in observe mode: **no event is recorded at all.** The comment claims observe "accepts a missing digest and only counts it" — there is no counting. Nothing in the evidence section states the production value of `APPROVAL_RENDER_DIGEST`, and the default in code is observe.

**Scenario:** any client that never computes a digest (old tab, script, third surface) confirms by operationId alone, forever. You can never safely flip the flag either, because the measurement that would tell you the rollout is complete is the measurement you didn't write. Compare with the channel flag, where you *deliberately* defaulted enforce and wrote a paragraph about how "shipping a security control switched off is how `allowedConfirmChannels` became decoration." The digest is a security control shipped switched off, with a comment claiming instrumentation that isn't there.

**Would a test have caught it?** Yes: route test, observe mode, POST /confirm without digest, assert a RENDER_MISMATCH-family event was recorded. Red today — the code path falls straight through to execution with zero writes.

---

## F2-06 — `IRREVERSIBLE_FALLBACK` is not "at risk of drift." It is already wrong at birth, in both directions.

**Severity: MEDIUM · LIVE (low harm per event)**
**Construct:** `useConfirmationSheet.ts` — `new Set(['notify_client', 'delete_post', 'export_client_list'])`. Your own §4.1 lists `delete_workout_plan` as a registered destructive command; it is not in the set. `delete_post` is in the set; `notify_client` — a notification — is badged irreversible while actual destructive person-commands (`block_user_posting`, `promote_to_trainer`, `revoke_trainer_permission`) are not. The F-21 comment you corrected is now honest about the mechanism but still describes the risk as future tense.

See §4.3 for the verdict.

---

## F2-07 — `inputMode` plumbing is asserted, not shown. Prove it, or this is inertness #4 wearing a fail-closed costume.

**Severity: UNVERIFIABLE from this packet · demand evidence**
**Construct:** `commandExecutor.mjs` — `inputMode: ctx.options?.routeContext?.inputMode ?? null`. Your comment says `buildCommandRouteContext` "ships `source` and `intent`" — neither is `inputMode`. The claim "useCoachCommand sends 'text' for the typed lane" is a frontend→HTTP claim; nothing in the appendix shows the body field surviving `buildCommandRouteContext` into `ctx.options.routeContext.inputMode`. And no surface in anything you've shown ever sends `'voice'`.

Two live possibilities, both bad in different ways:

1. **Plumbing absent** → every request is `null` → every identity-crossing op demands a tap regardless of channel, including pure typed flows. Fail-closed, yes — but a confirm that always fires is, by your own arm-delay commentary, the fastest route to tap-without-reading habituation. Per-event safer, systemically worse.
2. **Voice surface transcribes then posts as text with `inputMode: 'text'`** → `knownSafeChannel` is true on every voice-originated command → `physical` is never true for the channel that actually mishears → **M3 is inert a third time**, and every test passes because the tests send `inputMode: 'voice'` straight into `resolveVoiceConfirmationTier` — the *identical bypass* that hid the original bug.

**The demand:** one pipeline-level test that drives HTTP → executor with a voice-provenance body and asserts `reasons` contains `voice_identity_crossing` (not `unproven_channel_identity_crossing`, not nothing). If you cannot produce it, the M3 rule has still never fired for a voice input in this codebase.

---

## Lower severity

**F2-08 (LOW, LIVE):** `verifyAndRetrieveOperation` emits `CONSUMED` before execution is attempted, and nothing emits a terminal event after. The card-1.0 funnel cannot distinguish "executed" from "consumed then downstream-failed" — the burned population is invisible, which is the exact population the guidance was rewritten for. Also `cancelOperation`/the `/cancel` route omit the `destructive` flag on CANCELLED while MINTED carries it — the funnel's denominators don't join.

**F2-09 (LOW, LATENT):** `hasExplicitScope` accepts `someId: 0` (`v !== null && v !== undefined && v !== ''` — zero passes). Scope "satisfied" by garbage. Downstream normalization nulls it at mint, so this manifests as confusing refusals, not bypasses — but the scope law's test should pin `> 0` for id-like keys.

**F2-10 (LOW, LATENT):** the sheet's `already_confirmed → confirmed_elsewhere` branch (F-02's fix) depends on `executeConfirmedOperation` surfacing `code: 'already_confirmed'` in an HTTP error body. That mapping is not in the appendix. If the route 500s generically, the state lands in `burned` — guidance differs ("may have gone through") but `allowReissue` is false either way, so the safety property survives. Verify the mapping; don't let F-02's fix rest on an unshown contract.

---

# §4 — Direct answers

**4.1 — Not a non-issue, and your reason for not fixing it is backwards.** Five of the thirteen are destructive acts on a person; `requiresClientRef: true` is five booleans in a registry, not architecture. The claim "closing it changes escalation behaviour for all 13" is wrong in the direction that matters: the tier machinery only ever escalates, and the F-05a comparison only fires when spoken name and selection **disagree**. Matching-name flows are byte-identical. The blast radius of the fix is zero for correct usage and "deliberate ceremony" for mismatched usage — which is the product.

Is `resolveCommandClientPair` the F-05a tautology again? Depends on resolver precedence you didn't include, so answer it with a test: pipeline-mint `delete_workout_plan` with a spoken name resolving to client B while client A is locked, assert `cross_client` or `unplaceable_spoken_ref` in reasons. If params.clientId for non-clientRef commands is backfilled *from the locked selection*, then `target ≡ locked` for all 13 and the comparison **can never fire** — inert control #4. That test decides it in ten minutes.

Exploit path for the five: yes. Misheard name → wrong resolution → no clientIdentity captured (early return) → no comparison → op mints scoped to the wrong person → ceremony renders "…for WrongName," which looks *plausible*, and habituated operators tap. The lane's threat model is precisely human inattention; this feeds it.

**4.2 — Keep it; not worse than nothing. Two conditions.** Your honest-scope discipline is correct and unusually good. (a) The `TIER_SPOOF` counter must actually be monitored — an alarm nobody reads is the observe-mode problem again. (b) The one place the framing leaks is the architecture diagram ("requiresPhysicalConfirm && channel ∉ {tap,keyboard} ⇒ 400"), which reads as enforcement without the caveat. Put "client's word" in the diagram or the README, because that diagram is what an auditor will read. If you want the control to stop being the client's word without new storage: the nonce from F2-01, posted as a field at /confirm, derived from the operationId, is exactly the shared-secret-shaped upgrade — and it's already written and tested. It's just not called.

**4.3 — Ranked below 4.1** (wrong-record destructive writes > missing badge), **but it is not hypothetical drift, it is present wrongness** — see F2-06. The fix pattern already exists in your own repo: `destructiveScopeLawRegistry.test.mjs` pins law-to-registry. Pin the badge to a registry flag stamped at mint, include it in the digest subject, and delete the fallback list in the same release — running both sources during a transition *is* the drift you're worried about. A registry-pinned test would have caught today's wrongness (delete_workout_plan unbadged) immediately.

**4.4 — Real gap, and it's a symptom of F2-01.** `readBackSlots` unrendered is not decoration-adjacent; it means the `read_back` tier has **no behavioral difference from `fire_and_forget` anywhere**: arm delay is 0 for both in the common case, no echo UI, no correction slot. Count what does work in the tier contract: `physical` (enforced), `refusal` (short-circuits), `requiresSpokenYes` (dead, F2-01), `read_back` (nominal). Two of four ceremony behaviors are wired; two are not. Keep sending the fields — they're the contract — but don't describe the file as "one confirmation contract every surface consumes" until a surface consumes them.

---

# Fixes that are wrong or worse

- **The no-default `inputMode` change:** directionally correct, incomplete (F2-07). It is also inconsistent with the `requiresPhysicalConfirm = false` default two files away (F2-02) — finish the law you just wrote down.
- **Fail-closed unproven-channel treatment:** if the plumbing gap in F2-07 case 1 is real, this turns M3 from inert to *noisily over-firing on typed lanes*, which manufactures the tap-blindness the arm-delay comment warns about. Safer per event, worse systemically. The plumbing evidence decides which regime you're in.
- **Observe-mode digest comment** claims counting that doesn't exist (F2-05). The comment is wrong; worse, it makes the flag look instrumented when it isn't, which is how a rollout flag becomes permanent.
- Everything else I attacked — the atomic consume, ownership-before-consume, peek shape uniformity, HEX64 pin, F-13/F-14 hooks, nonce *implementation* (the code is good; it's the wiring that's dead) — held up.

---

# Attacking the evidence

Your negative controls prove **the test touches the guard**. They cannot prove **production reaches the guard** — that is the exact epistemic gap that let inert-M3 survive three rounds, and F2-01 survives now: every nonce test calls the function directly; no test asserts a caller exists. Two cheap systemic fixes:

1. **`no-unused-exports` / knip in CI.** `allowedConfirmChannels` (round 1), `nonceSatisfied`+`spokenNonce` (now) would all have been flagged mechanically. This is the control for the control-class.
2. **One reachability test per security verdict, driven HTTP→executor with honest inputs** — voice-provenance body for M3, bare-yes-accepts-nothing for deliberate, missing-digest-counts for the rollout flag.

The 9,990/292/394 numbers would all stay green under F2-01, F2-03, F2-05, and F2-06 today. That's four of this round's findings invisible to the entire gate. And `tsc --noEmit` OOM means the frontend type surface — where F2-04's interface gap lives — is unchecked repo-wide; "zero diagnostics in a config-less scoped run with known-broken path aliases" is not a claim you should let stand in the packet.
