# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md
**Seed:** (none)
**Tokens:** 18599 in / 6060 out | **Cost:** ~$0.1467 | **Wall:** 176.3s

---

# ROUND 5 HOSTILE REVIEW — Gym-Ops Spine v2

Posture: everything is guilty until proven innocent. Findings ranked at the end.

---

## 1. The `pending` row mechanism (S1) — four real failure modes, one BLOCKER

### B-1 · BLOCKER — The 24h sweep DELETE collides head-on with your own RESTRICT FK and your own event law

The doc has two laws:
- *"Never mutate `memberships.status` without writing a `MembershipEvent` in the same transaction."*
- `membership_events.membershipId` is FK **RESTRICT**.

Now trace the sweep: *"pending rows older than 24h are deleted."*

- If the pending INSERT writes an event (the law says it must — inserting `status:'pending'` is a status write; the pending row *is* the guard's witness and its creation is exactly the kind of thing an audit table exists for), then the sweep's `DELETE FROM memberships` hits a `membership_events` row pointing at it → **RESTRICT violation → the sweep crashes on its first real row, daily, forever.** This is R8's exact shape, one revision later: a fix (nullable `membershipId` for orphan refunds) that didn't propagate to the next writer.
- If the pending INSERT writes *no* event, the law is violated and the doc never says so.

Either way the doc is internally inconsistent. The sweep must be specified as *"delete only pendings with zero event rows"* or the pending insert must be explicitly exempted from the event law. Neither is written.

### H-1 · HIGH — An abandoned checkout blocks legitimate re-checkout for 24 hours, with no escape hatch

Tab A opens checkout, closes the browser. Member immediately tries again → the guard sees the `pending` witness → `409 ALREADY_A_MEMBER`. For 24 hours. The rescind route exists for *cancels*; nothing exists for abandoned *pendings*. The doc designed a tombstone with no tombstone-raiser. Fix is trivial (a new checkout for the same pair cancels/supersedes the prior pending row in the same locked transaction) but it is **not in the document**, and §9 doesn't STOP on it either — the builder will either improvise or ship the lockout.

### H-2 · HIGH — The orphan-subscription refund path is dead code as written, because promotion is an UPDATE

Step 2: *"If the insert hits the active-membership unique index, cancel the just-created Stripe subscription and refund."* But the flow's own centerpiece says `checkout.session.completed` **promotes** the pending row — an `UPDATE`, not an `INSERT`. An UPDATE against the unique index can't fire the insert-violation path the refund logic is keyed on. The double-fire defense (`force two concurrent checkout.session.completed`) now routes through two UPDATEs of the *same* pending row — both succeed, both write `created` events, and the dedup only saves you if the two deliveries share a `stripeEventId` (Stripe redelivery does; two *distinct* sessions for the same user don't — but those can't share a pending row either, and the second session's webhook finds **no pending row to promote**, and the doc says nothing about that case). The orphan path needs to be re-specified against the promotion model, not the insert model. Stale v2-draft-1 text survived four rounds.

### M-1 · MEDIUM — Stripe API call placement and webhook-vs-commit ordering are unspecified

The pending insert "carries the Stripe Checkout Session id," so the session must be created *before* the insert — i.e., **a Stripe HTTP call inside the advisory-locked transaction**. Every concurrent checkout for that (user, location) now serializes behind a network round-trip, and a Stripe timeout rolls back with the lock held for the duration. Worse: Stripe can deliver `checkout.session.completed` in under a second — the webhook may arrive **before the checkout transaction commits**, find no pending row, and… the doc doesn't say. Dead-letter? Insert anyway? 500-and-retry? The replay contract covers replays, not early arrivals.

### M-2 · MEDIUM — The pending sweep is assigned to a cron whose spec never mentions it

§2.4 and S1 say the "§2.7 lifecycle cron" sweeps pendings. §2.7 path 3's actual spec covers `endsAt` expiry and auto-unfreeze only — **no pending sweep**. A builder implementing §2.7 faithfully ships a cron that never sweeps. And with the cron disabled (the doc's own failure-mode test for `endsAt`), pendings live forever and the 409 guard bricks checkout permanently — no `endsAt`-style belt-and-suspenders exists for `pending`.

---

## 2. The generator tombstone rule (S2) — the hole is NULL, and the hole behind it is a race

### H-3 · HIGH — `cancellationReason != 'series_rescheduled'` is wrong SQL for a nullable TEXT column

`cancellationReason` is `TEXT`, nullable, and nothing in `cancelClassSlot`'s spec says it's NOT NULL. Staff cancels a holiday class without typing a reason → `cancellationReason IS NULL`. The mandated filter, written as instructed:

```sql
WHERE status = 'cancelled' AND cancellationReason != 'series_rescheduled'
```

`NULL != 'series_rescheduled'` evaluates to **NULL**, not true → the tombstone row is invisible to the filter → **the generator resurrects the holiday closure — the exact bug the red box exists to prevent.** The doc specifies the *rule* in prose and the *wrong implementable predicate* by implication. It must say `IS DISTINCT FROM 'series_rescheduled'` (or make the column NOT NULL on cancel). This is the round-5 instance of the meta-lesson: the fix (reason-discriminated tombstones) introduced the defect (NULL semantics), one layer down.

### H-4 · HIGH — The tombstone filter is read-then-insert; it races with a concurrent staff cancellation

The unique index excludes `cancelled` rows, so it *cannot* arbitrate this: generator reads tombstones (none), staff concurrently cancels the slot for that instant (status flips, row now excluded from index), generator `bulkCreate(..., ignoreDuplicates)` inserts a fresh `scheduled` slot at the same `(classSeriesId, startsAt)`. **No constraint fires. Two rows, one instant, zero errors.** You serialized check-ins and checkouts with advisory locks; the generator-vs-cancellation pair has nothing. Either `cancelClassSlot` takes an advisory lock keyed on the series, or the generator does, or the doc accepts duplicate slots. Silence is not an option — this is the same defect class as R1 (check-then-act with no witness), which this doc itself diagnosed.

---

## 3. §2.7 termination — ordering, double-fire, lost-paid-term

### H-5 · HIGH — `cancel_at = now + 30d` causes the renewal charge the doc claims it prevents

Path 1: `endsAt = now + CANCELLATION_NOTICE_DAYS`, Stripe `cancel_at` at that date, *"so no renewal charge lands inside the notice window."* Trace a monthly member whose next billing date is 12 days out: `cancel_at` is day 30. Stripe keeps the subscription alive until `cancel_at`, which means it **renews and charges on day 12** — a full period the member did not intend to buy — then cancels on day 30. The doc asserts the opposite of what Stripe does. The correct mechanism is `cancel_at_period_end` semantics or `cancel_at = min(endsAt, next_billing_date)` with prorated access policy — a money-path decision that is currently **specified wrong**, not unspecified.

### H-6 · HIGH — The freeze-with-pending-cancel decision is explicitly delegated and never made

The red box says: *"Either is acceptable — pick one and write it down; leaving it implicit is how the paid term gets destroyed."* **The document then leaves it implicit.** Neither option (re-arm `cancel_at` on unfreeze, nor `409 CANCEL_PENDING` on freeze) appears in the freeze/unfreeze spec, the acceptance tests, or §9. Four rounds of edits and the document's own loudest warning is about itself. A zero-context builder must guess on the exact paid-term-destruction path the doc diagnosed in detail.

### M-3 · MEDIUM — Path 1 on a `past_due` member: "status stays `active`" is not applicable and nothing says what happens

A `past_due` member calls cancel. The spec says status stays `active` through the window — but status is `past_due`. Does cancel restore `active`? Leave `past_due` (and does the dunning cron then *suspend* a member mid-notice-window who has already cancelled)? The dunning cron scans `status='past_due'` unconditionally; day-10 suspension of a cancel-pending member is a live double-fire the NO-OP guard in path 2 doesn't cover.

### M-4 · MEDIUM — Rescind "restores `endsAt`" but the prior `endsAt` is never stored

Path 1 overwrites `endsAt`. Rescind-cancel "restores" it. For NULL-ended month-to-month, restore-to-NULL works. For a `termMonths` membership, the original term end is gone — no column holds it. Either store `preCancelEndsAt` or restrict rescind to NULL-ended memberships. Unspecified.

The clean part, credit where due: path 2 NO-OP-when-terminal plus cron's status-in-(`active`,`past_due`) scan makes the cron↔webhook ordering safe in both directions. That survived scrutiny.

---

## 4. Self-contradictions and stale text

1. **§2.5's load-bearing comment is stale (HIGH, folded into ranking):** the precedence-ordering comment still says *"the unique index below does NOT cover `suspended`, so a suspended `unlimited` row can legally coexist…"* — but R3's fix **added `suspended` to the index predicate**. The justification now contradicts the schema. The ordering is still correct, but the next editor, trusting the comment, may "simplify" the order and reintroduce R3.
2. **S1 step 2 says "create the `Membership` row"** while the flow's core says promote-rather-than-insert (see H-2). The acceptance criterion *"`checkout.session.completed` creates a Membership"* is the same staleness.
3. **Dependency diagram omits S4→S1.** Text says "S4 needs S1 **and** S2"; the ASCII shows `S4 CheckIn ◄── S2` hanging off S6's line only (NIT).
4. **`created` event semantics double-defined:** pending insert vs. promotion — which one writes `created`? Both, per literal reading (NIT, feeds B-1).
5. **§0.2's own method note** ("propagate enum changes in the same edit") was not applied to the S1 index/§2.5 comment pair — the doc violated its own recorded meta-lesson.

---

## 5. VERDICT

**No — a zero-context builder cannot execute S0–S2 without questions.** Independent of the defects above, §9.1 (`planKey` plan catalog unresolved) stops S1 cold by the doc's own STOP rule — and H-6 adds a second undeclared STOP inside §2.7. The builder must either guess the freeze/cancel interaction (money path, explicitly warned against guessing) or halt.

**Defect class only real Postgres can find:** **predicate/NULL three-valued-logic and concurrent-constraint behavior** — partial-index predicates interacting with NULL (`IS DISTINCT FROM`), `ignoreDuplicates` silently passing when the predicate excludes the conflicting row, RESTRICT firing on a DELETE the mock never models, and advisory-lock serialization across concurrent transactions. Every one of B-1, H-3, H-4, M-1 passes cleanly against a mocked or in-memory store and detonates on first contact with real Postgres. The doc's own §6 (don't mock the race tests) is the right instinct; it needs to extend to the sweep and the generator.

---

## RANKED FINDINGS

| # | Severity | Finding |
|---|---|---|
| B-1 | **BLOCKER** | Pending sweep DELETE vs. `membership_events` RESTRICT + event law: sweep crashes daily or the law is silently broken |
| H-1 | HIGH | Abandoned checkout → 24h re-checkout lockout, no supersede path |
| H-2 | HIGH | Orphan-refund path keyed on INSERT violation; promotion is UPDATE → dead code; no-match-on-promotion unspecified |
| H-3 | HIGH | Tombstone filter broken by NULL `cancellationReason` (3VL) — holiday closures resurrect |
| H-4 | HIGH | Generator↔staff-cancel TOCTOU: duplicate slots, no constraint can fire, no lock specified |
| H-5 | HIGH | `cancel_at = now+30d` causes the in-window renewal charge the doc claims it prevents |
| H-6 | HIGH | Freeze-with-pending-cancel: "pick one and write it down" — never picked |
| H-7 | HIGH | §2.5 comment "index does NOT cover `suspended`" contradicts S1 index (R3 fix half-propagated) |
| M-1 | MEDIUM | Stripe call inside the advisory-locked txn; webhook may beat the commit; early-arrival behavior unspecified |
| M-2 | MEDIUM | Pending sweep missing from §2.7 path 3 spec; cron-down → permanent checkout brick |
| M-3 | MEDIUM | Cancel on `past_due` member: status/dunning interplay unspecified; suspension can fire mid-notice |
| M-4 | MEDIUM | Rescind can't restore a term membership's original `endsAt`; not stored |
| N-1 | NIT | Dependency diagram missing S4→S1 edge |
| N-2 | NIT | `created` event double-write ambiguity (pending insert vs. promotion) |

**Tally: 1 BLOCKER, 7 HIGH, 4 MEDIUM, 2 NIT.** Round 4's "0 BLOCKERs" was real for what it reviewed — but the pending-row mechanism, the single most-edited feature in the document, was carrying the round-5 BLOCKER the whole time. Same meta-lesson, fourth recurrence: *the fix is where the next defect lives.*
