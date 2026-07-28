# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md
**Seed:** docs/ai-workflow/AI-HANDOFF/KIMI-REVIEW-gym-ops-spine-V2-2026-07-28.md
**Tokens:** 20037 in / 16000 out | **Cost:** ~$0.3001 | **Wall:** 232.9s

---

# ROUND 3 HOSTILE REVIEW — Gym Ops Spine v2, draft 2 (SWA-74)

**Posture:** the fixes are the attack surface. Verified each against the doc's own laws, not its claims.

---

## PART 1 — ROUND-2 FINDING AUTOPSY

| ID | Verdict |
|---|---|
| M2 (termination) | **FIXED in shape** — three paths exist, fail-closed `endsAt` checks are real. But path 3 is broken twice from the inside (R7, R8 below). |
| M1 (double-checkout) | **PARTIAL** — webhook-side backstop is sound; the checkout-creation race is still open and the mandated acceptance test is unpassable as spec'd (R1). |
| M3 (dunning clock) | **FIXED.** Start-once + webhook/cron ownership split is coherent; the day-0/3/5 regression test pins it. |
| N1 (dead branches) | **FIXED.** Fetch-then-branch, specific codes reachable, S5 test now passes against the code. |
| N3 (RESTRICT delete) | **FIXED as stated** — but the status-flip fix created R6 (cancelled rows block regeneration). |
| N2 (catch {}) | **FIXED.** `ForbiddenError`-only + `skipped_ineligible` + notify. |
| N5 (past class) | **PARTIAL.** Promote guard added; `class_slots.status='completed'` still has **no writer** — half the finding survives (NIT now, since cutoff/past-guards cover the functional holes). |
| N6 (check-in race) | **FIXED mechanism, NEW CONTRADICTION** — the advisory lock is fine; the surrounding code violates §2.3 (R5). |
| N7 (key lookup) | **FIXED.** `keyId.secret` + indexed fetch + whole-handler try/catch is the right shape. |
| N4 (capacity increase) | **FIXED.** Promotion on increase, under the lock. |
| N8 (nondeterministic findOne) | **STILL BROKEN in interaction** — the precedence ORDER is status-blind and the M1 index permits exactly the rows that defeat it (R3). |
| M4 / M5 | **FIXED.** Auto-unfreeze writer exists; replay→200 contract explicit. |
| N9 (`periodStart`) | **DEFINED BUT WRONG** — month-end rollover breaks the anniversary math, fail-open (R2). |
| N10 (`isStaff`) | **DEFINED, THEN MISCALLED** — S3 passes `actorUserId` to a role predicate (R4). |
| N11 (class-cancel semantics) | **STILL BROKEN — not even claimed in §0.1.** No service spec; now interacts badly with `limited` accounting (R10). |
| N12/N13/N14/N15, M6 | Not addressed. Remain NITs (see Part 4). |
| M7 (`renewed` unused) | **FIXED.** |

---

## PART 2 — NEW BUGS THE ROUND-2 FIXES INTRODUCED

### R8 — [BLOCKER, by this document's own A1 precedent] `membership_events.eventType` has no `expired` — §2.7 path 3's only writer of `expired` crashes on its own audit law

The S1 law: *"never mutate `memberships.status` without writing a `MembershipEvent` in the same transaction."* §2.7 path 3 flips memberships to `expired` and "writes an event." The `eventType` ENUM is:
`created, frozen, unfrozen, payment_failed, payment_recovered, suspended, unsuspended, cancelled, renewed`. **No `expired`. No generic.** The cron's expired-branch event insert violates the ENUM → the transaction rolls back → the status flip never lands → the cron throws again tomorrow on the same rows, forever. This is v1-A1 — *a write against an ENUM that lacks the value* — recreated **one revision after the doc added an enum-parity check**, because that check (S2) greps only `status: '` literals and lives in the wrong slice to see `membership_events` (S1). Mitigation: access still fails closed via the `endsAt` checks, so this is not fail-open — but the M2 fix's third path is dead on arrival, and M2 was the BLOCKER this revision exists to kill. Add `expired` (and arguably `cancellation_requested`) to the eventType ENUM and extend the parity grep to `eventType`.

### R7 — [HIGH] §2.7 path 3's "cancelled if a cancel was requested" requires a column that does not exist — plus a double-fire with path 2

Path 3 branches on *why* `endsAt` elapsed: natural expiry → `expired`, requested cancel → `cancelled`. The S1 schema has **no `cancelRequestedAt` / `cancellationRequested` flag** — `endsAt` is overloaded for both cases, and Stripe's `cancel_at` is never persisted. The branch is unimplementable as spec'd; a builder must guess on the money path. Compounding: at `endsAt`, **both** path 2 (`subscription.deleted` → `cancelled`, `endsAt=now`) and path 3 fire. Order-dependent outcomes: cron-first → `expired` (or a crash, per R8), then the webhook **overwrites `expired`→`cancelled` and rewrites `endsAt`** — history falsified, two contradictory events. Webhook-first is stable only because the cron's filter excludes `cancelled`. Fix: add the flag, make path 2 a no-op when status is already terminal.

### R1 — [HIGH] The M1 pre-checkout guard is read-then-act with nothing serializing it; the required acceptance test cannot pass as spec'd

`createMembershipCheckout` checks for an existing live membership, then opens a Stripe session. Two concurrent calls both pass the guard — **the partial unique index cannot fire because no membership row exists yet at checkout-creation time.** The doc claims the guard is "backed at the DB by the partial unique index"; the index only fires at `checkout.session.completed`, by which point two Stripe subscriptions exist and the member **has been charged twice** (first invoice pays at checkout completion) before the cancel+refund path runs. The mandated test — "two concurrent `createMembershipCheckout` → second returns 409" — fails against any literal build of the spec. Fix: advisory-lock `(userId, locationId)` inside checkout creation, or insert a `pending` membership row the index can see.

### R3 + R14 — [HIGH] The N8 precedence ORDER is status-blind, and the M1 index + guard both exclude `suspended` — together they recreate N8 and open a dunning bypass

The partial unique index covers `active/past_due/frozen` — **not `suspended`.** So a suspended row and a new active row legitimately coexist at one `(userId, locationId)`. The §2.5 ORDER sorts by entitlement richness *first*: `unlimited-suspended` outranks `limited-active` → a member holding a **valid active membership** gets `MEMBERSHIP_SUSPENDED`. The doc's claim that the index "makes §2.5's lookup deterministic" is false — the ORDER clause is still load-bearing, and it orders over the wrong rows. And the mirror image (R14): the 409 guard also ignores `suspended`, so a member suspended for non-payment can **buy a new membership to escape dunning**; if both rows are `unlimited`, the `createdAt DESC` tie-break picks the new clean row and the debt vanishes operationally. Fix: ORDER by live-status first (`active/past_due` before everything), then entitlement; and decide explicitly whether checkout is allowed while suspended.

### R2 — [HIGH] `periodStart` month-end rollover: the "billing anniversary" drifts and under-counts, fail-open on the `limited` money path

Anchor `startsAt` = Jan 31. `s.setMonth(now.getMonth())` on a 31-day anchor rolls over (JS: Feb 31 → Mar 3). Traced: in February, `periodStart` returns **Feb 3** (not Jan 31) — bookings from Jan 31–Feb 3 are excluded from the usage count; in March it returns Mar 3; in April, Apr 1. The anniversary **drifts monthly** and the window repeatedly starts *after* the true anniversary, under-counting `used` → `limited` members book past their paid quota. Fail-open, on the entitlement the doc calls its highest-risk money default. Same class: annual anchor Feb 29 → Mar 1 drift. Also: `setMonth`/`setFullYear` operate in **server-local time** in a doc that mandates UTC everywhere — period boundaries shift with server TZ. Fix: clamp day-of-month (`min(anchorDay, daysInMonth)`) and compute in UTC.

### R6 — [HIGH] S2.2's status-flip retirement + the non-status-partial `(classSeriesId, startsAt)` unique index = cancelled rows permanently block regeneration

The N3 fix keeps cancelled slot rows forever. The unique index is partial only on `classSeriesId IS NOT NULL` — **it includes `cancelled` rows.** Reschedule a series so the new pattern lands on an instant where a retired row exists (the common case: same day, shifted time; or rrule realignment): the generator's `bulkCreate(..., ignoreDuplicates: true)` **silently drops the new slot.** The class simply never exists at that time; no error, no `orphanedSlotIds`, nothing. The doc's claim — "the `(classSeriesId, startsAt)` unique index makes that safe to re-run" — is true for duplicates and false for regeneration. Fix: make the index `WHERE status != 'cancelled'`, or have the generator resurrect cancelled rows.

### R5 — [MEDIUM] S4 check-in mutates `class_bookings` without the slot lock — a direct violation of §2.3, which names check-in attachment explicitly

§2.3: *"Every transaction that mutates a booking MUST acquire `class_slots` row lock FIRST… It applies to: … **check-in attachment**… A reviewer must reject any transaction that touches `class_bookings` without first locking its `class_slots` row."* S4's steps 0–4 take the advisory lock, then `UPDATE class_bookings SET attendedAt` — no slot lock, ever. The N6 fix is internally fine (advisory locks create no cycle today — no path takes slot→advisory), but **the doc's own code fails the doc's own reviewer gate**, and the builder must guess which is authoritative. Either lock the slot in `checkIn` (order: advisory → slot → booking, and state that order) or carve check-in out of §2.3 explicitly with the deadlock argument.

### R4 — [MEDIUM] `isStaff` is defined as a role predicate, then S3 calls it with a user id

§2.5: `isStaff = ['trainer','admin'].includes(actorRole)`, "the route layer… passes `actorRole` into the service." S3's code: `cancelBooking({ bookingId, actorUserId })` → `isStaff(actorUserId)`. Verbatim copy → always false → **staff can never cancel another member's booking**; the NOT_YOUR_BOOKING path mis-fires for every legitimate staff cancel. One-line fix, but it's in a fully-written code block — the B4 class of code-vs-spec contradiction this doc was revised to eliminate.

### R9 — [MEDIUM] The orphan-subscription path (M1's own fix) can't record its `stripeEventId` → replay re-refunds

`checkout.session.completed` hitting the unique index → cancel + refund + alert. But the replay-dedup store is `membership_events.stripeEventId`, and `membership_events.membershipId` is NOT NULL with **no membership row to attach** — the event is never recorded. A Stripe dashboard resend (or any retry if the handler doesn't 200) re-executes cancel+refund: double-refund risk, alarm noise on the dead-letter channel. Spec a dedup write that survives the failure (nullable `membershipId`, or a separate processed-events table).

### R10 — [MEDIUM] N11 was never fixed, and it now corrupts `limited` accounting

`POST /slots/:id/cancel` still has no service semantics: booked members' rows are never flipped, never notified. New consequence this revision: `periodStart` counts `status='booked'` — so bookings on a **cancelled class keep consuming a limited member's period allowance forever** (nothing ever moves them out of `booked`; `no_show` marking is the only exit and it's for classes that ran). The class-cancel path must flip booked rows to `cancelled` in the same transaction, under §2.3, with notification.

### R11 — [MEDIUM] `notifyAfterCommit` is called and never defined; successful promotions notify nobody

`promoteFromWaitlist` calls `notifyAfterCommit(...)` — no such function is defined, verified, or located (unlike `notificationService`, which now is). How does service code register after-commit work against `sequelize.transaction`? Forced guess. And the success path (`status='booked'`, `promotedAt=now`) sends **no notification at all** — a promoted member is never told they got the seat, in cancel-promote, capacity-increase, and staff-promote alike.

### R12 — [MEDIUM] Freeze vs. path-3 expiry: the cron expires frozen memberships whose billing clock was paused

Path 3 flips `frozen` memberships with `endsAt < now` to `expired`. But freeze pauses Stripe collection — the paid term is effectively suspended while `endsAt` keeps running. A 12-month member frozen months 11–16 is **expired at month 12 with a paid month remaining**. Freeze must extend `endsAt`, or the cron must skip `frozen` (and path 2 must not fire on pause — verify `pause_collection: void` never emits `subscription.deleted`; state it).

---

## PART 3 — ENUM-PARITY CLAIM: audited, and FALSE

Grep of every status/event literal in the doc against its ENUM:

- **`class_bookings.status`:** `booked, waitlisted, cancelled, late_cancelled, no_show, skipped_ineligible` — every literal written anywhere (S2 code, S3 code, mark-no-shows, tests) is in the S2 ENUM and §2.4. **`skipped_ineligible` propagation is complete** — §2.4 ✓, S2 migration ✓, partial-index exclusion ✓, S3 writes ✓, re-add test ✓. The v1-A1 bug was **not** recreated on booking status.
- **`memberships.status`:** all six values written and read consistently; partial-index subset intentional ✓.
- **`class_slots.status`:** `scheduled/cancelled/completed` all consistent ✓ (`completed` still decorative — NIT).
- **`membership_events.eventType`: FAILS.** §2.7 path 3 requires an event on expiry; `expired` is absent (R8). `unsuspended` is defined and never written (NIT). The S2 parity check greps only `status: '` and lives in S2 — it is structurally incapable of catching an S1 event-enum miss. **The parity claim is true for statuses, false for events.**

---

## PART 4 — REMAINING FORCED GUESSES

1. **Cancel-requested flag** (R7) — undeclared, money path. HIGH.
2. **`notifyAfterCommit` + promotion success notification** (R11). MEDIUM.
3. **Class-cancel service semantics** (R10) — carried from round 2, still undeclared. MEDIUM.
4. **Hours-check direction** (N15, carried): `zonedTime.mjs` converts wall→UTC only; S6 needs now→location-local (`formatToParts`). One more export, still absent. NIT.
5. **`keyId` column** is specified in the S6 prose, not in the migration's column list — a bot building from the migration block misses the UNIQUE NOT NULL column the auth path depends on. NIT.
6. Carried NITs: `classSlotId`-immutability invariant (N12), `waitlistedAt` FIFO ties (N14), `invoice.paid`-before-`checkout.session.completed` false dead-letter (M6), `completed` writer, `unsuspended` writer.

Declared STOPs (§9.1–9.4) remain honest.

---

## RANKED SUMMARY

| # | Finding | Rank |
|---|---|---|
| R8 | `eventType` ENUM lacks `expired` → §2.7 path 3's only `expired` writer crashes on its own audit law, daily, forever. A1's exact defect class, one revision after the parity check that was supposed to kill the class | **BLOCKER** (doc's own precedent; mitigated to fail-closed by the `endsAt` checks) |
| R7 | Path 3 "cancelled if requested" needs a column that doesn't exist; path 2 + path 3 double-fire with order-dependent final status and rewritten `endsAt` | HIGH |
| R1 | Checkout-creation race unserialized; unique index can't fire pre-row; concurrent-409 acceptance test unpassable; double-charge still occurs transiently | HIGH |
| R3/R14 | Status-blind precedence ORDER + `suspended` excluded from index and guard → valid member denied (N8 recreated) **and** suspended member escapes dunning via re-checkout | HIGH |
| R2 | `periodStart` month-end rollover drifts the anniversary and under-counts usage → `limited` members over-book; server-local-time math in a UTC system | HIGH |
| R6 | Cancelled slot rows occupy `(classSeriesId, startsAt)` forever → regeneration at a retired instant silently dropped by `ignoreDuplicates` | HIGH |
| R5 | S4 check-in mutates bookings without the slot lock — fails §2.3's own reviewer gate | MEDIUM |
| R4 | `isStaff(actorUserId)` vs. role-predicate definition — staff cancels always forbidden | MEDIUM |
| R9 | Orphan-subscription path can't record `stripeEventId` → replay re-refunds | MEDIUM |
| R10 | N11 unfixed: class-cancel strands `booked` rows that now permanently consume `limited` allowance | MEDIUM |
| R11 | `notifyAfterCommit` undefined; successful promotions notify nobody | MEDIUM |
| R12 | Cron expires frozen memberships mid-pause — paid term lost | MEDIUM |
| — | `completed`/`unsuspended` no writers; keyId in prose not migration; hours-tz direction; N12/N14/M6 carried | NIT |

**Bottom line:** the round-2 fixes are mostly real — M3, N2, N4, N6 (mechanism), N7, M4/M5 are clean kills, and `skipped_ineligible` was propagated without enum drift. But the revision's own parity check has a blind spot exactly where it matters: §2.7 path 3, the load-bearing third of the M2 fix, is broken twice (R7: unimplementable branch; R8: an A1-class enum miss that kills the only `expired` writer). The M1 fix stops the
