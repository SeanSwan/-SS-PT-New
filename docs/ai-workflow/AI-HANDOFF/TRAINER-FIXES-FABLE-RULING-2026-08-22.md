# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** C:/tmp/fable-final-doc.md
**Seed:** C:/tmp/trainer-fix-diff.txt
**Tokens:** 20982 in / 15153 out · **Cost:** ~$0.9675 · **Wall:** 204.6s

---

## VERDICT

**HOLD** — Two of the fixes the packet claims as "found by the panel and fixed" (Kimi's normaliser throw and the empty-roster guard removal) are **not present in the diff at HEAD**, which means the verification record describes a different tree than the one being shipped.

## WHERE THE AUTHOR IS STILL WRONG

**1. `getClientAssignments` still silently returns `[]` — the packet's claimed fix is not at HEAD.**
`frontend/src/services/clientTrainerAssignmentService.ts`: the packet says "Now throws on `success === false` and on an unrecognised shape." The seed shows the opposite: no `success` check anywhere, and the final line is `return [];`. Failing input: `{ success: false }` on a 2xx — falls through every branch, returns `[]`, `reassignClient` believes there is nothing to deactivate, POSTs a new assignment, leaves **two active rows**. Downstream, `listAssignedClientIds` and `assertViewerMayModerate` both read the old trainer as still active — so the exact defect chain Kimi identified **nullifies the challenge-moderation scoping fix** for any client reassigned through this path. This is not a deferral; it is a claimed fix that does not exist in the code.

**2. The empty-roster guard the packet says was "removed" is still in the code.**
`GlobalClientContext.tsx`, rehydrate effect: `if (clientList.length === 0) return;` sits right there, after the stamp check. Failing input: trainer has client 42 pinned and rendered; admin unassigns 42; roster refresh returns a **successfully-loaded empty roster** for the correct actor. Stamp matches, `loadingClients` false, pin truthy, length 0 → early return. The stale `activeClientState` — full record, name and email — stays on screen, and the pin persists in storage. This is Kimi's dead-pin finding, verbatim, in the "fixed" state. The packet's sentence "the guard was removed and the claimed invariant is now actually true" is false against the seed. The invariant "a pin absent from the freshly loaded roster is dropped" fails precisely when the roster shrank to zero — the most likely shape of a revocation for a one-client trainer.

**3. The regression test for Sol's interleaving finding is tautological.**
`GlobalClientContext.actorScope.test.ts`, "refuses to resolve a pin against a roster stamped for a DIFFERENT actor": it asserts that two different strings are not equal (`expect(rosterStampedForA === currentActorIsB).toBe(false)`). It never mounts the provider, never runs the effect, never exercises the guard. The P1 fix that "survived inside the fix meant to prevent it" is protected by a test that cannot fail. "Fail-first proof for every fix" is not true of this fix.

**Premature disprovals:**

- **Sol's zero-PII claim.** The disproval is "the sanitizer exists and runs at :858, completeness not audited." That is exactly "I read the code and the control is there" — the reasoning the author condemned in the original audit. A binding zero-PII rule defended by an unaudited sanitizer is not a disproven violation; it is an **unverified control**. Downgrade the disproval to "unsubstantiated in both directions" and gate it (below).
- **GLM D9/D11.** Outcome is sound (mount and failed-fetch cases are safe via the null-stamp mismatch), but the disproval's narrative — "that guard has since been replaced by the stronger actor-stamp" — is contradicted by the guard still being in the file. A disproval whose stated mechanism is false doesn't get credit even when the conclusion holds.
- **Kimi's sibling sweep.** Sound. Row-level `userId` scoping is verified against source and is genuinely stronger than a post-hoc check; historical-thread access is covered by the 2026-07-30 owner ruling. This disproval stands.

**Likely root cause, and the author handed it to us:** the packet confesses a `git stash` incident where a repo-wide stash pulled another session's state into the tree. A packet that describes fixes absent from HEAD is the same failure class — the author verified a tree that is not the branch tip. The confession was honest; the consequence was not chased.

## RULING ON THE JUDGEMENT CALLS

- **Clamp-vs-throw on check-conflicts:** UPHELD — read-only route, foreign calendar never queried, mismatch logged; revisit hard-deny once the log shows real-traffic mismatch rates.
- **Client name in conflict payload:** UPHELD — with subject clamped and assignment asserted, every name is the caller's own client; the leak was the scope, not the field, and the reasoning is sound.
- **excludeSessionId unclamped:** UPHELD WITH CORRECTION — "cannot be an existence oracle" is overstated when `clientId` is supplied (exclusion also applies to client-conflict rows, letting an assigned trainer map session-IDs onto their own client), but everything revealed is within the caller's entitlement; coerce to a positive integer and move on.
- **Fixing dead code rather than deleting:** UPHELD CONDITIONALLY — ending the three-audit misdiagnosis loop is worth it, but this repair just made `PUT /api/client-trainer-assignments/:id` reachable from working UI code for the first time, and nobody audited that endpoint's authorization; that check is a gate.
- **AI_CHAT_CLIENT_ACCESS_SOFT left alone:** UPHELD — flipping prod behavior unilaterally is not this branch's job; but in SOFT mode the P0-2 fix is decorative (warn-and-enrich on a denied subject, per Kimi), so "confirm unset in Render env" graduates from owner memo to **blocking deploy precondition with evidence attached**.
- **Fail-closed-to-empty vs storage_unavailable:** UPHELD — the semantic distinction is correct and well argued; but the diff shows `closedQueue('storage_unavailable', STORAGE_UNAVAILABLE_MESSAGE)` where the pre-existing call was zero-arg, and neither the two-arg signature nor the `STORAGE_UNAVAILABLE_MESSAGE` binding is visible in the diff — given the author's own confessed undefined-`logger` near-miss, prove this resolves at runtime.

## WHAT NOBODY SAW

**The verification packet and HEAD are two different codebases, and the mechanism is the author's own confessed instrument failure.** Seven seats reviewed findings-and-responses; nobody diffed the packet's claims against the seed. Two of the three Kimi items are claimed fixed and are absent from HEAD — most plausibly because the author's working tree was contaminated by the cross-session `git stash` incident it reported as "discarded, not reported," and the fixes were verified in a tree that never became the branch tip.

Two genuinely unseen code findings on top of that:

1. **`ADMIN_CLIENT_LIST_LIMIT = 500` × drop-if-absent reconciliation.** The old effect kept a pin it couldn't find; the new one deletes it. An admin with more than 500 clients who pins a client outside the first page gets their pin silently destroyed by the very effect that renders it — `setActiveClient` writes the state, the rehydrate effect immediately nulls it and wipes storage. A security fix quietly converted a truncation limit into a data-loss bug for the largest customers.
2. **Per-actor pin keys are never purged on logout.** Only the legacy key is purged. A shared kiosk accrues `ss-active-client:<id>:trainer` entries for every trainer who ever used the tab. IDs only, so not a PII breach — but it is a permanent record of which trainer was pinned to which client ID, readable by anyone with the tab, and it contradicts the "cleared on actor change" story (the state is cleared; the storage entries persist forever).

## DEPLOY GATE

1. **Land Kimi's two fixes at HEAD for real**: normaliser throws on `success === false` and unrecognised shapes; empty-roster guard removed or replaced with explicit "loaded-empty drops the pin" handling. Fail-first tests for both, run against the actual branch tip, hashes recorded.
2. **Re-verify the whole packet against HEAD** — every "fixed" claim gets a line-number citation into the tip commit, not into a working tree. The stash contamination makes every unverified claim suspect.
3. **Replace the tautological interleave test** with a provider-level harness test that mounts the context and exercises an A→B actor switch.
4. **Evidence that `AI_CHAT_CLIENT_ACCESS_SOFT` is unset in Render production env**, attached to the deploy record.
5. **Authorization audit of `PUT /api/client-trainer-assignments/:id`**, now live via `deactivateAssignment`.
6. **One fail-first test on the Coach path** asserting the outbound LLM payload contains no client name/email for the trainer-opens-`role:'client'`-thread shape — the minimum needed to convert Sol's disproval from "the control exists" to "the control works."
7. Runtime proof that `closedQueue('storage_unavailable', STORAGE_UNAVAILABLE_MESSAGE)` resolves (signature + import).

Items 1–3 are the hold; 4–7 are ship-blockers that cost hours, not days.

## RESIDUAL RISK

- **Grok's 403-swallow**: a mis-scoped drag reads "no conflicts" until the hardened write denies it — confusing, not dangerous; accepted with the clamp logging as the tightening trigger.
- **DeepSeek Flash's cohort over-block**: if submissions are owned along a non-submitter axis, legitimate review work disappears from trainer queues — shows up as support tickets, not breaches.
- **Sol #13**: the moderation assignment re-check runs inside the transaction but takes no lock; a millisecond TOCTOU window remains. Acceptable *only once* the double-active-row defect is actually fixed — until then this window is not milliseconds, it is permanent, which is why gate 1 blocks.
- **Sanitizer completeness** beyond the single gated spot-check remains unaudited — the zero-PII rule is defended by one function nobody has read end-to-end.
- **Admin NaN subject**: an admin posting garbage `trainerId` to check-conflicts queries with `NaN` and gets an empty success — harmless, sloppy.
- **Per-actor key accrual and the >500 admin pin regression** ship unfixed if the owner accepts them; cost is a stale ID ledger on kiosks and a broken pin feature at scale, respectively — both should be tickets, neither blocks once acknowledged in writing.
