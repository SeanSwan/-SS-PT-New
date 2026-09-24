# Swan Coach approval lane — hostile round 2 packet — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-JARVIS-P1-ROUND2-BUNDLE.md
**Tokens:** 24136 in / 29063 out (reasoning: 23783) | total 53199
**Wall:** 466.7s

---

# Hostile round 2 — Swan Coach approval lane

You asked for the next inert-by-construction control. I found **three dead branches and one probably-dead gate**, plus the compound version of your own §4.1 which is worse than you framed it. Leading with those; the rest is ranked behind.

---

## R2-1 — [LIVE · Critical for the lane's stated promise] §4.1 is not "skipped identity comparison." The early return neuters **four controls at once** for 13 commands, including the entire human read-back for the five destructive-on-person commands.

**Files/constructs:**
- `commandExecutor.mjs`, `resolveTierForCommand`: `identity` is `ctx.clientIdentity`, which `stepResolveClient` never sets when `requiresClientRef !== true`. For those commands you fall to `resolveCommandClientPair(ctx.intent?.params, ctx)`.
- `voiceConfirmationTier.mjs`: `const physical = !knownSafeChannel && identityCrossing.length > 0 && …` — `identityCrossing` is only fed by `cross_client` (both ids non-null), `unlocked_target` (target non-null, locked null), or `unplaceableSpokenRef` (requires `ctx.clientIdentity`).
- `commandExecutor.mjs`, destructive mint: `affectedRecords: ctx.resolvedClient ? [{ id, name }] : []` and `clientId: ctx.resolvedClient?.id ?? null`.

**Why it's inert by construction:** `delete_workout_plan`, `delete_post`, `block_user_posting`, `promote_to_trainer`, `revoke_trainer_permission` are scoped by `planId` / `postId` / `userId` / `permissionId`. Unless `resolveCommandClientPair` resolves the *owner* of a postId into `pair.target` — nothing in its name, its other use here, or your §4.1 description says it does — `pair.target` is null for all five, always. Target null ⇒ none of the three identity-crossing triggers can fire ⇒ **`requiresPhysicalConfirm` is structurally false for every invocation of these commands, on every channel, forever.** That is F-03's corpse wearing a new coat: the M3 rule now fires — just never for the commands that act on a person.

Worse, and this is the part your §4.1 understates: `ctx.resolvedClient` is also unset, so the five mint with `affectedRecords: []`, `affectedCount: 0`, `clientId: null`. The sheet — the M1 control whose entire reason to exist is "render the stored record so the human sees what the machine will do" — renders **"Delete post · postId 882 · no-client chip · no alarm"**. The digest faithfully proves the human saw a *nameless entity id*. The chip ("no client") is the baseline for these commands, so nobody flags it. The identity-safety apparatus of this lane — M3 stamp, client binding, chip alarm, person in the read-back — is data-starved by one early return.

**Failure scenario:** Trainer has Alex (17) locked. Says "delete Jordan's post." NER resolves the mention to `postId: 882` — the wrong Jordan (homophone, two Jordans in the roster, or "most recent post" default on an ambiguous reference). Mint: `delete_post`, `affectedRecords: []`, `clientId: null`, `requiresPhysicalConfirm: false`. Sheet shows no person; voice confirm is permitted (nonce digits are on the screen the trainer is reading anyway); op executes. Wrong person's content destroyed, and **no layer in this lane ever held the data that could have caught it.**

**Verdict on your fallback question:** `resolveCommandClientPair` is not "the same tautology F-05a was" — it's one layer worse. F-05a compared a value against itself; this compares nothing against nothing. A guard that cannot fire is not a fallback, it's a comment with a return value.

**Would a test catch it?** Yes, and its absence is the tell: a *pipeline* test — mint `delete_post` with lock=A and an entity owned by B, assert `requiresPhysicalConfirm === true` and `affectedRecords[0].name` populated — fails today. Every test you have drives the tier function with hand-built ctx, the exact bypass shape that hid the inputMode bug.

**On your "product decision, not a bug fix" framing:** backwards. For the five destructive ones this is a security gap in the lane's core promise; the product conversation can be about the 8 non-destructive. Minimal correct fix: for destructive commands, resolve the entity's owner at mint (one lookup) and stamp it into `clientId`/`affectedRecords`/the tier call. If that's too slow, at minimum refuse to mint a person-acting destructive op with `clientId: null`.

---

## R2-2 — [LIVE in default config · High] The observe-mode render-digest counter does not exist. The comment says "accepts a missing digest and only counts it" — nothing on that path counts.

**File:** `aiCommandRoutes.mjs`, `/confirm`:

```js
const digestMode = process.env.APPROVAL_RENDER_DIGEST === 'enforce' ? 'enforce' : 'observe';
...
if (renderedDigest !== undefined && renderedDigest !== null) { ... }
else if (digestMode === 'enforce') { recordApprovalEvent(RENDER_MISMATCH, ...) ... }
```

In observe mode with a missing digest, **no branch runs and no event is written.** Compare the channel split's observe path three screens down, which does record `TIER_SPOOF / physical_confirm_observed`. So:

1. The default config accepts digest-less confirms from every client that isn't the new sheet — including every currently-deployed client — so the stale-tab/op-swap attack M1 exists for is open in production against your existing fleet.
2. The stated purpose of observe ("measure before enforcing") is impossible: the metric that would tell you when to flip to `enforce` is never collected. Enforce day can only arrive by fiat, which is precisely how `allowedConfirmChannels` became decoration.
3. The justification is rotted on its face: "so this can ship before the sheet does" — the sheet is in this same branch. Both confirm callers are swept. You shipped the control off, past the point where the excuse applied, with no counter — that's your own §0 pattern, item one, reproduced.

**Would a test catch it?** Yes: assert that an observe-mode confirm without a digest records an event (`digest_missing` or similar). No such test exists because no such code exists. Flip the default to `enforce` and add the counter for whatever window remains.

---

## R2-3 — [LIVE if the voice confirm path shipped · High, one line of code from proven] The spoken nonce has no consumer reachable from the hook's API. This is probably inert control #3.

**Files:** `confirmationSheetState.ts` exports `spokenNonce` and `nonceSatisfied` — hardened twice (F-07), extensively documented. `useConfirmationSheet.ts` owns the only `confirm()` in the codebase:

```js
const confirm = useCallback(async (channel: 'tap' | 'keyboard' | 'voice' = 'tap') => {
```

**The hook's confirm API has no slot for a transcript.** A component *could* pre-gate — call `nonceSatisfied` itself and only then call `confirm('voice')` — but nothing shown does, `ConfirmationSheet.tsx` is not in the packet, and your §1 wire diagram (`POST /confirm {operationId, renderedDigest, confirmChannel}`) has no nonce anywhere server-side, consistent with a client-only gate that may simply never be consulted. Given that this session has already produced two "exported, tested, documented, uncalled" guards in exactly this file family, the burden is on you: show the consumer, or this is the third.

**And the matcher itself is still holed:** `nonceSatisfied` anchors on `lastIndexOf('confirm')` and never looks *before* it. **"No — don't confirm four seven two" satisfies the nonce.** So does "remind me to confirm four seven two later" (trailing words are filtered out of the digit stream, so the digits are still "last" among digits). The F-07 anchoring fix closed the digit-stream-in-a-readback hole and opened a negation hole.

**Would a test catch it?** The negation hole: yes, trivially (`nonceSatisfied("don't confirm 4 7 2", id)` should be false). The no-consumer question: only a test that drives `confirm()` through a voice-transcript flow — which is the same "test the caller, not the function" lesson as inputMode, still not applied to the nonce.

---

## R2-4 — [LIVE · Medium-High] The non-destructive envelope drops `requiresPhysicalConfirm`, the hook ignores the signed copy on the stored op, and a resulting server refusal is mapped to `burned` — telling the operator an action "may have gone through" for an op that never ran and is still pending.

Three stacked defects:

1. **`commandExecutor.mjs`, non-destructive result literal:** `{ type, message, operationId, expiresAt, command, params, isDestructive }` — no `requiresPhysicalConfirm`, no `physical`, no `tier`. The destructive literal carries it via `details: pending`; the soft lane — the lane *most* commands take — omits it. If the route merges `ctx.confirmationTier` downstream, prove it; the literal as shown drops it.
2. **`useConfirmationSheet.ts`:** `chipAlarm = input.physical || …` — derived solely from the envelope-passed input. The hook holds `operation` from `GET /pending/:id`, and `peekOperation` returns `requiresPhysicalConfirm` **signed by the server** — and the hook never reads it. The authoritative field is on the wire, in the hook's state, and ignored. That's a miniature of the inputMode bug: truth available, unread, envelope preferred.
3. **`confirmationSheetState.ts`, `submitting`/`server_refused`:** the code ladder handles `render_mismatch`, `render_digest_required`, `expired`, `not_found`, `already_confirmed` — everything else falls to `return 'burned'`. **`physical_confirm_required` lands in `burned`**, whose guidance is "Your approval was used but the result never came back. It may have gone through. Check the history before re-issuing," `allowReissue: false`. That refusal happens *before* consumption — nothing executed, the op is still live — yet the sheet goes terminal, lies about the worst case, and blocks re-confirmation of a still-pending op. You fixed this exact shape for `already_confirmed` (F-02) and reintroduced it one code down for a *clean pre-execution refusal*.

**Failure scenario:** voice input, no lock, "log a set for Jordan" (unlocked_target → `physical: true`), non-destructive mint stamps `requiresPhysicalConfirm: true`, envelope drops it (1), sheet's `input.physical` is false (2), operator says the nonce, client calls `confirm('voice')`, client gate passes (`channelPermitted` sees physical=false → voice allowed), server 400s `physical_confirm_required`, sheet → `burned` → "it may have gone through." Operator checks history for a write that never happened and re-issues, minting a second op while the first expires noisily.

**Would a test catch it?** Three tests, all absent: (i) unit — `nextState('submitting', {type:'server_refused', code:'physical_confirm_required'})` must not be `burned`; (ii) hook — stored op with `requiresPhysicalConfirm: true` and `input.physical: false` must refuse `confirm('voice')` client-side; (iii) pipeline — non-destructive `confirmation_required` envelope contains `physical`. Fix (2) by making the server truth win: `physical = input.physical || Boolean(operation?.requiresPhysicalConfirm)`.

---

## R2-5 — [LATENT · Medium] `hasExplicitScope` checks *presence*, not boundedness. The word "bounded" in your own comment is enforced by nothing.

**File:** `destructiveOperations.mjs`:

```js
return Object.entries(params).some(([k, v]) =>
  (k === 'id' || k === 'dateRange' || /Id$/.test(k)) && v !== null && v !== undefined && v !== '');
```

`{dateRange: {}}` passes. `{dateRange: 'all'}` passes. `{id: 0}` passes (0 is not `''`), as does `id: ' '`. If any future destructive command accepts a dateRange — the event your own registry test is designed to flag — the scope law will wave through an *empty* range object, and `MAX_AI_BULK_DELETE` won't save you because it caps only the caller-supplied preview (your H8 comment already concedes this). The comment says "or a bounded dateRange"; the bound is a comment. It is safe today only because no such command is registered — the same "inert until the day it matters, then actively wrong" shape.

**Would a test catch it?** Yes — `hasExplicitScope({dateRange: {}})` unit test. Add it, and make dateRange require two parseable bound dates.

---

## R2-6 — [LATENT · Medium, demand a test] When a lock exists, a params-sourced target is never compared — `cross_client` cannot fire from `params.clientId ≠ lockedClientId` whenever `ctx.clientIdentity` exists.

**File:** `commandExecutor.mjs`, `resolveTierForCommand`:

```js
const targetClientId = identity
  ? (identity.spokenClientId ?? (identity.spokenRef && !identity.lockedClientId ? pair.target : null))
  : pair.target;
```

With `identity` present and a lock set, `pair.target` (which *does* read params) is deliberately nulled unless `spokenRef` is set. So if a name reaches `params.clientId` through the classifier without `stepResolveClient` capturing it as `spokenRef`/`spokenClientId` — capture that F-05a's own fix treats as best-effort (`unplaceableSpokenRef` exists precisely because capture fails) — the tier sees `target: null, locked: A` and stays silent, on the **voice** lane. The entire M3 rule for client-ref'd commands then hangs on spoken-name capture never silently failing. Prove it with a pipeline test: voice `inputMode`, lock=A, `requiresClientRef` command, params `clientId=B`, identity with `spokenRef` absent → assert `verdict.physical === true`. If that test can't be made to pass, the loudest crossing case is blind.

**Would a test catch it?** Only that pipeline test. No current test can, for the usual reason.

---

## R2-7 — [LIVE-trivial severity, maximum signal · Low] The F-09 route "fix" is a no-op. `operation.destructive` is written by no mint anywhere; the left side of the `??` is dead by construction.

**File:** `aiCommandRoutes.mjs`, `/pending`:

```js
destructive: Boolean(operation.destructive ?? (operation.kind !== 'pending_confirmed')),
```

Neither `prepareDestructiveOperation` nor `preparePendingConfirmation` sets a `destructive` field on the stored record — check both object literals. So `operation.destructive` is always `undefined`, the heuristic decides 100% of rows, and the comment claims the fix reads "a field the record already carries" — **it carries no such field.** Behavior is correct (the heuristic happens to be right), but you shipped a fix that changed nothing, documented it as a field read, and moved on. This is inert-branch #3, harmless in effect, and the most useful canary in the packet: your fix-verification process accepted a diff that provably alters no behavior. (Also: your F-09 table row describes the `roleRequired` normalization — two different findings are both wearing "F-09".)

**Would a test catch it?** No — behavior-identical, which is exactly why it deserves naming. A mint-shape test asserting the fields the read side expects would.

---

## R2-8 — [LATENT · Low] Explicit-`undefined` params break digest parity: the in-process store holds the live object; the client sees the JSON round-trip.

`structuredClone` preserves keys with `undefined` values; HTTP JSON drops them. Server computes `renderDigestOf(stored)` over the reference object (`undefined` → `'null'` in canonicalJson), client computes over its JSON'd copy (key absent). Any mint whose params carry an explicit `undefined` produces a confirm that can never pass — a false `render_mismatch` on a legitimate flow, terminal, until expiry. The shared fixture cannot catch this: fixtures arrive via JSON, so the divergent shape is unrepresentable in it. Fix cheaply at mint: canonicalize with `JSON.parse(JSON.stringify(commandParams))` instead of `structuredClone` — you lose nothing the wire preserves anyway, and both sides then see the same object. **Would a test catch it?** Yes: parity test with server subject from the live object and client subject from `JSON.parse(JSON.stringify(op))` with `undefined` present.

---

# §4 — direct answers

**4.1 — You have not called it wrong; you have called it too small.** See R2-1: not a product decision for the five destructive commands; the fallback pair is vacuous for entity-scoped commands; the exploit path is real and ends in a nameless sheet. This is your top open item and it is LIVE.

**4.2 — Not worse than nothing, on three conditions, and it becomes worse the day any one breaks:** (a) no first-party surface declares a channel it cannot mechanically prove — the Command Center card must declare `'tap'` only from a pointer event; if it offers any voice confirm while declaring `'tap'`, *your own client is the forger* and the audit trail launders it; (b) the channel is never recorded or rendered as fact — today CONFIRMED/CONSUMED events don't carry it, keep it that way or store it as `declaredChannel`; (c) the docs keep the seatbelt framing. It closes the accidental class, which is the class the incident actually was. Add one test per surface: the voice interaction path must transmit `'voice'`. The false-sense risk you're worried about is real but it's a *documentation* failure mode, and your comments already resist it.

**4.3 — Real, but ranked strictly below 4.1, and it isn't close.** 4.1's worst case: wrong person, destructive, no identity control had data, sheet shows no name. 4.3's worst case: an irreversible action still passes deliberate tier, arm delay, read-back, and digest — it just lacks one badge. Keep the worry, lose the ranking doubt: 4.1 now, 4.3 with card 4.2. When you do it, stamp `irreversible` at mint from the registry and **delete** `IRREVERSIBLE_FALLBACK` — the forward slot already prefers `operation.irreversible`, so the client change is pure deletion. (Your corrected comment on that block is honest and good.)

**4.4 — Non-issue; delete the worry.** `readBackSlots`/`tierReasons` are telemetry, not a control — nothing can fail by being unconsumed. Either feed them to the metric card (they're your only per-request record of *why* `physical` fired, i.e., the evidence for the observe/enforce decisions) or drop them from the wire. The adjacent *real* issue is `physical` threading into every confirm surface (R2-4) — spend the worry there.

---

# Attacking the evidence (§5)

- **"failing files 7 == baseline 7, exit 0"** — the gate compares a *count*, not identities. Any regression that lands in one of the seven sick files is permanently invisible; fix one sick file and break a healthy one and the gate stays green. Pin the baseline to sorted file paths, not a number. A gate that exits 0 while four tests fail has learned to tolerate failure by quota — in the seven files where you'd least want it.
- **"Every security assertion is negative-controlled"** — every control you listed was mutated at its *unit seam* (the tier function, the signing payload, the guard clause). The inputMode bug survived an identical regime because the mutation site and the wiring site differ. The only wiring-level negative control you ran was the `ctx.routeContext` reintroduction. Extend the technique: reintroduce `?? 'text'` at the caller, delete the nonce consumer, unthread `physical` from the sheet — each should turn a *pipeline/component* test red.
- **Frontend 394/394** — green regardless of whether `nonceSatisfied` is called by anything (R2-3). Pure-function suites cannot see wiring; you proved that this session and then re-relied on the number.
- **tsc OOM** — accepted, but note that the one place a type would have earned its keep (`nextState`'s code ladder falling through to `burned`, R2-4) is semantic, not typable; a table-driven test on every emitted `code` is the substitute.
- **No browser journey** — fine, but it means the `crypto.subtle`-absent path ("sheet surfaces a plain error rather than silently confirming") is claimed, not observed. The claim is *true* by construction (the throw lands in the read `catch` → `unavailable`), which is good — that one I verified from the code.

---

# Fixes that are wrong, no-ops, or regressions

- **F-09 route fix: no-op** (R2-7). Not worse than what was there, but it is not a fix, and it's documented as one.
- **`physical_confirm_required` → `burned`: worse than nothing** — a new code path that mislabels a clean refusal as possible-execution, in the state machine you specifically hardened in F-02/F-04.
- **Digest default `observe`: wrong *now*** — was defensible before the sheet existed; the sheet is in this branch; the counter that justified waiting was never written (R2-2).
- **F-07 nonce hardening: right idea, incomplete** (negation, R2-3), and possibly guarding nothing.
- **Fixes I'd endorse as correct:** removing the `?? 'text'` default (fail-closed on absence is right, and voice-by-default-unproven is the safe polarity); `confirmed_elsewhere` as a terminal state; the delete-return-value consumption discipline; signing the approver-read fields; the `escalate`-only-up tier ladder; the M3 enforce-by-default channel mode (the asymmetry with the digest mode is argued and I accept the argument — for the channel; the digest's mirror-image argument fails because the counter doesn't exist).

---

# What I could not verify — produce these or their assertions stay open

`resolveCommandClientPair` (load-bearing for R2-1/R2-6 — if it resolves entity→owning client, R2-1 downgrades from "proven by structure" to "proven by one function I haven't seen"), `ConfirmationSheet.tsx` (R2-3 consumer), `useCoachCommand`'s channel declaration and its handling of `physical_confirm_required` (R2-4), `executeConfirmedOperation` (event emission for CONFIRMED/BURNED, code mapping), and the startup call site of `assertOperationSigningKey`.

You asked which control looks enforced but cannot fire. Answer, in order of confidence: **the M3 stamp for every `requiresClientRef !== true` command; the observe-mode digest counter that the comment says exists; `operation.destructive ?? …`; and probably the nonce.** Four dead branches in a lane that has already produced two — the pattern isn't that your controls keep failing, it's that your verification keeps certifying shape instead of wiring. Every demand above is a wiring test.
