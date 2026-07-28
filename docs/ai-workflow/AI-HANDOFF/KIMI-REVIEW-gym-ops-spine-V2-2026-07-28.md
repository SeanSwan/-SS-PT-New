# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md
**Seed:** docs/ai-workflow/AI-HANDOFF/KIMI-REVIEW-gym-ops-spine-2026-07-28.md
**Tokens:** 17038 in / 13901 out | **Cost:** ~$0.2596 | **Wall:** 409.9s

---

# ROUND 2 HOSTILE REVIEW — Gym Ops Spine v2 (SWA-74)

**Reviewer posture:** verify kills, don't praise them. Spend effort on what's still wrong.

---

## PART 1 — v1 BLOCKER AUTOPSY

### A1 (`suspended` not in ENUM) — **FIXED**
§2.4 defines the six-value list once, S1's migration references it, S5's acceptance includes the direct day-10 regression against the ENUM. Dead. **However** — the fix is undercut by a new bug in §2.5 (see N1 below): `assertCanBook`'s `where` clause pre-filters to `['active','past_due']`, so `suspended` never reaches the check that throws `MEMBERSHIP_SUSPENDED`. The enum is right; the code that reads it is wrong.

### A2 (no purchase flow) — **FIXED** (the blocker), but the fix opened two new money holes
S1 ships checkout + `checkout.session.completed` + `invoice.paid` routing first. The NULL-column problem is dead. But the purchase path as specified permits a double-subscription double-charge (M1) and the cancel path never terminates access (M2 — new BLOCKER). See Part 3.

### A3 (attended-vs-capacity oversell) — **FIXED, cleanly**
`attendedAt` as a separate column, `status` means seat-hold, capacity = `count('booked')`, S4 acceptance asserts the invariant explicitly. This is the right root fix, not a moved bug.

### B1 (cancel lock-order inversion) — **FIXED**
§2.3 plus the S3 peek→lock-slot→reread structure eliminates the cycle. `promoteFromWaitlist` receiving a pre-locked slot and never re-acquiring is the correct shape. The v1 deadlock scenario is now an explicit acceptance test. One unstated invariant remains (N12, NIT): the peek-then-lock is only sound because `classSlotId` is immutable — say so, or a future "move booking to another slot" feature reopens the wrong-slot-lock hole.

### D1 (cancel transaction unspecified) — **FIXED**
S3 is written in full with lock order, late-cancel semantics, and promotion triggering. Dead. One gap inside it: nothing prevents cancel/promote on a *past* slot (N5).

**Verdict: 5/5 v1 blockers are dead. A1's death certificate has a footnote (N1), but the enum bug itself is gone.**

---

## PART 2 — NEW BUGS THE FIXES INTRODUCED

### The six questions asked, answered directly

**Q: Does the recursive `promoteFromWaitlist` skip-ineligible path terminate, and is it safe under the held lock?**
**Terminates: YES.** Each recursion flips one `waitlisted` row to `cancelled`, so the eligible set strictly decreases. **Lock-safe: YES** — booking row locks are taken after the slot lock, consistent with §2.3; no new lock-order edges. **But the `catch {}` is a bug (N2, MEDIUM):** it swallows *every* error, not just `ForbiddenError`. A transient DB failure inside `assertCanBook` (connection reset, statement timeout) is indistinguishable from ineligibility and **permanently cancels the member's waitlist entry**. It must catch domain errors only and rethrow the rest. Compounding it: skipped members are silently dropped — no notification is specified for the skip path (notifications are spec'd only for successful promotion), and `cancelled` is the wrong status semantics for a system-initiated skip. A frozen-for-one-week member loses their queue position forever, silently.

**Q: Does `cancelBooking`'s read-then-lock-then-reread have a TOCTOU hole?**
**Not as written, conditionally.** The reread under lock catches status changes; the only stale field that matters between peek and lock is `classSlotId`, and no specified path mutates it. The hole is real only if `classSlotId` ever becomes mutable. State the invariant or add `if (booking.classSlotId !== slot.id) throw Retry` — one line. **NIT (N12).**

**Q: Does `assertCanBook` inside promotion create a lock-order violation or N+1?**
**No lock-order violation** — it takes no row locks (plain `findOne`/`count`), so it adds no edges to the lock graph. **Yes to a hold-time problem (N13, NIT):** the slot lock is now held across a membership lookup plus, for `limited` entitlements, a per-user `ClassBooking.count` — and in a skip-storm (K ineligible members at the head of the queue), that's K × (2–3 queries) serialized against every concurrent booker of that slot. Correctness holds; throughput degrades. Acceptable for v2, but note it, because the obvious future "fix" (locking the membership row) *would* create the inversion.

**Q: Is S2.2 series-edit semantics actually unambiguous?**
**No — and worse, it contradicts §2.6 (N3, HIGH).** "Changing `recurrenceRule`... deletes only future slots with zero bookings." But `class_bookings.classSlotId` is `RESTRICT`, and `class_slots` is **not paranoid** (no `deletedAt` in the S2 schema). "Zero bookings" is ambiguous between *zero active bookings* and *zero booking rows* — and under RESTRICT those are different products: a slot with five fully-cancelled bookings (zero active, five rows) **cannot be deleted at all**; the DELETE throws an FK violation. The naive bot reading ("zero active bookings") crashes on first real use; the other reading means regeneration silently never happens for any slot with history. Also unspecified: capacity **increase** propagates but **never triggers promotion** (N4, MEDIUM) — a full slot with a live waitlist gets bigger and the seats stay empty until the next cancel, which may never come. And `instructorId` propagation will **clobber per-occurrence substitutes** (the denormalized column's entire stated purpose) — no exception carved out (N18, NIT).

**Q: Does the S6 auth-before-try/catch ordering actually hold?**
**Mostly, with one exposed seam (N7, MEDIUM).** The spec's order is correct: auth first, 401 with empty body, then try/catch → `200 allow:false`. But the auth step itself is *outside* the try/catch, and it touches the DB (key lookup) and bcrypt. DB-down during key validation → unhandled 500, not the spec'd fail-closed `allow:false`. Practically still fail-closed (door doesn't open), but it's unspecified behavior in the one endpoint where the spec claims ordering is "fixed and must not be rearranged." Bigger: **bcrypt hashes are not lookup keys.** You cannot `WHERE keyHash = ?` a bcrypt hash. The lookup procedure — presumably narrow by `lastFour` then `bcrypt.compare`, or scan all active keys for the location — is **never specified**. Scanning is a timing-DoS (N keys × ~100ms per verify, on a rate-limited door endpoint); `lastFour`-narrowing works but leaks 4 key chars into a lookup oracle. Forced guess on the security-critical path.

**Q: Is the 5-min check-in idempotency race-safe without a unique index?**
**No (N6, MEDIUM).** Lookback-then-insert is read-then-write with no constraint backing it. Two concurrent verifies (kiosk double-tap, door controller retry, S6 retry after a timeout) both miss the lookback, both insert. The spec *explicitly rejected* the unique index ("NOT used") and substituted a mechanism that only works sequentially. The S6 acceptance test ("two verifies within 5 min → one check-in row") is sequential and will pass while the concurrent case dupes. Fix is one line: a per-`(userId, locationId)` advisory lock (`pg_advisory_xact_lock(hashtext(...))`) inside the check-in transaction, or a time-bucketed unique column. As written: race hole, self-inflicted.

### N1 — `assertCanBook` status checks are dead code; acceptance tests contradict the code (HIGH)

```js
where: { userId, locationId, status: ['active','past_due'] }   // ← pre-filter
...
if (membership.status === 'suspended') throw MEMBERSHIP_SUSPENDED;  // unreachable
if (membership.status === 'frozen')    throw MEMBERSHIP_FROZEN;     // unreachable
```

A suspended or frozen member gets `NO_ACTIVE_MEMBERSHIP`, never the specific codes. Functionally still fail-closed, but: (a) S5's acceptance test asserts `bookIntoSlot → MEMBERSHIP_SUSPENDED` — **that test fails against this code**, the exact test-vs-code contradiction class that was v1's B4; (b) S6 lists `MEMBERSHIP_SUSPENDED`/`MEMBERSHIP_FROZEN` as distinct deny reasons with distinct front-desk meanings ("pay your bill" vs. "your freeze is on"), and the gate can never produce them. Fix: drop the status filter from the `where`, find the membership, then branch. One line — but it's in the §2.5 law block, so fix the law.

Related (N8, MEDIUM): `findOne` with no `order` and no uniqueness guard on multiple memberships per `(userId, locationId)`. A member with both an `open_gym_only` and an `unlimited` row (the natural upgrade path) gets whichever row Postgres returns first — possibly `CLASSES_NOT_INCLUDED` while holding a valid unlimited membership. Needs a precedence order or a uniqueness constraint.

### N5 — No writer for `class_slots.status='completed'` (carried from v1 A9) + no past-class guard (MEDIUM)

`completed` is in the ENUM; nothing ever sets it. Yesterday's slot stays `'scheduled'` forever. `cancelBooking` never checks `startsAt > now`, and `promoteFromWaitlist` only checks `status==='scheduled'` — so **cancelling a booking on a past class promotes a waitlisted member into a class that already happened**. The generator cron or the dunning cron pattern could flip completed; nobody is told to. This was a NIT in v1; v2's fully-specified cancel/promote path makes it load-bearing.

### N11 — Class cancellation has no service semantics (MEDIUM)

`POST /slots/:id/cancel` exists to back the wireframe button, but no service is specified: do booked members' rows flip to `cancelled`? Are they notified? What happens to the waitlist? A bot improvises all of it — in the document whose premise is "improvise nothing." At least promotion is safe by accident (slot no longer `scheduled` → `promoteFromWaitlist` returns null).

---

## PART 3 — MONEY PATH ATTACK

### M2 — [BLOCKER] Cancelled memberships never stop working: no terminal state transition, and `assertCanBook` never reads `endsAt`

The cancel flow: set `endsAt = now + 30d`, set Stripe `cancel_at`. Then walk what happens on day 31:

1. Stripe fires `customer.subscription.deleted` at the cancel date. **No handler for that event exists anywhere in v2.** The resolver routes by subscription ID; the handler table covers `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`. Full stop.
2. The spec never says `POST /:id/cancel` sets `memberships.status='cancelled'` — it says it sets `endsAt` and `cancel_at`. Two readings, both broken: set status immediately → the member loses 30 days they paid for (the notice window is supposed to be *paid access*); don't set it → status stays `'active'` **forever**.
3. `assertCanBook` checks `status` only. It never reads `endsAt`. S6's door resolver checks status only. So under reading (b), a member who cancelled in January books classes and opens the door in December, unbilled.
4. Same hole for the `'expired'` enum value and `termMonths`/`endsAt` natural expiry: **no writer, no cron, no check**. `expired` is decorative.

This is v1's C2 class of bug, transplanted: v2 fixed the Stripe side of cancellation (no renewal charge — genuinely fixed) and left the access side hanging open. It is deterministic — it affects *every* cancelled membership, not an edge case — it fails open, and it is on the money path the doc claims to have made its first slice. The acceptance test ("cancel sets `cancel_at`, no renewal charge") tests only the Stripe half, exactly how A1's acceptance tests missed the enum. **BLOCKER.**

Required fix, all three parts: (i) handler for `customer.subscription.deleted` → `status='cancelled'` + event; (ii) cron or lazy check flipping `endsAt < now` memberships; (iii) belt-and-suspenders `endsAt` check in `assertCanBook`. Same subscription.deleted gap also means *Stripe-initiated* cancellation (retries exhausted, dunning gives up) never lands locally — past_due forever, never suspended, never cancelled.

### M1 — [HIGH, near-blocker] Double-checkout double-charge: nothing prevents two active subscriptions per member

`createMembershipCheckout` performs no existing-membership check; the schema has no unique constraint on active memberships per `(userId, locationId)` (the only unique index is on `stripeSubscriptionId`). Member opens checkout in two tabs, completes both → **two Stripe subscriptions, two monthly charges, two membership rows.** `checkout.session.completed` faithfully creates both. The dedup store dedups *event replays*, not *duplicate purchases*. This is the most ordinary user behavior imaginable on a checkout page, on the slice labeled "money spine." Fix: pre-checkout guard + partial unique index on `(userId, locationId) WHERE status IN ('active','past_due','frozen')`. (Also the root enabler of N8.)

### M3 — [HIGH] Dunning ladder: a second `payment_failed` resets the clock; suspension can be postponed indefinitely

The trigger table defines **"failure 1"** and nothing else. Stripe retries produce *new* `invoice.payment_failed` events (new `stripeEventId` — dedup does not catch them). A literal build re-executes the failure-1 action: `dunningAttempt=1`, `dunningStartedAt=now`. The cron advances by elapsed days from `dunningStartedAt` — which just reset. Stripe's default retry schedule (≈ days 3, 5, 7) means each retry restarts the 10-day countdown: **day-10 suspension may never land**, and when Stripe exhausts retries it cancels the subscription — which, per M2, no handler receives. Net: a non-paying member stays `past_due` (which §2.5 *deliberately allows to book*) indefinitely. Fail-open revenue leak in the exact subsystem v1 was killed for. The merge rule (webhook attempt-counter vs. cron attempt-counter, max-wins? webhook-once-then-cron-owns?) is a forced guess on a state machine.

### M4 — [MEDIUM] `frozenUntil` has no writer past the freeze itself
Freeze pauses Stripe collection (good — C2's core is dead). But nothing auto-unfreezes at `frozenUntil`: no cron, no lazy check. Unfreeze is a manual admin endpoint. Staff forget → member unbilled and locked out indefinitely = missed charges + an angry member. Also unspecified: freeze behavior when `stripeSubscriptionId` is NULL (comped/manual membership), and the exact unfreeze call (`pause_collection: ''`).

### M5 — [MEDIUM] Webhook replay handling: the dedup store exists; the replay *response* is unspecified
Every handler must write a `membership_events` row with `stripeEventId`; a replay violates the unique index. What then? The spec never says "catch the violation, return 200." A naive build 500s on every replay; Stripe retries, exhausts, and the event is dead-lettered *by Stripe* — the exact silent-drop C1 was killed for, one layer down. One sentence fixes it; it's absent.

### M6/M7 — [NITs] `invoice.paid` racing `checkout.session.completed` → dead-letter false alarm (recoverable, but alarm fatigue on the dead-letter channel C1 made load-bearing). `invoice.paid` always writes `payment_recovered`, even for routine renewals — the `renewed` event type is defined and never used; monthly audit noise.

**Money path scorecard:** double-charge found (M1), missed-charge found (M3, M4), silent-drop found (M5), perpetual-free-access found (M2). The purchase and freeze-pause mechanics themselves are sound.

---

## PART 4 — REMAINING FORCED GUESSES (buildability)

The declared STOPs (§9.1 plan catalog, §9.2 memberRef, §9.3 credit enforcement) are honest and acceptable. What is **not** declared and still forces a guess:

1. **`periodStart(membership)`** — called in §2.5, defined nowhere. Calendar month? Billing anniversary? Determines whether the `limited` entitlement is enforceable at all. **MEDIUM.**
2. **`isStaff(actorUserId)`** — called in S3, defined nowhere. Role from JWT? DB lookup inside the transaction? Which roles count (`trainer`, `admin`, both)? **MEDIUM.**
3. **Access-key lookup procedure** (N7) — `lastFour`-narrow vs. scan, on the auth path. **MEDIUM.**
4. **Class-cancel service semantics** (N11). **MEDIUM.**
5. **`notificationService.mjs` existence and API** — §2.1's "verified against this repo" table does not include it, yet S3 says "use" it. The one unverified dependency in a doc whose whole fix was verification. **NIT–MEDIUM.**
6. **Webhook replay → 200 contract** (M5). One sentence. **NIT.**
7. **Hours-check tz direction** (N15) — §2.2 converts wall→UTC; S6 needs now→location-local. `formatToParts` does it, but the utility shown doesn't. **NIT.**

---

## PART 5 — DEPENDENCY CHAIN (§4)

**Correct now.** S2→S1 (gate), S3→S2, S4→S1+S2, S5→S1, S6→S1+S4 — every FK and every runtime read has an upstream writer. E1 and E2 are dead (`membershipId` created in S4, the slice that needs it). One line, moving on.

---

## RANKED SUMMARY

| # | Finding | Rank |
|---|---|---|
| M2 | Cancelled/expired memberships never terminate access: no `subscription.deleted` handler, `assertCanBook`/S6 ignore `endsAt`, `status='cancelled'`/`'expired'` have no writer — deterministic, fail-open, money path | **BLOCKER** |
| M1 | Double-checkout → two subscriptions, two charges: no pre-checkout guard, no active-membership uniqueness | HIGH (borderline BLOCKER) |
| M3 | Dunning ladder resets on each `payment_failed`; suspension postponed indefinitely; Stripe-exhausted cancel unhandled | HIGH |
| N1 | `assertCanBook` pre-filter makes suspended/frozen branches dead code → wrong error codes; S5/S2 acceptance tests fail against the shipped code | HIGH |
| N3 | S2.2 "delete zero-booking slots" contradicts RESTRICT FK + non-paranoid `class_slots` — regeneration crashes or silently no-ops on any slot with history | HIGH |
| N2 | `catch {}` in promote swallows DB errors → permanent silent waitlist drop; skipped members unnotified, wrong status semantics | MEDIUM |
| N5 | No `completed` writer + no `startsAt > now` guard → cancel/promote into past classes | MEDIUM |
| N4 | Capacity-increase propagation never triggers promotion → empty seats, live waitlist | MEDIUM |
| N6 | 5-min check-in idempotency is read-then-insert with no constraint → concurrent duplicate check-ins | MEDIUM |
| N7 | S6 key lookup unspecified (bcrypt isn't indexable); auth step outside try/catch → unhandled 500 | MEDIUM |
| N8 | Multiple memberships per (user, location): nondeterministic `findOne`, false `CLASSES_NOT_INCLUDED` | MEDIUM |
| M4 | `frozenUntil` has no auto-unfreeze writer → indefinite billing pause (missed charges) | MEDIUM |
| M5 | Webhook replay → unique violation → response unspecified; naive build 500s into Stripe retry exhaustion | MEDIUM |
| N9/N10/N11 | `periodStart`, `isStaff`, class-cancel semantics — forced guesses in a "guess nothing" doc | MEDIUM |
| N12 | cancelBooking TOCTOU benign only under unstated `classSlotId` immutability | NIT |
| N13 | Promotion holds slot lock across entitlement queries (no violation; hold-time growth) | NIT |
| N14/N15/N18 | FIFO `waitlistedAt` ties; hours-check tz direction; instructorId propagation clobbers substitutes | NIT |
| M6/M7 | invoice.paid ordering false dead-letters; `renewed` event unused | NIT |

**Bottom line:** v2 did what it was told — all five v1 blockers are verifiably dead, and A3/B1 in particular were killed at the root rather than patched. But the money path the doc now leads with has a deterministic fail-open hole at the end of the lifecycle (M2: everyone who ever cancels keeps access forever), a plausible double-charge at the start (M1), and a dunning ladder that a patient non-payer never falls off (M3). The entitlement gate that was supposed to enforce all of it can't even name the right error (N1). Do not hand to the builder until M2 is spec'd — handler, cron, and `assertCanBook` check, all three — and M1/N1/M3/N3 are one-line-class fixes that should land in the same revision.
