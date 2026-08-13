# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/ss-coach-gate0-20260812/docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-2-SHIPPING-DIFF-2026-08-13.md
**Seed:** (none)
**Tokens:** 1794 in / 5302 out | **Cost:** ~$0.0849 | **Wall:** 177.3s | **finish_reason:** stop

---

# Kimi review 2 — the four fixes

I cannot see the code; everything below is reasoned from your description. I mark inferences as **[INFERENCE]** wherever the claim is about code I haven't read. Ranked by how cheaply an ordinary trainer or client trips it, per your remit.

---

## 1. Fix 2 — the email-keyed existing-user path just lost its accidental guard

**What breaks:** Before this fix, `fullName`-less requests died at validation with a 400 — *before* reaching whatever the controller does when the submitted email already exists. Your fix admits `firstName`/`lastName` payloads, which means the wizard's real traffic now flows past validation into a path you explicitly say carries a security comment about a prior privilege bug and that you did not touch.

**Exact input:** A trainer onboards a new staff member and typo-s the email, or reuses one that already exists in the system:

```json
POST { "firstName": "Sam", "lastName": "Lee", "email": "<existing user's email>", ... }
```

**How cheaply:** This is the cheapest trip in the packet because **it requires no intent**. Email collisions in onboarding are routine — typos, re-hires, a trainer onboarding someone already in the system as a client. The old code accidentally functioned as a gate: every wizard submission was rejected before reaching this path. You removed the rejection without auditing what the path now admits. **[INFERENCE]** on what the path does — but the prior privilege bug + "keyed on body-supplied email" + "creates a USER" is exactly the shape of an upsert that mutates an account the caller doesn't own, possibly including role.

**Smallest fix:** One test + one branch. Test: trainer submits `firstName`/`lastName` with an existing user's email → assert no mutation of role or profile fields (expect 409 or a create-only path). If you can't verify the path today, the minimum is a guard clause: email exists → 409 Conflict, regardless of role. Do not let this push be the event that re-opens a previously-fixed privilege bug through a wider front door.

---

## 2. Fix 1 — the sibling routes you didn't change

**What breaks:** You fixed `/sessions/block`. You did not change unblock/delete or the recurring-series routes. The bug class — subject resolved from client-supplied body instead of authenticated actor — existed in *two* places that had already drifted (unified service vs. shadow router, operands reversed). **[INFERENCE]** A codebase that drifted twice on this exact resolution is likely to have it in the sibling handlers too, especially since the recurrence multiplier — your original amplifier — lives in the series routes.

**Exact input:** Authenticated trainer, one request:

```
POST /api/sessions/unblock   { "trainerId": <colleague id>, "date": ... }
DELETE /api/sessions/recurring/<series id belonging to colleague>
```

**How cheaply:** One request with dev tools. Not accidental, but "ordinary trainer" cheap — no admin access, no special knowledge beyond a colleague's ID, which the UI itself posts (you told me it posts `String(user.id)`, so IDs are visible in client traffic). Deletion is worse than the original write: a colleague's blocked time silently disappears, and they find out when a client books into it.

**Smallest fix:** Route every calendar-mutating endpoint (block, unblock, delete, series create/update/delete) through the same policy module — that was the point of making it dependency-free. If that's more than today allows, the minimum is one regression test per sibling route asserting a non-admin cannot affect another trainer's subject, and fix whichever fail. Refuse vs. clamp: **refusing is correct** — silent clamping writes to the wrong calendar while the UI reports success; a 403 is loud and your numeric comparison keeps the legitimate UI flow (string self-ID) passing. Also confirm the policy permits admin-specified `trainerId`, or admins get a new mystery 403 **[INFERENCE]** that's the intended behavior but should be a deliberate one.

**Shadow router:** Since it holds the *correct* clamp, reachability is a drift hazard, not a hole. One near-free assertion belongs in the push: hit the old mount path, expect 404. If it answers, you have two enforcement points live again — the condition that produced this bug.

---

## 3. Fix 4 — the sanitizer can invert or silently drop clinical meaning

**What breaks (two distinct ways):**

**(a) Phrase-stripping against clinical vocabulary.** Override-phrase stripping is designed against attacker phrasing: "ignore previous instructions", role markers, fences. Clinical free text collides with that vocabulary: *"physio said to ignore pain below 3/10"*, *"stop if dizzy"*, *"do not load left shoulder overhead"*. **[INFERENCE]** on your strip list, but any phrase-level stripper aggressive enough to catch override attempts will eventually eat a negation or an imperative from genuine clinical text — and in this domain, deleting "ignore" or "not" doesn't degrade the sentence, it **reverses the instruction** given to a workout generator.

**(b) The 280-char cap is silent data loss of exactly the kind this fix exists to eliminate.** Seven narrative fields, clients with real histories: "ACL reconstruction left knee 2021, rotator cuff repair right 2019, hypertension, on beta blockers, doctor cleared for moderate intensity, avoid loaded spinal flexion..." exceeds 280 characters fast. Truncation cuts the *last-listed* items with no signal to client, trainer, or reviewer. Pre-push, these fields were discarded — everyone knew the generator didn't have them. Post-push, everyone believes the generator has them, and it has a prefix. Silent partial data is worse than known-absent data for safety fields.

**How cheaply:** An ordinary client writing a thorough injury history trips (b) on their first day. (a) trips on ordinary phrasing of ordinary physio advice.

**Smallest fix:** (1) Confirm sanitization runs at **prompt-assembly time on stored raw text**, not at write time — if you persist the sanitized version, the mangling is permanent and unrecoverable **[INFERENCE — verify this first, it changes (a) from prompt-risk to data-loss]**. (2) Log + flag truncation events (a warning tag in the projection the trainer can see), even if you keep the cap. (3) Prefer stripping *structural* artifacts (fences, role markers, XML-ish tags) over *phrase* lists for negation-bearing clinical text; phrase-strip is where meaning inverts. Not blocking — the pre-push state is worse — but (1) is a verification you should do *before* push since it takes minutes and changes severity.

**`<client_reported>` wrapping:** Not theatre, not load-bearing. It meaningfully helps models that honor content/data delimitation and does nothing against ones that don't. It's acceptable as one layer precisely because your real controls are elsewhere: the generator treats the projection as data, and injuries independently arrive via `WaiverRecord` and pain entries. Ship it; don't count on it.

---

## 4. Fix 3 — the partial fix is net-positive; the residual needs a cheap correction channel

**What breaks:** A save that passes client validation but the server later rejects (conflict, authz, server-only rule) still acks `true` and is recorded `applied`. The trainer believes a workout is logged; it isn't.

**How cheaply:** Requires a server-side rejection, so it needs unhappy-path conditions — less frequent than the pre-fix state where *every* submit lied, including validation-refused ones that never left the browser. Net-positive to ship. Your reasoning that awaiting is not the fix is sound given a seam that reads `handled` synchronously after `dispatchEvent`.

**Smallest containment without touching the seam:** you can't change what the boolean says, but you can change what happens after it lies. On async rejection, append a **compensating outcome record** marking the attempt failed (append-only correction — no mutation, no seam change) and surface a visible failure to the trainer. That converts a silent lie into a corrected one for the cost of a `.catch` in the one place that already knows the outcome. If even that slips, the absolute floor is the failure toast, so the human corrects what the record can't.

---

## Items checked and cleared

- **Refuse-not-clamp:** correct call; see #2.
- **Zero migrations:** consistent with the stated scope; nothing to add.
- **Fix 2 name-contract design:** preserving the collected split and keeping legacy `fullName` callers working is right, and field-specific errors that don't echo submitted values are right. The problem is not the contract module; it's what the newly-valid traffic reaches (#1).
- **Fix 4 dictionary with fail-on-new-field contract test:** good mechanism; this is how the 20/45 drift stays fixed.

---

## Verdict

**Not safe to push today.** Two fixes in this diff either widen a door onto an unaudited path (Fix 2) or close one door of a set while the others stand unexamined (Fix 1) — on a deploy-on-push branch, those are the two that fire in production first.

**Minimum to make it safe, in order:**

1. **Fix 2 email path:** one test proving a `firstName`/`lastName` payload bearing an existing user's email cannot mutate that user (or a 409 guard). Small.
2. **Fix 1 siblings:** one regression test per calendar-mutating sibling route (unblock, delete, series routes) asserting actor-first subject resolution; route failures through the same policy module. Plus the near-free 404 assertion on the shadow router mount.
3. **One verification, not a change:** confirm Fix 4 sanitizes at prompt-assembly time, not at write time. If it's write-time, that becomes item 1.

Fix 3's residual and Fix 4's truncation/phrase-strip risks are real but strictly better than the pre-push state — they justify follow-up issues, not a held push. Everything in items 1–3 is test-sized work; if any of it turns out bigger than a day, that is itself the finding.

Flagged inferences throughout are exactly the claims to verify against current code before acting, as you did with the first review.
