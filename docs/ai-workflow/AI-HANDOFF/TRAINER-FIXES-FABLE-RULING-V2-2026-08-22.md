# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** C:/tmp/fable-final-doc-v2.md
**Seed:** C:/tmp/trainer-fix-diff-v2.txt
**Tokens:** 25811 in / 13233 out · **Cost:** ~$0.9198 · **Wall:** 182.0s

---

## VERDICT

**SHIP-WITH-CHANGES** — One real disclosure remains (the roster paints for one frame under the wrong actor, the exact defect class the author's own addendum defines), and it takes ~10 lines to close; nothing else blocks.

## WHERE THE AUTHOR IS STILL WRONG

**1. `GlobalClientContext.tsx` — the fix's own reasoning was applied to `activeClient` and not to `clientList`.** The addendum states the principle correctly: *"clearing the selection in an effect cannot close that hole, because effects run after commit."* Then the code derives `activeClient` at render time from the actor stamp — and leaves `clientList` cleared **only by the actor-change effect** (`setClientList([])`). Failing input: Trainer A's roster is loaded; Trainer B logs in on the same kiosk; the provider re-renders on the auth change **before** any effect runs; that commit exposes A's full `clientList` — names and emails, straight into any consumer that renders the roster (the client-switcher dropdown does). One frame, same kiosk, same disclosure Sol found, one door over. The test suite cannot catch it: `renders[]` in `actorSwitch.test.tsx` records only the active-client string; the roster testid is asserted only at settled state via `waitFor`. This is precisely the shape of the tautological-test failure from round one: the transient is the finding, and the transient is what the test doesn't record.

**2. The `deactivateAssignment` "repair" is a disproval-by-reading.** The comment asserts the old route 404'd and the new call is `PUT /:id { status: 'inactive' }` — but nothing in the evidence demonstrates the backend `PUT /:id` handler **accepts and applies** a `status` field, or that the calling role is permitted. If that handler whitelists fields and returns 200 while ignoring `status`, deactivation silently no-ops, `reassignClient` POSTs a new assignment, and **two active rows** exist — Kimi's exact defect, resurrected through the write path the same branch hardened on the read path. "The route exists and I read it" is the reasoning the author indicted the original audit for. Unverified ≠ fixed.

**3. Minor hardening: the null-stamp collision.** `activeClientStorageKey` deliberately returns `null` for an unusable actor "so there is no shared fallback key" — but the render-time derivation `activeClientState.actorKey === currentActorKey` treats `null === null` as a **match**. The in-memory stamp has the exact shared-fallback the storage key refuses to create. Mitigated today by strictly numeric IDs; one guard (`currentActorKey === null` → expose null) makes the invariant unconditional.

**On the disprovals:** the GLM D9/D11 disproval is sound (the stamp subsumes the guard, and the empty-successful-load case is now provider-mounted-tested). The Kimi sibling-sweep disproval is sound — row-query scoping is genuinely stronger than a post-hoc check, and historical access is an owner ruling with a date. The Sol zero-PII downgrade to "unverified in both directions" is the correct posture and I accept it as stated — it is a residual risk, not a disproval.

## RULING ON THE JUDGEMENT CALLS

- **Clamp-vs-throw:** UPHELD — a read path on the drag-drop hot path where no foreign data is ever returned may clamp; the log is the evidence base for a later hard-deny, and the hardened write path is the backstop.
- **Client name in conflict payload:** UPHELD — the leak was the scope, not the field; with the subject clamped every name is the caller's own client, and stripping it breaks `ConflictPanel.logic.ts:41` for zero security gain.
- **excludeSessionId unclamped:** UPHELD — with the trainer axis clamped and the client axis assignment-gated, excluding a foreign id cannot alter the result set, so no oracle exists; the reasoning is conditional on the clamp and must be revisited if the clamp ever loosens.
- **Fixing dead code:** UPHELD IN PRINCIPLE, DEFICIENT IN EXECUTION — keeping the service to stop future misdiagnosis is right; shipping a "repaired" write call whose backend contract was never exercised recreates the trap it was meant to remove (see gate #3).
- **SOFT escape hatch:** UPHELD as code, REJECTED as process — leaving the hatch is correct, but "an in-repo memo carries an owner action" is not a control; a single env var voids P0-2 entirely, so its absence becomes a deploy condition, not a hope.
- **Fail-closed-to-empty vs storage_unavailable:** UPHELD — `[]` and "we cannot tell" are opposite meanings sharing a value; the throw-and-map is the correct shape and the empty-roster short-circuit correctly preserves the honest `empty` status.

## WHAT NOBODY SAW

**The unstamped roster.** Seven seats, two hostile rounds, a rewritten provider-mounting test suite, and an addendum that articulates *in writing* why effect-time clearing cannot prevent a one-frame disclosure — and the branch ships a `clientList` that is cleared only in an effect. The fix is already in the file, applied to the wrong-er of the two values: derive the exposed roster exactly the way `activeClient` is derived — `rosterActorKey === currentActorKey ? clientList : []`. This works at render time with no effect needed, because `currentActorKey` is computed from `user` synchronously in the render while `rosterActorKey` still carries the previous actor's stamp; the mismatch zeroes the list in the very commit that would otherwise disclose it. Everyone audited the pin because the pin was the finding. The roster carries strictly more PII than the pin and got strictly weaker treatment.

## DEPLOY GATE

1. **Derive exposed `clientList` at render time from the actor stamp** (`rosterActorKey === currentActorKey ? clientList : []`), and extend `renders[]` in `actorSwitch.test.tsx` to record the roster per render, asserting no post-switch render contains the previous actor's client ids. Include the `currentActorKey === null` guard on both derivations while in the file.
2. **Confirm `AI_CHAT_CLIENT_ACCESS_SOFT` is unset in the Render production environment**, verified by a named person before push — not a memo line. In SOFT mode, P0-2 warns and continues; the fix's efficacy is an env-var away from zero.
3. **Demonstrate `PUT /api/client-trainer-assignments/:id` with `{ status: 'inactive' }` actually flips the row** — read the handler and add one test proving a 200 corresponds to a persisted status change and that the response isn't a field-whitelisted no-op. If the service genuinely has zero live callers and this can't be done today, annotate the method `UNVERIFIED CONTRACT` in-code so the next wiring-up doesn't inherit a plausible-looking lie.

Nothing else. The deferred items stand deferred.

## RESIDUAL RISK

- **Sanitizer completeness (zero-PII rule):** the control runs but its coverage is unaudited in both directions; if it misses a field, live client data reaches the LLM in violation of a binding house rule. Cost if it bites: contractual/compliance, not merely cosmetic. Schedule the completeness audit as the first fast-follow.
- **Grok's 403-swallow:** a trainer denied on `clientId` sees "no conflicts," drags, and is denied at write time — confusing, never wrong-write. Cost: support tickets, trainer trust.
- **Sol #13:** the moderation assignment check takes no transaction and no row lock; the TOCTOU window is now milliseconds, not minutes. Cost: a just-unassigned trainer approving one submission in a race.
- **DeepSeek Flash cohort over-block:** if submissions are legitimately reviewable along a non-submitter axis, trainers see an empty queue for real work. Cost: silent workflow breakage, discoverable only by complaint — watch for it in week one.
- **De-assigned trainers listing historical threads:** intentional per the 2026-07-30 owner ruling; ships as designed.
- **Pre-existing debt:** 561- and 718-line files, six unrelated failing suites. Known, tracked, not this branch's to carry.
